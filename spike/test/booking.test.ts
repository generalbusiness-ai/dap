// The Booking manifest's predeclared cases and campaign (spike plan V4,
// §4.1, §4.3 to §4.7). Every expectation here comes from
// manifests/booking.md and manifests/booking.ts, written before the
// baseline; nothing reads the candidate model's state.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkContext, describeViolation, type Violation } from '../src/checker.ts';
import { Context } from '../src/context.ts';
import { CAP, K } from '../src/foundation.ts';
import { generate } from '../src/generate.ts';
import { oracleObserve } from '../src/oracle.ts';
import { applyStep, replay, type Pending } from '../src/script.ts';
import { nonce } from '../src/canon.ts';
import { BOOKING, bookingPackage } from '../fixtures/booking.ts';
import {
  ADMIN,
  BOB,
  BOOKING_MANIFEST_ID,
  CAROL,
  CLOCK,
  DANA,
  ROOM,
  bookingBase,
  bookingBounds,
  bookingBudgetViolations,
  bookingGeneratorSpec,
  bookingInvariants,
  clockPrelude,
  proseBounds,
  tick,
} from '../manifests/booking.ts';

const budget = (obs: Parameters<typeof bookingBudgetViolations>[0], p: string, _n: number, view: Parameters<typeof bookingBudgetViolations>[3]) => bookingBudgetViolations(obs, p, ADMIN, view);
const fullCheck = (ctx: Context, frontiers?: number[]) => checkContext(ctx, { invariants: bookingInvariants, budget, ...(frontiers ? { frontiers } : {}) });
const brief = (vs: Violation[]) => vs.slice(0, 6).map(describeViolation).join('\n') + (vs.length > 6 ? `\n... ${vs.length} violations` : '');

type Proj = { now: number | null; occupancies: { id: string; status: string; position: number }[]; requests: { id: string; status: string; booker: string }[] };
const proj = (ctx: Context, p: string, n = ctx.head) => oracleObserve(ctx, p, n, n).models['booking'] as Proj;
const reasonAt = (ctx: Context, p: string, i: number) => oracleObserve(ctx, p, ctx.head, ctx.head).outcomes[String(i)]?.perModel?.['booking']?.reason;

/** A context with the admin, the clock and the named bookers joined, with the model's declared join disclosure honoured. */
function room(bookers: string[]): Context {
  const ctx = Context.create({ ...bookingBase(), packages: { ...bookingBase().packages } });
  const pending: Pending = new Map();
  for (const s of clockPrelude()) applyStep(ctx, s, pending);
  for (const b of bookers) {
    applyStep(ctx, { type: 'invite', inviter: ADMIN, invitee: b, grants: { roles: ['Booker'] } }, pending);
    applyStep(ctx, { type: 'accept', invitee: b }, pending);
  }
  return ctx;
}

function request(ctx: Context, booker: string, start: number, end: number, purpose = 'p-' + nonce()) {
  const r = ctx.act(booker, BOOKING + 'request', { room: ROOM, start, end, purpose, admin: ADMIN });
  if ('refused' in r) throw new Error('request refused: ' + r.reason);
  return { position: r.header.position, id: ctx.entries[r.header.position]!.id, effective: r.verdict?.effective === true };
}

function publish(ctx: Context, actor: string, booking_id: string, start: number, end: number) {
  const r = ctx.act(actor, BOOKING + 'occupancy', { booking_id, room: ROOM, start, end });
  if ('refused' in r) throw new Error('occupancy refused: ' + r.reason);
  return { position: r.header.position, verdict: r.verdict! };
}

test('the manifest is one experiment identity over its prose and executable part, and the prose states the same bounds', (t) => {
  assert.match(BOOKING_MANIFEST_ID, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(proseBounds(), bookingBounds);
  t.diagnostic('BOOKING_MANIFEST_ID ' + BOOKING_MANIFEST_ID);
  t.diagnostic('booking package ' + bookingPackage.id);
});

test('case 1, two requests for one slot: the admin publishes one, the other stays pending and its publication is overlap', () => {
  const ctx = room([BOB, CAROL]);
  const a = request(ctx, BOB, 10, 12);
  const b = request(ctx, CAROL, 11, 13);
  assert.ok(a.effective && b.effective);
  const pa = publish(ctx, ADMIN, a.id, 10, 12);
  assert.equal(pa.verdict.effective, true);
  const pb = publish(ctx, ADMIN, b.id, 11, 13);
  assert.equal(pb.verdict.effective, false);
  assert.equal(pb.verdict.perModel?.['booking']?.reason, 'overlap');
  assert.deepEqual(proj(ctx, BOB).occupancies.map((o) => [o.id, o.status]), [[a.id, 'active']]);
  assert.deepEqual(proj(ctx, CAROL).requests.map((r) => [r.id, r.status]), [[b.id, 'pending']]);
  assert.deepEqual(proj(ctx, BOB).requests.map((r) => [r.id, r.status]), [[a.id, 'published']]);
  assert.equal(proj(ctx, CAROL).occupancies.length, 1); // Carol sees the slot is taken, not by whom
  for (const p of ctx.state.participants) assert.equal(reasonAt(ctx, p, pb.position), 'overlap', `overlap for ${p}`);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 2, free exactly one: two occupancies, one freed, the other active; a second free is already_free', () => {
  const ctx = room([BOB, CAROL]);
  const a = request(ctx, BOB, 1, 3);
  const b = request(ctx, CAROL, 5, 7);
  assert.equal(publish(ctx, ADMIN, a.id, 1, 3).verdict.effective, true);
  assert.equal(publish(ctx, ADMIN, b.id, 5, 7).verdict.effective, true);
  const f = ctx.act(ADMIN, BOOKING + 'free', { booking_id: a.id });
  assert.ok(!('refused' in f) && f.verdict?.effective);
  assert.deepEqual(proj(ctx, CAROL).occupancies.map((o) => [o.id, o.status]), [[a.id, 'freed'], [b.id, 'active']]);
  const again = ctx.act(ADMIN, BOOKING + 'free', { booking_id: a.id });
  assert.ok(!('refused' in again) && again.verdict?.effective === false && again.verdict.perModel?.['booking']?.reason === 'already_free');
  const none = ctx.act(ADMIN, BOOKING + 'free', { booking_id: 'nope' });
  assert.ok(!('refused' in none) && none.verdict?.perModel?.['booking']?.reason === 'no_such_occupancy');
  // the freed slot can be taken again
  const c = request(ctx, BOB, 1, 3);
  assert.equal(publish(ctx, ADMIN, c.id, 1, 3).verdict.effective, true);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 3, duplicate publication: a second occupancy with the same booking id is duplicate_id', () => {
  const ctx = room([BOB]);
  const a = request(ctx, BOB, 20, 22);
  assert.equal(publish(ctx, ADMIN, a.id, 20, 22).verdict.effective, true);
  const dup = publish(ctx, ADMIN, a.id, 30, 32);
  assert.equal(dup.verdict.effective, false);
  assert.equal(dup.verdict.perModel?.['booking']?.reason, 'duplicate_id');
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 4, only the admin publishes: a booker\'s occupancy is unauthorized before any model rule', () => {
  const ctx = room([BOB]);
  const a = request(ctx, BOB, 20, 22);
  const r = ctx.act(BOB, BOOKING + 'occupancy', { booking_id: a.id, room: ROOM, start: 20, end: 22 });
  assert.ok(!('refused' in r) && r.verdict?.authorized === false && r.verdict.reason === 'unauthorized');
  assert.deepEqual(proj(ctx, ADMIN).occupancies, []);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 5, expiry: when the clock reaches an occupancy\'s end it is expired for every member, and an overlapping occupancy is then effective', () => {
  const ctx = room([BOB, CAROL]);
  const a = request(ctx, BOB, 3, 5);
  assert.equal(publish(ctx, ADMIN, a.id, 3, 5).verdict.effective, true);
  const b = request(ctx, CAROL, 4, 6);
  const early = publish(ctx, ADMIN, b.id, 4, 6);
  assert.equal(early.verdict.perModel?.['booking']?.reason, 'overlap');
  const t4 = ctx.act(CLOCK, K.observe, tick(4));
  assert.ok(!('refused' in t4) && t4.verdict?.effective);
  assert.equal(proj(ctx, CAROL).now, 4);
  assert.deepEqual(proj(ctx, CAROL).occupancies.map((o) => o.status), ['active']);
  const t5 = ctx.act(CLOCK, K.observe, tick(5));
  assert.ok(!('refused' in t5) && t5.verdict?.effective);
  for (const p of [ADMIN, BOB, CAROL, CLOCK]) {
    assert.equal(proj(ctx, p).now, 5, `now for ${p}`);
    assert.deepEqual(proj(ctx, p).occupancies.map((o) => o.status), ['expired'], `expired for ${p}`);
  }
  const later = publish(ctx, ADMIN, b.id, 4, 6);
  assert.equal(later.verdict.effective, true);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 6, cross-view: an occupancy before J joins, an overlapping publication after, and a free of the earlier one are judged the same way in every view', () => {
  const ctx = room([BOB, CAROL]);
  const a = request(ctx, BOB, 10, 12);
  const pa = publish(ctx, ADMIN, a.id, 10, 12);
  assert.equal(pa.verdict.effective, true);
  const pending: Pending = new Map();
  applyStep(ctx, { type: 'invite', inviter: ADMIN, invitee: DANA, grants: { roles: ['Booker'] } }, pending);
  applyStep(ctx, { type: 'accept', invitee: DANA }, pending);
  assert.ok(ctx.state.participants.includes(DANA));
  const b = request(ctx, CAROL, 11, 13);
  const pb = publish(ctx, ADMIN, b.id, 11, 13);
  assert.equal(pb.verdict.effective, false);
  for (const p of ctx.state.participants) assert.equal(oracleObserve(ctx, p, ctx.head, ctx.head).outcomes[String(pb.position)]?.effective, false, `${p} at ${pb.position}`);
  const f = ctx.act(ADMIN, BOOKING + 'free', { booking_id: a.id });
  assert.ok(!('refused' in f) && f.verdict?.effective);
  for (const p of ctx.state.participants) assert.equal(oracleObserve(ctx, p, ctx.head, ctx.head).outcomes[String(f.header.position)]?.effective, true, `${p} at ${f.header.position}`);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 7, the campaign: every manifest seed replays with zero violations of the property, the pause rule, the invariants and the privacy budget', (t) => {
  const limit = process.env['BOOKING_SEEDS'] ? Number(process.env['BOOKING_SEEDS']) : bookingBounds.seeds.length;
  const seeds = bookingBounds.seeds.slice(0, limit);
  const counts = { joins: 0, attaches: 0, disclosures: 0, requests: 0, occupancies: 0, effectiveOccupancies: 0, linkedOccupancies: 0, frees: 0, cancels: 0, effectiveCancels: 0, ticks: 0, entries: 0 };
  const failures: { seed: number; violations: Violation[] }[] = [];
  const started = Date.now();
  for (const seed of seeds) {
    const script = generate(bookingGeneratorSpec(bookingPackage), seed);
    const { ctx } = replay(script);
    assert.ok(ctx.head + 1 <= bookingBounds.maxPositions, `seed ${seed} has ${ctx.head + 1} entries`);
    assert.ok(ctx.state.participants.length <= bookingBounds.maxParticipants, `seed ${seed} has ${ctx.state.participants.length} participants`);
    counts.entries += ctx.head + 1;
    for (const s of script.steps) {
      if (s.type === 'accept') counts.joins++;
      if (s.type === 'attach') counts.attaches++;
      if (s.type === 'disclose') counts.disclosures++;
      if (s.type === 'act' && s.kind === BOOKING + 'request') counts.requests++;
      if (s.type === 'act' && s.kind === BOOKING + 'occupancy') counts.occupancies++;
      if (s.type === 'act' && s.kind === BOOKING + 'free') counts.frees++;
      if (s.type === 'act' && s.kind === BOOKING + 'cancel_request') counts.cancels++;
      if (s.type === 'act' && s.kind === K.observe) counts.ticks++;
    }
    const requests = new Set<string>();
    for (let i = 0; i <= ctx.head; i++) {
      const entry = ctx.entries[i]!;
      if (!ctx.state.verdicts[i]?.effective) continue;
      if (entry.event.kind === BOOKING + 'request') requests.add(entry.id);
      if (entry.event.kind === BOOKING + 'occupancy') {
        counts.effectiveOccupancies++;
        if (requests.has((entry.event.payload as { booking_id: string }).booking_id)) counts.linkedOccupancies++;
      }
      if (entry.event.kind === BOOKING + 'cancel_request') counts.effectiveCancels++;
    }
    const violations = fullCheck(ctx);
    if (violations.length) failures.push({ seed, violations });
  }
  t.diagnostic(`seeds ${seeds.length}, ${Date.now() - started} ms, coverage ${JSON.stringify(counts)}`);
  assert.ok(counts.joins > 0 && counts.attaches > 0 && counts.disclosures > 0 && counts.effectiveOccupancies > 0 && counts.frees > 0 && counts.ticks > 0, 'coverage');
  assert.ok(counts.linkedOccupancies > 0 && counts.effectiveCancels > 0, 'generated request ids survive replay for occupancy and cancellation coverage');
  assert.deepEqual(
    failures.map((f) => f.seed),
    [],
    failures.map((f) => `seed ${f.seed}: ${brief(f.violations)}`).join('\n'),
  );
});

test('the repair ledger exists, its totals agree with its entries, and it states the budget outcome', (t) => {
  const ledger = readFileSync(fileURLToPath(new URL('../manifests/booking.ledger.md', import.meta.url)), 'utf8');
  const fixes = (ledger.match(/^### Fix \d+/gm) ?? []).length;
  const addedKinds = (ledger.match(/^- Added kind: yes/gm) ?? []).length;
  const totals = /^Totals: (\d+) fix(?:es)?, (\d+) added kinds?, budget (within|exceeded)/m.exec(ledger);
  assert.ok(totals, 'the ledger states its totals');
  assert.equal(Number(totals[1]), fixes, 'fix total matches the entries');
  assert.equal(Number(totals[2]), addedKinds, 'added-kind total matches the entries');
  const within = fixes <= 2 && addedKinds <= 1;
  assert.equal(totals[3], within ? 'within' : 'exceeded', 'the stated budget outcome matches the counts');
  t.diagnostic(`fixes ${fixes}, added kinds ${addedKinds}, budget ${totals[3]}`);
  assert.equal(typeof CAP.observe, 'string');
});
