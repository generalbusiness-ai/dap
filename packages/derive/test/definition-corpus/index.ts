import { scopeFixtureDefinitions } from "./scope-fixtures.ts";
import { withFixtureOriginAliases } from "./fixture-origin-aliases.ts";
import { bytesFixtureDefinitions } from "./bytes-fixtures.ts";
import { latePinVariantDefinitions } from "./late-pin-variants.ts";
import { laneAppsDefinitions } from "./lane-apps.ts";
import { laneApplicationDefinitions } from "./lane-applications.ts";
import { scopeCapacityFloorDefinitions } from "./scope-capacity-floor.ts";
import { generalCreationDefinitions } from "./general-creation.ts";
/** Registration is explicit; a constructor locator alone is not corpus coverage. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { lane, small, notes, ticket, desk } from "./fixture-data.ts";
import { shippedDefinitions } from "./shipped.ts";
import { derivePositiveDefinitions } from "./derive-positives.ts";
import { clientCliMcpPageDefinitions } from "./client-cli-mcp-page.ts";
import { deriveFixtureDefinitions } from "./derive-fixtures.ts";
import { nativeDefinitions } from "./native.ts";
import { replayHistoryDefinitions } from "./replay-histories.ts";
import { growPackageGraphDefinitions } from "./grow-package-graph.ts";
import { growExamplesDefinitions } from "./grow-examples.ts";
import { bindingVariantDefinitions } from "./binding-variants.ts";
import { settlesVariantDefinitions } from "./settles-variants.ts";
import { holdsVariantDefinitions } from "./holds-variants.ts";
import { platformFixtureDefinitions } from "./platform-fixtures.ts";
import type { DefinitionCorpusRow } from "./row.ts";

export const definitionCorpus: readonly DefinitionCorpusRow[] = withFixtureOriginAliases([
  ...scopeFixtureDefinitions,
  ...bytesFixtureDefinitions,
  ...latePinVariantDefinitions,
  ...laneAppsDefinitions,
  ...laneApplicationDefinitions,
  ...scopeCapacityFloorDefinitions,
  ...generalCreationDefinitions,
  ...platformFixtureDefinitions,
  ...holdsVariantDefinitions,
  ...settlesVariantDefinitions,
  ...bindingVariantDefinitions,
  ...growExamplesDefinitions,
  ...growPackageGraphDefinitions,
  ...replayHistoryDefinitions,
  ...shippedDefinitions, ...nativeDefinitions, ...deriveFixtureDefinitions, ...derivePositiveDefinitions, ...clientCliMcpPageDefinitions,
  ...Object.entries({ lane, small, notes, ticket, desk }).map(([name, data]) => ({
    name: `derive/shared/${name}`,
    origins: [`packages/derive/test/fixtures.ts#${name}`],
    declaration: () => structuredClone(data), bounds: PROPOSED_BOUNDS,
  })),
]);
