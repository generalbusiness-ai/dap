/**
 * Canonical projects for the root suite and its plain/native phase views.
 * Each project keeps its package's own config. The plain projects share a
 * group with at most four active file tasks in total. The `scope`,
 * `scope-lending` and `scope-denial` groups follow in order, with worker
 * limits of two, one and one in separate runtimes.
 * The file-task limit does not cap child processes or overlapping teardown.
 *
 * The lane scenarios on real scopes, `apps/room/lanes/test/*.scope.test.ts`,
 * run here inside the `scope` project: one Worker loaded per runtime. A
 * second project in the Workers runtime pool historically added 0.7 seconds to this run,
 * and the files in the one project add 0.2 (observed, three runs each, on a
 * shared machine). The scope package does not name them: this file does.
 * `apps/room/lanes/vitest.scope.config.ts` runs them alone, in a Worker of
 * the lanes package's own, with the same classes. The command line's story,
 * `packages/cli/test/*.scope.test.ts`, and the page's story,
 * `apps/room/page/test/*.scope.test.ts`, and the MCP server's stories,
 * `packages/mcp/test/*.scope.test.ts`, run here the same way, and have no
 * Worker of their own.
 *
 * The historical Lending story has its own ordered `scope-lending` Worker
 * runtime after `scope`. Its repeated mixed-project failure remains masked;
 * this bounds runtime reuse without claiming that cause is established.
 * The post-sent local-denial witness then has its own `scope-denial` Worker
 * runtime. This isolates the observed unsafe-abort interaction
 * with later Operations tests; each witness still runs once in the native phase.
 */
const project = (name, dir, config, group, more = [], options = {}) =>
  ({ extends: `./${dir}/${config}`, test: { name, root: `./${dir}`, ...(more.length > 0 ? { include: ["test/**/*.test.ts", ...more] } : {}), sequence: { groupOrder: group }, ...options } });

const projects = [
      project("bytes", "packages/bytes", "vitest.config.ts", 0),
      project("derive", "packages/derive", "vitest.config.ts", 0),
      project("platform", "packages/platform", "vitest.config.ts", 0),
      project("git", "packages/git", "vitest.config.ts", 0),
      project("checkers", "packages/checkers", "vitest.config.ts", 0),
      project("replay", "packages/replay", "vitest.config.ts", 0),
      project("client", "packages/client", "vitest.config.ts", 0),
      project("scope", "packages/scope", "vitest.worker.config.ts", 1, ["../../apps/room/lanes/test/**/*.scope.test.ts", "../cli/test/**/*.scope.test.ts", "../../apps/room/page/test/**/*.scope.test.ts", "../mcp/test/**/*.scope.test.ts"], {
        // The page's recorder for its screenshots runs only when asked: `PAGE_RECORD=1` (apps/room/page/test/screens.mjs). So does
        // the demo runner's recorder for its captures: `DEMO_RECORD=1` (scripts/demo-captures.ts --recorded).
        provide: { j3Runner: null, evidenceRunner: null, pageRecord: process.env["PAGE_RECORD"] === "1", demoRecord: process.env["DEMO_RECORD"] === "1" },
      }),
      project("scope-lending", "packages/scope", "vitest.lending.config.ts", 2),
      project("scope-denial", "packages/scope", "vitest.denial.config.ts", 3),
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
];

const plainNames = ["bytes", "derive", "platform", "git", "checkers", "replay", "client", "lanes", "cli", "page", "mcp", "counting", "lending", "grow"];
const nativeNames = ["scope", "scope-lending", "scope-denial"];
const namesEqual = (actual, expected) => actual.length === expected.length && actual.every((name, index) => name === expected[index]);

// Select data before Vitest resolves any inherited package config/plugin.
// This fixed partition is not a new project registration or runner API.
export function testOptions(phase = "all") {
  if (!["all", "plain", "native"].includes(phase)) throw new Error("Unknown test phase.");
  const plain = projects.filter(project => project.test.sequence.groupOrder === 0);
  const native = projects.filter(project => project.test.sequence.groupOrder !== 0);
  if (!namesEqual(plain.map(project => project.test.name), plainNames)
    || !namesEqual(native.map(project => project.test.name), nativeNames)
    || native.some((project, index) => project.test.sequence.groupOrder !== index + 1)) {
    throw new Error("The canonical test projects do not match the fourteen/plain three/native partition.");
  }
  return {
    maxWorkers: 4,
    ...(process.env["ARTROOM_TEST_PROGRESS"] || process.env["ARTROOM_TEST_TIMING"]
      ? { reporters: ["verbose", "./scripts/test-progress.mjs"] } : {}),
    projects: phase === "plain" ? plain : phase === "native" ? native : projects,
  };
}
