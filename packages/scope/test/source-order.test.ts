/** Native Durable Objects, real SQLite, actual sender journals and delivery
 * judging. The NET fixture's per-key grants/read access/transport are explicit
 * stand-ins; this does not prove enrollment or provider authority. */
import { expect, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { RetainedInput } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, digestBytes } from "@generalbusiness/dap-bytes";
import { MemorySource, verify } from "@generalbusiness/dap-replay";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { valid } from "@generalbusiness/dap-derive/testing";
import { sourceOrderDefinition } from "../../derive/test/fixtures-source-order.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { creation, Node, net, rita, settle } from "./net.ts";

test("native source order survives eviction, seals superseded decisions and snapshots its indexed frontier", async () => {
  const definition = valid(validateDefinition(sourceOrderDefinition, PROPOSED_BOUNDS));
  net.hold = () => true;
  try {
    for (const arrivals of [[[1, 0], [1, 1], [2, 0], [2, 1]], [[2, 1], [1, 0], [2, 0], [1, 1]]]) {
      const found = async () => {
        const { signed, name } = creation(definition, {}), node = new Node(name, definition.declared);
        expect(await node.stub.create(signed, definition.declared, [])).toMatchObject({ answer: "accepted" }); return node;
      };
      const receiver = await found(), sender = await found();
      for (const [first, second] of [[1, 2], [3, 4]]) await sender.did(rita, "emit", { on: 0, expected: { on: (await sender.item(0))!.revision }, fields: { to: await receiver.at(), first: first!, second: second! } });
      await settle(sender, receiver);
      const outcomes: string[] = [];
      for (const [seq, n] of arrivals) {
        await receiver.restart();
        expect(await receiver.stub.deliver(await sender.envelope(seq!, n!))).toMatchObject({ answer: "recorded" });
        const entry = (await receiver.entries()).at(-1)!;
        expect(entry.input).toMatchObject({ type: "delivery" });
        if (entry.input.type === "delivery" && "decision" in entry.input) outcomes.push(entry.input.decision);
      }
      expect(outcomes).toEqual(arrivals[0]![0] === 1 ? ["applied", "applied", "applied", "applied"] : ["applied", "superseded", "superseded", "superseded"]);
      expect((await receiver.item(0))!.values["last"]).toBe(4);
      const from = await sender.at();
      const held = await runInDurableObject(receiver.object, (_instance, state) => {
        const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
        return { highest: store.sourceOrder(from, "sample"), snapshot: store.all() };
      });
      expect(held.highest).toMatchObject({ seq: 2, n: 1 });
      expect(held.snapshot.sourceOrder).toEqual([held.highest]);
      const before = (await receiver.summary()).at;
      await receiver.restart();
      expect(await receiver.stub.deliver(await sender.envelope(2, 1))).toMatchObject({ answer: "recorded" });
      expect((await receiver.summary()).at).toEqual(before);
      const sent = await sender.sealed(), received = await receiver.sealed();
      const retained: RetainedInput[] = [{ kind: "definition", digest: definition.digest, bytes: canonicalize(definition.declared) },
        ...sent.map(({ entry }) => ({ kind: "entry" as const, digest: digestBytes(canonicalBytes(entry)), bytes: canonicalize(entry), under: definition.declared.name }))];
      const source = new MemorySource([{ scope: from, entries: sent.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained },
        { scope: await receiver.at(), entries: received.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained }]);
      const replay = await verify(source, { mode: "replay", scope: receiver.name, grants: "as-recorded", bounds: PROPOSED_BOUNDS });
      expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    }
  } finally { net.hold = null; }
});
