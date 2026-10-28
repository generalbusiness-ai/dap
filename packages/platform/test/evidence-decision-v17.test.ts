import { expect, test } from "vitest";
import type { Entry, FactRef, Intent, Sealed } from "@generalbusiness/dap-contract";
import { entryHash, signIntent } from "@generalbusiness/dap-bytes";
import { d, grantOf, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { readEvidenceDecisionV17 } from "../src/evidence-decision-v17.ts";

// SCRIPTED lane entries and grants, with real intent signatures and entry
// hashes. These controls prove the pure decision reader; they do not prove
// Native admission, membership authority, or execution of a checker job.
const job: FactRef = { at: otherLane, seq: 10, hash: d("a") };
const admission: FactRef = { at: { ...otherLane, kind: "destination" }, seq: 12, hash: d("b") };
const expected = { job, admission, bindingDigest: d("c"), tree: "a".repeat(40), configuration: d("d") };
const seal = (entry: Entry): Sealed => ({ entry, hash: entryHash(entry) });
function decision(kind: "passed" | "failed" | "error" = "passed", work = false): Entry {
  const error = kind === "error";
  const intent: Intent = { v: 1, to: otherLane, actor: keys.una.key, kind: error ? "check-error" : "check", on: null,
    expected: { job: 10 }, fields: { job: 10, jobFact: job, tree: expected.tree, configuration: expected.configuration, bindingDigest: expected.bindingDigest,
      ...(error ? { reason: "tool unavailable" } : { outcome: kind }) }, idempotencyKey: "scripted-result", notAfter: t(60) };
  return { v: 1, at: otherLane, seq: 20, prev: d("e"), time: t(10), clamped: false, epoch: 0,
    input: { type: "act", signed: signIntent(intent, keys.una.secret), authority: [grantOf(keys.una, otherLane, ["change.check"])], presented: {} },
    uses: [], prepared: [], effects: [
      { effect: "open", item: 20, type: "result", state: "recorded" },
      { effect: "party", item: 20, slot: "checker", member: keys.una.member },
      { effect: "ref", item: 20, slot: "job", to: 10 },
      { effect: "value", item: 20, slot: "outcome", value: kind },
      { effect: "value", item: 20, slot: "tree", value: expected.tree },
      { effect: "value", item: 20, slot: "bindingDigest", value: expected.bindingDigest },
      { effect: "ref", item: 10, slot: "decidedBy", to: 20 },
      { effect: "state", item: 10, state: error ? "errored" : kind },
      ...(error ? [{ effect: "value" as const, item: 20, slot: "reason", value: "tool unavailable" }] : []),
    ], sends: [{ n: 0, to: admission.at, message: { class: "request", type: "tell", body: { message: work ? "work-checked" : "checked",
      fields: { admission, job, result: { self: true }, bindingDigest: expected.bindingDigest } } } }] };
}
const changedIntent = (entry: Entry, change: (intent: Intent) => Intent): Entry => {
  if (entry.input.type !== "act") throw Error("The scripted result is an act");
  return { ...entry, input: { ...entry.input, signed: signIntent(change(entry.input.signed.intent), keys.una.secret) } };
};

test("reads the actual deciding pass, failure and checker error without relabeling its cause", () => {
  for (const outcome of ["passed", "failed", "error"] as const) for (const work of [false, true]) {
    const actual = seal(decision(outcome, work));
    expect(readEvidenceDecisionV17(actual, expected)).toEqual({ result: { at: otherLane, seq: 20, hash: actual.hash },
      key: keys.una.key, outcome, reason: outcome === "error" ? "tool unavailable" : null });
  }
});

test("later history-only answers and duplicate or mismatching deciding rows cannot replace the first decision", () => {
  const entry = decision();
  for (const effects of [
    entry.effects.filter(effect => !(effect.effect === "state" && effect.item === 10)),
    entry.effects.filter(effect => !(effect.effect === "ref" && effect.slot === "decidedBy")),
    [...entry.effects, { effect: "state" as const, item: 10, state: "passed" }],
    entry.effects.map(effect => effect.effect === "ref" && effect.slot === "decidedBy" ? { ...effect, to: 19 } : effect),
    entry.effects.map(effect => effect.effect === "state" && effect.item === 10 ? { ...effect, state: "failed" } : effect),
  ]) expect(readEvidenceDecisionV17(seal({ ...entry, effects }), expected)).toBeNull();
});

test("signature, sealed bytes and every frozen result field must identify the admitted job", () => {
  const entry = decision(), actual = seal(entry);
  expect(readEvidenceDecisionV17({ ...actual, hash: d("f") }, expected)).toBeNull();
  if (entry.input.type !== "act") throw Error("The scripted result is an act");
  const badSignature = { ...entry, input: { ...entry.input, signed: { ...entry.input.signed, intent: { ...entry.input.signed.intent, actor: keys.vic.key } } } };
  expect(readEvidenceDecisionV17(seal(badSignature), expected)).toBeNull();
  for (const changed of [
    { ...expected, job: { ...job, hash: d("f") } }, { ...expected, configuration: d("f") },
    { ...expected, bindingDigest: d("f") }, { ...expected, tree: "b".repeat(40) },
  ]) expect(readEvidenceDecisionV17(actual, changed)).toBeNull();
  for (const change of [
    (intent: Intent) => ({ ...intent, on: 10 }),
    (intent: Intent) => ({ ...intent, kind: "unrelated" }),
    (intent: Intent) => ({ ...intent, fields: { ...intent.fields, job: 11 } }),
  ]) expect(readEvidenceDecisionV17(seal(changedIntent(entry, change)), expected)).toBeNull();
});

test("the one actual checked send must bind admission, self result and digest; no send or duplicate is authority", () => {
  const entry = decision(), send = entry.sends[0]!;
  expect(readEvidenceDecisionV17(seal({ ...entry, sends: [] }), expected)).toBeNull();
  expect(readEvidenceDecisionV17(seal({ ...entry, sends: [send, { ...send, n: 1 }] }), expected)).toBeNull();
  expect(readEvidenceDecisionV17(seal({ ...entry, sends: [{ ...send, to: otherLane }] }), expected)).toBeNull();
  for (const change of [{ admission: { ...admission, hash: d("f") } }, { job: { ...job, seq: 11 } },
    { result: { self: false } }, { bindingDigest: d("f") }]) {
    const message = { class: "request" as const, type: "tell" as const, body: { message: "checked",
      fields: { admission, job, result: { self: true }, bindingDigest: expected.bindingDigest, ...change } } };
    expect(readEvidenceDecisionV17(seal({ ...entry, sends: [{ ...send, message }] }), expected)).toBeNull();
  }
});
