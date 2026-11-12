import { partitionRole, PARTITION_COHORT, PARTITION_IDENTITY_BOUNDS, partitionReceiverPolicy, partitionCreationPolicy, partitionDeclaredCreationPolicy, partitionSourceName, partitionNativeCreationPolicy, partitionProducerName, type PartitionCreationSelection, type PartitionCreation, type PartitionCreationPolicy, type PartitionNativeFrame, type PartitionReceiverPolicy } from "@generalbusiness/dap-platform";
/** Raw immutable partition birth evidence. No frame is a judged `Fetched`
 * identity: receiver policy must validate the complete chain separately. */
import type { DeclaredDefinition, Entry, FactRef, PlatformDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, isDigest, isPlatformDefinition, isFactRef, isScopeRef, resolveGenesisSelf, utf8, type CheckedSequence } from "@generalbusiness/dap-bytes";
import { isObject, same } from "@generalbusiness/dap-derive";

import type { NativeBirth, NativeBirthSource } from "./native-birth.ts";
import { readNativeBirth } from "./native-birth.ts";
import { PROOF_BYTE_BOUNDS, proofEntry, type ProofBody, type ProofSource } from "./proof-bytes.ts";
import { LATE, within } from "./turn.ts";

/** One total allowance, not an allowance per concern ancestor. A call reserves
 * its full admitted reply before I/O, even if it returns fewer bytes. Each
 * native birth also has the existing finite preparation/definition limits. */
export const PARTITION_PROOF_BOUNDS = Object.freeze({ frames: 32, calls: 32, bytes: 32 * PROOF_BYTE_BOUNDS.body, actualBytes: 16 * PROOF_BYTE_BOUNDS.body, questions: 64, pending: 1, laneDepth: PARTITION_IDENTITY_BOUNDS.laneDepth, milliseconds: 10_000 });
export type RawPartitionFrame = PartitionNativeFrame;
export interface PartitionProof {
  source: RawPartitionFrame;
  /** Nine direct origin frames, plus concern ancestors and a seal sender when needed. The separately
   * requested current source entry is not repeated here unless it is genesis. */
  frames: readonly RawPartitionFrame[];
  calls: number;
  reservedBytes: number;
  actualBytes: number;
  totalFrames: number;
  reads: number;
  pending: number;
}
export interface PartitionProofPorts {
  births: NativeBirthSource;
  proofs: ProofSource;
  /** A monotonic clock, with labelled deterministic ports in unit witnesses. */
  now?: () => number;
  wait?: <T>(work: () => Promise<T>, seconds: number) => Promise<T | typeof LATE>;
}

/** A new instance belongs to one admission/read operation. It caches only raw
 * frames for that operation, keyed by exact scope/genesis/sequence/hash. */
class Collection {
  readonly #frames = new Map<string, RawPartitionFrame>();
  readonly #positions = new Map<string, string>();
  readonly #births = new Map<string, RawPartitionFrame>();
  readonly #pendingBirths = new Map<string, Promise<RawPartitionFrame | null>>();
  readonly #pendingExact = new Map<string, Promise<RawPartitionFrame | null>>();
  readonly #now: () => number;
  readonly #wait: NonNullable<PartitionProofPorts["wait"]>;
  readonly #began: number;
  readonly #ends: number;
  #tail: Promise<void> = Promise.resolve();
  #calls = 0;
  #reads = 0;
  #actualBytes = 0;
  #pending = 0;
  #stopped = false;
  constructor(readonly ports: PartitionProofPorts) {
    this.#now = ports.now ?? (() => performance.now()); this.#wait = ports.wait ?? within;
    this.#began = this.#now(); this.#ends = this.#began + PARTITION_PROOF_BOUNDS.milliseconds;
  }
  #remaining(): number {
    const now = this.#now();
    return !this.#stopped && Number.isFinite(now) && now >= this.#began && Number.isFinite(this.#ends) ? Math.floor(this.#ends - now) : 0;
  }
  #available(): boolean {
    return this.#remaining() > 0 && this.#calls < PARTITION_PROOF_BOUNDS.calls
      && this.#pendingBirths.size + this.#pendingExact.size < PARTITION_PROOF_BOUNDS.questions;
  }
  /** Reserve work before queueing. A timeout closes this admission, but its
   * physical slot stays held through reply admission and actual settlement. */
  async #call<T, A>(work: (milliseconds: number, maxBytes: number) => Promise<T>, admit: (value: T, maxBytes: number) => A | null): Promise<A | null> {
    if (!this.#available() || (this.#calls + 1) * PROOF_BYTE_BOUNDS.body > PARTITION_PROOF_BOUNDS.bytes) return null;
    this.#calls++;
    const previous = this.#tail;
    let finish!: () => void;
    const slot = new Promise<void>(resolve => { finish = resolve; });
    this.#tail = previous.then(() => slot);
    const ready = await this.#wait(() => previous, this.#remaining() / 1000);
    if (ready === LATE || this.#remaining() <= 0) { this.#stopped = true; finish(); return null; }
    const maxBytes = Math.min(PROOF_BYTE_BOUNDS.body, PARTITION_PROOF_BOUNDS.actualBytes - this.#actualBytes);
    if (maxBytes <= 0 || this.#pending >= PARTITION_PROOF_BOUNDS.pending) { finish(); return null; }
    this.#pending++;
    const physical = (async () => {
      const milliseconds = this.#remaining();
      if (milliseconds <= 0) return null;
      this.#reads++;
      const value = await work(milliseconds, maxBytes);
      return this.active() ? admit(value, maxBytes) : null;
    })();
    physical.then(() => { this.#pending--; finish(); }, () => { this.#pending--; finish(); });
    const got = await this.#wait(() => physical, this.#remaining() / 1000);
    if (got === LATE || !this.active()) { this.#stopped = true; return null; }
    return got;
  }
  /** Charge raw UTF-8 before parse, including bad admitted replies. A valid
   * cached frame spends no new bytes. Work is never refunded. */
  #debit(fact: FactRef, bytes: number, maxBytes: number): boolean {
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > maxBytes
      || bytes > PARTITION_PROOF_BOUNDS.actualBytes - this.#actualBytes) return false;
    if (!this.#frames.has(canonicalize(fact))) this.#actualBytes += bytes;
    return true;
  }
  #charge(body: ProofBody, maxBytes: number): boolean {
    if (!body || !isFactRef(body.fact) || typeof body.bytes !== "string" || body.bytes.length > maxBytes) return false;
    return this.#debit(body.fact, utf8(body.bytes).length, maxBytes);
  }
  #keep(body: ProofBody, birth: Pick<NativeBirth, "named" | "declarationName" | "native">,
    entry: Entry, sequence: CheckedSequence): RawPartitionFrame | null {
    if (!same(body.fact.at, sequence.at)) return null;
    const key = canonicalize(body.fact), position = canonicalize([body.fact.at, body.fact.seq]);
    const previous = this.#frames.get(key);
    if (previous) return same(previous.entry, entry) && previous.named === birth.named && previous.declarationName === birth.declarationName
      && previous.native === birth.native && same(previous.sequence.at, sequence.at) ? previous : null;
    if (this.#positions.has(position) || this.#frames.size >= PARTITION_PROOF_BOUNDS.frames) return null;
    const frame = { fact: body.fact, entry, sequence, named: birth.named, declarationName: birth.declarationName, native: birth.native };
    this.#positions.set(position, key); this.#frames.set(key, frame); return frame;
  }
  async birth(at: ScopeRef): Promise<RawPartitionFrame | null> {
    if (!isScopeRef(at)) return null;
    const key = canonicalize(at), cached = this.#births.get(key);
    if (cached) return this.active() ? cached : null;
    const pending = this.#pendingBirths.get(key);
    if (pending) return pending;
    if (!this.#available()) return null;
    const work = this.#call((ms, max) => this.ports.births.read(at, ms, max), (reply, max) => {
      if (!reply) return null;
      let debited = false;
      const stopped = Symbol("partition-byte-limit");
      const fact = { at, seq: 0, hash: at.genesis };
      let admitted: ReturnType<typeof readNativeBirth>;
      try {
        admitted = readNativeBirth(reply, at, max, bytes => {
          debited = true;
          if (!this.#debit(fact, bytes, max)) throw stopped;
        });
      } catch (error) {
        if (error === stopped) return null;
        throw error;
      }
      // Native metadata may refuse before its debit callback. Preserve the
      // old charge for an admitted raw body, without a second debit.
      if (!debited) { this.#charge(reply.proof, max); return null; }
      const frame = admitted && this.#keep(admitted.birth.proof, admitted.birth, admitted.entry, admitted.sequence);
      if (frame) this.#births.set(key, frame);
      return frame;
    });
    this.#pendingBirths.set(key, work); return work;
  }
  async exact(fact: FactRef): Promise<RawPartitionFrame | null> {
    if (!isFactRef(fact)) return null;
    const key = canonicalize(fact), cached = this.#frames.get(key);
    if (cached) return this.active() ? cached : null;
    const pending = this.#pendingExact.get(key);
    if (pending) return pending;
    if (!this.#available()) return null;
    const work = (async () => {
      const birth = await this.birth(fact.at);
      if (!birth) return null;
      if (fact.seq === 0) return same(fact, birth.fact) ? birth : null;
      return this.#call((ms, max) => this.ports.proofs.read(fact, max, ms), (body, max) => {
        if (!body || !same(body.fact, fact) || !this.#charge(body, max)) return null;
        const entry = proofEntry(body, fact, max, birth.sequence);
        return entry ? this.#keep(body, birth, entry, birth.sequence) : null;
      });
    })();
    this.#pendingExact.set(key, work); return work;
  }
  frames(needed?: ReadonlySet<string>): readonly RawPartitionFrame[] { return [...this.#frames].filter(([key]) => needed === undefined || needed.has(key)).map(([, frame]) => frame); }
  active(): boolean { return this.#remaining() > 0; }
  stats() { return { calls: this.#calls, reads: this.#reads, reservedBytes: this.#calls * PROOF_BYTE_BOUNDS.body, actualBytes: this.#actualBytes, totalFrames: this.#frames.size, pending: this.#pending }; }
}

/** A minimal dependency view spends the shared collection's allowance. It
 * never gains a fresh allowance or carries unrelated earlier source frames. */
class View {
  readonly #needed = new Set<string>();
  constructor(readonly collection: Collection) {}
  async birth(at: ScopeRef): Promise<RawPartitionFrame | null> {
    const frame = await this.collection.birth(at);
    if (frame) this.#needed.add(canonicalize(frame.fact));
    return frame;
  }
  async exact(fact: FactRef): Promise<RawPartitionFrame | null> {
    if (!await this.birth(fact.at)) return null;
    const frame = await this.collection.exact(fact);
    if (frame) this.#needed.add(canonicalize(frame.fact));
    return frame;
  }
  async lane(at: ScopeRef, depth = 1, seen = new Set<string>()): Promise<boolean> {
    const key = canonicalize(at);
    if (depth > PARTITION_PROOF_BOUNDS.laneDepth || seen.has(key)) return false;
    seen.add(key);
    const child = await this.birth(at), entry = child?.entry;
    if (!child || child.sequence.kind !== "lane" || !entry || entry.input.type !== "genesis" || !isFactRef(entry.input.source) || !entry.input.seed.creator
      || !same(entry.input.source.at, resolveGenesisSelf(entry.input.seed.creator, entry.input.source))) return false;
    const source = await this.exact(entry.input.source);
    if (!source) return false;
    const creator = entry.input.source.at;
    if (source.sequence.kind === "lane") return this.lane(creator, depth + 1, seen);
    return this.partition(creator);
  }
  async partition(at: ScopeRef): Promise<boolean> {
    const part = await this.birth(at), born = part?.entry;
    if (!part?.native || part.sequence.kind !== "directory" || partitionRole(part.named) !== "partition" || !born || born.input.type !== "genesis"
      || !isFactRef(born.input.source) || !born.input.seed.creator || !same(born.input.source.at, resolveGenesisSelf(born.input.seed.creator, born.input.source))
      || born.input.n === null || !born.input.message || !isObject(born.input.message.body) || !isObject(born.input.message.body["fields"])) return false;
    return this.rootCreation({ seed: born.input.seed, source: born.input.source, n: born.input.n, message: born.input.message });
  }
  async rootCreation(creation: PartitionCreation): Promise<boolean> {
    if (!creation.seed.creator || !isFactRef(creation.source) || !same(resolveGenesisSelf(creation.seed.creator, creation.source), creation.source.at)
      || !isObject(creation.message.body) || !isObject(creation.message.body["fields"])) return false;
    const root = await this.birth(creation.source.at);
    if (!root?.native || root.sequence.kind !== "directory" || partitionRole(root.named) !== "directory" || root.entry.input.type !== "genesis"
      || !isFactRef(root.entry.input.source) || !root.entry.input.seed.creator
      || !same(resolveGenesisSelf(root.entry.input.seed.creator, root.entry.input.source), root.entry.input.source.at)) return false;
    const register = await this.birth(root.entry.input.source.at);
    if (!register || register.sequence.kind !== "register") return false;
    const opening = await this.exact(creation.source);
    if (!opening) return false;
    if (opening.entry.input.type === "delivery") {
      const sender = await this.birth(opening.entry.input.from.at);
      if (!sender || sender.sequence.kind !== "directory") return false;
    }
    const fields = creation.message.body["fields"];
    for (const [name, pin] of [["membership", PARTITION_COHORT.membership], ["rules", PARTITION_COHORT.rules], ["destination", PARTITION_COHORT.destination]] as const) {
      const ref = fields[name]; if (!isScopeRef(ref)) return false;
      const sibling = await this.birth(ref); if (!sibling?.native || sibling.named !== pin) return false;
    }
    return true;
  }
  async receiver(at: ScopeRef): Promise<RawPartitionFrame | null> {
    const birth = await this.birth(at), own = birth;
    if (!birth || !own || own.entry.input.type !== "genesis") return null;
    const born = own.entry.input;
    if (birth.native) {
      if (partitionRole(birth.named) === "partition") return await this.partition(at) ? own : null;
      if (partitionRole(birth.named) === "membership" || partitionRole(birth.named) === "rules" || partitionRole(birth.named) === "destination") {
        if (born.source && !await this.birth(born.source.at)) return null;
      } else if (partitionRole(birth.named) === "inbox" && born.source && born.seed.creator) {
        const parent = await this.birth(born.source.at);
        if (!parent) return null;
        if (partitionRole(parent.named) === "membership" && parent.native) {
          const entry = parent.entry;
          if (!entry || entry.input.type !== "genesis" || !entry.input.seed.creator || !entry.input.source) return null;
          const root = await this.birth(entry.input.source.at);
          if (!root || partitionRole(root.named) === "directory" && (!isFactRef(born.source) || !await this.exact(born.source))) return null;
        }
      }
      return own;
    }
    const directory = isObject(born.message?.body) ? born.message.body["directory"] : null;
    if (!isScopeRef(directory)) return own;
    const candidate = await this.birth(directory);
    if (!candidate) return null;
    // A locator can cheaply establish that no upgrade is requested. A
    // positive partition pin still needs the entire actual creator chain.
    return candidate.native && partitionRole(candidate.named) === "partition" && !await this.lane(at) ? null : own;
  }
  finish(source: RawPartitionFrame, includeSource = false): PartitionProof | null {
    const frames = this.collection.frames(this.#needed).filter(frame => includeSource || source.fact.seq === 0 || !same(frame.fact, source.fact));
    return this.collection.active() && frames.length <= PARTITION_IDENTITY_BOUNDS.facts ? { source, frames, ...this.collection.stats() } : null;
  }
}

/** One operation owns receiver selection and every subsequent raw proof
 * read under one call/frame/byte/deadline allowance. It caches no identities.
 * Concurrent requests for the same raw birth or fact share the actual RPC. */
export class PartitionProofOperation {
  readonly #collection: Collection;
  constructor(ports: PartitionProofPorts) { this.#collection = new Collection(ports); }
  stats() { return this.#collection.stats(); }
  active(): boolean { return this.#collection.active(); }
  async lane(from: FactRef): Promise<PartitionProof | null> {
    if (!isFactRef(from)) return null;
    try {
      const view = new View(this.#collection);
      const source = await view.exact(from);
      return source && source.sequence.kind === "lane" && await view.lane(from.at) ? view.finish(source) : null;
    } catch { return null; }
  }
  async raw(from: FactRef): Promise<RawPartitionFrame | null> {
    try { return await this.#collection.exact(from); } catch { return null; }
  }
  /** This selects a bounded read strategy, never an identity policy. The
   * actual parent send and own declaration still have to prove bootstrap. */
  async creationCandidate(creation: PartitionCreation): Promise<boolean | null> {
    try {
      const named = creation.seed.definition;
      if (["directory", "partition", "destination"].includes(partitionRole(named) ?? "")) return true;
      if (partitionRole(named) === "membership" || partitionRole(named) === "rules") {
        const source = await this.#collection.birth(creation.source.at);
        return source && this.#collection.active() ? source.native && partitionRole(source.named) === "directory" : null;
      }
      if (partitionRole(named) === "inbox") {
        const selected = await this.receiver(creation.source.at);
        return selected ? selected.policy.mode === "partition-v1" : null;
      }
      if (isPlatformDefinition(named)) return false;
      const directory = isObject(creation.message.body) ? creation.message.body["directory"] : null;
      if (!isScopeRef(directory)) return false;
      const source = await this.#collection.birth(directory);
      return source && this.#collection.active() ? source.native && partitionRole(source.named) === "partition" : null;
    } catch { return null; }
  }
  /** Both labels come from the same authenticated raw operation. This never
   * calls the producer's legacy recursive Source convenience endpoint. */
  async source(from: FactRef): Promise<{ source: RawPartitionFrame; under: string; producer: string; proof: PartitionProof } | null> {
    if (!isFactRef(from)) return null;
    try {
      const view = new View(this.#collection);
      const source = await view.exact(from);
      if (!source) return null;
      if (!source.native && (source.declarationName === "issue" || source.declarationName === "change")) await view.lane(from.at);
      const proof = view.finish(source, true);
      if (!proof) return null;
      const producer = partitionProducerName(from.at, proof.frames);
      if (producer === null) return null;
      const under = !source.native && isDigest(source.named) && (producer === "declared:issue" || producer === "declared:change")
        ? partitionSourceName(source.named, source.declarationName, from.at, proof.frames) : producer;
      return under !== null && this.#collection.active() ? { source, under, producer, proof } : null;
    } catch { return null; }
  }
  async receiver(at: ScopeRef): Promise<{ policy: PartitionReceiverPolicy; proof: PartitionProof } | null> {
    if (!isScopeRef(at)) return null;
    try {
      const view = new View(this.#collection);
      const own = await view.receiver(at), proof = own && view.finish(own);
      const policy = proof && partitionReceiverPolicy(at, proof.frames);
      return policy && proof && this.#collection.active() ? { policy, proof } : null;
    } catch { return null; }
  }
  async creation(creation: PartitionCreation): Promise<{ policy: PartitionCreationPolicy; proof: PartitionProof } | null> {
    try {
      const view = new View(this.#collection);
      if (!await view.rootCreation(creation)) return null;
      const source = await view.exact(creation.source), proof = source && view.finish(source, true);
      const policy = proof && partitionCreationPolicy(creation, proof.frames);
      return policy && proof && this.#collection.active() ? { policy, proof } : null;
    } catch { return null; }
  }
  async bootstrap(creation: PartitionCreation, definition: DeclaredDefinition | PlatformDefinition): Promise<{ policy: PartitionCreationSelection; proof: PartitionProof | null } | null> {
    try {
      const view = new View(this.#collection);
      if (typeof definition === "string") {
        if (!isPlatformDefinition(definition) || definition !== creation.seed.definition) return null;
        if (partitionRole(definition) === "partition") return this.creation(creation);
        const source = await view.exact(creation.source);
        if (!source) return null;
        if (partitionRole(definition) === "inbox" && !await view.receiver(creation.source.at)) return null;
        const proof = view.finish(source, true), policy = proof && partitionNativeCreationPolicy(creation, proof.frames);
        return policy && proof && this.#collection.active() ? { policy, proof } : null;
      }
      if (definitionDigest(definition) !== creation.seed.definition) return null;
      const directory = isObject(creation.message.body) ? creation.message.body["directory"] : null;
      if (!isScopeRef(directory)) return { policy: { mode: "legacy" }, proof: null };
      const candidate = await view.birth(directory);
      if (!candidate) return null;
      if (!candidate.native || partitionRole(candidate.named) !== "partition") return { policy: { mode: "legacy" }, proof: null };
      return this.declaredCreation(creation, definition);
    } catch { return null; }
  }
  async declaredCreation(creation: PartitionCreation, definition: DeclaredDefinition): Promise<{ policy: PartitionCreationPolicy; proof: PartitionProof } | null> {
    try {
      const view = new View(this.#collection);
      if (!isDigest(creation.seed.definition) || definitionDigest(definition) !== creation.seed.definition
        || !creation.seed.creator || !isFactRef(creation.source) || !same(resolveGenesisSelf(creation.seed.creator, creation.source), creation.source.at)) return null;
      const source = await view.exact(creation.source);
      // Depth starts at two: the unborn concern is already the first lane.
      if (!source || !(source.sequence.kind === "lane" ? await view.lane(creation.source.at, 2) : await view.partition(creation.source.at))) return null;
      const proof = view.finish(source, true), policy = proof && partitionDeclaredCreationPolicy(creation, definition, proof.frames);
      return policy && proof && this.#collection.active() ? { policy, proof } : null;
    } catch { return null; }
  }
}

/** Standalone conveniences each own one operation. An admission with several
 * reads must reuse PartitionProofOperation rather than these wrappers. */
export const partitionProof = (ports: PartitionProofPorts, from: FactRef): Promise<PartitionProof | null> => new PartitionProofOperation(ports).lane(from);
export const receiverPolicyProof = (ports: PartitionProofPorts, at: ScopeRef): Promise<{ policy: PartitionReceiverPolicy; proof: PartitionProof } | null> => new PartitionProofOperation(ports).receiver(at);
export const partitionCreationProof = (ports: PartitionProofPorts, creation: PartitionCreation): Promise<{ policy: PartitionCreationPolicy; proof: PartitionProof } | null> => new PartitionProofOperation(ports).creation(creation);
export const partitionDeclaredCreationProof = (ports: PartitionProofPorts, creation: PartitionCreation, definition: DeclaredDefinition): Promise<{ policy: PartitionCreationPolicy; proof: PartitionProof } | null> => new PartitionProofOperation(ports).declaredCreation(creation, definition);
