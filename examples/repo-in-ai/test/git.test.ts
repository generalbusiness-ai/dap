import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import type { FactRef, ScopeId } from "@generalbusiness/dap-contract";
import { utf8 } from "@generalbusiness/dap-bytes";
import { GitProgram } from "@generalbusiness/dap-git";
import { nodeExec } from "@generalbusiness/dap-git/node";
import { initialCommitObjects, readmeText } from "@generalbusiness/dap-platform";
import { SEED_LIMITS, seedTree } from "../seed.ts";
import { TASK_LIST_PATHS, SeedGitFailure, buildSeedCandidate, collectCloneFiles, compareClone, loadTaskList } from "../git.ts";

// Real local Git, with scripted founding facts. No Native creation, provider,
// credential or hosted clone participates in this owning boundary witness.
const sourceRoot = fileURLToPath(new URL("../task-list", import.meta.url));
const scope = `sc_${"g".repeat(51)}a` as ScopeId;
const claim: FactRef = { at: { kind: "register", scope: `sc_${"r".repeat(51)}a`, inc: `in_${"r".repeat(25)}a` }, seq: 7, hash: `sha256:${"1".repeat(64)}` };
const readme = { name: "repo-in-ai-1", handle: "@owner", directory: `sc_${"d".repeat(51)}a` as ScopeId };
const fixtureGit = () => new GitProgram({ exec: nodeExec, transport: "local", timeoutMs: 8_000, env: {
  GIT_AUTHOR_NAME: "S1 test", GIT_AUTHOR_EMAIL: "s1@artroom.invalid", GIT_AUTHOR_DATE: "2000-01-01T00:00:00Z",
  GIT_COMMITTER_NAME: "S1 test", GIT_COMMITTER_EMAIL: "s1@artroom.invalid", GIT_COMMITTER_DATE: "2000-01-01T00:00:00Z",
} });

test("real Git writes the seed with its exact founding parent and a fresh clone preserves every task-list blob and generator README", async () => {
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "artroom-s1-git-"))), repository = join(temp, "source.git"), clone = join(temp, "clone");
  const git = fixtureGit();
  try {
    await git.ok("init", ["init", "--quiet", "--bare", "--object-format=sha1", "--initial-branch=main", repository]);
    const founding = initialCommitObjects("sha1", scope, "2026-10-30T12:00:00Z", claim, readme);
    for (const object of founding.objects) expect(await git.ok("founding-object", ["-C", repository, "hash-object", "-w", "-t", object.kind, "--stdin"], object.body)).toBe(`${object.id}\n`);
    const source = loadTaskList(sourceRoot), seed = seedTree(founding, source);
    const candidate = await buildSeedCandidate(repository, seed);
    expect(await git.ok("parent", ["-C", repository, "rev-list", "--parents", "-n", "1", candidate.commit])).toBe(`${candidate.commit} ${founding.commit}\n`);
    expect(await git.ok("unchanged-refs", ["-C", repository, "for-each-ref"])).toBe("");
    await git.ok("publish-fixture-ref", ["-C", repository, "update-ref", "refs/heads/main", candidate.commit]);
    await git.ok("clone", ["clone", "--quiet", "--no-hardlinks", "--", repository, clone]);
    const actual = await collectCloneFiles(clone, candidate.commit);
    const expected = [{ path: "README.md", mode: "100644", bytes: utf8(readmeText(readme)) }, ...source.map(row => ({ ...row, path: `task-list/${row.path}` }))];
    expect(actual.map(row => row.path).sort()).toEqual(expected.map(row => row.path).sort());
    for (const row of expected) expect(actual.find(item => item.path === row.path)).toEqual(row);
    expect(await compareClone(clone, candidate.commit, expected)).toEqual({ matches: true, missing: [], extra: [], different: [] });

    // The ruling requires Git blob bytes, not working-copy conversions.
    writeFileSync(join(clone, "README.md"), "dirty working copy only\n");
    expect((await compareClone(clone, candidate.commit, expected)).matches).toBe(true);
    // An actual different committed README must fail that same full comparison.
    const wrong = (await git.ok("changed-blob", ["-C", clone, "hash-object", "-w", "--stdin"], utf8("changed Git blob\n"))).trim();
    await git.ok("fixture-index", ["-C", clone, "read-tree", candidate.commit]);
    await git.ok("change-readme", ["-C", clone, "update-index", "--cacheinfo", `100644,${wrong},README.md`]);
    const tree = (await git.ok("changed-tree", ["-C", clone, "write-tree"])).trim();
    const changed = (await git.ok("changed-commit", ["-C", clone, "commit-tree", tree, "-p", candidate.commit], utf8("S1 mismatched clone control.\n"))).trim();
    await git.ok("move-fixture-head", ["-C", clone, "update-ref", "refs/heads/main", changed]);
    expect(await compareClone(clone, changed, expected)).toEqual({ matches: false, missing: [], extra: [], different: ["README.md"] });
    await expect(collectCloneFiles(clone, candidate.commit)).rejects.toMatchObject({ reason: "head" });
  } finally { rmSync(temp, { recursive: true, force: true }); }
}, 120_000);

test("source loading requires exactly the six regular task-list paths and refuses links, extra files and oversized bytes before Git construction", () => {
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "artroom-s1-source-"))), root = join(temp, "task-list");
  try {
    mkdirSync(join(root, "test"), { recursive: true });
    for (const path of TASK_LIST_PATHS) copyFileSync(join(sourceRoot, path), join(root, path));
    expect(loadTaskList(root).map(file => file.path)).toEqual([...TASK_LIST_PATHS]);
    writeFileSync(join(root, "unexpected.txt"), "not in the seed\n");
    expect(() => loadTaskList(root)).toThrow(SeedGitFailure); unlinkSync(join(root, "unexpected.txt"));
    const app = join(root, "app.mjs"), outside = join(temp, "outside.txt");
    writeFileSync(outside, "synthetic outside source\n"); unlinkSync(app); symlinkSync(outside, app);
    expect(() => loadTaskList(root)).toThrow(SeedGitFailure); unlinkSync(app);
    writeFileSync(app, new Uint8Array(SEED_LIMITS.fileBytes + 1).fill(120));
    expect(() => loadTaskList(root)).toThrow(SeedGitFailure);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
