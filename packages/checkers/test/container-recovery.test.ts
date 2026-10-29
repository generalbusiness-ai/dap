import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { CheckerService, originOf, Outcomes, RunIdentityRefusal, RunRecordCorruption, type Job } from "../src/index.ts";
import { containerRunner } from "../src/node.ts";
import { containerName } from "../src/container-engine.ts";
import { CLAIM_BYTES, digest, encodeAsk, runDirectory, type RunClaim } from "../src/container-records.ts";
import { digest as fixtureDigest, Lane, MemoryDurable, newKey, world } from "./support.ts";

// Real private filesystem and production recovery lookup. Lane authority,
// service storage and the forbidden launch are STAND-INS; no container runs.
async function recoveryFixture(shortSocketPath = false) {
  const parent = await mkdtemp(join(shortSocketPath ? "/tmp" : tmpdir(), shortSocketPath ? "j3r-" : "checker-recovery-"));
  const rawRoot = join(parent, "runs"), run = "retained-original-run";
  await mkdir(rawRoot, { mode: 0o700 });
  const root = await realpath(rawRoot);
  const dir = runDirectory(root, run);
  await mkdir(dir, { mode: 0o700 });
  const metadata = await stat(dir), born = metadata.birthtimeMs || metadata.mtimeMs;
  const graceSeconds = 2;
  let now = Math.floor(born) + graceSeconds * 1000;
  const w = world(), origin = originOf(w.notice, { entry: w.job, pinned: fixtureDigest("d"), activated: { name: "change", state: "active" }, manifest: w.manifest });
  if ("not" in origin) throw Error("The scripted service job must be readable");
  const scopes = new Lane(w), durable = new MemoryDurable(), outcomes = new Outcomes(durable);
  await outcomes.start(origin.job.fact, run, null);
  const adapter = containerRunner({ root, command: ["/usr/bin/false"], execCommand: ["/usr/bin/false"] });
  let launches = 0;
  const log: { step: string; event: string; path?: string }[] = [];
  const service = new CheckerService({ signer: newKey().signer, scopes, outcomes,
    runner: { find: adapter.find, run: async () => { launches++; return null; } },
    clock: () => now, recoveryGraceSeconds: graceSeconds, random: length => new Uint8Array(length).fill(1), log: event => log.push(event) });
  const afterGrace = async () => {
    const current = await stat(dir), origin = current.birthtimeMs || current.mtimeMs;
    now = Math.ceil(origin) + graceSeconds * 1000 + 1;
    return now;
  };
  const put = async (name: string, value: string) => writeFile(join(dir, name), value, { mode: 0o600 });
  const claim = async (job: Job = origin.job) => {
    const ask = encodeAsk({ run, job, configuration: w.config });
    const value: RunClaim = { v: 1, run, askDigest: digest(ask), command: ["/usr/bin/false"], execCommand: ["/usr/bin/false"],
      image: w.config.image, needsOrigin: true, container: containerName(run), createdAt: Math.ceil(born), finishBy: Math.ceil(born) + 1000 };
    await put("claim.json", canonicalize(value)); await put("ask.json", ask);
    return value;
  };
  return { dir, graceSeconds, socketPath: join(runDirectory(rawRoot, run), "claim.json"), run, adapter, origin, service, scopes, outcomes, log, launches: () => launches, afterGrace, claim, put,
    deliver: () => service.deliver(w.notice), cleanup: () => rm(parent, { recursive: true, force: true }) };
}

test("an empty fence waits inside grace, then keeps run-lost without replacement even if the original creator later resumes", async () => {
  const f = await recoveryFixture();
  try {
    expect(await f.deliver()).toEqual({ did: "waiting" });
    expect(f.scopes.submitted).toHaveLength(0);
    expect(await readdir(f.dir)).toEqual([]);
    await f.afterGrace();
    expect(await f.deliver()).toMatchObject({ did: "submitted", outcome: { act: "check-error", reason: "run-lost" } });
    expect(f.log).toContainEqual({ step: "find", event: "record-corrupt", path: join(f.dir, "claim.json") });
    expect(await readdir(f.dir)).toEqual([]);
    // Filling the old fence is possible for a paused original creator. The
    // terminal service judgment claims no physical cancellation of that owner.
    await f.claim();
    expect(await f.deliver()).toEqual({ did: "nothing", why: "closed" });
    expect(f.launches()).toBe(0);
    expect((await f.outcomes.get(f.origin.job.fact))?.run).toBe(f.run);
  } finally { await f.cleanup(); }
});

test("malformed, oversized and schema-invalid claims end run-lost after grace while their exact bytes and fence remain", async () => {
  for (const artifact of ["{", "", "valid-but-oversized", "null", canonicalize({ v: 1, run: "another-run" })]) {
    const f = await recoveryFixture();
    try {
      const original = await f.claim();
      const bytes = artifact === "valid-but-oversized" ? canonicalize({ ...original, padding: "x".repeat(CLAIM_BYTES) }) : artifact;
      await f.put("claim.json", bytes);
      expect(await f.deliver()).toEqual({ did: "waiting" });
      await f.afterGrace();
      expect(await f.deliver()).toMatchObject({ did: "submitted", outcome: { act: "check-error", reason: "run-lost" } });
      expect(f.log).toContainEqual({ step: "find", event: "record-corrupt", path: join(f.dir, "claim.json") });
      expect(await readFile(join(f.dir, "claim.json"), "utf8")).toBe(bytes);
      expect((await readdir(f.dir)).sort()).toEqual(["ask.json", "claim.json"]);
      expect(f.launches()).toBe(0);
    } finally { await f.cleanup(); }
  }
});

test("an existing unreadable claim becomes terminal after owned-directory grace even when opening it fails", async () => {
  // A real Unix socket cannot be opened as a regular record, even by root.
  // Its short pathname avoids the Unix socket length limit on the Node hosts.
  const f = await recoveryFixture(true), socket = createServer();
  try {
    await new Promise<void>((resolve, reject) => { socket.once("error", reject); socket.listen(f.socketPath, resolve); });
    expect((await stat(join(f.dir, "claim.json"))).isSocket()).toBe(true);
    expect(await f.deliver()).toEqual({ did: "waiting" });
    await f.afterGrace();
    expect(await f.deliver()).toMatchObject({ did: "submitted", outcome: { reason: "run-lost" } });
    expect(f.log).toContainEqual({ step: "find", event: "record-corrupt", path: join(f.dir, "claim.json") });
    expect((await stat(join(f.dir, "claim.json"))).isSocket()).toBe(true);
    expect(f.launches()).toBe(0);
  } finally {
    if (socket.listening) await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
    await f.cleanup();
  }
});

test("a corrupt terminal report uses the same grace and cannot be released or replaced", async () => {
  const f = await recoveryFixture();
  try {
    await f.claim(); await f.put("terminal.json", "null");
    expect(await f.deliver()).toEqual({ did: "waiting" });
    await f.afterGrace();
    await expect(f.adapter.find(f.run, f.origin.job, { now: await f.afterGrace(), graceSeconds: f.graceSeconds })).rejects.toMatchObject({ path: join(f.dir, "terminal.json") });
    expect(await f.deliver()).toMatchObject({ did: "submitted", outcome: { reason: "run-lost" } });
    expect(f.log).toContainEqual({ step: "find", event: "record-corrupt", path: join(f.dir, "terminal.json") });
    expect(await readFile(join(f.dir, "terminal.json"), "utf8")).toBe("null");
    expect(f.launches()).toBe(0);
  } finally { await f.cleanup(); }
});

test("an authenticated different-job record waits only through grace and never releases its outcome", async () => {
  const f = await recoveryFixture();
  try {
    await f.claim({ ...f.origin.job, tree: f.origin.job.tree === "b".repeat(40) ? "c".repeat(40) : "b".repeat(40) });
    expect(await f.deliver()).toEqual({ did: "waiting" });
    await f.afterGrace();
    const refusal = await f.adapter.find(f.run, f.origin.job, { now: await f.afterGrace(), graceSeconds: f.graceSeconds }).catch(error => error);
    expect(refusal).toBeInstanceOf(RunIdentityRefusal);
    expect(refusal).not.toBeInstanceOf(RunRecordCorruption);
    expect(refusal).toMatchObject({ path: join(f.dir, "ask.json") });
    expect(await f.deliver()).toMatchObject({ did: "submitted", outcome: { reason: "run-lost" } });
    expect(f.log).toContainEqual({ step: "find", event: "record-corrupt", path: join(f.dir, "ask.json") });
    expect(f.launches()).toBe(0);
  } finally { await f.cleanup(); }
});

test("engine unavailability stays waiting after grace and is not mislabeled record corruption", async () => {
  const f = await recoveryFixture();
  try {
    await f.claim(); await f.afterGrace();
    expect(await f.deliver()).toEqual({ did: "waiting" });
    expect(f.log).toEqual([{ step: "find", event: "unreadable" }]);
    expect(f.scopes.submitted).toHaveLength(0);
    expect((await f.outcomes.get(f.origin.job.fact))?.state).toBe("started");
    expect(f.launches()).toBe(0);
    expect((await readdir(f.dir)).sort()).toEqual(["ask.json", "claim.json"]);
  } finally { await f.cleanup(); }
});
