import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkContext } from '../src/checker.ts';
import { Context } from '../src/context.ts';
import { attach, bindingId, emptyEnvironment } from '../src/descriptor.ts';
import { CAP, K, RUNTIME } from '../src/foundation.ts';
import { foldPrefix } from '../src/oracle.ts';
import { extraHandlerPackage, STATE_KIND, stateAudiencePackage } from './fixtures/audience-state.ts';

function context() {
  const pkg = stateAudiencePackage();
  const ctx = Context.create({ creator: 'alice', packages: { [pkg.id]: pkg, [extraHandlerPackage.id]: extraHandlerPackage }, bindings: [{ package: pkg.id }], grants: [{ principal: 'alice', capabilities: [CAP.invite, CAP.attach] }] });
  const invite = ctx.act('alice', K.invite, { invitee: 'bob', grants: { principal: 'bob' }, token_id: 'join-bob' });
  assert.ok(!('refused' in invite));
  const joined = ctx.submit(ctx.intent('bob', K.accept_invite, ctx.inviteEnvelope(invite.header.position) as never));
  assert.ok(!('refused' in joined) && joined.verdict?.effective);
  return ctx;
}

test('audience reads frozen preceding state without changing model state or earlier audiences', () => {
  const ctx = context();
  const first = ctx.act('alice', STATE_KIND, {});
  assert.ok(!('refused' in first) && first.verdict?.effective);
  assert.deepEqual(ctx.state.audiences[first.header.position], { kind: 'spine' });
  const second = ctx.act('alice', STATE_KIND, {});
  assert.ok(!('refused' in second) && second.verdict?.effective);
  assert.deepEqual(ctx.state.audiences[second.header.position], { kind: 'members' });
  const before = structuredClone(ctx.state.models);
  const mutate = ctx.act('alice', STATE_KIND, { mutate: true });
  assert.ok(!('refused' in mutate) && mutate.verdict && !mutate.verdict.effective);
  assert.match(mutate.verdict.reason!, /^audience_error:/);
  assert.deepEqual(ctx.state.models, before);
  assert.deepEqual(ctx.state.audiences[mutate.header.position], { kind: 'named', principals: ['alice'] });
  assert.deepEqual(ctx.state.audiences[first.header.position], { kind: 'spine' });
  assert.deepEqual(foldPrefix(ctx, ctx.head).models, ctx.state.models);
  assert.deepEqual(checkContext(ctx), []);
});

test('attaching a handler retains the original audience read scope and rolls back undeclared reads', () => {
  const ctx = context();
  const attached = ctx.act('alice', K.attach, { package: extraHandlerPackage.id, resolution: { [STATE_KIND]: { handlers: ['counter', 'extra'] } } });
  assert.ok(!('refused' in attached) && attached.verdict?.effective);
  const before = structuredClone(ctx.state.models);
  const undeclared = ctx.act('alice', STATE_KIND, { read: 'extra' });
  assert.ok(!('refused' in undeclared));
  assert.equal(undeclared.verdict?.reason, 'audience_error:undeclared audience model read: extra');
  assert.deepEqual(ctx.state.models, before);
  const next = ctx.act('alice', STATE_KIND, {});
  assert.ok(!('refused' in next) && next.verdict?.effective);
  assert.deepEqual(ctx.state.models, { counter: { count: 1 }, extra: { count: 1 } });
  assert.deepEqual(checkContext(ctx), []);
});

test('binding identity includes the audience read scope even when resolved handlers match', () => {
  const narrow = attach(emptyEnvironment(RUNTIME), stateAudiencePackage());
  const wide = attach(emptyEnvironment(RUNTIME), stateAudiencePackage(true));
  assert.ok(narrow.ok && wide.ok);
  const expanded = attach(narrow.env, extraHandlerPackage, { resolution: { [STATE_KIND]: { handlers: ['counter', 'extra'] } } });
  assert.ok(expanded.ok);
  assert.deepEqual(expanded.env.kinds[STATE_KIND]!.handlers, wide.env.kinds[STATE_KIND]!.handlers);
  assert.notEqual(bindingId(expanded.env, STATE_KIND), bindingId(wide.env, STATE_KIND));
});
