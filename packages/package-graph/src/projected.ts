/** Projected uses have explicit units and scope. Live items, retained
 * allowances and successful-creation paths are not lifetime traffic limits. */
import type { Bounds, Digest } from "@generalbusiness/dap-contract";
import type { PackageGraphDefinition } from "./types.ts";
import { countOf, finalStates, record, reportedCount, type GraphCreate, type GraphRow } from "./model.ts";

export function projectedUse(entry: Digest, definitions: readonly PackageGraphDefinition[], rows: readonly GraphRow[], creations: readonly GraphCreate[], instances: ReadonlyMap<Digest, bigint | null>, bounds: Bounds) {
  const lives = definitions.map(part => {
    const counts = Object.values(part.definition.items).map(item => countOf(item.max));
    const perInstance = counts.some(value => value === null) ? null : counts.reduce<bigint>((sum, value) => sum + value!, 0n);
    const scopes = instances.get(part.id) ?? null;
    return { definition: part.id, perInstance: reportedCount(perInstance), acrossInstall: reportedCount(perInstance === null || scopes === null ? null : perInstance * scopes) };
  });
  let live: bigint | null = 0n, creationEntries: bigint | null = instances.get(entry) ?? null, creationItems: bigint | null = 0n;
  for (const part of definitions) {
    const scopes = instances.get(part.id) ?? null, localLive = lives.find(row => row.definition === part.id)!.acrossInstall;
    if (live !== null) live = localLive === null ? null : live + BigInt(localLive);
    if (creationItems !== null) {
      const genesis = rows.find(row => row.owner.id === part.id && row.family === "acts" && row.name === part.definition.genesis);
      creationItems = scopes === null ? null : creationItems + scopes * (genesis?.opens ? 1n : 0n);
    }
    if (part.id === entry) continue;
    const producers = creations.filter(edge => edge.target === part.id);
    if (scopes === null || producers.length !== 1) { creationEntries = null; creationItems = null; continue; }
    // One child genesis, its creator entry and its applied result. When
    // one source entry creates several definitions, counting it again is
    // conservative; this is a ceiling for successful paths, not all entries.
    if (creationEntries !== null) creationEntries += 3n * scopes;
    if (creationItems !== null) creationItems += scopes * (producers[0]!.send.row.opens ? 1n : 0n);
  }
  return {
    liveItems: { perDefinition: lives, acrossInstall: reportedCount(live) },
    successfulCreation: { entryCeiling: reportedCount(creationEntries), itemKeyCeiling: reportedCount(creationItems),
      excludes: "Failed creations, repeated acts/deliveries, timed work, later results and outside scopes are excluded; this does not promise that every projected path can be admitted." },
    lifetime: { entries: null, itemKeys: definitions.some(part => Object.keys(part.definition.items).some(type => finalStates(part, type).size > 0)) ? null : reportedCount(live),
      reason: "Repeated input has no package lifetime count. Any final item state leaves its lifetime key count unproved, even if successful child instances are bounded." },
    nativeAllowances: definitions.map(part => ({ definition: part.id, entries: bounds.scopeEntries, wholeScope: record(part.definition.capacity)["name"] === "whole-scope",
      items: bounds.scopeItems, records: bounds.scopeRecords, bytes: bounds.scopeBytes, requests: bounds.scopeRequests,
      capabilities: part.definition.capabilities.map(capability => `${capability.name}@${capability.version}`),
    })),
    qualification: "Configured native retained allowances are per scope. Whole-scope item/record/byte/request ceilings apply only to that opt-in; these are no physical heap, provider quota or consent claims.",
  };
}
