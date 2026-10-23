/** One deployment-wide index. It proves reachability, never native authority. */
import type { Digest, ScopeKind, ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest, isScopeId, isScopeRef, scopeIdOf } from "@generalbusiness/artroom-bytes";
import type { Binding } from "./namespace.ts";
import type { Sql } from "./sqlite.ts";
import type { CreationAdmission } from "./creation-admission.ts";
import { admitChildCreation } from "./creation-lineage.ts";

export const SCOPE_INDEX_NAME = "applied-genesis-v1";
export interface ScopeRegistration { at: ScopeRef; genesis: Digest }
export interface ScopeIndexPort {
  has(scope: string, kind?: ScopeKind): Promise<boolean>;
  register(proof: ScopeRegistration): Promise<boolean>;
}
export interface ScopeIndexEnvironment extends CreationAdmission { SCOPE_INDEX?: Binding; SCOPE_INDEX_MODE?: string }

/** Construction and every lookup write nothing, including on an empty index. */
export class ScopeIndexRows {
  constructor(readonly sql: Pick<Sql, "exec">) {}
  #exists(): boolean { return this.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='known_scope'").toArray().length === 1; }
  has(scope: string, kind?: ScopeKind): boolean {
    if (!isScopeId(scope) || !this.#exists()) return false;
    const row = this.sql.exec("SELECT inc,genesis,kind FROM known_scope WHERE scope = ?", scope).toArray()[0];
    return !!row && isDigest(row["genesis"]) && isScopeRef({ scope, inc: row["inc"], kind: row["kind"] }) && (kind === undefined || row["kind"] === kind);
  }
  register(proof: ScopeRegistration): boolean {
    if (!proof || !isScopeRef(proof.at) || !isDigest(proof.genesis)) return false;
    this.sql.exec("CREATE TABLE IF NOT EXISTS known_scope (scope TEXT PRIMARY KEY, inc TEXT NOT NULL, kind TEXT NOT NULL, genesis TEXT NOT NULL)");
    this.sql.exec("INSERT INTO known_scope(scope,inc,kind,genesis) VALUES(?,?,?,?) ON CONFLICT(scope) DO NOTHING", proof.at.scope, proof.at.inc, proof.at.kind, proof.genesis);
    const row = this.sql.exec("SELECT inc,kind,genesis FROM known_scope WHERE scope = ?", proof.at.scope).toArray()[0];
    return row?.["genesis"] === proof.genesis && row["inc"] === proof.at.inc && row["kind"] === proof.at.kind;
  }
  list(after = "", limit = 100): ScopeRegistration[] {
    if (typeof after !== "string" || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !this.#exists()) return [];
    return this.sql.exec("SELECT scope,inc,kind,genesis FROM known_scope WHERE scope > ? ORDER BY scope LIMIT ?", after, limit).toArray()
      .map(row => ({ at: { scope: row["scope"], inc: row["inc"], kind: row["kind"] }, genesis: row["genesis"] })) as ScopeRegistration[];
  }
}

export function scopeIndex(env: ScopeIndexEnvironment): ScopeIndexPort | null {
  if (!env.SCOPE_INDEX || (env.SCOPE_INDEX_MODE !== undefined && env.SCOPE_INDEX_MODE !== "enforce" && env.SCOPE_INDEX_MODE !== "register")) return null;
  return env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME)) as ScopeIndexPort;
}

function absent(method: unknown): unknown {
  if (method === "readiness") return "absent";
  if (method === "queryItems" || method === "applicationProjection" || method === "archiveItem") return { ok: false, reason: "unavailable" };
  if (method === "create") return { answer: "refused", reason: "source-unverified" };
  if (method === "submit" || method === "prepare") return { answer: "unavailable", reason: "unavailable" };
  if (method === "deliver") return { answer: "routing", reason: "not-found" };
  if (["source", "proofSource", "nativeBirth", "creationDeclaration", "declared", "text", "observe", "sessionReference", "siteRoom", "siteDestination", "sitePublication", "sitePublishedCommit", "applicationRoom", "applicationRoomBytes", "applicationInstallation", "applicationProjectionDeclarationBytes", "demoCreationOffer", "jobState", "reservationSnapshot"].includes(method as string)) return null;
  return { ok: false, reason: "not-found" };
}

const NO_INDEX = {};
type IndexMode = "enforce" | "register" | "invalid";
// Cache transport identity only, not has()/registration/proof answers. This
// preserves consumers' binding-keyed single-flight state. Both binding keys
// are weak, and each pair has at most three policy variants.
interface Adapter { settings: ScopeIndexEnvironment; binding: Binding<string> }
const adapters = new WeakMap<Binding, WeakMap<object, Map<IndexMode, Adapter>>>();

/** Lazy RPC proxy: even namespace.get/idFromName of the TARGET waits for admission.
 * A native creation is allowed to reach its existing judge; only the target's
 * own checked genesis can subsequently register it. No supplied proof is used.
 */
export function indexedScopes(binding: Binding, env: ScopeIndexEnvironment): Binding<string> {
  const mode: IndexMode = env.SCOPE_INDEX_MODE === "register" ? "register"
    : env.SCOPE_INDEX_MODE === undefined || env.SCOPE_INDEX_MODE === "enforce" ? "enforce" : "invalid";
  let indexes = adapters.get(binding);
  if (!indexes) { indexes = new WeakMap(); adapters.set(binding, indexes); }
  const indexBinding = env.SCOPE_INDEX ?? NO_INDEX;
  let modes = indexes.get(indexBinding);
  if (!modes) { modes = new Map(); indexes.set(indexBinding, modes); }
  const prior = modes.get(mode);
  if (prior && prior.settings.DEPLOYMENT === env.DEPLOYMENT && prior.settings.ARTIFACTS_CONFIG === env.ARTIFACTS_CONFIG
    && prior.settings.ALLOW_OPEN_CREATION === env.ALLOW_OPEN_CREATION) return prior.binding;
  // Never retain a caller's mutable environment object as the selected policy.
  const settings: ScopeIndexEnvironment = {
    SCOPE_INDEX_MODE: mode,
    ...(env.SCOPE_INDEX === undefined ? {} : { SCOPE_INDEX: env.SCOPE_INDEX }),
    ...(env.DEPLOYMENT === undefined ? {} : { DEPLOYMENT: env.DEPLOYMENT }),
    ...(env.ARTIFACTS_CONFIG === undefined ? {} : { ARTIFACTS_CONFIG: env.ARTIFACTS_CONFIG }),
    ...(env.ALLOW_OPEN_CREATION === undefined ? {} : { ALLOW_OPEN_CREATION: env.ALLOW_OPEN_CREATION }),
  };
  const adapter: Binding<string> = {
    idFromName: name => name,
    get: name => new Proxy({}, { get(_target, key) {
      if (key === "then") return undefined;
      if (typeof key !== "string") return undefined;
      return async (...args: unknown[]) => {
        const method = key === "observed" ? args[0] : key;
        const missing = () => key === "observed" ? { value: absent(method), turn: false } : absent(method);
        if (!isScopeId(name)) return missing();
        let index: ScopeIndexPort | null;
        try { index = scopeIndex(settings); } catch { return missing(); }
        if (!index) return missing();
        const actualArgs = key === "observed" ? args[1] as unknown[] : args;
        const envelope = method === "deliver" ? actualArgs?.[0] as { to?: unknown; message?: { type?: unknown; class?: unknown } } : null;
        // A malformed create must not fall into register-mode legacy lookup.
        // Non-reference delivery targets are new-child addresses only; even
        // a malformed/non-create message there must validate before lookup.
        const creating = method === "create" || (method === "deliver"
          && (envelope?.message?.type === "create" || !isScopeRef(envelope?.to)));
        let creationCurrent: (() => boolean) | null = null;
        if (creating && method === "deliver") {
          // This exact wrapper is the only production creation-delivery
          // lookup. The callback-free admission checks all ancestors before
          // either raw target idFromName/get can initialize its storage.
          const admitted = await admitChildCreation(binding, settings, index, actualArgs?.[0]);
          const transient = () => key === "observed" ? { value: { answer: "retry", reason: "dependency-unavailable" }, turn: false }
            : { answer: "retry", reason: "dependency-unavailable" };
          if (admitted.kind === "unavailable") return transient();
          if (admitted.kind === "refused") return missing();
          if (!admitted.current()) return transient();
          if (scopeIdOf(admitted.envelope.to as import("@generalbusiness/dap-contract").Seed) !== name) return missing();
          actualArgs![0] = admitted.envelope;
          creationCurrent = admitted.current;
        }
        let known: boolean;
        try { known = creating ? false : await index.has(name) === true; } catch { return missing(); }
        if (!creating && !known && mode !== "register") return missing();
        if (creationCurrent && !creationCurrent()) return key === "observed"
          ? { value: { answer: "retry", reason: "dependency-unavailable" }, turn: false }
          : { answer: "retry", reason: "dependency-unavailable" };
        const target = binding.get(binding.idFromName(name)) as Record<string, (...values: unknown[]) => Promise<unknown>>;
        if (!creating && !known) {
          try { if (await target["registerKnown"]!() !== true) return missing(); }
          catch {
            // The native method may never have entered (for example, activation failed).
            // Fixed words only; logging failure cannot change the original refusal.
            try { console.info("scope-index-registration", { phase: "rpc", outcome: "rejected" }); }
            catch { /* Observation cannot change registration. */ }
            return missing();
          }
        }
        return await target[key]!(...args);
      };
    } }),
  };
  // Keep only the latest creation-policy variant in each of three mode
  // slots. No proof/index decision survives; repeated equal settings retain
  // the health transport's identity.
  modes.set(mode, { settings, binding: adapter });
  return adapter;
}
