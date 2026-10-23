/** Scalar references to observed values. Root policy and whole-prefix
 * admission remain with the owner; this never reads a retained body. */
import { RETAINED_INPUT_BYTES, type Bounds, type Digest, type ScopeRef } from "@generalbusiness/dap-contract";
import { natural } from "@generalbusiness/dap-bytes";
import { observationDependency, observationValueDigests, retainsOf, type PlannedRetainedDependency, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_DIGEST_FIELD_BATCH, checkArchiveFieldSource, readArchiveDigestFields } from "./archive-digest-fields.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import type { ArchivePrivacyPosition } from "./archive-privacy.ts";
import type { Sql } from "./sqlite.ts";

const MATCH = `json_extract(observed.value, '$.observation.subject') = 'rules'
  AND json_extract(observed.value, '$.observation.content.asked') = 'rules'
  AND json_type(observed.value, '$.observation.content.extents') IS NOT NULL`;
const SOURCE = `entry.seq = ? AND entry.hash = ? AND entry.size = ? AND typeof(entry.bytes) = 'text' AND octet_length(entry.bytes) = ?`;

/** Reusable schema state holds no SQL port. Each call uses the owning
 * synchronous native frame's supplied port and the same original budget. */
export class ArchiveObserved {
  readonly #domains: readonly string[];
  constructor(readonly definition: ValidDefinition, readonly budget: ArchiveBudget, bounds: Pick<Bounds, "definitionBytes">) {
    budget.spend({ metadata: bounds.definitionBytes, inputWork: bounds.definitionBytes * 16 });
    this.#domains = definition.observing ? retainsOf(definition) : [];
  }
  project(sql: Pick<Sql, "exec">, at: ScopeRef, position: ArchivePrivacyPosition): readonly PlannedRetainedDependency[] {
    this.budget.check(); checkArchiveFieldSource(position);
    // These are the owning classifier's actual input tag and validated
    // root. Native planning reads no observed values outside this grammar.
    if (!this.definition.observing || !["act", "delivery", "outcome"].includes(position.input)) return [];
    const args = [position.seq, position.hash, position.bytes, position.bytes];
    const header = this.budget.native(sql, () => ({ metadata: 128, inputWork: position.bytes * 8 })).exec(`SELECT entry.seq AS seq,
      json_type(entry.bytes, '$.input.observed') AS type, json_array_length(entry.bytes, '$.input.observed') AS count
      FROM entry WHERE ${SOURCE} AND json_extract(entry.bytes, '$.input.type') = ? LIMIT 1`, ...args, position.input).toArray();
    const first = header[0];
    if (header.length !== 1 || first?.["seq"] !== position.seq) return stop("mismatch");
    if (first["type"] === null) return [];
    if (first["type"] !== "array" || !natural(first["count"])) return stop("mismatch");
    const total = first["count"];
    if (total === 0) return [];
    const counted = this.budget.native(sql, () => ({ metadata: 64, inputWork: position.bytes * 16 })).exec(`SELECT count(*) AS count
      FROM entry, json_each(entry.bytes, '$.input.observed') AS observed WHERE ${SOURCE} AND ${MATCH}`, ...args).toArray();
    const count = counted[0]?.["count"];
    if (counted.length !== 1 || !natural(count) || count > total) return stop("mismatch");
    if (count === 0) return [];
    // Charge the actual selected metadata count, not a guessed retained
    // ceiling. Non-rules observations never become dependency candidates.
    this.budget.spend({ metadata: count * (512 + this.#domains.length * 256), inputWork: count * (1024 + this.#domains.length * 512) });
    const slots = this.budget.native(sql, () => ({ metadata: count * 128, inputWork: position.bytes * 16 })).exec(`SELECT observed.key AS slot,
      'rules' AS subject, 'rules' AS asked FROM entry, json_each(entry.bytes, '$.input.observed') AS observed
      WHERE ${SOURCE} AND ${MATCH} ORDER BY observed.key LIMIT ?`, ...args, count + 1).toArray();
    if (slots.length !== count) return stop("mismatch");
    const paths: string[] = []; let previous = -1;
    for (const slot of slots) {
      const index = slot["slot"];
      if (!natural(index) || index <= previous || index >= total || slot["subject"] !== "rules" || slot["asked"] !== "rules") return stop("mismatch");
      paths.push(`$.input.observed[${index}].observation.content.extents`); previous = index;
    }
    const cells: (Digest | null)[] = [];
    for (let offset = 0; offset < paths.length; offset += ARCHIVE_DIGEST_FIELD_BATCH) cells.push(...readArchiveDigestFields(sql, position, paths.slice(offset, offset + ARCHIVE_DIGEST_FIELD_BATCH), this.budget));
    const origin = { at: { at: { ...at }, seq: position.seq, hash: position.hash }, input: position.input };
    const planned: PlannedRetainedDependency[] = [];
    for (const cell of cells) {
      if (cell === null) return stop("mismatch");
      for (const digest of observationValueDigests("rules", { asked: "rules", extents: cell })) planned.push({ dependency: observationDependency(origin, digest, this.#domains), max: RETAINED_INPUT_BYTES });
    }
    return planned;
  }
}
