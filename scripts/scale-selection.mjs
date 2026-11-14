import { execFileSync } from "node:child_process";
import { posix } from "node:path";
import { scopeScaleFiles } from "../packages/scope/vitest.scale-files.ts";

// PD-3 and GS1 select these runtime families and their existing test owners.
const families = [
  "packages/scope/src/archive", "packages/scope/test/archive",
  "packages/scope/test/floor", "packages/derive/src/floor",
  "packages/derive/test/floor", "packages/git/src/journal",
  "packages/git/test/journal", "packages/platform/src/directory-partitions",
  "packages/platform/test/directory-partitions",
  "apps/room/lanes/test/directory-partition",
  "packages/scope/test/evidence-rules-real",
  "apps/room/lanes/test/certified-rules-hardening",
  "apps/room/lanes/test/manifest-tree", "apps/room/lanes/test/demo",
];

// These actual owners protect the moved Native membership, floor, proof,
// archive, evidence and publication paths. Shared fixture changes also select
// their scale witnesses; unrelated files retain the omission rule.
const protectedFiles = new Set([
  ...scopeScaleFiles.map(file => posix.normalize(posix.join("packages/scope", file))),
  "packages/cli/test/fixed-slot-membership.scope.test.ts",
  "packages/contract/src/bounds.ts",
  "packages/platform/src/base-membership.ts", "packages/platform/src/membership.ts",
  "packages/derive/src/program/guard-value.ts", "packages/derive/src/fold.ts",
  "packages/derive/src/judge.ts", "packages/cli/src/command-verify.ts",
  "packages/cli/src/verification.ts", "packages/replay/src/verify.ts",
  "packages/scope/src/core.ts", "packages/scope/src/turn.ts", "packages/scope/src/sqlite.ts",
  "packages/scope/src/operations.ts", "packages/scope/src/native-birth.ts",
  "packages/scope/src/partition-proof.ts", "packages/scope/src/receiver-reads.ts",
  "packages/scope/src/proof-bytes.ts", "packages/scope/src/read-preparation.ts",
  "packages/platform/src/partition-provenance.ts",
  "packages/platform/src/destination-budget-v15.ts", "packages/platform/src/destination-v15.ts",
  "packages/platform/src/destination.ts", "packages/platform/src/rules-certificate-v15.ts",
  "packages/platform/src/rules-policy-v11.ts", "packages/platform/src/destination-evidence-v17.ts",
  "packages/platform/src/evidence-holds-v17.ts", "packages/platform/src/destination-evidence-capacity-v17.ts",
  "packages/platform/src/destination-evidence-funding-v17.ts", "packages/platform/src/reservation-v17.ts",
  "packages/platform/src/destination-v17.ts", "packages/platform/src/evidence-incident-origin-v17.ts",
  "packages/platform/src/evidence-index-v17.ts", "packages/platform/src/evidence-decision-v17.ts",
  "packages/platform/src/reservation.ts", "packages/platform/src/archive-binding.ts",
  "packages/platform/src/archive-replay-code.ts", "apps/room/archive.ts", "apps/room/archive-policy.ts",
  // The production archive pair installs the current source-built TEST Grow packet.
  "packages/scope/test/support/maintained-applications-setup.ts",
  "packages/scope/test/support/maintained-applications-child.ts",
  "packages/scope/test/support/maintained-applications.ts",
  "packages/scope/test/fixtures.ts",
  "packages/scope/test/fixtures-core.ts",
  "examples/grow/prepare-demo.ts",
  "examples/grow/prepare-check.ts",
  "examples/grow/demo-definitions.ts",
  "examples/grow/room.ts",
  "examples/grow/site.ts",
  "examples/grow/definitions/room.json",
  "examples/grow/definitions/site.json",
  "examples/grow/check/dap.application.json",
  "examples/grow/check/site-scenario.json",
  "examples/grow/check/fault-scenario.json",
  "examples/grow/check/index.html",
  "examples/grow/check/grid.html",
  "examples/grow/check/site.html",
  "examples/grow/demo/simulator.json",
  "packages/cli/src/application-files.ts",
  "packages/platform/src/application-codec/application-package-v2.ts",
  "packages/cli/src/archive-remote.ts", "packages/cli/src/clone-outcome.ts",
  "packages/cli/src/command-repository.ts", "packages/cli/src/command-change.ts",
  "packages/scope/src/worker.ts",
  "packages/scope/src/object.ts", "packages/scope/src/stage-snapshot.ts",
  "packages/scope/src/destination-host.ts", "packages/checkers/src/service.ts",
  "packages/checkers/src/reservation-snapshot.ts", "packages/checkers/src/job.ts",
  "scripts/demo/rehearse.ts", "packages/scope/src/artifacts-wiring.ts",
  "packages/scope/src/github-wiring.ts", "packages/scope/src/site/route.ts", "apps/room/worker.ts",
  "packages/scope/test/fixtures-native.ts", "packages/scope/test/worker.ts",
  "packages/scope/test/outside.ts", "packages/scope/test/definition-corpus-data.ts",
  "packages/scope/test/support/native-fixture-lifetime.ts", "packages/scope/test/support/serving-startup.ts",
  "packages/scope/test/support/session-room.ts", "packages/scope/test/repository.ts",
  "packages/scope/test/session-settings.ts", "packages/scope/test/support.ts",
  "apps/room/lanes/test/support/room.ts", "apps/room/lanes/test/support/graph.ts",
]);

// These files choose the scale configuration or its actual gate invocation.
const selectionFiles = new Set([
  "packages/scope/vitest.scale.config.ts", "packages/scope/vitest.worker.config.ts",
  "packages/scope/vitest.scale-files.ts",
  "vitest.projects.mjs", "vitest.native.config.ts", "vitest.scale.config.ts",
  "scripts/scale-selection.mjs", "scripts/scale-selection.test.mjs",
  "scripts/scale-runner.mjs",
  "scripts/test-phases.test.mjs", "scripts/test.mjs", "scripts/gate.sh",
  "package.json", ".github/workflows/scale-tests.yml",
]);
const selectsScale = path => families.some(prefix => path.startsWith(prefix))
  || /^packages\/scope\/test\/support\/archive[^/]*\.ts$/.test(path)
  || path === "packages/replay/src/archive.ts" || protectedFiles.has(path) || selectionFiles.has(path);

export function scaleGateDecision({ head, main, changedPaths }) {
  if (!/^[a-f0-9]{40}$/.test(head) || !/^[a-f0-9]{40}$/.test(main)
    || !Array.isArray(changedPaths) || changedPaths.some(path => typeof path !== "string" || !path)) {
    throw new Error("The scale gate needs exact heads and the complete changed-path list.");
  }
  const matchedPaths = changedPaths.filter(selectsScale);
  return { include: head === main || matchedPaths.length > 0,
    reason: head === main ? "main" : matchedPaths.length ? "changed-scale-path" : "outside-scale-paths",
    head, main, changedPaths, matchedPaths };
}

export function gateScaleSelection(root) {
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const head = git("rev-parse", "--verify", "HEAD"), main = git("rev-parse", "--verify", "origin/main");
  const base = git("merge-base", head, main);
  // Renames expose both the removed and added path. NUL keeps spaces intact.
  const changedPaths = execFileSync("git", ["diff", "--name-only", "--no-renames", "-z", base, head],
    { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  return { ...scaleGateDecision({ head, main, changedPaths }), base };
}
