/** Internal archive bookkeeping, never an entry or an export certificate.
 * The planner must validate/admit a manifest before marking it; this store
 * only preserves its exact bytes and compares outstanding identities. */
import { natural, same } from "@generalbusiness/dap-bytes";
import type { Head, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isRecord, isScopeRef, parseStrict, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import type { DestinationRepository } from "./destination-host.ts";
import { ArchiveBudget } from "./archive-budget.ts";
import type { Sql } from "./sqlite.ts";
import { confirmRetainedArchivePass } from "./archive-retained-pass.ts";
import { archiveReplayScopes, archiveReplayScopeUnits, readArchivePublication } from "./archive-publication.ts";
import { ARCHIVE_ROW_MANIFEST_BYTES as MANIFEST_BYTES, ARCHIVE_ROW_BYTES, ARCHIVE_CONFIRMED_ROW_BYTES, ARCHIVE_ROW_SIZE_METADATA,
  ARCHIVE_ROW_SAVE_FIXED_WORK, archiveRowLoadWork, archivePendingManifestWork, archiveMarkWork,
  archiveRowSaveReservation, archiveConfirmedRowSaveReservation } from "./archive-row-cost.ts";
export { ARCHIVE_ROW_BYTES } from "./archive-row-cost.ts";

const KEY = "archive-row-1";
const WAKE = "archive-wake-1";
type Format = "sha1" | "sha256";
export interface ArchivedPosition { readonly commit: string; readonly through: Head; readonly layout?: 2; readonly anchorsPublished?: true }
export interface ArchiveMark extends Omit<ArchivedPosition, "anchorsPublished"> {
  readonly parent: string | null;
  /** Immutable selection metadata only; no input or entry bodies. */
  readonly manifest: string;
  readonly markedAt: Timestamp;
  /** Exact canonical descriptive lists, finalized after validated inputs. */
  readonly anchorPublication?: string;
  readonly replayScopes?: readonly ScopeRef[];
}
export interface ArchiveRow {
  readonly v: 1;
  readonly at: ScopeRef;
  readonly repository: DestinationRepository;
  readonly format: Format;
  readonly confirmed: ArchivedPosition | null;
  readonly pending: ArchiveMark | null;
  readonly attempts: number;
  readonly next: Timestamp | null;
  readonly stopped: { readonly reason: string; readonly where: string | null } | null;
}
export class ArchiveRowRefusal extends Error {
  readonly reason: "unavailable" | "limit" | "conflict" | "outstanding" | "stopped";
  constructor(reason: ArchiveRowRefusal["reason"]) { super(`archive-row-${reason}`); this.reason = reason; }
}
const refuse = (reason: ArchiveRowRefusal["reason"]): never => { throw new ArchiveRowRefusal(reason); };
const fields = (value: Record<string, unknown>, expected: string): boolean => Object.keys(value).sort().join(",") === expected;
const objectId = (value: unknown, format: Format): value is string => typeof value === "string" && (format === "sha1" ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/).test(value);
function position(value: unknown, format: Format): value is ArchivedPosition {
  if (!isRecord(value) || !fields(value, ["commit", "through", ...(Object.hasOwn(value, "layout") ? ["layout"] : []), ...(Object.hasOwn(value, "anchorsPublished") ? ["anchorsPublished"] : [])].sort().join(","))
    || Object.hasOwn(value, "layout") && value["layout"] !== 2 || !objectId(value["commit"], format)) return false;
  if (Object.hasOwn(value, "anchorsPublished") && (value["anchorsPublished"] !== true || value["layout"] !== 2)) return false;
  const head = value["through"];
  return isRecord(head) && fields(head, "hash,seq") && natural(head["seq"]) && isDigest(head["hash"]);
}
function checked(value: unknown, at: ScopeRef, budget: ArchiveBudget): ArchiveRow {
  budget.check();
  if (!isRecord(value) || !fields(value, "at,attempts,confirmed,format,next,pending,repository,stopped,v") || value["v"] !== 1 || !isScopeRef(value["at"]) || !same(value["at"], at)) return refuse("unavailable");
  const format = value["format"], repository = value["repository"];
  if (format !== "sha1" && format !== "sha256" || !isRecord(repository) || !fields(repository, "host,id,name,namespace")) return refuse("unavailable");
  if (Object.values(repository).some(field => typeof field !== "string" || field.length === 0 || field.length > 1024)) return refuse("unavailable");
  const confirmed = value["confirmed"], pending = value["pending"];
  const attempts = value["attempts"], next = value["next"], stopped = value["stopped"];
  if (!natural(attempts) || attempts > 32 || next !== null && (typeof next !== "string" || timeMs(next) === null)) return refuse("unavailable");
  if (stopped !== null && (!isRecord(stopped) || !fields(stopped, "reason,where") || typeof stopped["reason"] !== "string" || stopped["reason"].length === 0 || stopped["reason"].length > 128 || stopped["where"] !== null && (typeof stopped["where"] !== "string" || stopped["where"].length > 4096) || next !== null)) return refuse("unavailable");
  if (pending === null && (attempts !== 0 || next !== null)) return refuse("unavailable");
  if (confirmed !== null && !position(confirmed, format)) return refuse("unavailable");
  if (pending !== null) {
    if (!isRecord(pending) || !fields(pending, ["commit", "manifest", "markedAt", "parent", "through", ...(Object.hasOwn(pending, "layout") ? ["layout"] : []), ...(Object.hasOwn(pending, "anchorPublication") ? ["anchorPublication"] : []), ...(Object.hasOwn(pending, "replayScopes") ? ["replayScopes"] : [])].sort().join(","))
      || Object.hasOwn(pending, "layout") && pending["layout"] !== 2
      || !position({ commit: pending["commit"], through: pending["through"] }, format) || pending["parent"] !== null && !objectId(pending["parent"], format) || typeof pending["manifest"] !== "string" || pending["manifest"].length === 0 || pending["manifest"].length > MANIFEST_BYTES || typeof pending["markedAt"] !== "string" || timeMs(pending["markedAt"]) === null) return refuse("unavailable");
    budget.spend({ inputWork: archivePendingManifestWork(pending["manifest"].length) });
    if (utf8(pending["manifest"]).length > MANIFEST_BYTES) return refuse("limit");
    if (Object.hasOwn(pending, "anchorPublication")) {
      const publication = pending["anchorPublication"];
      if (pending["layout"] !== 2 || typeof publication !== "string" || publication.length === 0 || publication.length > MANIFEST_BYTES) return refuse("unavailable");
      budget.spend({ inputWork: archivePendingManifestWork(publication.length) });
      if (utf8(publication).length > MANIFEST_BYTES) return refuse("limit");
      if (!Array.isArray(pending["replayScopes"])) return refuse("unavailable");
      archiveReplayScopes(pending["replayScopes"], at, budget);
    }
    else if (Object.hasOwn(pending, "replayScopes")) return refuse("unavailable");
    if (pending["parent"] !== (confirmed === null ? null : confirmed.commit)) return refuse("unavailable");
    const through = pending["through"] as Head;
    if (confirmed !== null && (confirmed.layout === 2 && pending["layout"] !== 2
      || through.seq <= confirmed.through.seq && !(pending["layout"] === 2 && confirmed.layout !== 2 && same(through, confirmed.through)))) return refuse("unavailable");
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
    const sql = budget.native(this.#sql, () => ({ metadata: ARCHIVE_ROW_SIZE_METADATA, inputWork: 0 }));
    const sizes = sql.exec("SELECT octet_length(v) AS size, typeof(v) AS type FROM meta WHERE k = ? LIMIT 1", KEY).toArray();
    if (!sizes.length) return null;
    const size = sizes[0]?.["size"];
    if (sizes.length !== 1 || sizes[0]?.["type"] !== "text" || !natural(size) || size === 0) return refuse("unavailable");
    if (size > ARCHIVE_ROW_BYTES) return refuse("limit");
    budget.spend({ inputWork: archiveRowLoadWork(size) });
    const bodies = budget.native(this.#sql, () => ({ metadata: size, inputWork: 0 })).exec("SELECT v FROM meta WHERE k = ? AND typeof(v) = 'text' AND octet_length(v) = ? LIMIT 1", KEY, size).toArray();
    const bytes = bodies[0]?.["v"];
    if (bodies.length !== 1 || typeof bytes !== "string" || bytes.length > size || utf8(bytes).length !== size) return refuse("unavailable");
    let value: unknown;
    try { value = parseStrict(bytes); if (canonicalize(value) !== bytes) return refuse("unavailable"); }
    catch { return refuse("unavailable"); }
    return { row: checked(value, this.#at, budget), bytes };
  }
  #save(value: ArchiveRow, budget: ArchiveBudget, afterConfirmation: Timestamp | null = null): ArchiveRow {
    checked(value, this.#at, budget);
    // Original fixed work precedes the bounded selector. checked() has
    // already established every field/type/length and the closed schema.
    // The compact schema's maximum UTF-8 size is 220 structure + 24,584
    // repository strings + 248 other strings + 19 numbers + 4 boolean +
    // 12 nulls = 25,087 bytes. Only the four repository strings need the
    // six-bytes-per-UTF-16-unit escape bound; all other strings are fixed
    // identifier/hex/format tokens. Neither pending nor stopped data enters.
    budget.spend({ inputWork: ARCHIVE_ROW_SAVE_FIXED_WORK });
    const compact = value.confirmed !== null && value.pending === null && value.stopped === null && value.next === null && value.attempts === 0;
    const limit = compact ? ARCHIVE_CONFIRMED_ROW_BYTES : ARCHIVE_ROW_BYTES;
    const reservation = compact ? archiveConfirmedRowSaveReservation() : archiveRowSaveReservation();
    // Both persistence calls and the original three-per-byte price are
    // reserved before serialization, UTF-8 allocation or owned parsing.
    budget.spend({ calls: reservation.calls, inputWork: reservation.inputWork - ARCHIVE_ROW_SAVE_FIXED_WORK });
    const bytes = canonicalize(value);
    if (bytes.length > limit || utf8(bytes).length > limit) return refuse("limit");
    budget.check();
    this.#sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", KEY, bytes).toArray();
    // A small alarm index prevents a new turn from loading the manifest.
    const wake = { pending: value.pending !== null, stopped: value.stopped !== null, next: value.stopped ? null : value.next ?? value.pending?.markedAt ?? afterConfirmation };
    this.#sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", WAKE, canonicalize(wake)).toArray();
    budget.check();
    // Expose an owned snapshot, not the caller's mutable mark or head.
    return parseStrict(bytes) as ArchiveRow;
  }
  load(budget = new ArchiveBudget()): ArchiveRow | null { return this.#sql.transaction(() => this.#load(budget)?.row ?? null); }
  /** Checked canonical native bytes for an internal compare-and-set token.
   * Same bounded reader and charges; no new row field or receipt authority. */
  loadSnapshot(budget = new ArchiveBudget()): { readonly row: ArchiveRow; readonly bytes: string } | null {
    return this.#sql.transaction(() => this.#load(budget));
  }
  target(repository: DestinationRepository, format: Format, budget = new ArchiveBudget()): ArchiveRow {
    return this.#sql.transaction(() => {
      const previous = this.#load(budget)?.row;
      if (previous) {
        checked({ ...previous, repository, format }, this.#at, budget);
        budget.spend({ inputWork: 16 * 4096 });
        if (previous.format !== format || !same(previous.repository, repository)) return refuse("conflict");
        return previous;
      }
      return this.#save({ v: 1, at: this.#at, repository, format, confirmed: null, pending: null, attempts: 0, next: null, stopped: null }, budget);
    });
  }
  mark(mark: ArchiveMark, budget = new ArchiveBudget()): ArchiveRow { return this.#mark(mark, undefined, budget); }
  /** Initial Mark and its first attempt share one durable cut. Before it,
   * the target/retry remain unchanged; after it, exact Mark/attempt/wake
   * survive together. An already attempted identical Mark is idempotent. */
  markAttempt(mark: ArchiveMark, next: Timestamp, budget = new ArchiveBudget()): ArchiveRow {
    if (timeMs(next) === null) return refuse("unavailable");
    return this.#mark(mark, next, budget);
  }
  #mark(mark: ArchiveMark, next: Timestamp | undefined, budget: ArchiveBudget): ArchiveRow {
    return this.#sql.transaction(() => {
      const previous = this.#load(budget)?.row;
      if (!previous) return refuse("unavailable");
      if (previous.stopped) return refuse("stopped");
      checked({ ...previous, pending: mark }, this.#at, budget);
      budget.spend({ inputWork: archiveMarkWork(mark.manifest.length + (mark.anchorPublication?.length ?? 0) + archiveReplayScopeUnits(mark.replayScopes?.length ?? 0)) });
      if (previous.pending) {
        if (!same(previous.pending, mark)) return refuse("outstanding");
        if (next === undefined || previous.attempts !== 0) return previous;
        // Legacy persisted attempts-zero Marks keep their exact bytes.
        return this.#save({ ...previous, attempts: 1, next }, budget);
      }
      const converting = previous.confirmed && previous.confirmed.layout !== 2 && mark.layout === 2 && same(mark.through, previous.confirmed.through);
      if (mark.parent !== (previous.confirmed?.commit ?? null) || previous.confirmed && mark.through.seq <= previous.confirmed.through.seq && !converting) return refuse("conflict");
      return this.#save({ ...previous, pending: mark, ...(next === undefined ? {} : { attempts: 1, next }) }, budget);
    });
  }
  confirm(commit: string, budget = new ArchiveBudget(), afterConfirmation: Timestamp | null = null): ArchiveRow {
    return this.#sql.transaction(() => {
      const previous = this.#load(budget)?.row;
      if (!previous?.pending || previous.pending.commit !== commit) return refuse("conflict");
      if (previous.stopped) return refuse("stopped");
      if (afterConfirmation !== null && timeMs(afterConfirmation) === null) return refuse("unavailable");
      let covered = false;
      if (previous.pending.layout === 2) {
        const selected = confirmRetainedArchivePass(this.#sql, previous.pending.manifest, budget);
        if (previous.pending.anchorPublication !== undefined) {
          if (!same(selected.at, previous.at) || !same(selected.through, previous.pending.through)) return refuse("unavailable");
          const publication = readArchivePublication(previous.pending.anchorPublication, selected.copies, selected.first, budget, [previous.at]);
          const old = previous.confirmed;
          if (publication.legacyAnchors && (!old || old.anchorsPublished || selected.first !== old.through.seq + 1
            || publication.legacyAnchors.from !== 0 || publication.legacyAnchors.through !== old.through.seq)) return refuse("unavailable");
          covered = old === null || selected.first === 0 && old.layout !== 2 || old.anchorsPublished === true
            || publication.legacyAnchors?.through === old.through.seq;
          if (!covered) return refuse("unavailable");
        }
      }
      return this.#save({ ...previous, confirmed: { commit, through: previous.pending.through, ...(previous.pending.layout === 2 ? { layout: 2 } : {}), ...(covered ? { anchorsPublished: true as const } : {}) }, pending: null, attempts: 0, next: null }, budget, afterConfirmation);
    });
  }
  attempt(next: Timestamp, budget = new ArchiveBudget()): ArchiveRow {
    return this.#sql.transaction(() => {
      const previous = this.#load(budget)?.row;
      if (!previous?.pending) return refuse("unavailable");
      if (previous.stopped) return refuse("stopped");
      return this.#save({ ...previous, attempts: Math.min(32, previous.attempts + 1), next }, budget);
    });
  }
  stop(reason: string, where: string | null = null, budget = new ArchiveBudget()): ArchiveRow {
    return this.#sql.transaction(() => {
      const previous = this.#load(budget)?.row;
      if (!previous) return refuse("unavailable");
      return this.#save({ ...previous, next: null, stopped: { reason, where } }, budget);
    });
  }
  #wake(budget: ArchiveBudget): { pending: boolean; stopped: boolean; next: Timestamp | null } | null {
    const rows = budget.native(this.#sql, () => ({ metadata: 256, inputWork: 4096 })).exec("SELECT v FROM meta WHERE k = ? AND typeof(v) = 'text' AND octet_length(v) <= 256 LIMIT 1", WAKE).toArray();
    if (!rows.length) return null;
    const bytes = rows[0]?.["v"];
    if (rows.length !== 1 || typeof bytes !== "string" || bytes.length > 256) return refuse("unavailable");
    let value: unknown;
    try { value = parseStrict(bytes); if (canonicalize(value) !== bytes) return refuse("unavailable"); }
    catch { return refuse("unavailable"); }
    if (!isRecord(value) || !fields(value, "next,pending,stopped") || typeof value["pending"] !== "boolean" || typeof value["stopped"] !== "boolean" || value["next"] !== null && (typeof value["next"] !== "string" || timeMs(value["next"]) === null)) return refuse("unavailable");
    return value as { pending: boolean; stopped: boolean; next: Timestamp | null };
  }
  wake(budget = new ArchiveBudget()): Timestamp | null { const wake = this.#wake(budget); return wake?.stopped ? null : wake?.next ?? null; }
  /** Persist a pre-Mark retry before a target or parent lookup can await.
   * The pending flag protects this backoff from new entry notifications;
   * it does not introduce a second commit or selection. */
  defer(at: Timestamp, budget = new ArchiveBudget()): void {
    this.#sql.transaction(() => {
      if (timeMs(at) === null) return refuse("unavailable");
      if (this.#wake(budget)?.stopped) return;
      budget.spend({ calls: 1, inputWork: 4096 }); budget.check();
      this.#sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", WAKE, canonicalize({ pending: true, stopped: false, next: at })).toArray();
      budget.check();
    });
  }
  clearWake(budget = new ArchiveBudget()): void {
    budget.spend({ calls: 1, inputWork: 4096 }); budget.check();
    this.#sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", WAKE, canonicalize({ pending: false, stopped: false, next: null })).toArray();
    budget.check();
  }
  /** New entries only change the tiny wake index. An outstanding retry keeps
   * its backoff, and a stopped writer is never silently restarted. */
  signal(at: Timestamp, budget = new ArchiveBudget()): void {
    this.#sql.transaction(() => {
      if (timeMs(at) === null) return refuse("unavailable");
      const wake = this.#wake(budget);
      if (wake?.stopped || wake?.pending || wake?.next && timeMs(wake.next)! <= timeMs(at)!) return;
      budget.spend({ calls: 1, inputWork: 4096 }); budget.check();
      this.#sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", WAKE, canonicalize({ pending: false, stopped: false, next: at })).toArray();
      budget.check();
    });
  }
}
