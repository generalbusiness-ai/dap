// Shrink only the recorded readable-event privacy failure, without
// replacing it with a different failure introduced by deleting a step.
import { ADMIN, privateParties } from '../../manifests/booking.ts';
import { replay, type Script } from '../../src/script.ts';

export function hasPrivateDisclosure(script: Script): boolean {
  const { ctx } = replay(script);
  // Audiences only grow. With no removal in this corpus, every earlier
  // readable private event is still readable at the final frontier.
  return ctx.state.participants.some((p) => {
    const view = ctx.view(p, ctx.head);
    return view.some((v) => {
      const parties = privateParties(view, v.position, ADMIN);
      return parties !== undefined && !parties.includes(p);
    });
  });
}
