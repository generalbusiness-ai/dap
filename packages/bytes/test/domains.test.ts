import { describe, expect, test } from "vitest";
import { DOMAINS, PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { ControlRequest, Digest, GenesisEntry, GenesisInput, Message, Seed, SignedIntent } from "@generalbusiness/dap-contract";
import {
  admitSequenceGenesis, fitsFieldType, isEntryBodyOf, isEntryOf, b64url, canonicalBytes, canonicalize, definitionDigest, deliveryCauseDigest, digestBytes, domainBytes, entryHash, factRefOf, intentDigest,
  isOutboxId, isGenesisNonce, isSequenceRef, isGenesisSelfRef, isFactRef, isFactUse, isEntry, isInput, resolveGenesisSelf, sealedFactRef, genesisInputDigest, isKeyId, isMemberId, isOperationId, isPlatformDefinition, isRetainedInput, isScopeId, isScopeKind, keyIdOfSecret, messageDigest, newGenesisNonce, scopeIdOf, seedDigest, sign, signControl, signControlWith, signIntent, textDigest, unb64url, utf8, verifyControl, verifySignedIntent,
} from "../src/index.ts";
import { cause, definition, directory, entry, intent, message, otherSecret, secret, seed } from "./fixtures.ts";

/** Every digest function with its domain and a value of its type. */
const digests: readonly (readonly [string, (value: never) => Digest, object])[] = [
  [DOMAINS.intent, intentDigest, intent],
  [DOMAINS.seed, seedDigest, seed],
  [DOMAINS.entry, entryHash, entry],
  [DOMAINS.message, messageDigest, message],
  [DOMAINS.delivery, deliveryCauseDigest, cause],
  [DOMAINS.definition, definitionDigest, definition],
];
const run = (fn: (value: never) => Digest, value: object) => fn(value as never);

describe("byte domains", () => {
  test("each of the six digests is over its own tag, one newline byte and the canonical JSON of its value", () => {
    for (const [tag, fn, value] of digests) {
      const expected = new Uint8Array([...utf8(tag), 0x0a, ...canonicalBytes(value)]);
      expect(domainBytes(tag as never, value), tag).toEqual(expected);
      expect(run(fn, value), tag).toBe(digestBytes(expected));
    }
    // So one value under the six tags has six digests.
    expect(new Set(digests.map(([, fn]) => run(fn, seed))).size).toBe(6);
  });

  test("one message's bytes and digest are the ones written out here", () => {
    // Neither expected value was produced by this package. The text is canonical JSON written by hand: keys in order, no
    // spaces. Its SHA-256 was computed once with Node's `crypto.createHash("sha256")`, in a one-off command.
    const text = 'artroom-message-1\n{"body":{"n":1},"class":"advisory","type":"index"}';
    const value: Message = { class: "advisory", type: "index", body: { n: 1 } };
    expect(domainBytes(DOMAINS.message, value)).toEqual(new TextEncoder().encode(text));
    expect(messageDigest(value)).toBe("sha256:8e6e8bab371f3c95f753a75291f29a9cad024babc6f69c70b35d476b89aef1f6");
  });

  test("a detached text is named by the digest of its own tag, a newline and the text as one JSON string", () => {
    // The expected value was not produced by this package: the bytes are the tag, a newline, and the text as canonical JSON written
    // by hand, with its quotes and its line break escaped. Their SHA-256 was computed once with Node's `crypto.createHash("sha256")`.
    const text = 'She said "ok".\nπ';
    expect(domainBytes(DOMAINS.text, text)).toEqual(new TextEncoder().encode('artroom-text-1\n"She said \\"ok\\".\\nπ"'));
    expect(textDigest(text)).toBe("sha256:1c2580bc44ef94569e0e445903667e564def426064c37ea836e795c5d4a6d907");
    // It is not the digest of the text's own bytes, and one more space is another text.
    expect(textDigest(text)).not.toBe(digestBytes(utf8(text)));
    expect(textDigest(`${text} `)).not.toBe(textDigest(text));
    // A text with a lone surrogate has no canonical bytes, so it has no digest.
    expect(() => textDigest("\ud800")).toThrow();
  });
});

describe("scope identity", () => {
  test("a scope ID is sc_ and 52 base32 characters, equal for an equal seed, and different when cause, ordinal or creator differs", () => {
    const id = scopeIdOf(seed);
    expect(id).toMatch(/^sc_[a-z2-7]{52}$/);
    expect(isScopeId(id)).toBe(true);
    // An equal seed built in another key order, as a retry would build it.
    const again = Object.fromEntries(Object.entries(seed).reverse()) as unknown as Seed;
    expect(scopeIdOf(again)).toBe(id);
    const others: Seed[] = [
      { ...seed, cause: `sha256:${"d".repeat(64)}` },
      { ...seed, ordinal: 1 },
      { ...seed, creator: null },
      { ...seed, creator: { ...directory, genesis: textDigest("another genesis") } },
    ];
    expect(new Set([id, ...others.map(scopeIdOf)]).size).toBe(5);
  });

  test("a genesis nonce has exactly 16 bytes in canonical lowercase unpadded base32, including zero padding bits", () => {
    const zero = newGenesisNonce(new Uint8Array(16));
    const full = newGenesisNonce(new Uint8Array(16).fill(0xff));
    expect(zero).toBe("a".repeat(26));
    expect(full).toBe(`${"7".repeat(25)}4`);
    expect([isGenesisNonce(zero), isGenesisNonce(full)]).toEqual([true, true]);
    for (const size of [15, 17]) expect(() => newGenesisNonce(new Uint8Array(size))).toThrow();
    for (const bad of [zero.slice(1), zero.toUpperCase(), `${"a".repeat(25)}b`, "7".repeat(26), `in_${zero}`, `${"1".repeat(26)}`, 7]) expect(isGenesisNonce(bad), String(bad)).toBe(false);
    for (const bad of [scopeIdOf(seed).slice(0, -1), `sc_${"7".repeat(52)}`, zero]) expect(isScopeId(bad), String(bad)).toBe(false);
  });
});

describe("signed intents", () => {
  const signed = signIntent(intent, secret);

  test("an intent signed by its actor verifies; an altered payload, another key, another domain and an altered signature do not", () => {
    expect(verifySignedIntent(signed)).toBe(true);
    const flipped = Uint8Array.from(unb64url(signed.sig)!, (b, i) => (i === 0 ? b ^ 1 : b));
    const others: readonly (readonly [string, SignedIntent])[] = [
      ["an altered payload", { intent: { ...intent, kind: "close-issue" }, sig: signed.sig }],
      ["signed by a key that is not the actor", signIntent(intent, otherSecret)],
      ["signed under another domain", { intent, sig: sign(secret, domainBytes(DOMAINS.entry, intent)) }],
      ["an altered signature", { intent, sig: b64url(flipped) }],
    ];
    for (const [name, other] of others) expect(verifySignedIntent(other), name).toBe(false);
  });

  test("malformed input is answered false and never throws", () => {
    const malformed: unknown[] = [
      null, {}, { intent }, { intent, sig: 7 }, { intent, sig: "" }, { intent, sig: "!" }, { intent, sig: `${signed.sig}A` }, { intent, sig: `${signed.sig}=` },
      { intent: { ...intent, actor: "key_short" }, sig: signed.sig },
      { intent: { ...intent, actor: `key_${b64url(new Uint8Array(32).fill(0xff))}` }, sig: signed.sig }, // 32 bytes that encode no point
      { intent: { ...intent, on: 1.5 }, sig: signed.sig }, // no canonical bytes exist
    ];
    for (const value of malformed) expect(verifySignedIntent(value as SignedIntent), JSON.stringify(value)?.slice(0, 60)).toBe(false);
  });
});

test("an async control signer binds its own actor and the original request while signing waits", async () => {
  const request: ControlRequest = { v: 1, action: "create", service: "https://control.test", membership: { ...directory }, agent: null, actor: keyIdOfSecret(secret), body: digestBytes(utf8("link")), op: "original-control", notAfter: intent.notAfter };
  const original = structuredClone(request);
  let release!: () => void, calls = 0;
  const wait = new Promise<void>(resolve => { release = resolve; });
  // Explicit signer stand-in: the consumer sees only key and sign, never a seed.
  const signer = { key: request.actor, sign: async (bytes: Uint8Array) => { calls++; await wait; return sign(secret, bytes); } };
  const pending = signControlWith(request, signer);
  request.op = "changed-after-signing-started";
  request.membership.genesis = textDigest("replacement membership genesis");
  release();
  const signed = await pending;
  expect(signed).toEqual(signControl(original, secret));
  expect(verifyControl(signed)).toBe(true);
  await expect(signControlWith({ ...original, actor: keyIdOfSecret(otherSecret) }, signer)).rejects.toThrow("actor");
  expect(calls).toBe(1);
});

describe("entries", () => {
  test("an entry's hash is over bytes that do not contain it, and a fact reference is a view beside the entry", () => {
    const before = canonicalize(entry);
    const hash = entryHash(entry);
    const fact = factRefOf(entry, directory);
    expect(canonicalize(entry)).toBe(before);
    expect(before).not.toContain(hash);
    expect(entry).not.toHaveProperty("hash");
    expect(fact).toEqual({ at: directory, seq: 17, hash });
    expect(sealedFactRef(entry, hash, directory)).toEqual(fact);
    expect(() => factRefOf(entry, { ...directory, genesis: textDigest("different sequence") })).toThrow();
    // The next entry holds this hash as `prev`: a hash that already exists.
    expect(canonicalize({ ...entry, seq: 18, prev: fact.hash })).toContain(hash);
  });
});

describe("identifiers", () => {
  test("each identifier the contract names has one guard, which takes its one form and nothing near it", () => {
    const key = keyIdOfSecret(new Uint8Array(32).fill(1));
    const KEPT = textDigest("kept");
    const forms: [(v: unknown) => boolean, unknown[], unknown[]][] = [
      [isKeyId, [key], [key.slice(0, -1), `${key}A`, key.replace("key_", "KEY_"), 7]],
      [isMemberId, ["@a", "@Alice Smith"], ["@", "a", "@\ud800", null]],
      [isOperationId, ["0:0", "17:2"], ["op_1", "17", "17:02", "1:2:3", "-1:0", null]],
      [isOutboxId, ["0.0", "17.2"], ["17", "17.02", "1.2.3", "-1.0", 17.2]],
      [isPlatformDefinition, ["platform:directory@1", "platform:directory-partition@1"], ["platform:lane@1", "platform:directory@01", "platform:directory-partition@01", "platform:directory-partitions@1", "directory@1"]],
      [isScopeKind, ["lane", "directory"], ["room", "", null]],
      [isSequenceRef, [directory], [{ ...directory, kind: "directory" }, { scope: directory.scope, genesis: `sha256:${"a".repeat(63)}` }, { scope: directory.scope, genesis: null }]],
      [isGenesisSelfRef, [{ scope: directory.scope, genesis: null }], [directory, { scope: directory.scope, genesis: null, kind: "directory" }]],
      [isFactRef, [{ at: directory, seq: 0, hash: directory.genesis }], [{ at: { scope: directory.scope, genesis: null }, seq: 0, hash: directory.genesis }]],
      // Section 9.2, revision 19: a retained value states its domain, and no other kind states one.
      [isRetainedInput, [{ kind: "value", domain: "artroom-check-configuration-1", digest: KEPT, bytes: "{}" }, { kind: "snapshot", digest: KEPT, bytes: "[]" }, { kind: "entry", digest: KEPT, bytes: "{}", under: "issue" }],
        [{ kind: "value", digest: KEPT, bytes: "{}" }, { kind: "value", domain: "", digest: KEPT, bytes: "{}" }, { kind: "definition", domain: "artroom-definition-1", digest: KEPT, bytes: "{}" }, { kind: "values", domain: "d", digest: KEPT, bytes: "{}" }]],
    ];
    for (const [guard, good, bad] of forms) expect([good.map(guard), bad.map(guard)], guard.name).toEqual([good.map(() => true), bad.map(() => false)]);
  });
});


test("genesis and later entry headers are closed, and the complete nonce-bearing input precedes its children and entry digest", () => {
  const input: GenesisInput = { type: "genesis", seed, nonce: newGenesisNonce(new Uint8Array(16)), kind: "establish", founding: null, source: null, sourceKind: null, n: null, message: null, decision: "applied" };
  const genesis: GenesisEntry = { v: 1, seq: 0, prev: null, time: entry.time, clamped: false, epoch: 0, input, uses: [], prepared: [], effects: [], sends: [] };
  expect(DOMAINS.entry).toBe("artroom-entry-1");
  expect(DOMAINS.input).toBe("artroom-input-1");
  expect(genesisInputDigest(input)).toBe(digestBytes(new Uint8Array([...utf8("artroom-input-1\n"), ...canonicalBytes(input)])));
  expect(genesisInputDigest(input)).not.toBe(entryHash(genesis));
  expect([isInput(input), isEntry(genesis), isEntry(entry)]).toEqual([true, true, true]);
  const { sourceKind: _rootKind, ...missingRootKind } = input;
  const source = { at: directory, seq: 0, hash: directory.genesis };
  const created: GenesisInput = { ...input, source, sourceKind: "directory" };
  const otherKind: GenesisInput = { ...created, sourceKind: "membership" };
  expect(isInput(created)).toBe(true);
  for (const invalid of [missingRootKind, { ...input, sourceKind: "directory" }, { ...created, sourceKind: null }, { ...created, sourceKind: "other" }]) expect(isInput(invalid)).toBe(false);
  expect(genesisInputDigest(created)).not.toBe(genesisInputDigest(otherKind));
  expect(entryHash({ ...genesis, input: created })).not.toBe(entryHash({ ...genesis, input: otherKind }));
  const messages: Message[] = [
    { class: "request", type: "tell", body: {} },
    { class: "result", of: { from: source, n: 0 }, outcome: "applied" },
    { class: "control", type: "confirm", genesis: source },
    { class: "advisory", type: "index", body: {} },
  ];
  for (const message of messages) {
    const delivery = { type: "delivery", from: source, sourceKind: "directory", n: 0, message,
      ...(message.class === "request" ? { decision: "applied" } : message.class === "result" ? { clause: "applied" } : {}) };
    expect(isInput(delivery)).toBe(true);
    const { sourceKind: _kind, ...missing } = delivery;
    for (const invalid of [missing, { ...delivery, sourceKind: null }, { ...delivery, sourceKind: "other" }]) expect(isInput(invalid)).toBe(false);
  }
  const use = { fact: source, content: textDigest("original retained bytes"), kind: "directory" };
  expect(isFactUse(use)).toBe(true);
  const { kind: _useKind, ...missingUseKind } = use;
  for (const invalid of [missingUseKind, { ...use, kind: null }, { ...use, kind: "other" }]) expect(isFactUse(invalid)).toBe(false);
  expect(isEntry({ ...genesis, uses: [use] })).toBe(true);
  expect(isEntry({ ...genesis, uses: [missingUseKind] })).toBe(false);
  for (const invalid of [{ ...genesis, at: directory }, { ...genesis, genesis: directory.genesis }, { ...genesis, seq: 1 }, { ...genesis, prev: directory.genesis }, { ...entry, genesis: undefined }, { ...entry, at: directory }, { ...entry, seq: 0 }, { ...entry, prev: null }, { ...entry, input }]) expect(isEntry(invalid)).toBe(false);
  const cause = genesisInputDigest(input);
  const self = { scope: scopeIdOf(seed), genesis: null } as const;
  const child: Seed = { v: 1, kind: "membership", definition: "platform:membership@2", creator: self, cause, ordinal: 0 };
  const encodedEffect = { effect: "ref", item: 0, slot: "directory", to: self } as const;
  expect(isEntry({ ...genesis, effects: [encodedEffect] })).toBe(true);
  expect(isEntry({ ...entry, effects: [encodedEffect] })).toBe(false);
  const changed = { ...input, nonce: newGenesisNonce(new Uint8Array(16).fill(1)) };
  expect(scopeIdOf(child)).not.toBe(scopeIdOf({ ...child, cause: genesisInputDigest(changed) }));
  const hash = entryHash(genesis), at = { scope: scopeIdOf(seed), genesis: hash };
  const origin = sealedFactRef(genesis, hash, at);
  const bytes = canonicalize(genesis);
  const checked = admitSequenceGenesis(bytes, at, utf8(bytes).length);
  expect(checked?.at).toEqual(at);
  expect(checked?.kind).toBe(seed.kind);
  if (!checked) throw new Error("the original canonical genesis must admit its identity");
  expect(isEntryOf(genesis, origin, checked)).toBe(true);
  const wrongAddress = { ...origin, at: { ...at, scope: directory.scope } };
  expect(isEntryBodyOf(genesis, wrongAddress)).toBe(true);
  expect(isEntryOf(genesis, wrongAddress, checked)).toBe(false);
  expect(admitSequenceGenesis(`${bytes} `, at, utf8(bytes).length + 1)).toBeNull();
  expect(admitSequenceGenesis(bytes, at, utf8(bytes).length - 1)).toBeNull();
  expect(admitSequenceGenesis(bytes, { ...at, scope: directory.scope }, utf8(bytes).length)).toBeNull();
  expect(admitSequenceGenesis(bytes, { ...at, genesis: directory.genesis }, utf8(bytes).length)).toBeNull();
  for (const invalid of [NaN, Infinity, -1, 1.5]) expect(admitSequenceGenesis(bytes, at, invalid)).toBeNull();
  const constructor = checked.constructor;
  expect(() => Reflect.construct(constructor, [Symbol("wrong token"), directory, "membership"])).toThrow();
  expect(() => Reflect.construct(constructor, [undefined, directory, "membership"])).toThrow();
  const lookalike = Object.create(Object.getPrototypeOf(checked));
  expect(isEntryOf(genesis, origin, lookalike)).toBe(false);
  expect(Reflect.apply(isEntryOf, undefined, [genesis, origin])).toBe(false);
  expect(Reflect.apply(isEntryOf, undefined, [genesis, origin, { at, kind: seed.kind }])).toBe(false);
  expect(Object.isFrozen(checked)).toBe(true);
  expect(Object.isFrozen(Object.getPrototypeOf(checked))).toBe(true);
  expect(Object.isFrozen(constructor)).toBe(true);
  expect(Object.isFrozen(checked.at)).toBe(true);
  const mutable = { ...at };
  const snapshot = admitSequenceGenesis(bytes, mutable, utf8(bytes).length);
  mutable.scope = directory.scope;
  mutable.genesis = directory.genesis;
  expect(snapshot?.at).toEqual(at);
  expect(isEntryOf(genesis, origin, checked)).toBe(true);
  expect(fitsFieldType({ type: "scope", kind: "membership" }, checked.at, PROPOSED_BOUNDS)).toBe(true);

  expect(() => sealedFactRef(genesis, hash, { ...at, scope: directory.scope })).toThrow();
  expect(() => sealedFactRef(genesis, hash, { ...at, genesis: textDigest("another genesis") })).toThrow();
  const before = canonicalize({ genesis, child });
  expect(resolveGenesisSelf(self, origin)).toEqual(at);
  expect(resolveGenesisSelf(self, { ...origin, seq: 1 })).toBeNull();
  expect(resolveGenesisSelf({ ...self, scope: directory.scope }, origin)).toBeNull();
  expect(canonicalize({ genesis, child })).toBe(before);
  expect(child.creator).toEqual(self);
});
