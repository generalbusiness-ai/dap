/** Scripted custody answers and replica entries witness the ordered pure status rules. No transport runs here. */
import { expect, test } from "vitest";
import type { Head } from "@generalbusiness/dap-contract";
import { intentDigest } from "@generalbusiness/dap-bytes";
import { Custody, Lost, identityId, memoryStore } from "../src/custody.ts";
import { requestStatus } from "../src/request-status.ts";
import { T0, build, identity, notAfter, refused, signer } from "./support/custody.ts";
import type { SignedEntry } from "../src/replica.ts";
import type { Judged } from "../src/replica-judged.ts";

// Invariant: an entry wins over custody and the clock; answers wait for their heads; only this attempt's refusal returns a request.
test("the seven rules select one status from the replica, current attempt, prediction and clock", async () => {
  const custody = new Custody(memoryStore(), () => new Date(T0).toISOString());
  const sent = await custody.send(identity("rules"), `sha256:${"c".repeat(64)}`, build("rules"), async () => refused, { notAfter });
  const record = sent.record, meaning = record.meaning;
  const at = (seq: number): Head => ({ seq, hash: `sha256:${"b".repeat(64)}` });
  const entry: SignedEntry = { actor: signer.key, key: "rules", fact: { at: record.identity.target as SignedEntry["fact"]["at"], ...at(2) },
    intent: intentDigest(record.envelope.signed.intent), meaning, opened: 2 };
  let prediction: Judged = { is: "write", effects: [] };
  const input = { entry: null as SignedEntry | null, record, outcomes: record.outcomes, presentMeaning: meaning, head: at(1), now: T0, predict: () => prediction };
  expect(requestStatus(input)).toEqual({ status: "pending" });
  input.head = at(2);
  expect(requestStatus(input)).toMatchObject({ status: "refused", why: { by: "scope", reason: "guard-failed" } });
  // A previous copy with a lost reply remains in flight, even though this copy was refused.
  record.outcomes.unshift({ at: record.created, lost: true, attempt: 1, signing: 0 });
  expect(requestStatus(input)).toMatchObject({ status: "withdrawn" });
  prediction = { is: "refused-here", reason: "guard-failed", class: "head" };
  expect(requestStatus(input)).toMatchObject({ status: "refused" });
  input.entry = entry;
  expect(requestStatus(input)).toEqual({ status: "recorded" });
  input.presentMeaning = `sha256:${"d".repeat(64)}`;
  expect(requestStatus(input)).toEqual({ status: "other-recorded" });
  input.entry = null;
  record.phase = "accepted";
  expect(requestStatus(input)).toEqual({ status: "pending" });
  record.phase = "mismatch";
  expect(requestStatus(input)).toEqual({ status: "pending" });
  record.phase = "unknown";
  record.attempt++;
  expect(requestStatus(input)).toEqual({ status: "pending" });
  input.now = Date.parse(record.signings[0]!.notAfter) + 60_000;
  expect(requestStatus(input)).toEqual({ status: "refused", why: { by: "client", reason: "unsent" } });
});

// Invariant: a lost or unavailable reply is not a refusal and cannot end a live attempt.
test("lost and unavailable copies remain pending while the latest signing lives", async () => {
  for (const reply of ["lost", "unavailable"] as const) {
    const custody = new Custody(memoryStore(), () => new Date(T0).toISOString());
    const { record } = await custody.send(identity(reply), `sha256:${"c".repeat(64)}`, build(reply), async () => {
      if (reply === "lost") throw new Lost();
      return { answer: "unavailable", reason: "unavailable" };
    }, { notAfter });
    expect(requestStatus({ entry: null, record, outcomes: record.outcomes, presentMeaning: record.meaning, head: null, now: T0,
      predict: () => ({ is: "write", effects: [] }) })).toEqual({ status: "pending" });
  }
});

// Invariant: a segment cannot erase a live copy of an older signing from the status rule.
test("a live older signing's unanswered copy remains withdrawn after its outcome spills to the segment", async () => {
  const custody = new Custody(memoryStore(), () => new Date(T0).toISOString()), who = identity("segment");
  const meaning = `sha256:${"c".repeat(64)}` as const;
  await custody.send(who, meaning, build("segment", "first"), async () => { throw new Lost(); }, { notAfter });
  await custody.send(who, meaning, build("segment", "first"), async () => refused, { notAfter });
  const second = `sha256:${"d".repeat(64)}` as const;
  await custody.send(who, second, build("segment", "second"), async () => { throw new Lost(); }, { notAfter, resign: true });
  for (let i = 0; i < 65; i++) await custody.send(who, second, build("segment", "second"), async () => { throw new Lost(); }, { notAfter });
  const { record } = await custody.send(who, second, build("segment", "second"), async () => refused, { notAfter });
  expect(record.outcomes.some(outcome => outcome.signing === 0)).toBe(false);
  const outcomes = await custody.outcomes(identityId(who), record);
  const status = requestStatus({ entry: null, record, outcomes, presentMeaning: second,
    head: { seq: 2, hash: `sha256:${"b".repeat(64)}` }, now: T0,
    predict: index => index === 0 ? { is: "write", effects: [] } : { is: "refused-here", reason: "guard-failed", class: "head" } });
  expect(status).toMatchObject({ status: "withdrawn" });
});
