import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const prettier = join(root, "node_modules/prettier");
const rolldown = join(root, "node_modules/rolldown");
const formatted = '{\n  "answer": 42\n}\n';

// Real scratch Git commits run the tracked hooks and their actual checks.
// Keep every repository, message and child stream for diagnosis.
function repository({ dependencies = true, stageFixture = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "artroom-git-hooks-"));
  console.log(`Git hook witness scratch: ${cwd}`);
  for (const directory of [".githooks", "scripts", "logs"]) mkdirSync(join(cwd, directory));
  for (const file of [".githooks/pre-commit", ".githooks/commit-msg", "scripts/pre-commit.mjs", "scripts/format-json.mjs", "scripts/check-shared-helpers.mjs", "scripts/shared-helper-selection.mjs", "scripts/check-commit-messages.mjs"]) {
    copyFileSync(join(root, file), join(cwd, file));
  }
  for (const name of ["pre-commit", "commit-msg"]) chmodSync(join(cwd, ".githooks", name), 0o755);
  writeFileSync(join(cwd, "package.json"), '{\n  "type": "module"\n}\n');
  writeFileSync(join(cwd, "data.json"), formatted);
  mkdirSync(join(cwd, "packages/bytes"), { recursive: true });
  copyFileSync(join(root, "packages/bytes/package.json"), join(cwd, "packages/bytes/package.json"));
  cpSync(join(root, "packages/bytes/src"), join(cwd, "packages/bytes/src"), { recursive: true });
  if (dependencies) {
    assert.equal(JSON.parse(readFileSync(join(prettier, "package.json"))).name, "prettier");
    assert.equal(JSON.parse(readFileSync(join(rolldown, "package.json"))).name, "rolldown");
    mkdirSync(join(cwd, "node_modules/@generalbusiness"), { recursive: true });
    symlinkSync(prettier, join(cwd, "node_modules/prettier"), "dir");
    symlinkSync(rolldown, join(cwd, "node_modules/rolldown"), "dir");
    symlinkSync(join(cwd, "packages/bytes"), join(cwd, "node_modules/@generalbusiness/dap-bytes"), "dir");
    symlinkSync(join(root, "packages/contract"), join(cwd, "node_modules/@generalbusiness/dap-contract"), "dir");
  }
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
  env.PATH = `${dirname(process.execPath)}${delimiter}${env.PATH ?? ""}`;
  let sequence = 0;
  const run = args => {
    const result = spawnSync("git", args, { cwd, env, encoding: "utf8", timeout: 30_000 });
    const prefix = join(cwd, "logs", String(++sequence).padStart(2, "0"));
    writeFileSync(`${prefix}.stdout.log`, result.stdout ?? "");
    writeFileSync(`${prefix}.stderr.log`, result.stderr ?? "");
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    return result;
  };
  const git = (...args) => {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "--quiet", "--initial-branch=main");
  git("config", "--local", "user.name", "Hook test");
  git("config", "--local", "user.email", "hook-test@example.invalid");
  git("config", "--local", "commit.gpgsign", "false");
  git("config", "--local", "core.hooksPath", ".githooks");
  if (stageFixture) git("add", "--", ".githooks", "scripts", "packages", "package.json", "data.json");
  let messages = 0;
  const commit = message => {
    const file = join(cwd, `message-${++messages}.txt`);
    writeFileSync(file, message);
    return run(["commit", "--file", file]);
  };
  return { cwd, git, commit };
}

test("the pre-commit hook refuses unformatted tracked JSON and accepts its formatted repair", () => {
  const repo = repository();
  const bad = '{"answer":42}\n';
  writeFileSync(join(repo.cwd, "data.json"), bad);
  repo.git("add", "--", "data.json");
  const refused = repo.commit("Record the answer\n");
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /node scripts\/format-json\.mjs --write/);
  assert.equal(repo.git("rev-list", "--all", "--count"), "0");
  assert.equal(readFileSync(join(repo.cwd, "data.json"), "utf8"), bad, "the hook must not rewrite source");
  writeFileSync(join(repo.cwd, "data.json"), formatted);
  const unstaged = repo.commit("Record the answer\n");
  assert.equal(unstaged.status, 1);
  assert.match(unstaged.stderr, /Stage the formatted JSON before committing/);
  assert.equal(repo.git("rev-list", "--all", "--count"), "0");
  assert.equal(repo.git("show", ":data.json"), bad.trim(), "the hook must preserve the staged bytes");
  assert.equal(readFileSync(join(repo.cwd, "data.json"), "utf8"), formatted, "the hook must preserve the working repair");
  repo.git("add", "--", "data.json");
  const accepted = repo.commit("Record the answer\n\nKeep the source formatted.\n");
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(repo.git("rev-list", "--all", "--count"), "1");
});

test("the commit-msg hook checks the actual subject and body through the shared message rules", () => {
  const repo = repository();
  for (const [message, diagnostic] of [
    ["x".repeat(101) + "\n", /subject-length \(101 characters\)/],
    ["Record the answer\n\nKeep exactb8a4dea1 in the body.\n", /line 3: glued-hash: exactb8a4dea1/],
    [Buffer.from([0xff]), /cannot check the message/],
  ]) {
    const refused = repo.commit(message);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, diagnostic);
    assert.equal(repo.git("rev-list", "--all", "--count"), "0");
  }
  const accepted = repo.commit("Record the answer\n\nKeep exact b8a4dea1 in the body.\n");
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(repo.git("rev-list", "--all", "--count"), "1");
});

test("a Markdown-only commit passes without Prettier or shared-helper dependencies", () => {
  const repo = repository({ dependencies: false, stageFixture: false });
  mkdirSync(join(repo.cwd, "notes"));
  const file = "notes/sprint report.md";
  writeFileSync(join(repo.cwd, file), "# Sprint report\n\nSource work continues.\n");
  repo.git("add", "--", file);
  const accepted = repo.commit("Record the sprint report\n");
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(repo.git("rev-list", "--all", "--count"), "1");
  assert.equal(repo.git("ls-tree", "-r", "--name-only", "HEAD"), file);
});

test("the pre-commit hook refuses one selected JSON file without local Prettier explicitly", () => {
  const repo = repository({ dependencies: false, stageFixture: false });
  repo.git("add", "--", "data.json");
  const refused = repo.commit("Record the answer\n");
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /local Prettier is missing/);
  assert.match(refused.stderr, /npm ci before committing/);
  assert.equal(repo.git("rev-list", "--all", "--count"), "0");
});

test("the pre-commit hook refuses a local bytes helper and accepts its shared import", () => {
  const repo = repository();
  const file = "examples/hook-source.ts";
  const duplicate = 'export const natural = (value: unknown): value is number => typeof value === "number";\n';
  mkdirSync(join(repo.cwd, "examples"));
  writeFileSync(join(repo.cwd, file), duplicate);
  repo.git("add", "--", file);
  const index = repo.git("write-tree");
  const refused = repo.commit("Use a shared helper\n");
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /examples\/hook-source\.ts: natural is already owned by packages\/bytes\/src\/values\.ts/);
  assert.equal(repo.git("rev-list", "--all", "--count"), "0");
  assert.equal(repo.git("write-tree"), index, "the hook must preserve every staged byte");
  assert.equal(readFileSync(join(repo.cwd, file), "utf8"), duplicate, "the hook must preserve the working source");
  const shared = 'import { natural } from "@generalbusiness/dap-bytes";\nexport { natural };\n';
  writeFileSync(join(repo.cwd, file), shared);
  repo.git("add", "--", file);
  const accepted = repo.commit("Use a shared helper\n");
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(repo.git("rev-list", "--all", "--count"), "1");
  assert.equal(readFileSync(join(repo.cwd, file), "utf8"), shared);
});
