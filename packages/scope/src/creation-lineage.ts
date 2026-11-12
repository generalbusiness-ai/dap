import { CREATION_LINEAGE_COHORTS, creationLineageCohort } from "@generalbusiness/dap-platform";
import { readDeployment } from "./deployment-setting.ts";
import { injectedPlatformCreationPolicy, permitsNewPlatformScope } from "./creation-versions.ts";
/** Serving admission, not a kernel judgment. Only checked applied native
 * history in this deployment may open a child object. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Digest, Entry, FactRef, PlatformDefinition, ScopeKind, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, intentDigest, isDigest, isPlatformDefinition, isFactRef, isLocalId, isSeed, isSignedIntentShape, parseStrict, scopeIdOf, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { creates, isObject, isScopeRef, same, sentBy, validateDefinition, type Delivered } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { applicationJson } from "@generalbusiness/dap-platform/application";

import { readInstalledRegisters } from "./register-setting.ts";

import type { CreationAdmission } from "./creation-admission.ts";
import { isRoomRetiredStop, type RoomRetiredStop } from "./room-retired.ts";
import { readNativeBirth, type AdmittedNativeBirth } from "./native-birth.ts";
import type { Binding, Peer } from "./namespace.ts";
import { proofEntry, type ProofBody } from "./proof-bytes.ts";

export const CREATION_LINEAGE_BOUNDS = Object.freeze({ bodies: 16, bytes: 1024 * 1024, attempts: 64, visits: 512, milliseconds: 10_000 });
/** Exact code-supported creation families, each bound to its configured
 * register and native creator proofs. This is not a deployment inventory. */
export const CREATION_COHORTS = CREATION_LINEAGE_COHORTS;

type Cohort = typeof CREATION_COHORTS[number];
type Pin = Digest | PlatformDefinition;
interface Edge { child: Seed; from: FactRef; n: number; message: Delivered["message"]; source: Entry; creator: AdmittedNativeBirth }
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
  const policy = injectedPlatformCreationPolicy(settings);
  const began = clock.now(), ends = began + CREATION_LINEAGE_BOUNDS.milliseconds;
  if (!Number.isFinite(began) || !Number.isFinite(ends)) return unavailable();
  let expired = false, bodies = 0, bytes = 0, attempts = 0, visits = 0;
  const active = () => { if (expired || !Number.isFinite(clock.now()) || clock.now() >= ends) throw Error("creation-unavailable"); };
  const visit = () => { active(); if (++visits > CREATION_LINEAGE_BOUNDS.visits) throw Error("creation-unavailable"); };
  const attempt = () => { active(); if (++attempts > CREATION_LINEAGE_BOUNDS.attempts) throw Error("creation-unavailable"); };
  const remaining = () => { active(); return Math.max(1, Math.floor(ends - clock.now())); };
  const capacity = () => { active(); if (bodies >= CREATION_LINEAGE_BOUNDS.bodies || bytes >= CREATION_LINEAGE_BOUNDS.bytes) throw Error("creation-unavailable"); return CREATION_LINEAGE_BOUNDS.bytes - bytes; };
  const admitted = (envelope: Delivered): ChildAdmission => ({ kind: "admitted", envelope, current() { try { active(); return true; } catch { return false; } } });
  // One body of `count` UTF-8 bytes spends the shared allowance. A Native birth spends it through the debit, before parsing.
  const charge = (count: number): void => {
    active();
    if (!Number.isSafeInteger(count) || count < 0 || count > CREATION_LINEAGE_BOUNDS.bytes - bytes || bodies >= CREATION_LINEAGE_BOUNDS.bodies) throw Error("creation-unavailable");
    bodies++; bytes += count;
  };
  const body = (raw: unknown): string => {
    active();
    if (typeof raw !== "string" || raw.length > CREATION_LINEAGE_BOUNDS.bytes - bytes || bodies >= CREATION_LINEAGE_BOUNDS.bodies) throw Error("creation-unavailable");
    charge(utf8(raw).length); return raw;
  };
  // A reference names no kind. The index lookup states a kind only where one is recorded or admitted: the creator
  // genesis's recorded source kind, or the kind of an already admitted birth. The first hop states none.
  const peer = async (at: ScopeRef, kind?: ScopeKind): Promise<Peer> => {
    attempt();
    if (!isScopeRef(at) || await known.has(at.scope, kind) !== true) throw Error("creation-unavailable");
    active(); // a late has never activates an ancestor
    return binding.get(binding.idFromName(at.scope)) as Peer;
  };
  const births = new Map<string, AdmittedNativeBirth>(), proofs = new Map<string, Entry>();
  const birth = async (at: ScopeRef, kind?: ScopeKind): Promise<AdmittedNativeBirth> => {
    const key = canonicalize(at), prior = births.get(key);
    if (prior) { active(); return prior; }
    const cap = capacity();
    const target = await peer(at, kind); active(); attempt();
    if (typeof target.nativeBirth !== "function") throw Error("creation-unavailable");
    const value = await target.nativeBirth(at, remaining(), cap); active();
    if (isRoomRetiredStop(value)) throw Error("creation-unavailable");
    const checked = readNativeBirth(value, at, cap, charge);
    if (!checked) { if (value === null) throw Error("creation-unavailable"); throw new InvalidCreation(); }
    if (checked.entry.input.decision !== "applied" || (kind !== undefined && checked.sequence.kind !== kind)) throw new InvalidCreation();
    births.set(key, checked); proofs.set(canonicalize(checked.birth.proof.fact), checked.entry); return checked;
  };
  // Every proof follows the birth of its scope in this attempt: that admitted birth supplies the sequence.
  const proof = async (fact: FactRef, content?: Digest): Promise<Entry> => {
    visit();
    const sequence = births.get(canonicalize(fact.at))?.sequence;
    if (!sequence) throw new InvalidCreation();
    const key = canonicalize(fact), cached = proofs.get(key);
    if (cached) {
      if (!proofEntry({ fact, bytes: canonicalize(cached) }, fact, CREATION_LINEAGE_BOUNDS.bytes, sequence, content)) throw new InvalidCreation();
      return cached;
    }
    const cap = capacity();
    const target = await peer(fact.at, sequence.kind); active(); attempt();
    if (typeof target.proofSource !== "function") throw Error("creation-unavailable");
    const reply: ProofBody | null | RoomRetiredStop = await target.proofSource(fact, cap, remaining()); active();
    if (!reply || isRoomRetiredStop(reply)) throw Error("creation-unavailable");
    body(reply.bytes);
    const entry = proofEntry(reply, fact, cap, sequence, content);
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
      const selected = owned.to as Seed;
      if (policy !== undefined && isPlatformDefinition(selected.definition) && !permitsNewPlatformScope(policy, selected.definition)) {
        attempt();
        if (await known.has(scopeIdOf(selected), selected.kind) !== true) return refused();
        active(); // lookup permission only, never proof of an existing genesis
      }
      if (settings.DEPLOYMENT !== undefined && readDeployment(settings.DEPLOYMENT) === null) return unavailable();
      const register = readInstalledRegisters(settings);
      if (register.kind === "misconfigured" || settings.DEPLOYMENT !== undefined && register.kind === "absent") return unavailable();
      if (settings.DEPLOYMENT === undefined || settings.ALLOW_OPEN_CREATION === "true") return admitted(owned);
      if (register.kind !== "pinned") return unavailable();
      const edges: Edge[] = [], seen = new Set<string>();
      let child = owned.to as Seed, from = owned.from, n = owned.n, message = owned.message, expectedContent: Digest | undefined;
      let cohort: Cohort | undefined, fromKind: ScopeKind | undefined;
      for (;;) {
        visit();
        if (!isScopeRef(child.creator) || !same(child.creator, from.at) || seen.has(canonicalize(from.at))) return refused();
        seen.add(canonicalize(from.at));
        const creator = await birth(from.at, fromKind); active();
        const source = await proof(from, expectedContent); active();
        if (!sentBy(source, { to: child, from, n, message }, creator.sequence) || source.sends.filter(send => send.n === n).length !== 1) return refused();
        const creatorEntry: Entry = creator.entry;
        if (creatorEntry.input.type !== "genesis") return refused();
        edges.push({ child, from, n, message, source, creator });
        const genesis = creatorEntry.input;
        if (genesis.seed.creator === null) {
          cohort = creationLineageCohort(creator.birth.named) ?? undefined;
          if (!cohort || !register.scopes.includes(from.at.scope) || creator.sequence.kind !== "register" || genesis.seed.kind !== "register"
            || genesis.source !== null || genesis.n !== null || genesis.message !== null || genesis.seed.ordinal !== 0
            || !genesis.founding || !isSignedIntentShape(genesis.founding) || !verifySignedIntent(genesis.founding)
            || genesis.founding.intent.kind !== "install" || genesis.founding.intent.to !== null || genesis.founding.intent.on !== null
            || intentDigest(genesis.founding.intent) !== genesis.seed.cause) return refused();
          break;
        }
        if (!isFactRef(genesis.source) || !isLocalId(genesis.n) || !genesis.message || genesis.message.class !== "request" || genesis.message.type !== "create") return refused();
        const uses = creatorEntry.uses.filter(use => same(use.fact, genesis.source));
        if (uses.length !== 1) return refused();
        child = genesis.seed; from = genesis.source; n = genesis.n; message = genesis.message; expectedContent = uses[0]!.content; fromKind = genesis.sourceKind ?? undefined;
      }
      // Walk from authenticated root toward the requested child. Native
      // identities select exact table pins; declarations must be rooted in a
      // native Directory send and its whole digest-checked retained closure.
      let parentPin: Pin = cohort.register;
      let closure: Set<Digest> | null = null;
      for (const edge of edges.reverse()) {
        visit();
        if (edge.creator.birth.named !== parentPin) return refused();
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
              const target = await peer(edge.from.at, edge.creator.sequence.kind); active(); attempt();
              if (typeof target.creationDeclaration !== "function") return unavailable();
              const text = await target.creationDeclaration(edge.from.at, next, capacity(), remaining()); active();
              if (isRoomRetiredStop(text)) throw Error("creation-unavailable");
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
          const wanted: PlatformDefinition | undefined = edge.child.kind === "commons" ? ("commons" in cohort ? cohort.commons : undefined) : cohort[edge.child.kind as keyof Cohort];
          const nativeEdge = parentPin === cohort.register ? edge.child.kind === "directory"
            : parentPin === cohort.directory ? ["membership", "rules", "destination", ...("commons" in cohort ? ["commons"] : [])].includes(edge.child.kind)
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
