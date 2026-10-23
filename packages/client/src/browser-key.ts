/** A signer over an existing browser-held key, including one restored from
 * IndexedDB. The application still owns scope, member and epoch validation. */
import type { KeyId } from "@generalbusiness/dap-contract";
import { b64url, isKeyId, keyIdOf, verify } from "@generalbusiness/dap-bytes";
import type { Signer } from "./intent.ts";

const unavailable = (): never => { throw new Error("A browser-held non-extractable Ed25519 signing key is required."); };
// Some runtimes expose mutable own metadata rather than native getters.
// Only keys made by this module's exact generateKey call have a trusted
// fallback. Restored or supplied keys still require native accessors.
const generatedPrivateKeys = new WeakSet<object>();
/** Opaque native key objects are structured-cloneable by the platform. The
 * client needs no DOM/Workers type library and exports no private bytes. */
export interface BrowserDeviceKey { readonly publicKey: KeyId; readonly pair: { readonly publicKey: unknown; readonly privateKey: unknown } }
/** Generate a device key locally. Storage, admission and identity binding
 * belong to the caller; this operation performs no network or enrollment. */
export async function generateBrowserDeviceKey(): Promise<BrowserDeviceKey> {
  const subtle = crypto.subtle as {
    generateKey(algorithm: { name: string }, extractable: boolean, usages: readonly string[]): Promise<{ publicKey: unknown; privateKey: unknown }>;
    exportKey(format: "raw", key: unknown): Promise<ArrayBuffer>;
  };
  const pair = await subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
  if (typeof pair.privateKey !== "object" || pair.privateKey === null) return unavailable();
  generatedPrivateKeys.add(pair.privateKey);
  const publicKey = keyIdOf(new Uint8Array(await subtle.exportKey("raw", pair.publicKey)));
  storedWebCryptoSigner(publicKey, pair.privateKey);
  return { publicKey, pair };
}
/** Use native accessors so an own property cannot disguise an extractable
 * key. The native getter also rejects plain objects that copy key metadata. */
function attribute(key: unknown, name: string): unknown {
  if (typeof CryptoKey === "undefined") return unavailable();
  const getter = Object.getOwnPropertyDescriptor(CryptoKey.prototype, name)?.get;
  if (!getter) {
    if (typeof key !== "object" || key === null || !generatedPrivateKeys.has(key)) return unavailable();
    switch (name) {
      case "type": return "private";
      case "extractable": return false;
      case "algorithm": return { name: "Ed25519" };
      case "usages": return ["sign"];
      default: return unavailable();
    }
  }
  try { return getter.call(key); } catch { return unavailable(); }
}

/** No key import, export, storage, grant or network access. Each signature
 * is checked against the named public key before it can leave this signer. */
export function storedWebCryptoSigner(publicKey: KeyId, privateKey: unknown): Signer {
  if (!isKeyId(publicKey) || attribute(privateKey, "type") !== "private" || attribute(privateKey, "extractable") !== false) return unavailable();
  const algorithm = attribute(privateKey, "algorithm") as { name?: unknown } | null;
  const usages = attribute(privateKey, "usages");
  if (algorithm?.name !== "Ed25519" || !Array.isArray(usages) || usages.length !== 1 || usages[0] !== "sign") return unavailable();
  const subtle = crypto.subtle as { sign(algorithm: { name: string }, key: unknown, bytes: Uint8Array): Promise<ArrayBuffer> };
  return { key: publicKey, sign: async bytes => {
    const owned = Uint8Array.from(bytes);
    const signature = b64url(new Uint8Array(await subtle.sign({ name: "Ed25519" }, privateKey, owned)));
    if (!verify(publicKey, signature, owned)) throw new Error("The stored key does not match its public binding.");
    return signature;
  } };
}
