/** Signing-capability seam. Filesystem stores keep their original seed path;
 * browser stores never need to disclose private key material. */
import { secretSigner, type Signer } from "@generalbusiness/dap-client";
import type { Store } from "./store.ts";

export async function storedSigner(store: Store, name: string): Promise<Signer | null> {
  if (store.signer) return store.signer(name);
  const secret = await store.secret(name);
  return secret === null ? null : secretSigner(secret.slice());
}
export async function newStoredSigner(store: Store, name: string): Promise<Signer> {
  const held = await storedSigner(store, name);
  if (held) return held;
  if (store.signer) {
    if (!store.newSigner) throw new Error(`The signing key ${name} is missing; this store cannot create it.`);
    return store.newSigner(name);
  }
  // Preserve existing seed-store creation behavior, including keep()'s
  // refusal to replace an identity. Capability stores cannot reach this path.
  const secret = crypto.getRandomValues(new Uint8Array(32));
  await store.keep(name, secret);
  return secretSigner(secret);
}
