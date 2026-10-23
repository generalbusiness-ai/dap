/** Exact native value places. Neither a TEST owner table nor knowledge of
 * a domain name supplies an exception to whole-prefix privacy admission. */
import { DOMAINS } from "@generalbusiness/dap-contract";
import { isRecord } from "@generalbusiness/dap-bytes";
import { declarationValueDomains } from "@generalbusiness/dap-derive";
import { ARCHIVE_NATIVE_VALUE_PLACES, admitArchiveNativeValuePlace } from "@generalbusiness/dap-git/archive-policy";
import type { ArchiveSupport } from "./archive-entry-metadata.ts";
import type { ArchiveBudget } from "./archive-budget.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import { ARCHIVE_SUPPORT_DECLARATION_WORK } from "./archive-support-cost.ts";

const known: ReadonlySet<string> = new Set(Object.values(DOMAINS));
export function archiveValuePlace(support: ArchiveSupport, domain: string, max: number, place: string): boolean {
  return known.has(domain) || admitArchiveNativeValuePlace(support.named, support.definition.digest, domain, max, place);
}

/** Native/root identity was already checked against installed platform data.
 * Checking the exact declaration digest here also binds every listed path.
 * The walk identifies each occurrence; a listed name at another path fails.
 * Existing declarations with only standard domains keep their old path. */
export function archiveDeclarationValuePlaces(support: ArchiveSupport, budget: ArchiveBudget): number {
  if (declarationValueDomains(support.definition).every(domain => known.has(domain))) return 0;
  if (!ARCHIVE_NATIVE_VALUE_PLACES.some(row => row.pin === support.named && row.data === support.definition.digest)) return stop("unsupported-custom-domain");
  const pending: { value: unknown; path: string }[] = [{ value: support.definition.declared, path: "" }];
  let visited = 0;
  while (pending.length) {
    // Spend before inspecting/enumerating each bounded declaration node.
    budget.spend({ inputWork: ARCHIVE_SUPPORT_DECLARATION_WORK }); visited++;
    const { value, path } = pending.pop()!;
    if (!isRecord(value) && !Array.isArray(value)) continue;
    if (isRecord(value) && typeof value["domain"] === "string" && !known.has(value["domain"])) {
      if (typeof value["max"] !== "number" || !archiveValuePlace(support, value["domain"], value["max"], path)) return stop("unsupported-custom-domain");
    }
    for (const [key, child] of Object.entries(value)) pending.push({ value: child, path: path ? `${path}.${key}` : key });
  }
  budget.check();
  return visited;
}
