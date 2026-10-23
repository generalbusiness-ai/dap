import { expect, test } from "vitest";
import { canonicalBytes, canonicalize, digestBytes, entryHash } from "@generalbusiness/dap-bytes";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { RetainedInput } from "@generalbusiness/dap-contract";
import { deliver } from "@generalbusiness/dap-derive/testing";
import { sourceOrderFixture } from "../../derive/test/fixtures-source-order.ts";
import { MemorySource, verify } from "../src/index.ts";
import { View } from "../src/view.ts";

test("both source arrival orders replay and historical views retain only the frontier applied at that head", async () => {
  for (const arrivals of [[[1, 0], [1, 1], [2, 0], [2, 1]], [[2, 1], [1, 0], [2, 0], [1, 1]]]) {
    const { sender, receiver, definition } = sourceOrderFixture();
    for (const [seq, n] of arrivals) expect(deliver(receiver, sender, seq!, n!)).toMatchObject({ result: "write" });
    const view = new View();
    for (const { entry, hash } of receiver.entries) view.fold(definition, entry, hash);
    expect(view.sourceOrder(sender.at, "sample")).toMatchObject({ seq: 2, n: 1 });
    expect(view.at(0).state.sourceOrder(sender.at, "sample")).toBeNull();
    const first = arrivals[0]!;
    expect(view.at(1).state.sourceOrder(sender.at, "sample")).toMatchObject({ seq: first[0], n: first[1] });
    const retained: RetainedInput[] = [{ kind: "definition", digest: definition.digest, bytes: canonicalize(definition.declared) }];
    for (const { entry } of sender.entries) retained.push({ kind: "entry", digest: digestBytes(canonicalBytes(entry)), bytes: canonicalize(entry), under: sender.under });
    const rows = [sender, receiver].map(ledger => ({ scope: ledger.at,
      entries: ledger.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained }));
    const source = new MemorySource(rows);
    const result = await verify(source, { mode: "replay", scope: receiver.at.scope, grants: "as-recorded", bounds: PROPOSED_BOUNDS });
    expect([result.report.result, result.why]).toEqual(["consistent", null]);
    if (arrivals[0]![0] === 2) {
      const tampered = structuredClone(receiver.last);
      if (tampered.input.type !== "delivery" || !("decision" in tampered.input)) throw Error("The fixture must end with a deciding delivery.");
      tampered.input.decision = "applied";
      rows[1]!.entries[rows[1]!.entries.length - 1] = { seq: tampered.seq, hash: entryHash(tampered), bytes: canonicalize(tampered) };
      const refused = await verify(new MemorySource(rows), { mode: "replay", scope: receiver.at.scope, grants: "as-recorded", bounds: PROPOSED_BOUNDS });
      expect(refused.report.result).toBe("mismatch");
    }
  }
});
