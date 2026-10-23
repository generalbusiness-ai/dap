/** Portable archive adaptation. The trusted read port owns object parsing
 * and I/O. This module imports neither Git nor Node and changes no judge. */
import { natural } from "@generalbusiness/dap-bytes";
import { DOMAINS, type Digest, type Entry, type FactRef, type Head, type PlatformDefinition, type RetainedInput, type ScopeId, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isDigest, isEntry, isFactRef, isScopeId, platformName, rawRetainedJSON, utf8 } from "@generalbusiness/dap-bytes";
import { PAGE_ENTRIES, PAGE_REPLY_BYTES, READ_SECONDS, RETAINED_REPLY_BYTES, type Allow, type HistorySource, type Page, type Stored, type TextOmission, type Unread, type FloorCommitRead } from "./source.ts";
import { LIMITS, SourceError, TRUSTS, verify, type Limits, type Options, type PublishedAnchorPolicy, type Verification } from "./verify.ts";

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
export interface ArchiveLocation { readonly scope?: ScopeId; readonly ref?: string; readonly commit?: string; readonly object?: string; readonly path?: string;
  readonly anchor?: FactRef; readonly range?: { readonly from: number; readonly through: number; readonly legacy?: true } }
export type ArchiveFailureKind = "mismatch" | "refused" | "unavailable" | "timeout" | "limit" | "not-found" | "anchors-unpublished" | "anchor-unneeded";
export interface ArchiveFailure { readonly ok: false; readonly result: ArchiveFailureKind; readonly reason: string; readonly location: ArchiveLocation }
export interface ArchiveData {
  readonly scope: ScopeRef; readonly head: Head; readonly format: "sha1" | "sha256"; readonly commit: string;
  readonly name: string | null;
  /** Reader-validated published lists; these are never trusted by default. */
  readonly publishedAnchors?: readonly FactRef[];
  readonly anchorRanges?: readonly { readonly from: number; readonly through: number; readonly anchors: readonly FactRef[]; readonly legacy?: true }[];
  readonly anchorCoverage?: {
    readonly covered: boolean;
    readonly unpublished: readonly { readonly commit: string; readonly from: number; readonly through: number }[];
    readonly legacy: readonly { readonly pass: number; readonly commit: string; readonly from: number; readonly through: number }[];
  };
  readonly entries: readonly Stored[];
  readonly retained: readonly RetainedInput[];
  /** Archive-declared classifier basis; no source-history proof is implied. */
  readonly foreignSources?: readonly { readonly at: ScopeRef; readonly pin: Digest | PlatformDefinition }[];
  /** Canonical retained JSON byte counts; no decoded text or field bound. */
  readonly omittedTexts?: readonly { readonly digest: Digest; readonly bytes: number; readonly first: { readonly scope: ScopeId; readonly seq: number } }[];
}
export type ArchiveRead = { readonly ok: true; readonly archive: ArchiveData } | ArchiveFailure;
export interface ArchiveReadPort {
  /** Read the exact local commit named by a floor, without fetching it. */
  floorReceipt?(scope: ScopeId, commit: string, work: ArchiveReadWork): Promise<Omit<Extract<FloorCommitRead, { ok: true }>, "bytes"> | Unread>;
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
export interface ArchiveVerifyOptions extends Options {
  readonly receipt?: { readonly fact: FactRef }; readonly requirePublishedAnchors?: boolean;
  /** Explicit opt-in only. Each published list is scoped to its own pass
   * or legacy prefix; caller anchors alone do not enable this policy. */
  readonly trustPublishedAnchors?: boolean;
}
export type ArchivePublications = { readonly ok: true; readonly archives: readonly ArchiveDescriptor[]; readonly anchors: readonly FactRef[]; readonly coverage: readonly { readonly scope: ScopeId; readonly coverage: NonNullable<ArchiveData["anchorCoverage"]> }[] } | ArchiveFailure;
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
  /** Populated from each actual validated snapshot before page/retained
   * returns to the verifier; this map grants no trust by itself. */
  readonly publications = new Map<ScopeId, PublishedAnchorPolicy>();
  readonly #opened = new Map<ScopeId, Promise<ArchiveRead>>();
  readonly #receiptScopes = new Set<ScopeId>();
  readonly #receipts = new Map<string, Promise<Omit<Extract<FloorCommitRead, { ok: true }>, "bytes"> | Unread>>();
  readonly #anchors = new Set<string>();
  readonly #anchorScopes = new Set<ScopeId>();
  readonly #privateNames = new Map<ScopeId, ReadonlyMap<string, string>>();
  readonly #omissionRows = new Map<ScopeId, ReadonlyMap<Digest, TextOmission>>();
  failure: ArchiveFailure | null = null;
  readonly port: ArchiveReadPort;
  readonly work: Work;
  readonly texts: ArchiveTextPort | undefined;
  readonly published: boolean;
  constructor(port: ArchiveReadPort, work: Work, texts?: ArchiveTextPort, anchors?: Options["anchors"], published = false) {
    this.published = published;
    this.port = port; this.work = work; this.texts = texts;
    for (const anchor of anchors ?? []) {
      work.spend({ metadata: 256, inputWork: 512 });
      this.#anchors.add(canonicalize([anchor.scope, anchor.seq, anchor.hash])); this.#anchorScopes.add(anchor.scope);
    }
  }
  /** An exact caller anchor already leaves the retained definition name
   * on trust. Only this commissioned native private cohort can use its
   * descriptive archive basis; this proves no birth or source history. */
  #anchoredPrivateName(archive: ArchiveData, entry: Entry, size: number): string | null {
    if (!this.#anchorScopes.has(entry.at.scope)) return null;
    this.work.spend({ inputWork: size * 8 + 512 });
    if (!this.#anchors.has(canonicalize([entry.at.scope, entry.seq, entryHash(entry)]))) return null;
    let names = this.#privateNames.get(archive.scope.scope);
    if (!names) {
      const selected = new Map<string, string>();
      for (const source of archive.foreignSources ?? []) {
        this.work.spend({ metadata: 256, inputWork: 512 });
        if (!this.#anchorScopes.has(source.at.scope)) continue;
        if (source.pin === "platform:membership@8" && source.at.kind === "membership"
          || source.pin === "platform:register@17" && source.at.kind === "register") selected.set(canonicalize(source.at), platformName(source.pin));
      }
      names = selected; this.#privateNames.set(archive.scope.scope, names);
    }
    return names.get(canonicalize(entry.at)) ?? null;
  }
  async open(scope: ScopeId): Promise<ArchiveRead> {
    if (this.failure) return this.failure;
    let pending = this.#opened.get(scope);
    if (!pending) {
      pending = (async () => {
        try {
          this.work.check();
          const read = await this.work.wait(() => this.port.open(scope, this.work));
          if (!read.ok && read.result !== "not-found") this.failure ??= read;
          if (read.ok && this.published) {
            if (read.archive.scope.scope !== scope) throw new Stopped("unavailable");
            // Existing per-anchor reader metadata pays for consultation
            // marks. Pay this additional scope-map record before it exists.
            this.work.spend({ metadata: 128, inputWork: 256 });
            this.publications.set(scope, Object.freeze({ scope, commit: read.archive.commit,
              ranges: read.archive.anchorCoverage?.covered ? read.archive.anchorRanges ?? [] : [] }));
          }
          return read;
        } catch (error) { const failed = readFailure(error, scope); this.failure ??= failed; return failed; }
      })();
      this.#opened.set(scope, pending);
    }
    return pending;
  }
  async floorReceipt(scope: ScopeId, commit: string, allow: Pick<Allow, "bytes">): Promise<FloorCommitRead> {
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(commit) || !natural(allow.bytes)) return unread("floor-commit-mismatch");
    const key = canonicalize([scope, commit]);
    let pending = this.#receipts.get(key);
    if (!pending) {
      // Reading another immutable commit of an already opened scope is
      // physical work, but does not open a new scope in the traversal.
      const receiptWork: ArchiveReadWork = {
        check: () => this.work.check(), spend: cost => this.work.spend(cost),
        wait: action => this.work.wait(action), admitted: () => this.work.admitted(),
        bytes: size => this.work.bytes(size), remainingMilliseconds: () => this.work.remainingMilliseconds(),
        scope: () => { this.work.check(); if (!this.#opened.has(scope) && !this.#receiptScopes.has(scope)) { this.work.scope(); this.#receiptScopes.add(scope); } },
      };
      pending = this.port.floorReceipt ? this.work.wait(() => this.port.floorReceipt!(scope, commit, receiptWork)) : (async () => {
        const opened = await this.open(scope);
        return opened.ok && opened.archive.commit === commit ? { ok: true as const, scope: opened.archive.scope, through: opened.archive.head } : unread("floor-commit-missing");
      })();
      this.#receipts.set(key, pending);
    }
    const proof = await pending;
    if (!proof.ok) return proof;
    const bytes = utf8(canonicalize(proof)).length;
    this.work.spend({ metadata: bytes, inputWork: bytes });
    return bytes > allow.bytes ? unread("too-large") : { ...proof, bytes };
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
  #omissions(archive: ArchiveData): ReadonlyMap<Digest, TextOmission> | null {
    const prior = this.#omissionRows.get(archive.scope.scope); if (prior) return prior;
    const selected = new Map<Digest, TextOmission>();
    for (const row of archive.omittedTexts ?? []) {
      this.work.spend({ metadata: 512, inputWork: 1024 });
      const entry = row.first && archive.entries[row.first.seq];
      if (!isDigest(row.digest) || !natural(row.bytes) || row.bytes < 2 || !row.first || row.first.scope !== archive.scope.scope
        || !natural(row.first.seq) || !entry || entry.seq !== row.first.seq || !isDigest(entry.hash)) {
        this.failure ??= { ok: false, result: "refused", reason: "invalid text omission metadata", location: { scope: archive.scope.scope } }; return null;
      }
      const known = selected.get(row.digest);
      if (known && known.bytes !== row.bytes) {
        this.failure ??= { ok: false, result: "mismatch", reason: "conflicting text omission byte counts", location: { scope: archive.scope.scope } }; return null;
      }
      if (!known || known.first.seq > row.first.seq) selected.set(row.digest, Object.freeze({ digest: row.digest, bytes: row.bytes,
        first: Object.freeze({ at: Object.freeze({ ...archive.scope }), seq: row.first.seq, hash: entry.hash }) }));
    }
    this.#omissionRows.set(archive.scope.scope, selected); return selected;
  }
  async omittedText(scope: ScopeId, digest: Digest, allow: Pick<Allow, "bytes">): Promise<{ ok: true; omission: TextOmission; bytes: number } | Unread> {
    const read = await this.open(scope); if (!read.ok) return unread(read.result);
    if (!isDigest(digest) || !natural(allow.bytes)) return unread("unavailable");
    const rows = this.#omissions(read.archive); if (!rows) return unread("refused");
    const omission = rows.get(digest); if (!omission) return unread("not-found");
    this.work.spend({ metadata: 1024, inputWork: 8192 });
    const bytes = utf8(canonicalize(omission)).length;
    if (bytes > Math.min(1024, allow.bytes)) return unread("too-large");
    return { ok: true, omission, bytes };
  }
  async retained(scope: ScopeId, kind: RetainedInput["kind"], digest: Digest, allow: Pick<Allow, "bytes">, domain?: string): Promise<{ ok: true; input: RetainedInput; bytes: number } | Unread> {
    const read = await this.open(scope); if (!read.ok) return unread(read.result);
    const maximum = Math.min(allow.bytes, RETAINED_REPLY_BYTES);
    if (!natural(maximum) || !isDigest(digest)) return unread("unavailable");
    let input = read.archive.retained.find(input => input.kind === kind && input.digest === digest && (kind !== "value" || input.domain === domain));
    const omissions = this.#omissions(read.archive); if (!omissions) return unread("refused");
    if (!input && this.texts && !omissions.has(digest) && (kind === "text" || kind === "value" && domain === DOMAINS.text)) {
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
        const anchored = this.#anchoredPrivateName(read.archive, entry, size);
        if (anchored !== null) input = { ...input, under: anchored };
        else {
          const foreign = await this.open(entry.at.scope);
          if (foreign.ok && foreign.archive.name !== null) input = { ...input, under: foreign.archive.name };
          else if (!foreign.ok && foreign.result !== "not-found") return unread(foreign.result);
        }
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
  return { ...native, report: { ...native.report, trusts } };
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
  #session(limits?: Partial<Limits>, anchors?: Options["anchors"], published = false): Session { return new Session(this.port, new Work({ ...LIMITS, ...this.#options.limits, ...limits }, this.#options.seconds), this.#options.texts, anchors, published); }
  #default(): Session { return this.#direct ??= this.#session(); }
  floorReceipt(scope: ScopeId, commit: string, allow: Pick<Allow, "bytes">): Promise<FloorCommitRead> { return this.#default().floorReceipt(scope, commit, allow); }
  page(scope: ScopeId, from: number, allow: Allow): ReturnType<HistorySource["page"]> { return this.#default().page(scope, from, allow); }
  retained(scope: ScopeId, kind: RetainedInput["kind"], digest: Digest, allow: Pick<Allow, "bytes">, domain?: string): ReturnType<HistorySource["retained"]> { return this.#default().retained(scope, kind, digest, allow, domain); }
  omittedText(scope: ScopeId, digest: Digest, allow: Pick<Allow, "bytes">): ReturnType<NonNullable<HistorySource["omittedText"]>> { return this.#default().omittedText(scope, digest, allow); }
  /** Inspect every named immutable snapshot under one original read budget.
   * Returning published facts does not grant them authority. */
  async publications(scopes: readonly ScopeId[]): Promise<ArchivePublications> {
    const session = this.#session();
    let outcome: ArchivePublications;
    try {
      const archives: ArchiveDescriptor[] = [], anchors = new Map<string, FactRef>();
      const coverage: Extract<ArchivePublications, { ok: true }>["coverage"][number][] = [];
      if (!scopes.length || new Set(scopes).size !== scopes.length || scopes.some(scope => !isScopeId(scope))) throw new Stopped("unavailable");
      for (const scope of scopes) {
        const read = await session.open(scope);
        if (!read.ok) { outcome = read; return outcome; }
        const a = read.archive;
        if (!a.anchorCoverage?.covered || !a.publishedAnchors) return { ok: false, result: "anchors-unpublished", reason: "archive passes have no complete published anchor coverage", location: { scope, commit: a.anchorCoverage?.unpublished[0]?.commit ?? a.commit } };
        archives.push({ scope: a.scope, head: a.head, format: a.format, commit: a.commit });
        coverage.push({ scope, coverage: a.anchorCoverage });
        for (const fact of a.publishedAnchors) {
          // A full source reference includes its incarnation. This operator
          // refuses contradictory publications; the generic caller-anchor
          // verifier keeps its existing explicit caller-word semantics.
          const key = canonicalize([fact.at, fact.seq]), previous = anchors.get(key);
          if (previous && previous.hash !== fact.hash) return { ok: false, result: "mismatch", reason: "published anchor lists contradict one full source reference and position", location: { scope, commit: a.commit } };
          anchors.set(key, fact);
        }
      }
      const publicScopes = new Set(archives.map(archive => archive.scope.scope));
      if ([...anchors.values()].some(fact => publicScopes.has(fact.at.scope))) return { ok: false, result: "mismatch", reason: "published anchor names a journal in the public archive set", location: {} };
      const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
      const published = [...anchors.values()].sort((a, b) => compare(a.at.scope, b.at.scope) || a.seq - b.seq || compare(canonicalize(a.at), canonicalize(b.at)));
      outcome = { ok: true, archives, anchors: published, coverage };
    } catch (error) { outcome = readFailure(error, scopes[0]!); }
    finally { await session.settle(); }
    return outcome;
  }
  async verify(options: ArchiveVerifyOptions): Promise<ArchiveVerification> {
    let session: Session | null = null, native: Verification | undefined, outcome: ArchiveVerification;
    const scope = options.scope;
    try {
      if (!isScopeId(scope) || !["integrity", "replay"].includes(options.mode)) throw new Stopped("unavailable");
      if (options.head && (!natural(options.head.seq) || !isDigest(options.head.hash))) throw new Stopped("unavailable");
      if (options.receipt && !isFactRef(options.receipt.fact)) throw new Stopped("unavailable");
      const fact = options.receipt ? { ...options.receipt.fact, at: { ...options.receipt.fact.at } } : null;
      session = this.#session(options.limits, options.anchors, options.trustPublishedAnchors === true);
      const read = await session.open(scope);
      if (!read.ok) outcome = { kind: "archive-failure", ...read, read: session.work.stats() };
      else if (options.requirePublishedAnchors && !read.archive.anchorCoverage?.covered) outcome = { kind: "archive-failure", result: "anchors-unpublished", reason: "archive passes have no complete published anchor coverage", location: { scope, commit: read.archive.anchorCoverage?.unpublished[0]?.commit ?? read.archive.commit }, read: session.work.stats() };
      else {
        const selectedHead = options.head === undefined;
        const head = options.head ? { ...options.head } : read.archive.head;
        // Integrity does not consult authority/dependency proofs, so it
        // cannot establish exact-list acceptance under the trust option.
        if (options.trustPublishedAnchors && (options.mode !== "replay" || !read.archive.anchorRanges)) throw new Stopped("unavailable");
        const asked = { ...options, head, ...(options.trustPublishedAnchors ? {
          publishedAnchorPolicies: session.publications,
        } : {}) };
        let integrity: Verification | undefined;
        if (fact) integrity = provenance(await verify(session, { ...asked, mode: "integrity" }), selectedHead);
        native = integrity && options.mode === "integrity" ? integrity : provenance(await verify(session, asked), selectedHead);
        session.work.check();
        if (session.failure) outcome = { kind: "archive-failure", ...session.failure, read: session.work.stats(), native };
        else if (native.unusedPublishedAnchors?.length) {
          const unused = native.unusedPublishedAnchors[0]!;
          outcome = { kind: "archive-failure", result: "anchor-unneeded", reason: "a published anchor was not consulted by replay of its range",
            location: { scope: unused.scope, commit: unused.commit, anchor: unused.fact,
              range: { from: unused.from, through: unused.through, ...(unused.legacy ? { legacy: true as const } : {}) } },
            read: session.work.stats(), native };
        } else outcome = { kind: "verification", archive: { scope: read.archive.scope, head: read.archive.head, format: read.archive.format, commit: read.archive.commit }, verification: native, ...(integrity ? { integrity } : {}), ...(fact && integrity ? { receipt: receiptResult(fact, read.archive, integrity) } : {}), read: session.work.stats() };
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
