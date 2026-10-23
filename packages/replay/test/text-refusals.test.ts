import { earlierFieldProof } from "../../derive/test/definition-corpus/replay-mutations-data.ts";
import { expect, test } from "vitest";
import { canonicalize, factRefOf, textDigest } from "@generalbusiness/dap-bytes";
import { judgeDelivery } from "@generalbusiness/dap-derive";
import { arriving, created, forged, keys, notesDefinition, on, otherLane, variant } from "@generalbusiness/dap-derive/testing";
import { MemorySource, verify, type MemoryScope } from "../src/index.ts";

test("an earlier successful field check rules out a later fabricated size refusal even after the text is erased", async () => {
  const definition = variant(notesDefinition.declared, earlierFieldProof);
  const scope = created(definition, {}, "earlier-field-proof"), body = "four", digest = textDigest(body);
  expect(scope.act(keys.rita, "write", { ...on(scope, 0), fields: { body: digest } }, { texts: () => 4 }).result).toBe("write");
  const send = { n: 0, to: scope.at, message: { class: "request", type: "tell", body: { message: "noted", fields: { body: digest } } } } as const;
  const source = { ...forged(otherLane, 100, { type: "checkpoint", through: 0, state: definition.digest }, [send]), under: "notes" }, fact = factRefOf(source.entry);
  const arrival = { ...send, from: fact };
  // Deliberately untrue historical size: this makes a forged refusal,
  // not an input that any native scope admitted. The foreign send is an
  // explicit caller anchor; the earlier local check must still constrain it.
  const refusal = judgeDelivery(scope.state, definition, arrival, { ...arriving(scope, arrival, source), texts: () => 5 });
  expect(refusal).toMatchObject({ result: "write", draft: { input: { decision: "refused", reason: { code: "bad-field" } } } });
  if (refusal.result !== "write") throw new Error("fixture refusal must write");
  scope.remember([{ ...source, fact }]); scope.seal(refusal.draft);
  const deciding = scope.last.seq, use = scope.last.uses[0]!;
  scope.did(keys.rita, "strike", on(scope, 0));
  const served: MemoryScope = {
    scope: scope.at,
    entries: scope.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })),
    retained: [
      { kind: "definition", digest: definition.digest, bytes: canonicalize(definition.declared) },
      { kind: "entry", digest: use.content, bytes: canonicalize(source.entry), under: "notes" },
    ],
  };
  const result = await verify(new MemorySource([served]), { mode: "replay", scope: scope.at.scope, grants: "as-recorded", anchors: [{ scope: fact.at.scope, seq: fact.seq, hash: fact.hash }] });
  expect([result.report.result, result.report.at?.seq, result.why]).toEqual(["mismatch", deciding, "the recorded input, with its decision, is not the one derived again"]);
  expect(result.report.coverage).toEqual([{ scope: scope.at, from: 0, through: deciding - 1 }]);
});
