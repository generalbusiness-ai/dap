/** Actual key import/signing with localStorage/Web Locks stand-ins. No native
 * enrollment, browser IDB durability or deployed recovery is proved here. */
import { expect, test, vi } from "vitest";
import { b64url, canonicalize, keyIdOfSecret, newIncarnation, scopeIdOf, textDigest, verify } from "@generalbusiness/dap-bytes";
import { migrateAllClaimCustody } from "../src/claim.ts";
import { memoryPageKeys } from "./private-key-fixture.ts";

function fixture() {
  const origin = "https://recovery-migration.test", browserKey = keyIdOfSecret(new Uint8Array(32).fill(41)), seed = new Uint8Array(32).fill(42);
  const register = { kind: "register" as const, inc: newIncarnation(new Uint8Array(16).fill(1)), scope: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@8", creator: null, cause: textDigest("TEST recovery migration"), ordinal: 0 }) };
  const binding = canonicalize([origin, register, "platform:register@8", browserKey]);
  const record = canonicalize({ v: 1, binding, label: "Original", config: { v: 1, service: origin, key: "browser", register }, recovery: b64url(seed) });
  const operation = "40000000-0000-4000-8000-000000000001", name = "artroom-page-claim:" + binding;
  const values = new Map([[name, canonicalize({ v: 2, binding, active: operation, claims: { [operation]: record }, originalLegacy: record })]]);
  const storage = { get length() { return values.size; }, key: (n: number) => [...values.keys()][n] ?? null, getItem: (name: string) => values.get(name) ?? null, setItem: (name: string, value: string) => { values.set(name, value); } };
  return { origin, seed, operation, name, values, storage };
}
test("every retained recovery copy imports the enrolled identity before its legacy seed is removed", async () => {
  const f = fixture(), keys = memoryPageKeys();
  vi.stubGlobal("navigator", { locks: { request: async <T>(_name: string, work: () => Promise<T>) => work() } });
  try {
    await migrateAllClaimCustody(f.origin, f.storage, keys);
    const journal = JSON.parse(f.values.get(f.name)!);
    const rows = [JSON.parse(journal.claims[f.operation]), JSON.parse(journal.originalLegacy)];
    for (const row of rows) { expect(row.recovery).toBeUndefined(); expect(row.recoveryKey).toBe(keyIdOfSecret(f.seed)); }
    expect(journal.active).toBe(f.operation); expect(Object.keys(journal.claims)).toEqual([f.operation]);
    const signer = await keys.load(rows[0].recoveryKey), bytes = new Uint8Array([1, 2]);
    expect(verify(keyIdOfSecret(f.seed), await signer.sign(bytes), bytes)).toBe(true);
    const before = f.values.get(f.name);
    await migrateAllClaimCustody(f.origin, f.storage, keys);
    expect(f.values.get(f.name)).toBe(before);
  } finally { vi.unstubAllGlobals(); }
});
test("failed private persistence leaves all original recovery records intact", async () => {
  const f = fixture(), keys = memoryPageKeys(), before = f.values.get(f.name);
  keys.migrate = async () => { throw new Error("TEST private transaction abort"); };
  vi.stubGlobal("navigator", { locks: { request: async <T>(_name: string, work: () => Promise<T>) => work() } });
  try {
    await expect(migrateAllClaimCustody(f.origin, f.storage, keys)).rejects.toThrow("transaction abort");
    expect(f.values.get(f.name)).toBe(before);
  } finally { vi.unstubAllGlobals(); }
});

test("claim migration enumerates only the initially validated storage length", async () => {
  let lengthReads = 0, enumerated = 0;
  const storage = {
    get length() { return ++lengthReads === 1 ? 1 : 10_000; },
    key: (n: number) => { enumerated++; if (n !== 0) throw new Error("enumeration escaped its captured bound"); return "unrelated"; },
    getItem: () => null,
    setItem: () => { throw new Error("no claim record should be written"); },
  };
  vi.stubGlobal("navigator", { locks: { request: async <T>(_name: string, work: () => Promise<T>) => work() } });
  try {
    await migrateAllClaimCustody("https://recovery-migration.test", storage, memoryPageKeys());
    expect([lengthReads, enumerated]).toEqual([1, 1]);
  } finally { vi.unstubAllGlobals(); }
});
