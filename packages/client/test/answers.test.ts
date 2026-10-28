import { expect, test } from "vitest";
import { SCOPE_BOUNDS } from "@generalbusiness/dap-contract";
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
