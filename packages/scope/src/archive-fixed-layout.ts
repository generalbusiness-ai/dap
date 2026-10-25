/** Footprint of one already admitted native inventory. No payload is read
 * again, and no caller-supplied inventory can enter the fixed build. */
import { canonicalize, natural, utf8 } from "@generalbusiness/dap-bytes";
import { journalOrderingInputWork, journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath,
  type JournalV2PlannedFile } from "@generalbusiness/dap-git/journal";
import type { ArchiveInventory } from "./archive-inventory.ts";
import type { ArchiveBudget, ArchiveCost } from "./archive-budget.ts";
import type { ArchiveScoutLayoutQuote } from "./archive-scout-layout.ts";
import { archiveEntryAnchorCandidates } from "./archive-anchor-candidates.ts";
import { archiveEntryReadForecast, archiveInputBaseReservation, archiveInputColdRetainedReadForecast } from "./archive-input-cost.ts";
import { forecastArchiveForeignSelection } from "./archive-foreign-cost.ts";
import { forecastArchiveSourceLookup } from "./archive-source-cost.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import type { Sql } from "./sqlite.ts";

const zero = (): ArchiveCost => ({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 });
function add(total: ArchiveCost, cost: Partial<ArchiveCost>): void {
  for (const key of Object.keys(total) as (keyof ArchiveCost)[]) {
    total[key] += cost[key] ?? 0;
    if (!natural(total[key])) return stop("limit");
  }
}
/** Same prepaid metadata walk/escape ceiling used by the scout. Only
 * module-owned inventory nodes reach this helper; it visits no entry body. */
function jsonUpper(value: unknown, budget: ArchiveBudget, depth = 0): number {
  budget.spend({ metadata: 32, inputWork: 64 });
  if (depth > 32) return stop("limit");
  if (value === null) return 4;
  if (typeof value === "string") return value.length * 6 + 2;
  if (typeof value === "number") return 32;
  if (typeof value === "boolean") return 5;
  if (typeof value !== "object") return stop("mismatch");
  let bytes = 2;
  if (Array.isArray(value)) for (const child of value) bytes += 1 + jsonUpper(child, budget, depth + 1);
  else for (const [key, child] of Object.entries(value)) bytes += key.length * 6 + 4 + jsonUpper(child, budget, depth + 1);
  return bytes;
}
function descriptionBytes(value: unknown, budget: ArchiveBudget): number {
  const upper = jsonUpper(value, budget);
  budget.spend({ metadata: upper, inputWork: upper * 8 });
  return utf8(canonicalize(value)).length;
}

/** Called synchronously with the fresh inventory, before any parent await.
 * Pass placement and sizes are actual inventory metadata, not today's
 * remeasurements or the earlier scout's possible-key union. */
export function archiveFixedLayout(sql: Pick<Sql, "exec">, inventory: ArchiveInventory, selectionBytes: number,
  entryMaximum: number, budget: ArchiveBudget, sources?: FixtureArchiveSourcePins): ArchiveScoutLayoutQuote {
  const row = inventory.entries[0], first = inventory.after ? inventory.after.seq + 1 : 0;
  if (inventory.format !== "artroom-local-inventory-2" || inventory.entries.length !== 1 || !row
    || row.seq !== first || row.hash !== inventory.through.hash || inventory.through.seq !== first
    || !natural(selectionBytes) || selectionBytes === 0) return stop("mismatch");
  budget.spend({ metadata: 512 + (inventory.objects.length + inventory.omittedTexts.length) * 128,
    inputWork: 1024 + (inventory.objects.length + inventory.omittedTexts.length) * 256 });
  const input = zero();
  add(input, archiveInputBaseReservation(1, inventory.objects.length));
  add(input, archiveEntryReadForecast(row.bytes));
  let copies = 0, newRetained = 0, retainedBytes = 0, retainedNameUnits = 0, objectJSONBytes = 0;
  let origins = inventory.ancestryUnwalked.length, consumerBytes = 0, keyBytes = 0;
  const files: JournalV2PlannedFile[] = [];
  for (const object of inventory.objects) {
    // Prepay bounded key naming and the descriptor before allocating it.
    budget.spend({ metadata: 1024, inputWork: 2048 });
    const key = object.key;
    const name = canonicalize(key.kind === "value" ? [key.kind, key.domain, key.digest] : [key.kind, key.digest]);
    const path = journalV2RetainedPath(first, key);
    if (!natural(object.pass) || object.pass > first) return stop("mismatch");
    keyBytes += utf8(name).length;
    // Identical public-manifest bound to the scout, with actual selected
    // keys. The ASCII escaped path bounds each retained key's spelling.
    objectJSONBytes += 512 + path.length * 2;
    if (key.kind === "entry") copies++;
    if (object.pass === first) {
      newRetained++; retainedBytes += object.bytes; retainedNameUnits += name.length;
      add(input, archiveInputColdRetainedReadForecast(object.bytes));
      files.push({ path, bytes: object.bytes });
    }
    for (const consumer of object.consumers) {
      origins++;
      consumerBytes += descriptionBytes(consumer, budget);
    }
  }
  for (const omitted of inventory.omittedTexts) {
    origins++;
    consumerBytes += descriptionBytes(omitted, budget);
    // SHA-256 and the fixed text kind fit the scout's existing key bound.
    keyBytes += 96;
  }
  const basis = inventory.foreignSources ?? [];
  // archiveInput constructs its own copy/source tables and repeats source
  // comparisons. Fresh inventory does not waive any of those future fees.
  add(input, forecastArchiveForeignSelection(copies));
  add(input, forecastArchiveForeignSelection(basis.length));
  for (const source of basis) {
    budget.spend({ metadata: 512, inputWork: 1024 });
    keyBytes += utf8(canonicalize(source.at)).length;
    const held = sources?.get(source.at, budget);
    if (!held || held.pin !== source.pin) return stop("foreign-source-mismatch");
    add(input, forecastArchiveSourceLookup(held.declaration.length));
  }
  const candidates = archiveEntryAnchorCandidates(sql, row, entryMaximum, budget);
  const omissions = inventory.omittedTexts.length;
  const orderingInputWork = journalOrderingInputWork(consumerBytes, origins)
    + journalOrderingInputWork(keyBytes, inventory.objects.length + omissions + basis.length);
  const manifestBytes = 768 + objectJSONBytes + omissions * 320 + basis.length * 512;
  budget.spend({ metadata: 1024, inputWork: 8192 });
  const headBytes = utf8(canonicalize({ v: 2, scope: inventory.at, through: row.seq, hash: row.hash })).length;
  files.unshift({ path: "journal/v2/head.json", bytes: headBytes },
    { path: journalV2PassPath(first), bytes: manifestBytes },
    { path: journalV2SegmentPath(first, first), bytes: row.bytes });
  if (![copies, newRetained, retainedBytes, retainedNameUnits, origins, manifestBytes, orderingInputWork].every(natural)) return stop("limit");
  // UTF-8 selection size bounds its UTF-16 units. Raw duplicate consumer
  // and omission rows overcount the parser's normalized lists safely.
  return Object.freeze({ entries: 1, entryBytes: row.bytes, objects: inventory.objects.length, copies, newRetained,
    anchorCandidates: candidates, retainedBytes, retainedNameUnits, origins, manifestRows: inventory.objects.length + omissions,
    selectionUnits: selectionBytes, manifestBytes, measuredOmissions: omissions, orderingInputWork,
    input: Object.freeze(input), files: Object.freeze(files.map(file => Object.freeze(file))) });
}
