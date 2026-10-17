import { expect, test } from "vitest";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { digestBytes, utf8 } from "@generalbusiness/artroom-bytes";
import { AmountError, ByteUsage } from "../src/index.ts";

// Size/digest metadata at a pure boundary. These do not validate payloads,
// native entries, producer maxima or authority.
const a = digestBytes(utf8("opaque fixture a")), b = digestBytes(utf8("opaque fixture b"));

test("byte identity is domain plus digest across journal, retained and value sources; redacting one source preserves another copy", () => {
  const usage = new ByteUsage();
  usage.journal(0, a, 12);
  usage.retain({ kind: "entry", digest: a }, 12);
  usage.retain({ kind: "value", domain: DOMAINS.entry, digest: a }, 12);
  usage.retain({ kind: "text", digest: b }, 8);
  usage.retain({ kind: "text", digest: b }, 8);
  usage.retain({ kind: "value", domain: DOMAINS.text, digest: b }, 8);
  expect(usage.count()).toEqual({ complete: true, bytes: 20 });
  // Digests here are opaque keys: a different domain remains a different
  // accounting identity even if the supplied digest text happens to match.
  usage.retain({ kind: "value", domain: "other-fixture-domain", digest: b }, 8);
  expect(usage.count()).toEqual({ complete: true, bytes: 28 });
  usage.redact(b);
  expect(usage.count()).toEqual({ complete: true, bytes: 28 });
  usage.retain({ kind: "rule", digest: b }, 8);
  expect(usage.count()).toEqual({ complete: true, bytes: 36 });
});

test("a missing retained size is explicitly incomplete, is counted once, and ends at its redaction or a checked copy's known size", () => {
  const missing = new ByteUsage();
  missing.journal(0, a, 12);
  missing.retain({ kind: "text", digest: b }, null);
  missing.retain({ kind: "text", digest: b }, null);
  expect(missing.count()).toEqual({ complete: false, knownBytes: 12, missing: 1 });
  missing.redact(b);
  expect(missing.count()).toEqual({ complete: true, bytes: 12 });

  const copied = new ByteUsage();
  copied.retain({ kind: "text", digest: b }, null);
  copied.retain({ kind: "value", domain: DOMAINS.text, digest: b }, 8);
  expect(copied.count()).toEqual({ complete: true, bytes: 8 });
  copied.redact(b);
  expect(copied.count()).toEqual({ complete: true, bytes: 8 });
});

test("duplicate sizes remain exact near the safe-integer ceiling; inconsistent sizes and overflow leave the existing account unchanged", () => {
  const usage = new ByteUsage();
  usage.journal(0, a, Number.MAX_SAFE_INTEGER - 2);
  usage.retain({ kind: "rule", digest: b }, 2);
  usage.retain({ kind: "rule", digest: b }, 2);
  expect(usage.count()).toEqual({ complete: true, bytes: Number.MAX_SAFE_INTEGER });
  expect(() => usage.retain({ kind: "rule", digest: b }, 3)).toThrow(AmountError);
  expect(() => usage.retain({ kind: "text", digest: b }, 1)).toThrow(AmountError);
  expect(usage.count()).toEqual({ complete: true, bytes: Number.MAX_SAFE_INTEGER });
  expect(() => usage.journal(1, a, -0)).toThrow(AmountError);
});
