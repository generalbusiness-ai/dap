/** Generate separate demo package sources. The maintained check fixture is
 * input only. This refuses before G5a is actually present in this checkout. */
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalize, isRecord, parseStrictBytes } from "@generalbusiness/dap-bytes";
import { demoDefinitions } from "./demo-definitions.ts";
import { prepareGrowCheck } from "./prepare-check.ts";

export async function prepareGrowDemo(destination?: string): Promise<string> {
  const definitions = demoDefinitions();
  if (!definitions.room.capabilities.some(capability => String(capability.name) === "device-command" && capability.version === 1)) {
    throw new Error("The Grow demo requires the actual reviewed G5a declarations in this checkout before package preparation.");
  }
  const root = await prepareGrowCheck(destination);
  for (const [name, definition] of [["site.json", definitions.site], ["room.json", definitions.room]] as const) {
    await writeFile(join(root, name), canonicalize(definition), { mode: 0o600 });
  }
  const config = parseStrictBytes(new Uint8Array(await readFile(join(root, "dap.application.json"))));
  if (!isRecord(config) || !isRecord(config["presentation"]) || !Array.isArray(config["presentation"]["assets"])) throw new Error("The maintained fixture has no package-v2 presentation source.");
  config["name"] = "ai.generalbusiness.grow-demo"; config["version"] = "1.0.0";
  config["roles"] = {
    admin: ["grow.climate", "grow.configure", "grow.heat"],
    maintainer: ["grow.apply", "grow.water", "grow.water-more"],
    member: ["grow.tend"], agent: ["grow.climate", "grow.sense"],
  };
  // Fixture scenarios remain at examples/grow/check; they do not pretend
  // to provision these different immutable principal assignments.
  config["scenarios"] = [];
  config["presentation"]["assets"] = [...config["presentation"]["assets"], { file: "simulator.json", path: "simulator.json", mediaType: "application/json" }];
  await writeFile(join(root, "simulator.json"), await readFile(new URL("./demo/simulator.json", import.meta.url)), { flag: "wx", mode: 0o600 });
  await writeFile(join(root, "dap.application.json"), canonicalize(config) + "\n", { mode: 0o600 });
  return root;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length > 3) throw new Error("Usage: prepare-demo.ts [new-directory]");
  console.log(await prepareGrowDemo(process.argv[2]));
}
