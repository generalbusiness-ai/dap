/** Compose scalar references in the native local planner's order. The
 * caller supplies actual classified context inside its synchronous frame;
 * this grants no pin, privacy, body-read or export admission. */
import { RETAINED_INPUT_BYTES, type Bounds, type Digest, type FactRef, type Input, type ScopeRef } from "@generalbusiness/dap-contract";
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
import type { Sql } from "./sqlite.ts";

export type ArchiveReferenceContext =
  | { readonly input: Exclude<Input["type"], "delivery" | "outcome"> }
  | { readonly input: "delivery"; readonly from: FactRef; readonly under?: string }
  | ({ readonly input: "outcome" } & Pick<Extract<Input, { type: "outcome" }>, "owner" | "kind" | "result">);
export interface ArchiveLocalReferencePlan {
  readonly dependencies: readonly PlannedRetainedDependency[];
  readonly ancestrySnapshot: { readonly digest: Digest; readonly count: number } | null;
}

export class ArchiveLocalReferences {
  #prepared?: ArchivePrepared;
  #acts?: ArchiveActFields;
  #genesis?: ArchiveGenesisFields;
  #delivery?: ArchiveDeliveryFields;
  #observed?: ArchiveObserved;
  #values?: ArchiveOutcomeValues;
  constructor(readonly sql: Pick<Sql, "exec">, readonly support: ArchiveSupport,
    readonly bounds: Bounds, readonly budget: ArchiveBudget) {}

  project(at: ScopeRef, position: ArchivePrivacyPosition, context: ArchiveReferenceContext,
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
    this.#prepared ??= new ArchivePrepared(this.sql, definition, this.budget, this.bounds);
    append(this.#prepared.project(at, position));
    if (context.input === "genesis") {
      this.#genesis ??= new ArchiveGenesisFields(this.sql, definition, this.budget, this.bounds);
      append(this.#genesis.project(at, position));
    } else if (context.input === "act") {
      this.#acts ??= new ArchiveActFields(this.sql, definition, this.budget, this.bounds);
      append(this.#acts.project(at, position).dependencies);
    } else if (context.input === "delivery") {
      this.#delivery ??= new ArchiveDeliveryFields(this.sql, definition, this.budget, this.bounds);
      append(this.#delivery.project(at, position, context.from, context.under));
    }
    if (definition.observing && ["act", "delivery", "outcome"].includes(context.input)) {
      this.#observed ??= new ArchiveObserved(this.sql, definition, this.budget, this.bounds);
      append(this.#observed.project(at, position));
    }
    let ancestrySnapshot: ArchiveLocalReferencePlan["ancestrySnapshot"] = null;
    if (context.input === "outcome") {
      const rules = this.support.owners.get(context.owner)?.get(context.kind);
      if (!rules) return stop("unsupported-archive-cohort");
      const snapshots = projectArchiveSnapshots(this.sql, at, position, context, rules, this.budget);
      this.budget.spend({ metadata: snapshots.dependencies.length * 256, inputWork: snapshots.dependencies.length * 512 });
      append(snapshots.dependencies.map(dependency => ({ dependency, max: RETAINED_INPUT_BYTES })));
      ancestrySnapshot = snapshots.ancestrySnapshot;
      this.#values ??= new ArchiveOutcomeValues(this.sql, this.support.owners, this.budget, this.bounds);
      append(this.#values.project(at, position));
    }
    // The native planner applies this same final definition ceiling.
    this.budget.spend({ metadata: dependencies.length * 256, inputWork: dependencies.length * 512 });
    return { dependencies: boundedRetainedDependencies(dependencies, this.bounds), ancestrySnapshot };
  }
}
