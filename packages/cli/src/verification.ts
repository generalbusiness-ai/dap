/** One command's read-only verification work, including authentication and cleanup. */
import type { Digest, Entry, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import type { Fetch } from "@generalbusiness/dap-client";
import { canonicalize, entryHash, isDigest, isEntry, isRecord, isScopeRef, isSealed, natural, parseStrict } from "@generalbusiness/dap-bytes";
import { hashOfBytes } from "@generalbusiness/dap-replay";
import { failed, stopCommand, usage } from "./command-support.ts";

export interface VerifyLimits { milliseconds: number; bytes: number; requests: number; entries: number }
export interface VerifyOptions {
  limits?: Partial<VerifyLimits>;
  progress?: (line: string) => void;
  signal?: AbortSignal;
  /** Elapsed time only; separate from the clock used to sign intents. */
  monotonicNow?: () => number;
}
export const VERIFY_LIMITS: Readonly<VerifyLimits> = { milliseconds: 300_000, bytes: 256 * 1024 * 1024, requests: 100_000, entries: 100_000 };
type Phase = "session" | "discovery" | "replay" | "cleanup";
type Reason = "time" | "bytes" | "requests" | "entries" | "cancelled";

export class Verification {
  readonly limits: VerifyLimits;
  readonly #options: VerifyOptions;
  readonly #now: () => number;
  readonly #began: number;
  readonly #abort = new AbortController();
  readonly #ended: Promise<void>;
  readonly #finish: () => void;
  readonly #timer: ReturnType<typeof setTimeout>;
  readonly #cancel: () => void;
  #closed = false;
  #invalidSource = false;
  #reason: Reason | null = null;
  #where: { phase: Phase; scope: string; cursor: string | number | null } = { phase: "session", scope: "configuration", cursor: null };
  #bytes = 0;
  #requests = 0;
  #entries = 0;
  readonly #entryHashes = new Map<string, Digest>();
  readonly #entryScopes = new Map<ScopeId, string>();
  #completed = 0;
  constructor(options: VerifyOptions = {}) {
    this.limits = { ...VERIFY_LIMITS, ...options.limits };
    if (!Object.values(this.limits).every(value => Number.isSafeInteger(value) && value > 0) || this.limits.milliseconds > 2_147_483_647) stopCommand(usage("Verification limits must be positive safe integers; milliseconds must not exceed 2147483647."));
    this.#options = options;
    this.#now = options.monotonicNow ?? (() => performance.now());
    this.#began = this.#now();
    if (!Number.isFinite(this.#began)) stopCommand(usage("The verification elapsed clock is invalid."));
    let finish!: () => void;
    this.#ended = new Promise(resolve => { finish = resolve; }); this.#finish = finish;
    this.#cancel = () => this.#stop("cancelled");
    this.#timer = setTimeout(() => this.#stop("time"), this.limits.milliseconds);
    options.signal?.addEventListener("abort", this.#cancel, { once: true });
    if (options.signal?.aborted) this.#cancel();
  }
  #stop(reason: Reason): void {
    if (this.#reason !== null) return;
    this.#reason = reason; this.#abort.abort(); this.#finish();
  }
  check(): void {
    if (this.#invalidSource) stopCommand(failed("Cannot verify history: an entry's content, hash or scope frame conflicts with its source. The whole room was not verified."));
    if (this.#reason === null && this.#now() - this.#began >= this.limits.milliseconds) this.#stop("time");
    if (this.#closed && this.#reason === null) this.#stop("cancelled");
    if (this.#reason !== null) stopCommand(failed(`Stopped at ${this.#where.phase}, scope ${this.#where.scope}, input cursor ${JSON.stringify(this.#where.cursor)}: verification ${this.#reason === "cancelled" ? "cancelled" : this.#reason + " limit"}; ${Math.max(0, Math.floor(this.#now() - this.#began))} elapsed ms, ${this.#bytes} received bytes, ${this.#requests} HTTP attempts, ${this.#entries} history entries. The whole room was not verified.`));
  }
  at(phase: Phase, scope: ScopeId | string, cursor: string | number | null = null): void {
    this.check(); this.#where = { phase, scope, cursor };
  }
  progress(completed = false): void {
    this.check(); if (completed) this.#completed++;
    const line = `Verify ${this.#where.phase}: ${this.#where.scope}; input cursor ${JSON.stringify(this.#where.cursor)}; ${this.#completed} replay reports; ${this.#bytes} received bytes; ${this.#requests} HTTP attempts; ${Math.max(0, Math.floor(this.#now() - this.#began))} ms.`;
    this.#options.progress?.(line.length <= 1024 ? line : line.slice(0, 990) + " [progress truncated]");
  }
  entries(count: number): void {
    this.check(); if (count > this.limits.entries - this.#entries) this.#stop("entries"); else this.#entries += count; this.check();
  }
  #invalidEntry(): never {
    this.#invalidSource = true;
    this.#stop("cancelled");
    return stopCommand(failed("Cannot verify history: an entry's content, hash or scope frame conflicts with its source. The whole room was not verified."));
  }
  #entry(scope: ScopeId, entry: Entry, hash: Digest): void {
    this.check();
    if (entry.at.scope !== scope) this.#invalidEntry();
    const frame = canonicalize(entry.at), knownFrame = this.#entryScopes.get(scope);
    if (knownFrame !== undefined && knownFrame !== frame) this.#invalidEntry();
    const position = canonicalize([scope, entry.at.inc, entry.seq]), knownHash = this.#entryHashes.get(position);
    if (knownHash !== undefined) {
      if (knownHash !== hash) this.#invalidEntry();
      return;
    }
    // A duplicate is allowed at the exact ceiling. A new identity is charged
    // before either map retains it. Neither map holds entry bodies or proof.
    this.entries(1);
    this.#entryScopes.set(scope, frame); this.#entryHashes.set(position, hash);
  }
  /** Account for decoded discovery content, without proving its history. */
  sealedEntry(scope: ScopeId, value: unknown): void {
    this.check();
    if (!isSealed(value)) this.#invalidEntry();
    let hash: Digest;
    try { hash = entryHash(value.entry); } catch { this.#invalidEntry(); }
    if (hash !== value.hash) this.#invalidEntry();
    this.#entry(scope, value.entry, hash);
  }
  /** Stored identity uses original bytes, never a canonicalized replacement. */
  storedEntry(scope: ScopeId, at: ScopeRef, value: unknown): void {
    this.check();
    if (!isScopeRef(at) || at.scope !== scope || !isRecord(value)
      || Object.keys(value).length !== 3 || !natural(value["seq"]) || !isDigest(value["hash"]) || typeof value["bytes"] !== "string") this.#invalidEntry();
    const hash = hashOfBytes(value["bytes"]);
    if (hash !== value["hash"]) this.#invalidEntry();
    let entry: unknown;
    try { entry = parseStrict(value["bytes"]); } catch { this.#invalidEntry(); }
    if (canonicalize(entry) !== value["bytes"] || !isEntry(entry)
      || entry.seq !== value["seq"] || canonicalize(entry.at) !== canonicalize(at)) this.#invalidEntry();
    this.#entry(scope, entry, hash);
  }
  historyRead(accounting: "count" | "unique" = "count"): void {
    this.check(); if (accounting === "count" && this.#entries === this.limits.entries) this.#stop("entries");
    if (this.#bytes === this.limits.bytes) this.#stop("bytes"); this.check();
  }
  remaining(): { bytes: number; entries: number; scopes: number } {
    this.check(); return { bytes: this.limits.bytes - this.#bytes, entries: this.limits.entries - this.#entries, scopes: this.limits.requests };
  }
  async wait<T>(action: () => Promise<T>): Promise<T> {
    this.check();
    try {
      const result = await Promise.race([Promise.resolve().then(() => { this.check(); return action(); }).then(value => ({ value })), this.#ended.then(() => null)]);
      this.check(); return result!.value;
    } catch (error) { this.check(); throw error; }
  }
  fetch(send: Fetch): Fetch {
    return async (url, init) => {
      this.check();
      if (this.#requests === this.limits.requests) this.#stop("requests");
      this.check(); this.#requests++;
      const parsed = new URL(url), scope = /\/v1\/scopes\/([^/]+)/.exec(parsed.pathname)?.[1];
      if (scope) this.#where = { ...this.#where, scope, cursor: parsed.searchParams.get("cursor") };
      const prior = init?.signal as AbortSignal | undefined;
      const signal = prior ? AbortSignal.any([prior, this.#abort.signal]) : this.#abort.signal;
      const response = await this.wait(() => send(url, { ...init, signal: signal as never }));
      const body = response.body;
      if (!body) return response;
      const wrapped = { getReader: () => {
        this.check(); const reader = body.getReader();
        const cancel = () => { try { void reader.cancel().catch(() => undefined); } catch { /* Owner may ignore cancellation. */ } };
        this.#abort.signal.addEventListener("abort", cancel, { once: true });
        return {
          read: async () => {
            const result = await this.wait(() => reader.read());
            if (result.done) this.#abort.signal.removeEventListener("abort", cancel);
            else if (result.value) {
              // Count received bytes truthfully, including the one rejected
              // chunk; it is cancelled and never returned for decoding.
              this.#bytes += result.value.byteLength;
              if (this.#bytes > this.limits.bytes) { this.#stop("bytes"); cancel(); }
            }
            this.check(); return result;
          },
          cancel: async () => { this.#abort.signal.removeEventListener("abort", cancel); return reader.cancel(); },
        };
      } };
      // Preserve native Response metadata getters (not enumerable own fields),
      // including the advisory retry header consumed by session acquisition.
      return new Proxy(response, { get: (target, property) => property === "body" ? wrapped : Reflect.get(target, property, target) });
    };
  }
  close(): void { clearTimeout(this.#timer); this.#options.signal?.removeEventListener("abort", this.#cancel); this.#closed = true; this.#entryHashes.clear(); this.#entryScopes.clear(); }
}
