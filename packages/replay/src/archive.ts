/** Portable archive adaptation. The trusted read port owns object parsing
 * and I/O. This module imports neither Git nor Node and changes no judge. */
import { DOMAINS, type Digest, type FactRef, type Head, type PlatformDefinition, type RetainedInput, type ScopeId, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isEntry, isFactRef, isScopeId, rawRetainedJSON, utf8 } from "@generalbusiness/artroom-bytes";
import { PAGE_ENTRIES, PAGE_REPLY_BYTES, READ_SECONDS, RETAINED_REPLY_BYTES, type Allow, type HistorySource, type Page, type Stored, type Unread } from "./source.ts";
import { LIMITS, SourceError, TRUSTS, verify, type Limits, type Options, type Verification } from "./verify.ts";

export interface ArchiveCost { entries: number; attempts: number; nodes: number; calls: number; metadata: number; inputWork: number }
/** One traversal's original counters and deadline, shared by every scope. */
export interface ArchiveReadWork {
  check(): void;
  spend(cost: Partial<ArchiveCost>): void;
  wait<T>(work: () => Promise<T>): Promise<T>;
  admitted(): ArchiveCost;
  bytes(size: number): void;
  scope(): void;
  remainingMilliseconds(): number;
}
export interface ArchiveLocation { readonly scope?: ScopeId; readonly ref?: string; readonly commit?: string; readonly object?: string; readonly path?: string }
export type ArchiveFailureKind = "mismatch" | "refused" | "unavailable" | "timeout" | "limit" | "not-found";
export interface ArchiveFailure { readonly ok: false; readonly result: ArchiveFailureKind; readonly reason: string; readonly location: ArchiveLocation }
export interface ArchiveData {
  readonly scope: ScopeRef; readonly head: Head; readonly format: "sha1" | "sha256"; readonly commit: string;
  readonly name: string | null;
  readonly entries: readonly Stored[];
  readonly retained: readonly RetainedInput[];
  /** Archive-declared classifier basis; no source-history proof is implied. */
  readonly foreignSources?: readonly { readonly at: ScopeRef; readonly pin: Digest | PlatformDefinition }[];
}
export type ArchiveRead = { readonly ok: true; readonly archive: ArchiveData } | ArchiveFailure;
export interface ArchiveReadPort {
  /** Resolves one immutable current-commit snapshot, with no network fallback. */
  open(scope: ScopeId, work: ArchiveReadWork): Promise<ArchiveRead>;
  /** Waits for already-started owned I/O after a deadline; starts none. */
  settle?(): Promise<void>;
}
export interface ArchiveTextPort {
  /** Raw decoded text, by digest only. The adapter supplies the native JSON
   * string representation. No archive path reaches this caller-selected port. */
  read(digest: Digest, most: number, work: ArchiveReadWork): Promise<{ ok: true; text: string } | Unread>;
  settle?(): Promise<void>;
}
export interface ArchiveSourceOptions { readonly seconds?: number; readonly limits?: Partial<Limits>; readonly texts?: ArchiveTextPort }
export interface ArchiveVerifyOptions extends Options { readonly receipt?: { readonly fact: FactRef } }
export interface ArchiveReadStats { readonly objectBytes: number; readonly scopes: number; readonly cost: Readonly<ArchiveCost> }
export interface ArchiveDescriptor { readonly scope: ScopeRef; readonly head: Head; readonly format: "sha1" | "sha256"; readonly commit: string }
export interface ArchiveReceipt { readonly fact: FactRef; readonly result: "archived" | "behind" | "mismatch" | "unverified"; readonly reason: string | null }
export type ArchiveVerification =
  | { readonly kind: "archive-failure"; readonly result: ArchiveFailureKind; readonly reason: string; readonly location: ArchiveLocation; readonly read: ArchiveReadStats; readonly native?: Verification }
  | { readonly kind: "verification"; readonly archive: ArchiveDescriptor; readonly verification: Verification; readonly integrity?: Verification; readonly receipt?: ArchiveReceipt; readonly read: ArchiveReadStats };

class Stopped extends Error {
  readonly reason: "limit" | "timeout" | "unavailable";
  constructor(reason: "limit" | "timeout" | "unavailable") { super(`archive-${reason}`); this.reason = reason; }
}
const natural = (value: number): boolean => Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
const costKeys: readonly (keyof ArchiveCost)[] = ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"];
class Work implements ArchiveReadWork {
  #stopped: Stopped | null = null;
  #last: number;
  readonly #until: number;
  readonly #cost: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
  readonly #ceilings: ArchiveCost;
  #bytes = 0;
  #scopes = 0;
  readonly limits: Limits;
  constructor(limits: Limits, seconds?: number) {
    this.limits = limits;
    for (const value of Object.values(limits)) if (!natural(value)) throw new Stopped("limit");
    // HTTP bounds one read by READ_SECONDS. Clone validation has at most
    // this many scope reads, plus its own finite per-process deadlines.
    const milliseconds = (seconds ?? READ_SECONDS * Math.max(1, limits.scopes)) * 1000;
    if (!Number.isFinite(milliseconds) || milliseconds <= 0 || milliseconds > 2_147_483_647) throw new Stopped("limit");
    this.#last = Date.now(); this.#until = this.#last + milliseconds;
    this.#ceilings = {
      entries: limits.entries, attempts: limits.entries * 16 + limits.scopes * 32768,
      nodes: limits.entries * 16 + limits.scopes * 8192, calls: limits.entries * 32 + limits.scopes * 65536,
      metadata: limits.bytes * 16 + limits.scopes * 4096, inputWork: limits.bytes * 64 + limits.entries * 4096 + limits.scopes * 4096,
    };
    if (Object.values(this.#ceilings).some(value => !natural(value))) throw new Stopped("limit");
  }
  #stop(reason: Stopped["reason"]): never { this.#stopped ??= new Stopped(reason); throw this.#stopped; }
  check(): void {
    if (this.#stopped) throw this.#stopped;
    const now = Date.now();
    if (!Number.isFinite(now) || now < this.#last) this.#stop("unavailable");
    this.#last = now; if (now >= this.#until) this.#stop("timeout");
  }
  remainingMilliseconds(): number { this.check(); return this.#until - this.#last; }
  spend(cost: Partial<ArchiveCost>): void {
    this.check();
    for (const [key, amount] of Object.entries(cost)) {
      const name = key as keyof ArchiveCost;
      if (!costKeys.includes(name) || !natural(amount) || amount > this.#ceilings[name] - this.#cost[name]) this.#stop("limit");
    }
    for (const [key, amount] of Object.entries(cost)) this.#cost[key as keyof ArchiveCost] += amount;
  }
  bytes(size: number): void { this.check(); if (!natural(size) || size > this.limits.bytes - this.#bytes) this.#stop("limit"); this.#bytes += size; }
  scope(): void { this.check(); if (this.#scopes >= this.limits.scopes) this.#stop("limit"); this.#scopes++; }
  admitted(): ArchiveCost { return { ...this.#cost }; }
  stats(): ArchiveReadStats { return { objectBytes: this.#bytes, scopes: this.#scopes, cost: this.admitted() }; }
  async wait<T>(action: () => Promise<T>): Promise<T> {
    this.check(); let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const expired = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { this.#stopped ??= new Stopped("timeout"); reject(this.#stopped); }, this.remainingMilliseconds()); });
      const value = await Promise.race([action(), expired]); this.check(); return value;
    } catch (error) {
      if (error && typeof error === "object" && "reason" in error && (error.reason === "timeout" || error.reason === "limit" || error.reason === "unavailable")) this.#stop(error.reason);
      return this.#stop("unavailable");
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }
}
const emptyStats = (): ArchiveReadStats => ({ objectBytes: 0, scopes: 0, cost: { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 } });
const unread = (reason: string): Unread => ({ ok: false, reason });
function readFailure(error: unknown, scope: ScopeId): ArchiveFailure {
  const reason = error && typeof error === "object" && "reason" in error ? error.reason : undefined;
  const result = reason === "limit" || reason === "timeout" || reason === "unavailable" ? reason : "unavailable";
  return { ok: false, result, reason: `archive-${result}`, location: { scope } };
}

class Session implements HistorySource {
  readonly #opened = new Map<ScopeId, Promise<ArchiveRead>>();
  failure: ArchiveFailure | null = null;
  readonly port: ArchiveReadPort;
  readonly work: Work;
  readonly texts: ArchiveTextPort | undefined;
  constructor(port: ArchiveReadPort, work: Work, texts?: ArchiveTextPort) { this.port = port; this.work = work; this.texts = texts; }
  async open(scope: ScopeId): Promise<ArchiveRead> {
    if (this.failure) return this.failure;
    let pending = this.#opened.get(scope);
    if (!pending) {
      pending = (async () => {
        try {
          this.work.check();
          const read = await this.work.wait(() => this.port.open(scope, this.work));
          if (!read.ok && read.result !== "not-found") this.failure ??= read;
          return read;
        } catch (error) { const failed = readFailure(error, scope); this.failure ??= failed; return failed; }
      })();
      this.#opened.set(scope, pending);
    }
    return pending;
  }
  async page(scope: ScopeId, from: number, allow: Allow): Promise<{ ok: true; page: Page; bytes: number } | Unread> {
    const read = await this.open(scope); if (!read.ok) return unread(read.result);
    if (!natural(from) || !natural(allow.bytes) || !natural(allow.entries)) return unread("unavailable");
    const maximum = Math.min(allow.bytes, PAGE_REPLY_BYTES), count = Math.min(allow.entries, PAGE_ENTRIES), entries: Stored[] = [];
    let bytes = 0;
    for (let position = from; position < read.archive.entries.length && entries.length < count; position++) {
      this.work.check(); const entry = read.archive.entries[position]!;
      this.work.spend({ inputWork: entry.bytes.length * 3 });
      const size = utf8(entry.bytes).length + (entries.length ? 1 : 0);
      if (size > maximum - bytes) break;
      entries.push(entry); bytes += size;
    }
    if (entries.length === 0 && from < read.archive.entries.length) return unread("too-large");
    const next = from + entries.length < read.archive.entries.length ? from + entries.length : null;
    return { ok: true, page: { scope: read.archive.scope, head: read.archive.head, entries, next }, bytes };
  }
  async retained(scope: ScopeId, kind: RetainedInput["kind"], digest: Digest, allow: Pick<Allow, "bytes">, domain?: string): Promise<{ ok: true; input: RetainedInput; bytes: number } | Unread> {
    const read = await this.open(scope); if (!read.ok) return unread(read.result);
    const maximum = Math.min(allow.bytes, RETAINED_REPLY_BYTES);
    if (!natural(maximum) || !isDigest(digest)) return unread("unavailable");
    let input = read.archive.retained.find(input => input.kind === kind && input.digest === digest && (kind !== "value" || input.domain === domain));
    if (!input && this.texts && (kind === "text" || kind === "value" && domain === DOMAINS.text)) {
      const supplied = await this.work.wait(() => this.texts!.read(digest, maximum, this.work));
      if (!supplied.ok) return supplied;
      if (typeof supplied.text !== "string" || supplied.text.length > maximum) return unread("too-large");
      this.work.spend({ inputWork: supplied.text.length * 8 });
      input = { kind, digest, bytes: canonicalize(supplied.text), ...(kind === "value" ? { domain: domain! } : {}) };
    }
    if (!input) return unread("not-found");
    this.work.spend({ inputWork: input.bytes.length * 3 });
    const size = utf8(input.bytes).length; if (size > maximum) return unread("too-large");
    if (kind === "entry") {
      const entry = rawRetainedJSON(digest, input.bytes);
      if (isEntry(entry)) {
        const foreign = await this.open(entry.at.scope);
        if (foreign.ok && foreign.archive.name !== null) input = { ...input, under: foreign.archive.name };
        else if (!foreign.ok && foreign.result !== "not-found") return unread(foreign.result);
      }
    }
    this.work.check(); return { ok: true, input, bytes: size };
  }
  async settle(): Promise<void> { await Promise.all([this.port.settle?.(), this.texts?.settle?.()]); }
}

export const ARCHIVE_HEAD_TRUST = "archive-head: the resolved archive ref selected the target head; it is not an independent caller pin";
export const ARCHIVE_SOURCE_TRUST = "archive-source: the resolved archive selected each source history replayed; no anchor was given for it";
function provenance(native: Verification, selectedHead: boolean): Verification {
  const trusts = native.report.trusts.map(trust => trust === TRUSTS.head ? ARCHIVE_HEAD_TRUST : trust === TRUSTS.sources ? ARCHIVE_SOURCE_TRUST : trust);
  if (selectedHead && !trusts.includes(ARCHIVE_HEAD_TRUST)) {
    const clock = trusts.indexOf(TRUSTS.clock); trusts.splice(clock < 0 ? 0 : clock + 1, 0, ARCHIVE_HEAD_TRUST);
  }
  return { report: { ...native.report, trusts }, why: native.why };
}
function receiptResult(fact: FactRef, archive: ArchiveData, integrity: Verification): ArchiveReceipt {
  if (integrity.report.result !== "consistent") return { fact, result: "unverified", reason: "archive integrity and continuity did not complete" };
  if (fact.at.scope !== archive.scope.scope || fact.at.inc !== archive.scope.inc || fact.at.kind !== archive.scope.kind) return { fact, result: "mismatch", reason: "receipt names another history" };
  if (fact.seq > archive.head.seq) return { fact, result: "behind", reason: "archive head is below the receipt position" };
  return archive.entries[fact.seq]?.hash === fact.hash ? { fact, result: "archived", reason: null } : { fact, result: "mismatch", reason: "receipt hash differs at its position" };
}

export class ArchiveSource implements HistorySource {
  #direct: Session | null = null;
  readonly #options: ArchiveSourceOptions;
  readonly port: ArchiveReadPort;
  constructor(port: ArchiveReadPort, options: ArchiveSourceOptions = {}) { this.port = port; this.#options = { ...options, ...(options.limits ? { limits: { ...options.limits } } : {}) }; }
  #session(limits?: Partial<Limits>): Session { return new Session(this.port, new Work({ ...LIMITS, ...this.#options.limits, ...limits }, this.#options.seconds), this.#options.texts); }
  #default(): Session { return this.#direct ??= this.#session(); }
  page(scope: ScopeId, from: number, allow: Allow): ReturnType<HistorySource["page"]> { return this.#default().page(scope, from, allow); }
  retained(scope: ScopeId, kind: RetainedInput["kind"], digest: Digest, allow: Pick<Allow, "bytes">, domain?: string): ReturnType<HistorySource["retained"]> { return this.#default().retained(scope, kind, digest, allow, domain); }
  async verify(options: ArchiveVerifyOptions): Promise<ArchiveVerification> {
    let session: Session | null = null, native: Verification | undefined, outcome: ArchiveVerification;
    const scope = options.scope;
    try {
      if (!isScopeId(scope) || !["integrity", "replay"].includes(options.mode)) throw new Stopped("unavailable");
      if (options.head && (!natural(options.head.seq) || !isDigest(options.head.hash))) throw new Stopped("unavailable");
      if (options.receipt && !isFactRef(options.receipt.fact)) throw new Stopped("unavailable");
      const fact = options.receipt ? { ...options.receipt.fact, at: { ...options.receipt.fact.at } } : null;
      session = this.#session(options.limits);
      const read = await session.open(scope);
      if (!read.ok) outcome = { kind: "archive-failure", ...read, read: session.work.stats() };
      else {
        const selectedHead = options.head === undefined;
        const head = options.head ? { ...options.head } : read.archive.head;
        const asked = { ...options, head };
        let integrity: Verification | undefined;
        if (fact) integrity = provenance(await verify(session, { ...asked, mode: "integrity" }), selectedHead);
        native = integrity && options.mode === "integrity" ? integrity : provenance(await verify(session, asked), selectedHead);
        session.work.check();
        if (session.failure) outcome = { kind: "archive-failure", ...session.failure, read: session.work.stats(), native };
        else outcome = { kind: "verification", archive: { scope: read.archive.scope, head: read.archive.head, format: read.archive.format, commit: read.archive.commit }, verification: native, ...(integrity ? { integrity } : {}), ...(fact && integrity ? { receipt: receiptResult(fact, read.archive, integrity) } : {}), read: session.work.stats() };
      }
    } catch (error) {
      const failed = session?.failure ?? readFailure(error instanceof SourceError ? { reason: error.reason ?? "unavailable" } : error, scope);
      outcome = { kind: "archive-failure", ...failed, read: session?.work.stats() ?? emptyStats(), ...(native ? { native } : {}) };
    }
    // A deadline is not a claim that an owned process already exited.
    // The Node port drains its already-started children here before return.
    try { await session?.settle(); }
    catch { outcome = { kind: "archive-failure", result: "unavailable", reason: "archive I/O did not settle", location: { scope }, read: session?.work.stats() ?? emptyStats(), ...(native ? { native } : {}) }; }
    return outcome;
  }
}
export function archiveSource(port: ArchiveReadPort, options: ArchiveSourceOptions = {}): ArchiveSource { return new ArchiveSource(port, options); }
export function verifyArchive(source: ArchiveSource, options: ArchiveVerifyOptions): Promise<ArchiveVerification> { return source.verify(options); }
