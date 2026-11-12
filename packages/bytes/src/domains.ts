/**
 * The byte domains (scope contract, section 2.1). Every digest and
 * signature is over a domain tag, one newline byte, and the canonical JSON of
 * one value. No value contains its own digest.
 */

import { DOMAINS } from "@generalbusiness/dap-contract";
import type { DeclaredDefinition, DeliveryCause, Digest, DomainTag, Entry, FactRef, GenesisInput, GenesisNonce, Incarnation, Intent, SequenceRef, Message, ScopeId, Seed, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalBytes, utf8 } from "./canonical.ts";
import { base32, unbase32 } from "./encode.ts";
import { digestOfHash, sha256 } from "./hash.ts";
import { sign, verify } from "./sign.ts";

/** The UTF-8 tag, one newline byte, then the canonical JSON of the value. */
export function domainBytes(tag: DomainTag, value: unknown): Uint8Array {
  const head = utf8(`${tag}\n`);
  const body = canonicalBytes(value);
  const out = new Uint8Array(head.length + body.length);
  out.set(head, 0);
  out.set(body, head.length);
  return out;
}

const digest = (tag: DomainTag, value: unknown): Digest => digestOfHash(sha256(domainBytes(tag, value)));

/** Over the intent, not the signature. The same intent, retried, has the same digest. */
export function intentDigest(intent: Intent): Digest {
  return digest(DOMAINS.intent, intent);
}

export function signIntent(intent: Intent, secret: Uint8Array): SignedIntent {
  return { intent, sig: sign(secret, domainBytes(DOMAINS.intent, intent)) };
}

/** True when the signature is by `intent.actor` over the intent. Anything malformed is false. Never throws. */
export function verifySignedIntent(signed: SignedIntent): boolean {
  try {
    return verify(signed.intent.actor, signed.sig, domainBytes(DOMAINS.intent, signed.intent));
  } catch {
    return false;
  }
}

export function seedDigest(seed: Seed): Digest {
  return digest(DOMAINS.seed, seed);
}

/** `sc_` + the 52 base32 characters of the 32 bytes of the seed's digest. */
export function scopeIdOf(seed: Seed): ScopeId {
  return `sc_${base32(sha256(domainBytes(DOMAINS.seed, seed)))}`;
}

/** The unpadded lowercase base32 encoding of exactly 16 random bytes. */
export function newGenesisNonce(bytes: Uint8Array): GenesisNonce {
  if (bytes.length !== 16) throw new Error("a genesis nonce is made from 16 random bytes");
  return base32(bytes);
}

export function isGenesisNonce(value: unknown): value is GenesisNonce {
  if (typeof value !== "string" || value.length !== 26) return false;
  const bytes = unbase32(value);
  return bytes?.length === 16 && base32(bytes) === value;
}

/** The complete genesis input, including its recorded sourceKind, precedes every child seed and the finished entry. */
export function genesisInputDigest(input: GenesisInput): Digest {
  return digest(DOMAINS.input, input);
}

/** `in_` + 26 base32 characters. The caller supplies 16 random bytes, in the transaction that writes the first entry (section 2.2). */
export function newIncarnation(randomBytes16: Uint8Array): Incarnation {
  if (randomBytes16.length !== 16) throw new Error("an incarnation is made from 16 random bytes");
  return `in_${base32(randomBytes16)}`;
}

/** Computed last, over bytes that do not contain it: the `Entry` type has no hash field (section 4.1). */
export function entryHash(entry: Entry): Digest {
  return digest(DOMAINS.entry, entry);
}

/** A view of a sealed entry beside its verified sequence context. A later
 * entry carries no address, so its caller must supply that context. */
export function factRefOf(entry: Entry, at: SequenceRef): FactRef {
  return sealedFactRef(entry, entryHash(entry), at);
}

/** Reuse the hash already produced by the sealing transaction or checked read.
 * This constructor does not verify an arbitrary supplied hash or birth proof. */
export function sealedFactRef(entry: Entry, hash: Digest, at: SequenceRef): FactRef {
  if (entry.input.type === "genesis") {
    if (entry.seq !== 0 || entry.prev !== null || scopeIdOf(entry.input.seed) !== at.scope || hash !== at.genesis) throw new Error("the genesis does not bind this sequence");
  } else if (!("genesis" in entry) || entry.genesis !== at.genesis) throw new Error("the entry names another sequence");
  return { at: { scope: at.scope, genesis: at.genesis }, seq: entry.seq, hash };
}

export function messageDigest(message: Message): Digest {
  return digest(DOMAINS.message, message);
}

/** The cause of a scope that a delivery's handler creates (section 7.2). */
export function deliveryCauseDigest(cause: DeliveryCause): Digest {
  return digest(DOMAINS.delivery, cause);
}

export function definitionDigest(definition: DeclaredDefinition): Digest {
  return digest(DOMAINS.definition, definition);
}

/**
 * The digest that names a detached text (section 6.2): over the text as one
 * JSON string. An intent, an entry and an effect hold this digest, and never
 * the text. Throws for a text with a lone surrogate, which has no canonical
 * bytes.
 */
export function textDigest(text: string): Digest {
  return digest(DOMAINS.text, text);
}

/**
 * The digest of a snapshot of staged refs (sections 2.1 and 16.4): over the
 * list of `{ ref, target }` pairs, which the caller gives in byte order of
 * `ref`.
 */
export function snapshotDigest(pairs: readonly { ref: string; target: string }[]): Digest {
  return digest(DOMAINS.snapshot, pairs);
}

const named = (value: unknown, prefix: string, chars: number, bytes: number): boolean =>
  typeof value === "string" && value.length === prefix.length + chars && value.startsWith(prefix) && unbase32(value.slice(prefix.length))?.length === bytes;

export function isScopeId(value: unknown): value is ScopeId {
  return named(value, "sc_", 52, 32);
}

export function isIncarnation(value: unknown): value is Incarnation {
  return named(value, "in_", 26, 16);
}
