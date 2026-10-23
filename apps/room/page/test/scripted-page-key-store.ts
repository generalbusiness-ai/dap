/** UI-only key-custody stand-in. Signing is deliberately unavailable; real
 * nonextractability/migration is tested by browser-key-store.test.ts. */
import { keyIdOfSecret, unb64url } from "@generalbusiness/dap-bytes";
import type { KeyId } from "@generalbusiness/dap-contract";
import type { Signer } from "@generalbusiness/dap-client";
import type { pageKeyStore } from "../src/browser-key-store.ts";
const signer = (key: KeyId): Signer => ({ key, sign: async () => { throw new Error("UI stand-in cannot sign"); } });
export function scriptedPageKeys(): ReturnType<typeof pageKeyStore> {
  return {
    load: async key => signer(key),
    create: async () => { throw new Error("UI stand-in cannot create keys"); },
    migrate: async legacy => {
      if (!legacy.current()) throw new Error("Changed key context");
      const seed = unb64url(legacy.seed); if (!seed || seed.length !== 32) throw new Error("Invalid imported key");
      try { const key = keyIdOfSecret(seed); legacy.removeSecret(key); return signer(key); } finally { seed.fill(0); }
    },
    saveSettings: async (storage, name, value, current) => {
      if (!current()) throw new Error("Changed settings context");
      const bytes = JSON.stringify(value); storage.setItem(name, bytes);
      if (storage.getItem(name) !== bytes) throw new Error("Settings readback failed");
    },
  };
}
