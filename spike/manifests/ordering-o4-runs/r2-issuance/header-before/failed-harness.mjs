// Ordinary signed JSON: preserve a genuine invite but add a fractional header field.
const root = process.env.WT + '/spike/';
const { buildThrough, keys, principals } = await import(root + 'fixtures/ordering-lifecycle-runner.ts');
const { K } = await import(root + 'src/foundation.ts');
const { signEvent } = await import(root + 'src/codec.ts');
for (const storage of ['memory', 'sqlite']) {
  const world = buildThrough('sale-accepted', {}, storage), scope = world.contexts.S;
  try {
    const ctx = scope.journal.context, position = ctx.entries.find(e => e.event.kind === K.invite).position;
    const payload = structuredClone(ctx.inviteEnvelope(position)); payload.invite.header.extra = 0.5;
    const envelope = signEvent(ctx.intent(principals.bob, K.accept_invite, payload), keys.bob);
    const head = ctx.head;
    let outcome, next;
    try { outcome = scope.submit(envelope); } catch (error) { outcome = { threw: String(error) }; }
    try { next = world.emit('S', 'alice', K.observe, { fact: 'after malformed header' }); } catch (error) { next = { threw: String(error) }; }
    world.restart('S');
    console.log(JSON.stringify({ storage, headBefore: head, outcome, next, coldHead: world.contexts.S.journal.context.head, coldBob: world.contexts.S.journal.context.state.participants.includes(principals.bob) }));
  } finally { world.close(); }
}
