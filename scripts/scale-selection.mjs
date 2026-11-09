import { execFileSync } from "node:child_process";

// PD-3 selects these runtime families and their existing test owners.
const families = [
  "packages/scope/src/archive", "packages/scope/test/archive",
  "packages/scope/test/floor", "packages/derive/src/floor",
  "packages/derive/test/floor", "packages/git/src/journal",
  "packages/git/test/journal", "packages/platform/src/directory-partitions",
  "packages/platform/test/directory-partitions",
  "apps/room/lanes/test/directory-partition",
];

export function scaleGateDecision({ head, main, changedPaths }) {
  if (!/^[a-f0-9]{40}$/.test(head) || !/^[a-f0-9]{40}$/.test(main)
    || !Array.isArray(changedPaths) || changedPaths.some(path => typeof path !== "string" || !path)) {
    throw new Error("The scale gate needs exact heads and the complete changed-path list.");
  }
  const matchedPaths = changedPaths.filter(path => families.some(prefix => path.startsWith(prefix)));
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
