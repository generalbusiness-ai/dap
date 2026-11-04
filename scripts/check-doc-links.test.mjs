import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("installed skill references check canonical repository files and headings without checking other external links", t => {
  const root = mkdtempSync(join(tmpdir(), "dap-skill-links-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "skills/dap-application"), { recursive: true }); mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "docs/reference.md"), "# Checked head\n");
  const skill = join(root, "skills/dap-application/SKILL.md");
  const prefix = "https://github.com/generalbusiness-ai/artroom/blob/main/";
  const git = (...args) => {
    const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  };
  git("init", "--quiet");
  const check = () => {
    const result = spawnSync(process.execPath, [new URL("./check-doc-links.mjs", import.meta.url).pathname, root], { encoding: "utf8", timeout: 10_000, maxBuffer: 1024 * 1024 });
    assert.equal(result.error, undefined); assert.equal(result.signal, null);
    return result;
  };
  writeFileSync(skill, `[Reference](${prefix}docs/reference.md#checked-head)\n[Elsewhere](https://example.invalid/absent.md#missing)\n[Other repository](https://github.com/generalbusiness-ai/other/blob/main/missing.md)\n`);
  git("add", "docs/reference.md", "skills/dap-application/SKILL.md");
  assert.equal(check().status, 0);
  writeFileSync(skill, `[Missing file](${prefix}docs/missing.md)\n[Missing heading](${prefix}docs/reference.md#missing)\n`);
  const failed = check();
  assert.equal(failed.status, 1); assert.match(failed.stdout, /skills\/dap-application\/SKILL.md:1: no file/);
  assert.match(failed.stdout, /SKILL.md:2: no heading #missing/); assert.match(failed.stdout, /2 broken/);
  writeFileSync(skill, `[Outside](${prefix}%2e%2e/outside.md)\n`);
  assert.equal(check().status, 1);
});

test("ignored nested worktrees stay outside the scan while tracked broken links still fail", t => {
  const root = mkdtempSync(join(tmpdir(), "dap-tracked-links-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  };
  git("init", "--quiet");
  writeFileSync(join(root, ".gitignore"), ".builder-worktrees/\n");
  mkdirSync(join(root, ".builder-worktrees/old/docs"), { recursive: true });
  writeFileSync(join(root, ".builder-worktrees/old/docs/README.md"), "[Old missing link](absent.md)\n");
  writeFileSync(join(root, "untracked.md"), "[Untracked missing link](absent.md)\n");
  writeFileSync(join(root, "tracked file.md"), "[Existing heading](target.md#present)\n");
  writeFileSync(join(root, "target.md"), "# Present\n");
  git("add", ".gitignore", "tracked file.md", "target.md");
  const check = () => {
    const result = spawnSync(process.execPath, [new URL("./check-doc-links.mjs", import.meta.url).pathname, root], { encoding: "utf8", timeout: 10_000, maxBuffer: 1024 * 1024 });
    assert.equal(result.error, undefined); assert.equal(result.signal, null);
    return result;
  };
  const clean = check();
  assert.equal(clean.status, 0, clean.stdout);
  assert.match(clean.stdout, /1 local links checked, 0 broken/);
  // Check working-tree bytes, not the older good contents staged above.
  writeFileSync(join(root, "tracked file.md"), "[Tracked missing link](absent.md)\n");
  const broken = check();
  assert.equal(broken.status, 1, "a tracked broken link must still fail");
  assert.match(broken.stdout, /tracked file\.md:1: no file absent\.md/);
  assert.match(broken.stdout, /1 local links checked, 1 broken/);
  assert.doesNotMatch(broken.stdout, /old\/docs|untracked\.md/);
});
