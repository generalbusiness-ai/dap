/** Actual WebCrypto with in-memory record/commit/serialized-lock stand-ins.
 * CryptoKey references stay in this process: workerd cannot structured-clone
 * them. This does not prove browser key cloning, IndexedDB durability or
 * multi-process locking. */
import type { BrowserPrivateSlots } from "@generalbusiness/dap-client";
import { pageKeyStore } from "../src/browser-key-store.ts";
function copyRecord(value: unknown): unknown {
  if (value && typeof value === "object" && Object.hasOwn(value, "privateKey")) {
    const { privateKey, ...metadata } = value as Record<string, unknown>;
    if (!(privateKey instanceof CryptoKey)) throw new Error("Expected an in-memory CryptoKey");
    return { ...structuredClone(metadata), privateKey };
  }
  return structuredClone(value);
}
export function memoryPageKeys() {
  const rows = new Map<string, unknown>(); let tail: Promise<unknown> = Promise.resolve();
  const slots: BrowserPrivateSlots = {
    run: work => { const result = tail.then(work); tail = result.catch(() => {}); return result; },
    load: async name => copyRecord(rows.get(name) ?? null),
    save: async (name, value) => { rows.set(name, copyRecord(value)); },
    remove: async name => { rows.delete(name); },
  };
  return pageKeyStore(slots);
}
