/** Fixed primary-key archive bookkeeping; no history/tree enumeration.
 * A caller confirms these updates in its archive receipt transaction. */
import type { RetainedKey } from "@generalbusiness/dap-derive";
import { checkedRetainedKey } from "@generalbusiness/dap-derive";
import { canonicalize, isHead, isRecord, isScopeRef, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";
import { JOURNAL_SELECTION_BYTES, JOURNAL_V2_LAST_POSITION, archiveRetainedPath } from "@generalbusiness/dap-git/journal";
import { ArchiveBudget } from "./archive-budget.ts";
import type { Sql, SqlValue } from "./sqlite.ts";
import { ARCHIVE_RETAINED_PASS_METADATA, ARCHIVE_RETAINED_PASS_WORK, ARCHIVE_RETAINED_CONFIRM_WORK, archiveConfirmedSelectionReservation } from "./archive-row-cost.ts";

type Key = Exclude<RetainedKey, { kind: "text" }>;
function primary(key: Key): { table: string; where: string; args: SqlValue[] } {
  archiveRetainedPath(key); // Includes the existing finite domain spelling bound.
  return key.kind === "value" ? { table: "retained_value", where: "domain = ? AND digest = ?", args: [key.domain, key.digest] }
    : { table: "retained_input", where: "kind = ? AND digest = ?", args: [key.kind, key.digest] };
}
export function readRetainedArchivePass(sql: Pick<Sql, "exec">, key: Key, budget: ArchiveBudget): number | null {
  const p = primary(key), rows = budget.native(sql, () => ({ metadata: ARCHIVE_RETAINED_PASS_METADATA, inputWork: ARCHIVE_RETAINED_PASS_WORK })).exec(
    `SELECT pass, typeof(pass) AS type FROM ${p.table} WHERE ${p.where} LIMIT 1`, ...p.args).toArray();
  if (rows.length !== 1) return budget.stop("unavailable");
  const pass = rows[0]?.["pass"];
  if (pass === null && rows[0]?.["type"] === "null") return null;
  if (rows[0]?.["type"] !== "integer" || typeof pass !== "number" || !Number.isSafeInteger(pass) || pass < 0 || pass > JOURNAL_V2_LAST_POSITION) return budget.stop("unavailable");
  return pass;
}
/** The native planner has already admitted the marked selection. Confirm
 * decodes only bounded key metadata, never bodies or today's retained set.
 * Its cost is this confirmation's work, not the old inventory cost again. */
export function confirmRetainedArchivePass(sql: Sql, manifest: string, budget: ArchiveBudget): { readonly first: number; readonly copies: number; readonly at: ScopeRef | null; readonly through: Head | null } {
  if (typeof manifest !== "string" || manifest.length > JOURNAL_SELECTION_BYTES) return budget.stop("limit");
  budget.spend(archiveConfirmedSelectionReservation(manifest.length));
  if (utf8(manifest).length > JOURNAL_SELECTION_BYTES) return budget.stop("limit");
  let value: unknown;
  try { value = parseStrict(manifest); if (canonicalize(value) !== manifest) return budget.stop("unavailable"); }
  catch { return budget.stop("unavailable"); }
  if (!isRecord(value) || value["format"] !== "artroom-local-inventory-2" || value["after"] !== null && !isHead(value["after"])
    || !Array.isArray(value["objects"]) || value["objects"].length > 512) return budget.stop("unavailable");
  const first = value["after"] === null ? 0 : value["after"].seq + 1;
  if (first > JOURNAL_V2_LAST_POSITION) return budget.stop("unavailable");
  const seen = new Set<string>(), keys: Key[] = []; let copies = 0;
  for (const raw of value["objects"]) {
    if (!isRecord(raw) || typeof raw["pass"] !== "number" || !Number.isSafeInteger(raw["pass"]) || raw["pass"] < 0 || raw["pass"] > first) return budget.stop("unavailable");
    let key: RetainedKey;
    try { key = checkedRetainedKey(raw["key"] as RetainedKey); } catch { return budget.stop("unavailable"); }
    const name = canonicalize(key);
    if (key.kind === "entry") copies++;
    if (seen.has(name)) return budget.stop("unavailable"); seen.add(name);
    if (raw["pass"] === first) keys.push(key);
  }
  for (const key of keys) {
    if (readRetainedArchivePass(sql, key, budget) !== null) return budget.stop("unavailable");
    const p = primary(key); budget.spend({ calls: 1, inputWork: ARCHIVE_RETAINED_CONFIRM_WORK });
    sql.exec(`UPDATE ${p.table} SET pass = ? WHERE ${p.where} AND pass IS NULL`, first, ...p.args).toArray();
    budget.check();
  }
  return { first, copies,
    at: isScopeRef(value["at"]) ? value["at"] : null, through: isHead(value["through"]) ? value["through"] : null };
}
