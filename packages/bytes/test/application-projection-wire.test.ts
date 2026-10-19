import { expect, test } from "vitest";
import { APPLICATION_PROJECTION_WIRE_BOUNDS as B, type ApplicationProjectionQuery, type ApplicationProjectionRead } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, textDigest, utf8 } from "../src/index.ts";
import { directory } from "./fixtures.ts";
import { applicationProjectionQueryDigest, encodeApplicationProjectionQuery, readApplicationProjectionQuery, readApplicationProjectionReply } from "../src/application-projection-wire.ts";
const scope = { ...directory, kind: "lane" as const };
const query = (): ApplicationProjectionQuery => ({ v: 1, scope, directory, install: 2, projection: "room.alert", items: { alert: 7 } });
const reply = (): ApplicationProjectionRead => ({ ok: true, query: applicationProjectionQueryDigest(query())!, value: {
  v: 1, projection: textDigest("PUBLIC TEST declared projection"), scope, at: { seq: 12, hash: textDigest("PUBLIC TEST head") },
  sources: { alert: [{ id: 7, type: "alert", state: "open", revision: 3, fields: { text: "Shown text" } }] },
} });

// Invariant: the immutable canonical request binds its whole selection and
// scope incarnation; malformed, executable and oversized input never encodes.
test("bounded owned queries bind their exact selection and incarnation", () => {
  const input = query(), encoded = encodeApplicationProjectionQuery(input)!, owned = readApplicationProjectionQuery(encoded)!;
  expect(owned).toEqual(input); expect(Object.isFrozen(owned.items)).toBe(true);
  const identity = applicationProjectionQueryDigest(owned);
  expect(applicationProjectionQueryDigest({ ...input, install: 3 })).not.toBe(identity);
  expect(applicationProjectionQueryDigest({ ...input, items: { alert: 8 } })).not.toBe(identity);
  expect(applicationProjectionQueryDigest({ ...input, scope: { ...scope, inc: `in_${"b".repeat(25)}a` } })).not.toBe(identity);
  let calls = 0;
  const getter = Object.defineProperty(query(), "projection", { enumerable: true, get() { calls++; return "room.alert"; } });
  expect(encodeApplicationProjectionQuery(getter)).toBeNull(); expect(calls).toBe(0);
  for (const invalid of [{ ...input, extra: true }, { ...input, install: -0 }, { ...input, items: { alert: -1 } },
    { ...input, items: Object.fromEntries(Array.from({ length: B.sources + 1 }, (_, i) => [`a${i}`, i])) }]) {
    expect(encodeApplicationProjectionQuery(invalid)).toBeNull();
  }
  expect(readApplicationProjectionQuery(encoded + "=")).toBeNull();
  expect(readApplicationProjectionQuery(b64url(utf8(" " + canonicalize(input))))).toBeNull();
  expect(readApplicationProjectionQuery("x".repeat(B.encodedChars + 1))).toBeNull();
});

// Invariant: a reply of another request, incarnation or shape is never the
// displayed projection, even if it is otherwise a canonical JSON object.
test("canonical replies require the exact request binding and native row identity", () => {
  const value = reply(), raw = utf8(canonicalize(value));
  expect(readApplicationProjectionReply(raw, query())).toEqual(value);
  expect(readApplicationProjectionReply(raw, { ...query(), items: { alert: 8 } })).toBeNull();
  expect(readApplicationProjectionReply(utf8(canonicalize({ ...value, query: textDigest("other query") })), query())).toBeNull();
  if (!value.ok) return;
  expect(readApplicationProjectionReply(utf8(canonicalize({ ...value, value: { ...value.value, scope: { ...scope, kind: "task" } } })), query())).toBeNull();
  const row = value.value.sources["alert"]![0]!;
  expect(readApplicationProjectionReply(utf8(canonicalize({ ...value, value: { ...value.value, sources: { alert: [{ ...row, revision: "3" }] } } })))).toBeNull();
  expect(readApplicationProjectionReply(utf8(canonicalize({ ok: false, reason: "forbidden" })), query())).toEqual({ ok: false, reason: "forbidden" });
  expect(readApplicationProjectionReply(utf8(canonicalize({ ok: false, reason: "unknown" })))).toBeNull();
  expect(readApplicationProjectionReply(new Uint8Array(B.resultBytes + 1))).toBeNull();
});
