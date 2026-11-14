/** Real temporary Git checkouts exercise file writes; no Worker or network. */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { chmodSync, lstatSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { configPath, parseConfig, smokePolicy } from "./deploy-config.mjs";
import { registerValuesMain, registerValuesSource } from "./register-values.mjs";

const register = "sc_" + "b".repeat(51) + "a", genesis = "sha256:" + "b".repeat(64);
const next = "sc_" + "c".repeat(51) + "a";
const start = ["--start-origin", "https://dap-demo.inguz.workers.dev", "--deployment", "TEST-demo", "--definition", "platform:register@28"];
const args = (name = "demo", mode = "keep") => [name, "--register", register, "--genesis", genesis, `--${mode}`];
const input = name => readFile(new URL(`../${configPath(name)}`, import.meta.url), "utf8");

async function fixture(t, change) {
  const root = await mkdtemp(join(tmpdir(), "dap-register-test-"));
  t.after(() => rm(root, { recursive: true }));
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", env: { ...process.env,
    GIT_AUTHOR_NAME: "TEST", GIT_AUTHOR_EMAIL: "test@example.invalid", GIT_COMMITTER_NAME: "TEST", GIT_COMMITTER_EMAIL: "test@example.invalid" } });
  git(["init", "--quiet"]);
  for (const name of ["demo", "grow", "lending"]) {
    const path = join(root, configPath(name)); await mkdir(dirname(path), { recursive: true });
    const source = await input(name);
    await writeFile(path, change ? change(name, source) : source);
  }
  await writeFile(join(root, "unrelated.txt"), "TEST unrelated tracked bytes\n");
  git(["add", "."]); git(["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "TEST register fixture"]);
  const paths = git(["ls-files", "-z"]).split("\0").filter(Boolean);
  const snapshot = async () => new Map(await Promise.all(paths.map(async path => [path, await readFile(join(root, path))])));
  const before = await snapshot(), output = [];
  return { root, git, output, before, snapshot,
    invoke: argv => registerValuesMain(argv, { root, write: text => output.push(text) }),
    read: async name => parseConfig(await readFile(join(root, configPath(name)), "utf8")) };
}

// Invariant: omitting a retention choice refuses valid ordinary input instead
// of silently widening creation authority. Keep argv independent of args() so
// this same witness reaches the old default in the exact-baseline control.
test("no choice refuses a valid rotation and names both explicit choices", async t => {
  const f = await fixture(t, (name, source) => {
    if (name !== "grow") return source;
    const config = parseConfig(source);
    delete config.vars.INSTALLED_REGISTER_SCOPES;
    return JSON.stringify(config, null, 2) + "\n";
  });
  assert.equal(await f.invoke(["grow", "--register", register, "--genesis", genesis]), 1);
  assert.match(f.output.join(""), /--only/);
  assert.match(f.output.join(""), /--keep/);
  assert.deepEqual(await f.snapshot(), f.before);
});

test("contradictory and repeated choices refuse before reading a target", async () => {
  for (const choices of [["--only", "--keep"], ["--keep", "--only"], ["--only", "--only"], ["--keep", "--keep"]]) {
    const output = [];
    assert.equal(await registerValuesMain(["grow", "--register", register, "--genesis", genesis, ...choices], {
      root: join(tmpdir(), "TEST-no-register-target"), write: text => output.push(text),
    }), 1);
    assert.match(output.join(""), /exactly one of --only and --keep|repeated argument/);
  }
});

test("only and keep use explicit list or implicit primary without changing other tracked bytes", async t => {
  for (const mode of ["only", "keep"]) for (const listed of [false, true]) {
    let primary;
    const f = await fixture(t, (name, source) => {
      if (name !== "grow") return source;
      const config = parseConfig(source);
      primary = config.vars.REGISTER_SCOPE;
      // Include the requested root before the primary to witness keep's order
      // and de-duplication, with two other distinct installed roots.
      if (listed) config.vars.INSTALLED_REGISTER_SCOPES = JSON.stringify([next, register, primary]);
      else delete config.vars.INSTALLED_REGISTER_SCOPES;
      return JSON.stringify(config, null, 2) + "\n";
    });
    assert.equal(await f.invoke(args("grow", mode)), 0, `${mode}/${listed}: ${f.output.join("")}`);
    const after = await f.read("grow");
    assert.equal(after.vars.REGISTER_SCOPE, register);
    assert.equal(JSON.parse(after.vars.ARTIFACTS_CONFIG).registerScope, register);
    assert.deepEqual(JSON.parse(after.vars.INSTALLED_REGISTER_SCOPES), mode === "only" ? [register]
      : listed ? [next, register, primary] : [primary, register]);
    const snapshot = await f.snapshot();
    for (const [path, bytes] of f.before) if (path !== configPath("grow")) assert.deepEqual(snapshot.get(path), bytes, path);
    assert.equal(f.git(["diff", "--name-only"]).trim(), configPath("grow"));
  }
});

test("direct helper refuses missing or contradictory mode before parsing source", async () => {
  const base = { name: "grow", register, genesis };
  for (const options of [undefined, { ...base }, { ...base, mode: "default" }, { ...base, mode: "only", only: false },
    { ...base, mode: "keep", keep: undefined }, Object.assign(Object.create({ mode: "keep" }), base),
    Object.assign(Object.create({ only: true }), base, { mode: "keep" })]) {
    await assert.rejects(registerValuesSource("TEST not JSON", options), /mode 'only' or 'keep'/);
  }
});

test("a successful atomic replacement preserves permission bits 0640", async t => {
  const f = await fixture(t), path = join(f.root, configPath("grow"));
  chmodSync(path, 0o640);
  assert.equal(await f.invoke(args("grow", "only")), 0, f.output.join(""));
  assert.equal(lstatSync(path).mode & 0o7777, 0o640);
  assert.equal((await f.read("grow")).vars.REGISTER_SCOPE, register);
});

test("a diff-output callback cannot lose later bytes, replacement identity or mode", async t => {
  for (const fault of ["bytes", "identity", "mode"]) {
    const f = await fixture(t), path = join(f.root, configPath("grow"));
    chmodSync(path, 0o644);
    const original = await readFile(path), later = fault === "bytes" ? Buffer.concat([original, Buffer.from("\n// TEST later edit\n")]) : original;
    let edited = false, observed;
    const code = await registerValuesMain(args("grow", "only"), { root: f.root, write: text => {
      f.output.push(text);
      if (edited || !text.startsWith("diff --git ")) return;
      edited = true;
      if (fault === "bytes") writeFileSync(path, later);
      else if (fault === "mode") chmodSync(path, 0o640);
      else {
        const replacement = path + ".TEST-replacement";
        writeFileSync(replacement, original); chmodSync(replacement, 0o644); renameSync(replacement, path);
      }
      observed = lstatSync(path);
    } });
    assert.equal(edited, true, fault);
    assert.equal(code, 1, f.output.join(""));
    assert.match(f.output.join(""), /changed during preparation/);
    assert.deepEqual(await readFile(path), later, fault);
    const after = lstatSync(path);
    assert.deepEqual([after.dev, after.ino, after.mode], [observed.dev, observed.ino, observed.mode], fault);
    const snapshot = await f.snapshot();
    for (const [name, bytes] of f.before) if (name !== configPath("grow")) assert.deepEqual(snapshot.get(name), bytes, name);
  }
});

// Invariant: a register rotation changes only the selected tracked file and
// keeps every prior root exactly once, while coupled identities agree.
test("one Worker rotation preserves all other tracked bytes and appends its root once", async t => {
  for (const name of ["demo", "grow", "lending"]) {
    const f = await fixture(t), original = await f.read(name);
    const roots = original.vars.INSTALLED_REGISTER_SCOPES ? JSON.parse(original.vars.INSTALLED_REGISTER_SCOPES) : [original.vars.REGISTER_SCOPE];
    const deployment = original.vars.DEMO_START_CONFIG === undefined ? [] : ["--deployment", JSON.parse(original.vars.DEMO_START_CONFIG).deployment];
    assert.equal(await f.invoke([...args(name), ...deployment]), 0, f.output.join(""));
    const updated = await f.read(name);
    assert.equal(updated.vars.REGISTER_SCOPE, register);
    assert.deepEqual(JSON.parse(updated.vars.INSTALLED_REGISTER_SCOPES), [...roots, register]);
    assert.deepEqual(JSON.parse(updated.vars.ARTIFACTS_CONFIG), { ...JSON.parse(original.vars.ARTIFACTS_CONFIG), registerScope: register });
    const after = await f.snapshot();
    for (const [path, bytes] of f.before) if (path !== configPath(name)) assert.deepEqual(after.get(path), bytes, path);
    assert.equal(f.git(["diff", "--name-only"]).trim(), configPath(name));
    assert.match(f.output[0], new RegExp(`diff --git a/${configPath(name)} b/${configPath(name)}`));
    if (original.vars.DEMO_START_CONFIG !== undefined) {
      assert.deepEqual(JSON.parse(updated.vars.DEMO_START_CONFIG), {
        ...JSON.parse(original.vars.DEMO_START_CONFIG), register: { scope: register, genesis },
      });
    } else assert.equal(updated.vars.DEMO_START_CONFIG, undefined);
    // A second committed rotation to the same root cannot duplicate it.
    f.git(["add", "."]); f.git(["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "TEST first rotation"]);
    assert.equal(await f.invoke([...args(name), ...deployment]), 0);
    assert.deepEqual(JSON.parse((await f.read(name)).vars.INSTALLED_REGISTER_SCOPES), [...roots, register]);
    assert.equal(f.git(["diff", "--name-only"]), "");
  }
});

// Invariant: cutover --only removes retired roots without changing resources,
// and explicit Start metadata binds both full reference and Worker deployment.
test("demo bootstrap validates explicit deployment without adding a tracked variable", async t => {
  const f = await fixture(t, (name, source) => {
    if (name !== "demo") return source;
    const config = parseConfig(source);
    delete config.vars.DEMO_START_CONFIG; delete config.vars.DEPLOYMENT;
    return JSON.stringify(config, null, 2) + "\n";
  });
  assert.equal(await f.invoke([...args("demo", "only"), ...start]), 0, f.output.join(""));
  const config = await f.read("demo"), policy = smokePolicy(config);
  assert.deepEqual(JSON.parse(config.vars.INSTALLED_REGISTER_SCOPES), [register]);
  assert.equal(Object.hasOwn(config.vars, "DEPLOYMENT"), false);
  assert.deepEqual(policy.offer.register, { scope: register, genesis });
  assert.equal(policy.offer.definition, "platform:register@28");
  assert.equal(policy.offer.deployment, "TEST-demo");
  f.git(["add", "."]); f.git(["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "TEST bootstrapped offer"]);
  const committed = await f.snapshot();
  assert.equal(await f.invoke(["demo", "--register", next, "--genesis", genesis, "--keep"]), 1);
  assert.deepEqual(await f.snapshot(), committed);
  assert.equal(await f.invoke(["demo", "--register", next, "--genesis", genesis, "--keep", "--deployment", "TEST-wrong"]), 1);
  assert.deepEqual(await f.snapshot(), committed);
  assert.equal(await f.invoke(["demo", "--register", next, "--genesis", genesis, "--keep", "--deployment", "TEST-demo"]), 0, f.output.join(""));
  const rotated = await f.read("demo");
  assert.deepEqual(smokePolicy(rotated).offer.register, { scope: next, genesis });
  assert.equal(Object.hasOwn(rotated.vars, "DEPLOYMENT"), false);
  assert.deepEqual(JSON.parse(rotated.vars.INSTALLED_REGISTER_SCOPES), [register, next]);
});

// Invariant: malformed or ambiguous input never changes a tracked byte.
test("invalid names, references, metadata and dirty target refuse before tracked writes", async t => {
  const f = await fixture(t, (name, source) => {
    if (name !== "demo") return source;
    const config = parseConfig(source);
    delete config.vars.DEMO_START_CONFIG; delete config.vars.DEPLOYMENT;
    return JSON.stringify(config, null, 2) + "\n";
  });
  for (const argv of [
    args("artroom-scope"), args("sandbox"), args("unknown"),
    ["demo", "--register", "sc_invalid", "--genesis", genesis, "--keep"],
    ["demo", "--register", register, "--genesis", "sha256:invalid", "--keep"],
    [...args(), "--start-origin", "https://dap-demo.inguz.workers.dev"],
    [...args("grow"), ...start], [...args(), ...start.slice(0, -1), "platform:register@23"],
    [...args(), ...start.slice(0, 1), "https://dap-demo.inguz.workers.dev/path", ...start.slice(2)],
  ]) {
    assert.equal(await f.invoke(argv), 1, JSON.stringify(argv));
    assert.deepEqual(await f.snapshot(), f.before);
  }
  const path = join(f.root, configPath("demo"));
  await writeFile(path, f.before.get(configPath("demo")).toString() + "\n// TEST dirty target\n");
  const dirty = await readFile(path);
  assert.equal(await f.invoke(args()), 1); assert.deepEqual(await readFile(path), dirty);
});

test("production parser disagreement, deployment mismatch and root capacity refuse without changes", async t => {
  for (const fault of ["root", "namespace", "deployment", "capacity", "duplicate"]) {
    const f = await fixture(t, (name, source) => {
      if (name !== "demo") return source;
      const config = parseConfig(source);
      delete config.vars.DEMO_START_CONFIG; delete config.vars.DEPLOYMENT;
      if (fault === "root") config.vars.REGISTER_SCOPE = next;
      if (fault === "deployment") config.vars.DEPLOYMENT = "TEST-existing";
      if (fault === "namespace") config.vars.ARTIFACTS_CONFIG = JSON.stringify({ ...JSON.parse(config.vars.ARTIFACTS_CONFIG), namespace: "TEST-wrong" });
      if (fault === "capacity") {
        const roots = [..."abcdefghijklmnopqrstuvwxyz234567"].map(letter => "sc_" + letter + "a".repeat(51));
        config.vars.REGISTER_SCOPE = roots[0];
        config.vars.ARTIFACTS_CONFIG = JSON.stringify({ ...JSON.parse(config.vars.ARTIFACTS_CONFIG), registerScope: roots[0] });
        config.vars.INSTALLED_REGISTER_SCOPES = JSON.stringify(roots);
      }
      const text = JSON.stringify(config, null, 2) + "\n";
      return fault === "duplicate" ? text.replace('"vars": {', '"vars": { "REGISTER_SCOPE": "TEST duplicate",') : text;
    });
    assert.equal(await f.invoke(fault === "deployment" ? [...args(), ...start] : args()), 1, fault);
    assert.deepEqual(await f.snapshot(), f.before, fault);
    if (fault === "capacity") {
      assert.equal(await f.invoke(args("demo", "only")), 0, f.output.join(""));
      assert.deepEqual(JSON.parse((await f.read("demo")).vars.INSTALLED_REGISTER_SCOPES), [register]);
    }
  }
});

// Invariant: editing JSONC settings preserves unrelated string/comment bytes,
// and duplicate keys cannot make the parser and editor choose different roots.
test("JSONC edits retain comments and reject duplicate targeted settings", async () => {
  const source = await input("grow"), sourceVars = parseConfig(source).vars;
  const candidate = await registerValuesSource(source, { name: "grow", register, genesis, mode: "keep" });
  for (const line of source.split("\n")) if (line.trim().startsWith("//")) assert.ok(candidate.includes(line), line);
  const edited = parseConfig(candidate).vars;
  for (const [key, value] of Object.entries(sourceVars)) {
    if (["REGISTER_SCOPE", "ARTIFACTS_CONFIG", "INSTALLED_REGISTER_SCOPES", "DEMO_START_CONFIG"].includes(key)) continue;
    assert.deepEqual(edited[key], value, key);
    if (typeof value === "string") assert.ok(candidate.includes(JSON.stringify(key) + ": " + JSON.stringify(value)), key);
  }
  await assert.rejects(registerValuesSource(source.replace('"REGISTER_SCOPE":', '"REGISTER_SCOPE": "TEST duplicate", "REGISTER_SCOPE":'), { name: "grow", register, genesis, mode: "keep" }), /Duplicate/);
});
