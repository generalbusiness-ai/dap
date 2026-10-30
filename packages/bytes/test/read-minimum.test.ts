import { expect, test, vi } from "vitest";
import type { ReadMinimum, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url } from "../src/encode.ts";
import { canonicalize, utf8 } from "../src/canonical.ts";
import * as canonical from "../src/canonical.ts";
import { isBehindRead, isFactRef, isHead, isRead } from "../src/records.ts";
import { READ_MINIMUM_WIRE_BOUNDS as B, encodeReadMinimumParameter, isReadMinimum, readMinimum, readMinimumParameter } from "../src/read-minimum.ts";

const at: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };
const hash = `sha256:${"a".repeat(64)}` as const;
const head = { seq: 7, hash };
const encoded = (value: unknown) => b64url(utf8(canonicalize(value)));

test("minimum reads own an exact incarnation-qualified sequence or full head without widening Head or FactRef", () => {
  for (const input of [{ at, head: 0 }, { at, head: Number.MAX_SAFE_INTEGER }, { at, head }]) {
    const parameter = encodeReadMinimumParameter(input)!;
    expect(readMinimumParameter(parameter)).toEqual(input);
    expect(isReadMinimum(input)).toBe(true);
    expect(parameter).toBe(encoded(input));
    expect(Object.isFrozen(readMinimumParameter(parameter))).toBe(true);
  }
  const input = { at: { ...at }, head: { ...head } }, owned = readMinimum(input)!;
  input.head.seq = 99; input.at.kind = "task";
  expect(owned).toEqual({ at, head });
  expect(Object.isFrozen(owned.at)).toBe(true); expect(Object.isFrozen(owned.head)).toBe(true);
  expect(isHead({ ...head, at })).toBe(false);
  expect(isFactRef({ at, ...head, atLeast: head })).toBe(false);
  expect(encodeReadMinimumParameter({ at: { ...at, inc: `in_${"b".repeat(26)}` }, head })).not.toBe(encodeReadMinimumParameter({ at, head }));
});

test("minimum shape and byte admission reject malformed, executable and noncanonical input before using a position", () => {
  const input = { at, head };
  for (const invalid of [0, head, { at, ...head }, { ...input, extra: true }, { head },
    { at: { ...at, extra: true }, head }, { at, head: { ...head, extra: true } },
    { at, head: -0 }, { at, head: -1 }, { at, head: 1.5 }, { at, head: Number.MAX_SAFE_INTEGER + 1 },
    { at, head: { seq: -0, hash } }, { at, head: { seq: 1, hash: "not a digest" } },
    { at: { ...at, inc: "another-incarnation" }, head }, { at: { ...at, kind: "unknown" }, head },
  ]) {
    expect(readMinimum(invalid)).toBeNull();
    expect(encodeReadMinimumParameter(invalid as ReadMinimum)).toBeNull();
  }
  let calls = 0;
  const getter = Object.defineProperty({ ...input }, "head", { enumerable: true, get() { calls++; return head; } });
  expect(readMinimum(getter)).toBeNull(); expect(calls).toBe(0);
  const parameter = encodeReadMinimumParameter(input)!;
  for (const invalid of [parameter + "=", encoded({ ...input, extra: true }), b64url(utf8(" " + canonicalize(input))),
    b64url(utf8(canonicalize(input).replace('"head":', '"head":0,"head":'))), "", "!", b64url(new Uint8Array([255])),
  ]) expect(readMinimumParameter(invalid)).toBeNull();
  const parse = vi.spyOn(canonical, "parseStrictBytes");
  try {
    expect(readMinimumParameter("x".repeat(B.encodedChars + 1))).toBeNull();
    expect(readMinimumParameter(b64url(new Uint8Array(B.bytes + 1)))).toBeNull();
    expect(parse).not.toHaveBeenCalled();
    // An admitted whole 512-byte payload still needs canonical JSON and the closed record shape.
    expect(readMinimumParameter(b64url(utf8(" ".repeat(B.bytes))))).toBeNull();
    expect(parse).toHaveBeenCalledTimes(1);
  } finally { parse.mockRestore(); }
});

test("behind requires the actual current fact and ordinary failures cannot carry it", () => {
  const current = { at, ...head }, behind = { ok: false, reason: "behind", current };
  const read = isRead((value): value is string => typeof value === "string");
  expect(isBehindRead(behind)).toBe(true); expect(read(behind)).toBe(true);
  for (const invalid of [
    { ok: false, reason: "behind" }, { ok: false, reason: "behind", current: head },
    { ...behind, detail: at }, { ...behind, current: { ...current, extra: true } },
    { ok: false, reason: "unavailable", current }, { ok: false, reason: "wrong-incarnation", current },
  ]) expect(read(invalid)).toBe(false);
  expect(read({ ok: false, reason: "unavailable" })).toBe(true);
  expect(read({ ok: true, at: head, complete: true, value: "unchanged" })).toBe(true);
});
