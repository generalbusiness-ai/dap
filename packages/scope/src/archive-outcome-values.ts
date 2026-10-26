/** Outcome values only; snapshots and ancestry are separate consumers.
 * The owner admits exact native pins, places and the whole prefix first.
 * Recognizing a callback here grants no permission to read/export bytes. */
import type { Bounds, Digest, Input, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isFactRef, isPlatformDefinition, natural } from "@generalbusiness/dap-bytes";
import { boundedRetainedDependencies, operationValueSelector, outcomeValueDependencies, type OperationRules, type PlannedRetainedDependency } from "@generalbusiness/dap-derive";
import { ARCHIVE_CERTIFIED_RULES_COHORT, RULES_CERTIFICATE_KIND, destinationEvidenceValues, rulesCertificateEvidenceValues } from "@generalbusiness/dap-platform";
import type { ArchiveBudget } from "./archive-budget.ts";
import { checkArchiveFieldSource, readArchiveDigestFields } from "./archive-digest-fields.ts";
import { stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";
import { sqlJsonText as text, type Sql } from "./sqlite.ts";

interface Owner { readonly name: string; readonly kind: string; readonly rules: OperationRules }
const knownValues = (name: string, kind: string, rules: OperationRules): void => {
  const selector = operationValueSelector(rules);
  if (selector === rulesCertificateEvidenceValues || name === ARCHIVE_CERTIFIED_RULES_COHORT.destination && kind === RULES_CERTIFICATE_KIND) {
    const domains = rules.valueDomains;
    if (selector !== rulesCertificateEvidenceValues || name !== ARCHIVE_CERTIFIED_RULES_COHORT.destination || kind !== RULES_CERTIFICATE_KIND
      || !Array.isArray(domains) || domains.length !== 2
      || domains[0]?.domain !== "artroom-rules-policy-1" || domains[0].max !== 262144
      || domains[1]?.domain !== "artroom-rules-tree-1" || domains[1].max !== 262144) return stop("unsupported-archive-cohort");
    return;
  }
  if (rules.values !== undefined && (selector !== destinationEvidenceValues || rules.valueDomains === undefined)) return stop("unsupported-archive-cohort");
};
/** Delivery's bounded FactRef scalar pattern, plus the two declared digests.
 * Only real source fields cross SQLite; no body, JSON array or invented fact
 * is returned. The native selector maps every malformed closed body to []. */
function certificateBody(sql: Pick<Sql, "exec">, position: ArchivePosition, budget: ArchiveBudget): unknown {
  budget.spend({ metadata: 512, inputWork: 1024 });
  const rows = budget.native(sql, () => ({ metadata: 1024, inputWork: position.bytes * 64 })).exec(`SELECT json_type(bytes, '$.input.evidence.body') = 'object' AS body_object,
    (SELECT count(*) FROM json_each(bytes, '$.input.evidence.body')) AS body_keys,
    ${text("$.input.evidence.body.proposal", 71)} AS proposal, ${text("$.input.evidence.body.proof", 71)} AS proof,
    json_type(bytes, '$.input.evidence.body.started') = 'object' AS started_object,
    (SELECT count(*) FROM json_each(bytes, '$.input.evidence.body.started')) AS started_keys,
    json_type(bytes, '$.input.evidence.body.started.at') = 'object' AS at_object,
    (SELECT count(*) FROM json_each(bytes, '$.input.evidence.body.started.at')) AS at_keys,
    ${text("$.input.evidence.body.started.at.scope", 71)} AS scope, ${text("$.input.evidence.body.started.at.inc", 64)} AS inc,
    ${text("$.input.evidence.body.started.at.kind", 16)} AS kind,
    CASE WHEN json_type(bytes, '$.input.evidence.body.started.seq') IN ('integer', 'real') THEN json_extract(bytes, '$.input.evidence.body.started.seq') ELSE NULL END AS seq,
    ${text("$.input.evidence.body.started.hash", 71)} AS hash
    FROM entry WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND typeof(entry.bytes) = 'text' AND octet_length(entry.bytes) = ?
      AND json_extract(entry.bytes, '$.input.type') = 'outcome' LIMIT 1`, position.seq, position.hash, position.bytes, position.bytes).toArray();
  if (rows.length !== 1) return stop("mismatch");
  const row = rows[0], proposal = row?.["proposal"], proof = row?.["proof"];
  const started = { at: { scope: row?.["scope"], inc: row?.["inc"], kind: row?.["kind"] }, seq: row?.["seq"], hash: row?.["hash"] };
  if (row?.["body_object"] !== 1 || row["body_keys"] !== 3 || row["started_object"] !== 1 || row["started_keys"] !== 3
    || row["at_object"] !== 1 || row["at_keys"] !== 3 || !isDigest(proposal) || !isDigest(proof) || !isFactRef(started)) return null;
  return { proposal, proof, started };
}

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
        knownValues(name, kind, rules);
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
    const held = this.#owners[slot]!, rules = held.rules;
    knownValues(held.name, held.kind, rules); // A mutable caller table cannot change the callback behind a compiled slot.
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
    const { owner, kind, rules } = this.context(sql, position);
    const domains = rules.valueDomains?.length ?? 0;
    this.budget.spend({ metadata: 512 + domains * 256, inputWork: 1024 + domains * 512 });
    let body: unknown;
    if (operationValueSelector(rules) === rulesCertificateEvidenceValues) {
      body = certificateBody(sql, position, this.budget);
      knownValues(owner, kind, rules); // Recheck after the supplied synchronous SQL port, before invoking any callback.
    } else {
      let digest: Digest | null = null;
      if (rules.values !== undefined) digest = readArchiveDigestFields(sql, position, ["$.input.evidence.body.changes"], this.budget)[0] ?? null;
      body = digest === null ? null : { changes: digest };
    }
    const origin = { at: { at: { ...at }, seq: position.seq, hash: position.hash }, input: "outcome" as const };
    // Each recognized callback sees exactly its bounded body grammar. Basis
    // has no role in either selector; native outcome authority is separate.
    const values = outcomeValueDependencies(origin, rules, { basis: "own-answer", body });
    if (values === null) return stop("unsupported-archive-cohort");
    return boundedRetainedDependencies(values.map(({ dependency, value }) => ({ dependency, max: value.max })), this.bounds);
  }
}
