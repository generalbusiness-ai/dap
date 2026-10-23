/** Outcome values only; snapshots and ancestry are separate consumers.
 * The owner admits exact native pins, places and the whole prefix first.
 * Recognizing a callback here grants no permission to read/export bytes. */
import type { Bounds, Digest, Input, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isPlatformDefinition, natural } from "@generalbusiness/dap-bytes";
import { boundedRetainedDependencies, operationValueSelector, outcomeValueDependencies, type OperationRules, type PlannedRetainedDependency } from "@generalbusiness/dap-derive";
import { destinationEvidenceValues } from "@generalbusiness/dap-platform";
import type { ArchiveBudget } from "./archive-budget.ts";
import { checkArchiveFieldSource, readArchiveDigestFields } from "./archive-digest-fields.ts";
import { stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";
import type { Sql } from "./sqlite.ts";

interface Owner { readonly name: string; readonly kind: string; readonly rules: OperationRules }
const knownValues = (rules: OperationRules): void => {
  const selector = operationValueSelector(rules);
  if (rules.values !== undefined && (selector !== destinationEvidenceValues || rules.valueDomains === undefined)) return stop("unsupported-archive-cohort");
};
/** Reusable schema state holds no SQL port. Each call uses the owning
 * synchronous native frame's supplied port and the same original budget. */
export class ArchiveOutcomeValues {
  readonly #owners: readonly Owner[];
  readonly #names: string;
  constructor(owners: ReadonlyMap<string, ReadonlyMap<string, OperationRules>>,
    readonly budget: ArchiveBudget, readonly bounds: Pick<Bounds, "definitionBytes">) {
    budget.spend({ metadata: 512, inputWork: 512 });
    if (owners.size > 64) stop("limit");
    const rows: Owner[] = [], names: { owner: string; kind: string }[] = [];
    for (const [name, kinds] of owners) {
      if (!name || name.length > 128 || kinds.size > 64) stop("limit");
      for (const [kind, rules] of kinds) {
        if (!kind || kind.length > 128) stop("limit");
        budget.spend({ metadata: 512 + (name.length + kind.length) * 8, inputWork: 1024 + (name.length + kind.length) * 24 });
        knownValues(rules);
        rows.push(Object.freeze({ name, kind, rules })); names.push({ owner: name, kind });
      }
    }
    this.#owners = rows; this.#names = canonicalize(names);
  }
  /** Actual source owner/kind matched against the trusted native table.
   * Only its slot and a fixed result token cross SQLite. */
  context(sql: Pick<Sql, "exec">, position: ArchivePosition): Pick<Extract<Input, { type: "outcome" }>, "owner" | "kind" | "result"> & { readonly rules: OperationRules } {
    checkArchiveFieldSource(position);
    const rows = this.budget.native(sql, () => ({ metadata: 128,
      inputWork: position.bytes * (16 + this.#owners.length * 8) + this.#names.length * 24,
    })).exec(`SELECT known.key AS slot,
      CASE json_extract(entry.bytes, '$.input.result') WHEN 'confirmed' THEN 'confirmed' WHEN 'refused' THEN 'refused' WHEN 'unknown' THEN 'unknown' ELSE NULL END AS result
      FROM entry LEFT JOIN json_each(?) AS known
      ON json_extract(known.value, '$.owner') = json_extract(entry.bytes, '$.input.owner')
        AND json_extract(known.value, '$.kind') = json_extract(entry.bytes, '$.input.kind')
      WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND typeof(entry.bytes) = 'text' AND octet_length(entry.bytes) = ?
        AND json_extract(entry.bytes, '$.input.type') = 'outcome' LIMIT 2`,
      this.#names, position.seq, position.hash, position.bytes, position.bytes).toArray();
    const slot = rows[0]?.["slot"];
    if (rows.length !== 1) return stop("mismatch");
    if (slot === null) return stop("unsupported-archive-cohort");
    if (!natural(slot) || !this.#owners[slot]) return stop("mismatch");
    const rules = this.#owners[slot]!.rules;
    knownValues(rules); // A mutable caller table cannot change the callback behind a compiled slot.
    const result = rows[0]!["result"];
    if (result !== "confirmed" && result !== "refused" && result !== "unknown") return stop("mismatch");
    const owner = this.#owners[slot]!.name;
    // Match the supported native owner families. Exact code/pin policy is
    // checked separately; this creates no admission certificate.
    if (owner !== "hold@1" && owner !== "git-read@1" && !isPlatformDefinition(owner)) return stop("unsupported-archive-cohort");
    this.budget.spend({ metadata: 256, inputWork: 512 });
    return { owner, kind: this.#owners[slot]!.kind, result, rules };
  }
  project(sql: Pick<Sql, "exec">, at: ScopeRef, position: ArchivePosition): readonly PlannedRetainedDependency[] {
    const { rules } = this.context(sql, position);
    const domains = rules.valueDomains?.length ?? 0;
    this.budget.spend({ metadata: 512 + domains * 256, inputWork: 1024 + domains * 512 });
    let digest: Digest | null = null;
    if (rules.values !== undefined) digest = readArchiveDigestFields(sql, position, ["$.input.evidence.body.changes"], this.budget)[0] ?? null;
    const origin = { at: { at: { ...at }, seq: position.seq, hash: position.hash }, input: "outcome" as const };
    // The recognized native callback reads only this object/digest test;
    // basis and all other evidence fields have no role in value selection.
    const values = outcomeValueDependencies(origin, rules, { basis: "own-answer", body: digest === null ? null : { changes: digest } });
    if (values === null) return stop("unsupported-archive-cohort");
    return boundedRetainedDependencies(values.map(({ dependency, value }) => ({ dependency, max: value.max })), this.bounds);
  }
}
