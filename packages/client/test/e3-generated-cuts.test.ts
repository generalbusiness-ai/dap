import { expect, test } from "vitest";
import { timeOf } from "@generalbusiness/dap-bytes";
import { memoryStore } from "../src/custody.ts";
import { memoryDrafts } from "../src/draft-store.ts";
import { clientIdle, clientReplica, scopeClient } from "../src/scope-client.ts";
import { explore } from "../src/scope.ts";
import { Feed } from "./replica-support.ts";
import { c4SelectionRuntime } from "./support/c4-runtime.ts";

// Each held judgment is compared with E1 while both still name the same cut.
test("generated held views preserve their checked head, clock and standing", async () => {
  const runtime = await c4SelectionRuntime(true), feed = new Feed();
  let now = runtime.now(), current = true, tick = () => {}, changed = () => {};
  const requestedAt = timeOf(now - 1000), timers = new Map<number, () => void>();
  let nextTimer = 0;
  const client = scopeClient(runtime.handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store: memoryStore(), drafts: memoryDrafts(),
    observe: feed.observe, exploration: runtime.readInputs,
    clock: { now: () => now, set: run => { const id = nextTimer++; timers.set(id, run); return id; }, clear: id => { timers.delete(id as number); } },
    viewAuthority: { read: async () => ({ is: "ready", session: runtime.session, requestedAt }), current: () => current,
      observe: notify => { changed = notify; return () => {}; } }, ticks: notify => { tick = notify; return () => {}; } });
  try {
    feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
    for (let seed = 0; seed < 12; seed++) {
      const held = client.view, head = structuredClone(held.head), at = timeOf(now);
      const act = { kind: "rename-anchor" as const, on: 0, fields: { label: `held-${seed}` }, expected: { on: runtime.store.item(0)!.revision } };
      const before = held.explore(`e3-generated-${seed}`, act);
      const fresh = await explore(clientReplica(client), `e3-generated-${seed}`, act, { session: runtime.session, requestedAt }, () => at);
      expect(held.head).toEqual(head);
      expect(clientReplica(client).view.head).toEqual(head);
      expect(before.is).toBe("admitted");
      if (before.is !== "admitted" || fresh.is !== "admitted") return expect.fail("same-cut E1 and view judgments admit");
      expect(fresh.context.head).toEqual(head);
      expect({ ...before, after: null }).toEqual({ ...fresh, after: null });
      expect(before.after.row(0)).toEqual(fresh.after.row(0));
      if (seed % 3 === 0) {
        const packet = await runtime.handle.intent(runtime.signer, "rename-anchor", { on: 0, fields: { label: `head-${seed}` },
          expected: { on: runtime.store.item(0)!.revision } }, { now: runtime.now(), idempotencyKey: `e3-generated-head-${seed}`, lifetimeSeconds: 60 });
        expect((await runtime.handle.submit(packet.signed, [], packet.beside)).answer).toBe("accepted");
        await client.read(); await clientIdle(client);
        expect(client.view.head).not.toEqual(head);
      } else if (seed % 3 === 1) {
        now += 101 + seed; tick(); await clientIdle(client);
        const advanced = client.view.explore(`e3-generated-new-${seed}`, act);
        if (advanced.is === "incomplete") return expect.fail("complete tick judgment");
        expect(advanced.context.clock).toBe(timeOf(now));
      } else {
        current = false; changed(); await clientIdle(client);
        expect(client.view.explore(`e3-generated-new-${seed}`, act)).toMatchObject({ is: "unavailable", lacks: ["authority-unavailable"] });
        current = true; changed(); await clientIdle(client);
      }
      const after = held.explore(`e3-generated-${seed}`, act);
      expect(after.is).toBe("admitted");
      if (after.is !== "admitted") return expect.fail("held judgment remains admitted");
      expect({ ...after, after: null }).toEqual({ ...fresh, after: null });
      expect(after.after.row(0)).toEqual(fresh.after.row(0));
    }
  } finally { client.close(); runtime.close(); }
});
