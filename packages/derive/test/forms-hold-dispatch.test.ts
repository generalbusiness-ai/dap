import { expect, test } from "vitest";
import type { Entry, Evidence, FieldValue, OperationId, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { entryHash, intentDigest } from "@generalbusiness/dap-bytes";
import {
  CAPABILITY_CODE, HOLD, HOLD_V2, HOLD_VERSION, RETIRE_ACTION, clockOf,
  holdCapability, holdCapabilityV2, holdEvidenceSnapshots, judgePreparation,
  operationId, outcomeSnapshotDependencies, ownerReservations, settleOutcome,
  snapshotRead, validateDefinition,
} from "../src/index.ts";
import type { Fetched, ValidDefinition } from "../src/index.ts";
import { stagingData } from "./definition-corpus/staging-data.ts";
import { C, Staging, clean, snapshots } from "./fixtures-hold.ts";
import { grantOf, keys, t, valid, type Actor, type Context } from "./fixtures.ts";

const COMMIT = C("a");
const definition = (version: 1 | 2, name?: string): ValidDefinition => {
  const data = stagingData();
  if (name !== undefined) data.name = name;
  data.capabilities = data.capabilities.map(c => c.name === "hold" ? { ...c, version } : c);
  return valid(validateDefinition(data, PROPOSED_BOUNDS));
};

/** The existing lane fixture scripts its directory genesis/confirmation and
 * membership grants. All acts, preparations, outcomes and folds use the real
 * shared registry. Provider answers below are explicit scripted metadata. */
class Dispatched extends Staging {
  constructor(version: 1 | 2, name?: string) { super(definition(version, name), true); }
  get owner(): "hold@1" | "hold@2" {
    return this.definition.declared.capabilities.find(c => c.name === "hold")?.version === 2 ? "hold@2" : "hold@1";
  }
  override context(over: Context = {}) { return super.context({ ...over, capabilities: CAPABILITY_CODE }); }
  override prepare(who: Actor, step: string, fields: Record<string, FieldValue>, over: { kind?: string; to?: ScopeRef } = {}): Entry | string {
    return this.asked(this.intent(who, over.kind ?? `${this.owner}:${step}`, { fields, ...(over.to ? { to: over.to } : {}) }), step);
  }
  override asked(signed: SignedIntent, step: string): Entry | string {
    const actions = [...Object.values(this.definition.declared.acts).map(a => a.grant), RETIRE_ACTION];
    const judged = judgePreparation(this.state, this.definition, { signed, capability: this.owner, step }, {
      clock: clockOf(this.state, this.now), bounds: PROPOSED_BOUNDS, steps: CAPABILITY_CODE, own: this.own,
      granted: ({ key }) => {
        const actor = Object.values(keys).find(who => who.key === key);
        return actor ? { result: "granted", grant: grantOf(actor, this.at, actions) } : { result: "refused" };
      },
    });
    if (judged.result !== "write") throw new Error(`preparation did not write: ${judged.result}`);
    return this.seal(judged.draft);
  }
  override outcome(operation: OperationId, result: "confirmed" | "refused" | "unknown", body: unknown = {}, basis: Evidence["basis"] = result === "unknown" ? "none" : "own-answer", attempt = 1): Entry {
    const judged = settleOutcome(this.state, this.definition, { type: "outcome", operation, attempt, result, evidence: { basis, body } }, {
      clock: clockOf(this.state, this.now), bounds: PROPOSED_BOUNDS, owners: CAPABILITY_CODE,
    });
    if (judged.result !== "write") throw new Error(`outcome did not write: ${judged.result}`);
    return this.seal(judged.draft);
  }
}

function accounting(s: Dispatched): void {
  const single = s.owner === HOLD ? holdCapability(HOLD_VERSION) : holdCapabilityV2(HOLD_VERSION);
  const other = s.owner === HOLD ? holdCapabilityV2(HOLD_VERSION) : holdCapability(HOLD_VERSION);
  const expected = single.reserves!(s.state, s.definition);
  expect(expected).toBeGreaterThan(0);
  expect(CAPABILITY_CODE.reserves!(s.state, s.definition)).toBe(expected);
  expect(other.reserves!(s.state, s.definition)).toBe(0);
  // This legacy workspace declares scalar pending entries, not a complete
  // opt-in Amount. Neither registry may invent zero bytes for that work.
  for (const code of [single, CAPABILITY_CODE]) {
    expect(() => ownerReservations(code, s.state, s.definition)).toThrow(`${s.owner} workspace record producer has no complete reservation Amount`);
  }
}

function checked(version: 1 | 2, tooLarge = false) {
  const s = new Dispatched(version);
  const other = s.owner === HOLD ? HOLD_V2 : HOLD;
  expect(s.state.records(other, "fork")).toEqual([]);
  expect(s.state.record(s.owner, "fork", [s.hold])?.state).toBe("creating");
  expect(s.state.operation(operationId(s.hold, 0))?.owner).toBe(s.owner);
  accounting(s);
  if (version === 2) {
    // The v2 path selects a real ledger result before servicing token mints.
    s.outcome(operationId(s.hold, 0), "confirmed", { commit: COMMIT });
    s.outcome(s.state.record(s.owner, "fork", [s.hold])!.values["operation"] as OperationId, "confirmed", { id: "dispatch-fork", name: "dispatch-fork" });
  }
  s.prepare(keys.una, "instance", { hold: s.hold, task: s.at, instance: "dispatch-instance" });
  const report = s.intent(keys.una, "report", { expected: { commitment: s.item(s.commitment).revision }, fields: { commitment: s.commitment, commit: COMMIT } });
  const stage = s.asked(report, "stage");
  if (typeof stage === "string") throw new Error("stage did not write");
  expect(stage.effects.filter(e => e.effect === "record").every(e => e.capability === s.owner)).toBe(true);
  accounting(s);
  const mints = s.state.records(s.owner, "token", { states: ["minting"] });
  expect(mints).toHaveLength(2);
  for (const [index, token] of mints.entries()) s.outcome(token.values["mint"] as OperationId, "confirmed", { token: `scripted-token-${index}`, ends: t(300) });
  const staged = s.outcome(operationId(stage.seq, 0), "confirmed", {}, "read");
  const openedCheck = staged.effects.find(e => e.effect === "operation" && e.kind === "check");
  if (!openedCheck || openedCheck.effect !== "operation") throw new Error("the stage outcome opened no check");
  const record = tooLarge ? null : clean(s.at, COMMIT, 1);
  const entry = s.outcome(operationId(staged.seq, openedCheck.k), "confirmed", { record });
  const fact = s.fact(entry.seq);
  const stored = s.state.record(s.owner, "check", [intentDigest(report.intent), 1]);
  expect(stored?.state).toBe(tooLarge ? "too-large" : "recorded");
  expect(s.state.records(other, "root")).toEqual([]);
  expect(s.state.records(other, "check")).toEqual([]);
  accounting(s);
  return { s, report, entry, fact, record };
}

test("the full registry dispatches each listed hold family through stage, mints, check and report with one reservation charge", () => {
  for (const version of [1, 2] as const) {
    const { s, report } = checked(version);
    expect(s.submit(report, { capabilities: CAPABILITY_CODE }).result).toBe("write");
    expect(s.state.record(s.owner, "pin", [s.at, intentDigest(report.intent)])?.state).toBe("held");
    expect(s.last.effects.filter(e => e.effect === "record").every(e => e.capability === s.owner)).toBe(true);
    accounting(s);
    expect(s.replay().all()).toEqual(s.state.all());
  }
});

test("the v2 foreign check path binds the exact full fact and confirmed source owner while retaining the original v1 branch and too-large answer", () => {
  const current = checked(2);
  const legacy = checked(1);
  const consumer = new Dispatched(2, "foreign-consumer");
  const oldConsumer = new Dispatched(1, "legacy-consumer");
  expect(consumer.at).not.toEqual(current.s.at);
  expect(oldConsumer.at).not.toEqual(legacy.s.at);
  // The map stands in only for authenticated source-fact admission. Its
  // valid entries below come from actual sealed judgments in these fixtures.
  const ask = (target: Dispatched, fetched: Fetched, pin = fetched.fact) => CAPABILITY_CODE.guard("git-read@1", "ancestry", {
    commit: COMMIT, row: "report", pin,
  }, target.given({ facts: new Map([[pin.hash, fetched]]) }));
  const actual = { fact: current.fact, entry: current.entry, under: current.s.under };
  const old = { fact: legacy.fact, entry: legacy.entry, under: legacy.s.under };
  expect(ask(consumer, actual)).toBe(true);
  expect(ask(oldConsumer, old)).toBe(true);
  expect(ask(consumer, old)).toBe("ancestry-stale");
  expect(ask(oldConsumer, actual)).toBe("ancestry-stale");
  expect(ask(consumer, actual, { ...actual.fact, at: consumer.at })).toBe("ancestry-stale");
  expect(ask(consumer, { ...actual, fact: { ...actual.fact, seq: actual.fact.seq + 1 } })).toBe("ancestry-stale");
  if (actual.entry.input.type !== "outcome") throw new Error("fixture check is not an outcome");
  // A self-consistent hash cannot turn another owner's input into a v2
  // check. This control scripts a forged source, not an authorized outcome.
  const forged: Entry = { ...actual.entry, input: { ...actual.entry.input, owner: HOLD } };
  expect(ask(consumer, { ...actual, entry: forged, fact: { ...actual.fact, hash: entryHash(forged) } })).toBe("ancestry-stale");
  const large = checked(2, true);
  expect(ask(consumer, { fact: large.fact, entry: large.entry, under: large.s.under })).toBe("ancestry-too-large");
});

test("v2 native snapshot selection requires the shared selector; retained snapshot bytes alone grant no native ancestry shortcut", () => {
  const { entry, fact, record } = checked(2);
  if (entry.input.type !== "outcome" || record === null) throw new Error("fixture check is missing");
  const origin = { at: fact, input: "outcome" as const };
  const rules = CAPABILITY_CODE.rules(HOLD_V2, "check")!;
  expect(rules.retains).toBe(holdEvidenceSnapshots);
  const plan = outcomeSnapshotDependencies(origin, entry.input, () => rules);
  expect(plan.record).toEqual(record);
  expect(plan.dependencies.length).toBeGreaterThan(0);
  expect(plan.dependencies.every(d => d.consumer === "outcome-snapshot" && d.key.kind === "snapshot" && d.key.digest === record.snapshot.digest)).toBe(true);
  const retained = snapshots.get(record.snapshot.digest)!;
  expect(snapshotRead(record.snapshot.digest, retained)).not.toBeNull();
  // A provider that selects the very same retained bytes through another
  // function still cannot claim the native selector's ancestry semantics.
  // This is selection only. Replay must independently rewalk Git ancestry.
  const lookalike = { ...rules, retains: () => [record.snapshot.digest] };
  const notNative = outcomeSnapshotDependencies(origin, entry.input, () => lookalike);
  expect(notNative.record).toBeNull();
  expect(notNative.dependencies.map(d => d.key)).toEqual([{ kind: "snapshot", digest: record.snapshot.digest }]);
  expect(outcomeSnapshotDependencies(origin, entry.input, () => null)).toMatchObject({ record: null, dependencies: [] });
});
