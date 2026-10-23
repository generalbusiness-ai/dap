/** Node-only local archive plumbing. No shell, checkout, remote operation,
 * inherited credential environment, or command derived from tree paths. */
import { execFile } from "node:child_process";
import { utf8 } from "@generalbusiness/dap-bytes";
import { GitRefusal } from "./names.ts";
import { journalFormat, journalId, type JournalFormat } from "./journal-objects.ts";
import { scopeOfJournalRef } from "./journal-path.ts";
import { HARDENING } from "./program.ts";
import type { JournalReadBudget, JournalReadRepository } from "./journal-reader.ts";

const METADATA_BYTES = 1024;
const OBJECT_BYTES = 8 * 1024 * 1024;
const CACHED_METADATA = 8192;
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
export class JournalLocalFailure extends Error {
  readonly reason: "limit" | "timeout" | "unavailable";
  readonly step: string;
  constructor(reason: "limit" | "timeout" | "unavailable", step: string) { super(`journal-local-${step}-${reason}`); this.reason = reason; this.step = step; }
}
export interface JournalLocalOptions {
  /** Trusted tool path, never read from clone metadata. Defaults to git on PATH. */
  readonly program?: string;
  /** One command, further bounded by the caller's original remaining time. */
  readonly commandMilliseconds?: number;
}
interface Metadata { readonly type: string; readonly size: number }

class LocalJournal implements JournalReadRepository {
  #format: JournalFormat | null = null;
  readonly #metadata = new Map<string, Metadata>();
  readonly #pending = new Set<Promise<Uint8Array | null>>();
  readonly #program: string;
  readonly #milliseconds: number;
  readonly #environment: Record<string, string>;
  readonly directory: string;
  constructor(directory: string, options: JournalLocalOptions) {
    this.directory = directory;
    this.#program = options.program ?? "git";
    this.#milliseconds = options.commandMilliseconds ?? 10_000;
    if (!Number.isSafeInteger(this.#milliseconds) || this.#milliseconds < 1 || this.#milliseconds > 30_000) throw new JournalLocalFailure("limit", "configuration");
    this.#environment = {
      PATH: process.env["PATH"] ?? "/usr/bin:/bin",
      GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_ATTR_NOSYSTEM: "1",
      GIT_NO_REPLACE_OBJECTS: "1", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0",
      GIT_ASKPASS: "/bin/false", GIT_PAGER: "cat", GIT_OPTIONAL_LOCKS: "0", HOME: "/nonexistent", LC_ALL: "C",
    };
  }
  async #run(step: string, args: readonly string[], most: number, budget: JournalReadBudget, input?: Uint8Array, absent = false): Promise<Uint8Array | null> {
    budget.check();
    if (!Number.isSafeInteger(most) || most < 0 || most > OBJECT_BYTES) throw new JournalLocalFailure("limit", step);
    const remaining = budget.remainingMilliseconds?.() ?? this.#milliseconds;
    if (!Number.isFinite(remaining)) throw new JournalLocalFailure("unavailable", step);
    const milliseconds = Math.min(this.#milliseconds, Math.floor(remaining));
    if (milliseconds < 1) throw new JournalLocalFailure("timeout", step);
    const maximum = Math.max(METADATA_BYTES, most);
    // execFile bounds stdout AND stderr before it accumulates either. Even
    // small metadata commands reserve that fixed collector, not arbitrary output.
    budget.spend({ calls: 1, metadata: METADATA_BYTES, inputWork: maximum + (input?.length ?? 0) });
    const settings = [...HARDENING, "protocol.allow=never", "protocol.https.allow=never", "protocol.http.allow=never", "protocol.file.allow=never"].flatMap(value => ["-c", value]);
    const operation = new Promise<Uint8Array | null>((resolve, reject) => {
      const child = execFile(this.#program, ["--no-pager", ...settings, ...args], {
        cwd: this.directory, env: this.#environment, encoding: "buffer", maxBuffer: maximum,
        timeout: milliseconds, killSignal: "SIGKILL", windowsHide: true,
      }, (error, stdout) => {
        // The callback runs after the child and its stdio have closed. A
        // timeout is reported here, never as an early substitute for its exit.
        try {
          if (error?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") throw new JournalLocalFailure("limit", step);
          if (error?.killed && error.signal === "SIGKILL") throw new JournalLocalFailure("timeout", step);
          if (error) {
            if (absent && error.code === 1) { budget.check(); resolve(null); return; }
            throw new JournalLocalFailure("unavailable", step);
          }
          budget.check();
          if (stdout.length > most) throw new JournalLocalFailure("limit", step);
          resolve(new Uint8Array(stdout));
        } catch (failure) { reject(failure); }
      });
      child.stdin?.on("error", () => undefined);
      child.stdin?.end(input === undefined ? undefined : Buffer.from(input));
    });
    this.#pending.add(operation);
    try { return await operation; } finally { this.#pending.delete(operation); }
  }
  async #text(step: string, args: readonly string[], budget: JournalReadBudget): Promise<string> {
    const body = await this.#run(step, args, METADATA_BYTES, budget);
    if (body === null) throw new JournalLocalFailure("unavailable", step);
    try { return decoder.decode(body).trim(); } catch { throw new JournalLocalFailure("unavailable", step); }
  }
  async format(budget: JournalReadBudget): Promise<JournalFormat> {
    const format = journalFormat(await this.#text("format", ["rev-parse", "--show-object-format"], budget));
    this.#format = format; return format;
  }
  async resolve(ref: string, budget: JournalReadBudget): Promise<string | null> {
    if (scopeOfJournalRef(ref) === null) throw new GitRefusal("bad-ref-name", "journal scope");
    const found = await this.#run("ref", ["show-ref", "--verify", "--quiet", ref], 0, budget, undefined, true);
    if (found === null) return null;
    const format = this.#format ?? await this.format(budget);
    return journalId(format, await this.#text("ref", ["rev-parse", "--verify", ref], budget));
  }
  async #probe(id: string, budget: JournalReadBudget): Promise<Metadata | null> {
    const raw = await this.#run("metadata", ["cat-file", "--batch-check"], METADATA_BYTES, budget, utf8(id + "\n"));
    if (raw === null) throw new JournalLocalFailure("unavailable", "metadata");
    let value: string;
    try { value = decoder.decode(raw); } catch { throw new JournalLocalFailure("unavailable", "metadata"); }
    if (value === `${id} missing\n`) { this.#metadata.delete(id); return null; }
    const match = /^([0-9a-f]+) (blob|tree|commit|tag) (0|[1-9][0-9]*)\n$/.exec(value);
    const size = match ? Number(match[3]) : NaN;
    if (!match || match[1] !== id || !Number.isSafeInteger(size) || size < 0) throw new JournalLocalFailure("unavailable", "metadata");
    const metadata = Object.freeze({ type: match[2]!, size });
    if (this.#metadata.has(id) || this.#metadata.size < CACHED_METADATA) this.#metadata.set(id, metadata);
    return metadata;
  }
  async object(id: string, limit: number, budget: JournalReadBudget): ReturnType<JournalReadRepository["object"]> {
    const format = this.#format ?? await this.format(budget); journalId(format, id);
    if (!Number.isSafeInteger(limit) || limit < 0 || limit > OBJECT_BYTES) throw new JournalLocalFailure("limit", "object");
    budget.spend({ metadata: 128, inputWork: 128 });
    // A metadata-only call always probes actual storage. The body call may
    // reuse its bounded metadata, but no body or read allowance is cached.
    const metadata = limit === 0 ? await this.#probe(id, budget) : this.#metadata.get(id) ?? await this.#probe(id, budget);
    if (metadata === null) return null;
    if (metadata.size === 0) return { ...metadata, data: new Uint8Array() };
    if (limit === 0 || metadata.size > limit) return { ...metadata, data: null };
    const data = await this.#run("object", ["cat-file", metadata.type, id], metadata.size, budget);
    if (data === null) throw new JournalLocalFailure("unavailable", "object");
    return { ...metadata, data };
  }
  async settle(): Promise<void> { await Promise.allSettled([...this.#pending]); }
}

export function localJournalRepository(directory: string, options: JournalLocalOptions = {}): JournalReadRepository {
  return new LocalJournal(directory, options);
}
