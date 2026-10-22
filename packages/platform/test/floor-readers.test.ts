/** Real platform rules over judged in-memory directory entries. Child
 * histories and actor authority come from the existing scripted fixture;
 * the sparse Own port models eviction and makes no native custody claim. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Own, RuleGiven } from "@generalbusiness/dap-derive";
import { directoryRules } from "../src/index.ts";
import { platformFloorReferences } from "../src/floor.ts";
import { Directory, creationRita as rita } from "./fixtures-entry.ts";

test("directory import-spent walks sparse held entries and retains unresolved import openings", () => {
  const directory = new Directory({ import: "https://git.example/old/repository.git" });
  const opening = directory.entries.find(({ entry }) => entry.effects.some(effect => effect.effect === "operation" && effect.kind === "import"))!.entry.seq;
  const operation = `${opening}:0` as const;
  for (const attempt of [1, 2, 3]) expect(directory.outcome(operation, attempt, "refused", {}).result).toBe("write");
  const removed = directory.entries.find(({ entry }) => entry.seq > 0 && entry.seq !== opening && entry.effects.every(effect => effect.effect !== "operation"))!.entry.seq;
  const held = directory.entries.map(({ entry }) => entry.seq).filter(seq => seq !== removed);
  const sparse: Own = Object.assign((seq: number) => seq === removed ? null : directory.own(seq), { positions: (before: number) => held.filter(seq => seq < before) });
  const given: RuleGiven = {
    state: directory.state, input: { type: "act", signed: directory.intent(rita, "retry-import"), grant: null, presented: {} },
    time: directory.now, uses: [], own: sparse, placed: () => undefined, observed: () => null, value: () => null,
    resolved: { at: directory.at, self: directory.head.seq + 1, fields: {}, subjects: new Map(), signer: { member: rita.member, principal: null }, bounds: PROPOSED_BOUNDS },
  };
  const rule = directoryRules["import-spent"];
  if (rule?.place !== "guard") throw Error("the real import-spent guard is required");
  expect(rule.run(given)).toEqual({ holds: true });
  // The identical missing payload without a sparse position port fails:
  // this distinguishes the historical dense scan from the repaired reader.
  expect(rule.run({ ...given, own: seq => sparse(seq) })).toEqual({ holds: false, name: "import-not-spent" });
  expect([...platformFloorReferences(directory.state.all(), directory.definition, sparse)]).toContain(opening);
  const repository = directory.item(0);
  directory.state.putItem({ ...repository, values: { ...repository.values, imported: "a".repeat(40) } });
  expect([...platformFloorReferences(directory.state.all(), directory.definition, sparse)]).toEqual([]);
});
