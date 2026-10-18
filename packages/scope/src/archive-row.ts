/** Internal archive bookkeeping, never an entry or an export certificate.
 * The planner must validate/admit a manifest before marking it; this store
 * only preserves its exact bytes and compares outstanding identities. */
import type { Head, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isRecord, isScopeRef, parseStrict, timeMs, utf8 } from "@generalbusiness/artroom-bytes";
import type { DestinationRepository } from "./destination-host.ts";
import { ArchiveBudget } from "./archive-budget.ts";
import type { Sql } from "./sqlite.ts";

const KEY = "archive-row-1";
const MANIFEST_BYTES = 1024 * 1024;
// A canonical manifest's quotes and escapes can double when embedded in JSON.
export const ARCHIVE_ROW_BYTES = 2 * MANIFEST_BYTES + 16 * 1024;
type Format = "sha1" | "sha256";
export interface ArchivedPosition { readonly commit: string; readonly through: Head }
export interface ArchiveMark extends ArchivedPosition {
  readonly parent: string | null;
  /** Immutable selection metadata only; no input or entry bodies. */
  readonly manifest: string;
  readonly markedAt: Timestamp;
}
export interface ArchiveRow {
  readonly v: 1;
  readonly at: ScopeRef;
  readonly repository: DestinationRepository;
  readonly format: Format;
  readonly confirmed: ArchivedPosition | null;
  readonly pending: ArchiveMark | null;
}
export class ArchiveRowRefusal extends Error {
  readonly reason: "unavailable" | "limit" | "conflict" | "outstanding";
  constructor(reason: ArchiveRowRefusal["reason"]) { super(`archive-row-${reason}`); this.reason = reason; }
}
const refuse = (reason: ArchiveRowRefusal["reason"]): never => { throw new ArchiveRowRefusal(reason); };
const natural = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
const fields = (value: Record<string, unknown>, expected: string): boolean => Object.keys(value).sort().join(",") === expected;
const objectId = (value: unknown, format: Format): value is string => typeof value === "string" && (format === "sha1" ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/).test(value);
const same = (left: unknown, right: unknown): boolean => canonicalize(left) === canonicalize(right);
function position(value: unknown, format: Format): value is ArchivedPosition {
  if (!isRecord(value) || !fields(value, "commit,through") || !objectId(value["commit"], format)) return false;
  const head = value["through"];
  return isRecord(head) && fields(head, "hash,seq") && natural(head["seq"]) && isDigest(head["hash"]);
}
function checked(value: unknown, at: ScopeRef, budget: ArchiveBudget): ArchiveRow {
  budget.check();
  if (!isRecord(value) || !fields(value, "at,confirmed,format,pending,repository,v") || value["v"] !== 1 || !isScopeRef(value["at"]) || !same(value["at"], at)) return refuse("unavailable");
  const format = value["format"], repository = value["repository"];
  if (format !== "sha1" && format !== "sha256" || !isRecord(repository) || !fields(repository, "host,id,name,namespace")) return refuse("unavailable");
  if (Object.values(repository).some(field => typeof field !== "string" || field.length === 0 || field.length > 1024)) return refuse("unavailable");
  const confirmed = value["confirmed"], pending = value["pending"];
  if (confirmed !== null && !position(confirmed, format)) return refuse("unavailable");
  if (pending !== null) {
    if (!isRecord(pending) || !fields(pending, "commit,manifest,markedAt,parent,through") || !position({ commit: pending["commit"], through: pending["through"] }, format) || pending["parent"] !== null && !objectId(pending["parent"], format) || typeof pending["manifest"] !== "string" || pending["manifest"].length === 0 || pending["manifest"].length > MANIFEST_BYTES || typeof pending["markedAt"] !== "string" || timeMs(pending["markedAt"]) === null) return refuse("unavailable");
    budget.spend({ inputWork: pending["manifest"].length * 8 });
    if (utf8(pending["manifest"]).length > MANIFEST_BYTES) return refuse("limit");
    if (pending["parent"] !== (confirmed === null ? null : confirmed.commit)) return refuse("unavailable");
    const through = pending["through"] as Head;
    if (confirmed !== null && through.seq <= confirmed.through.seq) return refuse("unavailable");
  }
  return value as unknown as ArchiveRow;
}

/** One row in the scope's existing native metadata table. All methods are
 * synchronous transactions; no host, retention enumeration or history write. */
export class ArchiveRows {
  readonly #sql: Sql;
  readonly #at: ScopeRef;
  constructor(sql: Sql, at: ScopeRef) {
    if (!isScopeRef(at)) refuse("unavailable");
    this.#sql = sql; this.#at = { ...at };
  }
  #load(budget: ArchiveBudget): { row: ArchiveRow; bytes: string } | null {
    const sql = budget.native(this.#sql, () => ({ metadata: 96, inputWork: 0 }));
    const sizes = sql.exec("SELECT octet_length(v) AS size, typeof(v) AS type FROM meta WHERE k = ? LIMIT 1", KEY).toArray();
    if (!sizes.length) return null;
    const size = sizes[0]?.["size"];
    if (sizes.length !== 1 || sizes[0]?.["type"] !== "text" || !natural(size) || size === 0) return refuse("unavailable");
    if (size > ARCHIVE_ROW_BYTES) return refuse("limit");
    budget.spend({ inputWork: size * 12 });
    const bodies = budget.native(this.#sql, () => ({ metadata: size, inputWork: 0 })).exec("SELECT v FROM meta WHERE k = ? AND typeof(v) = 'text' AND octet_length(v) = ? LIMIT 1", KEY, size).toArray();
    const bytes = bodies[0]?.["v"];
    if (bodies.length !== 1 || typeof bytes !== "string" || bytes.length > size || utf8(bytes).length !== size) return refuse("unavailable");
    let value: unknown;
    try { value = parseStrict(bytes); if (canonicalize(value) !== bytes) return refuse("unavailable"); }
    catch { return refuse("unavailable"); }
    return { row: checked(value, this.#at, budget), bytes };
  }
  #save(value: ArchiveRow, budget: ArchiveBudget): ArchiveRow {
    checked(value, this.#at, budget);
    budget.spend({ inputWork: ARCHIVE_ROW_BYTES * 3, calls: 1 });
    const bytes = canonicalize(value);
    if (bytes.length > ARCHIVE_ROW_BYTES || utf8(bytes).length > ARCHIVE_ROW_BYTES) return refuse("limit");
    budget.check();
    this.#sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", KEY, bytes).toArray();
    budget.check();
    // Expose an owned snapshot, not the caller's mutable mark or head.
    return parseStrict(bytes) as ArchiveRow;
  }
  load(budget = new ArchiveBudget()): ArchiveRow | null { return this.#sql.transaction(() => this.#load(budget)?.row ?? null); }
  target(repository: DestinationRepository, format: Format, budget = new ArchiveBudget()): ArchiveRow {
    return this.#sql.transaction(() => {
      const previous = this.#load(budget)?.row;
      if (previous) {
        checked({ ...previous, repository, format }, this.#at, budget);
        budget.spend({ inputWork: 16 * 4096 });
        if (previous.format !== format || !same(previous.repository, repository)) return refuse("conflict");
        return previous;
      }
      return this.#save({ v: 1, at: this.#at, repository, format, confirmed: null, pending: null }, budget);
    });
  }
  mark(mark: ArchiveMark, budget = new ArchiveBudget()): ArchiveRow {
    return this.#sql.transaction(() => {
      const previous = this.#load(budget)?.row;
      if (!previous) return refuse("unavailable");
      checked({ ...previous, pending: mark }, this.#at, budget);
      budget.spend({ inputWork: mark.manifest.length * 12 + 4096 });
      if (previous.pending) { if (!same(previous.pending, mark)) return refuse("outstanding"); return previous; }
      if (mark.parent !== (previous.confirmed?.commit ?? null) || previous.confirmed && mark.through.seq <= previous.confirmed.through.seq) return refuse("conflict");
      return this.#save({ ...previous, pending: mark }, budget);
    });
  }
  confirm(commit: string, budget = new ArchiveBudget()): ArchiveRow {
    return this.#sql.transaction(() => {
      const previous = this.#load(budget)?.row;
      if (!previous?.pending || previous.pending.commit !== commit) return refuse("conflict");
      return this.#save({ ...previous, confirmed: { commit, through: previous.pending.through }, pending: null }, budget);
    });
  }
}
