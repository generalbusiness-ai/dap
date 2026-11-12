/** TEST proof rebasing only. The caller first obtains nine actual Native facts.
 * Re-signing a copied factory does not claim that its judge ran again. */
import { PROPOSED_BOUNDS, type Digest, type Entry, type ScopeRef, type Seed } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, deliveryCauseDigest, factRefOf, intentDigest, isFactRef, isRecord, isScopeRef, isSeed, messageDigest, parseStrict, same, scopeIdOf, signIntent, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { isEntryOf, sentBy, type Fetched } from "@generalbusiness/dap-derive";
import { evidenceBindingDigest, readEvidenceBinding } from "@generalbusiness/dap-platform";
import { rita } from "./repository.ts";

/** Keep all proof links coherent while changing only the factory's selected pin.
 * A distinct idempotency key also rebases same-pin controls nontrivially. */
export function evidenceFactoryProof(facts: readonly Fetched[], factoryPin: Digest): readonly Fetched[] {
  if (facts.length !== 9) throw Error("Exactly nine actual origin facts required");
  const child = facts[0]!, creator = facts[1]!;
  if (child.entry.input.type !== "genesis" || creator.entry.input.type !== "delivery") throw Error("Actual child and creator required");
  const parent = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, creator.fact.at));
  if (!parent || parent.entry.input.type !== "genesis" || !isFactRef(parent.entry.input.source)) throw Error("Actual parent genesis required");
  const opened = facts.find(copy => same(copy.fact, parent.entry.input.type === "genesis" && parent.entry.input.source));
  if (!opened || opened.entry.input.type !== "act" || opened.entry.input.signed.intent.actor !== rita.key) throw Error("Actual signed TEST Directory factory required");
  const parentBirth = parent.entry.input, childBirth = child.entry.input;
  const signed = signIntent({ ...opened.entry.input.signed.intent,
    fields: { ...opened.entry.input.signed.intent.fields, definition: factoryPin },
    idempotencyKey: opened.entry.input.signed.intent.idempotencyKey + "-F-proof",
  }, rita.secret);
  const parentSeed: Seed = { ...parentBirth.seed, cause: intentDigest(signed.intent) };
  let childSeed = childBirth.seed;
  let references = new Map(facts.map(copy => [canonicalize(copy.fact), copy.fact]));
  let hashes = new Map(facts.map(copy => [copy.fact.hash, copy.fact.hash]));
  let result: readonly Fetched[] = facts;
  for (let pass = 0; pass < 32; pass++) {
    // A rebased scope's address: its rebased seed's scope ID and the rebased hash of its genesis, from the previous pass.
    const genesisOf = (at: ScopeRef) => hashes.get(at.genesis) ?? at.genesis;
    const parentAt: ScopeRef = { scope: scopeIdOf(parentSeed), genesis: genesisOf(parent.fact.at) };
    const childAt: ScopeRef = { scope: scopeIdOf(childSeed), genesis: genesisOf(child.fact.at) };
    const rewrite = (value: unknown, wire = false): unknown => {
      if (typeof value === "string") {
        if (wire) return canonicalize(rewrite(parseStrict(value)));
        return hashes.get(value as Digest) ?? value;
      }
      if (Array.isArray(value)) return value.map(entry => rewrite(entry));
      if (!isRecord(value)) return value;
      if (isFactRef(value)) {
        const held = references.get(canonicalize(value));
        return held ?? { ...value, at: rewrite(value.at) };
      }
      if (isScopeRef(value)) return same(value, parent.fact.at) ? parentAt : same(value, child.fact.at) ? childAt : value;
      if (isSeed(value) && same(value, parentBirth.seed)) return parentSeed;
      if (isSeed(value) && same(value, childBirth.seed)) return childSeed;
      const record = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key,
        rewrite(entry, typeof entry === "string" && entry.startsWith("{") && (key === "binding" || key === "cause" || key === "value" && value["effect"] === "value" && value["slot"] === "record")),
      ]));
      if (Object.hasOwn(record, "binding") && Object.hasOwn(record, "bindingDigest")) {
        const binding = readEvidenceBinding(typeof record["binding"] === "string" ? parseStrict(record["binding"]) : record["binding"]);
        if (!binding) throw Error("Rebased binding must retain its exact shape");
        record["bindingDigest"] = evidenceBindingDigest(binding);
      }
      return record;
    };
    const delivery = rewrite(creator.entry.input) as typeof creator.entry.input;
    childSeed = { ...childBirth.seed, creator: parentAt,
      cause: deliveryCauseDigest({ v: 1, from: delivery.from, n: delivery.n, message: messageDigest(delivery.message) }) };
    const next = facts.map(copy => {
      let entry = rewrite(copy.entry) as Entry;
      if (copy === opened) entry = { ...entry, input: { type: "act", signed,
        authority: opened.entry.input.type === "act" ? opened.entry.input.authority : [],
        presented: opened.entry.input.type === "act" ? opened.entry.input.presented : {} } };
      const at = rewrite(copy.fact.at) as ScopeRef;
      return { ...copy, entry, fact: factRefOf(entry, at) };
    });
    if (canonicalize(next.map(copy => [copy.fact, copy.entry])) === canonicalize(result.map(copy => [copy.fact, copy.entry]))) {
      // Each rebased copy is admitted under the sequence that its scope's rebased genesis bytes establish.
      const births = new Map(next.filter(copy => copy.fact.seq === 0).map(copy => [canonicalize(copy.fact.at), canonicalize(copy.entry)]));
      const admitted = next.map(copy => {
        const birth = births.get(canonicalize(copy.fact.at));
        const sequence = birth === undefined ? copy.sequence : admitSequenceGenesis(birth, copy.fact.at, PROPOSED_BOUNDS.entryBytes);
        if (!sequence) throw Error("Rebased genesis must bind its rebased address");
        return { ...copy, sequence };
      });
      const rebasedParent = next.find(copy => copy.fact.seq === 0 && same(copy.fact.at, parentAt));
      const rebasedFactory = next[facts.indexOf(opened)]!;
      if (!rebasedParent || rebasedParent.entry.input.type !== "genesis" || rebasedFactory.entry.input.type !== "act"
        || !verifySignedIntent(rebasedFactory.entry.input.signed)
        || rebasedParent.entry.input.seed.definition !== parentBirth.seed.definition
        || rebasedFactory.entry.input.signed.intent.fields["definition"] !== factoryPin
        || rebasedParent.entry.input.seed.cause !== intentDigest(rebasedFactory.entry.input.signed.intent)
        || !same(rebasedParent.entry.input.source, rebasedFactory.fact)
        || rebasedParent.entry.input.n === null || !rebasedParent.entry.input.message
        || !sentBy(rebasedFactory.entry, { from: rebasedFactory.fact, n: rebasedParent.entry.input.n,
          to: rebasedParent.entry.input.seed, message: rebasedParent.entry.input.message })
        || admitted.some(copy => !isEntryOf(copy.entry, copy.fact, copy.sequence))) throw Error("Rebased factory must retain coherent signatures, causes, sends and fact hashes");
      return admitted;
    }
    result = next;
    references = new Map(facts.map((copy, index) => [canonicalize(copy.fact), next[index]!.fact]));
    hashes = new Map(facts.map((copy, index) => [copy.fact.hash, next[index]!.fact.hash]));
  }
  throw Error("Nine-fact proof dependencies did not settle within 32 passes");
}
