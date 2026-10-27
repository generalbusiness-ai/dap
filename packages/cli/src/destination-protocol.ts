/** Closed CLI protocol support. The reviewed publication families share staged
 * cleanup and file-publication protocols, including the unpublished cohort.
 * Unknown pins gain no protocol by having a larger version number. */
const MANIFEST_DESTINATIONS: ReadonlySet<string> = new Set([
  "platform:destination@3", "platform:destination@4", "platform:destination@5",
  "platform:destination@6", "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
]);

export const supportsManifestListDestination = (definition: string): boolean => MANIFEST_DESTINATIONS.has(definition);
export const supportsOneFileDestination = (definition: string): boolean => definition === "platform:destination@2" || supportsManifestListDestination(definition);
