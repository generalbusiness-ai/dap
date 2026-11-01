/**
 * What every test of several scopes rests on: `settle` returns only after a
 * round that made no dispatch and moved no head of its list. A send recorded
 * behind a round moves its scope's head, so `settle` goes on. A transport gate
 * places the send behind the round, as a slow machine does.
 *
 * A send can stay on its way past that condition. The comment on `quiet` in
 * `net.ts` lists those cases.
 *
 * The office is the STAND-IN of `repository.ts`. The membership scope, its
 * dispatcher and the inbox it creates are real.
 */

import { expect, test } from "vitest";
import { office, rita, settle } from "./repository.ts";
import { reader } from "./support.ts";
import { platformNet } from "./worker.ts";

test("settle does not return while a send recorded behind its round is in flight", async () => {
  const { O, M } = await office();
  let open = (): void => undefined;
  const gate = new Promise<void>((resolve) => { open = resolve; });
  platformNet.pause = () => gate;
  try {
    let seq = -1;
    const behind = {
      object: M.object,
      stub: {
        dispatch: async () => {
          // A second call means `settle` saw the head move. Only then does the send go on.
          if (seq >= 0) open();
          const made = await M.stub.dispatch();
          // The round has called M and found nothing. M now records a send, and its background pass waits at the gate.
          if (seq < 0) seq = await M.did(rita, "seat", { expected: { roster: 1 } });
          return made;
        },
      },
    };
    await settle(behind, O);
    const outbox = await M.stub.outbox(reader);
    if (!outbox.ok) return expect.fail(`no outbox: ${outbox.reason}`);
    expect(outbox.value.find((item) => item.outboxId === `${seq}.0`)?.acknowledged, "the send's delivery was answered").toBeTruthy();
  } finally {
    open();
    platformNet.pause = null;
  }
});
