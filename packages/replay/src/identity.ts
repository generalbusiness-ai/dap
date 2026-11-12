/** Native identity code is supplied beside native judgments. It is one pure
 * capability; each receiving run selects its mode from normally proved birth
 * frames. Neither a retained alias nor callback installation order selects it. */
import type { DeclaredDefinition, Digest, Entry, FactRef, PlatformDefinition, Request, ScopeKind, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { canonicalize, isFactRef, isScopeRef, resolveGenesisSelf, utf8, type CheckedSequence } from "@generalbusiness/dap-bytes";
import { isEntryOf, isObject, same } from "@generalbusiness/dap-derive";

export interface IdentityFrame { fact: FactRef; entry: Entry; sequence: CheckedSequence; named: Digest | PlatformDefinition; declarationName: string; native: boolean }
export interface IdentityCreation { seed: Seed; source: FactRef; sourceKind: ScopeKind; n: number; message: Request }
type Ancestry = "partition" | "legacy" | "missing" | "contradiction";
type Mode = { mode: "legacy" } | { mode: "partition-v1" };
const creatorOf = (input: { seed: Seed; source: FactRef | null }): ScopeRef | null =>
  input.source && input.seed.creator ? resolveGenesisSelf(input.seed.creator, input.source) : null;
export interface ReceiverIdentityCode {
  readonly version: 1;
  readonly bounds: { readonly facts: number; readonly laneDepth: number; readonly entryBytes: number; readonly bytes: number };
  readonly cohort: { readonly directory: PlatformDefinition; readonly partition: PlatformDefinition; readonly membership: PlatformDefinition; readonly rules: PlatformDefinition; readonly destination: PlatformDefinition; readonly inbox: PlatformDefinition };
  receiver(at: ScopeRef, frames: readonly IdentityFrame[]): Mode | null;
  creation(creation: IdentityCreation, definition: DeclaredDefinition | PlatformDefinition, frames: readonly IdentityFrame[]): Mode | null;
  producer(at: ScopeRef, frames: readonly IdentityFrame[]): string | null;
  source(named: Digest, name: string, at: ScopeRef, frames: readonly IdentityFrame[]): string | null;
  publication(from: FactRef, root: ScopeRef, destination: ScopeRef, kind: "application" | "change", frames: readonly IdentityFrame[]): boolean | null;
}
export interface CheckedIdentitySource {
  /** These must normally replay genesis/entry and its causal dependencies.
   * An anchor alone cannot attest native code, metadata or an accepted birth. */
  birth(at: ScopeRef): Promise<IdentityFrame | null>;
  fact(from: FactRef): Promise<IdentityFrame | null>;
}

/** One receiving entry owns a raw collection; every policy question uses a
 * separate minimal view. Normal causal replay has independent traversal
 * limits and never treats an anchor as a native-code attestation. */
class EvidenceCollection {
  readonly frames = new Map<string, IdentityFrame>();
  readonly positions = new Map<string, string>();
  readonly pending = new Map<string, Promise<IdentityFrame | null>>();
  #calls = 0;
  #bytes = 0;
  readonly code: ReceiverIdentityCode;
  readonly source: CheckedIdentitySource;
  constructor(code: ReceiverIdentityCode, source: CheckedIdentitySource) { this.code = code; this.source = source; }
  #keep(copy: IdentityFrame | null): IdentityFrame | null {
    if (!copy || !isEntryOf(copy.entry, copy.fact, copy.sequence)) return null;
    const key = canonicalize(copy.fact), position = canonicalize([copy.fact.at, copy.fact.seq]), cached = this.frames.get(key);
    if (cached) return cached.sequence.kind === copy.sequence.kind
      && same(cached.sequence.at, copy.sequence.at) && same(cached.fact, copy.fact) && same(cached.entry, copy.entry)
      && cached.named === copy.named && cached.declarationName === copy.declarationName && cached.native === copy.native ? cached : null;
    const bytes = utf8(canonicalize(copy.entry)).length;
    if (this.positions.has(position) || this.frames.size >= 32 || bytes > this.code.bounds.entryBytes || this.#bytes + bytes > 16 * 1024 * 1024) return null;
    this.frames.set(key, copy); this.positions.set(position, key); this.#bytes += bytes; return copy;
  }
  async #read(key: string, read: () => Promise<IdentityFrame | null>): Promise<IdentityFrame | null> {
    const pending = this.pending.get(key);
    if (pending) return pending;
    if (this.#calls >= 32) return null;
    this.#calls++;
    const work = read().then(copy => this.#keep(copy));
    this.pending.set(key, work); return work;
  }
  async birth(at: ScopeRef): Promise<IdentityFrame | null> {
    if (!isScopeRef(at)) return null;
    const cached = [...this.frames.values()].find(frame => frame.fact.seq === 0 && same(frame.fact.at, at));
    return cached ?? this.#read(`birth:${canonicalize(at)}`, () => this.source.birth(at));
  }
  async fact(from: FactRef): Promise<IdentityFrame | null> {
    if (!isFactRef(from)) return null;
    const cached = this.frames.get(canonicalize(from));
    if (cached) return cached;
    const birth = await this.birth(from.at);
    if (!birth) return null;
    if (from.seq === 0) return same(from, birth.fact) ? birth : null;
    return this.#read(`fact:${canonicalize(from)}`, () => this.source.fact(from));
  }
}

class EvidenceView {
  readonly #needed = new Map<string, IdentityFrame>();
  readonly collection: EvidenceCollection;
  constructor(collection: EvidenceCollection) { this.collection = collection; }
  get code() { return this.collection.code; }
  get frames(): readonly IdentityFrame[] { return [...this.#needed.values()]; }
  #take(frame: IdentityFrame | null): IdentityFrame | null {
    if (!frame) return null;
    const key = canonicalize(frame.fact);
    if (!this.#needed.has(key) && this.#needed.size >= this.code.bounds.facts) return null;
    this.#needed.set(key, frame); return frame;
  }
  async birth(at: ScopeRef): Promise<IdentityFrame | null> { return this.#take(await this.collection.birth(at)); }
  async fact(from: FactRef): Promise<IdentityFrame | null> {
    if (!await this.birth(from.at)) return null;
    return this.#take(await this.collection.fact(from));
  }
  async #lane(at: ScopeRef, depth = 1, seen = new Set<string>()): Promise<Ancestry> {
    const key = canonicalize(at);
    if (depth > this.code.bounds.laneDepth || seen.has(key)) return "missing";
    seen.add(key);
    const child = await this.birth(at), born = child?.entry.input;
    if (!child) return "missing";
    if (born?.type !== "genesis" || child.sequence.kind !== "lane" || born.seed.kind !== "lane"
      || !isFactRef(born.source) || !same(creatorOf(born), born.source.at)) return "contradiction";
    const source = await this.fact(born.source);
    if (!source) return "missing";
    if (source.sequence.kind !== born.sourceKind) return "contradiction";
    const creator = await this.birth(born.source.at);
    if (!creator) return "missing";
    if (creator.sequence.kind !== born.sourceKind) return "contradiction";
    return creator.sequence.kind === "lane" ? this.#lane(born.source.at, depth + 1, seen) : this.#partition(born.source.at);
  }
  async lane(at: ScopeRef, depth = 1, seen = new Set<string>()): Promise<boolean> {
    return await this.#lane(at, depth, seen) === "partition";
  }
  async #rootCreation(creation: IdentityCreation): Promise<Ancestry> {
    const creator = creatorOf(creation);
    if (!creator || !same(creator, creation.source.at)) return "contradiction";
    const root = await this.birth(creator);
    if (!root) return "missing";
    const born = root.entry.input;
    if (!root.native || root.named !== this.code.cohort.directory || root.sequence.kind !== "directory"
      || root.sequence.kind !== creation.sourceKind || born.type !== "genesis"
      || !isFactRef(born.source) || !same(creatorOf(born), born.source.at)) return "contradiction";
    // These are additional kind-only dependencies of the supplied policy's
    // frame view, not a walk of the Register's parent or prior partitions.
    const register = await this.birth(born.source.at);
    if (!register) return "missing";
    if (register.sequence.kind !== "register" || register.sequence.kind !== born.sourceKind) return "contradiction";
    const opening = await this.fact(creation.source);
    if (!opening) return "missing";
    if (opening.entry.input.type === "delivery") {
      const sender = await this.birth(opening.entry.input.from.at);
      if (!sender) return "missing";
      if (sender.sequence.kind !== "directory" || sender.sequence.kind !== opening.entry.input.sourceKind) return "contradiction";
    }
    if (!isObject(creation.message.body) || !isObject(creation.message.body["fields"])) return "contradiction";
    for (const [name, pin] of [["membership", this.code.cohort.membership], ["rules", this.code.cohort.rules], ["destination", this.code.cohort.destination]] as const) {
      const at = creation.message.body["fields"][name];
      if (!isScopeRef(at)) return "contradiction";
      const sibling = await this.birth(at);
      if (!sibling) return "missing";
      if (!sibling.native || sibling.named !== pin) return "contradiction";
    }
    return "partition";
  }
  async rootCreation(creation: IdentityCreation): Promise<boolean> { return await this.#rootCreation(creation) === "partition"; }
  async #partition(at: ScopeRef): Promise<Ancestry> {
    const part = await this.birth(at), born = part?.entry.input;
    if (!part) return "missing";
    // Only a complete genuine non-cohort creator can reach the unchanged
    // legacy naming policy. Missing new-cohort lineage never selects it.
    if (!part.native || part.named !== this.code.cohort.partition) return "legacy";
    if (part.sequence.kind !== "directory" || born?.type !== "genesis" || !isFactRef(born.source)
      || born.sourceKind === null || born.n === null || born.message === null) return "contradiction";
    return this.#rootCreation({ seed: born.seed, source: born.source, sourceKind: born.sourceKind, n: born.n, message: born.message });
  }
  async partition(at: ScopeRef): Promise<boolean> { return await this.#partition(at) === "partition"; }
  async receiver(at: ScopeRef): Promise<Mode | null> {
    const own = await this.birth(at), born = own?.entry.input, C = this.code.cohort;
    if (!own || born?.type !== "genesis") return null;
    if (own.native) {
      if (own.named === C.partition && !await this.partition(at)) return null;
      if (own.named === C.membership || own.named === C.rules || own.named === C.destination) {
        const creator = creatorOf(born);
        if (creator && !await this.birth(creator)) return null;
      } else if (own.named === C.inbox && creatorOf(born)) {
        const creator = creatorOf(born);
        if (!creator) return null;
        const parent = await this.birth(creator);
        if (!parent) return null;
        if (parent.native && parent.named === C.membership) {
          const entry = parent.entry.input;
          if (entry.type !== "genesis") return null;
          const creator = creatorOf(entry);
          if (!creator) return null;
          const root = await this.birth(creator);
          if (!root || root.named === C.directory && (!isFactRef(born.source) || !await this.fact(born.source))) return null;
        }
      }
    } else {
      const directory = isObject(born.message?.body) ? born.message.body["directory"] : null;
      if (isScopeRef(directory)) {
        const candidate = await this.birth(directory);
        if (!candidate || candidate.native && candidate.named === C.partition && !await this.lane(at)) return null;
      }
    }
    return this.code.receiver(at, this.frames);
  }
  async bootstrap(creation: IdentityCreation, definition: DeclaredDefinition | PlatformDefinition): Promise<Mode | null> {
    const C = this.code.cohort;
    if (typeof definition === "string") {
      if (![C.directory, C.partition, C.membership, C.rules, C.destination, C.inbox].some(pin => pin === definition)) return { mode: "legacy" };
      if (definition === C.partition ? !await this.rootCreation(creation) : !await this.fact(creation.source)) return null;
      if (definition === C.inbox && !await this.receiver(creation.source.at)) return null;
    } else {
      const directory = isObject(creation.message.body) ? creation.message.body["directory"] : null;
      if (!isScopeRef(directory)) return { mode: "legacy" };
      const candidate = await this.birth(directory);
      if (!candidate) return null;
      if (!candidate.native || candidate.named !== C.partition) return { mode: "legacy" };
      const creatorAt = creatorOf(creation);
      if (creation.seed.kind !== "lane" || !await this.fact(creation.source) || !creatorAt) return null;
      const creator = await this.birth(creatorAt);
      if (!creator || creator.sequence.kind !== creation.sourceKind
        || !(creator.sequence.kind === "lane" ? await this.lane(creatorAt, 2) : await this.partition(creatorAt))) return null;
    }
    return this.code.creation(creation, definition, this.frames);
  }
  async name(from: FactRef): Promise<{ producer: string; under: string } | null> {
    const source = await this.fact(from);
    if (!source) return null;
    if (!source.native && (source.declarationName === "issue" || source.declarationName === "change")) {
      const ancestry = await this.#lane(from.at);
      if (ancestry !== "partition" && ancestry !== "legacy") return null;
    }
    const producer = this.code.producer(from.at, this.frames);
    if (producer === null) return null;
    const under = !source.native && (producer === "declared:issue" || producer === "declared:change")
      ? this.code.source(source.named as Digest, source.declarationName, from.at, this.frames) : producer;
    return under === null ? null : { producer, under };
  }
  async publication(from: FactRef, root: ScopeRef, destination: ScopeRef, kind: "application" | "change"): Promise<boolean | null> {
    return await this.fact(from) && await this.lane(from.at) ? this.code.publication(from, root, destination, kind, this.frames) : null;
  }
}


export class IdentityEvidence {
  readonly #collection: EvidenceCollection;
  constructor(code: ReceiverIdentityCode, source: CheckedIdentitySource) { this.#collection = new EvidenceCollection(code, source); }
  receiver(at: ScopeRef) { return new EvidenceView(this.#collection).receiver(at); }
  bootstrap(creation: IdentityCreation, definition: DeclaredDefinition | PlatformDefinition) { return new EvidenceView(this.#collection).bootstrap(creation, definition); }
  name(from: FactRef) { return new EvidenceView(this.#collection).name(from); }
  publication(from: FactRef, root: ScopeRef, destination: ScopeRef, kind: "application" | "change") { return new EvidenceView(this.#collection).publication(from, root, destination, kind); }
}
