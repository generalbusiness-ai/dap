import { applicationAdmissionCohort, platform } from "@generalbusiness/dap-platform";

/** Deployment admission for fresh acts only. Immutable native creation proves
 * which installation item N owns a scope; current trust is never cached.
 * Under an upgradable Rules pin, admission also reads N's current state and
 * release from Rules, at most once per refresh interval (AD-1). */
import type { Digest, Entry, FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, deliveryCauseDigest, isDigest, type CheckedSequence, isFactRef, isMemberRef, isPlatformDefinition, isRecord, isScopeRef, isSeed, messageDigest, resolveGenesisSelf, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { same, sentBy } from "@generalbusiness/dap-derive";

import { readApplicationTrust } from "./admission.ts";
import { UPGRADABLE_RULES, type InstallationState, type InstallationStateSource } from "./installation-state.ts";
import type { ProofTimer } from "../genesis-proof.ts";
import { readNativeBirth, type NativeBirthSource } from "../native-birth.ts";
import { PreparationBudget } from "../preparation-budget.ts";
import { PreparationFlights, type PreparationRun } from "../preparation-flight.ts";
import { PROOF_BYTE_BOUNDS, proofEntry, type ProofBytes, type ProofBody, type ProofSource } from "../proof-bytes.ts";
import type { ReadPreparation } from "../read-preparation.ts";

export type FreshActAdmissionDecision = "allowed" | "application-revoked" | "application-replaced" | "unavailable";
export interface FreshActAdmission { read(): Promise<{ current(): FreshActAdmissionDecision } | null> }
export interface ApplicationActAdmissionOptions {
  preparation: ReadPreparation;
  local: ProofBytes;
  births: NativeBirthSource | null;
  proofs: ProofSource | null;
  /** AD-1: N's current state and release. Absent: an upgradable install is unavailable. */
  installations?: InstallationStateSource | null;
  trust(): unknown;
  timer?: ProofTimer;
  /** Milliseconds for the refresh interval; Date.now by default. */
  now?: () => number;
}

/** Seventeen package definitions can form a chain, followed by its Directory.
 * These are proof-work limits, not a new package quota or a heap guarantee. */
export const APPLICATION_ACT_ADMISSION_BOUNDS = Object.freeze({ ancestors: 18, bodies: 37, bytes: 16 * 1024 * 1024, rpcs: 36, body: PROOF_BYTE_BOUNDS.body });
/** AD-1: how long a read of N's current state and release answers. N changes
 * only by an `upgrade-application` act at Rules, which sends nothing to this
 * scope, so no cheaper change signal reaches admission. `replaced` is final
 * and never expires. */
export const APPLICATION_ACT_ADMISSION_REFRESH_MS = 60_000;
/** `item` names N under an upgradable Rules pin; otherwise N never changes. */
type Installed = { kind: "installed"; release: Digest; item: { rules: ScopeRef; directory: ScopeRef; item: number } | null };
type Provenance = { kind: "unpackaged" } | Installed;
type View = { state: InstallationState; at: number };
type Cache = { identity: string; provenance: Provenance; view: View | null };
type AdmissionAnswer = { current(): FreshActAdmissionDecision };
type Flight = { identity: string; promise: Promise<AdmissionAnswer | null> };
type GenesisEntry = Entry & { input: Extract<Entry["input"], { type: "genesis" }> };
/** An applied genesis admitted under its own checked sequence: proofEntry already matched its digest to the full reference. */
const birthEntry = (entry: Entry | null, sequence: CheckedSequence): entry is GenesisEntry => entry?.input.type === "genesis" && entry.input.decision === "applied"
  && entry.seq === 0 && entry.prev === null && entry.input.seed.kind === sequence.kind && scopeIdOf(entry.input.seed) === sequence.at.scope;

export class ApplicationActAdmission implements FreshActAdmission {
  readonly #options: ApplicationActAdmissionOptions;
  readonly #flights: PreparationFlights;
  #cache: Cache | null = null;
  #pending: Flight | null = null;
  constructor(options: ApplicationActAdmissionOptions) {
    this.#options = { ...options };
    this.#flights = new PreparationFlights(options.timer);
  }

  read(): Promise<AdmissionAnswer | null> {
    try {
      const identity = this.#identity();
      if (!identity) return Promise.resolve(null);
      // An already verified immutable identity needs no preparation flight.
      // Each use still checks local identity and reads current trust.
      // Under an upgradable Rules pin, a view of N older than the refresh
      // interval takes a new flight, which reads N again and nothing else.
      if (this.#cache?.identity === identity && this.#fresh(this.#cache)) return Promise.resolve(this.#answer(identity, this.#cache));
      // Provenance has no caller-specific input or standing. Concurrent
      // readers of this exact birth share its original task and deadline.
      if (this.#pending) return this.#pending.identity === identity ? this.#pending.promise : Promise.resolve(null);
      let started = false;
      let flight!: Flight;
      const promise = this.#flights.run(async run => {
        started = true;
        try { return await this.#read(run, identity); }
        finally {
          // A caller timeout resolves the answer, not this underlying task.
          // Keep the joined flight until the actual proof work settles.
          if (this.#pending === flight) this.#pending = null;
        }
      });
      flight = { identity, promise };
      this.#pending = flight;
      void promise.then(() => {
        // The deadline may expire before the work microtask starts. In that
        // case there is no underlying proof task whose settlement to await.
        if (!started && this.#pending === flight) this.#pending = null;
      });
      return promise;
    } catch { return Promise.resolve(null); }
  }

  #identity(): string | null {
    const own = this.#options.local.identity();
    return own ? canonicalize(own.genesis) : null;
  }

  #now(): number { return (this.#options.now ?? Date.now)(); }

  #fresh(cache: Cache): boolean {
    if (cache.provenance.kind === "unpackaged" || cache.provenance.item === null) return true;
    if (!cache.view) return false;
    if (cache.view.state.state === "replaced") return true;
    const age = this.#now() - cache.view.at;
    return age >= 0 && age < APPLICATION_ACT_ADMISSION_REFRESH_MS;
  }

  #answer(identity: string, cache: Cache): { current(): FreshActAdmissionDecision } {
    const { provenance, view } = cache;
    return { current: () => {
      // Head growth does not change immutable installation ownership. A
      // different scope/incarnation/genesis never borrows this result.
      // A failed identity read is missing proof, not evidence of revocation.
      try { if (this.#identity() !== identity) return "unavailable"; }
      catch { return "unavailable"; }
      if (provenance.kind === "unpackaged") return "allowed";
      // N's current release decides once Rules can change it. A replaced N
      // admits no new act, whatever the trust list holds.
      if (provenance.item !== null && !view) return "unavailable";
      if (view?.state.state === "replaced") return "application-replaced";
      const release = view ? view.state.release : provenance.release;
      try {
        const setting = this.#options.trust();
        if (setting !== undefined && typeof setting !== "string") return "application-revoked";
        return readApplicationTrust(setting).some(row => row.release === release) ? "allowed" : "application-revoked";
      } catch { return "application-revoked"; }
    } };
  }

  async #read(run: PreparationRun, expectedIdentity: string): Promise<AdmissionAnswer | null> {
    try {
      const frame = this.#options.preparation.birth(new PreparationBudget(undefined, run.active));
      if (!frame || !frame.budget.available || frame.genesis.decision !== "applied" || !run.active()) return null;
      const identity = canonicalize(frame.birth.fact);
      if (identity !== expectedIdentity || this.#identity() !== identity) return null;
      if (this.#cache?.identity !== identity) this.#cache = null;
      // Proven provenance is immutable; a refresh reads only N's view.
      const provenance: Provenance | null = this.#cache?.provenance ?? (isPlatformDefinition(frame.pinned.named) ? { kind: "unpackaged" }
        : await this.#discover(frame.birth, frame.sequence, run));
      if (!provenance || !run.active() || this.#identity() !== identity) return null;
      // No peer reply, entry body, trust row, or failed proof survives this
      // flight. Only authenticated immutable provenance is reusable.
      this.#cache = { identity, provenance, view: null };
      let view: View | null = null;
      if (provenance.kind === "installed" && provenance.item !== null) {
        const source = this.#options.installations, at = this.#now();
        const state = source ? await source.read(provenance.item.rules, provenance.item.directory, provenance.item.item) : null;
        if (!state || !run.active() || this.#identity() !== identity || this.#cache?.identity !== identity) return null;
        view = { state, at };
        this.#cache = { identity, provenance, view };
      }
      return run.active() ? this.#answer(identity, { identity, provenance, view }) : null;
    } catch { return null; }
  }

  async #discover(first: ProofBody, own: CheckedSequence, run: PreparationRun): Promise<Provenance | null> {
    const o = this.#options, b = APPLICATION_ACT_ADMISSION_BOUNDS;
    let bodies = 0, bytes = 0, rpcs = 0;
    const active = () => { if (!run.active()) throw Error("application-admission-unavailable"); };
    const capacity = () => { active(); if (bodies >= b.bodies || bytes >= b.bytes) throw Error("application-admission-unavailable"); return Math.min(b.body, b.bytes - bytes); };
    const body = (value: ProofBody, fact: FactRef, sequence: CheckedSequence, content?: Digest): Entry | null => {
      const cap = capacity();
      if (typeof value.bytes !== "string" || value.bytes.length > cap) return null;
      const count = utf8(value.bytes).length;
      if (count > cap) return null;
      bodies++; bytes += count;
      return proofEntry(value, fact, cap, sequence, content);
    };
    // A Native birth spends the same allowance through its debit, before parsing. Admission already bounded it by `cap`.
    const debit = (count: number): void => { active(); bodies++; bytes += count; };
    const rpc = () => { active(); if (++rpcs > b.rpcs) throw Error("application-admission-unavailable"); };
    const initial = body(first, first.fact, own);
    if (!birthEntry(initial, own)) return null;
    let child: GenesisEntry = initial;
    const seen = new Set([canonicalize(own.at)]);
    for (let ancestor = 0; ancestor < b.ancestors; ancestor++) {
      active();
      // A creator that creates in its own genesis names itself by the
      // genesis self reference; the birth's source fact resolves it.
      const born = child.input, named = born.seed.creator;
      const parent = named === null ? null : isFactRef(born.source) ? resolveGenesisSelf(named, born.source) : named;
      // A genuine parentless declared birth is not a package installation.
      if (named === null) return born.source === null && born.n === null && born.message === null && born.founding !== null ? { kind: "unpackaged" } : null;
      if (!isScopeRef(parent) || !isFactRef(born.source) || !same(born.source.at, parent) || born.n === null || !born.message
        || born.message.class !== "request" || born.message.type !== "create" || seen.has(canonicalize(parent))) return null;
      seen.add(canonicalize(parent));
      const uses = child.uses.filter(use => same(use.fact, born.source));
      if (uses.length !== 1 || !o.births) return null;
      const use = uses[0]!;
      const cap = capacity();
      rpc();
      const reply = await o.births.read(parent, run.remaining(), cap);
      active();
      const admitted = readNativeBirth(reply, parent, cap, debit);
      if (!admitted) return null;
      const birth = admitted.birth, creator: Entry = admitted.entry;
      if (!birthEntry(creator, admitted.sequence)) return null;
      // NativeBirth supplies the current exact pin, never a retained alias.
      if (birth.native && (!isPlatformDefinition(birth.named) || !platform(birth.named))) return null;
      let source: Entry | null = null;
      if (ancestor === 0) {
        const retained = o.local.retained(use, capacity());
        // The retained creator entry associates through the parent birth that this walk holds (ruling b7c58915).
        if (retained.kind === "body") source = body(retained.value, born.source, admitted.sequence, use.content);
      }
      if (!source) {
        if (!o.proofs) return null;
        const sourceCap = capacity();
        rpc();
        const exact = await o.proofs.read(born.source, sourceCap, run.remaining());
        active();
        if (!exact) return null;
        source = body(exact, born.source, admitted.sequence, use.content);
      }
      if (!source || source.sends.filter(send => send.n === born.n).length !== 1
        || !sentBy(source, { from: born.source, n: born.n, to: born.seed, message: born.message }, admitted.sequence)) return null;
      if (!birth.native) { child = creator; continue; }

      const made = source.input;
      const installing = made.type === "delivery" && made.message.class === "request" && made.message.type === "tell"
        && isRecord(made.message.body) && made.message.body["message"] === "application-create";
      // Authenticated older/direct creation and ordinary native factories
      // have no package release to revoke. A package-shaped request with no
      // recognized native factory is incomplete, never an exemption.
      if (!installing) return { kind: "unpackaged" };
      const cohort = applicationAdmissionCohort(birth.named);
      if (!cohort || admitted.sequence.kind !== "directory" || creator.input.seed.kind !== "directory" || made.type !== "delivery"
        || !("decision" in made) || made.decision !== "applied" || !isRecord(made.message.body)
        || !isRecord(made.message.body["fields"])) return null;
      const fields = made.message.body["fields"];
      // A reference names no kind. The Directory's send states the sibling seed's kind, and the seed's digest names the scope.
      // `creator` is the Directory's genesis, so its sends name their creator
      // by the genesis self reference; resolve it from that genesis fact.
      const origin: FactRef = { at: parent, seq: 0, hash: parent.genesis };
      const sibling = (kind: "rules" | "membership", pin: string, at: unknown) => isScopeRef(at) && creator.sends.some(send => {
        const seed = send.to;
        return isSeed(seed) && seed.kind === kind && seed.definition === pin && same(resolveGenesisSelf(seed.creator, origin), parent) && scopeIdOf(seed) === at.scope;
      });
      if (!sibling("rules", cohort.rules, made.from.at) || !isMemberRef(fields["installer"])
        || !sibling("membership", cohort.membership, fields["installer"].membership)
        || fields["definition"] !== born.seed.definition || !isDigest(fields["release"]) || !isDigest(fields["semantic"]) || !isDigest(fields["presentation"])
        || typeof fields["job"] !== "number" || !Number.isSafeInteger(fields["job"]) || fields["job"] < 0
        || born.seed.kind !== "lane" || born.seed.ordinal !== 0
        || born.seed.cause !== deliveryCauseDigest({ v: 1, from: made.from, n: made.n, message: messageDigest(made.message) })
        || !isRecord(born.message.body) || !same(born.message.body["directory"], parent)
        || !same(born.message.body["membership"], fields["installer"].membership)) return null;
      return { kind: "installed", release: fields["release"],
        item: UPGRADABLE_RULES.includes(cohort.rules) ? { rules: made.from.at, directory: parent, item: fields["job"] } : null };
    }
    return null;
  }
}
