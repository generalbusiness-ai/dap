/** Node-only production runner. The private receipt is an execution fence, not a run-log store. */
import * as fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { containerName, createContainerEngine } from "./container-engine.ts";
import { acknowledgeOrigin, CLAIM_BYTES, claimOf, decodeAsk, digest, encodeAsk, encodeJob, GRACE_SECONDS, INPUT_BYTES, InvalidRunRecord, privateRoot, readPrivate, runDirectory, startedOf, syncDirectory, terminalOf, writePrivate, writeTerminal, type RunClaim, type RunLaunch } from "./container-records.ts";
import { serveOrigin, type ContainerRunnerOrigin } from "./container-origin.ts";
import type { RunAsk, Runner } from "./service.ts";
import { ClaimTooLargeRefusal, RECOVERY_GRACE_SECONDS, RunIdentityRefusal, RunRecordCorruption } from "./service.ts";

export type { ContainerRunnerOrigin };
export interface ContainerRunnerOptions {
  /** An owned 0700 directory on persistent local storage. Its run fences are never automatically evicted. */
  root: string;
  /** Trusted engine argv prefix, for example ["nerdctl"] or the supported Lima prefix. No shell text. */
  command: readonly string[];
  /** Trusted complete ctr tasks exec prefix, including its socket, namespace and private FIFO directory. */
  execCommand: readonly string[];
  /** Trusted custody-to-gateway wiring. Snapshot jobs never call it. No credential enters RunAsk. */
  originFor?: (ask: RunAsk, signal: AbortSignal) => Promise<ContainerRunnerOrigin>;
}
const unavailable = (): Error => new Error("The private checker execution could not be recovered; no replacement run was started.");
const delay = () => new Promise<void>(resolve => { setTimeout(resolve, 100); });
const validRun = (run: string): boolean => typeof run === "string" && /^[A-Za-z0-9_.-]{1,128}$/.test(run);
const prefix = (value: readonly string[]): string[] => {
  if (!Array.isArray(value) || !value.length || value.length > 32 || value.some(arg => typeof arg !== "string" || !arg || arg.length > 4096 || arg.includes("\0"))) throw unavailable();
  return [...value];
};

export function containerRunner(options: ContainerRunnerOptions): Runner {
  const command = prefix(options.command), execCommand = prefix(options.execCommand), rootOption = options.root, originFor = options.originFor;
  const engine = (claim: RunClaim) => createContainerEngine({ argvPrefix: claim.command, execCommand: claim.execCommand, image: claim.image });
  const directoryOf = async (run: string) => {
    if (!validRun(run)) throw unavailable();
    let root: string;
    try { root = await privateRoot(rootOption, false); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    const dir = runDirectory(root, run);
    try { await privateRoot(dir, false); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    return dir;
  };
  const locate = async (run: string) => {
    const dir = await directoryOf(run);
    if (!dir) return null;
    const claim = await claimOf(dir, run);
    if (!claim) throw new InvalidRunRecord(join(dir, "claim.json"));
    if (claim.container !== containerName(run)) throw new InvalidRunRecord(join(dir, "claim.json"));
    return { dir, claim };
  };
  const find: Runner["find"] = async (run, expectedJob, recovery) => {
    const now = recovery?.now ?? Date.now(), graceSeconds = recovery?.graceSeconds ?? RECOVERY_GRACE_SECONDS;
    if (!Number.isFinite(now) || !Number.isSafeInteger(graceSeconds) || graceSeconds < 0 || graceSeconds > 86_400) throw unavailable();
    const dir = await directoryOf(run);
    if (!dir) return null;
    // Birth is stable when a paused creator later fills the directory. Files'
    // mtimes do not extend grace. Filesystems without birth time use dir mtime.
    const stat = await fs.lstat(dir), birth = stat.birthtimeMs;
    if (!stat.isDirectory() || stat.isSymbolicLink() || process.getuid && stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) throw unavailable();
    const createdAt = birth === undefined || birth === 0 ? stat.mtimeMs : birth;
    if (!Number.isFinite(createdAt) || createdAt < 0) throw unavailable();
    const withinGrace = now <= createdAt + graceSeconds * 1000;
    try {
      const claimPath = join(dir, "claim.json");
      let claim: RunClaim | null;
      // The commissioned missing/unreadable-claim policy applies even to
      // read errors, once this owned directory's age has been established.
      try { claim = await claimOf(dir, run); }
      catch { throw new InvalidRunRecord(claimPath); }
      if (!claim || claim.container !== containerName(run)) throw new InvalidRunRecord(claimPath);
      if (expectedJob) {
        const askPath = join(dir, "ask.json"), bytes = await readPrivate(askPath, INPUT_BYTES);
        if (bytes === null || digest(bytes) !== claim.askDigest) throw new InvalidRunRecord(askPath);
        let recorded: RunAsk;
        try { recorded = decodeAsk(bytes); } catch { throw new InvalidRunRecord(askPath); }
        if (recorded.run !== run || recorded.configuration.image !== claim.image) throw new InvalidRunRecord(askPath);
        if (encodeJob(recorded.job) !== encodeJob(expectedJob)) {
          if (withinGrace) return "running";
          throw new RunIdentityRefusal(askPath);
        }
      }
      const terminal = await terminalOf(dir, claim);
      if (terminal) return terminal.report;
      // Validate retained start bytes before consulting the engine. A corrupt
      // record remains diagnosable even when its engine cannot be reached.
      const started = await startedOf(dir, claim);
      const state = await engine(claim).inspect(run);
      if (state && started && state.id !== started.id) throw new InvalidRunRecord(join(dir, "started.json"));
      if (state?.running || now <= claim.finishBy) return "running";
      // This is a lost judgment, not proof that a paused original creator or
      // supervisor stopped. Keep every fence byte and never replace execution.
      return null;
    } catch (error) {
      if (!(error instanceof InvalidRunRecord)) throw error;
      if (withinGrace) return "running";
      throw new RunRecordCorruption(error.path);
    }
  };
  const run: Runner["run"] = async given => {
    // Copy and validate before the first wait, including every snapshot byte.
    const encoded = encodeAsk(given), ask = decodeAsk(encoded), askDigest = digest(encoded);
    const createdAt = Date.now();
    const claim: RunClaim = { v: 1, run: ask.run, askDigest, command, execCommand, image: ask.configuration.image, needsOrigin: !ask.job.overlay && !ask.job.snapshot, container: containerName(ask.run),
      createdAt, finishBy: createdAt + (ask.configuration.limits.seconds + GRACE_SECONDS) * 1000 };
    const claimBytes = canonicalize(claim);
    if (Buffer.byteLength(claimBytes) > CLAIM_BYTES) throw new ClaimTooLargeRefusal();
    const root = await privateRoot(rootOption), dir = runDirectory(root, ask.run);
    let created = false;
    try { await fs.mkdir(dir, { mode: 0o700 }); created = true; await syncDirectory(root); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw unavailable(); }
    if (!created) {
      const prior = await locate(ask.run);
      if (!prior || prior.claim.askDigest !== askDigest || canonicalize(prior.claim.command) !== canonicalize(command)
        || canonicalize(prior.claim.execCommand) !== canonicalize(execCommand)) throw new RunIdentityRefusal();
      for (;;) {
        const terminal = await terminalOf(prior.dir, prior.claim);
        if (terminal) return terminal.report;
        if (Date.now() > prior.claim.finishBy) { const result = await find(ask.run); if (result !== "running") return result; }
        await delay();
      }
    }
    await writePrivate(join(dir, "claim.json"), claimBytes);
    await writePrivate(join(dir, "ask.json"), encoded);
    let origin: ContainerRunnerOrigin | null = null, bridge: Awaited<ReturnType<typeof serveOrigin>> | null = null;
    const setup = new AbortController();
    const deadline = setTimeout(() => setup.abort(), Math.max(1, claim.finishBy - Date.now()));
    try {
      if (!ask.job.overlay && !ask.job.snapshot) {
        if (!originFor) { await writeTerminal(dir, claim, null); return null; }
        origin = await Promise.race([originFor(ask, setup.signal).then(value => {
          if (setup.signal.aborted) { void value.close().catch(() => undefined); throw unavailable(); }
          return value;
        }), new Promise<never>((_, reject) => { setup.signal.addEventListener("abort", () => reject(unavailable()), { once: true }); })]);
        bridge = await serveOrigin(origin, () => acknowledgeOrigin(dir, claim));
      }
      if (setup.signal.aborted) throw unavailable();
      const launch: RunLaunch = { v: 1, origin: origin && bridge ? { repository: origin.repository, socket: bridge.socket } : null };
      await writePrivate(join(dir, "launch.json"), canonicalize(launch));
      let exited = false;
      const child = spawn(process.execPath, ["--import", import.meta.resolve("tsx"), fileURLToPath(new URL("./container-supervisor.ts", import.meta.url)), dir], {
        detached: true, stdio: "ignore", env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: process.env["HOME"] ?? "/nonexistent", TMPDIR: tmpdir(), LANG: "C" },
      });
      child.once("error", () => { exited = true; }); child.once("exit", () => { exited = true; }); child.unref();
      for (;;) {
        const terminal = await terminalOf(dir, claim);
        if (terminal) return terminal.report;
        if (Date.now() > claim.finishBy + 35_000) { child.kill("SIGTERM"); throw unavailable(); }
        if (exited) {
          // The launching owner may clean its own uncertain execution, but
          // find() remains observational and never retries create/start.
          await engine(claim).destroy(ask.run);
          await writeTerminal(dir, claim, null);
          return null;
        }
        await delay();
      }
    } catch {
      if (!(await terminalOf(dir, claim))) {
        await engine(claim).destroy(ask.run);
        await writeTerminal(dir, claim, null);
      }
      throw unavailable();
    } finally {
      clearTimeout(deadline); setup.abort();
      try {
        if (bridge) await bridge.close();
        else if (origin) await origin.close();
      } catch { throw unavailable(); }
    }
  };
  return { run, find };
}
