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
  const check = () => {
    const result = spawnSync(process.execPath, [new URL("./check-doc-links.mjs", import.meta.url).pathname, root], { encoding: "utf8", timeout: 10_000, maxBuffer: 1024 * 1024 });
    assert.equal(result.error, undefined); assert.equal(result.signal, null);
    return result;
  };
  writeFileSync(skill, `[Reference](${prefix}docs/reference.md#checked-head)\n[Elsewhere](https://example.invalid/absent.md#missing)\n[Other repository](https://github.com/generalbusiness-ai/other/blob/main/missing.md)\n`);
  assert.equal(check().status, 0);
  writeFileSync(skill, `[Missing file](${prefix}docs/missing.md)\n[Missing heading](${prefix}docs/reference.md#missing)\n`);
  const failed = check();
  assert.equal(failed.status, 1); assert.match(failed.stdout, /skills\/dap-application\/SKILL.md:1: no file/);
  assert.match(failed.stdout, /SKILL.md:2: no heading #missing/); assert.match(failed.stdout, /2 broken/);
  writeFileSync(skill, `[Outside](${prefix}%2e%2e/outside.md)\n`);
  assert.equal(check().status, 1);
});
