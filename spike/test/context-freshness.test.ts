import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryBackend, type Backend } from '../src/append.ts';
import { Context } from '../src/context.ts';
import { CAP, K } from '../src/foundation.ts';
import { Journal, O1_PROFILE_VERSION } from '../src/journal.ts';
import { SQLiteBackend, type CrashPoint } from '../src/sqlite.ts';
import { createJournal, keys, people, packages, act } from './fixtures/o1-fixture.ts';

function path() { return join(mkdtempSync(join(tmpdir(), 'dap-g1-')), 'journal.db'); }
function sqlite(file: string, fault?: (point: CrashPoint) => void) {
  return new SQLiteBackend(file, { writer: people.writer, profile: O1_PROFILE_VERSION, fault });
}
function invitation(ctx: Context) {
  return ctx.intent(people.alice, K.invite, {
    invitee: people.bob, grants: { principal: people.bob, roles: ['Buyer'] }, token_id: 'g1-invite',
  }, { action_id: 'g1-invite', nonce: 'c1'.repeat(16) });
}
function tryStaleInvitation(ctx: Context) {
  let error: unknown;
  let issued: ReturnType<Context['submit']> | undefined;
  let redeemed: ReturnType<Context['submit']> | undefined;
  try {
    issued = ctx.submit(invitation(ctx), ctx.credentialFor(people.alice));
    if (!('refused' in issued)) {
      const acceptance = ctx.intent(people.bob, K.accept_invite, ctx.inviteEnvelope(issued.header.position) as never, { action_id: 'g1-accept', nonce: 'c2'.repeat(16) });
      redeemed = ctx.submit(acceptance);
    }
  } catch (e) { error = e; }
  return { error, issued, redeemed };
}
function observed(ctx: Context, result: ReturnType<typeof tryStaleInvitation>) {
  return { error: result.error === undefined ? null : String(result.error),
    invitation: result.issued && !('refused' in result.issued) ? { position: result.issued.header.position, verdict: result.issued.verdict } : null,
    redemption: result.redeemed && !('refused' in result.redeemed) ? { position: result.redeemed.header.position, verdict: result.redeemed.verdict } : null,
    participants: [...ctx.state.participants] };
}

for (const storage of ['memory', 'sqlite'] as const) test('O1-G1 raw Context cannot resume stale admission after Journal closes on ' + storage, t => {
  const file = path();
  let backend: Backend = storage === 'memory' ? new MemoryBackend() : sqlite(file);
  createJournal(backend).close();
  if (storage === 'sqlite') backend = sqlite(file);
  const raw = Context.restore(backend, packages);
  const journal = Journal.open({ backend, writerKey: keys.writer, packages });
  const revoke = act(journal, 'alice', K.revoke, { principal: people.alice, capabilities: [CAP.invite] }, 'g1-revoke');
  assert.ok(!('refused' in revoke) && revoke.verdict?.effective);
  assert.throws(() => raw.submit(invitation(raw), raw.credentialFor(people.alice)), /owned|live facade/);
  const before = backend.entries();
  journal.close();
  const result = tryStaleInvitation(raw);
  if (storage === 'sqlite') backend = sqlite(file);
  const cold = Context.restore(backend, packages);
  t.diagnostic(JSON.stringify({ storage, raw: observed(raw, result), coldParticipants: cold.state.participants,
    coldInviteVerdict: result.issued && !('refused' in result.issued) ? cold.verdictAt(result.issued.header.position) : null }));
  assert.match(String(result.error), /stale|closed|inactive|unavailable|not open/);
  assert.deepEqual(backend.entries(), before);
  assert.equal(backend.retry('g1-invite'), undefined);
  assert.deepEqual(cold.state.participants, [people.alice]);
  if (backend instanceof SQLiteBackend) backend.close();
});

for (const storage of ['memory', 'sqlite'] as const) test('O1-G1 raw Context stays inactive after its own committed append loses its reply on ' + storage, t => {
  let armed = false;
  class LostReply extends MemoryBackend {
    override commit(...args: Parameters<MemoryBackend['commit']>): void {
      super.commit(...args);
      if (armed) { armed = false; throw new Error('raw lost reply after commit'); }
    }
  }
  const file = path();
  let backend: Backend = storage === 'memory' ? new LostReply() : sqlite(file);
  createJournal(backend).close();
  if (storage === 'sqlite') backend = sqlite(file, point => {
    if (armed && point === 'after-commit') { armed = false; throw new Error('raw lost reply after commit'); }
  });
  const raw = Context.restore(backend, packages);
  const revoke = raw.intent(people.alice, K.revoke, { principal: people.alice, capabilities: [CAP.invite] }, { action_id: 'g1-raw-revoke', nonce: 'c3'.repeat(16) });
  armed = true;
  assert.throws(() => raw.submit(revoke, raw.credentialFor(people.alice)), /raw lost reply/);
  const before = backend.entries();
  assert.equal(before.at(-1)!.position, 2);
  const result = tryStaleInvitation(raw);
  const cold = Context.restore(backend, packages);
  t.diagnostic(JSON.stringify({ storage, raw: observed(raw, result), coldParticipants: cold.state.participants,
    coldInviteVerdict: result.issued && !('refused' in result.issued) ? cold.verdictAt(result.issued.header.position) : null }));
  assert.match(String(result.error), /inactive/);
  assert.deepEqual(backend.entries(), before);
  assert.equal(backend.retry('g1-invite'), undefined);
  const retry = cold.submit(revoke);
  assert.ok(!('refused' in retry) && retry.replay && retry.verdict?.effective);
  assert.equal(retry.headerHash, before[2]!.headerHash);
  assert.throws(() => Journal.open({ backend, writerKey: keys.writer, packages }), /missing committed bytes/);
  const freshInvite = cold.submit(invitation(cold), cold.credentialFor(people.alice));
  assert.ok(!('refused' in freshInvite) && freshInvite.verdict?.reason === 'unauthorized');
  assert.deepEqual(cold.state.participants, [people.alice]);
  if (backend instanceof SQLiteBackend) backend.close();
});

for (const storage of ['memory', 'sqlite'] as const) test('O1-G1 two unowned raw Contexts cannot write from different folded heads on ' + storage, () => {
  const file = path();
  let backend: Backend = storage === 'memory' ? new MemoryBackend() : sqlite(file);
  createJournal(backend).close();
  if (storage === 'sqlite') backend = sqlite(file);
  const a = Context.restore(backend, packages), b = Context.restore(backend, packages);
  const revoke = a.act(people.alice, K.revoke, { principal: people.alice, capabilities: [CAP.invite] });
  assert.ok(!('refused' in revoke) && revoke.verdict?.effective);
  const before = backend.entries();
  assert.throws(() => b.submit(invitation(b), b.credentialFor(people.alice)), /stale fold/);
  assert.throws(() => b.act(people.alice, K.observe, { fact: {} }), /inactive/);
  assert.deepEqual(backend.entries(), before);
  const fresh = Context.restore(backend, packages);
  const refused = fresh.submit(invitation(fresh), fresh.credentialFor(people.alice));
  assert.ok(!('refused' in refused) && refused.verdict?.reason === 'unauthorized');
  if (backend instanceof SQLiteBackend) backend.close();
});

test('O1-G1 freshness is checked inside serialization without scanning history for refusal', () => {
  let beforeNextTransaction: (() => void) | undefined;
  let blockEntries = false;
  class ScheduledBackend extends MemoryBackend {
    override serialized<T>(fn: () => T): T {
      const scheduled = beforeNextTransaction; beforeNextTransaction = undefined;
      scheduled?.();
      return super.serialized(fn);
    }
    override entries() {
      if (blockEntries) throw new Error('unexpected full-history scan');
      return super.entries();
    }
  }
  const backend = new ScheduledBackend(); createJournal(backend).close();
  const first = Context.restore(backend, packages), late = Context.restore(backend, packages);
  beforeNextTransaction = () => {
    const revoke = first.act(people.alice, K.revoke, { principal: people.alice, capabilities: [CAP.invite] });
    assert.ok(!('refused' in revoke) && revoke.verdict?.effective);
    blockEntries = true;
  };
  assert.throws(() => late.submit(invitation(late), late.credentialFor(people.alice)), /stale fold/);
  blockEntries = false;
  assert.equal(backend.head()!.position, 2);
  assert.equal(backend.retry('g1-invite'), undefined);
});

for (const storage of ['memory', 'sqlite'] as const) test('O1-G1 a current raw Context preserves successful writes and exact retries on ' + storage, () => {
  const file = path();
  let backend: Backend = storage === 'memory' ? new MemoryBackend() : sqlite(file);
  createJournal(backend).close();
  if (storage === 'sqlite') backend = sqlite(file);
  const raw = Context.restore(backend, packages);
  if (storage === 'memory') {
    // Ownership alone does not stale a raw fold when the owner makes no writes.
    Journal.open({ backend, writerKey: keys.writer, packages }).close();
  }
  const revoke = raw.intent(people.alice, K.revoke, { principal: people.alice, capabilities: [CAP.invite] }, { action_id: 'g1-current-revoke', nonce: 'c4'.repeat(16) });
  const first = raw.submit(revoke, raw.credentialFor(people.alice));
  assert.ok(!('refused' in first) && first.verdict?.effective);
  const before = backend.entries();
  const retry = raw.submit(revoke); // Exact retry still precedes credential admission.
  assert.ok(!('refused' in retry) && retry.replay);
  assert.deepEqual(retry, { ...first, replay: true });
  assert.deepEqual(backend.entries(), before);
  const continued = raw.submit(invitation(raw), raw.credentialFor(people.alice));
  assert.ok(!('refused' in continued) && continued.verdict?.reason === 'unauthorized');
  assert.equal(continued.header.position, first.header.position + 1);
  if (backend instanceof SQLiteBackend) backend.close();
});
