/** Worker-wide registered identities, never native authority or an atomic cut. */
import type { FactRef, ScopeId, SignedRead } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { same, intentDigest, isDigest, isPlatformDefinition, isScopeId, isScopeRef, scopeIdOf, verifySignedIntent, within, LATE } from "@generalbusiness/dap-bytes";
import { platform } from "@generalbusiness/dap-platform";
import { artifactsRegisterScope } from "./artifacts-wiring.ts";
import { proofEntry, PROOF_BYTE_BOUNDS, EXACT_PROOF_RECEIVER_BOUNDS, type ProofBody } from "./proof-bytes.ts";
import { scopedSignedRead } from "./signed-reads.ts";
import { ScopeIndexRows, SCOPE_INDEX_NAME, type ScopeIndexEnvironment, type ScopeRegistration } from "./scope-index.ts";
import type { Sql } from "./sqlite.ts";
import type { ServingDecision } from "./serving-admission.ts";

export type ScopeCensusRefusal = "forbidden" | "absent" | "unsupported" | "rate-limited" | "unavailable";
export type ScopeCensusResult = { readonly ok: true; readonly rows: readonly ScopeRegistration[]; readonly next: ScopeId | null }
  | { readonly ok: false; readonly reason: ScopeCensusRefusal };
const refused = (reason: ScopeCensusRefusal): ScopeCensusResult => ({ ok: false, reason });
const cursor = (value: unknown): value is string => value === "" || isScopeId(value);
const limitOf = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 100;

/** Shape, signature, target, exact cursor and current request expiry only.
 * This does not use a causal root or grant ordinary scope-read authority. */
function requestOf(reader: unknown, pinned: ScopeId | null, after: unknown, limit: unknown, now: number): SignedRead | null {
  if (pinned === null || !cursor(after) || !limitOf(limit) || !Number.isFinite(now)) return null;
  const signed = scopedSignedRead(reader, pinned, "census", after);
  if (!signed) return null;
  const ends = Date.parse(signed.request.notAfter);
  return Number.isFinite(ends) && ends > now && ends - now <= PROPOSED_BOUNDS.intentLifetimeSeconds * 1000 ? signed : null;
}

interface CensusPorts {
  readonly sql: Pick<Sql, "exec">;
  readonly register: () => ScopeId | null;
  readonly mode: () => unknown;
  readonly proof: (fact: FactRef, maxBytes: number, milliseconds: number) => Promise<ProofBody | null>;
  readonly rate: (reader: unknown) => ServingDecision;
  readonly now: () => number;
}

/** Trusted fixed-index owner only. None of these dependencies is request data.
 * The full registration lookup stays private; only an authenticated page exits. */
export class ScopeIndexCensus {
  readonly #rows: ScopeIndexRows;
  constructor(readonly ports: CensusPorts) { this.#rows = new ScopeIndexRows(ports.sql); }
  #registration(scope: ScopeId): ScopeRegistration | null {
    const exists = this.ports.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='known_scope'").toArray();
    if (exists.length !== 1) return null;
    const rows = this.ports.sql.exec("SELECT inc,kind,genesis FROM known_scope WHERE scope=? LIMIT 2", scope).toArray();
    if (rows.length !== 1) return null;
    const at = { scope, inc: rows[0]?.["inc"], kind: rows[0]?.["kind"] }, genesis = rows[0]?.["genesis"];
    return isScopeRef(at) && at.kind === "register" && isDigest(genesis) ? { at: { ...at }, genesis } : null;
  }
  async list(after: string, limit: number, reader: unknown): Promise<ScopeCensusResult> {
    let pinned: ScopeId | null, signed: SignedRead | null, registration: ScopeRegistration | null, began: number;
    try {
      began = this.ports.now(); pinned = this.ports.register();
      signed = requestOf(reader, pinned, after, limit, began);
      if (!signed || pinned === null) return refused("forbidden");
      registration = this.#registration(pinned);
      if (!registration) return refused("forbidden");
      const fact = { at: { ...registration.at }, seq: 0, hash: registration.genesis };
      const milliseconds = Math.min(EXACT_PROOF_RECEIVER_BOUNDS.milliseconds, Date.parse(signed.request.notAfter) - began);
      // Exact proofSource bypasses nativeBirth's archive recovery. Both the
      // receiver's existing byte/time/SQL fence and this caller's wait apply.
      const got = await within(milliseconds / 1000, () => this.ports.proof(fact, PROOF_BYTE_BOUNDS.body, Math.floor(milliseconds)));
      const now = this.ports.now();
      if (got === LATE || now < began || now >= began + milliseconds || !requestOf(reader, pinned, after, limit, now)
        || this.ports.register() !== pinned || !same(this.#registration(pinned), registration)) return refused("forbidden");
      const entry = got && proofEntry(got, fact, PROOF_BYTE_BOUNDS.body);
      if (!entry || entry.seq !== 0 || entry.prev !== null || entry.input.type !== "genesis" || entry.input.decision !== "applied") return refused("forbidden");
      const input = entry.input, seed = input.seed, named = seed.definition, founding = input.founding;
      if (!isPlatformDefinition(named) || !named.startsWith("platform:register@") || platform(named) === null
        || seed.kind !== "register" || seed.creator !== null || scopeIdOf(seed) !== pinned || input.inc !== registration.at.inc
        || input.kind !== "install" || !founding || founding.intent.kind !== "install" || founding.intent.to !== null
        || !verifySignedIntent(founding) || intentDigest(founding.intent) !== seed.cause || founding.intent.actor !== signed.request.actor) return refused("forbidden");
    } catch { return refused("forbidden"); }
    const mode = this.ports.mode();
    if (mode === "register") return refused("unsupported");
    if (mode !== undefined && mode !== "enforce") return refused("unavailable");
    try {
      const decision = this.ports.rate(reader);
      if (decision !== "admitted") return refused(decision === "invalid" ? "forbidden" : decision);
      if (!requestOf(reader, pinned, after, limit, this.ports.now())) return refused("forbidden");
      const rows = this.#rows.list(after, limit);
      if (rows.length > limit) return refused("unavailable");
      let previous = after;
      for (const row of rows) {
        if (!isScopeRef(row.at) || !isDigest(row.genesis) || row.at.scope <= previous) return refused("unavailable");
        previous = row.at.scope;
      }
      const last = rows.at(-1)?.at.scope;
      const more = last !== undefined && this.ports.sql.exec("SELECT 1 AS more FROM known_scope WHERE scope > ? LIMIT 1", last).toArray().length !== 0;
      return { ok: true, rows: rows.map(row => ({ at: { ...row.at }, genesis: row.genesis })), next: more ? last! : null };
    } catch { return refused("unavailable"); }
  }
}

const statuses: Record<ScopeCensusRefusal, number> = { forbidden: 403, absent: 404, unsupported: 501, "rate-limited": 429, unavailable: 503 };
const response = (result: ScopeCensusResult): Response => new Response(JSON.stringify(result.ok ? { rows: result.rows, next: result.next } : { error: result.reason }),
  { status: result.ok ? 200 : statuses[result.reason], headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** Exact Worker route; does not address any caller-selected scope object. */
export async function scopeIndexCensusRoute(request: Request, env: ScopeIndexEnvironment): Promise<Response> {
  try {
    const url = new URL(request.url), keys = [...url.searchParams.keys()];
    if (url.pathname !== "/v1/scope-index/census" || request.method !== "GET" || url.hash || keys.some(key => key !== "cursor" && key !== "limit")
      || new Set(keys).size !== keys.length) return response(refused("forbidden"));
    const after = url.searchParams.get("cursor") ?? "", rawLimit = url.searchParams.get("limit") ?? "100";
    if (!/^(?:[1-9][0-9]?|100)$/.test(rawLimit)) return response(refused("forbidden"));
    const limit = Number(rawLimit), reader = request.headers.get("authorization"), pinned = artifactsRegisterScope(env.ARTIFACTS_CONFIG);
    if (!requestOf(reader, pinned, after, limit, Date.now())) return response(refused("forbidden"));
    if (!env.SCOPE_INDEX) return response(refused("absent"));
    const owner = env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME)) as { list(after: string, limit: number, reader: unknown): Promise<ScopeCensusResult> };
    const result = await owner.list(after, limit, reader);
    if (!result || typeof result !== "object" || typeof result.ok !== "boolean") return response(refused("unavailable"));
    if (!result.ok) return response(Object.hasOwn(statuses, result.reason) ? refused(result.reason) : refused("unavailable"));
    // A malformed/older owner is unavailable, never an empty index.
    if (!Array.isArray(result.rows) || result.rows.length > limit || !(result.next === null || isScopeId(result.next))) return response(refused("unavailable"));
    let previous = after;
    for (const row of result.rows) {
      if (!row || Object.keys(row).sort().join() !== "at,genesis" || !isScopeRef(row.at)
        || Object.keys(row.at).sort().join() !== "inc,kind,scope" || !isDigest(row.genesis) || row.at.scope <= previous) return response(refused("unavailable"));
      previous = row.at.scope;
    }
    if (result.next !== null && (result.rows.length === 0 || result.next !== previous)) return response(refused("unavailable"));
    return response({ ok: true, rows: result.rows.map(row => ({ at: { ...row.at }, genesis: row.genesis })), next: result.next });
  } catch { return response(refused("unavailable")); }
}
