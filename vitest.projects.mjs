/**
 * Canonical projects for the root suite and its plain/native phase views.
 * The sixteen plain projects share a group with at most four active file
 * tasks. The Native groups follow in order: scope, scope-stories,
 * scope-lending, scope-denial, and scope-scale. Their worker limits are
 * two, two, one, one, and two. Each group uses separate runtimes.
 * The file-task limit does not cap child processes or overlapping teardown.
 */
import { scopeScaleFiles } from "./packages/scope/vitest.scale-files.ts";

const project = (name, dir, config, group, options = {}) =>
  ({ extends: `./${dir}/${config}`, test: { name, root: `./${dir}`, sequence: { groupOrder: group }, ...options } });

const storyFiles = [
  "../../apps/room/lanes/test/**/*.scope.test.ts",
  "../cli/test/**/*.scope.test.ts",
  "../../apps/room/page/test/**/*.scope.test.ts",
  "../mcp/test/**/*.scope.test.ts",
];

// The page and demo recorders run only when explicitly requested.
const scopeProvide = {
  j3Runner: null,
  evidenceRunner: null,
  pageRecord: process.env["PAGE_RECORD"] === "1",
  demoRecord: process.env["DEMO_RECORD"] === "1",
};

export { scopeScaleFiles, scopeScaleCaseCounts } from "./packages/scope/vitest.scale-files.ts";

const projects = [
      project("bytes", "packages/bytes", "vitest.config.ts", 0),
      project("derive", "packages/derive", "vitest.config.ts", 0),
      project("define", "packages/define", "vitest.config.ts", 0),
      project("platform", "packages/platform", "vitest.config.ts", 0),
      project("git", "packages/git", "vitest.config.ts", 0),
      project("checkers", "packages/checkers", "vitest.config.ts", 0),
      project("replay", "packages/replay", "vitest.config.ts", 0),
      project("client", "packages/client", "vitest.config.ts", 0),
      project("scope", "packages/scope", "vitest.worker.config.ts", 1, { provide: scopeProvide }),
      project("scope-stories", "packages/scope", "vitest.worker.config.ts", 2, {
        include: storyFiles,
        // Vite appends include arrays from the project to the inherited list.
        exclude: ["test/**/*.test.ts", ...scopeScaleFiles],
        provide: scopeProvide,
      }),
      project("scope-lending", "packages/scope", "vitest.lending.config.ts", 3),
      project("scope-denial", "packages/scope", "vitest.denial.config.ts", 4),
      project("scope-scale", "packages/scope", "vitest.scale.config.ts", 5, { provide: scopeProvide }),
      project("lanes", "apps/room/lanes", "vitest.config.ts", 0),
      project("cli", "packages/cli", "vitest.config.ts", 0),
      project("page", "apps/room/page", "vitest.config.ts", 0),
      project("mcp", "packages/mcp", "vitest.config.ts", 0),
      {
        extends: "./apps/counter/vitest.config.ts",
        test: { name: "counting", root: "./apps/counter", sequence: { groupOrder: 0 } },
      },
      {
        extends: "./examples/lending/vitest.config.ts",
        test: { name: "lending", root: "./examples/lending", sequence: { groupOrder: 0 } },
      },
      {
        extends: "./examples/grow/vitest.config.ts",
        test: { name: "grow", root: "./examples/grow", sequence: { groupOrder: 0 } },
      },
      {
        extends: "./examples/repo-in-ai/vitest.config.ts",
        test: { name: "repo-in-ai", root: "./examples/repo-in-ai", sequence: { groupOrder: 0 } },
      },
];

const plainNames = ["bytes", "derive", "define", "platform", "git", "checkers", "replay", "client", "lanes", "cli", "page", "mcp", "counting", "lending", "grow", "repo-in-ai"];
const nativeNames = ["scope", "scope-stories", "scope-lending", "scope-denial", "scope-scale"];
const namesEqual = (actual, expected) => actual.length === expected.length && actual.every((name, index) => name === expected[index]);

// Select data before Vitest resolves any inherited package config/plugin.
// This fixed partition is not a new project registration or runner API.
export function testOptions(phase = "all", scale = "run") {
  if (!["all", "plain", "native", "scale"].includes(phase)) throw new Error("Unknown test phase.");
  if (!["run", "omit"].includes(scale) || (scale === "omit" && phase !== "native")) {
    throw new Error("Only the native gate phase may omit scale.");
  }
  const plain = projects.filter(project => project.test.sequence.groupOrder === 0);
  const native = projects.filter(project => project.test.sequence.groupOrder !== 0);
  if (!namesEqual(plain.map(project => project.test.name), plainNames)
    || !namesEqual(native.map(project => project.test.name), nativeNames)
    || native.some((project, index) => project.test.sequence.groupOrder !== index + 1)) {
    throw new Error("The canonical test projects do not match the sixteen/plain five/native partition.");
  }
  return {
    maxWorkers: 4,
    ...(process.env["ARTROOM_TEST_PROGRESS"] || process.env["ARTROOM_TEST_TIMING"]
      ? { reporters: ["verbose", "./scripts/test-progress.mjs"] } : {}),
    projects: phase === "plain" ? plain
      : phase === "scale" ? native.filter(project => project.test.name === "scope-scale")
      : phase === "native" ? native.filter(project => scale === "run" || project.test.name !== "scope-scale") : projects,
  };
}
