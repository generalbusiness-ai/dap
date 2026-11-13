/** SCRIPTED coherent immutable frames. No native factory judgment ran. */
import type { Digest, Entry, FactRef, GenesisEntry, Request, PlatformDefinition, ScopeKind, ScopeRef, Seed, SequenceEntry } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, deliveryCauseDigest, entryHash, factRefOf, genesisInputDigest, intentDigest, messageDigest, newGenesisNonce, scopeIdOf, signIntent, utf8 } from "@generalbusiness/dap-bytes";
import { type Fetched } from "@generalbusiness/dap-derive";
import { d, keys, T0, t } from "@generalbusiness/dap-derive/testing";
import { PARTITION_COHORT as C } from "../src/directory-partitions.ts";

export function scriptedPartitionOrigin(name: "application" | "change" | "issue" = "change", concerns = 0, wrongConcernMembership = false, definition: Digest = d("f"), sealed = false) {
  let nonce = 1;
  const empty = () => ({ v: 1 as const, seq: 0 as const, prev: null, time: T0, clamped: false, epoch: 0 as const, uses: [], prepared: [], effects: [], sends: [] });
  const seedOf = (kind: ScopeKind, named: Digest | PlatformDefinition, creator: Seed["creator"], cause: Digest, ordinal = 0): Seed => ({ v: 1, kind, definition: named, creator, cause, ordinal });
  // sourceKind is the required b023 input field. Its Contract/Bytes assembly
  // is separate from this producer slice; no old wire fallback is used.
  const birth = (seed: Seed, kind: string, source: FactRef | null, n: number | null, message: Request | null, sourceKind: ScopeKind | null): GenesisEntry => {
    const body = { type: "genesis" as const, seed, nonce: newGenesisNonce(new Uint8Array(16).fill(nonce++)), kind, founding: null, n, message, decision: "applied" as const };
    return { ...empty(), input: source && sourceKind ? { ...body, source, sourceKind } : { ...body, source: null, sourceKind: null } };
  };
  const atOf = (entry: GenesisEntry): ScopeRef => ({ scope: scopeIdOf(entry.input.seed), genesis: entryHash(entry) });
  const signed = (at: ScopeRef, kind: string, fields: Record<string, never> | { definition: Digest }, key: string) => signIntent({ v: 1, to: at, actor: keys.rita.key, kind, on: null, expected: {}, fields, idempotencyKey: key, notAfter: t(60) }, keys.rita.secret);
  const registerSeed = seedOf("register", C.register, null, d("1")), registerGenesis = birth(registerSeed, "install", null, null, null, null), register = atOf(registerGenesis);
  const rootSeed = seedOf("directory", C.directory, register, d("2")), rootSelf = { scope: scopeIdOf(rootSeed), genesis: null } as const;
  const siblingPins = [["membership", C.membership], ["rules", C.rules], ["destination", C.destination]] as const;
  // Every child seed of a genesis takes the complete applied genesis input as its cause. The input holds no sends, so no cycle forms.
  const rootBirth = birth(rootSeed, "establish", { at: register, seq: 1, hash: d("3") }, 0, { class: "request", type: "create", body: {} }, "register");
  const siblingSeeds = siblingPins.map(([kind, pin], n) => seedOf(kind, pin, rootSelf, genesisInputDigest(rootBirth.input), n));
  const messages = siblingSeeds.map((_seed, n) => ({ class: "request", type: "create", body: { fields: { directory: rootSelf, ...(n > 0 ? { membership: scopeIdOf(siblingSeeds[0]!) } : {}), ...(n === 2 ? { rules: scopeIdOf(siblingSeeds[1]!) } : {}) } } }) as const);
  // Encoded creator/body self avoids a genesis hash cycle. The child keeps
  // that exact sent seed/message; policy resolves it against the source fact.
  const rootGenesis: GenesisEntry = { ...rootBirth, sends: siblingSeeds.map((to, n) => ({ n: n + 1, to, message: messages[n]! })) };
  const root = atOf(rootGenesis), rootFact = factRefOf(rootGenesis, root);
  const siblings = siblingSeeds.map((seed, n) => birth(seed, "establish", rootFact, n + 1, messages[n]!, "directory"));
  const membership = atOf(siblings[0]!), rules = atOf(siblings[1]!), destination = atOf(siblings[2]!);
  const priorSeed = seedOf("directory", C.partition, root, d("b")), priorGenesis = birth(priorSeed, "establish-partition", rootFact, 0, { class: "request", type: "create", body: {} }, "directory"), previous = atOf(priorGenesis);
  const seal = { class: "request", type: "tell", body: { message: "seal", fields: {} } } as const;
  const priorSeal: SequenceEntry = { ...empty(), genesis: previous.genesis, seq: 1, prev: previous.genesis, input: { type: "act", signed: signed(previous, "seal", {}, "scripted-seal"), authority: [], presented: {} }, sends: [{ n: 0, to: root, message: seal }] };
  const priorFact = factRefOf(priorSeal, previous), open = signed(root, "open-partition", {}, "scripted-partition-open");
  const cause = sealed ? deliveryCauseDigest({ v: 1, from: priorFact, n: 0, message: messageDigest(seal) }) : intentDigest(open.intent);
  const partSeed = seedOf("directory", C.partition, root, cause);
  const partMessage = { class: "request", type: "create", body: { directory: root, membership, fields: { root, membership, rules, destination, generation: 1, base: 1 } } } as const;
  const openingInput = sealed
    ? { type: "delivery" as const, from: priorFact, sourceKind: "directory" as const, n: 0, message: seal, decision: "applied" as const }
    : { type: "act" as const, signed: open, authority: [], presented: {} };
  const rootOpening: SequenceEntry = { ...empty(), genesis: root.genesis, seq: 1, prev: root.genesis, input: openingInput, sends: [{ n: 0, to: partSeed, message: partMessage }] };
  const partGenesis = birth(partSeed, "establish-partition", factRefOf(rootOpening, root), 0, partMessage, "directory"), partition = atOf(partGenesis);
  const route = name === "application" ? "establish-application" : name === "change" ? "open-pr" : "open-issue";
  const opening = signed(partition, route, { definition }, "scripted-lane-open"), laneSeed = seedOf("lane", definition, partition, intentDigest(opening.intent));
  const laneMessage = { class: "request", type: "create", body: { directory: partition, membership, ...(name === "application" ? { creationContext: { v: 1 } } : {}), fields: { ...(name === "issue" ? {} : { destination }), ...(name === "change" ? { rules } : {}) } } } as const;
  const laneCreating: SequenceEntry = { ...empty(), genesis: partition.genesis, seq: 1, prev: partition.genesis, input: { type: "act", signed: opening, authority: [], presented: {} }, sends: [{ n: 0, to: laneSeed, message: laneMessage }] };
  let genesis = birth(laneSeed, name === "issue" ? "file" : "open", factRefOf(laneCreating, partition), 0, laneMessage, "directory"), laneAt = atOf(genesis);
  const originals = [registerGenesis, rootGenesis, ...siblings, partGenesis, genesis, ...(sealed ? [priorGenesis] : [])];
  const sequences = originals.map(entry => {
    const at = atOf(entry), bytes = canonicalize(entry), sequence = admitSequenceGenesis(bytes, at, utf8(bytes).length);
    if (!sequence) throw new Error("scripted original genesis does not admit its sequence");
    return sequence;
  });
  const copy = (entry: Entry, at: ScopeRef, under: string): Fetched => {
    const sequence = sequences.find(row => row.at.scope === at.scope && row.at.genesis === at.genesis);
    if (!sequence) throw new Error("scripted frame has no matching original birth");
    return { fact: factRefOf(entry, at), entry, sequence, under };
  };
  const frames: Fetched[] = [copy(genesis, laneAt, name), copy(laneCreating, partition, "platform:directory-partition"), copy(partGenesis, partition, "platform:directory-partition"), copy(rootOpening, root, "platform:directory"), copy(rootGenesis, root, "platform:directory"), ...siblings.map((entry, n) => copy(entry, atOf(entry), `platform:${siblingPins[n]![0]}`)), copy(registerGenesis, register, "platform:register"), ...(sealed ? [copy(priorGenesis, previous, "platform:directory-partition")] : [])];
  for (let depth = 1; depth <= concerns; depth++) {
    const parent = laneAt, concern = signed(parent, "add-concern", {}, `scripted-concern-${depth}`), seed = seedOf("lane", definition, parent, intentDigest(concern.intent));
    const message = { class: "request", type: "create", body: { directory: partition, membership: wrongConcernMembership && depth === concerns ? { ...membership, genesis: d("e") } : membership, fields: { origin: { self: true } } } } as const;
    const creating: SequenceEntry = { ...empty(), genesis: parent.genesis, seq: 1, prev: parent.genesis, input: { type: "act", signed: concern, authority: [], presented: {} }, sends: [{ n: 0, to: seed, message }] };
    genesis = birth(seed, "file", factRefOf(creating, parent), 0, message, "lane"); laneAt = atOf(genesis);
    const bytes = canonicalize(genesis), sequence = admitSequenceGenesis(bytes, laneAt, utf8(bytes).length);
    if (!sequence) throw new Error("scripted concern has no matching original birth");
    sequences.push(sequence);
    frames.unshift(copy(genesis, laneAt, "issue"), copy(creating, parent, "issue"));
  }
  return { definition, register, root, partition, membership, rules, destination, previous, genesis, from: factRefOf(genesis, laneAt), frames };
}
