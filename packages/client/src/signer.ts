import type { Base64Url, KeyId } from "@generalbusiness/dap-contract";

/** Signs bytes as one Ed25519 key. It gives out the key's ID and signatures, and never the private key. */
export interface Signer {
  readonly key: KeyId;
  /** The signature over `bytes`, as unpadded base64url of its 64 bytes. */
  sign(bytes: Uint8Array): Base64Url | Promise<Base64Url>;
}
