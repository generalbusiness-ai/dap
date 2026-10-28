/** Node-only production runner. The private receipt is an execution fence, not a run-log store. */
import * as fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { containerName, createContainerEngine } from "./container-engine.ts";
import { acknowledgeOrigin, CLAIM_BYTES, claimOf, decodeAsk, digest, encodeAsk, encodeJob, GRACE_SECONDS, INPUT_BYTES, privateRoot, readPrivate, runDirectory, startedOf, syncDirectory, terminalOf, writePrivate, writeTerminal, type RunClaim, type RunLaunch } from "./container-records.ts";
import { serveOrigin, type ContainerRunnerOrigin } from "./container-origin.ts";
import type { RunAsk, Runner } from "./service.ts";
import { RunIdentityRefusal } from "./service.ts";

export type { ContainerRunnerOrigin };
export interface ContainerRunnerOptions {
  /** An owned 0700 directory on persistent local storage. Its run fences are never automatically evicted. */
  root: string;
  /** Trusted engine argv prefix, for example ["nerdctl"] or the supported Lima prefix. No shell text. */
  command: readonly string[];
  /** Trusted custody-to-gateway wiring. Snapshot jobs never call it. No credential enters RunAsk. */
  originFor?: (ask: RunAsk, signal: AbortSignal) => Promise<ContainerRunnerOrigin>;
}
const unavailable = (): Error => new Error("The private checker execution could not be recovered; no replacement run was started.");
const delay = () => new Promise<void>(resolve => { setTimeout(resolve, 100); });
const validRun = (run: string): boolean => typeof run === "string" && /^[A-Za-z0-9_.-]{1,128}$/.test(run);

export function containerRunner(options: ContainerRunnerOptions): Runner {
  const command = [...options.command], rootOption = options.root, originFor = options.originFor;
  if (!command.length || command.length > 32 || command.some(arg => !arg || arg.length > 4096 || arg.includes("\0"))) throw unavailable();
  const engine = (claim: RunClaim) => createContainerEngine({ argvPrefix: claim.command, image: claim.image });
  const locate = async (run: string) => {
    if (!validRun(run)) throw unavailable();
    let root: string;
    try { root = await privateRoot(rootOption, false); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    const dir = runDirectory(root, run);
    try { await privateRoot(dir, false); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    const claim = await claimOf(dir, run);
    if (!claim || claim.container !== containerName(run)) throw unavailable();
    return { dir, claim };
  };
  const find: Runner["find"] = async (run, expectedJob) => {
    const found = await locate(run);
    if (!found) return null;
    if (expectedJob) {
      const bytes = await readPrivate(join(found.dir, "ask.json"), INPUT_BYTES);
      if (!bytes || digest(bytes) !== found.claim.askDigest) throw unavailable();
      const recorded = JSON.parse(bytes) as { job: unknown };
      if (canonicalize(recorded.job) !== encodeJob(expectedJob)) throw new RunIdentityRefusal();
    }
    const terminal = await terminalOf(found.dir, found.claim);
    if (terminal) return terminal.report;
    const state = await engine(found.claim).inspect(run);
    const started = await startedOf(found.dir, found.claim);
    if (state && started && state.id !== started.id) throw unavailable();
    if (state?.running || Date.now() <= found.claim.finishBy) return "running";
    // A missing end is not a pass or proof of physical cancellation.
    return null;
  };
  const run: Runner["run"] = async given => {
    // Copy and validate before the first wait, including every snapshot byte.
    const encoded = encodeAsk(given), ask = decodeAsk(encoded), askDigest = digest(encoded);
    const createdAt = Date.now();
    const claim: RunClaim = { v: 1, run: ask.run, askDigest, command, image: ask.configuration.image, needsOrigin: !ask.job.snapshot, container: containerName(ask.run),
      createdAt, finishBy: createdAt + (ask.configuration.limits.seconds + GRACE_SECONDS) * 1000 };
    const claimBytes = canonicalize(claim);
    if (Buffer.byteLength(claimBytes) > CLAIM_BYTES) throw new RunIdentityRefusal();
    const root = await privateRoot(rootOption), dir = runDirectory(root, ask.run);
    let created = false;
    try { await fs.mkdir(dir, { mode: 0o700 }); created = true; await syncDirectory(root); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw unavailable(); }
    if (!created) {
      const prior = await locate(ask.run);
      if (!prior || prior.claim.askDigest !== askDigest || canonicalize(prior.claim.command) !== canonicalize(command)) throw new RunIdentityRefusal();
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
      if (!ask.job.snapshot) {
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
      const child = spawn(process.execPath, ["--experimental-transform-types", fileURLToPath(new URL("./container-supervisor.ts", import.meta.url)), dir], {
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
