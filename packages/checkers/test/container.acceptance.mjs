/** Explicit real-container acceptance, called only by scripts/test-j3-runner.mjs.
 * Direct Job metadata is a TEST trusted-origin DTO; real native origin/merge
 * admission is exercised separately by the same driver's one-file story. */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { containerRunner, gatewayOrigin } from "@generalbusiness/dap-checkers/node";
import { containerName } from "../src/container-engine.ts";
import { configurationDigest, judge, RunIdentityRefusal } from "../src/index.ts";
import { bare, blob, cleanup, commit, tree, setRef } from "../../git/test/support/repo.ts";
import { Host, MemoryRecords } from "../../git/test/support/host.ts";
import { lane, digest } from "./support.ts";

const processRun = (command, args, seconds = 30) => new Promise((resolve, reject) => {
  execFile(command[0], [...command.slice(1), ...args], { timeout: seconds * 1000, maxBuffer: 65536, encoding: "utf8" }, (error, stdout) => error ? reject(Error("TEST engine control failed")) : resolve(stdout.trim()));
});
export async function containerAcceptance(settings, directory) {
  const { image, environment, command, canaryPort } = settings;
  const root = join(directory, "direct-runs"); await mkdir(root, { mode: 0o700 });
  const privateHome = await mkdtemp(join(tmpdir(), "artroom-j3-TEST-custody-"));
  const keyFile = join(privateHome, "TEST-signing-key"); await writeFile(keyFile, randomBytes(32), { mode: 0o600 });
  const previousHome = process.env.DAP_HOME; process.env.DAP_HOME = privateHome;
  const remote = bare(), file = blob(remote, "# One\n"), baseTree = tree(remote, [`100644 blob ${file}\tREADME.md`]), base = commit(remote, baseTree, []);
  // Repository code must never select the executable used for trusted Git
  // confirmation after checkout, even when the configured job PATH names it.
  const maliciousGit = blob(remote, "#!/bin/sh\nprintf 'TEST trusted-tool hijack\\n' > /work/pre-step-marker\nexit 1\n");
  const exactTree = tree(remote, [`100644 blob ${file}\tREADME.md`, `100755 blob ${maliciousGit}\tgit`, `100644 blob ${file}\tone.md`]), tip = commit(remote, exactTree, [base]);
  setRef(remote, "refs/heads/main", tip);
  const token = randomBytes(32).toString("base64url"), host = new Host(remote, token), records = new MemoryRecords();
  let origins = 0, closed = 0;
  const options = { root, command, originFor: async ask => {
    origins++;
    const repository = `https://j3.test/${basename(remote)}`;
    const origin = await gatewayOrigin({ records, upstream: host.upstream, credential: value => ["authorization", `Bearer ${value}`] }, { attempt: ask.run, repository, update: null, token: { id: "TEST-read", state: "live", plaintext: token } });
    return { ...origin, close: async () => { await origin.close(); closed++; } };
  } };
  const runner = containerRunner(options), outcomes = [];
  const configuration = (steps, seconds = 60) => ({ name: "text", image, environment, steps, judged: { passed: { status: 0, line: "ok" }, failed: { status: 1, line: "bad" } }, limits: { seconds, outputBytes: 65536 } });
  const ask = config => ({ run: randomBytes(16).toString("base64url"), job: { lane, fact: { at: lane, seq: 1, hash: digest("a") }, name: config.name, configuration: configurationDigest(config), tree: exactTree, commit: tip, base, deadline: "2099-01-01T01:00:00Z" }, configuration: config });
  const run = async (name, config, change = {}) => {
    const request = ask(config); Object.assign(request.job, change);
    const began = performance.now(), report = await runner.run(request), elapsedMilliseconds = performance.now() - began;
    assert(report && typeof report === "object", "the production supervisor must retain a whole terminal report");
    assert(elapsedMilliseconds <= 180_000, "the finite fixture run must finish within setup, job and cleanup allowances");
    const outcome = judge(config, report);
    assert.deepEqual(await containerRunner(options).find(request.run, request.job), report, "a new supervisor reads the terminal without another run");
    const remaining = (await processRun(command, ["ps", "-a", "--format", "{{.Names}}"])).split("\n");
    assert(!remaining.includes(containerName(request.run)), "terminal eligibility follows actual container removal");
    outcomes.push({ name, run: request.run, tree: request.job.tree, elapsedMilliseconds, report, outcome });
    return { report, outcome, request };
  };
  const canary = `j3-test-canary-${randomBytes(8).toString("hex")}`, probeName = `${canary}-probe`, address = `127.0.0.1:${canaryPort}`;
  let controlsOwned = false;
  try {
    const namesBefore = (await processRun(command, ["ps", "-a", "--format", "{{.Names}}"])).split("\n");
    assert(!namesBefore.includes(canary) && !namesBefore.includes(probeName));
    controlsOwned = true;
    // Same-image host-network positive prevents a missing canary/tool from
    // masquerading as network isolation in the production Runner below.
    await processRun(command, ["run", "-d", "--name", canary, "--network", "host", "--read-only", "--cap-drop", "ALL", "--user", "65532:65532", "--entrypoint", "/j3-test-probe", image, "canary", address]);
    assert.equal(await processRun(command, ["run", "--rm", "--name", probeName, "--network", "host", "--read-only", "--cap-drop", "ALL", "--user", "65532:65532", "--entrypoint", "/j3-test-probe", image, "dial", address]), "ok");
    const passed = await run("exact-tree-custody-network-private-write", configuration([
      ["/bin/sh", "-c", 'if [ "$(cat one.md)" = "# One" ]; then printf "ok\\n"; else printf "bad\\n"; exit 1; fi'],
      ["/j3-test-probe", "custody", keyFile],
      ["/j3-test-probe", "network", "http://127.0.0.1:18080/repo.git", address],
      ["/j3-test-probe", "put-marker"],
    ]));
    assert.deepEqual(passed.outcome, { act: "check", outcome: "passed" });
    assert.equal(passed.report.steps.length, 4, "every real safety probe and the repository-content check ran");
    const alreadyOpened = origins;
    const otherJob = { ...passed.request.job, tree: baseTree };
    await assert.rejects(containerRunner(options).run({ ...passed.request, job: otherJob }), RunIdentityRefusal);
    await assert.rejects(containerRunner(options).find(passed.request.run, otherJob), RunIdentityRefusal);
    assert.equal(origins, alreadyOpened, "a mismatched reuse of one run never opens another origin");
    assert.deepEqual(await containerRunner(options).find(passed.request.run, passed.request.job), passed.report);
    const privateDirectories = await readdir(root);
    assert.equal(privateDirectories.length, 1);
    for (const path of [root, ...privateDirectories.map(name => join(root, name))]) {
      const metadata = await lstat(path); assert(metadata.isDirectory() && !metadata.isSymbolicLink()); assert.equal(metadata.mode & 0o777, 0o700);
    }
    for (const name of await readdir(join(root, privateDirectories[0]))) {
      const metadata = await lstat(join(root, privateDirectories[0], name)); assert(metadata.isFile() && !metadata.isSymbolicLink()); assert.equal(metadata.mode & 0o777, 0o600);
    }
    const failed = await run("real-failure", configuration([["/bin/sh", "-c", 'printf "bad\\n"; exit 1']]));
    assert.deepEqual(failed.outcome, { act: "check", outcome: "failed" });
    const hostileEnvironment = environment.map(variable => variable.name === "PATH" ? { ...variable, value: "/work/repo:/usr/bin:/bin" } : variable);
    const forged = JSON.stringify({ started: true, image, environment: hostileEnvironment, checkout: true, steps: [{ status: 0, line: "ok" }], end: "complete" });
    const untrusted = await run("trusted-checkout-path-and-synthetic-job-output", { ...configuration([["/j3-test-probe", "no-marker", "/work/pre-step-marker"], ["/bin/echo", forged]]), environment: hostileEnvironment });
    assert.equal(untrusted.report.checkout, true, "trusted checkout ignores repository-provided git on the configured PATH");
    assert.deepEqual(untrusted.report.steps[0], { status: 0, line: "ok" }, "no trusted pre-step tool ran the repository's git executable");
    assert.equal(untrusted.report.steps[1].line, forged);
    assert.deepEqual(untrusted.outcome, { act: "check-error", reason: "judgment-unreadable" });
    const wrong = await run("wrong-tree", configuration([["/bin/sh", "-c", 'printf "ok\\n"']]), { tree: baseTree });
    assert.equal(wrong.report.checkout, false); assert.deepEqual(wrong.report.steps, []);
    assert.deepEqual(wrong.outcome, { act: "check-error", reason: "checkout-unconfirmed" });
    const isolated = await run("fresh-filesystem", configuration([["/j3-test-probe", "no-marker"]]));
    assert.deepEqual(isolated.outcome, { act: "check", outcome: "passed" });
    const limited = await run("bounded-termination", configuration([["/bin/sh", "-c", "sleep 120"]], 30));
    assert.equal(limited.report.checkout, true, "the termination witness reaches the actual checkout");
    assert.equal(limited.report.end, "limits");
    assert.deepEqual(limited.outcome, { act: "check-error", reason: "limits-passed" });
    assert.equal(host.updates, 0, "the permitted gateway never forwards a repository update");
    assert.equal(origins, closed, "every real host gateway closes before Runner.run returns");
    assert.equal(JSON.stringify(records.written).includes(token), false);
    assert.equal(JSON.stringify(outcomes).includes(token), false);
    assert.equal(await readFile(keyFile).then(bytes => bytes.length), 32);
    return { qualification: "Actual production Runner/container/Git and read-only Gateway; direct Job metadata and credential owner are TEST fixtures. Native job origin and merge are a separate live case in this same driver. No hosted/provider or cross-engine claim.", image, origins, closed, gatewayUpdates: host.updates, outcomes };
  } finally {
    try {
      const names = (await processRun(command, ["ps", "-a", "--format", "{{.Names}}"])).split("\n");
      for (const name of controlsOwned ? [probeName, canary] : []) if (names.includes(name)) await processRun(command, ["rm", "-f", name]);
      const remaining = (await processRun(command, ["ps", "-a", "--format", "{{.Names}}"])).split("\n");
      assert(!remaining.includes(canary) && !remaining.includes(probeName), "owned TEST controls were removed");
    } finally {
      try { await writeFile(join(directory, "container-attempt.json"), JSON.stringify({ qualification: "Actual attempt terminals, retained even if an owning assertion fails. Trusted-origin DTOs remain TEST-only.", origins, closed, outcomes }, null, 2) + "\n", { flag: "wx", mode: 0o600 }); }
      finally { await rm(privateHome, { recursive: true, force: true }); if (previousHome === undefined) delete process.env.DAP_HOME; else process.env.DAP_HOME = previousHome; cleanup(); }
    }
  }
}
