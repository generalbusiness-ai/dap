import { expect, test } from "vitest";
import { canonicalize, isFieldValue, utf8 } from "@generalbusiness/dap-bytes";
import { evidenceWireV17, readEvidenceWireV17 } from "../src/evidence-wire-v17.ts";

test("nullable semantic JSON has an explicit string wire without widening FieldValue", () => {
  const semantic = { v: 1, mark: null, pending: [null] }, text = evidenceWireV17(semantic, 128);
  expect(isFieldValue(semantic)).toBe(false);
  expect(isFieldValue(text)).toBe(true);
  expect(readEvidenceWireV17(text, 128)).toEqual({ ok: true, value: semantic });
  expect(readEvidenceWireV17(semantic, 128)).toEqual({ ok: false });
  expect(readEvidenceWireV17("null", 4)).toEqual({ ok: true, value: null });
  expect(readEvidenceWireV17(null, 4)).toEqual({ ok: false });
});

test("requires canonical text and bounds both characters and UTF-8 before parsing", () => {
  expect(readEvidenceWireV17('{"b":1,"a":2}', 128)).toEqual({ ok: false });
  expect(readEvidenceWireV17('{"a":1,"a":1}', 128)).toEqual({ ok: false });
  expect(readEvidenceWireV17(' {"a":1}', 128)).toEqual({ ok: false });
  const text = canonicalize({ label: "é" });
  expect(text.length).toBeLessThan(utf8(text).length);
  expect(readEvidenceWireV17(text, utf8(text).length - 1)).toEqual({ ok: false });
  expect(readEvidenceWireV17(text, utf8(text).length)).toEqual({ ok: true, value: { label: "é" } });
  expect(() => evidenceWireV17({ label: "é" }, utf8(text).length - 1)).toThrow("text bound");
  const coercible = { toString: () => { throw Error("Do not coerce an opaque record"); } };
  expect(readEvidenceWireV17(coercible, 128)).toEqual({ ok: false });
});

test("outer canonical entry bytes include the quotes and escapes of the encoded value", () => {
  const semantic = { note: "\\\"\u0000", mark: null }, text = evidenceWireV17(semantic, 128);
  const direct = canonicalize({ value: semantic }), encoded = canonicalize({ value: text });
  expect(utf8(encoded).length).toBeGreaterThan(utf8(direct).length);
  expect(readEvidenceWireV17(text, utf8(text).length)).toEqual({ ok: true, value: semantic });
});
