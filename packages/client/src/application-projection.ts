/** Item fields selected by a declared native read. These adapters add no
 * opened/attributed fields, Summary reply or native authority proof. */
import type { ApplicationProjectionData, ApplicationProjectionRead, FieldValue, Item, Read } from "@generalbusiness/dap-contract";
import { canonicalize, isMemberRef, parseStrict, timeMs } from "@generalbusiness/dap-bytes";
import { applicationProjectionId, isApplicationJournalSource, readApplicationProjection, type ApplicationReadProjection } from "@generalbusiness/dap-bytes/application-v2";
import type { CompleteSnapshot } from "./observe.ts";

export type ProjectedItem = Pick<Item, "id" | "type" | "state" | "revision" | "parties" | "refs" | "values">;
export interface ApplicationItemSnapshot {
  readonly scope: ApplicationProjectionData["scope"];
  readonly definition: ApplicationReadProjection["definition"];
  readonly at: ApplicationProjectionData["at"];
  readonly items: readonly ProjectedItem[];
}

/** Use an SDK-validated projection reply and its exact declaration. Aliases
 * map back to their native slot names; journal rows remain entry facts. */
export function applicationItemSnapshot(declaration: ApplicationReadProjection, data: ApplicationProjectionData): ApplicationItemSnapshot {
  const projection = readApplicationProjection(declaration);
  const fail = (): never => { throw Error("The native item projection does not match its declaration."); };
  if (data.projection !== applicationProjectionId(projection) || Object.keys(data.sources).sort().join() !== Object.keys(projection.sources).sort().join()) return fail();
  const items = new Map<number, ProjectedItem>();
  for (const [name, source] of Object.entries(projection.sources)) {
    if (isApplicationJournalSource(source)) continue;
    for (const row of data.sources[name]!) {
      if (row.entry || row.type !== source.item || !source.states.includes(row.state)
        || Object.keys(row.fields).sort().join() !== Object.keys(source.fields).sort().join()) return fail();
      const prior = items.get(row.id);
      if (prior && (prior.type !== row.type || prior.state !== row.state || prior.revision !== row.revision)) return fail();
      const groups = { value: { ...prior?.values }, ref: { ...prior?.refs }, party: { ...prior?.parties } };
      for (const [alias, field] of Object.entries(source.fields)) {
        const value = row.fields[alias];
        if (value === undefined || value === null && !field.nullable) return fail();
        // A timestamp resolved from a fact is derived read data, not a new
        // native value/ref slot available to subject or guard resolution.
        if (field.from.kind === "fact-time") { if (value !== null && timeMs(value) === null) return fail(); continue; }
        if (field.from.kind === "fact-signer") { if (value !== null && !isMemberRef(value)) return fail(); continue; }
        const slots = groups[field.from.kind] as Record<string, FieldValue | null>;
        if (Object.hasOwn(slots, field.from.name) && canonicalize(slots[field.from.name]) !== canonicalize(value)) return fail();
        if (field.from.kind === "party" && value !== null && !isMemberRef(value) && !(Array.isArray(value) && value.every(isMemberRef))) return fail();
        Object.defineProperty(slots, field.from.name, { value: parseStrict(canonicalize(value)), enumerable: true, configurable: true });
      }
      items.set(row.id, { id: row.id, type: row.type, state: row.state, revision: row.revision, values: groups.value, refs: groups.ref, parties: groups.party });
    }
  }
  return { scope: data.scope, definition: projection.definition, at: data.at, items: [...items.values()].sort((a, b) => a.id - b.id) };
}

/** Adapt a complete native projection to the existing observation contract.
 * A refused projection never becomes a current/partial observation. */
export function completeApplicationItems(read: ApplicationProjectionRead, declaration: ApplicationReadProjection): Read<CompleteSnapshot<ApplicationItemSnapshot>> {
  if (!read.ok) return { ok: false, reason: read.reason === "forbidden" || read.reason === "too-large" || read.reason === "sessions-unavailable" || read.reason === "clock-behind" ? read.reason : "unavailable" };
  const value = applicationItemSnapshot(declaration, read.value);
  return { ok: true, at: value.at, complete: true, value: { scope: value.scope, definition: value.definition, at: value.at, value } };
}

/** Observe the complete native data, including journal facts, without
 * turning those facts into full entries or synthesizing a Summary reply. */
export function completeApplicationProjection(read: ApplicationProjectionRead, declaration: ApplicationReadProjection): Read<CompleteSnapshot<ApplicationProjectionData>> {
  const checked = completeApplicationItems(read, declaration);
  if (!checked.ok) return checked;
  if (!read.ok) throw Error("A refused native projection has no observation.");
  return { ...checked, value: { ...checked.value, value: read.value } };
}
