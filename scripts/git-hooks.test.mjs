import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const prettier = join(root, "node_modules/prettier");
const formatted = '{\n  "answer": 42\n}\n';

// Real scratch Git commits run the tracked hooks and the actual formatter.
// Keep every repository, message and child stream for diagnosis.
function repository({ dependencies = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "artroom-git-hooks-"));
  console.log(`Git hook witness scratch: ${cwd}`);
  for (const directory of [".githooks", "scripts", "logs"]) mkdirSync(join(cwd, directory));
  for (const file of [".githooks/pre-commit", ".githooks/commit-msg", "scripts/pre-commit.mjs", "scripts/format-json.mjs", "scripts/check-commit-messages.mjs"]) {
    copyFileSync(join(root, file), join(cwd, file));
  }
  for (const name of ["pre-commit", "commit-msg"]) chmodSync(join(cwd, ".githooks", name), 0o755);
  writeFileSync(join(cwd, "package.json"), '{\n  "type": "module"\n}\n');
  writeFileSync(join(cwd, "data.json"), formatted);
  if (dependencies) {
    assert.equal(JSON.parse(readFileSync(join(prettier, "package.json"))).name, "prettier");
    mkdirSync(join(cwd, "node_modules"));
    symlinkSync(prettier, join(cwd, "node_modules/prettier"), "dir");
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
  git("add", "--", ".githooks", "scripts", "package.json", "data.json");
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

test("the pre-commit hook refuses a checkout without local Prettier explicitly", () => {
  const repo = repository({ dependencies: false });
  const refused = repo.commit("Record the answer\n");
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /local Prettier is missing/);
  assert.match(refused.stderr, /npm ci before committing/);
  assert.equal(repo.git("rev-list", "--all", "--count"), "0");
});
