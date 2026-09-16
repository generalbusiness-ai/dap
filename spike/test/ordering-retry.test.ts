import assert from 'node:assert/strict';
import { fork, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { append, type AdmissionContext, type TransportCredential } from '../src/append.ts';
import { canonicalize, encodeWire, envelopeBytes, envelopeId, signEvent, signHeader, verifyEnvelope } from '../src/codec.ts';
import { K } from '../src/foundation.ts';
import { Journal, MAX_ENVELOPE_BYTES, O1_PROFILE_VERSION } from '../src/journal.ts';
import { SQLiteBackend } from '../src/sqlite.ts';
import type { Entry, EventBody, Receipt, Refusal, Verdict } from '../src/types.ts';
import { SALE } from '../fixtures/sale.ts';
import { acceptance, createJournal, invite, keys, packages, people } from './fixtures/o1-fixture.ts';
import type { Request } from './fixtures/o2-process.ts';

const processFixture = new URL('./fixtures/o2-process.ts', import.meta.url);
type Result = (Receipt & { verdict?: Verdict }) | Refusal;
type Reply = { label: string; result: Result };
function sqlite(path: string) { return new SQLiteBackend(path, { writer: people.writer, profile: O1_PROFILE_VERSION }); }
function open(backend: SQLiteBackend) { return Journal.open({ backend, writerKey: keys.writer, packages }); }
function directory() { return mkdtempSync(join(tmpdir(), 'dap-o2-')); }
function wire(entry: Entry) { return encodeWire({ header: entry.header, committed: entry.committed! }); }
function request(journal: Journal, who: 'alice' | 'bob' | 'carol', label: string, kind: string, payload: EventBody['payload'], actionId = label): Request {
  return { label, committed: envelopeBytes(signEvent(journal.context.intent(people[who], kind, payload, { action_id: actionId }), keys[who])), credential: journal.context.credentialFor(people[who]) };
}
function accepted(result: Result): asserts result is Receipt & { verdict?: Verdict } { assert.ok(!('refused' in result), JSON.stringify(result)); }
function crash(path: string, input: string, schedule: string, mode = 'crash') {
  const result = spawnSync(process.execPath, [processFixture.pathname, mode, path, input, schedule], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.signal, 'SIGKILL', result.stderr);
  assert.match(result.stdout, new RegExp('kill:' + schedule));
  return result.stdout;
}
function launch(args: string[]) {
  const child = fork(processFixture, args, { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let stderr = '';
  child.stderr!.on('data', bytes => { stderr += bytes.toString(); });
  const exit = new Promise<void>((resolve, reject) => child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`child exited ${code}/${signal}: ${stderr}`))));
  // Attach immediately so a failure before a later await is still handled.
  void exit.catch(() => {});
  return { child, exit };
}
function message<T>(child: ChildProcess, type: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const onMessage = (value: unknown) => {
      if (value && typeof value === 'object' && 'type' in value && value.type === type) {
        child.off('exit', onExit); child.off('message', onMessage); resolve(value as T);
      }
    };
    const onExit = () => { child.off('message', onMessage); reject(new Error('child exited before ' + type)); };
    child.on('message', onMessage); child.once('exit', onExit);
  });
}

for (const order of ['forward', 'reverse', 'rotated'] as const) test('O2 concurrent clients: barrier-six-' + order, { timeout: 30000 }, async t => {
  const root = directory(), path = join(root, 'journal.db'), socket = join(root, 'writer.sock');
  let backend = sqlite(path), journal = createJournal(backend);
  for (const who of ['bob', 'carol'] as const) accepted(journal.submit(envelopeBytes(acceptance(journal, who, invite(journal, who)))));
  const prefix = journal.context.entries;
  await backend.drain(() => {});
  const common = request(journal, 'bob', 'common', SALE + 'offer', { offer_id: 'common' });
  const conflict = [0, 1].map(n => request(journal, 'bob', 'conflict-' + n, SALE + 'offer', { offer_id: 'conflict-' + n }, 'conflict'));
  const batches = Array.from({ length: 6 }, (_, client) => {
    const unique = Array.from({ length: 4 }, (_, item) => request(journal, client % 2 ? 'carol' : 'bob', `unique:${client}:${item}`, SALE + 'offer', { offer_id: `offer:${client}:${item}` }));
    const batch = [...unique, { ...common, label: `common:${client}:first` }, { ...common, label: `common:${client}:retry` }, { ...conflict[client % 2]!, label: 'conflict:' + client }];
    if (order === 'reverse') batch.reverse();
    if (order === 'rotated') batch.push(...batch.splice(0, client));
    return batch;
  });
  backend.close();
  const writer = launch(['writer', path, socket]);
  t.after(() => { if (writer.child.exitCode === null) writer.child.kill('SIGKILL'); });
  await message(writer.child, 'ready');
  const clients = batches.map((batch, i) => {
    const input = join(root, `client-${i}.json`); writeFileSync(input, JSON.stringify(batch));
    const client = launch(['client', socket, input]);
    t.after(() => { if (client.child.exitCode === null) client.child.kill('SIGKILL'); });
    return { ...client, ready: message(client.child, 'ready'), result: message<{ replies: Reply[] }>(client.child, 'results') };
  });
  await Promise.all(clients.map(c => c.ready)); // all six OS processes exist before release
  for (const client of clients) client.child.send('go');
  const replies = (await Promise.all(clients.map(c => c.result))).flatMap(r => r.replies);
  await Promise.all(clients.map(c => c.exit));
  writer.child.send('stop'); await writer.exit;
  assert.equal(replies.length, 42);
  const byLabel = new Map(batches.flat().map(r => [r.label, r]));
  assert.equal(new Set(replies.map(r => r.label)).size, 42);
  assert.equal(replies.filter(r => 'refused' in r.result).length, 3);
  assert.equal(replies.filter(r => !('refused' in r.result) && !r.result.replay).length, 26);
  assert.equal(replies.filter(r => !('refused' in r.result) && r.result.replay).length, 13);
  backend = sqlite(path); journal = open(backend); // authenticated replay verifies the entire signed chain
  t.after(() => backend.close());
  assert.deepEqual(journal.context.entries.slice(0, prefix.length), prefix);
  assert.equal(journal.context.entries.length, prefix.length + 26);
  assert.equal(backend.pending().length, 26);
  assert.equal(new Set(journal.context.entries.map(e => e.headerHash)).size, prefix.length + 26);
  for (const reply of replies) {
    const saved = byLabel.get(reply.label)!;
    if ('refused' in reply.result) {
      assert.deepEqual(reply.result, { refused: true, reason: 'changed_content' });
      assert.match(reply.label, /^conflict:/);
    } else {
      const entry = journal.context.entries[reply.result.header.position]!;
      assert.equal(entry.committed, saved.committed);
      assert.equal(entry.headerHash, reply.result.headerHash);
      assert.deepEqual(entry.header, reply.result.header);
      assert.equal(backend.retry(verifyEnvelope(saved.committed).body.action_id!)!.receipt.headerHash, entry.headerHash);
      assert.equal(reply.result.verdict?.effective, true);
    }
  }
  for (const entry of journal.context.entries.slice(prefix.length)) {
    assert.equal(entry.header.prev, journal.context.entries[entry.position - 1]!.headerHash);
    assert.equal(journal.context.entries.filter(e => e.event.action_id === entry.event.action_id).length, 1);
  }
});

for (const schedule of ['before-append', 'after-consumption', 'after-commit', 'after-reply-before-notification'] as const) test('O2 invitation lost-reply schedule: ' + schedule, async () => {
  const root = directory(), path = join(root, 'journal.db'), input = join(root, 'intent.json');
  let backend = sqlite(path), journal = createJournal(backend);
  const issued = invite(journal, 'bob'), token = journal.context.entries[issued]!.id;
  const committed = envelopeBytes(acceptance(journal, 'bob', issued, 'saved-acceptance'));
  writeFileSync(input, JSON.stringify({ label: 'saved-acceptance', committed } satisfies Request));
  const prefix = journal.context.entries, prefixWires = prefix.map(wire);
  await backend.drain(() => {}); backend.close();
  const stdout = crash(path, input, schedule);
  const retained = schedule === 'after-commit' || schedule === 'after-reply-before-notification';
  assert.equal(stdout.split('\n').filter(line => line.startsWith('{"reply":')).length, Number(schedule === 'after-reply-before-notification'));
  backend = sqlite(path); journal = open(backend);
  assert.deepEqual(journal.context.entries.slice(0, prefix.length).map(wire), prefixWires);
  assert.equal(journal.context.entries.length, prefix.length + Number(retained));
  assert.equal(backend.isConsumed(token), retained);
  assert.equal(!!backend.retry('saved-acceptance'), retained);
  assert.equal(backend.pending().length, Number(retained));
  const saved = retained ? backend.head()! : undefined;
  const replay = journal.submit(JSON.parse(readFileSync(input, 'utf8')).committed);
  accepted(replay); assert.equal(replay.replay, retained);
  assert.equal(replay.header.position, prefix.length);
  if (saved) assert.deepEqual(replay.header, saved.header);
  if (schedule === 'after-reply-before-notification') {
    const acknowledged = JSON.parse(stdout.split('\n')[0]!).reply as Receipt;
    assert.deepEqual(replay.header, acknowledged.header);
    assert.equal(replay.headerHash, acknowledged.headerHash);
  }
  const again = journal.submit(committed); accepted(again);
  assert.equal(again.replay, true); assert.equal(again.headerHash, replay.headerHash);
  assert.equal(journal.context.entries.length, prefix.length + 1);
  assert.equal(backend.pending().length, 1); // retries never manufacture another publication
  const changed = verifyEnvelope(committed);
  assert.deepEqual(journal.submit(signEvent({ ...changed.body, payload: {} }, keys.bob)), { refused: true, reason: 'changed_content' });
  assert.deepEqual(journal.submit(envelopeBytes(acceptance(journal, 'bob', issued, 'new-action'))), { refused: true, reason: 'invitation_consumed' });
  const delivered: string[] = [];
  await backend.drain(record => { delivered.push(wire(record.entry)); });
  assert.deepEqual(delivered, [wire(backend.head()!)]);
  const acknowledgedPrefix = journal.context.entries.map(wire);
  backend.close(); backend = sqlite(path); journal = open(backend);
  assert.deepEqual(journal.context.entries.map(wire), acknowledgedPrefix);
  assert.deepEqual(backend.pending(), []);
  const restartRetry = journal.submit(committed); accepted(restartRetry);
  assert.equal(restartRetry.replay, true); assert.equal(restartRetry.headerHash, replay.headerHash);
  backend.close();
});

test('O2 publication SIGKILL replays the exact saved wire entry without a new action', async () => {
  const root = directory(), path = join(root, 'journal.db'), input = join(root, 'intent.json'), deliveries = join(root, 'deliveries.jsonl');
  let backend = sqlite(path), journal = createJournal(backend);
  const issued = invite(journal, 'bob');
  const committed = envelopeBytes(acceptance(journal, 'bob', issued, 'publish-once'));
  writeFileSync(input, JSON.stringify({ label: 'publish-once', committed } satisfies Request));
  await backend.drain(() => {}); backend.close();
  crash(path, input, 'after-reply-before-notification');
  backend = sqlite(path); journal = open(backend);
  const entries = journal.context.entries, pending = backend.pending();
  assert.equal(pending.length, 1); backend.close();
  crash(path, deliveries, 'after-delivery-before-ack', 'publish');
  const first = JSON.parse(readFileSync(deliveries, 'utf8').trim());
  assert.deepEqual(first, { headerHash: pending[0]!.headerHash, wire: wire(pending[0]!.entry) });
  backend = sqlite(path); journal = open(backend);
  assert.deepEqual(backend.pending(), pending);
  let repeats = 0;
  await backend.drain(record => {
    assert.equal(record.headerHash, first.headerHash);
    assert.equal(wire(record.entry), first.wire);
    repeats++;
  });
  assert.equal(repeats, 1); assert.deepEqual(backend.pending(), []);
  assert.deepEqual(journal.context.entries, entries);
  const retry = journal.submit(committed); accepted(retry);
  assert.equal(retry.replay, true); assert.equal(retry.headerHash, first.headerHash);
  assert.deepEqual(journal.context.entries, entries);
  assert.deepEqual(backend.pending(), []);
  backend.close(); backend = sqlite(path); journal = open(backend);
  assert.deepEqual(journal.context.entries, entries); assert.deepEqual(backend.pending(), []);
  backend.close();
});

test('O2 removed-participant admission fixture recovers a lost reply after authenticated restart', async () => {
  // F0 has no participant-removal event. This supplies the serving party's
  // changed current-participant answer at the existing append interface.
  // It does not claim to implement or replay a membership-removal protocol.
  const root = directory(), path = join(root, 'journal.db'), input = join(root, 'intent.json');
  let backend = sqlite(path), journal = createJournal(backend);
  accepted(journal.submit(envelopeBytes(acceptance(journal, 'bob', invite(journal, 'bob')))));
  const saved = request(journal, 'bob', 'removed-member-action', SALE + 'offer', { offer_id: 'saved-before-removal' });
  writeFileSync(input, JSON.stringify(saved));
  await backend.drain(() => {}); backend.close();
  crash(path, input, 'after-commit'); // Bob was admitted; the receipt never returned
  backend = sqlite(path); journal = open(backend);
  const prefix = journal.context.entries, original = backend.retry('removed-member-action')!;
  const pending = backend.pending();
  assert.equal(original.contentId, envelopeId(verifyEnvelope(saved.committed)));
  assert.equal(prefix.at(-1)!.committed, saved.committed);
  const admission: AdmissionContext = {
    genesis: journal.context.genesisId, maxPayloadBytes: MAX_ENVELOPE_BYTES,
    encoding: {
      prepare(event, proof) {
        const envelope = verifyEnvelope(proof as string);
        assert.equal(canonicalize(event), canonicalize(envelope.body));
        return { id: envelopeId(envelope), actorSig: envelope.sig, committed: envelopeBytes(envelope) };
      },
      sign: header => signHeader(header, keys.writer),
    },
    isParticipant: principal => principal !== people.bob && journal.context.state.participants.includes(principal),
    issuedInvite: () => undefined, acceptKind: K.accept_invite,
    activationOf: kind => journal.context.currentActivation(kind), requiresOf: () => undefined,
  };
  function submit(committed: string, credential?: TransportCredential) {
    return append(backend, { event: verifyEnvelope(committed).body, proof: committed, credential }, admission);
  }
  const retry = submit((JSON.parse(readFileSync(input, 'utf8')) as Request).committed);
  accepted(retry); assert.equal(retry.replay, true);
  assert.deepEqual(retry.header, original.receipt.header);
  assert.equal(retry.headerHash, original.receipt.headerHash);
  const fresh = request(journal, 'bob', 'fresh-after-removal', SALE + 'offer', { offer_id: 'fresh' });
  assert.deepEqual(submit(fresh.committed, saved.credential), { refused: true, reason: 'not_a_participant' });
  assert.deepEqual(submit(fresh.committed), { refused: true, reason: 'no_credential' });
  const changed = verifyEnvelope(saved.committed);
  const changedBytes = envelopeBytes(signEvent({ ...changed.body, payload: { offer_id: 'changed' } }, keys.bob));
  assert.deepEqual(submit(changedBytes, saved.credential), { refused: true, reason: 'changed_content' });
  assert.deepEqual(backend.entries(), prefix); assert.deepEqual(backend.pending(), pending);
  backend.close(); backend = sqlite(path); journal = open(backend);
  const secondRetry = submit(saved.committed); accepted(secondRetry);
  assert.equal(secondRetry.headerHash, original.receipt.headerHash);
  assert.deepEqual(backend.entries(), prefix);
  backend.close();
});
