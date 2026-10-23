/** Actual Node WebCrypto keys and signatures, not browser persistence or
 * enrollment evidence. App-owned identity/custody witnesses stay separate. */
import { webcrypto } from "node:crypto";
import { expect, test } from "vitest";
import { keyIdOf, verify } from "@generalbusiness/dap-bytes";
import { generateBrowserDeviceKey, signedIntent, storedWebCryptoSigner } from "../src/index.ts";

async function key(extractable = false) {
  const pair = await webcrypto.subtle.generateKey("Ed25519", extractable, ["sign", "verify"]);
  if (!("privateKey" in pair)) throw new Error("WebCrypto did not return a key pair");
  const publicKey = keyIdOf(new Uint8Array(await webcrypto.subtle.exportKey("raw", pair.publicKey)));
  return { pair, publicKey };
}

// A restored native non-extractable key signs existing intent bytes; the
// public API gives out only its public name and signing operation.
test("a structured-cloned stored key signs the original bytes under its actual public name", async () => {
  const generated = await generateBrowserDeviceKey().then(value => ({ ok: true, value } as const), () => ({ ok: false } as const));
  expect(generated.ok).toBe(true);
  if (!generated.ok) return;
  const held = generated.value, restored = structuredClone(held.pair.privateKey);
  const signer = storedWebCryptoSigner(held.publicKey, restored);
  expect(Object.keys(signer)).toEqual(["key", "sign"]);
  const bytes = new TextEncoder().encode("original stored-key message"), original = new Uint8Array(bytes);
  const pending = signer.sign(bytes); bytes.fill(0);
  const signature = await pending;
  expect(verify(held.publicKey, signature, original)).toBe(true);
  expect(verify(held.publicKey, signature, bytes)).toBe(false);
  const signed = await signedIntent(signer, { to: null, kind: "found" }, { now: 0 });
  expect(signed.intent.actor).toBe(held.publicKey);
  await expect(webcrypto.subtle.exportKey("pkcs8", restored as never)).rejects.toThrow();
});

// Plausible corrupt storage and metadata shadows must not turn an extractable
// key or a different key into this browser capability.
test("stored-key admission rejects extractable, forged and mismatched keys", async () => {
  const held = await key(), extractable = await key(true), other = await key();
  expect(() => storedWebCryptoSigner(held.publicKey, held.pair.publicKey)).toThrow(/non-extractable/);
  expect(() => storedWebCryptoSigner(extractable.publicKey, extractable.pair.privateKey)).toThrow(/non-extractable/);
  Object.defineProperty(extractable.pair.privateKey, "extractable", { value: false });
  expect(() => storedWebCryptoSigner(extractable.publicKey, extractable.pair.privateKey)).toThrow(/non-extractable/);
  expect(() => storedWebCryptoSigner(held.publicKey, { type: "private", extractable: false, algorithm: { name: "Ed25519" }, usages: ["sign"] })).toThrow(/non-extractable/);
  const mismatched = storedWebCryptoSigner(held.publicKey, other.pair.privateKey);
  const outcome = await Promise.resolve(mismatched.sign(new Uint8Array(32))).then(() => "unexpected signature", error => error instanceof Error ? error.message : "unexpected error");
  expect(outcome).toBe("The stored key does not match its public binding.");
});

// Workerd's actual generated-key path is covered by the Lending scope witness.
// This constructor stand-in isolates its missing-getter boundary on Node.
test("without native metadata getters only keys generated here are admitted", async () => {
  const outside = await key(), held = await generateBrowserDeviceKey();
  const original = Object.getOwnPropertyDescriptor(globalThis, "CryptoKey");
  try {
    Object.defineProperty(globalThis, "CryptoKey", { value: class {}, configurable: true });
    expect(() => storedWebCryptoSigner(outside.publicKey, outside.pair.privateKey)).toThrow(/non-extractable/);
    expect(() => storedWebCryptoSigner(held.publicKey, structuredClone(held.pair.privateKey))).toThrow(/non-extractable/);
    expect(() => storedWebCryptoSigner(held.publicKey, { type: "private", extractable: false, algorithm: { name: "Ed25519" }, usages: ["sign"] })).toThrow(/non-extractable/);
    const bytes = new TextEncoder().encode("module-generated key only");
    const signature = await storedWebCryptoSigner(held.publicKey, held.pair.privateKey).sign(bytes);
    expect(verify(held.publicKey, signature, bytes)).toBe(true);
  } finally {
    if (original) Object.defineProperty(globalThis, "CryptoKey", original);
    else Reflect.deleteProperty(globalThis, "CryptoKey");
  }
});
