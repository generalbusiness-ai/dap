/** Scalar forecast metadata only. Final collection still inspects the
 * admitted entry bytes and decides which private facts can be published. */
import { isDigest, natural } from "@generalbusiness/dap-bytes";
import type { ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_PRIVACY_JSON_PASSES, stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";
import type { Sql } from "./sqlite.ts";

/** Call only after this exact local row's prefix and privacy admission,
 * inside its synchronous Native frame. No payload value leaves SQLite.
 * Each full FactRef needs an object `at`, numeric `seq` and text `hash`.
 * Each of/head observation needs both objects. Counting these necessary
 * keys across the whole tree can overcount, but cannot omit a nested
 * candidate that ArchiveReplayAnchors.entry would inspect. */
export function archiveEntryAnchorCandidates(sql: Pick<Sql, "exec">, position: ArchivePosition,
  maximum: number, budget: ArchiveBudget): number {
  const work = position.bytes * ARCHIVE_PRIVACY_JSON_PASSES;
  if (!natural(position.seq) || !isDigest(position.hash) || !natural(position.bytes) || position.bytes === 0
    || !natural(maximum) || maximum === 0 || position.bytes > maximum || !natural(work)) return stop("limit");
  const rows = budget.native(sql, () => ({ metadata: 128, inputWork: work })).exec(`SELECT count(*) AS visited,
    count(*) FILTER (WHERE tree.key = 'at' AND tree.type = 'object') AS ats,
    count(*) FILTER (WHERE tree.key = 'seq' AND tree.type IN ('integer', 'real')) AS seqs,
    count(*) FILTER (WHERE tree.key = 'hash' AND tree.type = 'text') AS hashes,
    count(*) FILTER (WHERE tree.key = 'of' AND tree.type = 'object') AS subjects,
    count(*) FILTER (WHERE tree.key = 'head' AND tree.type = 'object') AS heads
    FROM entry, json_tree(entry.bytes) AS tree
    WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND typeof(entry.bytes) = 'text'
      AND octet_length(entry.bytes) = ?`, position.seq, position.hash, position.bytes, position.bytes).toArray();
  const row = rows[0], visited = row?.["visited"], ats = row?.["ats"], seqs = row?.["seqs"], hashes = row?.["hashes"],
    subjects = row?.["subjects"], heads = row?.["heads"];
  if (rows.length !== 1 || !natural(visited) || visited === 0 || visited > position.bytes
    || !natural(ats) || !natural(seqs) || !natural(hashes) || !natural(subjects) || !natural(heads)) return stop("mismatch");
  const keys = ats + seqs + hashes + subjects + heads;
  const candidates = Math.min(ats, seqs, hashes) + Math.min(subjects, heads);
  if (!natural(keys) || keys > visited || !natural(candidates)) return stop("mismatch");
  return candidates;
}
