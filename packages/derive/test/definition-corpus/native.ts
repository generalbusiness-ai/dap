import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { NATIVE_DECLARATION_PINS } from "../../../platform/src/native-declarations.generated.ts";
import { VERSIONS } from "../../../platform/src/native-catalog.ts";
import { outcomeValueDomains } from "../../src/outcomes.ts";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import type { DefinitionCorpusRow } from "./row.ts";

/** Every actual catalog alias remains named, including aliases with equal data.
 * These are the same owner-domain options used by Core and replay. */
export const nativeDefinitions: readonly DefinitionCorpusRow[] = Object.entries(VERSIONS).map(([named, code]) => ({
  name: `native/${named}`, origins: [`packages/platform/src/native-catalog.ts#VERSIONS[${JSON.stringify(named)}]`],
  declaration: () => structuredClone(code.data), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES,
  options: { platform: true, outcomeValues: outcomeValueDomains(code.data, code.rules) },
  // Missing catalog pins become a named corpus failure, never an omitted check.
  expectedDigest: NATIVE_DECLARATION_PINS[named] ?? "",
}));
