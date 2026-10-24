/** Namespace-only operator observation. No driver, authority, recovery,
 * mutation, schema initialization or raw archive payload is reachable here. */
import type { ScopeId, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, isHead, isRecord, isScopeRef, natural, parseStrict, same, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_SCOPE_METADATA_BYTES } from "./archive-pin.ts";
import { ArchiveRows, type ArchivedPosition, type ArchiveMark, type ArchiveStoredWake } from "./archive-row.ts";
import type { DestinationRepository } from "./destination-host.ts";
import type { Sql } from "./sqlite.ts";

type Observation<T> = { readonly state: "absent" } | { readonly state: "unknown" } | ({ readonly state: "present" } & T);
const reasons = ["limit", "timeout", "unavailable", "format", "object-id", "missing-object", "object-mismatch", "tree", "commit", "timestamp", "manifest", "input", "missing-input", "input-mismatch", "parent", "rebuild-mismatch", "conflict", "incomplete", "mismatch", "foreign-source-unavailable", "foreign-source-mismatch", "unsupported-credential-cohort", "unsupported-archive-cohort", "unsupported-custom-domain", "unsupported-foreign-copy"] as const;
export type ArchiveOperatorReason = typeof reasons[number] | "unknown";
export interface ArchiveOperatorRow {
  readonly at: ScopeRef;
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
export type ArchiveOperatorView = { readonly state: "refused"; readonly reason: "identity" }
  | { readonly state: "absent" }
  | { readonly state: "unknown"; readonly reason: "scope" }
  | { readonly state: "read"; readonly row: Observation<ArchiveOperatorRow>;
    readonly storedWake: Observation<ArchiveStoredWake>;
    readonly platformAlarm: Observation<{ readonly at: number }> };
interface Ask { at: ScopeRef; repository: DestinationRepository }
const fields = (value: Record<string, unknown>, expected: string): boolean => Object.keys(value).sort().join(",") === expected;
function askOf(value: unknown, name: ScopeId | null): Ask | null {
  if (!isRecord(value) || !fields(value, "at,repository") || !isScopeRef(value["at"]) || !fields(value["at"] as unknown as Record<string, unknown>, "inc,kind,scope") || value["at"].scope !== name) return null;
  const repository = value["repository"];
  if (!isRecord(repository) || !fields(repository, "host,id,name,namespace") || Object.values(repository).some(field => typeof field !== "string" || field.length === 0 || field.length > 1024)) return null;
  return { at: { ...value["at"] }, repository: { host: repository["host"] as string, id: repository["id"] as string, name: repository["name"] as string, namespace: repository["namespace"] as string } };
}
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
export async function archiveOperatorState(sql: Pick<Sql, "exec">, name: ScopeId | null, asked: unknown, getAlarm: () => Promise<number | null>): Promise<ArchiveOperatorView> {
  const ask = askOf(asked, name);
  if (!ask) return { state: "refused", reason: "identity" };
  const budget = new ArchiveBudget();
  let at: ScopeRef | null;
  try { at = scopeOf(sql, budget); }
  catch { return { state: "unknown", reason: "scope" }; }
  if (at === null) return { state: "absent" };
  if (!same(at, ask.at)) return { state: "refused", reason: "identity" };
  // load() owns the existing strict, canonical, bounded ArchiveRow decoder.
  // Its synchronous frame is read-only; never construct SqliteStore here.
  const rows = new ArchiveRows({ exec: sql.exec.bind(sql), transaction: read => read() }, at);
  let row: Observation<ArchiveOperatorRow>;
  try {
    const value = rows.load(budget);
    if (value === null) row = { state: "absent" };
    else {
      if (!same(value.repository, ask.repository)) return { state: "refused", reason: "identity" };
      budget.spend({ metadata: 32 * 1024, inputWork: 128 * 1024 });
      const pending = value.pending;
      row = { state: "present", at: { ...value.at }, repository: { ...value.repository }, format: value.format,
        phase: value.stopped ? "stopped" : pending ? "pending" : value.confirmed !== null ? "confirmed" : "target",
        reason: value.stopped === null ? null : (reasons as readonly string[]).includes(value.stopped.reason) ? value.stopped.reason as ArchiveOperatorReason : "unknown",
        confirmed: value.confirmed === null ? null : position(value.confirmed),
        pendingMark: pending === null ? null : { commit: pending.commit, parent: pending.parent, through: { ...pending.through }, markedAt: pending.markedAt, ...(pending.layout === 2 ? { layout: 2 as const } : {}) }, attempts: value.attempts, next: value.next };
    }
  } catch { row = { state: "unknown" }; }
  let storedWake: Observation<ArchiveStoredWake>;
  try { const wake = rows.storedWake(budget); storedWake = wake === null ? { state: "absent" } : { state: "present", pending: wake.pending, stopped: wake.stopped, next: wake.next }; }
  catch { storedWake = { state: "unknown" }; }
  let platformAlarm: Observation<{ readonly at: number }>;
  try { const alarm = await getAlarm(); platformAlarm = alarm === null ? { state: "absent" } : Number.isSafeInteger(alarm) && alarm >= 0 ? { state: "present", at: alarm } : { state: "unknown" }; }
  catch { platformAlarm = { state: "unknown" }; }
  return { state: "read", row, storedWake, platformAlarm };
}
