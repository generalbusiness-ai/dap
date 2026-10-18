/** Node-only source capture. The TEST signer signs the complete maintained
 * packets, including their bundled browser assets, for native installation. */
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { TestProject } from "vitest/node";
import type { MaintainedApplicationInputs } from "./maintained-applications.ts";

export default async function setup(project: TestProject) {
  // The browser compiler uses native import.meta.resolve. Vite's global
  // setup module runner does not implement it, so use a fixed Node child.
  const { stdout } = await promisify(execFile)(process.execPath, ["--import", createRequire(import.meta.url).resolve("tsx"), fileURLToPath(new URL("./maintained-applications-child.ts", import.meta.url))],
    { timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
  project.provide("maintainedApplications", JSON.parse(stdout) as MaintainedApplicationInputs);
}
