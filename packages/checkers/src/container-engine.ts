/** Node-only nerdctl boundary. The job has loopback, an immutable relay and
 * private tmpfs; neither host files nor credentials enter its namespace. */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { canonicalize, isDigest, textDigest } from "@generalbusiness/dap-bytes";
import type { Digest } from "@generalbusiness/dap-contract";
import { GitProgram, READ_BOUNDS, type Exec, type ExecResult } from "@generalbusiness/dap-git";
import { configurationDigest, readConfiguration, type Variable } from "./configuration.ts";
import { checkout, checkoutObjects, runSteps, type Checkout, type StepExec } from "./runner.ts";
import type { Job } from "./job.ts";
import type { RunAsk } from "./service.ts";
import type { RunReport, StepReport } from "./outcome.ts";

export interface ContainerEngineOptions {
  argvPrefix: readonly string[];
  /** Complete trusted ctr tasks exec prefix, including its private FIFO directory. */
  execCommand: readonly string[];
  image: string;
  memoryBytes?: number;
  workBytes?: number;
  pids?: number;
}
export interface ContainerOrigin { repository: string; forward(request: Request): Promise<Response> }
export interface ContainerState { running: boolean; image: string | null; exitCode: number | null; oomKilled: boolean | null; id: string | null }
export interface ContainerRun {
  readonly name: string;
  readonly id: string;
  readonly image: Digest;
  readonly environment: readonly Variable[];
  readonly git: GitProgram;
  readonly step: StepExec;
  checkout(job: Job): Promise<Checkout>;
  run(): Promise<RunReport>;
  destroy(): Promise<void>;
}
export interface ContainerEngine {
  create(ask: RunAsk, origin?: ContainerOrigin, signal?: AbortSignal): Promise<ContainerRun>;
  inspect(run: string): Promise<ContainerState | null>;
  destroy(run: string): Promise<void>;
}
export class ContainerEngineError extends Error {
  constructor(readonly reason: "configuration" | "engine" | "isolation" | "image" | "environment" | "relay" | "stopped" | "job") { super(`Container runner unavailable: ${reason}.`); }
}
export const containerName = (run: string): string => `artroom-check-${textDigest(run).slice(7)}`;
const RELAY = "/usr/local/bin/artroom-git-relay", WORK = "/work/repo";
const TOOL_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
const FRAME = 512 * 1024, WIRE = 256 * 1024 * 1024, REQUEST = 256 * 1024;
type RecordValue = Record<string, unknown>;
const record = (v: unknown): RecordValue => v !== null && typeof v === "object" && !Array.isArray(v) ? v as RecordValue : {};
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const error = (reason: ConstructorParameters<typeof ContainerEngineError>[0]): never => { throw new ContainerEngineError(reason); };
const text = new TextDecoder("utf-8", { fatal: true });
function variables(value: unknown): Variable[] {
  if (!Array.isArray(value) || value.length > 64) return error("environment");
  return value.map(row => {
    if (typeof row !== "string" || row.indexOf("=") < 1) return error("environment");
    const at = row.indexOf("="); return { name: row.slice(0, at), value: row.slice(at + 1) };
  });
}

/** Bounded output ownership, not execFile's potentially gigabyte buffer. */
async function command(prefix: readonly string[], args: readonly string[], options: { milliseconds: number; bytes: number; capture?: boolean; stdin?: Uint8Array; signal?: AbortSignal }): Promise<ExecResult & { bytes: number; stderrBytes: number; line: string | null; limited: boolean }> {
  if (options.signal?.aborted) return error("stopped");
  return new Promise((resolve, reject) => {
    const child = spawn(prefix[0]!, [...prefix.slice(1), ...args], { env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: process.env["HOME"] ?? "/nonexistent" }, stdio: "pipe" });
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    let bytes = 0, stderrBytes = 0, timedOut = false, limited = false;
    let current: number[] = [], last: Uint8Array | null = null, long = false;
    let closeBound: ReturnType<typeof setTimeout> | undefined;
    const kill = () => {
      child.kill("SIGKILL");
      closeBound ??= setTimeout(() => { clearTimeout(timer); options.signal?.removeEventListener("abort", stop); child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy(); reject(new ContainerEngineError("engine")); }, 5000);
    };
    const stop = () => { timedOut = true; kill(); };
    const timer = setTimeout(stop, Math.max(1, options.milliseconds));
    options.signal?.addEventListener("abort", stop, { once: true });
    const receive = (chunk: Buffer, sink: Buffer[], isStdout: boolean) => {
      bytes += chunk.length;
      if (!isStdout) stderrBytes += chunk.length;
      if (bytes > options.bytes) { limited = true; kill(); return; }
      if (options.capture) sink.push(Buffer.from(chunk));
      if (!isStdout) return;
      for (const byte of chunk) {
        if (byte === 10) { last = long ? null : Uint8Array.from(current); current = []; long = false; }
        else if (current.length < 1025) current.push(byte); else long = true;
      }
    };
    child.stdout.on("data", (chunk: Buffer) => receive(chunk, stdout, true));
    child.stderr.on("data", (chunk: Buffer) => receive(chunk, stderr, false));
    child.stdin.on("error", () => undefined);
    child.stdin.end(options.stdin);
    child.on("error", () => undefined);
    child.on("close", code => {
      clearTimeout(timer); if (closeBound) clearTimeout(closeBound); options.signal?.removeEventListener("abort", stop);
      let line: string | null = null;
      const tail = long ? null : current.length > 0 ? Uint8Array.from(current) : last;
      try { if (tail !== null && tail.length <= 1024) line = text.decode(tail).replace(/\r$/, ""); } catch { /* No judgment from invalid text. */ }
      resolve({ code: code ?? -1, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr), timedOut, bytes, stderrBytes, line, limited });
    });
  });
}

function single(bytes: Uint8Array): RecordValue {
  try { const parsed: unknown = JSON.parse(text.decode(bytes)); if (Array.isArray(parsed) && parsed.length === 1) return record(parsed[0]); } catch { /* Fixed refusal. */ }
  return error("engine");
}

/** nerdctl can report both a tag and its digest alias. Every reported target
 * must resolve to this exact digest; container inspection stays single-row. */
function resolvedImage(bytes: Uint8Array, digest: Digest): void {
  try {
    const rows: unknown = JSON.parse(text.decode(bytes));
    if (Array.isArray(rows) && rows.length > 0 && rows.length <= 256
      && rows.every(row => record(record(record(row)["Image"])["Target"])["digest"] === digest)) return;
  } catch { /* No image provenance from malformed metadata. */ }
  return error("image");
}

export function createContainerEngine(options: ContainerEngineOptions): ContainerEngine {
  const prefix = [...options.argvPrefix], execCommand = [...options.execCommand], imageRef = options.image;
  if ([prefix, execCommand].some(command => !command.length || command.some(v => !v || /[\u0000\r\n]/.test(v))) || !imageRef || /[\u0000\r\n]/.test(imageRef)) return error("configuration");
  const memory = options.memoryBytes ?? 512 * 1024 * 1024, work = options.workBytes ?? 128 * 1024 * 1024, pids = options.pids ?? 64;
  if (![memory, work, pids].every(v => Number.isSafeInteger(v) && v > 0) || memory > 4 * 1024 ** 3 || work > memory || pids > 256) return error("configuration");
  const cli = async (args: string[], signal?: AbortSignal): Promise<Uint8Array> => {
    const result = await command(prefix, args, { milliseconds: 30_000, bytes: 1024 * 1024, capture: true, ...(signal ? { signal } : {}) });
    if (result.code !== 0 || result.timedOut || result.limited) return error("engine");
    return result.stdout;
  };
  const native = async (run: string, signal?: AbortSignal): Promise<RecordValue | null> => {
    const name = containerName(run);
    // Successful enumeration distinguishes absent from an unreadable engine.
    const names = text.decode(await cli(["ps", "-a", "--format", "{{.Names}}"], signal)).split(/\r?\n/);
    if (!names.includes(name)) return null;
    const value = single(await cli(["inspect", "--mode=native", name], signal));
    if (record(value["Labels"])["artroom.checker.run"] !== textDigest(run)) return error("isolation");
    return value;
  };
  const inspect = async (run: string): Promise<ContainerState | null> => {
    const value = await native(run); if (!value) return null;
    const state = record(record(value["Process"])["Status"]), annotations = record(record(value["Spec"])["annotations"]);
    return { running: state["Status"] === "running", image: typeof annotations["nerdctl/image-digest"] === "string" ? annotations["nerdctl/image-digest"] : null,
      exitCode: typeof state["ExitStatus"] === "number" ? state["ExitStatus"] : null, oomKilled: null, id: typeof value["ID"] === "string" ? value["ID"] : null };
  };
  const destroy = async (run: string): Promise<void> => { if (await native(run)) await cli(["rm", "-f", containerName(run)]); };

  return { inspect, destroy, create: async (given, origin, signal) => {
    const ask = structuredClone(given), configuration = ask.configuration, name = containerName(ask.run);
    if (!readConfiguration(canonicalize(configuration), configurationDigest(configuration)) || ask.job.configuration !== configurationDigest(configuration)) return error("configuration");
    const started = performance.now(), deadline = started + configuration.limits.seconds * 1000;
    let stopped = false, expired = false, ran = false, memoryLost = false;
    const remaining = () => Math.max(1, deadline - performance.now());
    const ensure = () => { if (performance.now() >= deadline) expired = true; if (stopped || signal?.aborted || expired) return error("stopped"); };
    resolvedImage(await cli(["image", "inspect", "--mode=native", imageRef], signal), configuration.image);
    if (await native(ask.run, signal)) return error("job");
    let upstream: URL | undefined;
    if (origin) { try { upstream = new URL(origin.repository); } catch { return error("job"); }
      if (!["http:", "https:"].includes(upstream.protocol) || upstream.username || upstream.password || upstream.search || upstream.hash || ask.job.remote !== undefined && ask.job.remote !== origin.repository) return error("job"); }
    // nerdctl injects HOSTNAME from --hostname; also passing the same --env
    // would duplicate that row in OCI metadata. Exact environment checks stay.
    const explicitEnv = configuration.environment.filter(v => v.name !== "HOSTNAME" || v.value !== "artroom-checker");
    const args = ["run", "-i", "--pull=never", "--name", name, "--label", `artroom.checker.run=${textDigest(ask.run)}`,
      "--network=none", `--memory=${memory}`, `--memory-swap=${memory}`, `--pids-limit=${pids}`, "--cpus=1", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--read-only",
      "--user=65533:65533", "--hostname=artroom-checker", `--tmpfs=/work:exec,nosuid,nodev,uid=65532,gid=65532,mode=0700,size=${work}`,
      "--tmpfs=/tmp:nosuid,nodev,mode=1777,size=16777216", "--entrypoint", RELAY, ...explicitEnv.flatMap(v => ["--env", `${v.name}=${v.value}`]), imageRef, String(configuration.limits.seconds + 120)];
    const child = spawn(prefix[0]!, [...prefix.slice(1), ...args], { env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: process.env["HOME"] ?? "/nonexistent" }, stdio: "pipe" });
    const closed = new Promise<void>(resolve => { child.once("close", () => resolve()); });
    const relayOwner = new AbortController();
    let hello!: (value: unknown) => void, failHello!: (error: Error) => void;
    const ready = new Promise<unknown>((resolve, reject) => { hello = resolve; failHello = reject; });
    let buffer = Buffer.alloc(0), readySeen = false, busy = false, totalWire = 0, requests = 0, stateId = 0;
    let stateReply: { resolve(value: RecordValue): void; reject(error: Error): void } | undefined;
    let removal: Promise<void> | undefined;
    const remove = (): Promise<void> => removal ??= destroy(ask.run);
    const end = () => { if (stopped) return; stopped = true; stateReply?.reject(new ContainerEngineError("stopped")); relayOwner.abort(); child.stdin.destroy(); child.kill("SIGKILL"); void remove().catch(() => undefined); };
    const failedRelay = () => { failHello(new ContainerEngineError("relay")); end(); };
    const timer = setTimeout(() => { expired = true; end(); }, remaining());
    const abort = () => end(); signal?.addEventListener("abort", abort, { once: true });
    const write = (value: unknown): Promise<void> => new Promise((resolve, reject) => {
      ensure(); const line = JSON.stringify(value) + "\n";
      if (Buffer.byteLength(line) > FRAME) return reject(new ContainerEngineError("relay"));
      child.stdin.write(line, cause => cause ? reject(new ContainerEngineError("relay")) : resolve());
    });
    const forward = async (frame: RecordValue): Promise<void> => {
      const encoded = frame["body"] ?? "";
      if (busy || ++requests > 256 || !Number.isSafeInteger(frame["id"]) || Number(frame["id"]) < 1 || typeof frame["target"] !== "string" || !frame["target"].startsWith("/") || frame["target"].length > 8192 || /[\u0000\r\n#]/.test(frame["target"]) || !["GET", "POST"].includes(String(frame["method"])) || typeof encoded !== "string" || encoded.length > 4 * Math.ceil(REQUEST / 3)) return error("relay");
      busy = true; const id = frame["id"];
      const body = Buffer.from(encoded, "base64");
      if (body.length > REQUEST || body.toString("base64") !== encoded) return error("relay");
      const headers = new Headers();
      for (const [key, value] of Object.entries(record(frame["headers"]))) {
        if (!["content-type", "accept", "git-protocol"].includes(key.toLowerCase()) || typeof value !== "string" || value.length > 8192) return error("relay");
        headers.set(key, value);
      }
      totalWire += body.length;
      if (totalWire > WIRE) return error("relay");
      ensure();
      // Concatenation fixes the origin even for a target starting with '//'.
      const response = upstream && origin ? await origin.forward(new Request(upstream.origin + frame["target"], { method: String(frame["method"]), headers, signal: relayOwner.signal,
        ...(frame["method"] === "POST" ? { body: new Uint8Array(body) } : {}) })) : new Response("No grant\n", { status: 403 });
      ensure();
      const kept: Record<string, string> = {};
      for (const key of ["content-type", "content-encoding", "cache-control", "location"]) { const value = response.headers.get(key); if (value !== null) { if (value.length > 8192) return error("relay"); kept[key] = value; } }
      await write({ kind: "head", id, status: response.status, headers: kept });
      const reader = response.body?.getReader();
      try { if (reader) for (;;) {
        const next = await reader.read(); ensure(); if (next.done) break;
        totalWire += next.value.length; if (totalWire > WIRE) return error("relay");
        for (let at = 0; at < next.value.length; at += 32 * 1024) await write({ kind: "chunk", id, data: Buffer.from(next.value.subarray(at, at + 32 * 1024)).toString("base64") });
      } } finally { if (reader) { void reader.cancel().catch(() => undefined); reader.releaseLock(); } }
      busy = false; await write({ kind: "end", id });
    };
    child.stdout.on("data", (chunk: Buffer) => {
      // Bound each pending line before allocating a concatenation.
      if (buffer.length + chunk.length > FRAME) { failedRelay(); return; }
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) { const at = buffer.indexOf(10); if (at < 0) break;
        const line = buffer.subarray(0, at); buffer = buffer.subarray(at + 1);
        let frame: RecordValue; try { frame = record(JSON.parse(text.decode(line))); } catch { failedRelay(); return; }
        if (!readySeen && frame["kind"] === "ready") { readySeen = true; hello(frame["env"]); }
        else if (readySeen && frame["kind"] === "state" && stateReply && frame["id"] === stateId) { stateReply.resolve(record(frame["metrics"])); stateReply = undefined; }
        else if (readySeen && frame["kind"] === "request") void forward(frame).catch(failedRelay);
        else { failedRelay(); return; }
      }
    });
    let stderrBytes = 0;
    child.stderr.on("data", (chunk: Buffer) => { stderrBytes += chunk.length; if (stderrBytes > 64 * 1024) failedRelay(); });
    child.stdin.on("error", failedRelay); child.on("error", failedRelay); child.on("close", failedRelay);
    const kernel = async (): Promise<number> => {
      ensure();
      if (stateReply) return error("relay"); stateId++;
      const reply = new Promise<RecordValue>((resolve, reject) => { stateReply = { resolve, reject }; });
      void reply.catch(() => undefined);
      await write({ kind: "state", id: stateId });
      const metrics = await reply;
      ensure();
      if (String(metrics["memory.max"]).trim() !== String(memory) || String(metrics["pids.max"]).trim() !== String(pids) || String(metrics["cpu.max"]).trim().replace(/\s+/g, " ") !== "100000 100000") return error("isolation");
      const match = /^oom_kill ([0-9]+)$/m.exec(String(metrics["memory.events"]));
      if (!match || !Number.isSafeInteger(Number(match[1]))) return error("isolation"); return Number(match[1]);
    };
    let disposal: Promise<void> | undefined;
    const dispose = (): Promise<void> => disposal ??= (async () => {
      clearTimeout(timer); signal?.removeEventListener("abort", abort); stateReply?.reject(new ContainerEngineError("stopped")); stopped = true; relayOwner.abort(); child.stdin.destroy(); child.kill("SIGKILL");
      try { await remove(); }
      finally {
        await Promise.race([closed, new Promise<never>((_, reject) => {
          const finish = setTimeout(() => reject(new ContainerEngineError("engine")), 5000);
          closed.finally(() => clearTimeout(finish)).catch(() => undefined);
        })]);
        // A pre-close absence cannot settle a create still owned by that CLI.
        await destroy(ask.run);
        if (await native(ask.run)) return error("engine");
      }
    })();
    try {
      const environment = variables(await Promise.race([ready, new Promise<never>((_, reject) => { const setup = setTimeout(() => reject(new ContainerEngineError("engine")), Math.min(30_000, remaining())); ready.finally(() => clearTimeout(setup)).catch(() => undefined); })]));
      ensure(); if (canonicalize(environment) !== canonicalize(configuration.environment)) return error("environment");
      const metadata = await native(ask.run, signal); if (!metadata) return error("engine");
      const id = metadata["ID"]; if (typeof id !== "string" || !/^[0-9a-f]{64}$/.test(id)) return error("engine");
      const spec = record(metadata["Spec"]), proc = record(spec["process"]), linux = record(spec["linux"]), resources = record(linux["resources"]), annotations = record(spec["annotations"]);
      const image = annotations["nerdctl/image-digest"];
      if (!isDigest(image) || image !== configuration.image) return error("image");
      const mounts = list(spec["mounts"]).map(record), workMount = mounts.find(m => m["destination"] === "/work"), mountOptions = list(workMount?.["options"]);
      const allowed = new Set(["/proc", "/dev", "/sys", "/work", "/tmp", "/dev/pts", "/dev/shm", "/dev/mqueue", "/sys/fs/cgroup", "/etc/resolv.conf", "/etc/hosts", "/etc/hostname"]);
      const namespace = list(linux["namespaces"]).map(record), interfaces = list(record(record(metadata["Process"])["NetNS"])["Interfaces"]);
      if (record(spec["root"])["readonly"] !== true || spec["hostname"] !== "artroom-checker" || proc["noNewPrivileges"] !== true || record(proc["user"])["uid"] !== 65533 || record(proc["user"])["gid"] !== 65533
        || canonicalize(proc["args"]) !== canonicalize([RELAY, String(configuration.limits.seconds + 120)]) || !Object.hasOwn(proc, "capabilities") || Object.values(record(proc["capabilities"])).some(v => !Array.isArray(v) || v.length !== 0)
        || record(resources["memory"])["limit"] !== memory || record(resources["memory"])["swap"] !== memory || record(resources["pids"])["limit"] !== pids
        || record(resources["cpu"])["quota"] !== 100000 || record(resources["cpu"])["period"] !== 100000 || record(linux["seccomp"])["defaultAction"] !== "SCMP_ACT_ERRNO"
        || annotations["nerdctl/networks"] !== '["none"]' || !["pid", "ipc", "uts", "mount", "network", "cgroup"].every(type => namespace.some(n => n["type"] === type)) || namespace.some(n => n["path"])
        || interfaces.length !== 1 || record(interfaces[0])["Name"] !== "lo" || mounts.some(m => !allowed.has(String(m["destination"])) || m["type"] === "bind" && !["/etc/resolv.conf", "/etc/hosts", "/etc/hostname"].includes(String(m["destination"])))
        || mounts.find(m => m["destination"] === "/tmp")?.["type"] !== "tmpfs"
        || workMount?.["type"] !== "tmpfs" || !["uid=65532", "gid=65532", "mode=0700", `size=${work}`, "nosuid", "nodev"].every(v => mountOptions.includes(v)) || mountOptions.lastIndexOf("exec") < mountOptions.lastIndexOf("noexec")
        || canonicalize(variables(proc["env"])) !== canonicalize(configuration.environment)) return error("isolation");
      if (await kernel() !== 0) return error("isolation");
      let checked: Checkout | undefined;
      const completedSteps: StepReport[] = [];
      const execute = async (argv: readonly string[], milliseconds: number, bytes: number, capture: boolean, input?: Uint8Array, gitEnv?: Readonly<Record<string, string>>) => {
        const toolEnv = gitEnv ? [`PATH=${TOOL_PATH}`, ...Object.entries(gitEnv).map(([key, value]) => `${key}=${value}`)] : [];
        const program = argv[0] === "git" ? "/usr/bin/git" : argv[0];
        ensure(); const result = await command(execCommand, ["--exec-id", randomUUID(), "--user", "65532:65532", "--cwd", gitEnv ? "/work" : WORK, id,
          ...(gitEnv ? [RELAY, "exec", String(toolEnv.length), ...toolEnv, "--", program!, ...argv.slice(1)] : argv)],
          { milliseconds: Math.min(milliseconds, remaining()), bytes, capture, ...(input ? { stdin: input } : {}), ...(signal ? { signal } : {}) });
        if (result.timedOut || result.limited) { expired = true; end(); return result; } ensure();
        // ctr setup errors share stderr with jobs; SSH also reserves 255.
        // Neither is authority for a completed process judgment.
        if (result.code < 0 || result.code === 255 || result.code !== 0 && result.stderrBytes > 0) { end(); return error("engine"); }
        return result;
      };
      const identity = await execute(["/usr/bin/id", "-u"], remaining(), 4096, true, undefined, {});
      if (identity.code !== 0 || text.decode(identity.stdout).trim() !== "65532") return error("isolation");
      const exec: Exec = (argv, opts) => execute(argv, opts.timeoutMs, READ_BOUNDS.blobBytes + 65536, true, opts.stdin, opts.env);
      const git = new GitProgram({ exec, transport: "local", timeoutMs: 30_000 });
      const step: StepExec = async (argv, opts) => {
        if (opts.cwd !== WORK || canonicalize(opts.env) !== canonicalize(configuration.environment)) return error("environment");
        const began = performance.now(); const result = await execute(argv, opts.secondsLeft * 1000, opts.outputBytesLeft, false);
        const done = { status: result.timedOut || result.limited || result.code < 0 ? null : result.code, line: result.line };
        completedSteps.push(done);
        if (!stopped && await kernel() !== 0) memoryLost = true;
        if (memoryLost) { end(); return error("stopped"); }
        if (!result.timedOut && !result.limited) ensure();
        return { ...done, seconds: (performance.now() - began) / 1000, outputBytes: result.bytes };
      };
      const confirm = async (job: Job): Promise<Checkout> => {
        if (job.commit !== ask.job.commit || job.tree !== ask.job.tree || job.base !== ask.job.base) return error("job");
        if (checked) return checked;
        if (job.snapshot) checked = await checkoutObjects(git, { dir: WORK, commit: job.commit, tree: job.tree, base: job.base, objects: job.snapshot.objects }, READ_BOUNDS, { createPrivate: async dir => {
          if (dir !== WORK) return error("isolation");
          const result = await execute(["/bin/mkdir", "-m", "0700", "--", dir], remaining(), 4096, true, undefined, {});
          if (result.code !== 0) return error("isolation"); return dir;
        } });
        else if (origin && upstream) checked = await checkout(git, { dir: WORK, remote: `http://127.0.0.1:18080${upstream.pathname}`, commit: job.commit, tree: job.tree, base: job.base, ...(job.ref ? { ref: job.ref } : {}) });
        else return error("job");
        return checked;
      };
      return { name, id, image, environment, git, step, checkout: confirm, destroy: dispose, run: async (): Promise<RunReport> => {
        if (ran) return error("job"); ran = true;
        try {
          const confirmed = await confirm(ask.job);
          ensure();
          if (!confirmed.confirmed) return { started: true, image, environment, checkout: false, steps: [], end: expired ? "limits" : "complete" };
          const result = await runSteps(step, configuration, WORK);
          ensure();
          return { started: true, image, environment, checkout: true, steps: result.steps, end: expired ? "limits" : memoryLost || stopped || signal?.aborted ? "lost" : result.end };
        } catch { return { started: true, image, environment, checkout: checked?.confirmed === true, steps: completedSteps, end: expired ? "limits" : "lost" }; }
        finally { clearTimeout(timer); }
      } };
    } catch (cause) { await dispose().catch(() => undefined); throw cause instanceof ContainerEngineError ? cause : new ContainerEngineError("engine"); }
  } };
}
