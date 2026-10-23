/** Real WebCrypto; in-memory structured-clone/commit/lock stand-in, not IDB
 * durability or browser enrollment acceptance. All cases remain unrun here. */
import { expect, test } from "vitest";
import { b64url, keyIdOfSecret, verify } from "@generalbusiness/dap-bytes";
import type { BrowserPrivateSlots } from "@generalbusiness/dap-client";
import { legacySettingsKey, pageKeyStore } from "../src/browser-key-store.ts";

function fixture() {
  const seed = new Uint8Array(32).fill(7), encoded = b64url(seed), key = keyIdOfSecret(seed);
  const rows = new Map<string, unknown>();
  let tail: Promise<unknown> = Promise.resolve(), saved = false, fail = false, legacy: string | null = encoded;
  const slots: BrowserPrivateSlots = {
    run: work => { const result = tail.then(work); tail = result.catch(() => {}); return result; },
    load: async name => structuredClone(rows.get(name) ?? null),
    save: async (name, value) => { if (fail) throw new Error("transaction aborted"); rows.set(name, structuredClone(value)); saved = true; },
    remove: async name => { rows.delete(name); },
  };
  const adapter = () => ({ seed: encoded, current: () => legacy === encoded, removeSecret: (publicKey: string) => {
    if (!saved || legacy !== encoded || publicKey !== key) throw new Error("unsafe removal");
    legacy = null;
  } });
  return { key, rows, slots, adapter, store: pageKeyStore(slots), legacy: () => legacy,
    fail: (value: boolean) => { fail = value; }, replace: () => { legacy = "new selection"; } };
}

test("migration commits the same nonextractable identity before deleting its legacy seed and reloads it", async () => {
  const f = fixture(), signer = await f.store.migrate(f.adapter());
  expect(f.legacy()).toBeNull(); expect(signer.key).toBe(f.key);
  const bytes = new TextEncoder().encode("same enrolled identity");
  expect(verify(f.key, await signer.sign(bytes), bytes)).toBe(true);
  const row = [...f.rows.values()][0] as { privateKey: CryptoKey };
  await expect(crypto.subtle.exportKey("pkcs8", row.privateKey)).rejects.toThrow();
  const restored = await pageKeyStore(f.slots).load(f.key);
  expect(verify(f.key, await restored.sign(bytes), bytes)).toBe(true);
});

test("a new browser identity is durable before its signer is returned", async () => {
  const f = fixture(), signer = await f.store.create();
  expect(f.rows.size).toBe(1);
  expect((await f.store.load(signer.key)).key).toBe(signer.key);
  const failed = fixture(); failed.fail(true);
  await expect(failed.store.create()).rejects.toThrow("transaction aborted");
  expect(failed.rows.size).toBe(0);
});

test("an aborted commit retains the original seed and retry preserves identity", async () => {
  const f = fixture(); f.fail(true);
  await expect(f.store.migrate(f.adapter())).rejects.toThrow("transaction aborted");
  expect(f.legacy()).not.toBeNull(); expect(f.rows.size).toBe(0);
  f.fail(false); expect((await f.store.migrate(f.adapter())).key).toBe(f.key);
});

test("settings migration removes only the selected secret after commit and preserves public settings", async () => {
  const f = fixture(), values = new Map([["settings", JSON.stringify({ secret: f.adapter().seed, place: { directory: "same room" } })], ["unrelated", "untouched"]]);
  const storage = { getItem: (name: string) => values.get(name) ?? null, setItem: (name: string, value: string) => { values.set(name, value); } };
  await f.store.migrate(legacySettingsKey(storage, "settings"));
  expect(JSON.parse(values.get("settings")!)).toEqual({ place: { directory: "same room" }, publicKey: f.key });
  expect(values.get("unrelated")).toBe("untouched");
});

test("a crash after durable commit retries the stored key without replacing it", async () => {
  const f = fixture(), original = f.adapter();
  await expect(f.store.migrate({ ...original, removeSecret: () => { throw new Error("interrupted cleanup"); } })).rejects.toThrow("interrupted cleanup");
  expect(f.rows.size).toBe(1); expect(f.legacy()).not.toBeNull();
  expect((await f.store.migrate(f.adapter())).key).toBe(f.key); expect(f.rows.size).toBe(1);
});

test("corrupt durable readback cannot delete the recoverable legacy secret", async () => {
  const f = fixture(), save = f.slots.save;
  f.slots.save = async (name, value) => {
    await save(name, value);
    f.rows.set(name, { v: 1, publicKey: f.key, privateKey: { type: "private", extractable: false } });
  };
  await expect(f.store.migrate(f.adapter())).rejects.toThrow();
  expect(f.legacy()).toBe(f.adapter().seed);
});

test("two tab attempts cannot remove a newer selection or create competing identities", async () => {
  const f = fixture();
  const results = await Promise.allSettled([f.store.migrate(f.adapter()), f.store.migrate(f.adapter())]);
  expect(results.map(result => result.status)).toEqual(["fulfilled", "rejected"]);
  expect(f.rows.size).toBe(1);
  const other = fixture(), load = other.slots.load;
  other.slots.load = async name => { const value = await load(name); other.replace(); return value; };
  await expect(other.store.migrate(other.adapter())).rejects.toThrow();
  expect(other.legacy()).toBe("new selection");
});
