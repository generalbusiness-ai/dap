/** Actual native Scope/SQLite and authenticated delivery/result paths. NET's
 * grants, reader access, transport and clock remain labelled fixture ports. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { RetainedInput } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, digestBytes, timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { valid } from "@generalbusiness/dap-derive/testing";
import { lateDefinition } from "../../derive/test/fixtures-late.ts";
import { MemorySource, verify } from "@generalbusiness/dap-replay";
import { creation, Node, net, rita, settle } from "./net.ts";

test("native late branches preserve strict boundaries, refusal authentication, exact repeats, clock-behind and replay", async () => {
  const original = net.clock.now, start = timeMs(original)!; let index = 0;
  net.hold = () => true;
  try {
    for (const branch of [false, true]) for (const seconds of [29.999, 30, 30.001]) {
      const base = start + index++ * 120_000; net.clock.now = timeOf(base);
      const definition = valid(validateDefinition(lateDefinition(branch), PROPOSED_BOUNDS));
      const found = async () => {
        const { signed, name } = creation(definition, {}), node = new Node(name, definition.declared);
        expect(await node.stub.create(signed, definition.declared, [])).toMatchObject({ answer: "accepted" }); return node;
      };
      const sender = await found(), receiver = await found();
      await sender.did(rita, "emit", { on: 0, expected: { on: (await sender.item(0))!.revision }, fields: { to: await receiver.at(), first: 1, second: 2 } });
      await settle(sender, receiver); net.clock.now = timeOf(base + seconds * 1000);
      const answer = await receiver.stub.deliver(await sender.envelope(1, 0));
      expect(answer).toMatchObject({ answer: "recorded" });
      const deciding = (await receiver.entries()).at(-1)!, late = seconds > 30, refused = late && !branch;
      expect(deciding.input).toMatchObject({ type: "delivery", decision: refused ? "refused" : "applied" });
      expect((await receiver.item(0))!.values["last"]).toBe(refused ? 0 : late ? 99 : 1);
      if (late && branch) expect(deciding.input).toHaveProperty("late", { reason: "old-sample" });
      else expect(deciding.input).not.toHaveProperty("late");
      if (refused) {
        expect(deciding.effects).toEqual([]);
        expect(deciding.sends).toHaveLength(1);
        expect(deciding.sends[0]!.message).toMatchObject({ class: "result", outcome: "refused", reason: { code: "late", name: "old-sample" } });
        expect(await sender.stub.deliver(await receiver.envelope(deciding.seq, 0))).toMatchObject({ answer: "recorded" });
        expect((await sender.entries()).at(-1)!.input).toMatchObject({ type: "delivery", clause: "refused" });
      }
      const before = (await receiver.summary()).at;
      await receiver.restart();
      expect(await receiver.stub.deliver(await sender.envelope(1, 0))).toEqual(answer);
      expect((await receiver.summary()).at).toEqual(before);
      net.clock.now = timeOf(base + seconds * 1000 - 1);
      expect(await receiver.stub.deliver(await sender.envelope(1, 1))).toMatchObject({ answer: "retry", reason: "clock-behind" });
      expect((await receiver.summary()).at).toEqual(before);
      const histories = await Promise.all([sender.sealed(), receiver.sealed()]);
      const retained: RetainedInput[] = [{ kind: "definition", digest: definition.digest, bytes: canonicalize(definition.declared) },
        ...histories.flatMap(history => history.map(({ entry }) => ({ kind: "entry" as const, digest: digestBytes(canonicalBytes(entry)), bytes: canonicalize(entry), under: definition.declared.name })))];
      const rows = [{ scope: await sender.at(), history: histories[0]! }, { scope: await receiver.at(), history: histories[1]! }].map(({ scope, history }) => ({ scope, entries: history.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained }));
      const replay = await verify(new MemorySource(rows), { mode: "replay", scope: receiver.name, grants: "as-recorded", bounds: PROPOSED_BOUNDS });
      expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    }
  } finally { net.clock.now = original; net.hold = null; }
});
