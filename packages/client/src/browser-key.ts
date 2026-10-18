/** A signer over an existing browser-held key, including one restored from
 * IndexedDB. The application still owns scope, member and epoch validation. */
import type { KeyId } from "@generalbusiness/dap-contract";
import { b64url, isKeyId, verify } from "@generalbusiness/artroom-bytes";
import type { Signer } from "./intent.ts";

const unavailable = (): never => { throw new Error("A browser-held non-extractable Ed25519 signing key is required."); };
/** Use native accessors so an own property cannot disguise an extractable
 * key. The native getter also rejects plain objects that copy key metadata. */
function attribute(key: unknown, name: string): unknown {
  if (typeof CryptoKey === "undefined") return unavailable();
  const getter = Object.getOwnPropertyDescriptor(CryptoKey.prototype, name)?.get;
  if (!getter) return unavailable();
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
