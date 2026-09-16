// Review #456: an audience refusal must discard every handler's effect.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkContext } from '../src/checker.ts';
import { Context } from '../src/context.ts';
import { CAP, K } from '../src/foundation.ts';
import { foldPrefix } from '../src/oracle.ts';
import { audienceThrowPackage, THROW_KIND } from './fixtures/audience-throw.ts';

test('an audience error discards all model effects, survives retry, and replays consistently', () => {
  const pkg = audienceThrowPackage;
  const ctx = Context.create({
    creator: 'alice',
    packages: { [pkg.id]: pkg },
    bindings: [{ package: pkg.id }],
    grants: [{ principal: 'alice', capabilities: [CAP.invite] }],
  });
  const invitation = ctx.act('alice', K.invite, { invitee: 'bob', grants: { principal: 'bob' }, token_id: 'join-bob' });
  assert.ok(!('refused' in invitation));
  const joined = ctx.submit(ctx.intent('bob', K.accept_invite, ctx.inviteEnvelope(invitation.header.position) as never));
  assert.ok(!('refused' in joined) && joined.verdict?.effective);
  const before = structuredClone(ctx.state.models);

  const intent = ctx.intent('alice', THROW_KIND, { failAudience: true });
  const refused = ctx.submit(intent, ctx.credentialFor('alice'));
  assert.ok(!('refused' in refused));
  assert.deepEqual(refused.verdict, { known: true, authorized: true, effective: false, reason: 'audience_error:test audience failure' });
  assert.deepEqual(ctx.state.models, before);
  assert.deepEqual(ctx.state.audiences[refused.header.position], { kind: 'named', principals: ['alice'] });
  assert.equal(ctx.view('bob')[refused.header.position]!.event, undefined);

  const head = ctx.head;
  const retry = ctx.submit(intent, ctx.credentialFor('alice'));
  assert.ok(!('refused' in retry) && retry.replay);
  assert.deepEqual(retry.verdict, refused.verdict);
  assert.equal(ctx.head, head);
  assert.deepEqual(ctx.state.models, before);

  const next = ctx.act('alice', THROW_KIND, { failAudience: false });
  assert.ok(!('refused' in next) && next.verdict?.effective);
  for (const id of ['first', 'second']) {
    assert.deepEqual(ctx.state.models[id], { count: 1, positions: [next.header.position] });
  }
  assert.deepEqual(foldPrefix(ctx, ctx.head).models, ctx.state.models);
  assert.deepEqual(checkContext(ctx), []);
});
