/** Bounded source-identity lookahead, before any export body selection.
 * The adaptive owner protects the earlier selected prefix while it runs.
 * All SQL/JSON work stays charged to that same ArchiveBudget. */
import type { Bounds, Head, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isScopeRef, natural } from "@generalbusiness/dap-bytes";
import { ARCHIVE_BOUNDS, type ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_SOURCE_PINS } from "./archive-source-pins.ts";
import { sqlJsonText as text, type Sql } from "./sqlite.ts";
import { stopArchivePrefix } from "./archive-prefix.ts";

export function archiveSourceReferences(sql: Pick<Sql, "exec">, seq: number, bounds: Bounds, budget: ArchiveBudget): { readonly position: Head; readonly sources: readonly ScopeRef[] } {
  const sources = new Map<string, ScopeRef>();
  const row = budget.native(sql, () => ({ metadata: 160, inputWork: 0 })).exec("SELECT hash,size,typeof(bytes) AS type,octet_length(bytes) AS actual FROM entry WHERE seq=? LIMIT 1", seq).toArray()[0];
  const bytes = row?.["size"], hash = row?.["hash"];
  if (!row || !natural(bytes) || bytes === 0 || bytes > bounds.entryBytes || row["type"] !== "text" || row["actual"] !== bytes || !isDigest(hash)) return stopArchivePrefix("unavailable");
  const shape = budget.native(sql, () => ({ metadata: 128, inputWork: bytes * 32 })).exec("SELECT json_type(bytes,'$.uses') AS type,json_array_length(bytes,'$.uses') AS n FROM entry WHERE seq=? LIMIT 1", seq).toArray()[0];
  const count = shape?.["n"];
  if (shape?.["type"] !== "array" || !natural(count) || count > ARCHIVE_BOUNDS.attempts) return stopArchivePrefix("limit");
  if (count) {
    const rows = budget.native(sql, () => ({ metadata: count * 256, inputWork: bytes * 32 })).exec(`SELECT ${text("$.fact.at.scope", 71, "value")} AS scope,${text("$.fact.at.inc", 64, "value")} AS inc,${text("$.fact.at.kind", 16, "value")} AS kind FROM entry,json_each(entry.bytes,'$.uses') WHERE seq=? LIMIT ?`, seq, count).toArray();
    if (rows.length !== count) return stopArchivePrefix("unavailable");
    for (const row of rows) {
      const at = { scope: row["scope"], inc: row["inc"], kind: row["kind"] };
      if (!isScopeRef(at)) return stopArchivePrefix("unavailable");
      sources.set(canonicalize(at), at);
      if (sources.size > ARCHIVE_SOURCE_PINS) return stopArchivePrefix("limit");
    }
  }
  // Only the contract's retained authority/observation slots supplement
  // admitted uses. Do not interpret similarly shaped user-field values as
  // a request to read another private scope's birth.
  const identities = budget.native(sql, () => ({ metadata: (ARCHIVE_SOURCE_PINS + 1) * 256, inputWork: bytes * 32 })).exec(`SELECT ${text("$.scope", 71, "value")} AS scope,${text("$.inc", 64, "value")} AS inc,${text("$.kind", 16, "value")} AS kind
    ,(SELECT count(*) FROM json_each(refs.value)) AS keys
    FROM (SELECT CASE WHEN type='object' THEN value ELSE '{}' END AS value
      FROM entry,json_tree(entry.bytes) WHERE entry.seq=? AND (
        fullkey GLOB '$.input.authority[[]*[]].issued.at'
        OR fullkey GLOB '$.input.authority[[]*[]].fresh.observation.of'
        OR fullkey GLOB '$.input.observed[[]*[]].observation.of')) AS refs
    WHERE json_extract(value,'$.kind') IN ('register','membership') LIMIT ?`, seq, ARCHIVE_SOURCE_PINS + 1).toArray();
  if (identities.length > ARCHIVE_SOURCE_PINS) return stopArchivePrefix("limit");
  for (const row of identities) {
    const at = { scope: row["scope"], inc: row["inc"], kind: row["kind"] };
    if (row["keys"] !== 3 || !isScopeRef(at)) return stopArchivePrefix("unavailable");
    sources.set(canonicalize(at), at);
    if (sources.size > ARCHIVE_SOURCE_PINS) return stopArchivePrefix("limit");
  }
  return { position: { seq, hash }, sources: [...sources.values()] };
}

/** Exact pending-range reconstruction only. New passes prepare one candidate
 * inside the adaptive owner's finish-reserved lookahead, never a prewindow. */
export function archiveSourceWindow(sql: Pick<Sql, "exec">, after: Head | null, through: Head, bounds: Bounds, budget: ArchiveBudget): { readonly through: Head; readonly sources: readonly ScopeRef[] } {
  const first = (after?.seq ?? -1) + 1, sources = new Map<string, ScopeRef>();
  if (through.seq < first || through.seq - first + 1 > ARCHIVE_BOUNDS.entries) return stopArchivePrefix("limit");
  let selected: Head | null = null;
  for (let seq = first; seq <= through.seq; seq++) {
    const step = archiveSourceReferences(sql, seq, bounds, budget); selected = step.position;
    for (const at of step.sources) sources.set(canonicalize(at), at);
    if (sources.size > ARCHIVE_SOURCE_PINS) return stopArchivePrefix("limit");
  }
  if (!selected || selected.hash !== through.hash) return stopArchivePrefix("unavailable");
  return { through: selected, sources: [...sources.values()] };
}
