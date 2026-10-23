/** Shared origin-private key custody for the room page and future sign-in route.
 * No network, enrollment, room selection or recovery-file export happens here. */
import type { KeyId } from "@generalbusiness/dap-contract";
import { b64url, isKeyId, keyIdOfSecret, unb64url } from "@generalbusiness/dap-bytes";
import { browserPrivateSlots, generateBrowserDeviceKey, storedWebCryptoSigner, type BrowserPrivateSlots, type Signer } from "@generalbusiness/dap-client";

interface StoredKey { v: 1; publicKey: KeyId; privateKey: CryptoKey }
export interface KeySettingsStorage { getItem(name: string): string | null; setItem(name: string, value: string): void }
/** The adapter must compare the complete original localStorage value before
 * replacing it with public settings. It must not overwrite a newer selection. */
export interface LegacyKey {
  seed: string;
  current(): boolean;
  removeSecret(publicKey: KeyId): void;
}
/** Capture only a caller-selected settings slot. Preserve its public settings;
 * never search localStorage or rewrite another start/join operation implicitly. */
export function legacySettingsKey(storage: KeySettingsStorage, name: string): LegacyKey {
  const original = storage.getItem(name);
  if (original === null || original.length > 64 * 1024) throw unavailable();
  const value: unknown = JSON.parse(original);
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof (value as { secret?: unknown }).secret !== "string") throw unavailable();
  const { secret, ...publicSettings } = value as Record<string, unknown> & { secret: string };
  return {
    seed: secret,
    current: () => storage.getItem(name) === original,
    removeSecret: publicKey => {
      if (storage.getItem(name) !== original) throw unavailable();
      const replacement = JSON.stringify({ ...publicSettings, publicKey });
      storage.setItem(name, replacement);
      if (storage.getItem(name) !== replacement) throw unavailable();
    },
  };
}
const unavailable = () => new Error("The browser signing key is unavailable or changed. Inspect the current settings before continuing.");
const slot = (key: KeyId) => "ed25519:" + key;
async function checked(value: unknown, expected: KeyId): Promise<Signer> {
  if (!value || typeof value !== "object") throw unavailable();
  const row = value as StoredKey;
  if (Object.keys(row).length !== 3 || row.v !== 1 || row.publicKey !== expected) throw unavailable();
  const signer = storedWebCryptoSigner(expected, row.privateKey);
  // A corrupted public binding must fail before a legacy secret is removed.
  await signer.sign(crypto.getRandomValues(new Uint8Array(32)));
  return signer;
}
async function imported(seed: Uint8Array): Promise<StoredKey> {
  // Same RFC8410 seed import as Counter's browser device custody.
  const prefix = Uint8Array.of(0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20);
  const encoded = new Uint8Array(prefix.length + seed.length);
  try {
    const publicKey = keyIdOfSecret(seed);
    encoded.set(prefix); encoded.set(seed, prefix.length);
    const privateKey = await crypto.subtle.importKey("pkcs8", encoded, { name: "Ed25519" }, false, ["sign"]);
    return { v: 1, publicKey, privateKey };
  } finally { encoded.fill(0); seed.fill(0); }
}
export function pageKeyStore(slots: BrowserPrivateSlots = browserPrivateSlots({
  database: "artroom-page-private-1", store: "keys", lock: "artroom-page-key-custody-1",
})) {
  return {
    /** All page/settings writers use this same origin lock as migration. */
    saveSettings(storage: KeySettingsStorage, name: string, value: { publicKey: string }, current: () => boolean): Promise<void> {
      const before = storage.getItem(name), bytes = JSON.stringify(value);
      if (!isKeyId(value.publicKey) || Object.hasOwn(value, "secret") || bytes.length > 64 * 1024) return Promise.reject(unavailable());
      return slots.run(async () => {
        if (!current() || storage.getItem(name) !== before) throw unavailable();
        storage.setItem(name, bytes);
        if (storage.getItem(name) !== bytes) throw unavailable();
      });
    },
    /** Persist a fresh nonextractable key before its public identity can be
     * used in a new operation. Failure never hands out an uncommitted signer. */
    create(): Promise<Signer> {
      return slots.run(async () => {
        const generated = await generateBrowserDeviceKey();
        const row = { v: 1 as const, publicKey: generated.publicKey, privateKey: generated.pair.privateKey };
        if (await slots.load(slot(row.publicKey)) !== null) throw unavailable();
        await slots.save(slot(row.publicKey), row);
        return checked(await slots.load(slot(row.publicKey)), row.publicKey);
      });
    },
    load(publicKey: KeyId): Promise<Signer> {
      if (!isKeyId(publicKey)) return Promise.reject(unavailable());
      return slots.run(async () => checked(await slots.load(slot(publicKey)), publicKey));
    },
    /** Commit, read back and prove the same identity before removing legacy
     * custody. A crash after commit can safely retry using the existing row.
     * Web Locks serialize participating tabs. The adapter detects changes
     * observed before replacement; localStorage is not a cross-tab CAS. All
     * production writers of migrated records must share the custody lock. */
    migrate(legacy: LegacyKey): Promise<Signer> {
      return slots.run(async () => {
        if (!legacy.current()) throw unavailable();
        const seed = unb64url(legacy.seed);
        if (!seed || seed.length !== 32 || b64url(seed) !== legacy.seed) { seed?.fill(0); throw unavailable(); }
        const publicKey = keyIdOfSecret(seed);
        try {
          const held = await slots.load(slot(publicKey));
          if (held === null) {
            const row = await imported(seed);
            await checked(row, publicKey);
            if (!legacy.current()) throw unavailable();
            await slots.save(slot(publicKey), row);
          }
          const signer = await checked(await slots.load(slot(publicKey)), publicKey);
          if (!legacy.current()) throw unavailable();
          // Synchronous compare-and-replace; no await between fence and removal.
          legacy.removeSecret(publicKey);
          return signer;
        } finally { seed.fill(0); }
      });
    },
  };
}
