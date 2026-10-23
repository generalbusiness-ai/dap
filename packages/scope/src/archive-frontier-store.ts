/** Native partial Merkle witnesses, including bounded seeding from an existing
 * confirmed receipt. Does not create receipts or change the ArchiveRow schema. */
import { b64url, canonicalize, digestBytes, isDigest, isRecord, isScopeRef, natural, parseStrict, same, timeMs, unb64url, utf8 } from "@generalbusiness/dap-bytes";
import type { Digest, Head, ScopeRef } from "@generalbusiness/dap-contract";
import { JOURNAL_PARENT_FRONTIER_BYTES, JOURNAL_PARENT_FRONTIER_OBJECTS, validateJournalParentFrontier,
  type JournalObjectSource, type JournalParentBinding, type JournalParentFrontier } from "@generalbusiness/dap-git/journal";
import { ArchiveBudget } from "./archive-budget.ts";
import { ArchiveRowRefusal, ArchiveRows, type ArchivedPosition, type ArchiveMark } from "./archive-row.ts";
import { ARCHIVE_ROW_BYTES, ARCHIVE_ROW_MANIFEST_BYTES, archiveRowLoadWork } from "./archive-row-cost.ts";
import { ARCHIVE_FRONTIER_BYTES, ARCHIVE_FRONTIER_ENCODING_BOUND, ARCHIVE_FRONTIER_SIZE_METADATA,
  archiveFrontierEncodeCost, archiveFrontierMarkCost, archiveFrontierReadCost, archiveFrontierWriteCost,
  archiveFrontierSnapshotCost, archiveFrontierRowCompareCost, forecastArchiveFrontierBootstrapFinish } from "./archive-frontier-cost.ts";
import type { Sql } from "./sqlite.ts";

const CONFIRMED = "archive-frontier-confirmed-1", PENDING = "archive-frontier-pending-1", ROW = "archive-row-1";
type Identity = Pick<JournalParentBinding, "at" | "repository" | "format">;
type Pair = { readonly confirmed: string | null; readonly pending: string | null };
export interface ArchiveFrontierBase { readonly frontier: JournalParentFrontier }
export interface ArchiveFrontierConversionBase { readonly position: ArchivedPosition }
export interface ArchiveFrontierBootstrap { readonly binding: JournalParentBinding }
export interface ArchiveFrontierBootstrapPrepared { readonly frontier: JournalParentFrontier }
export interface ArchiveFrontierPrepared { readonly frontier: JournalParentFrontier; readonly base: ArchiveFrontierBase | null }
type BaseState = { readonly owner: ArchiveFrontiers; readonly pair: Pair; readonly frontier: JournalParentFrontier };
type PreparedState = BaseState & { readonly mark: string; readonly markBytes: number; readonly markHash: Digest; readonly encoded: string; readonly promoted: string; readonly base: ArchiveFrontierBase | null; readonly previous: ArchivedPosition | null };
const bases = new WeakMap<ArchiveFrontierBase, BaseState>();
const conversions = new WeakMap<ArchiveFrontierConversionBase, { readonly owner: ArchiveFrontiers; readonly pair: Pair; readonly position: ArchivedPosition }>();
const prepared = new WeakMap<ArchiveFrontierPrepared, PreparedState>();
type BootstrapState = { readonly owner: ArchiveFrontiers; readonly pair: Pair; readonly row: string; readonly rowBytes: number; readonly binding: JournalParentBinding };
const bootstraps = new WeakMap<ArchiveFrontierBootstrap, BootstrapState>();
const bootstrapPrepared = new WeakMap<ArchiveFrontierBootstrapPrepared, BootstrapState & { readonly frontier: JournalParentFrontier; readonly encoded: string }>();
class PendingFrontierMismatch extends Error { constructor() { super("archive-frontier-pending-mismatch"); } }
const pendingMismatches = new WeakMap<object, { readonly owner: ArchiveFrontiers; readonly pair: Pair; readonly row: string; readonly rowBytes: number }>();

const refuse = (reason: "unavailable" | "limit" | "conflict" = "unavailable"): never => { throw new ArchiveRowRefusal(reason); };
const keys = (value: Record<string, unknown>, expected: string): boolean => Object.keys(value).sort().join(",") === expected;
function data(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return refuse();
  const names = Object.getOwnPropertyNames(value);
  if (names.length > 16 || Object.getOwnPropertySymbols(value).length !== 0) return refuse();
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!Object.hasOwn(descriptor, "value")) return refuse();
    result[key] = descriptor.value;
  }
  return result;
}
function head(value: unknown): Head {
  const h = data(value);
  if (!keys(h, "hash,seq") || !natural(h["seq"]) || !isDigest(h["hash"])) return refuse();
  return { seq: h["seq"], hash: h["hash"] };
}
function identity(value: Identity): Identity {
  const i = data(value), at = data(i["at"]);
  if (!keys(i, "at,format,repository") || !isScopeRef(at) || !isDigest(i["repository"]) || i["format"] !== "sha1" && i["format"] !== "sha256") return refuse();
  return { at: { ...at }, repository: i["repository"], format: i["format"] } as Identity;
}
function binding(value: JournalParentBinding, expected: Identity): JournalParentBinding {
  const b = data(value);
  if (!keys(b, "at,commit,format,repository,through") || !same(identity({ at: b["at"], format: b["format"], repository: b["repository"] } as Identity), expected)
    || typeof b["commit"] !== "string" || !(expected.format === "sha1" ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/).test(b["commit"])) return refuse();
  return { ...expected, at: { ...expected.at }, commit: b["commit"], through: head(b["through"]) };
}
function markSnapshot(value: ArchiveMark, id: Identity, budget: ArchiveBudget): { value: ArchiveMark; text: string; bytes: number; hash: Digest } {
  budget.spend({ metadata: 16 * 1024, inputWork: 16 * 1024 });
  const m = data(value);
  const expected = ["commit", "layout", "manifest", "markedAt", "parent", "through", ...(Object.hasOwn(m, "anchorPublication") ? ["anchorPublication", "replayScopes"] : [])].sort().join(",");
  if (!keys(m, expected) || m["layout"] !== 2 || typeof m["commit"] !== "string" || typeof m["markedAt"] !== "string" || m["markedAt"].length > 64 || timeMs(m["markedAt"]) === null
    || m["parent"] !== null && typeof m["parent"] !== "string" || typeof m["manifest"] !== "string" || !m["manifest"].length || m["manifest"].length > ARCHIVE_ROW_MANIFEST_BYTES) return refuse();
  const oid = id.format === "sha1" ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/;
  if (!oid.test(m["commit"]) || m["parent"] !== null && !oid.test(m["parent"] as string)) return refuse();
  const through = head(m["through"]);
  let scopes: ScopeRef[] | undefined;
  let units = m["manifest"].length;
  if (Object.hasOwn(m, "anchorPublication")) {
    const text = m["anchorPublication"], list = m["replayScopes"];
    if (typeof text !== "string" || !text.length || text.length > ARCHIVE_ROW_MANIFEST_BYTES || !Array.isArray(list) || list.length > 64) return refuse();
    if (Object.getOwnPropertyNames(list).length !== list.length + 1 || Object.getOwnPropertySymbols(list).length !== 0) return refuse();
    scopes = Array.from({ length: list.length }, (_, index) => {
      const descriptor = Object.getOwnPropertyDescriptor(list, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, "value")) return refuse();
      const at = data(descriptor.value); if (!isScopeRef(at)) return refuse(); return { ...at };
    });
    units += text.length;
  }
  budget.spend(archiveFrontierMarkCost(units));
  const owned = { ...m, through, ...(scopes === undefined ? {} : { replayScopes: scopes }) } as unknown as ArchiveMark;
  const text = canonicalize(owned), raw = utf8(text);
  if (raw.length > ARCHIVE_ROW_BYTES || utf8(owned.manifest).length > ARCHIVE_ROW_MANIFEST_BYTES
    || owned.anchorPublication !== undefined && utf8(owned.anchorPublication).length > ARCHIVE_ROW_MANIFEST_BYTES) return refuse("limit");
  return { value: owned, text, bytes: raw.length, hash: digestBytes(raw) };
}
function copy(frontier: JournalParentFrontier, budget: ArchiveBudget): JournalParentFrontier {
  const bytes = frontier.objects.reduce((sum, object) => sum + object.data.length, 0);
  budget.spend({ metadata: bytes + JOURNAL_PARENT_FRONTIER_OBJECTS * 256, inputWork: bytes });
  return { ...frontier, at: { ...frontier.at }, through: { ...frontier.through }, objects: frontier.objects.map(object => ({ ...object, data: object.data.slice() })) };
}
function encode(frontier: JournalParentFrontier, mark: Digest | null, budget: ArchiveBudget): string {
  budget.spend(archiveFrontierEncodeCost());
  const result = canonicalize({ v: 1, mark, frontier: { ...frontier, objects: frontier.objects.map(object => ({ id: object.id, type: object.type, data: b64url(object.data) })) } });
  if (result.length > ARCHIVE_FRONTIER_ENCODING_BOUND || utf8(result).length > ARCHIVE_FRONTIER_BYTES) return refuse("limit");
  return result;
}
function decode(text: string, expectedMark: Digest | null, mismatch?: () => never): unknown {
  let value: unknown;
  try { value = parseStrict(text); if (canonicalize(value) !== text) return refuse(); } catch { return refuse(); }
  if (!isRecord(value) || !keys(value, "frontier,mark,v") || value["v"] !== 1 || !isRecord(value["frontier"])) return refuse();
  if (value["mark"] !== expectedMark) {
    if (mismatch !== undefined && isDigest(value["mark"])) return mismatch();
    return refuse();
  }
  const f = value["frontier"], objects = f["objects"];
  if (!Array.isArray(objects) || objects.length !== JOURNAL_PARENT_FRONTIER_OBJECTS) return refuse();
  let total = 0;
  const raw = objects.map(item => {
    if (!isRecord(item) || !keys(item, "data,id,type") || typeof item["data"] !== "string" || item["data"].length > Math.ceil(JOURNAL_PARENT_FRONTIER_BYTES / 3) * 4) return refuse();
    const bytes = unb64url(item["data"]);
    if (bytes === null || (total += bytes.length) > JOURNAL_PARENT_FRONTIER_BYTES) return refuse("limit");
    return { id: item["id"], type: item["type"], data: bytes };
  });
  return { ...f, objects: raw };
}

/** Async validation produces module-owned tokens. Only synchronous exact
 * comparisons and writes occur at stage/promote inside the caller's same
 * transaction as Mark+attempt / confirmation. Tokens confer no bootstrap. */
export class ArchiveFrontiers {
  readonly #sql: Sql;
  readonly #identity: Identity;
  constructor(sql: Sql, value: Identity) { this.#sql = sql; this.#identity = identity(value); }
  #read(key: string, budget: ArchiveBudget): string | null {
    const rows = budget.native(this.#sql, () => ({ metadata: ARCHIVE_FRONTIER_SIZE_METADATA, inputWork: 0 }))
      .exec("SELECT octet_length(v) AS size, typeof(v) AS type FROM meta WHERE k = ? LIMIT 1", key).toArray();
    if (!rows.length) return null;
    const size = rows[0]?.["size"];
    if (rows.length !== 1 || rows[0]?.["type"] !== "text" || !natural(size) || size === 0) return refuse();
    if (size > ARCHIVE_FRONTIER_BYTES) return refuse("limit");
    budget.spend(archiveFrontierReadCost(size));
    const body = budget.native(this.#sql, () => ({ metadata: size, inputWork: 0 }))
      .exec("SELECT v FROM meta WHERE k = ? AND typeof(v) = 'text' AND octet_length(v) = ? LIMIT 1", key, size).toArray();
    const text = body[0]?.["v"];
    if (body.length !== 1 || typeof text !== "string" || text.length > size || utf8(text).length !== size) return refuse();
    return text;
  }
  #pair(budget: ArchiveBudget): Pair { return { confirmed: this.#read(CONFIRMED, budget), pending: this.#read(PENDING, budget) }; }
  #assertPair(pair: Pair, budget: ArchiveBudget): void {
    const current = this.#pair(budget);
    if (current.confirmed !== pair.confirmed || current.pending !== pair.pending) return refuse("conflict");
  }
  #base(pair: Pair, frontier: JournalParentFrontier, budget: ArchiveBudget): ArchiveFrontierBase {
    const token = Object.freeze({ frontier: copy(frontier, budget) });
    bases.set(token, { owner: this, pair, frontier }); return token;
  }
  async readConfirmed(value: JournalParentBinding, budget: ArchiveBudget): Promise<ArchiveFrontierBase | null> {
    const bound = binding(value, this.#identity), pair = this.#sql.transaction(() => this.#pair(budget));
    if (pair.confirmed === null) { if (pair.pending !== null) return refuse("conflict"); return null; }
    const frontier = await validateJournalParentFrontier(decode(pair.confirmed, null), bound, budget);
    budget.check(); return this.#base(pair, frontier, budget);
  }
  source(base: ArchiveFrontierBase, budget: ArchiveBudget): JournalObjectSource {
    const state = bases.get(base); if (!state || state.owner !== this) return refuse();
    return { object: async (id, limit) => {
      budget.spend({ metadata: 128, inputWork: 128 + JOURNAL_PARENT_FRONTIER_OBJECTS * 64 });
      const object = state.frontier.objects.find(row => row.id === id);
      if (!object) return null;
      if (!natural(limit)) return refuse();
      if (limit === 0) return { type: object.type, size: object.data.length, data: null };
      if (object.data.length > limit) return refuse("limit");
      budget.spend({ metadata: object.data.length, inputWork: object.data.length });
      return { type: object.type, size: object.data.length, data: object.data.slice() };
    } };
  }
  /** Only the already supported v1-to-new-v2 build may use this context.
   * It grants no objects and cannot initialize a missing v2 frontier. */
  readConversionBase(budget: ArchiveBudget): ArchiveFrontierConversionBase {
    return this.#sql.transaction(() => {
      const pair = this.#pair(budget);
      if (pair.confirmed !== null || pair.pending !== null) return refuse("conflict");
      const position = this.#conversionPosition(budget);
      const token = Object.freeze({ position: { ...position, through: { ...position.through } } });
      conversions.set(token, { owner: this, pair, position }); return token;
    });
  }
  #conversionPosition(budget: ArchiveBudget, expectedMark?: string): ArchivedPosition {
    const row = new ArchiveRows(this.#sql, this.#identity.at).load(budget);
    if (!row?.confirmed || row.confirmed.layout === 2 || row.stopped !== null
      || row.pending !== null && row.pending.layout !== 2 || row.format !== this.#identity.format) return refuse("conflict");
    budget.spend({ metadata: 32 * 1024, inputWork: 32 * 1024 * 12 });
    if (digestBytes(utf8(canonicalize(row.repository))) !== this.#identity.repository) return refuse("conflict");
    if (expectedMark !== undefined) {
      budget.spend({ metadata: expectedMark.length * 3, inputWork: expectedMark.length * 12 });
      if (row.pending === null || canonicalize(row.pending) !== expectedMark) return refuse("conflict");
    }
    return { ...row.confirmed, through: { ...row.confirmed.through } };
  }
  async prepare(value: unknown, mark: ArchiveMark, base: ArchiveFrontierBase | ArchiveFrontierConversionBase | null, budget: ArchiveBudget): Promise<ArchiveFrontierPrepared> {
    const m = markSnapshot(mark, this.#identity, budget), state = base === null ? null : bases.get(base as ArchiveFrontierBase);
    const conversion = base === null ? null : conversions.get(base as ArchiveFrontierConversionBase);
    if (base !== null && ((!state || state.owner !== this) && (!conversion || conversion.owner !== this))) return refuse();
    const pair = state?.pair ?? conversion?.pair ?? this.#sql.transaction(() => this.#pair(budget));
    const previous: ArchivedPosition | null = state ? { commit: state.frontier.commit, through: state.frontier.through, layout: 2 } : conversion?.position ?? null;
    if (pair.pending !== null || base === null && pair.confirmed !== null || m.value.parent !== (previous?.commit ?? null)) return refuse("conflict");
    const bound = binding({ ...this.#identity, commit: m.value.commit, through: m.value.through }, this.#identity);
    const frontier = await validateJournalParentFrontier(value, bound, budget, m.value.parent);
    if (state && frontier.first !== state.frontier.through.seq + 1 || !state && frontier.first !== 0) return refuse("conflict");
    return this.#prepared(pair, frontier, m, state ? base as ArchiveFrontierBase : null, previous, budget);
  }
  #prepared(pair: Pair, frontier: JournalParentFrontier, m: { text: string; bytes: number; hash: Digest }, base: ArchiveFrontierBase | null, previous: ArchivedPosition | null, budget: ArchiveBudget): ArchiveFrontierPrepared {
    const encoded = encode(frontier, m.hash, budget), promoted = encode(frontier, null, budget);
    const token = Object.freeze({ frontier: copy(frontier, budget), base });
    prepared.set(token, { owner: this, pair, frontier, mark: m.text, markBytes: m.bytes, markHash: m.hash, encoded, promoted, base, previous }); return token;
  }
  async readPending(value: JournalParentBinding, mark: ArchiveMark, budget: ArchiveBudget): Promise<ArchiveFrontierPrepared | null> {
    const pair = this.#sql.transaction(() => this.#pair(budget));
    if (pair.pending === null) return null;
    const bound = binding(value, this.#identity), m = markSnapshot(mark, this.#identity, budget);
    if (bound.commit !== m.value.commit || !same(bound.through, m.value.through)) return refuse("conflict");
    const frontier = await validateJournalParentFrontier(decode(pair.pending, m.hash, () => this.#pendingMismatch(pair, m, budget)), bound, budget, m.value.parent);
    let base: ArchiveFrontierBase | null = null;
    if (pair.confirmed !== null) {
      const raw = decode(pair.confirmed, null);
      if (!isRecord(raw)) return refuse();
      const old = binding({ ...this.#identity, commit: raw["commit"], through: raw["through"] } as JournalParentBinding, this.#identity);
      const validated = await validateJournalParentFrontier(raw, old, budget);
      base = this.#base(pair, validated, budget);
    }
    const previous: ArchivedPosition | null = base !== null ? { commit: base.frontier.commit, through: base.frontier.through, layout: 2 }
      : m.value.parent === null ? null : this.#sql.transaction(() => this.#conversionPosition(budget, m.text));
    if (m.value.parent !== (previous?.commit ?? null) || frontier.first !== (base === null ? 0 : base.frontier.through.seq + 1)) return refuse("conflict");
    const token = this.#prepared(pair, frontier, m, base, previous, budget);
    if (prepared.get(token)!.encoded !== pair.pending) return refuse("conflict");
    return token;
  }
  #row(state: PreparedState, budget: ArchiveBudget): void {
    // Inspect bounded native row context, not its potentially large manifest.
    // JSON comparisons run only after the original size ceiling is admitted.
    const sizes = budget.native(this.#sql, () => ({ metadata: 96, inputWork: 0 }))
      .exec("SELECT octet_length(v) AS size, typeof(v) AS type FROM meta WHERE k = ? LIMIT 1", ROW).toArray();
    const size = sizes[0]?.["size"];
    if (sizes.length !== 1 || sizes[0]?.["type"] !== "text" || !natural(size) || size === 0) return refuse();
    if (size > ARCHIVE_ROW_BYTES) return refuse("limit");
    budget.spend({ metadata: 32 * 1024 * 4 + size + state.markBytes * 2, inputWork: archiveRowLoadWork(size) + state.markBytes * 6 + 32 * 1024 * 12 });
    const rows = budget.native(this.#sql, () => ({ metadata: 32 * 1024, inputWork: 0 })).exec(
      "SELECT json_extract(v, '$.at') AS at, json_extract(v, '$.repository') AS repository, json_extract(v, '$.format') AS format, json_extract(v, '$.confirmed') AS confirmed FROM meta WHERE k = ? AND typeof(v) = 'text' AND octet_length(v) = ? AND json_valid(v) AND octet_length(json_extract(v, '$.at')) <= 1024 AND octet_length(json_extract(v, '$.repository')) <= 25600 AND (json_type(v, '$.confirmed') = 'null' OR octet_length(json_extract(v, '$.confirmed')) <= 1024) AND json_extract(v, '$.v') = 1 AND json_type(v, '$.stopped') = 'null' AND json_extract(v, '$.attempts') BETWEEN 1 AND 32 AND json_extract(v, '$.pending') = ? LIMIT 1", ROW, size, state.mark).toArray();
    const row = rows[0];
    if (rows.length !== 1 || !row || typeof row["at"] !== "string" || typeof row["repository"] !== "string" || row["format"] !== this.#identity.format
      || row["at"].length > 1024 || row["repository"].length > 25 * 1024 || typeof row["confirmed"] !== "string" && row["confirmed"] !== null) return refuse("conflict");
    let at: unknown, repository: unknown, confirmed: unknown;
    try { at = parseStrict(row["at"]); repository = parseStrict(row["repository"]); confirmed = row["confirmed"] === null ? null : parseStrict(row["confirmed"]); }
    catch { return refuse(); }
    if (!same(at, this.#identity.at) || digestBytes(utf8(canonicalize(repository))) !== this.#identity.repository) return refuse("conflict");
    const old = state.previous;
    if (old === null ? confirmed !== null : !same(confirmed, old) && !(isRecord(confirmed) && confirmed["commit"] === old.commit && same(confirmed["through"], old.through) && confirmed["layout"] === old.layout
      && confirmed["anchorsPublished"] === true && old.layout === 2 && keys(confirmed, "anchorsPublished,commit,layout,through"))) return refuse("conflict");
  }
  #sameRow(text: string, bytes: number, budget: ArchiveBudget): void {
    const sizes = budget.native(this.#sql, () => ({ metadata: ARCHIVE_FRONTIER_SIZE_METADATA, inputWork: 0 }))
      .exec("SELECT octet_length(v) AS size, typeof(v) AS type FROM meta WHERE k = ? LIMIT 1", ROW).toArray();
    if (sizes.length !== 1 || sizes[0]?.["type"] !== "text" || sizes[0]?.["size"] !== bytes) return refuse("conflict");
    const rows = budget.native(this.#sql, () => archiveFrontierRowCompareCost(bytes))
      .exec("SELECT 1 AS exact FROM meta WHERE k = ? AND typeof(v) = 'text' AND octet_length(v) = ? AND CAST(v AS BLOB) = CAST(? AS BLOB) LIMIT 1", ROW, bytes, text).toArray();
    if (rows.length !== 1 || rows[0]?.["exact"] !== 1) return refuse("conflict");
  }
  #pendingMismatch(pair: Pair, m: { text: string }, budget: ArchiveBudget): never {
    return this.#sql.transaction(() => {
      this.#assertPair(pair, budget);
      const snapshot = new ArchiveRows(this.#sql, this.#identity.at).loadSnapshot(budget);
      if (!snapshot || snapshot.row.stopped !== null || snapshot.row.format !== this.#identity.format || snapshot.row.pending === null) return refuse("conflict");
      // Authenticate a contradiction against CURRENT checked native bytes,
      // rather than treating a stale caller Mark or a SQL failure as corruption.
      budget.spend(archiveFrontierSnapshotCost(snapshot.bytes.length, 3));
      if (digestBytes(utf8(canonicalize(snapshot.row.repository))) !== this.#identity.repository
        || canonicalize(snapshot.row.pending) !== m.text) return refuse("conflict");
      const error = new PendingFrontierMismatch();
      pendingMismatches.set(error, { owner: this, pair, row: snapshot.bytes, rowBytes: utf8(snapshot.bytes).length });
      throw error;
    });
  }
  /** The driver must call this and persist its stop in the SAME outer
   * transaction. Budget/SQL failures propagate; stale or forged errors do
   * not authorize replacing any current state with a corruption stop. */
  isCurrentPendingMismatch(error: unknown, budget: ArchiveBudget): boolean {
    if (typeof error !== "object" || error === null) return false;
    const state = pendingMismatches.get(error); if (!state || state.owner !== this) return false;
    try { return this.#sql.transaction(() => { this.#assertPair(state.pair, budget); this.#sameRow(state.row, state.rowBytes, budget); return true; }); }
    catch (failure) { if (failure instanceof ArchiveRowRefusal && failure.reason === "conflict") return false; throw failure; }
  }
  /** Migration only: no receipt, Mark, attempt, wake or parent is invented.
   * The old accepted-Mark readback decision precedes this API in the driver. */
  beginConfirmedBootstrap(budget: ArchiveBudget): ArchiveFrontierBootstrap | null {
    return this.#sql.transaction(() => {
      const pair = this.#pair(budget);
      if (pair.confirmed !== null || pair.pending !== null) return refuse("conflict");
      const snapshot = new ArchiveRows(this.#sql, this.#identity.at).loadSnapshot(budget);
      if (!snapshot?.row.confirmed) return null;
      const row = snapshot.row;
      if (row.confirmed!.layout !== 2 || row.stopped !== null || row.format !== this.#identity.format
        || row.pending !== null && (row.pending.layout !== 2 || row.pending.parent !== row.confirmed!.commit)) return refuse("conflict");
      budget.spend(archiveFrontierSnapshotCost(snapshot.bytes.length, 3));
      if (digestBytes(utf8(canonicalize(row.repository))) !== this.#identity.repository) return refuse("conflict");
      const exact = binding({ ...this.#identity, commit: row.confirmed!.commit, through: row.confirmed!.through }, this.#identity);
      const token = Object.freeze({ binding: { ...exact, at: { ...exact.at }, through: { ...exact.through } } });
      bootstraps.set(token, { owner: this, pair, row: snapshot.bytes, rowBytes: utf8(snapshot.bytes).length, binding: exact }); return token;
    });
  }
  /** This forecast reads only private captured size; a mutable public view
   * cannot lower the finish reserve. It excludes already-spent context and
   * remote capture, including actual companion-object admission. */
  bootstrapFinish(token: ArchiveFrontierBootstrap): ReturnType<typeof forecastArchiveFrontierBootstrapFinish> {
    const state = bootstraps.get(token); if (!state || state.owner !== this) return refuse();
    return forecastArchiveFrontierBootstrapFinish(state.rowBytes);
  }
  async prepareConfirmedBootstrap(token: ArchiveFrontierBootstrap, value: unknown, budget: ArchiveBudget): Promise<ArchiveFrontierBootstrapPrepared> {
    const state = bootstraps.get(token); if (!state || state.owner !== this) return refuse();
    budget.spend({ metadata: 4096, inputWork: 4096 });
    const frontier = await validateJournalParentFrontier(value, state.binding, budget);
    const encoded = encode(frontier, null, budget), result = Object.freeze({ frontier: copy(frontier, budget) });
    bootstrapPrepared.set(result, { ...state, frontier, encoded }); return result;
  }
  /** Confirmed-only INSERT after exact raw row/key CAS. No overwrite and
   * no pending/wake/receipt mutation; a later failure rolls back the seed. */
  installConfirmedBootstrap(token: ArchiveFrontierBootstrapPrepared, budget: ArchiveBudget): ArchiveFrontierBase {
    const state = bootstrapPrepared.get(token); if (!state || state.owner !== this) return refuse();
    return this.#sql.transaction(() => {
      this.#assertPair(state.pair, budget); this.#sameRow(state.row, state.rowBytes, budget);
      budget.spend({ metadata: 4096, inputWork: 4096 });
      budget.spend(archiveFrontierWriteCost(state.encoded.length));
      const result = this.#base({ confirmed: state.encoded, pending: null }, state.frontier, budget);
      budget.check(); this.#sql.exec("INSERT INTO meta (k, v) VALUES (?, ?)", CONFIRMED, state.encoded).toArray(); budget.check(); return result;
    });
  }
  /** Call after ArchiveRows.markAttempt in the SAME outer transaction. */
  stage(token: ArchiveFrontierPrepared, budget: ArchiveBudget): void {
    const state = prepared.get(token); if (!state || state.owner !== this || state.pair.pending !== null) return refuse();
    this.#sql.transaction(() => {
      this.#assertPair(state.pair, budget); this.#row(state, budget);
      budget.spend(archiveFrontierWriteCost(state.encoded.length)); budget.check();
      this.#sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", PENDING, state.encoded).toArray(); budget.check();
    });
  }
  /** Call before ArchiveRows.confirm in the SAME outer transaction. A
   * subsequent confirmation refusal rolls back both frontier writes. */
  promote(token: ArchiveFrontierPrepared, budget: ArchiveBudget): void {
    const state = prepared.get(token); if (!state || state.owner !== this) return refuse();
    this.#sql.transaction(() => {
      this.#assertPair({ confirmed: state.pair.confirmed, pending: state.encoded }, budget); this.#row(state, budget);
      budget.spend(archiveFrontierWriteCost(state.promoted.length, 2)); budget.check();
      this.#sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", CONFIRMED, state.promoted).toArray();
      this.#sql.exec("DELETE FROM meta WHERE k = ?", PENDING).toArray(); budget.check();
    });
  }
}
