/** Deployment admission for fresh acts only. Immutable native creation proves
 * which installed release owns a scope; current trust is never cached. */
import type { Digest, Entry, FactRef } from "@generalbusiness/dap-contract";
import { canonicalize, deliveryCauseDigest, isDigest, isFactRef, isMemberRef, isPlatformDefinition, isRecord, isScopeRef, isSeed, messageDigest, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { same, sentBy } from "@generalbusiness/dap-derive";
import { COMMONS_COHORT, ARCHIVE_APPLICATION_COHORT, ARCHIVE_CERTIFIED_RULES_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_PUBLICATION_COHORT, DECLARED_APPLICATION_COHORT, DEVICE_APPLICATION_COHORT, HARDENED_CERTIFIED_RULES_COHORT, TRUSTED_APPLICATION_COHORT, UNPUBLISHED_COHORT, platform } from "@generalbusiness/dap-platform";
import { readApplicationTrust } from "./admission.ts";
import type { ProofTimer } from "../genesis-proof.ts";
import { readNativeBirth, type NativeBirthSource } from "../native-birth.ts";
import { PreparationBudget } from "../preparation-budget.ts";
import { PreparationFlights, type PreparationRun } from "../preparation-flight.ts";
import { PROOF_BYTE_BOUNDS, proofEntry, type ProofBytes, type ProofBody, type ProofSource } from "../proof-bytes.ts";
import type { ReadPreparation } from "../read-preparation.ts";

export type FreshActAdmissionDecision = "allowed" | "application-revoked" | "unavailable";
export interface FreshActAdmission { read(): Promise<{ current(): FreshActAdmissionDecision } | null> }
export interface ApplicationActAdmissionOptions {
  preparation: ReadPreparation;
  local: ProofBytes;
  births: NativeBirthSource | null;
  proofs: ProofSource | null;
  trust(): unknown;
  timer?: ProofTimer;
}

/** Seventeen package definitions can form a chain, followed by its Directory.
 * These are proof-work limits, not a new package quota or a heap guarantee. */
export const APPLICATION_ACT_ADMISSION_BOUNDS = Object.freeze({ ancestors: 18, bodies: 37, bytes: 16 * 1024 * 1024, rpcs: 36, body: PROOF_BYTE_BOUNDS.body });
const cohorts = [COMMONS_COHORT, TRUSTED_APPLICATION_COHORT, DECLARED_APPLICATION_COHORT, DEVICE_APPLICATION_COHORT,
  ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT,
  ARCHIVE_DEVICE_PUBLICATION_COHORT, ARCHIVE_CERTIFIED_RULES_COHORT, HARDENED_CERTIFIED_RULES_COHORT, UNPUBLISHED_COHORT] as const;
type Provenance = { kind: "unpackaged" } | { kind: "installed"; release: Digest };
type Cache = { identity: string; provenance: Provenance };
type AdmissionAnswer = { current(): FreshActAdmissionDecision };
type Flight = { identity: string; promise: Promise<AdmissionAnswer | null> };
type GenesisEntry = Entry & { input: Extract<Entry["input"], { type: "genesis" }> };
const birthEntry = (entry: Entry | null): entry is GenesisEntry => entry?.input.type === "genesis" && entry.input.decision === "applied"
  && entry.seq === 0 && entry.prev === null && entry.input.inc === entry.at.inc && entry.input.seed.kind === entry.at.kind
  && scopeIdOf(entry.input.seed) === entry.at.scope;

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
      if (this.#cache?.identity === identity) return Promise.resolve(this.#answer(identity, this.#cache.provenance));
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

  #answer(identity: string, provenance: Provenance): { current(): FreshActAdmissionDecision } {
    return { current: () => {
      // Head growth does not change immutable installation ownership. A
      // different scope/incarnation/genesis never borrows this result.
      // A failed identity read is missing proof, not evidence of revocation.
      try { if (this.#identity() !== identity) return "unavailable"; }
      catch { return "unavailable"; }
      if (provenance.kind === "unpackaged") return "allowed";
      try {
        const setting = this.#options.trust();
        if (setting !== undefined && typeof setting !== "string") return "application-revoked";
        return readApplicationTrust(setting).some(row => row.release === provenance.release) ? "allowed" : "application-revoked";
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
      const provenance: Provenance | null = isPlatformDefinition(frame.pinned.named) ? { kind: "unpackaged" }
        : await this.#discover(frame.birth, run);
      if (!provenance || !run.active() || this.#identity() !== identity) return null;
      // No peer reply, entry body, trust row, or failed proof survives this
      // flight. Only authenticated immutable provenance is reusable.
      this.#cache = { identity, provenance };
      return run.active() ? this.#answer(identity, provenance) : null;
    } catch { return null; }
  }

  async #discover(first: ProofBody, run: PreparationRun): Promise<Provenance | null> {
    const o = this.#options, b = APPLICATION_ACT_ADMISSION_BOUNDS;
    let bodies = 0, bytes = 0, rpcs = 0;
    const active = () => { if (!run.active()) throw Error("application-admission-unavailable"); };
    const capacity = () => { active(); if (bodies >= b.bodies || bytes >= b.bytes) throw Error("application-admission-unavailable"); return Math.min(b.body, b.bytes - bytes); };
    const body = (value: ProofBody, fact: FactRef, content?: Digest): Entry | null => {
      const cap = capacity();
      if (typeof value.bytes !== "string" || value.bytes.length > cap) return null;
      const count = utf8(value.bytes).length;
      if (count > cap) return null;
      bodies++; bytes += count;
      return proofEntry(value, fact, cap, content);
    };
    const rpc = () => { active(); if (++rpcs > b.rpcs) throw Error("application-admission-unavailable"); };
    const initial = body(first, first.fact);
    if (!birthEntry(initial)) return null;
    let child: GenesisEntry = initial;
    const seen = new Set([canonicalize(child.at)]);
    for (let ancestor = 0; ancestor < b.ancestors; ancestor++) {
      active();
      const born = child.input, parent = born.seed.creator;
      // A genuine parentless declared birth is not a package installation.
      if (parent === null) return born.source === null && born.n === null && born.message === null && born.founding !== null ? { kind: "unpackaged" } : null;
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
      const birth = readNativeBirth(reply, parent, cap);
      if (!birth) return null;
      const creator = body(birth.proof, birth.proof.fact);
      if (!birthEntry(creator)) return null;
      // NativeBirth supplies the current exact pin, never a retained alias.
      if (birth.native && (!isPlatformDefinition(birth.named) || !platform(birth.named))) return null;
      let source: Entry | null = null;
      if (ancestor === 0) {
        const retained = o.local.retained(use, capacity());
        if (retained.kind === "body") source = body(retained.value, born.source, use.content);
      }
      if (!source) {
        if (!o.proofs) return null;
        const sourceCap = capacity();
        rpc();
        const exact = await o.proofs.read(born.source, sourceCap, run.remaining());
        active();
        if (!exact) return null;
        source = body(exact, born.source, use.content);
      }
      if (!source || source.sends.filter(send => send.n === born.n).length !== 1
        || !sentBy(source, { from: born.source, n: born.n, to: born.seed, message: born.message })) return null;
      if (!birth.native) { child = creator; continue; }

      const made = source.input;
      const installing = made.type === "delivery" && made.message.class === "request" && made.message.type === "tell"
        && isRecord(made.message.body) && made.message.body["message"] === "application-create";
      // Authenticated older/direct creation and ordinary native factories
      // have no package release to revoke. A package-shaped request with no
      // recognized native factory is incomplete, never an exemption.
      if (!installing) return { kind: "unpackaged" };
      const cohort = cohorts.find(candidate => candidate.directory === birth.named);
      if (!cohort || parent.kind !== "directory" || creator.input.seed.kind !== "directory" || made.type !== "delivery"
        || !("decision" in made) || made.decision !== "applied" || !isRecord(made.message.body)
        || !isRecord(made.message.body["fields"])) return null;
      const fields = made.message.body["fields"];
      const sibling = (kind: "rules" | "membership", pin: string, at: unknown) => isScopeRef(at) && at.kind === kind && creator.sends.some(send => {
        const seed = send.to;
        return isSeed(seed) && seed.kind === kind && seed.definition === pin && same(seed.creator, parent) && scopeIdOf(seed) === at.scope;
      });
      if (!sibling("rules", cohort.rules, made.from.at) || !isMemberRef(fields["installer"])
        || !sibling("membership", cohort.membership, fields["installer"].membership)
        || fields["definition"] !== born.seed.definition || !isDigest(fields["release"]) || !isDigest(fields["semantic"]) || !isDigest(fields["presentation"])
        || typeof fields["job"] !== "number" || !Number.isSafeInteger(fields["job"]) || fields["job"] < 0
        || born.seed.kind !== "lane" || born.seed.ordinal !== 0
        || born.seed.cause !== deliveryCauseDigest({ v: 1, from: made.from, n: made.n, message: messageDigest(made.message) })
        || !isRecord(born.message.body) || !same(born.message.body["directory"], parent)
        || !same(born.message.body["membership"], fields["installer"].membership)) return null;
      return { kind: "installed", release: fields["release"] };
    }
    return null;
  }
}
