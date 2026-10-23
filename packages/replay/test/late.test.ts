import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { RetainedInput } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, digestBytes, entryHash } from "@generalbusiness/dap-bytes";
import { deliver, t } from "@generalbusiness/dap-derive/testing";
import { lateFixture } from "../../derive/test/fixtures-late.ts";
import { MemorySource, verify } from "../src/index.ts";

test("late and boundary judgments replay, while a changed branch marker or refusal code is a mismatch", async () => {
  for (const branch of [false, true]) for (const seconds of [29.999, 30, 30.001]) {
    const { sender, receiver, definition } = lateFixture(branch); receiver.now = t(seconds);
    expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "write" });
    const retained: RetainedInput[] = [{ kind: "definition", digest: definition.digest, bytes: canonicalize(definition.declared) },
      ...sender.entries.map(({ entry }) => ({ kind: "entry" as const, digest: digestBytes(canonicalBytes(entry)), bytes: canonicalize(entry), under: sender.under }))];
    const rows = [sender, receiver].map(ledger => ({ scope: ledger.at, entries: ledger.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained }));
    const replay = await verify(new MemorySource(rows), { mode: "replay", scope: receiver.at.scope, grants: "as-recorded", bounds: PROPOSED_BOUNDS });
    expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    if (seconds > 30) {
      const changed = structuredClone(receiver.last);
      if (changed.input.type !== "delivery" || !("decision" in changed.input)) throw Error("Expected the actual deciding request.");
      if (branch) delete changed.input.late;
      else changed.input.reason = { code: "guard-failed", name: "old-sample" };
      rows[1]!.entries[1] = { seq: changed.seq, hash: entryHash(changed), bytes: canonicalize(changed) };
      const mismatch = await verify(new MemorySource(rows), { mode: "replay", scope: receiver.at.scope, grants: "as-recorded", bounds: PROPOSED_BOUNDS });
      expect(mismatch.report.result).toBe("mismatch");
    }
  }
});
