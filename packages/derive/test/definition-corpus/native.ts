import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { NATIVE_DECLARATION_PINS } from "../../../platform/src/native-declarations.generated.ts";
import { VERSIONS } from "../../../platform/src/native-catalog.ts";
import { outcomeValueDomains } from "../../src/outcomes.ts";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import type { DefinitionCorpusRow } from "./row.ts";

// These existing cohort callers use rule admission without owner evidence
// domains. Keep that exact options object separate from Core/replay rows.
const rulesOnlyCallers: readonly { readonly pins: readonly string[]; readonly origins: readonly string[] }[] = [
  { pins: ["platform:membership@1"],
    origins: ["packages/scope/test/sessions.test.ts#retained snapshot native membership validation"] },
  { pins: ["platform:register@5", "platform:directory@5", "platform:membership@4", "platform:rules@3", "platform:destination@2", "platform:inbox@1"],
    origins: ["packages/platform/test/application.test.ts#supporting cohort validates"] },
  { pins: ["platform:register@9", "platform:directory@8"],
    origins: ["packages/platform/test/application.test.ts#FILE_PUBLICATION_COHORT selected register and directory"] },
  { pins: ["platform:register@6", "platform:directory@6", "platform:membership@5", "platform:rules@3", "platform:destination@2", "platform:inbox@1"],
    origins: ["packages/platform/test/counting-cohort.test.ts#COUNTING_COHORT whole validation"] },
  { pins: ["platform:membership@5"],
    origins: ["packages/platform/test/counting-cohort.test.ts#selected membership admission"] },
  { pins: ["platform:register@12", "platform:directory@11", "platform:membership@7", "platform:rules@5", "platform:destination@7", "platform:inbox@1"],
    origins: ["packages/platform/test/application-install.test.ts#trusted install cohort validates whole"] },
  { pins: ["platform:register@12", "platform:directory@11", "platform:membership@7", "platform:rules@5", "platform:destination@7"],
    origins: ["packages/platform/test/support-application-install.ts#InstallNode", "packages/platform/test/application-install.test.ts#installGraph default trusted cohort"] },
  { pins: ["platform:register@13", "platform:directory@12", "platform:membership@7", "platform:rules@6", "platform:destination@8"],
    origins: ["packages/platform/test/support-application-install.ts#InstallNode", "packages/platform/test/application-install-v2.test.ts#installGraph declared cohort"] },
  { pins: ["platform:register@14", "platform:directory@13", "platform:membership@8", "platform:rules@7", "platform:destination@9"],
    origins: ["packages/platform/test/support-application-install.ts#InstallNode", "packages/platform/test/application-install.test.ts#installGraph archive cohort", "packages/platform/test/archive-binding.test.ts#installGraph archive cohort"] },
  { pins: ["platform:register@15", "platform:directory@14", "platform:membership@8", "platform:rules@8", "platform:destination@10"],
    origins: ["packages/platform/test/support-application-install.ts#InstallNode", "packages/platform/test/application-install-v2.test.ts#installGraph archive declared cohort"] },
  { pins: ["platform:register@17", "platform:directory@16", "platform:membership@8", "platform:rules@10", "platform:destination@12"],
    origins: ["packages/platform/test/support-application-install.ts#InstallNode", "packages/platform/test/archive-binding.test.ts#installGraph device archive cohort"] },
];
const rulesOnlyOrigins = new Map<string, string[]>();
for (const { pins, origins } of rulesOnlyCallers) for (const named of pins) {
  const collected = rulesOnlyOrigins.get(named) ?? [];
  rulesOnlyOrigins.set(named, [...new Set([...collected, ...origins])]);
}

export const nativeDefinitions: readonly DefinitionCorpusRow[] = [
  /** Every actual catalog alias remains named, including aliases with equal data.
   * These are the same owner-domain options used by Core and replay. */
  ...Object.entries(VERSIONS).map(([named, code]) => ({
    name: `native/${named}`, origins: [`packages/platform/src/native-catalog.ts#VERSIONS[${JSON.stringify(named)}]`],
    declaration: () => structuredClone(code.data), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES,
    options: { platform: true, outcomeValues: outcomeValueDomains(code.data, code.rules) },
    // Missing catalog pins become a named corpus failure, never an omitted check.
    expectedDigest: NATIVE_DECLARATION_PINS[named] ?? "",
  })),
  ...Array.from(rulesOnlyOrigins, ([named, origins]): DefinitionCorpusRow => ({
    name: `native/rules without owner domains/${named}`, origins,
    declaration: () => structuredClone(VERSIONS[named]!.data), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES,
    options: { platform: true }, expectedDigest: NATIVE_DECLARATION_PINS[named] ?? "",
  })),
];
