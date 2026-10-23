/** Serving admission, not a kernel judgment. Only checked applied native
 * history in this deployment may open a child object. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Digest, Entry, FactRef, PlatformDefinition, ScopeKind, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, intentDigest, isDigest, isFactRef, isLocalId, isSeed, isSignedIntentShape, parseStrict, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { creates, isObject, isScopeRef, same, sentBy, validateDefinition, type Delivered } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { applicationJson } from "@generalbusiness/dap-bytes/application";
import { APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { artifactsRegisterScope } from "./artifacts-wiring.ts";
import type { CreationAdmission } from "./creation-admission.ts";
import { readNativeBirth, type NativeBirth } from "./native-birth.ts";
import type { Binding, Peer } from "./namespace.ts";
import { proofEntry, type ProofBody } from "./proof-bytes.ts";

export const CREATION_LINEAGE_BOUNDS = Object.freeze({ bodies: 16, bytes: 1024 * 1024, attempts: 64, visits: 512, milliseconds: 10_000 });
/** The planner's exact live cohorts. Runtime support for another pin is not
 * admission. In particular artroom-scope's unreported cohort is absent. */
export const CREATION_COHORTS = [ARCHIVE_DEVICE_APPLICATION_COHORT, APPLICATION_COHORT] as const;
type Cohort = typeof CREATION_COHORTS[number];
type Pin = Digest | PlatformDefinition;
interface Edge { child: Seed; from: FactRef; n: number; message: Delivered["message"]; source: Entry; creator: NativeBirth }
export interface CreationTimer { now(): number; after(milliseconds: number, work: () => void): () => void }
const timer: CreationTimer = { now: () => performance.now(), after(milliseconds, work) { const id = setTimeout(work, milliseconds); return () => clearTimeout(id); } };
export type ChildAdmission = { kind: "admitted"; envelope: Delivered; current(): boolean } | { kind: "unavailable" } | { kind: "refused" };
const unavailable = (): ChildAdmission => ({ kind: "unavailable" });
const refused = (): ChildAdmission => ({ kind: "refused" });
class InvalidCreation extends Error {}
interface Known { has(scope: string, kind?: ScopeKind): Promise<boolean> }

/** One owned attempt. Every ancestor is checked in the fixed index BEFORE
 * raw namespace idFromName/get, even during register-mode reconciliation.
 * There is no source(), network/archive, retained-copy or caller-anchor fallback. */
export async function admitChildCreation(binding: Binding, settings: CreationAdmission, known: Known, supplied: unknown, clock: CreationTimer = timer): Promise<ChildAdmission> {
  const began = clock.now(), ends = began + CREATION_LINEAGE_BOUNDS.milliseconds;
  if (!Number.isFinite(began) || !Number.isFinite(ends)) return unavailable();
  let expired = false, bodies = 0, bytes = 0, attempts = 0, visits = 0;
  const active = () => { if (expired || !Number.isFinite(clock.now()) || clock.now() >= ends) throw Error("creation-unavailable"); };
  const visit = () => { active(); if (++visits > CREATION_LINEAGE_BOUNDS.visits) throw Error("creation-unavailable"); };
  const attempt = () => { active(); if (++attempts > CREATION_LINEAGE_BOUNDS.attempts) throw Error("creation-unavailable"); };
  const remaining = () => { active(); return Math.max(1, Math.floor(ends - clock.now())); };
  const capacity = () => { active(); if (bodies >= CREATION_LINEAGE_BOUNDS.bodies || bytes >= CREATION_LINEAGE_BOUNDS.bytes) throw Error("creation-unavailable"); return CREATION_LINEAGE_BOUNDS.bytes - bytes; };
  const admitted = (envelope: Delivered): ChildAdmission => ({ kind: "admitted", envelope, current() { try { active(); return true; } catch { return false; } } });
  const body = (raw: unknown): string => {
    active();
    if (typeof raw !== "string" || raw.length > CREATION_LINEAGE_BOUNDS.bytes - bytes || bodies >= CREATION_LINEAGE_BOUNDS.bodies) throw Error("creation-unavailable");
    const count = utf8(raw).length;
    if (count > CREATION_LINEAGE_BOUNDS.bytes - bytes) throw Error("creation-unavailable");
    bodies++; bytes += count; return raw;
  };
  const peer = async (at: ScopeRef): Promise<Peer> => {
    attempt();
    if (!isScopeRef(at) || await known.has(at.scope, at.kind) !== true) throw Error("creation-unavailable");
    active(); // a late has never activates an ancestor
    return binding.get(binding.idFromName(at.scope)) as Peer;
  };
  const births = new Map<string, NativeBirth>(), proofs = new Map<string, Entry>();
  const birth = async (at: ScopeRef): Promise<NativeBirth> => {
    const key = canonicalize(at), prior = births.get(key);
    if (prior) { active(); return prior; }
    const cap = capacity();
    const target = await peer(at); active(); attempt();
    if (typeof target.nativeBirth !== "function") throw Error("creation-unavailable");
    const value = await target.nativeBirth(at, remaining(), cap); active();
    const checked = readNativeBirth(value, at, cap);
    if (!checked) { if (value === null) throw Error("creation-unavailable"); throw new InvalidCreation(); }
    body(checked.proof.bytes);
    const entry = proofEntry(checked.proof, checked.proof.fact, cap);
    if (!entry || entry.input.type !== "genesis" || entry.input.decision !== "applied") throw new InvalidCreation();
    births.set(key, checked); proofs.set(canonicalize(checked.proof.fact), entry); return checked;
  };
  const proof = async (fact: FactRef, content?: Digest): Promise<Entry> => {
    visit();
    const key = canonicalize(fact), cached = proofs.get(key);
    if (cached) {
      if (!proofEntry({ fact, bytes: canonicalize(cached) }, fact, CREATION_LINEAGE_BOUNDS.bytes, content)) throw new InvalidCreation();
      return cached;
    }
    const cap = capacity();
    const target = await peer(fact.at); active(); attempt();
    if (typeof target.proofSource !== "function") throw Error("creation-unavailable");
    const reply: ProofBody | null = await target.proofSource(fact, cap, remaining()); active();
    if (!reply) throw Error("creation-unavailable");
    body(reply.bytes);
    const entry = proofEntry(reply, fact, cap, content);
    if (!entry) throw new InvalidCreation();
    proofs.set(key, entry); return entry;
  };
  const run = async (): Promise<ChildAdmission> => {
    try {
      // No caller-owned mutable request survives an await. The initial body
      // counts in the same allowance as every birth, send and declaration.
      // The maintained platform codec measures finite plain JSON, escaped
      // UTF8, width/depth and descriptors BEFORE canonical serialization. Its
      // ordinary reflection enumerates own keys; this is a trusted plain-RPC
      // object boundary, not a hostile Proxy or OS-allocation guarantee.
      const raw = body(applicationJson(supplied, CREATION_LINEAGE_BOUNDS.bytes - bytes)), envelope: unknown = parseStrict(raw);
      if (!isObject(envelope) || !isSeed(envelope["to"]) || !isFactRef(envelope["from"]) || !isLocalId(envelope["n"])
        || !isObject(envelope["message"]) || envelope["message"]["class"] !== "request" || envelope["message"]["type"] !== "create") return refused();
      const owned = envelope as unknown as Delivered;
      if (settings.DEPLOYMENT === undefined || settings.ALLOW_OPEN_CREATION === "true") return admitted(owned);
      const register = artifactsRegisterScope(settings.ARTIFACTS_CONFIG);
      if (!register) return unavailable();
      const edges: Edge[] = [], seen = new Set<string>();
      let child = owned.to as Seed, from = owned.from, n = owned.n, message = owned.message, expectedContent: Digest | undefined;
      let cohort: Cohort | undefined;
      for (;;) {
        visit();
        if (!isScopeRef(child.creator) || !same(child.creator, from.at) || seen.has(canonicalize(from.at))) return refused();
        seen.add(canonicalize(from.at));
        const creator = await birth(from.at); active();
        const source = await proof(from, expectedContent); active();
        if (!sentBy(source, { to: child, from, n, message }) || source.sends.filter(send => send.n === n).length !== 1) return refused();
        const creatorEntry = proofs.get(canonicalize(creator.proof.fact))!;
        if (creatorEntry.input.type !== "genesis") return refused();
        edges.push({ child, from, n, message, source, creator });
        const genesis = creatorEntry.input;
        if (genesis.seed.creator === null) {
          cohort = CREATION_COHORTS.find(candidate => candidate.register === creator.named);
          if (!cohort || from.at.scope !== register || from.at.kind !== "register" || genesis.seed.kind !== "register"
            || genesis.source !== null || genesis.n !== null || genesis.message !== null || genesis.seed.ordinal !== 0
            || !genesis.founding || !isSignedIntentShape(genesis.founding) || !verifySignedIntent(genesis.founding)
            || genesis.founding.intent.kind !== "install" || genesis.founding.intent.to !== null || genesis.founding.intent.on !== null
            || intentDigest(genesis.founding.intent) !== genesis.seed.cause) return refused();
          break;
        }
        if (!isFactRef(genesis.source) || !isLocalId(genesis.n) || !genesis.message || genesis.message.class !== "request" || genesis.message.type !== "create") return refused();
        const uses = creatorEntry.uses.filter(use => same(use.fact, genesis.source));
        if (uses.length !== 1) return refused();
        child = genesis.seed; from = genesis.source; n = genesis.n; message = genesis.message; expectedContent = uses[0]!.content;
      }
      // Walk from authenticated root toward the requested child. Native
      // identities select exact table pins; declarations must be rooted in a
      // native Directory send and its whole digest-checked retained closure.
      let parentPin: Pin = cohort.register;
      let closure: Set<Digest> | null = null;
      for (const edge of edges.reverse()) {
        visit();
        if (edge.creator.named !== parentPin) return refused();
        const pin = edge.child.definition;
        if (isDigest(pin)) {
          if (edge.child.kind !== "lane") return refused();
          if (parentPin === cohort.directory) {
            closure = new Set<Digest>();
            const queue: Digest[] = [pin];
            for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
              visit();
              if (closure.has(next)) continue;
              capacity();
              const target = await peer(edge.from.at); active(); attempt();
              if (typeof target.creationDeclaration !== "function") return unavailable();
              const text = await target.creationDeclaration(edge.from.at, next, capacity(), remaining()); active();
              const rawDeclaration = body(text);
              const value = parseStrict(rawDeclaration);
              if (canonicalize(value) !== rawDeclaration || definitionDigest(value as never) !== next) return refused();
              const checked = validateDefinition(value, PROPOSED_BOUNDS, RULE_PROFILES);
              if (!checked.ok || checked.definition.digest !== next) return unavailable();
              closure.add(next); queue.push(...creates(checked.definition.declared));
            }
          } else if (!isDigest(parentPin)) return refused();
          if (!closure?.has(pin)) return refused();
        } else {
          const wanted: PlatformDefinition | undefined = cohort[edge.child.kind as keyof Cohort];
          const nativeEdge = parentPin === cohort.register ? edge.child.kind === "directory"
            : parentPin === cohort.directory ? ["membership", "rules", "destination"].includes(edge.child.kind)
            : parentPin === cohort.membership && edge.child.kind === "inbox";
          if (pin !== wanted || !nativeEdge) return refused();
          closure = null;
        }
        parentPin = pin;
      }
      active(); return admitted(owned);
    } catch (error) { return error instanceof InvalidCreation ? refused() : unavailable(); }
  };
  let stop!: () => void;
  const timeout = new Promise<ChildAdmission>(resolve => { stop = clock.after(CREATION_LINEAGE_BOUNDS.milliseconds, () => { expired = true; resolve(unavailable()); }); });
  try { return await Promise.race([run(), timeout]); } finally { stop(); }
}
