/** Private execution receipts. Never mounted in a job or removed with its container. */
import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, isAbsolute, join } from "node:path";
import { b64url, canonicalize, isDigest, isFactRef, isScopeRef, unb64url } from "@generalbusiness/dap-bytes";
import type { Digest } from "@generalbusiness/dap-contract";
import { isObjectId } from "@generalbusiness/dap-git";
import { readConfiguration } from "./configuration.ts";
import type { Variable } from "./configuration.ts";
import { readReport, type RunReport } from "./outcome.ts";
import type { RunAsk } from "./service.ts";
import type { Job } from "./job.ts";

export const INPUT_BYTES = 64 * 1024 * 1024;
export const REPORT_BYTES = 4 * 1024 * 1024;
export const CLAIM_BYTES = 16 * 1024;
export const GRACE_SECONDS = 120;
export const digest = (bytes: string | Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const refused = (): Error => new Error("The private checker execution record is unavailable or differs; no replacement run was started.");

/** Bound the input before canonical allocation; copy every value before awaiting. */
function encodeInput(given: unknown): string {
  let bytes = 0, nodes = 0;
  const visiting = new Set<object>();
  const copy = (value: unknown, depth: number): unknown => {
    if (++nodes > 200_000 || depth > 64) throw refused();
    bytes += 32;
    if (bytes > INPUT_BYTES) throw refused();
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") { if (!Number.isFinite(value)) throw refused(); return value; }
    if (value instanceof Uint8Array) {
      bytes += value.length * 2;
      if (bytes > INPUT_BYTES) throw refused();
      return b64url(value);
    }
    if (typeof value === "string") {
      if (value.length > INPUT_BYTES) throw refused();
      bytes += Buffer.byteLength(value) * 6 + 2;
      if (bytes > INPUT_BYTES) throw refused();
      return value;
    }
    if (typeof value !== "object" || visiting.has(value)) throw refused();
    visiting.add(value);
    let result: unknown;
    if (Array.isArray(value)) {
      if (value.length > 200_000) throw refused();
      result = Array.from({ length: value.length }, (_, index) => copy(value[index], depth + 1));
    }
    else {
      if (![Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null)) throw refused();
      const record: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      for (const key in value) {
        if (!Object.hasOwn(value, key)) continue;
        bytes += Buffer.byteLength(key) * 6 + 8;
        if (bytes > INPUT_BYTES) throw refused();
        record[key] = copy((value as Record<string, unknown>)[key], depth + 1);
      }
      result = record;
    }
    visiting.delete(value);
    return result;
  };
  const encoded = canonicalize(copy(given, 0));
  if (Buffer.byteLength(encoded) > INPUT_BYTES) throw refused();
  return encoded;
}
export function encodeAsk(given: RunAsk): string {
  const encoded = encodeInput(given); decodeAsk(encoded); return encoded;
}
export const encodeJob = (job: Job): string => encodeInput(job);

export function decodeAsk(bytes: string): RunAsk {
  if (Buffer.byteLength(bytes) > INPUT_BYTES) throw refused();
  const ask = JSON.parse(bytes) as RunAsk;
  if (!ask || typeof ask.run !== "string" || !/^[A-Za-z0-9_.-]{1,128}$/.test(ask.run) || !ask.job
    || !isScopeRef(ask.job.lane) || !isFactRef(ask.job.fact) || canonicalize(ask.job.lane) !== canonicalize(ask.job.fact.at)
    || !isObjectId(ask.job.commit) || !isObjectId(ask.job.tree) || !isObjectId(ask.job.base)
    || !readConfiguration(canonicalize(ask.configuration), ask.job.configuration) || ask.configuration.name !== ask.job.name) throw refused();
  if (ask.job.snapshot) {
    if (ask.job.snapshot.commit !== ask.job.commit || ask.job.snapshot.tree !== ask.job.tree || ask.job.snapshot.base !== ask.job.base
      || !Array.isArray(ask.job.snapshot.objects)) throw refused();
    ask.job.snapshot = { ...ask.job.snapshot, objects: ask.job.snapshot.objects.map(object => {
      const data = typeof object.data === "string" ? unb64url(object.data) : null;
      if (!data) throw refused();
      return { ...object, data };
    }) };
  }
  return ask;
}

export interface RunClaim {
  v: 1;
  run: string;
  askDigest: string;
  command: readonly string[];
  image: Digest;
  needsOrigin: boolean;
  container: string;
  createdAt: number;
  finishBy: number;
}
export interface RunLaunch { v: 1; origin: { repository: string; socket: string } | null }
export interface RunStarted { v: 1; run: string; askDigest: string; id: string; image: Digest; environment: readonly Variable[] }
interface RunTerminal { v: 1; run: string; askDigest: string; report: RunReport | null }

function owner(stat: { uid: number; mode: number }): void {
  if (process.getuid && stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) throw refused();
}
export async function privateRoot(root: string, create = true): Promise<string> {
  if (!isAbsolute(root)) throw refused();
  if (create) await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const stat = await fs.lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw refused();
  owner(stat);
  return fs.realpath(root);
}
export const runDirectory = (root: string, run: string): string => join(root, digest(run));
export async function readPrivate(path: string, bound: number): Promise<string | null> {
  let file: fs.FileHandle;
  try { file = await fs.open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw refused(); }
  try {
    const stat = await file.stat(); owner(stat);
    if (!stat.isFile() || stat.size > bound) throw refused();
    const bytes = Buffer.alloc(stat.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const got = await file.read(bytes, length, bytes.length - length, length);
      if (!got.bytesRead) break;
      length += got.bytesRead;
    }
    if (length !== stat.size) throw refused();
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length));
  } finally { await file.close(); }
}
export async function writePrivate(path: string, value: string): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const file = await fs.open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    try { await file.chmod(0o600); await file.writeFile(value); await file.sync(); } finally { await file.close(); }
    await fs.link(temporary, path);
    await syncDirectory(dirname(path));
  } finally { await fs.unlink(temporary); }
}
export async function syncDirectory(path: string): Promise<void> {
  const directory = await fs.open(path, constants.O_RDONLY);
  try { await directory.sync(); } finally { await directory.close(); }
}
export async function claimOf(dir: string, run: string): Promise<RunClaim | null> {
  const bytes = await readPrivate(join(dir, "claim.json"), CLAIM_BYTES);
  if (bytes === null) return null;
  const claim = JSON.parse(bytes) as RunClaim;
  if (claim.v !== 1 || claim.run !== run || !/^[a-f0-9]{64}$/.test(claim.askDigest) || !Array.isArray(claim.command)
    || !claim.command.length || claim.command.length > 32 || claim.command.some(x => typeof x !== "string" || !x || x.length > 4096)
    || !isDigest(claim.image) || typeof claim.needsOrigin !== "boolean" || typeof claim.container !== "string" || !Number.isSafeInteger(claim.createdAt) || !Number.isSafeInteger(claim.finishBy)
    || claim.finishBy <= claim.createdAt || claim.finishBy - claim.createdAt > (86_400 + GRACE_SECONDS) * 1000) throw refused();
  return claim;
}
export async function terminalOf(dir: string, claim: RunClaim): Promise<{ report: RunReport | null } | null> {
  const bytes = await readPrivate(join(dir, "terminal.json"), REPORT_BYTES);
  if (bytes === null) return null;
  const result = JSON.parse(bytes) as RunTerminal;
  const report = result.report === null ? null : readReport(result.report);
  if (result.v !== 1 || result.run !== claim.run || result.askDigest !== claim.askDigest || result.report !== null && !report) throw refused();
  if (report) {
    const started = await startedOf(dir, claim);
    if (!started || report.image !== started.image || canonicalize(report.environment) !== canonicalize(started.environment)) throw refused();
    if (claim.needsOrigin && report.end !== "lost" && !await originClosedOf(dir, claim)) throw refused();
  }
  // A concurrent reader can observe the hard link before its writer's
  // directory sync finishes. It confirms that sync itself before release.
  await syncDirectory(dir);
  return { report };
}
export async function startedOf(dir: string, claim: RunClaim): Promise<RunStarted | null> {
  const bytes = await readPrivate(join(dir, "started.json"), 128 * 1024);
  if (bytes === null) return null;
  const started = JSON.parse(bytes) as RunStarted;
  const report = readReport({ started: true, image: started.image, environment: started.environment, checkout: false, steps: [], end: "lost" });
  if (started.v !== 1 || started.run !== claim.run || started.askDigest !== claim.askDigest || !/^[a-f0-9]{64}$/.test(started.id)
    || started.image !== claim.image || !report) throw refused();
  return started;
}
export const writeTerminal = (dir: string, claim: RunClaim, report: RunReport | null): Promise<void> =>
  writePrivate(join(dir, "terminal.json"), canonicalize({ v: 1, run: claim.run, askDigest: claim.askDigest, report } satisfies RunTerminal));

export async function originClosedOf(dir: string, claim: RunClaim): Promise<boolean> {
  const bytes = await readPrivate(join(dir, "origin-closed.json"), 4096);
  if (bytes === null) return false;
  if (bytes !== canonicalize({ v: 1, run: claim.run, askDigest: claim.askDigest })) throw refused();
  await syncDirectory(dir); return true;
}
export const acknowledgeOrigin = (dir: string, claim: RunClaim): Promise<void> =>
  writePrivate(join(dir, "origin-closed.json"), canonicalize({ v: 1, run: claim.run, askDigest: claim.askDigest }));
