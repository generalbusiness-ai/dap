/** Raw client, CLI, MCP and Page values. Importing this shard constructs no
 * package, native history, browser, validator result or test registration. */
import { readFileSync } from "node:fs";
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import type { DefinitionCorpusRow } from "./row.ts";
import { clientNotes, clientNotesWithMax, packageDeclaration } from "../../../client/test/definition-corpus-data.ts";
import { newApplicationDefinition } from "../../../cli/src/application-new.ts";
import { scriptedDeviceParentDefinition } from "../../../cli/src/application-local-device-parent.ts";
import { clockDefinition, addCounterCitation, scenarioParent, packageReportDefinition, shortenNotesText } from "../../../cli/test/definition-corpus-data.ts";
import { configureInputDefinition, configurePledgeDefinition, configureConstantDefinition, configureSeriesDefinition, relaxedCounting, growLauncherDefinition } from "../../../mcp/test/support/definition-corpus-data.ts";
import { garden } from "../../../mcp/test/support/garden.ts";
import { pantry } from "../../../mcp/test/support/pantry.ts";
import { issueLike, roomLike } from "../../../mcp/test/support/collisions.ts";
import { customListDefinition } from "../../../../apps/room/page/test/definition-corpus-data.ts";
import { countingCommitments } from "../../../../apps/counter/commitments.ts";
import { site } from "../../../../examples/grow/site.ts";
import { room } from "../../../../examples/grow/room.ts";
import { devicePackageFixture } from "../fixtures-device-command.ts";

const row = (name: string, origins: readonly string[], declaration: () => unknown,
  profiles?: DefinitionCorpusRow["profiles"]): DefinitionCorpusRow => ({ name, origins, declaration, bounds: PROPOSED_BOUNDS,
    ...(profiles === undefined ? {} : { profiles }) });
const counter = (): DeclaredDefinition => JSON.parse(readFileSync(new URL("../../../../apps/counter/definition.json", import.meta.url), "utf8"));
const commitments = (configure: (definition: DeclaredDefinition) => void): DeclaredDefinition => {
  const definition = structuredClone(countingCommitments); configure(definition); return definition;
};
const parent = (child: DeclaredDefinition) => scriptedDeviceParentDefinition(definitionDigest(child), child.acts[child.genesis]!.fields);

export const clientCliMcpPageDefinitions: readonly DefinitionCorpusRow[] = [
  row("client/notes", ["packages/client/test/declared.test.ts#notes"], () => structuredClone(clientNotes)),
  row("client/notes max 9", ["packages/client/test/declared.test.ts#other"], clientNotesWithMax),
  ...(["child", "unrelated", "needs-hold"] as const).map(name => row(`client/package ${name}`,
    [`packages/client/test/application-package.test.ts#declaration(${name})`],
    () => JSON.parse(packageDeclaration(name, undefined, name === "needs-hold").bytes))),
  row("client/package root creates child", ["packages/client/test/application-package.test.ts#input"],
    () => JSON.parse(packageDeclaration("root", packageDeclaration("child")).bytes)),
  ...(["notes", "existing"] as const).map(name => row(`CLI/new ${name}`,
    [`packages/cli/src/application-new.ts#newApplicationDefinition(${name})`, "packages/cli/test/application-new.test.ts", "packages/cli/test/application-dev.test.ts"],
    () => newApplicationDefinition(name), RULE_PROFILES)),
  row("CLI/development notes text 200", ["packages/cli/test/application-dev.test.ts#reload definition mutation"],
    () => { const definition = newApplicationDefinition("notes"); shortenNotesText(definition); return definition; }, RULE_PROFILES),
  row("CLI/clock", ["packages/cli/test/application-local.test.ts#clock-fixture"], clockDefinition, RULE_PROFILES),
  row("CLI/Counter with cite", ["packages/cli/test/application-scenarios.test.ts#packet(true)"],
    () => { const definition = counter(); addCounterCitation(definition); return definition; }, RULE_PROFILES),
  row("CLI/scenario parent of Counter", ["packages/cli/test/application-scenarios.test.ts#packet(false,true)"],
    () => scenarioParent(definitionDigest(counter())), RULE_PROFILES),
  row("CLI/package report", ["packages/cli/test/application-pack.test.ts#test.package-report before badName mutation"], packageReportDefinition, RULE_PROFILES),
  ...([ ["device fixture", devicePackageFixture, "packages/cli/test/application-scenarios.test.ts#deviceOwner"],
    ["Grow Room", room, "packages/cli/test/application-examples.test.ts#fault-scenario.json"] ] as const).flatMap(([name, child, origin]) => [
    row(`CLI/scripted parent ${name} shape`, [origin, "packages/cli/src/application-local-device-fixture.ts#validateDefinition(parent,PROPOSED_BOUNDS)"], () => parent(child)),
    row(`CLI/scripted parent ${name} native`, [origin, "packages/cli/src/application-local.ts#scriptedDeviceBirth"], () => parent(child), RULE_PROFILES),
  ]),
  row("MCP/garden shape", ["packages/mcp/test/inventory.test.ts#validateDefinition(garden,PROPOSED_BOUNDS)"], () => structuredClone(garden)),
  row("MCP/garden native", ["packages/mcp/test/discovery.scope.test.ts", "packages/mcp/test/unfamiliar.scope.test.ts"], () => structuredClone(garden), RULE_PROFILES),
  row("MCP/pantry", ["packages/mcp/test/proto.scope.test.ts", "packages/mcp/test/support/pantry.ts#pantry"], () => structuredClone(pantry), RULE_PROFILES),
  ...Object.entries({ issueLike, roomLike }).map(([name, definition]) => row(`MCP/${name}`,
    ["packages/mcp/test/binding.scope.test.ts#activation and lane creation", `packages/mcp/test/support/collisions.ts#${name}`], () => structuredClone(definition), RULE_PROFILES)),
  row("MCP/input ordered false", ["packages/mcp/test/declared-view-inputs.test.ts#fixture(false)"],
    () => commitments(definition => configureInputDefinition(definition, false))),
  ...([ ["pledge", configurePledgeDefinition], ["constant choices", configureConstantDefinition], ["series", configureSeriesDefinition] ] as const).map(([name, configure]) =>
    row(`MCP/view ${name}`, [`packages/mcp/test/declared-views.test.ts#${name}`], () => commitments(configure))),
  row("MCP/relaxed counting", ["packages/mcp/test/describe.test.ts#relaxed"], relaxedCounting),
  row("MCP/Grow launcher", ["packages/mcp/test/support/grow-owned-session.ts#launcher"], () => growLauncherDefinition(definitionDigest(site)), RULE_PROFILES),
  row("Page/custom LIST1", ["apps/room/page/test/source-support.test.ts#custom"], customListDefinition),
];
