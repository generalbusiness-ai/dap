/** Live note sections 3.1, 3.2 and 7: ordinary declaration forms, two creation entries, and no third retained entry. */
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Entry } from "@generalbusiness/dap-contract";
import { entryHash } from "@generalbusiness/dap-bytes";
import { applyEntry, checkpointOf, clockOf, derivable, judgeGenesis, validateDefinition, type Problem } from "../src/index.ts";
import { liveBase, liveDurableForms, liveForms, liveOutcomeSend } from "./definition-corpus/live-data.ts";
import { contextParentData } from "./definition-corpus/general-creation-data.ts";
import { Ledger, T0, creation, deliver, created, keys, valid } from "./fixtures-entry.ts";

const problems = (declaration: unknown): readonly Pick<Problem, "code" | "path">[] => {
  const checked = validateDefinition(declaration, PROPOSED_BOUNDS, undefined, { canonical: true });
  return checked.ok ? [] : checked.problems.map(({ code, path }) => ({ code, path }));
};

test.for(Object.entries(liveForms))("the validator admits the live form %s and its recorded counterpart", ([, declaration]) => {
  const live = declaration(); expect(problems(live)).toEqual([]);
  delete live.level; expect(problems(live)).toEqual([]);
});

describe("a durable form is admitted as recorded and refused after changing only the level", () => {
  const paths: Record<keyof typeof liveDurableForms, string> = {
    handler: "receives.count", create: "acts.count.sends.0", tell: "acts.count.sends.0", relate: "acts.count.sends.0", index: "acts.count.sends.0",
    genesisSend: "acts.found.sends.0", capability: "capabilities.0", hold: "capabilities.0", preparation: "capabilities.1",
    presents: "acts.count.presents", factField: "acts.count.fields.proof", factList: "acts.count.fields.proof.of",
    factRecord: "acts.count.fields.proof.of.proof", factListRecord: "acts.count.fields.proof.of.of.proof",
    factSlot: "items.tally.refs.proof.to", factValue: "items.tally.values.proof.of", factOperand: "acts.count.fields.proof", presentedFact: "acts.count.presents",
    attention: "acts.count.attention.0", timedAttention: "timed.expire.attention.0",
  };
  test.for(Object.entries(liveDurableForms))("%s", ([name, declaration]) => {
    const recorded = declaration(); expect(problems(recorded)).toEqual([]);
    expect(problems({ ...recorded, level: { name: "live", version: 1 } })).toContainEqual({ code: "shape", path: paths[name as keyof typeof liveDurableForms] });
  });
});

test("a recorded platform declaration is admitted, but live version 1 refuses it with its named reason", () => {
  const recorded = liveOutcomeSend();
  expect(validateDefinition(recorded, PROPOSED_BOUNDS, undefined, { platform: true }).ok).toBe(true);
  const refused = validateDefinition({ ...recorded, level: { name: "live", version: 1 } }, PROPOSED_BOUNDS, undefined, { platform: true });
  expect(!refused.ok && refused.problems.map(({ code, path }) => ({ code, path }))).toEqual([{ code: "live-platform", path: "level" }]);
});

test("live admission implements exactly version 1", () => {
  expect(problems({ ...liveBase(), level: { name: "live", version: 2 } })).toEqual([{ code: "unsupported-definition", path: "level" }]);
});

test("LV1 validates live creation forms but keeps runtime derivation disabled until LV2", () => {
  const live = valid(validateDefinition(liveBase(), PROPOSED_BOUNDS));
  const recorded = valid(validateDefinition(liveBase(false), PROPOSED_BOUNDS));
  expect([derivable(live, null), derivable(recorded, null)]).toEqual([false, true]);
});

function confirmed(declaration: DeclaredDefinition) {
  const definition = valid(validateDefinition(declaration, PROPOSED_BOUNDS));
  const parentData = contextParentData(definition.digest, "lane");
  parentData.acts["spawn"]!.sends = [{ create: { kind: "lane", definition: definition.digest, fields: {}, result: {} } }];
  const parent = created(valid(validateDefinition(parentData, PROPOSED_BOUNDS)), {});
  const sent = parent.did(keys.rita, "spawn", { on: 0, expected: { on: parent.item(0).revision } });
  const child = new Ledger(definition), { asked, source } = creation(parent, sent.seq);
  const judgment = judgeGenesis(child.state, definition, asked, { clock: clockOf(child.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source });
  expect(judgment.result).toBe("write");
  if (judgment.result !== "write") throw new Error("the ordinary child creation must write its genesis");
  child.seal(judgment.draft);
  expect(child.state.scope()!.status).toBe("provisional");
  expect(child.last.sends).toEqual([{ n: 0, to: parent.at, message: { class: "result", of: { from: parent.fact(sent.seq), n: 0 }, outcome: "applied" } }]);
  expect(deliver(parent, child, 0).result).toBe("write");
  expect(deliver(child, parent, parent.last.seq, 0).result).toBe("write");
  expect([child.entries.length, child.state.scope()!.status, child.item(0).values["count"]]).toEqual([2, "active", 0]);
  return child;
}

test("ordinary create and confirmation fold, but a third live entry fails before changing state", () => {
  const child = confirmed(liveBase());
  const before = child.state.snapshot();
  // A structurally sequential checkpoint would be legal in a recorded journal and changes no item.
  const third: Entry = { v: 1, genesis: child.at.genesis, seq: 2, prev: child.head.hash, time: T0, clamped: false, epoch: 0,
    input: { type: "checkpoint", ...checkpointOf(child.state) }, uses: [], prepared: [], effects: [], sends: [] };
  expect(() => applyEntry(child.state, child.definition, third, entryHash(third), child.foldOptions)).toThrow("a live scope records no entry after confirmation");
  expect([child.state.snapshot(), child.entries.length]).toEqual([before, 2]);

  const recorded = confirmed(liveBase(false));
  const permitted: Entry = { ...third, genesis: recorded.at.genesis, prev: recorded.head.hash, input: { type: "checkpoint", ...checkpointOf(recorded.state) } };
  expect(() => recorded.fold(permitted)).not.toThrow();
  expect(recorded.head.seq).toBe(2);
});
