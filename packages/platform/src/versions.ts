/**
 * The versions of a platform definition (the planner's decision of
 * 2026-10-07, "definition versions"). A changed definition carries a new
 * version. A scope pins the version at its genesis, `platform:<name>@<n>`,
 * and is judged and replayed by that version for as long as it exists. This
 * package serves every version that it has shipped, and new scopes are
 * created on the newest.
 *
 * A rule that must state its own version, such as the owner of an operation
 * that it opens or the definition of a scope that it creates, reads it from
 * the scope's genesis entry (`pinnedBy`). A comparison that only asks
 * whether an operation or a scope is of a definition compares the name
 * without the version (`isOf`).
 */

import type { PlatformDefinition } from "@generalbusiness/dap-contract";
import { isPlatformDefinition, platformName } from "@generalbusiness/dap-bytes";
import type { Own, RuleGiven } from "@generalbusiness/dap-derive";

/** True when the value is a version of the platform definition of that name, such as `platform:destination@2` of `platform:destination`. */
export const isOf = (named: unknown, name: string): named is PlatformDefinition => isPlatformDefinition(named) && platformName(named) === name;

/** Only these explicit destination pins use D1's standing record. Future
 * versions do not acquire that provenance contract by numeric comparison. */
export const isStandingDestination = (named: unknown): named is "platform:destination@5" | "platform:destination@6" => named === "platform:destination@5" || named === "platform:destination@6";

/** Exact destination pins that use the native staged publication protocol. */
export const usesStagedPublicationProtocol = (named: unknown): boolean => named === "platform:destination@3" || named === "platform:destination@4" || named === "platform:destination@5" || named === "platform:destination@6" || named === "platform:destination@7" || named === "platform:destination@8" || named === "platform:destination@13" || named === "platform:destination@14" || named === "platform:destination@15" || named === "platform:destination@16";

/** Exact destination pins that use the native automatic file publication protocol. */
export const usesFilePublicationProtocol = (named: unknown): boolean => named === "platform:destination@4" || named === "platform:destination@5" || named === "platform:destination@6" || named === "platform:destination@7" || named === "platform:destination@8" || named === "platform:destination@13" || named === "platform:destination@14" || named === "platform:destination@15" || named === "platform:destination@16";

/** The version of a platform definition: the number after its `@`. */
export const versionOf = (named: PlatformDefinition): number => Number(named.slice(named.lastIndexOf("@") + 1));

/**
 * The definition that this scope's genesis pinned: the seed of its genesis
 * entry. In the genesis entry itself it is the input's seed; in any later
 * entry, the seed of the scope's own entry 0.
 */
export function pinnedBy(given: { readonly input: RuleGiven["input"]; readonly own: Own }): PlatformDefinition {
  if (given.input.type === "genesis") return given.input.seed.definition as PlatformDefinition;
  return pinnedOf(given.own);
}

/** The same, from the scope's own entries alone: the seed of its entry 0. */
export function pinnedOf(own: Own): PlatformDefinition {
  const input = own(0)?.entry.input;
  if (input?.type !== "genesis" || !isPlatformDefinition(input.seed.definition)) throw new Error("this scope's genesis entry is not at hand");
  return input.seed.definition;
}
