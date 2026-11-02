import { expect, test } from "vitest";
import { SCOPE_BOUNDS } from "@generalbusiness/dap-contract";
import { newIncarnation, scopeIdOf } from "@generalbusiness/dap-bytes";
import { ANSWERS } from "../src/answers.ts";

test("creation transport accepts each named capacity refusal and legacy refusal, but rejects arbitrary names and names on other reasons", () => {
  const full = { answer: "refused", reason: "scope-full" };
  expect(ANSWERS.create(full)).toBe(true);
  for (const name of SCOPE_BOUNDS) expect(ANSWERS.create({ ...full, name })).toBe(true);
  expect(ANSWERS.create({ ...full, name: "scopePrivateText" })).toBe(false);
  expect(ANSWERS.create({ ...full, reason: "guard-failed", name: "scopeItems" })).toBe(false);
  expect(ANSWERS.create({ ...full, name: "scopeItems", extra: true })).toBe(false);
});

test("deployment admission reasons are creation answers and never native act answers", () => {
  for (const reason of ["misconfigured", "host-unavailable"]) {
    const stopped = { answer: "unavailable", reason };
    expect(ANSWERS.create(stopped)).toBe(true);
    expect(ANSWERS.submit(stopped)).toBe(false);
    expect(ANSWERS.prepare(stopped)).toBe(false);
    expect(ANSWERS.create({ ...stopped, detail: "provider text" })).toBe(false);
  }
  expect(ANSWERS.create({ answer: "unavailable", reason: "host-unknown" })).toBe(false);
});


test("only the new register projects a claim state for the exact accepted original", () => {
  const hash = `sha256:${"a".repeat(64)}` as const;
  const at = { scope: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@26", creator: null, cause: hash, ordinal: 0 }), kind: "register", inc: newIncarnation(new Uint8Array(16)) };
  const fact = { at, seq: 1, hash };
  const base = { ok: true, at: { seq: 4, hash }, complete: true, value: { fact, definition: "platform:register@26", intent: hash, effects: [], sends: [], epoch: 0 } };
  const claim = { fact, state: "failed" };
  expect(ANSWERS.settle({ ...base, claim })).toBe(true);
  expect(ANSWERS.settle({ ...base, claim: { ...claim, fact: { ...fact, at: { ...at, inc: newIncarnation(new Uint8Array(16).fill(1)) } } } })).toBe(false);
  expect(ANSWERS.settle({ ...base, claim: { ...claim, items: [] } })).toBe(false);
  const historical = { ...base, value: { ...base.value, definition: "platform:register@18" } };
  expect(ANSWERS.settle(historical)).toBe(true);
  expect(ANSWERS.settle({ ...historical, claim })).toBe(false);
});
