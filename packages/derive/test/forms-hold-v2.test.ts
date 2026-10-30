import { expect, test } from "vitest";
import type { Entry, Evidence, FieldValue, OperationId } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import {
  HOLD, HOLD_V2, HOLD_VERSION, RETIRE_ACTION, capabilitiesOf, clockOf, gitRead,
  holdCapability, holdCapabilityV2, judgePreparation, operationId, settleOutcome,
  validateDefinition,
} from "../src/index.ts";
import { stagingData } from "./definition-corpus/staging-data.ts";
import { Scope, grantOf, keys, t, valid, type Context } from "./fixtures.ts";

const COMMIT = "a".repeat(40);
const options = { ...HOLD_VERSION, rootRetentionSeconds: 600 };

/** Scripted directory genesis, confirmation and membership grants; real lane
 * acts, capability judgments, ledger, sealed entries and memory fold. No host. */
class Workspace extends Scope {
  readonly owner: typeof HOLD;
  readonly code: ReturnType<typeof holdCapability>;
  readonly commitment = 2;
  readonly hold = 4;
  constructor(version: 1 | 2 = 2, customState = false) {
    const data = stagingData();
    data.capabilities = data.capabilities.map(c => c.name === "hold" ? { ...c, version } : c);
    // Hold state names belong to the definition, not to capability code.
    const declaration = customState ? JSON.parse(JSON.stringify(data).replaceAll('"held"', '"leased"')) : data;
    super(valid(validateDefinition(declaration, PROPOSED_BOUNDS)));
    this.owner = version === 1 ? HOLD : HOLD_V2;
    this.code = capabilitiesOf(version === 1 ? holdCapability(options) : holdCapabilityV2(options), gitRead());
    this.did(keys.rita, "offer", { expected: { intent: 1 }, fields: { intent: 0 } });
    this.did(keys.rita, "assign", { on: this.commitment, expected: { on: 1 }, fields: { performer: keys.una.member } });
    this.did(keys.una, "take-hold", { expected: { commitment: this.item(this.commitment).revision }, fields: { commitment: this.commitment } });
  }
  override context(over: Context = {}) { return super.context({ capabilities: this.code, ...over }); }
  fork() { return this.state.record(this.owner, "fork", [this.hold])!; }
  answer(operation: OperationId, result: "confirmed" | "refused" | "unknown", body: unknown = {}, attempt = 1, basis: Evidence["basis"] = result === "unknown" ? "none" : "own-answer") {
    return settleOutcome(this.state, this.definition, { type: "outcome", operation, attempt, result, evidence: { basis, body } }, { clock: clockOf(this.state, this.now), bounds: PROPOSED_BOUNDS, owners: this.code });
  }
  answered(operation: OperationId, result: "confirmed" | "refused" | "unknown", body: unknown = {}, attempt = 1): Entry {
    const judged = this.answer(operation, result, body, attempt);
    expect(judged.result).toBe("write");
    if (judged.result !== "write") throw new Error("the actual outcome did not write");
    return this.seal(judged.draft);
  }
  prepare(step: string, fields: Record<string, FieldValue>) {
    const signed = this.intent(keys.una, `${this.owner}:${step}`, { fields });
    const judged = judgePreparation(this.state, this.definition, { signed, capability: this.owner, step }, {
      clock: clockOf(this.state, this.now), bounds: PROPOSED_BOUNDS, steps: this.code, own: this.own,
      granted: () => ({ result: "granted", grant: grantOf(keys.una, this.at, [RETIRE_ACTION, "hold"]) }),
    });
    expect(judged.result).toBe("write");
    if (judged.result !== "write") throw new Error("the actual preparation did not write");
    return this.seal(judged.draft);
  }
  creation(): OperationId {
    const head = this.fork().values["operation"] as OperationId;
    this.answered(head, "confirmed", { commit: COMMIT });
    return this.fork().values["operation"] as OperationId;
  }
}

const opened = (entry: Entry) => entry.effects.filter(e => e.effect === "operation");
const records = (entry: Entry) => entry.effects.filter(e => e.effect === "record");

test("hold@1 keeps its original opening bytes and unavailable head/fork outcomes beside explicit hold@2", () => {
  const s = new Workspace(1);
  const operation = operationId(s.hold, 0);
  expect(s.fork()).toEqual({ capability: HOLD, kind: "fork", key: [s.hold], state: "creating", seq: s.hold,
    values: { seed: { commit: null, from: "destination-head", fact: null, under: s.commitment }, operation, id: null, name: null } });
  expect(s.code.rules(HOLD, "head")).toBeNull();
  expect(s.code.rules(HOLD, "fork")).toBeNull();
  expect(s.answer(operation, "confirmed", { commit: COMMIT })).toEqual({ result: "unavailable", reason: "unavailable" });
  expect(s.state.records(HOLD_V2, "fork")).toEqual([]);
  expect(holdCapabilityV2(options).rules(HOLD, "head")).toBeNull();
  expect(holdCapability(options).rules(HOLD_V2, "head")).toBeNull();
});

test("hold@2 fixes a confirmed head then selects the actual first eligible fork; late answers clean only their own known fork after selected retirement", () => {
  const s = new Workspace(2, true);
  expect(s.item(s.hold).state).toBe("leased");
  const creation = s.creation();
  expect(s.fork().values["seed"]).toEqual({ commit: COMMIT, from: "destination-head", fact: null, under: s.commitment });
  expect(opened(s.last)).toMatchObject([{ owner: HOLD_V2, kind: "fork", attempts: 3 }]);
  s.answered(creation, "unknown", {}, 1);
  expect(s.state.operation(creation)?.attempts.map(a => a.attempt)).toEqual([1, 2]);
  s.answered(creation, "unknown", {}, 2);
  expect(s.state.operation(creation)?.attempts.map(a => a.attempt)).toEqual([1, 2, 3]);
  s.answered(creation, "confirmed", { id: "selected-id", name: "selected-name" }, 3);
  expect(s.fork()).toMatchObject({ state: "selected", values: { id: "selected-id", name: "selected-name" } });
  expect(s.state.operation(creation)?.selected).toBe(3);

  // Revision 18 and section 5.1: an old unknown attempt's own answer does
  // not replace the selected fork. Its immutable outcome binds cleanup.
  const selected = s.fork();
  const late = s.answered(creation, "confirmed", { id: "late-id", name: "late-name" }, 2);
  expect(s.fork()).toEqual(selected);
  expect(records(late)).toEqual([]);
  expect(late.effects).toEqual([
    { effect: "attempt", operation: creation, attempt: 2, result: "confirmed", selected: false },
    { effect: "operation", k: 0, owner: HOLD_V2, kind: "deletion", attempts: 3 },
    { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null },
  ]);
  expect(late.input).toMatchObject({ type: "outcome", owner: HOLD_V2, kind: "fork", operation: creation, attempt: 2,
    evidence: { basis: "own-answer", body: { id: "late-id", name: "late-name" } } });
  s.answered(operationId(late.seq, 0), "confirmed");
  expect(s.fork()).toEqual(selected);

  s.now = t(601);
  expect(s.drain().map(j => j.result)).toEqual(["write"]);
  const retired = s.prepare("retire", { fork: s.hold });
  expect(s.fork().state).toBe("deleting");
  s.answered(operationId(retired.seq, 0), "confirmed");
  const final = s.fork();
  expect(final.state).toBe("deleted");
  const later = s.answered(creation, "confirmed", { id: "latest-id", name: "latest-name" }, 1);
  expect(s.fork()).toEqual(final);
  expect(records(later)).toEqual([]);
  expect(opened(later)).toMatchObject([{ owner: HOLD_V2, kind: "deletion", attempts: 3 }]);
  s.answered(operationId(later.seq, 0), "confirmed");
  expect(s.fork()).toEqual(final);
  expect(s.replay().all()).toEqual(s.state.all());
});

test("hold@2 distinguishes no head and a closed or changed holder without opening a new fork", () => {
  const absent = new Workspace();
  absent.answered(absent.fork().values["operation"] as OperationId, "confirmed", { commit: null });
  expect(absent.fork()).toMatchObject({ state: "failed", values: { reason: "no-head" } });
  expect(opened(absent.last)).toEqual([]);

  for (const close of ["end", "change-holder"] as const) {
    const s = new Workspace();
    const operation = s.fork().values["operation"] as OperationId;
    if (close === "end") { s.now = t(601); s.drain(); }
    else s.did(keys.vic, "renew", { on: s.hold, expected: { on: s.item(s.hold).revision } });
    s.answered(operation, "confirmed", { commit: COMMIT });
    expect(s.fork()).toMatchObject({ state: "failed", values: { reason: "hold-closed" } });
    expect(opened(s.last)).toEqual([]);
  }
  const s = new Workspace();
  const operation = s.creation();
  s.did(keys.vic, "renew", { on: s.hold, expected: { on: s.item(s.hold).revision } });
  s.answered(operation, "confirmed", { id: "unused-id", name: "unused-name" });
  expect(s.fork().state).toBe("creating");
  expect(s.state.operation(operation)?.selected).toBeNull();
  expect(opened(s.last)).toMatchObject([{ kind: "deletion" }]);
});

test("hold@2 never fails an unresolved creation and fails only after all bounded attempts are refused", () => {
  const refused = new Workspace();
  const creation = refused.creation();
  for (const attempt of [1, 2, 3]) refused.answered(creation, "refused", {}, attempt);
  expect(refused.fork().state).toBe("failed");
  expect(refused.state.operation(creation)?.attempts).toHaveLength(3);
  const unresolved = new Workspace();
  const pending = unresolved.creation();
  unresolved.answered(pending, "unknown", {}, 1);
  unresolved.answered(pending, "refused", {}, 2);
  unresolved.answered(pending, "refused", {}, 3);
  expect(unresolved.fork().state).toBe("creating");
  unresolved.answered(pending, "refused", {}, 1);
  expect(unresolved.fork().state).toBe("failed");
});

test("hold@2 rejects malformed or credential-bearing confirmed answers without a ledger entry", () => {
  const s = new Workspace();
  const head = s.fork().values["operation"] as OperationId;
  for (const body of [{ commit: "not-an-object" }, { commit: COMMIT, token: "not-evidence" }]) {
    expect(s.answer(head, "confirmed", body).result).toBe("refused");
  }
  expect(s.answer(head, "confirmed", { commit: COMMIT }, 1, "read").result).toBe("refused");
  const creation = s.creation();
  const before = s.head;
  for (const body of [{ id: "", name: "empty" }, { id: "x", name: "bad\nname" }, { id: "x", name: "x", token: "not-evidence" }]) {
    expect(s.answer(creation, "confirmed", body).result).toBe("refused");
  }
  expect(s.head).toEqual(before);
  expect(s.fork().state).toBe("creating");
});
