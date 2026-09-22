import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentId, type Json } from '../src/canon.ts';
import { Context } from '../src/context.ts';
import { descriptorId, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { CAP, K, F0_ID, F0_OBLIGATIONS_ID, holdsNow } from '../src/foundation.ts';
import { checkContext, describeViolation } from '../src/checker.ts';
import { generate } from '../src/generate.ts';
import { oracleObserve, foldPrefix } from '../src/oracle.ts';
import { obligationPerformance, performObligations } from '../src/obligation-client.ts';
import { applyStep, replay, type Script, type Pending } from '../src/script.ts';
import { MEMBERS, SPINE } from '../src/types.ts';
import { SERVICE, SERVICE_ROLE, saleObligations, clubObligations } from '../fixtures/obligations.ts';
import { SALE } from '../fixtures/sale.ts';
import { CLUB } from '../fixtures/club.ts';
import { saleBase, saleTraceSteps, saleGeneratorSpec, saleInvariants, saleBudgetViolations } from '../manifests/sale.ts';
import { clubBase, clubGeneratorSpec, clubInvariants, clubBudgetViolations, committeePrelude } from '../manifests/club.ts';

function service(base: Script['base']): Script['base'] {
  return { ...base, nonce: 'obligations', grants: base.grants!.map((g, i) => i ? g : { ...g, capabilities: [...g.capabilities ?? [], SERVICE, CAP.observe] }) };
}
const act = (ctx: Context, actor: string, kind: string, payload: Json) => {
  const r = ctx.act(actor, kind, payload, { nonce: 't3:' + (ctx.head + 1) });
  assert.ok(!('refused' in r));
  return ctx.head;
};
function join(ctx: Context, who: string, roles: string[] = [], automatic = true) {
  const pending: Pending = new Map();
  applyStep(ctx, { type: 'invite', inviter: 'alice', invitee: who, grants: { roles } }, pending, false, false);
  const pos = applyStep(ctx, { type: 'accept', invitee: who }, pending, false, automatic);
  return pos;
}
const violations = (ctx: Context, club = false) => checkContext(ctx, club ? {
  invariants: clubInvariants,
  budget: (o, p, n, view) => clubBudgetViolations(o, p, foldPrefix(ctx, n), n, view),
} : { invariants: saleInvariants, budget: (o, p, _n, view) => saleBudgetViolations(o, p, 'alice', view) });
function clean(ctx: Context, club = false) {
  const v = violations(ctx, club);
  assert.equal(v.length, 0, v.slice(0, 5).map(describeViolation).join('\n'));
}
function saleWindow(within?: number) {
  const ctx = Context.create(service(saleBase(saleObligations(within))));
  join(ctx, 'bob', ['Buyer']);
  act(ctx, 'bob', SALE + 'offer', { offer_id: 'o1' });
  const source = join(ctx, 'ivan', ['Inspector'], false);
  const owed = ctx.state.obligations.find((o) => o.source === source)!;
  return { ctx, owed, source };
}
const stubIds = (ctx: Context) => (ctx.state.models.sale as { offers: { id: string }[] }).offers.map((o) => o.id);
const replacement = (ctx: Context, id = 'o2') => act(ctx, 'bob', SALE + 'offer', { offer_id: id, replaces: 'o1' });

test('T3 delayed disclosure: literal open and fulfilled prefixes, own-view client, no fold-generated act', () => {
  const { ctx, owed, source } = saleWindow();
  assert.equal(ctx.head, source);
  assert.equal(owed.status, 'open');
  assert.equal((ctx.entries[0]!.event.payload as Record<string, Json>).foundation, F0_OBLIGATIONS_ID);
  assert.notEqual(F0_OBLIGATIONS_ID, F0_ID);
  assert.deepEqual(stubIds(ctx), ['o1']);
  const ivan = oracleObserve(ctx, 'ivan', ctx.head, ctx.head);
  assert.deepEqual((ivan.models.sale as { offers: unknown[] }).offers, []);
  assert.ok(oracleObserve(ctx, 'alice', ctx.head, ctx.head).obligationAffordances!.includes(owed.id));
  assert.ok(!oracleObserve(ctx, 'bob', ctx.head, ctx.head).affordances.includes(SALE + 'offer'));
  const blocked = replacement(ctx);
  assert.equal(ctx.state.verdicts[blocked]!.reason, 'obligation_open');
  assert.deepEqual(stubIds(ctx), ['o1']);
  clean(ctx);
  performObligations(ctx);
  assert.equal(ctx.state.obligations.find((o) => o.id === owed.id)!.status, 'fulfilled');
  assert.deepEqual((oracleObserve(ctx, 'ivan', ctx.head, ctx.head).models.sale as { offers: { id: string }[] }).offers.map((o) => o.id), ['o1']);
  assert.equal(ctx.verdictAt(replacement(ctx))!.effective, true);
  assert.deepEqual(stubIds(ctx), ['o1', 'o2']);
  join(ctx, 'erin', ['Buyer']);
  clean(ctx);
});

test('T3 missing disclosure: deadline equality open, later clock lapsed, late performance blocked', () => {
  const { ctx, owed } = saleWindow(10);
  act(ctx, 'alice', K.observe, { fact: { clock: 10 } });
  assert.equal(ctx.state.obligations.find((o) => o.id === owed.id)!.status, 'open');
  assert.deepEqual(stubIds(ctx), ['o1']);
  act(ctx, 'alice', K.observe, { fact: { clock: 11 } });
  assert.equal(ctx.state.obligations.find((o) => o.id === owed.id)!.status, 'lapsed');
  assert.equal(ctx.verdictAt(replacement(ctx))!.reason, 'obligation_lapsed');
  const at = act(ctx, 'alice', K.disclose, { obligation: owed.id, positions: [5], to: ['ivan'] });
  assert.equal(ctx.state.verdicts[at]!.reason, 'obligation_lapsed');
  assert.deepEqual(stubIds(ctx), ['o1']);
  assert.equal(ctx.state.obligations.find((o) => o.id === owed.id)!.status, 'lapsed');
  clean(ctx);
});

test('T3 mismatch, role, independent capability and one performance controls', () => {
  const { ctx, owed } = saleWindow();
  const payload = obligationPerformance(ctx, 'alice', owed)! as Record<string, Json>;
  act(ctx, 'alice', K.grant, { principal: 'bob', capabilities: [CAP.disclose] });
  const attempts: [string, string, Json, string][] = [
    ['alice', K.close, { obligation: owed.id }, 'obligation_mismatch'],
    ['bob', K.disclose, payload, 'obligation_wrong_actor'],
    ['alice', K.disclose, { ...payload, obligation: 'wrong' }, 'unknown_obligation'],
    ['alice', K.disclose, { ...payload, to: ['bob'] }, 'obligation_mismatch'],
  ];
  for (const [actor, kind, p, reason] of attempts) {
    assert.equal(ctx.verdictAt(act(ctx, actor, kind, p))!.reason, reason);
    assert.equal(ctx.state.obligations.find((o) => o.id === owed.id)!.status, 'open');
    assert.deepEqual(stubIds(ctx), ['o1']);
    assert.equal(ctx.state.closed, false);
  }
  act(ctx, 'alice', K.grant, { principal: 'ivan', roles: [SERVICE_ROLE] });
  assert.ok(oracleObserve(ctx, 'ivan', ctx.head, ctx.head).obligationAffordances!.includes(owed.id));
  assert.equal(holdsNow(ctx.state, 'ivan', CAP.disclose), false);
  assert.equal(ctx.verdictAt(act(ctx, 'ivan', K.disclose, payload))!.reason, 'unauthorized');
  const completed = act(ctx, 'alice', K.disclose, payload);
  assert.equal(ctx.state.verdicts[completed]!.effective, true);
  assert.equal(ctx.verdictAt(act(ctx, 'alice', K.disclose, payload))!.reason, 'obligation_fulfilled');
  assert.deepEqual(stubIds(ctx), ['o1']);
  clean(ctx);
});

test('T3 private or mixed clock is refused without publication or time change', () => {
  const { ctx, owed } = saleWindow(10);
  for (const payload of [{ fact: { clock: 11 }, audience: ['alice'] }, { fact: { clock: 11, secret: 'private' } }] as Json[]) {
    const at = act(ctx, 'alice', K.observe, payload);
    assert.equal(ctx.state.verdicts[at]!.reason, 'obligation_private_clock');
    assert.equal(ctx.state.obligationClock, 0);
    assert.equal(ctx.state.obligations.find((o) => o.id === owed.id)!.status, 'open');
    assert.equal(ctx.view('bob')[at]!.event, undefined);
  }
  clean(ctx);
});

test('T3 Sale trace missing Ivan disclosure blocks the original Ivan@15 failure', () => {
  const base = service(saleBase(saleObligations()));
  const ctx = Context.create(base);
  const pending: Pending = new Map();
  let missing = false;
  let replacementAt = -1;
  for (const step of saleTraceSteps()) {
    if (step.type === 'accept' && step.invitee === 'ivan') missing = true;
    const pos = applyStep(ctx, step, pending, false, !missing);
    if (step.type === 'act' && step.kind === SALE + 'offer' && (step.payload as Record<string, Json>).offer_id === 'o3') replacementAt = pos;
  }
  assert.equal(ctx.state.verdicts[replacementAt]!.reason, 'obligation_open');
  assert.deepEqual(stubIds(ctx), ['o1', 'o2']);
  clean(ctx);
});

function clubReady() {
  const ctx = Context.create(service(clubBase(clubObligations())));
  const pending: Pending = new Map();
  for (const step of committeePrelude()) applyStep(ctx, step, pending, false);
  join(ctx, 'dana');
  const app = act(ctx, 'dana', CLUB + 'apply', { statement: 'private application' });
  const id = ctx.entries[app]!.id;
  act(ctx, 'bob', CLUB + 'vote', { application_id: id, choice: 'yes' });
  act(ctx, 'carol', CLUB + 'vote', { application_id: id, choice: 'yes' });
  const admit = act(ctx, 'alice', CLUB + 'admit', { application_id: id });
  return { ctx, id, app, admit, owed: ctx.state.obligations.find((o) => o.source === admit)! };
}
test('T3 Club delayed grant: literal performance succeeds; later reader retains the five-mismatch counterexample', () => {
  const { ctx, owed } = clubReady();
  assert.equal(owed.status, 'open');
  assert.equal(holdsNow(ctx.state, 'dana', CLUB + 'member'), false);
  assert.equal((ctx.state.models.club as { admits: unknown[] }).admits.length, 1);
  assert.equal(ctx.verdictAt(act(ctx, 'dana', CLUB + 'apply', { statement: 'blocked' }))!.reason, 'obligation_open');
  assert.equal((ctx.state.models.club as { applications: unknown[] }).applications.length, 1);
  performObligations(ctx);
  assert.equal(holdsNow(ctx.state, 'dana', CLUB + 'member'), true);
  assert.equal(ctx.state.obligations.find((o) => o.id === owed.id)!.status, 'fulfilled');
  join(ctx, 'erin');
  const found = violations(ctx, true);
  assert.equal(found.length, 5);
  assert.ok(found.every((v) => v.kind === 'mismatch' && v.participant === 'erin'));
  assert.equal(found[0]!.frontier, 13);
  assert.equal(found[0]!.actual?.outcomes['13']?.perModel?.club?.reason, 'no_quorum');
  assert.equal(found[2]!.actual?.outcomes['15']?.reason, 'unknown_obligation');
});

for (const name of ['invitation-acceptance', 'malformed-apply', 'standing-reason']) test('T3 original Club negative remains: ' + name, () => {
  const ctx = Context.create(service(clubBase(clubObligations())));
  const pending: Pending = new Map();
  for (const step of committeePrelude()) applyStep(ctx, step, pending, false);
  join(ctx, 'dana');
  join(ctx, 'frank', ['Member']);
  const target = name === 'invitation-acceptance' ? ctx.entries.find((e) => e.event.kind === K.accept_invite && e.event.actor === 'dana')!.position
    : name === 'malformed-apply' ? act(ctx, 'dana', CLUB + 'apply', { statement: 17 })
    : act(ctx, 'alice', CLUB + 'standing_reason', { member: 'dana', text: 'private reason' });
  const id = ctx.entries[target]!.id;
  for (const who of ['bob', 'carol']) act(ctx, who, CLUB + 'vote', { application_id: id, choice: 'yes' });
  const admit = act(ctx, 'alice', CLUB + 'admit', { application_id: id });
  assert.equal(ctx.state.verdicts[admit]!.effective, true);
  performObligations(ctx);
  const v = violations(ctx, true);
  assert.ok(v.some((v) => v.kind === 'invariant' && v.detail.includes('unknown application')));
  assert.deepEqual(v.filter((v) => v.kind !== 'invariant'), [], v.map(describeViolation).join('\n'));
});

test('T3 negative client boundary: incomplete Sale disclosure can fulfil card and still break view equality', () => {
  const { ctx, owed } = saleWindow();
  assert.equal(ctx.verdictAt(act(ctx, 'alice', K.disclose, { obligation: owed.id, positions: [], to: ['ivan'] }))!.effective, true);
  const at = replacement(ctx);
  assert.equal(ctx.state.verdicts[at]!.effective, true);
  const v = violations(ctx);
  assert.ok(v.some((v) => v.kind === 'mismatch' && v.participant === 'ivan' && v.frontier === at));
});

test('T3 negative client boundary: grant recipe does not authenticate hidden target actor', () => {
  const { ctx, owed } = clubReady();
  const at = act(ctx, 'alice', K.grant, { obligation: owed.id, principal: 'bob', roles: ['Member'] });
  assert.equal(ctx.state.verdicts[at]!.effective, true);
  assert.equal(holdsNow(ctx.state, 'dana', CLUB + 'member'), false);
  assert.equal(ctx.state.obligations.find((o) => o.id === owed.id)!.status, 'fulfilled');
});

for (const which of ['sale', 'club']) test('T3 conforming ' + which + ' campaign, 200 seeds', (t) => {
  let positions = 0;
  let obligations = 0;
  const failures: { seed: number; count: number; first: string }[] = [];
  for (let seed = 1; seed <= 200; seed++) {
    const spec = which === 'sale' ? saleGeneratorSpec(saleObligations()) : clubGeneratorSpec(clubObligations());
    spec.base = service(spec.base);
    const script = generate(spec, seed);
    script.joinDisclosure = false;
    const { ctx } = replay(script);
    assert.ok(ctx.entries.length <= spec.bounds.maxPositions, 'campaign bound');
    const found = violations(ctx, which === 'club');
    if (found.length) failures.push({ seed, count: found.length, first: describeViolation(found[0]!) });
    assert.ok(ctx.state.obligations.every((o) => o.status === 'fulfilled'));
    positions += ctx.entries.length;
    obligations += ctx.state.obligations.length;
  }
  t.diagnostic(JSON.stringify({ fixture: which, seeds: 200, positions, obligations, failures }));
  if (which === 'sale') assert.deepEqual(failures, []);
  else assert.ok(failures.length > 0, 'Club candidate must retain its late-reader campaign counterexamples');
});

const TASK = 'com.example.task.';
function taskPackage(mode: 'normal' | 'declaration-error' | 'matcher-error' | 'private-performance'): PackageDescriptor {
  const model: ModelSpec = {
    id: 'task', config: { mode }, init: () => ({ count: 0 }),
    roles: { Worker: ['work'] },
    fold: (state) => ({ effective: true, state: { count: (state as { count: number }).count + 1 } }),
    obligations: {
      on: [TASK + 'request'], contract: 'exact operation; public; no deadline',
      thenOblige: (_state, event, _ctx, cfg) => {
        if ((cfg as { mode: string }).mode === 'declaration-error') throw new Error('test declaration');
        return [{ role: 'Worker', act: { kind: TASK + 'perform', input: event.payload }, blocks: [] }];
      },
      ...(mode === 'matcher-error' ? { matches: () => { throw new Error('test matcher'); } } : {}),
    },
  };
  const base = { name: 'exact-obligations', module: import.meta.url, models: { task: model }, capabilities: ['work', 'perform'], kinds: {
    [TASK + 'request']: { kind: TASK + 'request', schema: {}, handlers: ['task'], audienceId: 'spine', audience: () => SPINE },
    [TASK + 'perform']: { kind: TASK + 'perform', schema: {}, handlers: ['task'], capability: 'perform', audienceId: mode === 'private-performance' ? 'members' : 'spine', audience: mode === 'private-performance' ? () => MEMBERS : () => SPINE },
  } };
  return { ...base, id: descriptorId(base) };
}
function taskContext(mode: Parameters<typeof taskPackage>[0]) {
  const pkg = taskPackage(mode);
  return Context.create({ creator: 'alice', packages: { [pkg.id]: pkg }, bindings: [{ package: pkg.id }], grants: [{ principal: 'alice', capabilities: ['perform', 'work'] }], nonce: 'generic-' + mode });
}
test('T3 default exact matcher distinguishes two live obligations and permits one performance', () => {
  const ctx = taskContext('normal');
  act(ctx, 'alice', TASK + 'request', { value: 1 });
  act(ctx, 'alice', TASK + 'request', { value: 2 });
  const [first, second] = ctx.state.obligations;
  const mismatch = act(ctx, 'alice', TASK + 'perform', { value: 1, obligation: second!.id });
  assert.equal(ctx.verdictAt(mismatch)!.reason, 'obligation_mismatch');
  assert.deepEqual(ctx.state.models.task, { count: 2 });
  const performed = act(ctx, 'alice', TASK + 'perform', { value: 1, obligation: first!.id });
  assert.equal(ctx.verdictAt(performed)!.effective, true);
  assert.deepEqual(ctx.state.obligations.map((o) => o.status), ['fulfilled', 'open']);
  assert.deepEqual(ctx.state.models.task, { count: 3 });
  assert.deepEqual(checkContext(ctx), []);
});
for (const mode of ['declaration-error', 'matcher-error', 'private-performance'] as const) test('T3 staged fold rolls back ' + mode, () => {
  const ctx = taskContext(mode);
  const source = act(ctx, 'alice', TASK + 'request', { value: 1 });
  if (mode === 'declaration-error') {
    assert.equal(ctx.verdictAt(source)!.reason, 'obligation_error');
    assert.deepEqual(ctx.state.models.task, { count: 0 });
    assert.deepEqual(ctx.state.obligations, []);
  } else {
    const owed = ctx.state.obligations[0]!;
    const before = contentId(ctx.state.models as Json);
    const at = act(ctx, 'alice', TASK + 'perform', { value: 1, obligation: owed.id });
    assert.equal(ctx.verdictAt(at)!.reason, 'obligation_error');
    assert.equal(contentId(ctx.state.models as Json), before);
    assert.equal(ctx.state.obligations[0]!.status, 'open');
    assert.deepEqual(ctx.state.audiences[at], { kind: 'named', principals: ['alice'] });
  }
  assert.deepEqual(checkContext(ctx), []);
});

const clubCounterexample = ['join-bob', 'join-dana', 'apply', 'vote-alice', 'vote-bob', 'admit', 'join-erin'] as const;
function minimalClub(steps: readonly string[]) {
  const ctx = Context.create(service(clubBase(clubObligations())));
  let target = 'sha256:' + '0'.repeat(64);
  for (const step of steps) {
    if (step.startsWith('join-')) {
      const who = step.slice(5);
      join(ctx, who, who === 'bob' ? ['Committee', 'Member'] : [], who !== 'erin');
      continue;
    }
    const actor = step === 'apply' ? 'dana' : step === 'vote-bob' ? 'bob' : 'alice';
    if (!ctx.state.participants.includes(actor)) continue;
    if (step === 'apply') { const at = act(ctx, actor, CLUB + 'apply', { statement: 'private' }); target = ctx.entries[at]!.id; }
    if (step.startsWith('vote-')) act(ctx, actor, CLUB + 'vote', { application_id: target, choice: 'yes' });
    if (step === 'admit') act(ctx, actor, CLUB + 'admit', { application_id: target });
  }
  return ctx;
}
test('T3 Club public-trigger counterexample is deletion-minimal over its seven declared logical steps', (t) => {
  const ctx = minimalClub(clubCounterexample);
  const found = violations(ctx, true).filter((v) => v.kind === 'mismatch');
  assert.ok(found.length > 0);
  assert.equal(found[0]!.participant, 'erin');
  assert.equal(found[0]!.frontier, 10);
  assert.equal(found[0]!.actual?.outcomes['10']?.perModel?.club?.reason, 'no_quorum');
  for (let i = 0; i < clubCounterexample.length; i++) {
    const candidate = minimalClub(clubCounterexample.filter((_, j) => i !== j));
    assert.deepEqual(violations(candidate, true).filter((v) => v.kind === 'mismatch'), [], 'deletion ' + i);
  }
  t.diagnostic(JSON.stringify({ steps: clubCounterexample, positions: ctx.entries.length, first: describeViolation(found[0]!) }));
});
