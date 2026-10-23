/** Prepared-rule references from native scalar metadata. The owning pass
 * separately binds the scope, admits the prefix and validates its bytes. */
import type { Bounds, Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, natural } from "@generalbusiness/dap-bytes";
import { preparedRuleDependencies, type PlannedRetainedDependency, type ValidDefinition } from "@generalbusiness/dap-derive";
import { ARCHIVE_BOUNDS, type ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_DIGEST_FIELD_BATCH, checkArchiveFieldSource, readArchiveDigestFields } from "./archive-digest-fields.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import type { ArchivePrivacyPosition } from "./archive-privacy.ts";
import type { Sql } from "./sqlite.ts";
import { reserveArchiveNames } from "./archive-schema-cost.ts";

/** Reusable schema state holds no SQL port. Each call uses the owning
 * synchronous native frame's supplied port and the same original budget. */
export class ArchivePrepared {
  readonly #rules: string;
  readonly #ruleCount: number;
  constructor(readonly definition: ValidDefinition,
    readonly budget: ArchiveBudget, bounds: Pick<Bounds, "definitionBytes">) {
    budget.spend({ metadata: bounds.definitionBytes, inputWork: bounds.definitionBytes * 16 });
    const names = Object.keys(definition.declared.rules);
    reserveArchiveNames(names, budget);
    this.#rules = canonicalize(names); this.#ruleCount = names.length;
  }
  project(sql: Pick<Sql, "exec">, at: ScopeRef, position: ArchivePrivacyPosition): readonly PlannedRetainedDependency[] {
    checkArchiveFieldSource(position);
    const rows = this.budget.native(sql, () => ({ metadata: 128, inputWork: position.bytes * 8 })).exec(`SELECT entry.seq AS seq,
      json_type(entry.bytes, '$.prepared') AS type, json_array_length(entry.bytes, '$.prepared') AS count
      FROM entry WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND typeof(entry.bytes) = 'text' AND octet_length(entry.bytes) = ?
        AND json_extract(entry.bytes, '$.input.type') = ? LIMIT 1`,
      position.seq, position.hash, position.bytes, position.bytes, position.input).toArray();
    const row = rows[0], count = row?.["count"];
    if (rows.length !== 1 || row?.["seq"] !== position.seq || row["type"] !== "array" || !natural(count)) return stop("mismatch");
    // Each prepared record requires a real retained request even on a
    // cache hit. More than the original attempt ceiling cannot fit one entry.
    if (count > ARCHIVE_BOUNDS.attempts) return stop("limit");
    if (count === 0) return [];
    this.budget.spend({ metadata: count * 512, inputWork: count * 1024 });
    const named = this.budget.native(sql, () => ({ metadata: count * 256,
      inputWork: position.bytes * (16 + this.#ruleCount * 2) + count * this.#rules.length * 24,
    })).exec(`SELECT prepared.key AS slot, known.value AS rule FROM entry, json_each(entry.bytes, '$.prepared') AS prepared
      LEFT JOIN json_each(?) AS known ON known.type = 'text'
        AND json_type(prepared.value, '$.rule') = 'text' AND known.value = json_extract(prepared.value, '$.rule')
      WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND typeof(entry.bytes) = 'text' AND octet_length(entry.bytes) = ?
      ORDER BY prepared.key LIMIT ?`, this.#rules, position.seq, position.hash, position.bytes, position.bytes, count + 1).toArray();
    if (named.length !== count) return stop("mismatch");
    const digests: (Digest | null)[] = [];
    for (let offset = 0; offset < count; offset += ARCHIVE_DIGEST_FIELD_BATCH) {
      const length = Math.min(ARCHIVE_DIGEST_FIELD_BATCH, count - offset);
      digests.push(...readArchiveDigestFields(sql, position, Array.from({ length }, (_, index) => `$.prepared[${offset + index}].input`), this.budget));
    }
    const prepared = named.map((record, index) => {
      if (record["slot"] !== index || typeof record["rule"] !== "string") return stop("unsupported-archive-cohort");
      const input = digests[index]; if (!input) return stop("mismatch");
      return { rule: record["rule"], input };
    });
    return preparedRuleDependencies(this.definition, { at: { at: { ...at }, seq: position.seq, hash: position.hash }, input: position.input }, prepared);
  }
}
