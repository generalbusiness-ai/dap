/** Node-only registered-scope census. The signed read requests no mutation. */
import { Buffer } from "node:buffer";
import type { ScopeId } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isRecord, isScopeId, isScopeRef, LATE, parseStrictBytes, takeBytes, utf8, within, type ByteStream } from "@generalbusiness/dap-bytes";
import { signedReader, type Fetch } from "@generalbusiness/dap-client";
import type { Context, Outcome } from "./commands.ts";
import type { IndexFiles } from "./scope-index-command.ts";
import { INDEX_INVENTORY_BOUNDS, indexService, type IndexManifest, type IndexScope } from "./scope-index-manifest.ts";
import { storedSigner } from "./store-signer.ts";

export const SCOPE_INDEX_CENSUS_BOUNDS = Object.freeze({ seconds: 30, pageSize: 100,
  pages: Math.ceil(INDEX_INVENTORY_BOUNDS.scopes / 100) + 1, bytes: INDEX_INVENTORY_BOUNDS.bytes, chunks: 4096 });
export const SCOPE_INDEX_CENSUS_QUALIFICATION = "Registered scopes only. Registration during startedAt/endedAt may add IDs below an already passed cursor, which this census can miss. Unregistered legacy objects remain outside the census. No session, registration, retry or operator-key succession is requested. A local output-unavailable failure does not prove that no file was published.";
type CensusOutcome = "complete" | "empty" | "absent" | "unsupported" | "forbidden" | "root-unregistered" | "over-bound" | "page-failed";
type FailureReason = "invalid-arguments" | "configuration-unavailable" | "signer-unavailable" | "timeout" | "request-failed"
  | "invalid-reply" | "invalid-row" | "invalid-cursor" | "redirect-refused" | "byte-limit" | "chunk-limit" | "row-limit"
  | "page-limit" | "output-unavailable" | "absent" | "unsupported" | "forbidden" | "rate-limited" | "unavailable";
class CensusStopped extends Error {
  constructor(readonly outcome: Exclude<CensusOutcome, "complete">, readonly reason?: FailureReason) { super("census-stopped"); }
}
const stop = (outcome: Exclude<CensusOutcome, "complete">, reason?: FailureReason): never => { throw new CensusStopped(outcome, reason); };
const exact = (value: Record<string, unknown>, names: readonly string[]): boolean => Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const cancel = (body: ByteStream | null): void => {
  try { if (body) void body.getReader().cancel().catch(() => undefined); } catch { /* Cancellation is best effort. */ }
};
type CensusFetch = (url: string, init: Parameters<Fetch>[1] & { redirect: "error"; credentials: "omit" }) => ReturnType<Fetch>;

/** The callback under within() can collect only. Only its winning complete
 * result reaches exclusive publication, so late custody/network continuations
 * cannot save a manifest. A started local atomic save is awaited separately. */
export async function scopeIndexCensusCommand(ctx: Context, argv: readonly string[], files: IndexFiles): Promise<Outcome> {
  const startedAt = new Date().toISOString(), until = performance.now() + SCOPE_INDEX_CENSUS_BOUNDS.seconds * 1000;
  let rows = 0, pages = 0, cursor = "", live = true;
  let stage: FailureReason = "configuration-unavailable";
  const finish = (outcome: CensusOutcome, reason?: FailureReason): Outcome => ({ code: outcome === "complete" ? 0 : 1,
    lines: [JSON.stringify({ v: 1, outcome, rows, pages, startedAt, endedAt: new Date().toISOString(), written: outcome === "complete",
      ...(outcome !== "complete" && pages > 0 ? { cursor } : {}), ...(reason === undefined ? {} : { reason }) })] });
  const [verb, flag, out, ...extra] = argv;
  if (verb !== "census" || flag !== "--out" || !out || extra.length || out.includes("\0") || Buffer.byteLength(out) > 4096) return finish("page-failed", "invalid-arguments");

  let collected: { bytes: Uint8Array } | typeof LATE;
  try {
    collected = await within(SCOPE_INDEX_CENSUS_BOUNDS.seconds, async signal => {
      const check = (body: ByteStream | null = null): void => {
        if (!live || signal.aborted || performance.now() >= until) { cancel(body); stop("page-failed", "timeout"); }
      };
      check();
      const config = await ctx.store.config(); check();
      if (!config || config.v !== 1 || typeof config.service !== "string" || typeof config.key !== "string" || !config.key
        || !isScopeRef(config.register) || config.register.kind !== "register") return stop("page-failed", "configuration-unavailable");
      const service = indexService(config.service), root = config.repository?.directory;
      if (root === undefined) return stop("root-unregistered");
      if (!isScopeRef(root) || root.kind !== "directory") return stop("page-failed", "configuration-unavailable");
      // Snapshot validated configuration before any signing capability awaits.
      const register = config.register.scope, key = config.key, configuredRoot = { ...root };
      const send = (ctx.fetch ?? (globalThis as { fetch?: Fetch }).fetch) as CensusFetch | undefined;
      if (!send) return stop("page-failed", "configuration-unavailable");
      stage = "signer-unavailable";
      const signer = await storedSigner(ctx.store, key); check();
      if (!signer) return stop("page-failed", "signer-unavailable");
      const scopes: IndexScope[] = [];
      let received = 0, chunks = 0;
      for (;;) {
        check();
        if (pages >= SCOPE_INDEX_CENSUS_BOUNDS.pages) return stop("over-bound", "page-limit");
        stage = "signer-unavailable";
        const authorization = await signedReader(signer, register, "census", cursor, ctx.now ? { now: ctx.now } : {}); check();
        stage = "request-failed";
        pages++;
        const response = await send(`${service}/v1/scope-index/census?cursor=${encodeURIComponent(cursor)}&limit=${SCOPE_INDEX_CENSUS_BOUNDS.pageSize}`,
          { method: "GET", headers: { authorization }, redirect: "error", credentials: "omit", signal: signal as never });
        check(response.body);
        if (response.status >= 300 && response.status < 400 || (response as { redirected?: unknown }).redirected === true) {
          cancel(response.body); return stop("page-failed", "redirect-refused");
        }
        if (!response.body) return stop("page-failed", "invalid-reply");
        // Bound aggregate stream work as well as aggregate returned bytes.
        const body = response.body;
        const bounded: ByteStream = { getReader: () => {
          const reader = body.getReader();
          return { cancel: () => reader.cancel(), read: () => {
            check();
            if (++chunks > SCOPE_INDEX_CENSUS_BOUNDS.chunks) {
              void reader.cancel().catch(() => undefined); return stop("over-bound", "chunk-limit");
            }
            return reader.read();
          } };
        } };
        const bytes = await takeBytes(bounded, SCOPE_INDEX_CENSUS_BOUNDS.bytes - received, signal); check();
        if (bytes === LATE) return stop("page-failed", "timeout");
        if (bytes === null) return stop("over-bound", "byte-limit");
        received += bytes.length;
        let reply: unknown;
        try { reply = parseStrictBytes(bytes); } catch { return stop("page-failed", "invalid-reply"); }
        check();
        if (response.status !== 200) {
          const errors: Record<number, FailureReason> = { 403: "forbidden", 404: "absent", 501: "unsupported", 429: "rate-limited", 503: "unavailable" };
          const reason = errors[response.status];
          if (!reason || !isRecord(reply) || !exact(reply, ["error"]) || reply["error"] !== reason) return stop("page-failed", "invalid-reply");
          return stop(reason === "forbidden" || reason === "absent" || reason === "unsupported" ? reason : "page-failed", reason);
        }
        if (!isRecord(reply) || !exact(reply, ["rows", "next"]) || !Array.isArray(reply["rows"]) || reply["rows"].length > SCOPE_INDEX_CENSUS_BOUNDS.pageSize) return stop("page-failed", "invalid-reply");
        const page: IndexScope[] = []; let previous = cursor;
        for (const row of reply["rows"]) {
          if (!isRecord(row) || !exact(row, ["at", "genesis"]) || !isScopeRef(row["at"]) || !isDigest(row["genesis"]) || row["at"].scope <= previous) return stop("page-failed", "invalid-row");
          previous = row["at"].scope; page.push({ at: { ...row["at"] }, genesis: row["genesis"] });
        }
        const next = reply["next"];
        if (next !== null && (!isScopeId(next) || page.length === 0 || next !== previous || next <= cursor)) return stop("page-failed", "invalid-cursor");
        if (page.length > INDEX_INVENTORY_BOUNDS.scopes - scopes.length) return stop("over-bound", "row-limit");
        scopes.push(...page); rows = scopes.length;
        if (next === null) break;
        if (rows === INDEX_INVENTORY_BOUNDS.scopes) return stop("over-bound", "row-limit");
        cursor = next as ScopeId;
      }
      if (!scopes.length) return stop("empty");
      if (!scopes.some(row => canonicalize(row.at) === canonicalize(configuredRoot))) return stop("root-unregistered");
      const manifest: IndexManifest = { v: 1, service, root: configuredRoot, scopes };
      const bytes = utf8(`${canonicalize(manifest)}\n`);
      if (bytes.length > INDEX_INVENTORY_BOUNDS.bytes) return stop("over-bound", "byte-limit");
      check();
      return { bytes };
    });
  } catch (error) {
    return error instanceof CensusStopped ? finish(error.outcome, error.reason) : finish("page-failed", stage);
  } finally { live = false; }
  if (collected === LATE || performance.now() >= until) return finish("page-failed", "timeout");
  try { await files.save(out, collected.bytes); }
  // The existing saver can fail after its exclusive link (for example on
  // directory sync). Failure acknowledges no publication, not path absence.
  catch { return finish("page-failed", "output-unavailable"); }
  return finish("complete");
}
