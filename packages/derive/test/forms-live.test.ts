/** Live note sections 3.1, 3.2 and 7: ordinary declaration forms, two creation entries, and no third retained entry. */
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Entry } from "@generalbusiness/dap-contract";
import { entryHash } from "@generalbusiness/dap-bytes";
import { applyEntry, applyLive, checkpointOf, clockOf, derivable, entryOf, judgeGenesis, validateDefinition, MemoryState, type Problem } from "../src/index.ts";
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

test("LV2 derives a live definition as it derives the recorded one", () => {
  const live = valid(validateDefinition(liveBase(), PROPOSED_BOUNDS));
  const recorded = valid(validateDefinition(liveBase(false), PROPOSED_BOUNDS));
  expect([derivable(live, null), derivable(recorded, null)]).toEqual([true, true]);
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

test("applyLive folds a judged act into an active live scope's memory at the next tick, and nothing else", () => {
  const child = confirmed(liveBase());
  const judged = child.judge(child.intent(keys.rita, "count", { on: 0, expected: { on: 1 }, fields: { next: 3 } }));
  if (judged.result !== "write") throw new Error(`count was not judged to write: ${JSON.stringify(judged)}`);
  const entry = entryOf(child.state, judged.draft, clockOf(child.state, T0));
  expect(() => applyEntry(child.state, child.definition, entry, entryHash(entry), child.foldOptions)).toThrow("a live scope records no entry after confirmation");
  applyLive(child.state, child.definition, entry, entryHash(entry), child.foldOptions);
  expect([child.state.scope()!.head, child.item(0).values["count"], child.item(0).revision, child.entries.length]).toEqual([{ seq: 2, hash: entryHash(entry) }, 3, 2, 2]);

  // A checkpoint is no live input. A recorded scope, and a live scope before its confirmation, take no live input.
  const checkpoint: Entry = { ...entry, genesis: child.at.genesis, seq: 3, prev: entryHash(entry), input: { type: "checkpoint", ...checkpointOf(child.state) }, effects: [] };
  expect(() => applyLive(child.state, child.definition, checkpoint, entryHash(checkpoint))).toThrow("a live scope applies no checkpoint input");
  const recorded = confirmed(liveBase(false));
  const counted = recorded.judge(recorded.intent(keys.rita, "count", { on: 0, expected: { on: 1 }, fields: { next: 3 } }));
  if (counted.result !== "write") throw new Error("count was not judged to write");
  const sealed = entryOf(recorded.state, counted.draft, clockOf(recorded.state, T0));
  expect(() => applyLive(recorded.state, recorded.definition, sealed, entryHash(sealed))).toThrow("only an active live scope applies a live input");
});

test("live staged folds leave the original state intact on refusal and fault, and commit the same result as a separate fold", () => {
  const child = confirmed(liveBase());
  const judged = child.judge(child.intent(keys.rita, "count", { on: 0, expected: { on: 1 }, fields: { next: 9 } }));
  if (judged.result !== "write") throw new Error("the fixture act must write");
  const entry = entryOf(child.state, judged.draft, clockOf(child.state, T0)), hash = entryHash(entry);
  const staged = MemoryState.stagedLive();
  for (const kept of child.entries) applyEntry(staged, child.definition, kept.entry, kept.hash, child.foldOptions);
  const oracle = child.replay();
  applyLive(oracle, child.definition, entry, hash, child.foldOptions);
  const before = staged.snapshot();
  let changed: readonly import("../src/live-stage.ts").StageChange[] = [];
  const apply = () => applyLive(staged, child.definition, entry, hash, child.foldOptions);
  expect(staged.liveTransaction(apply, (rows) => { changed = rows; return false; })).toBe(false);
  expect(changed.map(row => row.collection)).toContain("accepted");
  expect(changed.map(row => row.collection)).toContain("fixedHashes");
  expect(staged.snapshot()).toBe(before);
  expect(staged.fixedHash(entry.seq)).toBeNull();
  expect(() => staged.liveTransaction(() => { apply(); throw new Error("after fold"); }, () => true)).toThrow("after fold");
  expect(staged.snapshot()).toBe(before);
  expect(staged.liveTransaction(apply, () => true)).toBe(true);
  expect(staged.all()).toEqual(oracle.all());
  expect(staged.fixedHash(entry.seq)).toBe(oracle.fixedHash(entry.seq));
});

test("a refused live fold does not publish a cross-item fixed-row rekey", async () => {
  const { fixedValueOf } = await import("../src/fixed-index.ts");
  const { canonicalize } = await import("@generalbusiness/dap-bytes");
  const child = confirmed(liveBase());
  const judged = child.judge(child.intent(keys.rita, "count", { on: 0, expected: { on: 1 }, fields: { next: 5 } }));
  if (judged.result !== "write") throw new Error("the fixture act must write");
  const entry = entryOf(child.state, judged.draft, clockOf(child.state, T0)), hash = entryHash(entry);
  const raw = { entry: { at: child.at, seq: entry.seq, hash } };
  const put = (state: typeof child.state) => {
    const value = fixedValueOf(raw, child.at, seq => state.fixedHash(seq));
    state.putFixed({ type: "other", slot: "proof", item: 999, state: "open", raw, key: value.key }, value.dependencies);
  };
  const staged = MemoryState.stagedLive();
  for (const kept of child.entries) applyEntry(staged, child.definition, kept.entry, kept.hash, child.foldOptions);
  put(staged);
  const oracle = child.replay(); put(oracle);
  applyLive(oracle, child.definition, entry, hash, child.foldOptions);
  const before = canonicalize(raw), after = canonicalize({ entry: entry.seq });
  const count = (key: string) => staged.fixedCount("other", "proof", key, ["open"], "normalized");
  const apply = () => applyLive(staged, child.definition, entry, hash, child.foldOptions);
  expect(count(before)).toBe(1);
  expect(staged.liveTransaction(apply, () => false)).toBe(false);
  expect([count(before), count(after), staged.fixedHash(entry.seq)]).toEqual([1, 0, null]);
  expect(staged.liveTransaction(apply, () => true)).toBe(true);
  expect([count(before), count(after)]).toEqual([0, oracle.fixedCount("other", "proof", after, ["open"], "normalized")]);
});

test("an admitted live reference keeps an unresolved future fixed dependency", () => {
  const declaration = liveForms.timed();
  declaration.items["lease"]!.refs["proof"] = { fixed: true, required: true, to: { type: "reference", fragment: 8 } };
  declaration.acts["lease"]!.fields = { proof: { type: "reference", fragment: 8, required: true } };
  declaration.acts["lease"]!.effects = [...declaration.acts["lease"]!.effects, { ref: { slot: "proof", from: { field: "proof" } } }];
  const child = confirmed(declaration);
  const future = { at: child.at, seq: child.head.seq + 2, hash: child.head.hash };
  const lease = child.judge(child.intent(keys.rita, "lease", { fields: { proof: { entry: future } } }));
  if (lease.result !== "write") throw new Error(`the reference was not admitted: ${JSON.stringify(lease)}`);
  const entry = entryOf(child.state, lease.draft, clockOf(child.state, T0));
  const state = MemoryState.stagedLive();
  for (const kept of child.entries) applyEntry(state, child.definition, kept.entry, kept.hash, child.foldOptions);
  expect(state.liveTransaction(() => applyLive(state, child.definition, entry, entryHash(entry), child.foldOptions), () => true)).toBe(true);
  expect(state.fixedAffected(future.seq, future.hash)).toEqual([expect.objectContaining({ type: "lease", slot: "proof", item: entry.seq })]);
});
