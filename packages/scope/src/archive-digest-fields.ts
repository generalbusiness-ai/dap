/** Bounded scalar references for cost planning. Trusted typed selectors
 * supply paths; this neither discovers consumers nor admits payloads. */
import { RETAINED_INPUT_BYTES, type Digest } from "@generalbusiness/dap-contract";
import { isDigest, natural } from "@generalbusiness/dap-bytes";
import type { ArchiveBudget } from "./archive-budget.ts";
import { stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";
import type { Sql } from "./sqlite.ts";

export const ARCHIVE_DIGEST_FIELD_BATCH = 64;
export function checkArchiveFieldSource(position: ArchivePosition): void {
  if (!natural(position.seq) || !isDigest(position.hash) || !natural(position.bytes) || position.bytes === 0 || position.bytes > RETAINED_INPUT_BYTES) return stop("unavailable");
}

/** Every actual call is charged, including repeated paths and misses.
 * SQLite processes one bounded entry; only digest-shaped scalar cells
 * cross the native boundary. It never returns the extracted JSON array. */
export function readArchiveDigestFields(sql: Pick<Sql, "exec">, position: ArchivePosition,
  paths: readonly string[], budget: ArchiveBudget): readonly (Digest | null)[] {
  budget.check();
  checkArchiveFieldSource(position);
  if (!Array.isArray(paths) || paths.length > ARCHIVE_DIGEST_FIELD_BATCH) return stop("unavailable");
  budget.spend({ metadata: paths.length * 128, inputWork: paths.length * 256 });
  for (const path of paths) if (typeof path !== "string" || path.length === 0 || path.length > 1024) return stop("unavailable");
  if (paths.length === 0) return [];
  // Multi-path json_extract returns an array. Duplicate the one path for a
  // single-field request and discard that second slot inside SQLite.
  const requested = paths.length === 1 ? [paths[0]!, paths[0]!] : [...paths];
  const placeholders = requested.map(() => "?").join(", ");
  const rows = budget.native(sql, () => ({ metadata: paths.length * 128,
    inputWork: position.bytes * (16 + requested.length * 2) + requested.reduce((n, path) => n + path.length * 24, 0),
  })).exec(`SELECT entry.seq AS seq, fields.key AS slot,
    CASE WHEN fields.type = 'text' AND octet_length(fields.value) = 71
      AND substr(fields.value, 1, 7) = 'sha256:' AND substr(fields.value, 8) NOT GLOB '*[^0-9a-f]*'
      THEN fields.value ELSE NULL END AS digest
    FROM entry, json_each(json_extract(entry.bytes, ${placeholders})) AS fields
    WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND typeof(entry.bytes) = 'text' AND octet_length(entry.bytes) = ?
      AND fields.key < ? ORDER BY fields.key LIMIT ?`,
    ...requested, position.seq, position.hash, position.bytes, position.bytes, paths.length, paths.length + 1).toArray();
  if (rows.length !== paths.length) return stop("mismatch");
  return rows.map((row, index) => {
    const digest = row["digest"];
    if (row["seq"] !== position.seq || row["slot"] !== index || digest !== null && !isDigest(digest)) return stop("mismatch");
    return digest as Digest | null;
  });
}
