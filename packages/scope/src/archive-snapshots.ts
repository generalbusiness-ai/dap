/** Scalar snapshot references for an already admitted native outcome.
 * Selector views preserve the native shape tests; they are neither ancestry
 * records nor evidence of a walk. No retained body is read here. */
import type { Digest, Input, ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest, natural } from "@generalbusiness/dap-bytes";
import { HOLD, HOLD_KINDS, holdEvidenceSnapshots, outcomeSnapshotDependencies, type OperationRules } from "@generalbusiness/dap-derive";
import type { ArchiveBudget } from "./archive-budget.ts";
import { checkArchiveFieldSource } from "./archive-digest-fields.ts";
import { stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";
import type { Sql, SqlValue } from "./sqlite.ts";

type Row = Record<string, SqlValue>;
type Context = Pick<Extract<Input, { type: "outcome" }>, "owner" | "kind" | "result">;
// Paths and tags below belong to this native selector, never to an entry.
const type = (path: string) => `json_type(doc, '${path}')`;
const val = (path: string) => `json_extract(doc, '${path}')`;
const text = (path: string, max = 128) => `CASE WHEN ${type(path)} = 'text' AND length(${val(path)}) <= ${max} THEN ${val(path)} ELSE NULL END`;
const number = (path: string) => `CASE WHEN ${type(path)} IN ('integer', 'real') THEN ${val(path)} ELSE NULL END`;
const tag = (path: string, tags: readonly string[]) => `CASE ${val(path)} ${tags.map(t => `WHEN '${t}' THEN '${t}'`).join(" ")} ELSE NULL END`;
const count = (path: string) => `(SELECT count(*) FROM json_each(CASE WHEN ${type(path)} = 'object' THEN ${val(path)} ELSE '{}' END))`;
const factColumns = (path: string) => [
  `${type(path)} = 'object' AS fact_object`, `${count(path)} AS fact_keys`,
  `${type(`${path}.at`)} = 'object' AS at_object`, `${count(`${path}.at`)} AS at_keys`,
  `${text(`${path}.at.scope`)} AS scope`, `${text(`${path}.at.inc`)} AS inc`, `${text(`${path}.at.kind`)} AS scope_kind`,
  `${number(`${path}.seq`)} AS seq`, `${text(`${path}.hash`, 71)} AS hash`,
].join(", ");
const fact = (r: Row): unknown => r["fact_object"] !== 1 || r["fact_keys"] !== 3 || r["at_object"] !== 1 || r["at_keys"] !== 3
  ? null : { at: { scope: r["scope"], inc: r["inc"], kind: r["scope_kind"] }, seq: r["seq"], hash: r["hash"] };

export function projectArchiveSnapshots(sql: Pick<Sql, "exec">, at: ScopeRef, position: ArchivePosition,
  context: Context, rules: OperationRules, budget: ArchiveBudget) {
  checkArchiveFieldSource(position);
  if (rules.retains !== undefined && rules.retains !== holdEvidenceSnapshots) return stop("unsupported-archive-cohort");
  // No native selector can name a snapshot in this case. The caller owns
  // source classification, including this exact owner/kind/result context.
  if (rules.retains === undefined && !(context.owner === HOLD && context.kind === HOLD_KINDS.check && context.result === "confirmed")) {
    budget.check(); return { dependencies: [], ancestrySnapshot: null };
  }
  const args: SqlValue[] = [position.seq, position.hash, position.bytes, position.bytes, context.owner, context.kind, context.result];
  const source = `SELECT bytes FROM entry WHERE seq = ? AND hash = ? AND size = ? AND typeof(bytes) = 'text' AND octet_length(bytes) = ?
    AND json_extract(bytes, '$.input.type') = 'outcome' AND json_extract(bytes, '$.input.owner') = ?
    AND json_extract(bytes, '$.input.kind') = ? AND json_extract(bytes, '$.input.result') = ? LIMIT 1`;
  // MATERIALIZED prevents repeated extraction of the record as the fixed
  // scalar expressions inspect it. Only the final scalar columns escape SQL.
  const cte = `WITH source AS MATERIALIZED (${source}), record AS MATERIALIZED (
    SELECT CASE WHEN json_type(bytes, '$.input.evidence.body.record') = 'object'
      THEN json_extract(bytes, '$.input.evidence.body.record') ELSE '{}' END AS doc FROM source)`;
  const run = (query: string, metadata: number, work: number) => budget.native(sql, () => ({ metadata, inputWork: work })).exec(query, ...args).toArray();
  const sizes = run(`SELECT json_type(bytes, '$.input.evidence.body.record') = 'object' AS present,
    CASE WHEN json_type(bytes, '$.input.evidence.body.record') = 'object' THEN octet_length(json_extract(bytes, '$.input.evidence.body.record')) ELSE 0 END AS size,
    (SELECT count(*) FROM json_each(CASE WHEN json_type(bytes, '$.input.evidence.body') = 'object' THEN json_extract(bytes, '$.input.evidence.body') ELSE '{}' END)) AS body_keys
    FROM (${source})`, 128, position.bytes * 32);
  if (sizes.length !== 1) return stop("mismatch");
  const size = sizes[0]!["size"];
  if (!natural(size) || size > position.bytes) return stop("mismatch");
  if (sizes[0]!["present"] !== 1) return { dependencies: [], ancestrySnapshot: null };
  budget.spend({ metadata: 4096, inputWork: size * 256 });
  const headers = run(`SELECT * FROM (${cte} SELECT
    ${text("$.commit", 64)} AS commit_id, ${text("$.head", 64)} AS head_id, ${number("$.visited")} AS visited,
    ${number("$.root.number")} AS root_number, ${tag("$.root.state", ["live"])} AS root_state,
    ${text("$.snapshot.digest", 71)} AS digest, ${number("$.snapshot.count")} AS snapshot_count,
    ${type("$.start")} = 'object' AS start_object, ${count("$.start")} AS start_keys,
    ${type("$.start.foreign")} AS foreign_type, ${type("$.start.published")} = 'true' AS published,
    ${type("$.start.basis")} = 'object' AS basis_object, ${tag("$.start.basis.kind", ["row", "own-check", "input"])} AS basis_kind,
    ${type("$.stops")} = 'array' AS stops_array, json_array_length(doc, '$.stops') AS stops_count,
    ${type("$.F")} = 'array' AS f_array, json_array_length(doc, '$.F') AS f_count
    FROM record)`, 2048, position.bytes * 16 + size * 64);
  if (headers.length !== 1) return stop("mismatch");
  const h = headers[0]!, ns = h["stops_count"], nf = h["f_count"];
  if (h["stops_array"] !== 1 || h["f_array"] !== 1 || !natural(ns) || !natural(nf)) return { dependencies: [], ancestrySnapshot: null };
  // Reserve the selector arrays and all projected rows before constructing
  // either. Their actual count is bounded by the original pass allowance.
  budget.spend({ metadata: (ns + nf) * 1024, inputWork: (ns + nf) * 2048 });
  const basisKind = h["basis_kind"], basisPath = basisKind === "own-check" ? "$.start.basis.checked" : "$.start.basis.input";
  const basisRows = h["basis_object"] === 1 && (basisKind === "own-check" || basisKind === "input")
    ? run(`SELECT * FROM (${cte} SELECT ${factColumns(basisPath)} FROM record)`, 1024, position.bytes * 16 + size * 128) : [];
  const basis = h["basis_object"] !== 1 ? null : { kind: basisKind, ...(basisKind === "own-check" ? { checked: fact(basisRows[0] ?? {}) } : basisKind === "input" ? { input: fact(basisRows[0] ?? {}) } : {}) };
  let start: unknown = null;
  if (h["start_object"] === 1) {
    const foreign = h["foreign_type"] === "null" ? null : h["foreign_type"] === "text" ? "" : false;
    const candidate = foreign === null ? { foreign } : h["published"] === 1 ? { foreign, published: true } : { foreign, basis };
    start = Object.keys(candidate).length === h["start_keys"] ? candidate : null;
  }
  const items = (path: "stops" | "F") => `${cte}, items AS MATERIALIZED (
    SELECT key AS slot, type = 'object' AS object, CASE WHEN type = 'object' THEN value ELSE '{}' END AS doc
    FROM record, json_each(record.doc, '$.${path}'))`;
  const stopsRows = ns === 0 ? [] : run(`SELECT * FROM (${items("stops")} SELECT slot, object,
    ${text("$.commit", 64)} AS commit_id, ${tag("$.kind", ["own-root", "selected-report"])} AS kind,
    ${number("$.root")} AS root_number, ${tag("$.state", ["live", "retiring", "retired"])} AS state,
    ${factColumns("$.checked")} FROM items WHERE ${val("$.kind")} = 'own-root'
    UNION ALL SELECT slot, object, ${text("$.commit", 64)}, ${tag("$.kind", ["own-root", "selected-report"])},
    ${number("$.root")}, ${tag("$.state", ["live", "retiring", "retired"])}, ${factColumns("$.input")}
    FROM items WHERE ${val("$.kind")} IS NOT 'own-root' ORDER BY slot LIMIT ${ns + 1})`, ns * 1024, position.bytes * 16 + size * 256);
  const fRows = nf === 0 ? [] : run(`SELECT * FROM (${items("F")} SELECT slot, object,
    ${text("$.commit", 64)} AS commit_id, ${type("$.via")} IS NOT NULL AS via_present, ${text("$.via", 64)} AS via,
    ${count("$")} AS keys, ${type("$.ref")} = 'text' AS ref_text,
    CASE WHEN ${type("$.start")} IS NULL THEN 'absent' WHEN ${type("$.start")} = 'true' THEN 'true' ELSE 'invalid' END AS start
    FROM items ORDER BY slot LIMIT ${nf + 1})`, nf * 512, position.bytes * 16 + size * 64);
  const checkedRows = (rows: Row[], n: number) => {
    if (rows.length !== n || rows.some((r, i) => r["slot"] !== i)) return stop("mismatch");
    return rows;
  };
  const stops = checkedRows(stopsRows, ns).map(r => r["object"] !== 1 ? null : r["kind"] === "own-root"
    ? { kind: r["kind"], commit: r["commit_id"], root: r["root_number"], state: r["state"], checked: fact(r) }
    : { kind: r["kind"], commit: r["commit_id"], input: fact(r) });
  const F = checkedRows(fRows, nf).map(r => r["object"] !== 1 ? null : r["via_present"] === 1
    ? r["keys"] === 2 ? { commit: r["commit_id"], via: r["via"] } : null
    : { commit: r["commit_id"], ref: r["ref_text"] === 1 ? "" : null, ...(r["start"] === "absent" ? {} : { start: r["start"] === "true" }) });
  const record = { commit: h["commit_id"], head: h["head_id"], visited: h["visited"],
    root: { number: h["root_number"], state: h["root_state"] }, snapshot: { digest: h["digest"], count: h["snapshot_count"] }, start, stops, F };
  const body = sizes[0]!["body_keys"] === 1 ? { record } : { record, extra: true };
  const origin = { at: { at: { ...at }, seq: position.seq, hash: position.hash }, input: "outcome" as const };
  const result = outcomeSnapshotDependencies(origin, { ...context, evidence: { basis: "own-answer", body } }, () => rules);
  if (!result.readable) return stop("unsupported-archive-cohort");
  const snapshot = result.record?.snapshot;
  if (snapshot && (!isDigest(snapshot.digest) || !natural(snapshot.count))) return stop("mismatch");
  // Do not expose the selector-only reconstruction as a recorded ancestry.
  return { dependencies: result.dependencies, ancestrySnapshot: snapshot ? { digest: snapshot.digest as Digest, count: snapshot.count } : null };
}
