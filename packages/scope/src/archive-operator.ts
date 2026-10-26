/** Internal bounded archive observation for the activation diagnostic. No driver, authority, recovery,
 * mutation, schema initialization or raw archive payload is reachable here. */
import type { ScopeId, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isHead, isRecord, isScopeRef, natural, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_SCOPE_METADATA_BYTES } from "./archive-pin.ts";
import { ArchiveRows, archiveRestartEligible, type ArchivedPosition, type ArchiveMark, type ArchiveStoredWake } from "./archive-row.ts";
import type { DestinationRepository } from "./destination-host.ts";
import type { Sql } from "./sqlite.ts";

type Observation<T> = { readonly state: "absent" } | { readonly state: "unknown" } | ({ readonly state: "present" } & T);
const reasons = ["limit", "timeout", "unavailable", "format", "object-id", "missing-object", "object-mismatch", "tree", "commit", "timestamp", "manifest", "input", "missing-input", "input-mismatch", "parent", "rebuild-mismatch", "conflict", "incomplete", "mismatch", "foreign-source-unavailable", "foreign-source-mismatch", "unsupported-credential-cohort", "unsupported-archive-cohort", "unsupported-custom-domain", "unsupported-foreign-copy"] as const;
export type ArchiveOperatorReason = typeof reasons[number] | "unknown";
export interface ArchiveOperatorRow {
  readonly at: ScopeRef;
  readonly rowDigest: string | null;
  readonly restartGeneration: number;
  readonly repository: DestinationRepository;
  readonly format: "sha1" | "sha256";
  /** Stored state only; no claim that it has caught up with the native head. */
  readonly phase: "target" | "confirmed" | "pending" | "stopped";
  readonly reason: ArchiveOperatorReason | null;
  readonly confirmed: ArchivedPosition | null;
  readonly pendingMark: Omit<ArchiveMark, "manifest" | "anchorPublication" | "replayScopes"> | null;
  readonly attempts: number;
  readonly next: Timestamp | null;
}
export type ArchiveOperatorView = { readonly state: "absent" }
  | { readonly state: "unknown"; readonly reason: "scope" }
  | { readonly state: "read"; readonly row: Observation<ArchiveOperatorRow>;
    readonly storedWake: Observation<ArchiveStoredWake>;
    readonly platformAlarm: Observation<{ readonly at: number }> };
const fields = (value: Record<string, unknown>, expected: string): boolean => Object.keys(value).sort().join(",") === expected;
function scopeOf(sql: Pick<Sql, "exec">, budget: ArchiveBudget): ScopeRef | null {
  const sizes = budget.native(sql, () => ({ metadata: 96, inputWork: 0 }))
    .exec("SELECT octet_length(v) AS size, typeof(v) AS type FROM meta WHERE k = 'scope' LIMIT 1").toArray();
  if (!sizes.length) return null;
  const size = sizes[0]?.["size"];
  if (sizes.length !== 1 || sizes[0]?.["type"] !== "text" || !natural(size) || size === 0 || size > ARCHIVE_SCOPE_METADATA_BYTES) throw new Error("archive-operator-scope");
  budget.spend({ inputWork: size * 12 });
  const rows = budget.native(sql, () => ({ metadata: size, inputWork: 0 }))
    .exec("SELECT v FROM meta WHERE k = 'scope' AND typeof(v) = 'text' AND octet_length(v) = ? LIMIT 1", size).toArray();
  const bytes = rows[0]?.["v"];
  if (rows.length !== 1 || typeof bytes !== "string" || bytes.length > size || utf8(bytes).length !== size) throw new Error("archive-operator-scope");
  const value: unknown = parseStrict(bytes);
  if (!isRecord(value) || !fields(value, "at,creator,genesis,head,held,status,time") || canonicalize(value) !== bytes || !isScopeRef(value["at"]) || !fields(value["at"] as unknown as Record<string, unknown>, "inc,kind,scope") || !isHead(value["head"])) throw new Error("archive-operator-scope");
  return { ...value["at"] };
}
const position = (value: ArchivedPosition): ArchivedPosition => ({ commit: value.commit, through: { ...value.through }, ...(value.layout === 2 ? { layout: 2 as const } : {}), ...(value.anchorsPublished ? { anchorsPublished: true as const } : {}) });

/** SQL observations finish before the asynchronous platform-alarm read.
 * They are not an atomic snapshot across those two platform interfaces.
 * The supplied SQL facade has no transaction or mutation implementation. */
export async function archiveOperatorState(sql: Pick<Sql, "exec">, name: ScopeId | null, getAlarm: () => Promise<number | null>): Promise<ArchiveOperatorView> {
  const budget = new ArchiveBudget();
  let at: ScopeRef | null;
  try { at = scopeOf(sql, budget); }
  catch { return { state: "unknown", reason: "scope" }; }
  if (at === null) return { state: "absent" };
  if (at.scope !== name) return { state: "unknown", reason: "scope" };
  // load() owns the existing strict, canonical, bounded ArchiveRow decoder.
  // Its synchronous frame is read-only; never construct SqliteStore here.
  const rows = new ArchiveRows({ exec: sql.exec.bind(sql), transaction: read => read() }, at);
  let storedWake: Observation<ArchiveStoredWake>;
  try { const wake = rows.storedWake(budget); storedWake = wake === null ? { state: "absent" } : { state: "present", pending: wake.pending, stopped: wake.stopped, next: wake.next }; }
  catch { storedWake = { state: "unknown" }; }
  let row: Observation<ArchiveOperatorRow>;
  try {
    const snapshot = rows.loadSnapshot(budget);
    const value = snapshot?.row ?? null;
    if (value === null) row = { state: "absent" };
    else {
      budget.spend({ metadata: 32 * 1024, inputWork: 128 * 1024 });
      // Only a no-Mark stopped row can authorize restart. Do not add a
      // second whole-manifest hash to an otherwise readable pending diagnostic.
      let rowDigest: string | null = null;
      if (archiveRestartEligible(value, storedWake.state === "present" ? storedWake : null)) {
        budget.spend({ inputWork: snapshot!.bytes.length * 64 });
        rowDigest = digestBytes(utf8(snapshot!.bytes));
      }
      const restartGeneration = rows.restartReceipt(budget).generation;
      const pending = value.pending;
      row = { state: "present", rowDigest, restartGeneration, at: { ...value.at }, repository: { ...value.repository }, format: value.format,
        phase: value.stopped ? "stopped" : pending ? "pending" : value.confirmed !== null ? "confirmed" : "target",
        reason: value.stopped === null ? null : (reasons as readonly string[]).includes(value.stopped.reason) ? value.stopped.reason as ArchiveOperatorReason : "unknown",
        confirmed: value.confirmed === null ? null : position(value.confirmed),
        pendingMark: pending === null ? null : { commit: pending.commit, parent: pending.parent, through: { ...pending.through }, markedAt: pending.markedAt, ...(pending.layout === 2 ? { layout: 2 as const } : {}) }, attempts: value.attempts, next: value.next };
    }
  } catch { row = { state: "unknown" }; }
  let platformAlarm: Observation<{ readonly at: number }>;
  try { const alarm = await getAlarm(); platformAlarm = alarm === null ? { state: "absent" } : Number.isSafeInteger(alarm) && alarm >= 0 ? { state: "present", at: alarm } : { state: "unknown" }; }
  catch { platformAlarm = { state: "unknown" }; }
  return { state: "read", row, storedWake, platformAlarm };
}

/** Fixed, secret-free tail projection. Metadata is captured synchronously
 * before the single platform alarm await in archiveOperatorState. */
export async function archiveRowDiagnostic(sql: Pick<Sql, "exec">, name: ScopeId | null, getAlarm: () => Promise<number | null>) {
  let alarmRead = false;
  let alarm: number | null | undefined;
  const readAlarm = async () => { alarmRead = true; alarm = await getAlarm(); return alarm; };
  const view = await archiveOperatorState(sql, name, readAlarm);
  if (!alarmRead) { try { await readAlarm(); } catch { /* finite unknown */ } }
  if (view.state !== "read") return { scope: name, state: view.state, phase: view.state, reason: view.state === "unknown" ? view.reason : null,
    confirmed: "unknown", pendingMark: "unknown", storedWake: "unknown", rowDigest: "unknown", restartGeneration: "unknown",
    platformAlarm: alarm === null ? "absent" : Number.isSafeInteger(alarm) && alarm! >= 0 ? alarm! : "unknown" };
  const row = view.row;
  return { scope: name, rowDigest: row.state === "present" ? row.rowDigest : row.state, restartGeneration: row.state === "present" ? row.restartGeneration : "unknown", state: row.state, phase: row.state === "present" ? row.phase : row.state,
    reason: row.state === "present" ? row.reason : row.state === "unknown" ? "unknown" : null,
    confirmed: row.state === "present" ? row.confirmed === null ? "absent" : { commit: row.confirmed.commit, through: { ...row.confirmed.through } } : row.state,
    pendingMark: row.state === "present" ? row.pendingMark === null ? "absent" : { commit: row.pendingMark.commit, through: { ...row.pendingMark.through } } : row.state,
    storedWake: view.storedWake.state === "present" ? { pending: view.storedWake.pending, stopped: view.storedWake.stopped, next: view.storedWake.next } : view.storedWake.state,
    platformAlarm: view.platformAlarm.state === "present" ? view.platformAlarm.at : view.platformAlarm.state };
}
