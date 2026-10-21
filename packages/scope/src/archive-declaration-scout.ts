/** Complete reviewed declaration closures only. The scout pays actual
 * native validation and extra metadata work on the original ledger. Its
 * frozen scalar result grants no payload or later inventory admission. */
import type { Digest } from "@generalbusiness/dap-contract";
import type { ArchiveBudget, ArchiveCost } from "./archive-budget.ts";
import type { ArchiveDeclarations } from "./archive-declarations.ts";
import { recordArchiveSupportMetadata } from "./archive-entry-metadata.ts";
import { forecastArchiveDeclarationValidation } from "./archive-inventory-cost.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import { archiveRetainedReadForecast } from "./archive-retained.ts";
import { forecastArchiveSupportMetadata, type ArchiveSupportFootprint } from "./archive-support-cost.ts";

export interface ArchiveDeclarationFootprint {
  readonly root: Digest;
  readonly declarations: readonly { readonly digest: Digest; readonly bytes: number; readonly support: Readonly<ArchiveSupportFootprint> }[];
}

/** One complete actual walk, plus keyed size and trusted support scouts.
 * Missing potential probes need separate admission and are not represented
 * by an empty closure. No retained entry/rule/snapshot/value is fetched. */
export function recordArchiveDeclarationClosure(admission: ArchiveDeclarations, root: Digest): ArchiveDeclarationFootprint {
  const { reader, bounds, reviewed } = admission, budget = reader.budget;
  budget.spend({ metadata: 256, inputWork: 512 });
  const closure = admission.walk(root);
  if (!closure.complete) return stop("incomplete");
  const declarations: ArchiveDeclarationFootprint["declarations"][number][] = [];
  for (const digest of closure.nodes) {
    budget.spend({ metadata: 256, inputWork: 512 });
    const matched = admission.definition(digest), policy = reviewed.get(digest);
    if (!matched || !policy) return stop("unavailable");
    const bytes = reader.measure({ kind: "definition", digest }, bounds.definitionBytes);
    if (bytes !== matched.bytes) return stop("mismatch");
    const support = recordArchiveSupportMetadata({ ...policy.support, definition: matched.definition }, budget);
    declarations.push(Object.freeze({ digest, bytes, support }));
  }
  budget.check();
  return Object.freeze({ root, declarations: Object.freeze(declarations) });
}

/** Future reads, validation and support checks for this complete request.
 * The caller must separately union declaration digests with ALL local and
 * foreign visited nodes and reserve that distinct-node count. Repeat roots
 * repeat this work in full. Platform-root work is separately priced.
 * Fresh inventory must re-admit and compare the exact closure; this quote
 * does not cover changes after the scout's synchronous read frame. */
export function forecastArchiveDeclarationClosure(footprint: ArchiveDeclarationFootprint, budget: ArchiveBudget):
  Readonly<Pick<ArchiveCost, "attempts" | "calls" | "metadata" | "inputWork">> {
  budget.spend({ metadata: 128, inputWork: 256 + footprint.declarations.length * 128 });
  const work = { attempts: 0, calls: 0, metadata: 0, inputWork: 0 };
  for (const declaration of footprint.declarations) {
    const read = archiveRetainedReadForecast(declaration.bytes);
    const validation = forecastArchiveDeclarationValidation(declaration.bytes);
    const support = forecastArchiveSupportMetadata(declaration.support);
    work.attempts += read.attempts ?? 0;
    work.calls += read.calls ?? 0;
    work.metadata += read.metadata ?? 0;
    work.inputWork += (read.inputWork ?? 0) + validation.inputWork + support.inputWork;
  }
  return Object.freeze(work);
}
