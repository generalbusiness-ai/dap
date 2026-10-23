// What the removal of the earlier model must keep true (scope contract, section 11.6):
// no active file imports from spikes/parked/, and no active file names a format, binding or
// variable that was deleted. Active: the packages, the root scripts and configuration,
// and the guides that describe what is built. Not active, and not read here: spikes/parked/,
// the dated notes and plans (notes/, with notes/plans/), the three guides marked inactive,
// and examples/, spikes/ and .github/, which later deliveries own (spikes/parked/README.md
// lists them). Only tracked files are read: a checkout that once built the parked packages
// keeps their generated output under the old paths, untracked, and that output is not source.
//
//   node --test scripts/active-source.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { moduleSpecifierSpans } from "./public-release-modules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Preserve the existing dependency checks at their relocated physical paths.
const packagePath = (file) => file.replace(/^apps\/room\/lanes\//, "packages/lanes/").replace(/^apps\/room\/page\//, "packages/page/");
const INACTIVE = /^apps\/counter\/|^(notes|examples|spikes|\.github)\/|^docs\/(protocol|policy-pack|release)\.md$|^scripts\/active-source\.test\.mjs$/;
const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter((f) => f !== "" && !INACTIVE.test(packagePath(f)));
const text = (file) => { try { return readFileSync(join(root, file), "utf8"); } catch { return ""; } };   // a file deleted and not yet committed

const REMOVED = /artroom-log-v1|artroom-policy-v[12]|artroom-steps-v1|artroom-legacy-v1|artroom\.v1|\bROOMS\b|\bREGISTRY\b|LEASE_SECONDS/;
// An import, a re-export, a dynamic import or a configuration path that reaches into spikes/parked/.
const REACHES = /(?:from|import|require|extends|include|"path"|workspaces)[^\n]*["'][^"'\n]*\b(?:spikes\/)?parked\//;

test("no active file names a removed format, binding or variable", () => {
  assert.ok(files.length > 50, "the active files were listed");
  assert.deepEqual(files.filter((f) => REMOVED.test(text(f))), []);
});

test("no active source or configuration file reaches into spikes/parked/, and spikes/parked/ is in no workspace", () => {
  assert.deepEqual(files.filter((f) => !f.endsWith(".md") && REACHES.test(text(f))), []);
  const lock = JSON.parse(text("package-lock.json"));
  assert.deepEqual(Object.keys(lock.packages).filter((p) => p.startsWith("parked/") || p.startsWith("spikes/parked/")), []);
});

// A lane is a definition, and the platform holds no lane (I2 plan, section 4.1). The lanes
// package may depend on any platform package. No platform package names it or reaches into it.
// The page is a client, not a platform package: its story test runs on the lanes' room fixture
// and demo definitions, so its tests and its development dependency may name the lanes package,
// and its source may not. The MCP server is a client too: its tests measure the lists of the demo
// and full lane definitions, under the same rule.
test("no platform package depends on the lanes package or imports from it", () => {
  assert.ok(files.includes("apps/room/lanes/package.json"), "the lanes package was listed");
  const pageTests = (f) => /^packages\/(page|mcp)\/test\//.test(packagePath(f)) || f === "apps/room/page/package.json" || f === "packages/mcp/package.json";
  const platform = files.filter((f) => packagePath(f).startsWith("packages/") && !packagePath(f).startsWith("packages/lanes/") && !pageTests(f) && !f.endsWith(".md"));
  assert.deepEqual(platform.filter((f) => /(?:artroom|dap)-lanes|[.\/]\/lanes\//.test(text(f))), []);
  const page = JSON.parse(text("apps/room/page/package.json") || "{}");
  assert.equal(page.dependencies?.["@generalbusiness/dap-lanes"], undefined, "the page depends on the lanes package for its tests only");
  const mcp = JSON.parse(text("packages/mcp/package.json") || "{}");
  assert.equal(mcp.dependencies?.["@generalbusiness/dap-lanes"], undefined, "the MCP server depends on the lanes package for its tests only");
});

// The platform package is pure data and rules over the contract, the bytes and the derivation (I3 plan, section 3.1). It names no
// package above them, and only the packages that run or check its definitions name it: the runtime, the verifier, the lanes' tests,
// and the command line, which reads a platform definition's acts (no scope retains a platform definition's declaration to read) and
// runs the verifier with the platform's rules; the page, which reads a platform definition's acts as the command line does; and the
// MCP server, which derives the act tools of the platform's scopes from those acts.
test("the platform package depends only on contract, bytes and derive, and only scope, replay, lanes, cli, page and mcp name it", () => {
  assert.ok(files.includes("packages/platform/package.json"), "the platform package was listed");
  const source = (f) => packagePath(f).startsWith("packages/") && !f.endsWith(".md");
  const inside = files.filter((f) => source(f) && packagePath(f).startsWith("packages/platform/"));
  assert.deepEqual(inside.filter((f) => /(?:artroom|dap)-(scope|replay|client|lanes)/.test(text(f))), []);
  const named = files.filter((f) => source(f) && !/^packages\/(platform|scope|replay|lanes|cli|page|mcp)\//.test(packagePath(f)));
  assert.deepEqual(named.filter((f) => /(?:artroom|dap)-platform/.test(text(f))), []);
});

// The git package is the one place that touches a Git repository or a Git host (I3 plan, section 3.1). It depends only on contract and
// bytes. The runtime and the checker service name it. The platform package may name it in its tests only, where the host stand-in runs
// the same table of sends as the real repository does: no rule of a platform definition reads a repository.
// M1 preparation permits one explicit public immutable reader import. The
// server's other modules and broad Git/provider/Node entry points stay closed.
// Grow's exact development host fixture constructs a synthetic archive and
// exercises the actual smart-HTTP send boundary with scripted host replies.
const applicationGitUsers = new Set(["packages/mcp/package.json", "packages/mcp/src/service.ts", "apps/room/lanes/test/grow-archive.test.ts"]);
// Replay's Node and integration test boundaries may depend on Git. The v2
// witnesses combine real Git archives with offline Replay; Git itself stays
// below Replay and imports none of it, including from its own tests.
const replayGitUsers = new Set(["packages/replay/src/git.ts", "packages/replay/test/archive-git.test.ts", "packages/replay/test/archive-git-fixture.ts", "packages/replay/package.json",
  "packages/replay/test/archive-git-v2-convert.test.ts", "packages/replay/test/archive-git-v2-layout.test.ts", "packages/replay/test/archive-git-v2-reader.test.ts",
  "packages/replay/test/archive-anchor-ranges.test.ts"]);
test("Git keeps its lower-layer dependencies; Replay names it only at its exact development boundaries", () => {
  assert.ok(files.includes("packages/git/package.json"), "the git package was listed");
  const source = (f) => packagePath(f).startsWith("packages/") && !f.endsWith(".md");
  const inside = files.filter((f) => source(f) && packagePath(f).startsWith("packages/git/"));
  assert.deepEqual(inside.filter((f) => /(?:artroom|dap)-(derive|platform|scope|replay|client|lanes|checkers)/.test(text(f))), []);
  const named = files.filter((f) => source(f) && !replayGitUsers.has(f) && !applicationGitUsers.has(f) && !/^packages\/(git|scope|checkers)\/|^packages\/platform\/test\//.test(packagePath(f)));
  assert.deepEqual(named.filter((f) => /dap-git/.test(text(f))), []);
  const replay = JSON.parse(text("packages/replay/package.json"));
  assert.equal(replay.dependencies?.["@generalbusiness/dap-git"], undefined);
  assert.equal(replay.devDependencies?.["@generalbusiness/dap-git"], replay.version);
});

const nodeReplayInputs = new Set(["packages/replay/src/git.ts", "packages/replay/src/bin.ts"]);
const edgeTarget = (file, specifier) => specifier.startsWith(".") ? normalize(join(dirname(file), specifier)) : specifier;
function portableReplayImport(file, specifier) {
  if (specifier.startsWith(".")) {
    const target = edgeTarget(file, specifier);
    return target.startsWith("packages/replay/src/") && target.endsWith(".ts") && !nodeReplayInputs.has(target);
  }
  return /^@generalbusiness\/dap-(?:bytes|contract|derive)(?:\/[^.][^\n]*)?$/.test(specifier)
    && !specifier.split("/").some(part => part === "." || part === "..");
}
function archiveEdgeAllowed(file, specifier) {
  const target = edgeTarget(file, specifier);
  if (file.startsWith("packages/git/")) return !/^(?:packages\/replay\/|@generalbusiness\/(?:artroom|dap)-replay(?:\/|$))/.test(target);
  if (file.startsWith("packages/replay/src/") && !nodeReplayInputs.has(file)) return portableReplayImport(file, specifier);
  if (file.startsWith("packages/replay/") && /^(?:packages\/git\/|@generalbusiness\/dap-git(?:\/|$))/.test(target)) return replayGitUsers.has(file);
  return true;
}

// Invariant: type imports, re-exports, dynamic imports and relative paths
// cannot introduce a Git cycle or hide Node behind a portable Replay module.
test("archive Node exceptions are exact and preserve portable and Git dependency directions", () => {
  const portable = "packages/replay/src/archive.ts";
  assert.equal(archiveEdgeAllowed(portable, "./verify.ts"), true);
  assert.equal(archiveEdgeAllowed("packages/replay/src/git.ts", "@generalbusiness/dap-git/journal-reader"), true);
  for (const specifier of ["node:fs", "fs", "@generalbusiness/dap-git", "../../git/src/journal-reader.ts", "./git.ts", "./bin.ts"]) {
    for (const body of [`import type { X } from '${specifier}';`, `export * from '${specifier}';`, `const load = () => import('${specifier}');`]) {
      const refs = moduleSpecifierSpans(body); assert.equal(refs.length, 1);
      assert.equal(archiveEdgeAllowed(portable, refs[0].value), false, body);
    }
  }
  for (const specifier of ["@generalbusiness/dap-replay", "../../replay/src/archive.ts"]) assert.equal(archiveEdgeAllowed("packages/git/src/journal-reader.ts", specifier), false);
  assert.equal(archiveEdgeAllowed("packages/replay/test/unlisted.test.ts", "../../git/src/journal-reader.ts"), false);
  assert.equal(archiveEdgeAllowed("packages/replay/src/extra-node.ts", "node:fs"), false);
  const governed = files.filter(file => /^packages\/(?:git|replay)\/.*\.ts$/.test(file));
  assert.deepEqual(governed.flatMap(file => moduleSpecifierSpans(text(file)).filter(({ value }) => !archiveEdgeAllowed(file, value)).map(({ value }) => `${file}: ${value}`)), []);
});

// The checkers package is the checker service: a separate service with its own key, and not a scope (I3 plan, section 3.1). It
// depends only on contract, bytes and git. No package names it. The lanes' scenario of a check reads its origin read and its signer
// by path, in a test. The manifest scenario also runs the actual checker service
// against a real lane and a job-bound snapshot. No production source reaches it.
test("the checkers package depends only on contract, bytes and git, and no package names it", () => {
  assert.ok(files.includes("packages/checkers/package.json"), "the checkers package was listed");
  const source = (f) => packagePath(f).startsWith("packages/") && !f.endsWith(".md");
  const inside = files.filter((f) => source(f) && packagePath(f).startsWith("packages/checkers/"));
  assert.deepEqual(inside.filter((f) => /(?:artroom|dap)-(derive|platform|scope|replay|client|lanes)/.test(text(f))), []);
  const named = files.filter((f) => source(f) && !packagePath(f).startsWith("packages/checkers/"));
  assert.deepEqual(named.filter((f) => /artroom-checkers/.test(text(f))), []);
  const reaches = files.filter((f) => source(f) && !packagePath(f).startsWith("packages/checkers/") && /(?:[.\/]\/|packages\/)checkers\//.test(text(f)));
  assert.deepEqual(reaches, ["apps/room/lanes/test/checks.scope.test.ts", "apps/room/lanes/test/manifest-tree.scope.test.ts"]);
});

// The MCP server derives every tool from definitions as data (plan 031): its source imports the contract, the bytes, the client,
// the platform and the derivation, and never a lane definition, an example, the page, the checker service or the runtime. Its
// tests may run the runtime's test Worker and read the lanes and examples, as the page's do.
function mcpImportAllowed(file, specifier) {
  if (file === "packages/mcp/src/service.ts" && specifier === "@generalbusiness/dap-git/application") return true;
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const target = normalize(join(dirname(file), specifier));
    return target.startsWith("packages/mcp/src/") && /\.(ts|json)$/.test(target) && files.includes(target);
  }
  return /^(@generalbusiness\/dap-(bytes|client|contract|platform|derive)(\/.*)?|node:[a-z_/]+)$/.test(specifier)
    && !specifier.split("/").some(part => part === "." || part === "..");
}

// Invariant: a nested server module may reach its own tracked source, but never a test, browser entry or another package.
test("MCP relative imports stay inside tracked server source", () => {
  assert.equal(mcpImportAllowed("packages/mcp/src/service.ts", "./views/session.ts"), true);
  assert.equal(mcpImportAllowed("packages/mcp/src/service.ts", "@generalbusiness/dap-git/application"), true);
  assert.equal(mcpImportAllowed("packages/mcp/src/views/session.ts", "@generalbusiness/dap-git/application"), false);
  for (const specifier of ["@generalbusiness/dap-git", "@generalbusiness/dap-git/node", "@generalbusiness/dap-git/http", "@generalbusiness/dap-git/github", "@generalbusiness/dap-git/application/../node"]) {
    assert.equal(mcpImportAllowed("packages/mcp/src/service.ts", specifier), false, specifier);
  }
  assert.equal(mcpImportAllowed("packages/mcp/src/views/session.ts", "../custody.ts"), true);
  for (const specifier of ["../../test/support/room.ts", "../../browser/main.ts", "../../../scope/src/object.ts", "/tmp/other.ts", "@generalbusiness/dap-lanes", "@generalbusiness/dap-client/../scope"]) {
    assert.equal(mcpImportAllowed("packages/mcp/src/views/session.ts", specifier), false, specifier);
  }
});

test("the MCP server imports its lower layers and the exact public application Git reader only", () => {
  assert.ok(files.includes("packages/mcp/package.json"), "the mcp package was listed");
  const inside = files.filter((f) => packagePath(f).startsWith("packages/mcp/src/") && f.endsWith(".ts"));
  assert.ok(inside.length > 5, "the server's source was listed");
  assert.deepEqual(inside.flatMap((file) => moduleSpecifierSpans(text(file)).filter(({ value }) => !mcpImportAllowed(file, value)).map(({ value }) => `${file}: ${value}`)), []);
  assert.deepEqual(inside.filter((f) => /(?:artroom|dap)-(lanes|page|checkers|scope|replay)|examples\//.test(text(f))), []);
  const mcp = JSON.parse(text("packages/mcp/package.json") || "{}");
  assert.deepEqual(Object.keys(mcp.dependencies ?? {}).filter((d) => d !== "@generalbusiness/dap-git" && !/^@generalbusiness\/dap-(bytes|client|contract|platform|derive)$/.test(d)), []);
});

// Invariant: reusable runtime modules never require application source or page assets.
test("framework runtime modules do not import application source", () => {
  const runtime = files.filter(file => /^packages\/[^/]+\/src\/.*\.(ts|mjs)$/.test(file));
  const reaches = runtime.flatMap(file => moduleSpecifierSpans(text(file)).flatMap(({ value }) => {
    const target = value.startsWith(".") ? normalize(join(dirname(file), value)) : value;
    return target.startsWith("apps/") || /^@generalbusiness\/dap-page(?:\/|$)/.test(target) ? [`${file}: ${value}`] : [];
  }));
  assert.deepEqual(reaches, []);
});
