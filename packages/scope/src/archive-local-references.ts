/** Compose scalar references in the native local planner's order. The
 * caller supplies actual classified context inside its synchronous frame;
 * this grants no pin, privacy, body-read or export admission. */
import { RETAINED_INPUT_BYTES, type Bounds, type Digest, type FactRef, type Input, type ScopeRef } from "@generalbusiness/dap-contract";
import { isFactRef, natural } from "@generalbusiness/dap-bytes";
import { boundedRetainedDependencies, requiredDependency, type PlannedRetainedDependency } from "@generalbusiness/dap-derive";
import type { ArchiveBudget } from "./archive-budget.ts";
import { ArchiveActFields } from "./archive-act-fields.ts";
import { ArchiveDeliveryFields } from "./archive-delivery-fields.ts";
import { ArchiveGenesisFields } from "./archive-genesis-fields.ts";
import { ArchiveObserved } from "./archive-observed.ts";
import { ArchiveOutcomeValues } from "./archive-outcome-values.ts";
import { ArchivePrepared } from "./archive-prepared.ts";
import { projectArchiveSnapshots } from "./archive-snapshots.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import type { ArchivePrivacyPosition, ArchiveSupport } from "./archive-privacy.ts";
import { sqlJsonText as text, type Sql } from "./sqlite.ts";
import { ARCHIVE_DIGEST_FIELD_BATCH, checkArchiveFieldSource, readArchiveDigestFields } from "./archive-digest-fields.ts";
import type { ArchiveForeignMetadata } from "./archive-foreign.ts";

export type ArchiveReferenceContext =
  | { readonly input: Exclude<Input["type"], "delivery" | "outcome"> }
  | { readonly input: "delivery"; readonly from: FactRef; readonly under?: string }
  | ({ readonly input: "outcome" } & Pick<Extract<Input, { type: "outcome" }>, "owner" | "kind" | "result">);
export interface ArchiveLocalReferencePlan {
  readonly dependencies: readonly PlannedRetainedDependency[];
  readonly ancestrySnapshot: { readonly digest: Digest; readonly count: number } | null;
}

/** Reusable schema state holds no SQL port. Each call uses the owning
 * synchronous native frame's supplied port and the same original budget. */
export class ArchiveLocalReferences {
  #prepared?: ArchivePrepared;
  #acts?: ArchiveActFields;
  #genesis?: ArchiveGenesisFields;
  #delivery?: ArchiveDeliveryFields;
  #observed?: ArchiveObserved;
  #values?: ArchiveOutcomeValues;
  constructor(readonly support: ArchiveSupport,
    readonly bounds: Bounds, readonly budget: ArchiveBudget) {}

  /** Read actual context/uses from the classified exact row. This still
   * belongs to the owner's synchronous, whole-prefix metadata stage. */
  read(sql: Pick<Sql, "exec">, at: ScopeRef, position: ArchivePrivacyPosition, foreign?: Pick<ArchiveForeignMetadata, "source">): ArchiveLocalReferencePlan {
    checkArchiveFieldSource(position);
    const source = "seq = ? AND hash = ? AND size = ? AND typeof(bytes) = 'text' AND octet_length(bytes) = ? AND json_extract(bytes, '$.input.type') = ?";
    const args = [position.seq, position.hash, position.bytes, position.bytes, position.input];
    const counts = this.budget.native(sql, () => ({ metadata: 128, inputWork: position.bytes * 16 })).exec(
      `SELECT json_type(bytes, '$.uses') AS type, json_array_length(bytes, '$.uses') AS count FROM entry WHERE ${source} LIMIT 1`, ...args).toArray();
    const count = counts[0]?.["count"];
    if (counts.length !== 1 || counts[0]?.["type"] !== "array" || !natural(count)) return stop("mismatch");
    if (count > this.bounds.usesPerEntry) return stop("limit");
    this.budget.spend({ metadata: count * 256, inputWork: count * 512 });
    const uses: Digest[] = [];
    for (let offset = 0; offset < count; offset += ARCHIVE_DIGEST_FIELD_BATCH) {
      const length = Math.min(ARCHIVE_DIGEST_FIELD_BATCH, count - offset);
      const digests = readArchiveDigestFields(sql, position, Array.from({ length }, (_, n) => `$.uses[${offset + n}].content`), this.budget);
      for (const digest of digests) { if (digest === null) return stop("mismatch"); uses.push(digest); }
    }
    let context: ArchiveReferenceContext;
    if (position.input === "outcome") {
      this.#values ??= new ArchiveOutcomeValues(this.support.owners, this.budget, this.bounds);
      const { owner, kind, result } = this.#values.context(sql, position);
      context = { input: "outcome", owner, kind, result };
    } else if (position.input === "delivery") {
      const rows = this.budget.native(sql, () => ({ metadata: 1024, inputWork: position.bytes * 64 })).exec(`SELECT json_type(bytes, '$.input.from') = 'object' AS object,
        (SELECT count(*) FROM json_each(bytes, '$.input.from')) AS keys,
        json_type(bytes, '$.input.from.at') = 'object' AS at_object,
        (SELECT count(*) FROM json_each(bytes, '$.input.from.at')) AS at_keys,
        ${text("$.input.from.at.scope", 71)} AS scope, ${text("$.input.from.at.inc", 64)} AS inc, ${text("$.input.from.at.kind", 16)} AS kind,
        CASE WHEN json_type(bytes, '$.input.from.seq') IN ('integer', 'real') THEN json_extract(bytes, '$.input.from.seq') ELSE NULL END AS seq, ${text("$.input.from.hash", 71)} AS hash
        FROM entry WHERE ${source} LIMIT 1`, ...args).toArray();
      const row = rows[0], from = { at: { scope: row?.["scope"], inc: row?.["inc"], kind: row?.["kind"] }, seq: row?.["seq"], hash: row?.["hash"] };
      if (rows.length !== 1 || row?.["object"] !== 1 || row["keys"] !== 3 || row["at_object"] !== 1 || row["at_keys"] !== 3 || !isFactRef(from)) return stop("mismatch");
      this.#delivery ??= new ArchiveDeliveryFields(this.support.definition, this.budget, this.bounds);
      let under: string | undefined;
      if (this.#delivery.needsUnder) {
        const sender = foreign?.source(from);
        if (!sender) return stop("unsupported-foreign-copy");
        under = sender.under;
      }
      context = { input: "delivery", from, ...(under === undefined ? {} : { under }) };
    } else context = { input: position.input };
    return this.project(sql, at, position, context, uses);
  }

  project(sql: Pick<Sql, "exec">, at: ScopeRef, position: ArchivePrivacyPosition, context: ArchiveReferenceContext,
    uses: readonly Digest[]): ArchiveLocalReferencePlan {
    this.budget.check();
    if (position.input !== context.input) return stop("mismatch");
    if (uses.length > this.bounds.usesPerEntry) return stop("limit");
    const definition = this.support.definition, dependencies: PlannedRetainedDependency[] = [];
    const append = (plans: readonly PlannedRetainedDependency[]) => {
      this.budget.spend({ metadata: plans.length * 256, inputWork: plans.length * 512 });
      dependencies.push(...plans);
    };
    const origin = { at: { at: { ...at }, seq: position.seq, hash: position.hash }, input: position.input };
    this.budget.spend({ metadata: uses.length * 512, inputWork: uses.length * 1024 });
    for (const digest of uses) dependencies.push({ dependency: requiredDependency(origin, "foreign-use", { kind: "entry", digest }), max: RETAINED_INPUT_BYTES });
    this.#prepared ??= new ArchivePrepared(definition, this.budget, this.bounds);
    append(this.#prepared.project(sql, at, position));
    if (context.input === "genesis") {
      this.#genesis ??= new ArchiveGenesisFields(definition, this.budget, this.bounds);
      append(this.#genesis.project(sql, at, position));
    } else if (context.input === "act") {
      this.#acts ??= new ArchiveActFields(definition, this.budget, this.bounds);
      append(this.#acts.project(sql, at, position).dependencies);
    } else if (context.input === "delivery") {
      this.#delivery ??= new ArchiveDeliveryFields(definition, this.budget, this.bounds);
      append(this.#delivery.project(sql, at, position, context.from, context.under));
    }
    if (definition.observing && ["act", "delivery", "outcome"].includes(context.input)) {
      this.#observed ??= new ArchiveObserved(definition, this.budget, this.bounds);
      append(this.#observed.project(sql, at, position));
    }
    let ancestrySnapshot: ArchiveLocalReferencePlan["ancestrySnapshot"] = null;
    if (context.input === "outcome") {
      const rules = this.support.owners.get(context.owner)?.get(context.kind);
      if (!rules) return stop("unsupported-archive-cohort");
      const snapshots = projectArchiveSnapshots(sql, at, position, context, rules, this.budget);
      this.budget.spend({ metadata: snapshots.dependencies.length * 256, inputWork: snapshots.dependencies.length * 512 });
      append(snapshots.dependencies.map(dependency => ({ dependency, max: RETAINED_INPUT_BYTES })));
      ancestrySnapshot = snapshots.ancestrySnapshot;
      this.#values ??= new ArchiveOutcomeValues(this.support.owners, this.budget, this.bounds);
      append(this.#values.project(sql, at, position));
    }
    // The native planner applies this same final definition ceiling.
    this.budget.spend({ metadata: dependencies.length * 256, inputWork: dependencies.length * 512 });
    return { dependencies: boundedRetainedDependencies(dependencies, this.bounds), ancestrySnapshot };
  }
}
