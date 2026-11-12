/** The counter boundary only. These tests do not prove signature admission,
 * a Worker route, native authority, or actual Durable Object eviction. */
import { expect, test } from "vitest";
import { keyIdOf } from "@generalbusiness/dap-bytes";
import { DEFAULT_SERVING_LIMITS, ServingLimits, servingLimitConfig } from "../src/serving-limits.ts";

const actor = (n: number) => { const bytes = new Uint8Array(32); new DataView(bytes.buffer).setUint32(0, n); return keyIdOf(bytes); };
const A = "192.0.2.1", B = "192.0.2.2";
const fixture = { creationKey: 2, creationAddress: 3, readKey: 2, readAddress: 3, windows: 8 };

test("serving windows count a verified key across addresses and an address across keys, independently for creation and reads", () => {
  const limits = new ServingLimits(fixture);
  expect([limits.account("creation", actor(1), A, 0), limits.account("creation", actor(1), B, 0),
    limits.account("creation", actor(1), null, 0)]).toEqual([true, true, false]);
  expect([limits.account("creation", actor(2), A, 0), limits.account("creation", actor(3), A, 0),
    limits.account("creation", actor(4), A, 0)]).toEqual([true, true, false]);
  // A new operation has its own windows; no target identity is an input.
  const reads = new ServingLimits(fixture);
  expect([reads.account("signed-read", actor(1), A, 0), reads.account("signed-read", actor(1), B, 0),
    reads.account("signed-read", actor(1), null, 0)]).toEqual([true, true, false]);
  expect([reads.account("signed-read", actor(2), A, 0), reads.account("signed-read", actor(3), A, 0),
    reads.account("signed-read", actor(4), A, 0)]).toEqual([true, true, false]);
});

test("one sender's 8191 fresh keys leave another creator and returning reader admitted; full tables use bounded overflow", () => {
  const limits = new ServingLimits(), start = 1_000_000;
  expect(limits.account("signed-read", actor(9000), B, start)).toBe(true);
  let admitted = 0;
  for (let n = 0; n < 8191; n++) if (limits.account("creation", actor(n), A, start)) admitted++;
  expect(admitted).toBe(30);
  expect(limits.counts().creation).toBe(31); // denied addresses allocate no fresh key
  expect(limits.account("creation", actor(9001), B, start + 1000)).toBe(true);
  expect(limits.account("signed-read", actor(9002), B, start + 1000)).toBe(true);
  // Trace 2: a sender cannot take the returning reader's expired read slots.
  expect(limits.account("creation", actor(9003), A, start + 90_000)).toBe(false);
  expect(limits.account("signed-read", actor(9000), B, start + 120_000)).toBe(true);

  const capped = new ServingLimits({ ...fixture, windows: 1 });
  expect(capped.account("creation", actor(1), null, 0)).toBe(true);
  expect(capped.account("creation", actor(2), null, 0)).toBe(true);
  expect(capped.account("creation", actor(3), null, 0)).toBe(true);
  expect(capped.account("creation", actor(4), null, 0)).toBe(false);
  expect(capped.account("signed-read", actor(4), null, 0)).toBe(true);
  expect(capped.account("creation", actor(1), null, 0)).toBe(true);
  expect(capped.counts()).toEqual({ creation: 2, reads: 1, found: 0, total: 3 });
  expect(capped.account("creation", actor(4), null, 3_600_000)).toBe(true);
  const twoPhase = new ServingLimits({ ...fixture, creationKey: 1, windows: 1 });
  expect(twoPhase.account("creation", actor(1), null, 0)).toBe(true);
  const reserved = twoPhase.creationAddress(B, 0);
  expect(reserved.admitted).toBe(true);
  expect(reserved.overflow).not.toBeNull();
  expect(twoPhase.account("creation", actor(2), null, 0, reserved.overflow)).toBe(true);
  expect(twoPhase.creationAddress("192.0.2.3", 0).admitted).toBe(false);
  // The old address charge cannot pay for a later hour's overflow window.
  expect(twoPhase.account("creation", actor(10), null, 3_600_000)).toBe(true);
  expect(twoPhase.account("creation", actor(11), null, 3_600_000, reserved.overflow)).toBe(true);
  expect(twoPhase.account("creation", actor(12), null, 3_600_000)).toBe(false);
  // A fixed-owner restart likewise creates a different counter instance.
  const restarted = new ServingLimits({ ...fixture, creationKey: 1, windows: 1 });
  expect(restarted.account("creation", actor(10), null, 0)).toBe(true);
  expect(restarted.account("creation", actor(11), null, 0, reserved.overflow)).toBe(true);
  expect(restarted.account("creation", actor(12), null, 0)).toBe(false);
});

test("operation expiry, canonical addresses, null address, backward clock and instance reset have explicit bounds", () => {
  const limits = new ServingLimits({ ...fixture, creationKey: 1, creationAddress: 1, readKey: 1, readAddress: 1 });
  expect(limits.account("signed-read", actor(1), "::ffff:192.0.2.1", 0)).toBe(true);
  expect(limits.account("signed-read", actor(2), A, 0)).toBe(false);
  expect(limits.account("signed-read", actor(3), "2001:db8:1:2::1", 0)).toBe(true);
  expect(limits.account("signed-read", actor(4), "2001:DB8:1:2::9", 0)).toBe(false);
  expect(limits.account("signed-read", actor(1), null, 59_999)).toBe(false);
  expect(limits.account("signed-read", actor(1), null, 60_000)).toBe(true);
  expect(limits.account("signed-read", actor(1), null, 0)).toBe(false);
  expect(limits.account("creation", actor(1), null, 60_000)).toBe(true);
  expect(limits.account("creation", actor(1), null, 120_000)).toBe(false);
  expect(new ServingLimits(fixture).account("creation", actor(1), null, 120_000)).toBe(true);
  expect(limits.account("creation", null, null, 120_000)).toBe(false);
});

test("address-only invalid-signature accounting has no claimed key input; counters reserve synchronously before any caller await", async () => {
  const limits = new ServingLimits({ ...fixture, creationAddress: 1 });
  expect(limits.account("creation", null, A, 0)).toBe(true);
  expect(limits.account("creation", null, A, 0)).toBe(false);
  expect(limits.account("creation", actor(1), null, 0)).toBe(true);
  expect(limits.counts().total).toBe(2);
  const concurrent = new ServingLimits({ ...fixture, readKey: 1 });
  const entered: number[] = [];
  const request = async (n: number) => {
    if (!concurrent.account("signed-read", actor(1), null, 0)) return false;
    entered.push(n); await Promise.resolve(); return true;
  };
  expect(await Promise.all([request(1), request(2)])).toEqual([true, false]);
  expect(entered).toEqual([1]);
});

test("deployment limits use exact defaults and reject invalid or unbounded overrides", () => {
  expect(servingLimitConfig({})).toEqual(DEFAULT_SERVING_LIMITS);
  expect(servingLimitConfig({ SERVING_READ_KEY_PER_MINUTE: "300" })).toEqual({ ...DEFAULT_SERVING_LIMITS, readKey: 300 });
  for (const value of ["", "0", "-1", "1.5", "01", " 10", "1000001", "Infinity"])
    expect(servingLimitConfig({ SERVING_CREATION_KEY_PER_HOUR: value })).toBeNull();
  expect(() => new ServingLimits({ ...fixture, windows: 8193 })).toThrow("Invalid serving limits");
});
