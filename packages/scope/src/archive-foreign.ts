/** Direct retained-copy metadata only. No payload body, recursive source
 * history, policy certificate or production admission is supplied here. */
import { natural, same } from "@generalbusiness/dap-bytes";
import { INVITATION_KEY_MEMBERSHIP } from "@generalbusiness/dap-contract";
import type { Bounds, Digest, FactRef, Input, PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isFactRef, platformName } from "@generalbusiness/dap-bytes";
import { platform } from "@generalbusiness/dap-platform";
import { forecastArchiveSourceLookup } from "./archive-source-cost.ts";
import { derivable } from "@generalbusiness/dap-derive";
import { forecastArchiveForeignLookup, forecastArchiveForeignSelection, forecastArchiveForeignBasis, ARCHIVE_FOREIGN_COPY_REQUEST_WORK, ARCHIVE_FOREIGN_COPY_SIZE_METADATA, ARCHIVE_FOREIGN_GENESIS_METADATA, archiveForeignRepeatWork, archiveForeignUseMetadata, type ArchiveForeignColdFootprint } from "./archive-foreign-cost.ts";
import { ArchiveBudget } from "./archive-budget.ts";
import type { ArchiveSupportFootprint } from "./archive-support-cost.ts";
import { archiveEntryHeader, archiveEntryPrivacy, archiveSupportMetadata, collectArchiveSupportMetadata } from "./archive-entry-metadata.ts";
import type { ArchivePolicyRegistry, ReviewedArchivePolicy } from "./archive-inventory.ts";
import { stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";
import type { FixtureArchiveSourcePins, ArchiveSourceBasis, ArchiveSourcePin } from "./archive-source-pins.ts";
import { archiveMembershipCopy, membershipCopyConsumer } from "./archive-membership-copy.ts";
import { sqlJsonText as text, type Sql } from "./sqlite.ts";

export interface ArchiveForeignCopy {
  readonly content: Digest; readonly bytes: number; readonly fact: FactRef;
  readonly pin: Digest | PlatformDefinition; readonly under: string;
}

/** Scalar narrowing only. It grants no source, policy or payload access. */
export interface ArchiveForeignExpectedCopy {
  readonly fact: FactRef; readonly pin: Digest | PlatformDefinition;
  readonly bytes: number; readonly input: Input["type"]; readonly effects: number;
}
export type ArchiveForeignRecordedRequest =
  | { readonly kind: "cold"; readonly content: Digest; readonly copy: Readonly<ArchiveForeignExpectedCopy>;
      readonly declaration: Digest; readonly footprint: Readonly<ArchiveForeignColdFootprint> }
  | { readonly kind: "repeat"; readonly content: Digest; readonly bytes: number };
export interface ArchiveForeignRecordedScan {
  readonly position: Readonly<ArchivePosition>;
  readonly uses: number;
  readonly requests: readonly Readonly<ArchiveForeignRecordedRequest>[];
}
export interface ArchiveForeignObservation {
  readonly record?: true;
  readonly expected?: ReadonlyMap<Digest, Readonly<ArchiveForeignExpectedCopy>>;
}

/** The fixture supplies source pins before this synchronous pass opens.
 * Policy is separate and keyed by exact pin; neither a source name nor a
 * source-pin lookup admits an inline class, owner, record, step or domain. */
export class ArchiveForeignMetadata {
  #lastScan: Readonly<ArchiveForeignRecordedScan> | null = null;
  readonly #copies = new Map<Digest, Readonly<ArchiveForeignCopy>>();
  readonly #facts = new Map<string, Digest>();
  readonly #sources = new Map<string, Readonly<ArchiveSourceBasis>>();
  constructor(readonly sql: Pick<Sql, "exec">, readonly sources: FixtureArchiveSourcePins,
    readonly policies: ArchivePolicyRegistry, readonly bounds: Bounds, readonly budget: ArchiveBudget,
    readonly visitedDeclarations = new Set<Digest>(), readonly consumer?: Digest | PlatformDefinition,
    readonly observation?: ArchiveForeignObservation) {
    if (sources.fixture !== "archive-source-pins") return stop("foreign-source-unavailable");
    budget.check();
    if (observation?.record) budget.spend({ metadata: 256, inputWork: 512 });
  }
  #policy(source: ArchiveSourcePin): { readonly policy: ReviewedArchivePolicy; readonly support?: Readonly<ArchiveSupportFootprint> } {
    const pin = source.pin;
    if (!isDigest(pin) && pin.startsWith("platform:membership@") && pin !== INVITATION_KEY_MEMBERSHIP
      && !(pin === "platform:membership@8" && membershipCopyConsumer(this.consumer))) return stop("unsupported-credential-cohort");
    if (source.staticNative) this.budget.spend(forecastArchiveSourceLookup(null));
    const policy = this.policies.get(pin);
    if (source.staticNative && (isDigest(pin) || !policy || policy.support.definition.declared !== platform(pin)?.data)) return stop("foreign-source-mismatch");
    if (!policy || !policy.review || policy.review.length > 512 || policy.support.named !== pin) return stop("unsupported-archive-cohort");
    if (isDigest(pin) ? policy.support.definition.digest !== pin : policy.support.definition.declared.name !== platformName(pin)) return stop("foreign-source-mismatch");
    // One aggregate declaration ledger includes local closures and foreign
    // policy metadata. Another source with the same declaration adds work,
    // but never a second allowance or a second distinct declaration node.
    const node = policy.support.definition.digest;
    if (!this.visitedDeclarations.has(node)) { this.budget.spend({ nodes: 1 }); this.visitedDeclarations.add(node); }
    if (canonicalize(policy.support.definition.declared) !== source.declaration) return stop("foreign-source-mismatch");
    if (!derivable(policy.support.definition, policy.support.capabilities)) return stop("unsupported-archive-cohort");
    if (this.observation?.record) return { policy, support: collectArchiveSupportMetadata(policy.support, this.budget) };
    archiveSupportMetadata(policy.support, this.budget);
    return { policy };
  }
  #copy(fact: FactRef, content: Digest): Readonly<ArchiveForeignRecordedRequest> | undefined {
    this.budget.spend({ attempts: 1, inputWork: ARCHIVE_FOREIGN_COPY_REQUEST_WORK });
    const expected = this.observation?.expected?.get(content);
    if (this.observation?.expected && (!expected || !same(expected.fact, fact))) return stop("foreign-source-mismatch");
    const prior = this.#copies.get(content);
    if (prior) {
      this.budget.spend({ inputWork: archiveForeignRepeatWork(prior.bytes) });
      if (!same(prior.fact, fact)) return stop("foreign-source-mismatch");
      if (!this.observation?.record) return;
      this.budget.spend({ metadata: 128, inputWork: 256 });
      return Object.freeze({ kind: "repeat", content, bytes: prior.bytes });
    }
    const key = canonicalize(fact), priorContent = this.#facts.get(key);
    if (priorContent !== undefined && priorContent !== content) return stop("foreign-source-mismatch");
    const sizes = this.budget.native(this.sql, () => ({ metadata: ARCHIVE_FOREIGN_COPY_SIZE_METADATA, inputWork: 0 })).exec("SELECT octet_length(bytes) AS size, typeof(bytes) AS type FROM retained_input WHERE kind = 'entry' AND digest = ? LIMIT 1", content).toArray();
    if (sizes.length === 0) return stop("incomplete");
    const size = sizes[0]?.["size"];
    if (sizes.length !== 1 || sizes[0]?.["type"] !== "text" || !natural(size) || size === 0) return stop("unavailable");
    if (size > this.bounds.entryBytes) return stop("limit");
    if (expected && expected.bytes !== size) return stop("foreign-source-mismatch");
    const location = { kind: "copy" as const, content, bytes: size }, header = archiveEntryHeader(this.sql, location, this.budget);
    if (expected && (expected.input !== header.input || expected.effects !== header.effects)) return stop("foreign-source-mismatch");
    if (!same(header.at, fact.at) || header.seq !== fact.seq) return stop("foreign-source-mismatch");
    const source = this.sources.get(header.at, this.budget);
    if (!source) return stop("foreign-source-unavailable");
    if (expected && expected.pin !== source.pin) return stop("foreign-source-mismatch");
    const admitted = this.#policy(source), policy = admitted.policy;
    if (source.pin === "platform:membership@8") archiveMembershipCopy(this.sql, content, size, header, this.consumer, this.budget);
    if (!policy.entryTypes.has(header.input)) return stop("unsupported-archive-cohort");
    if (header.uses > this.bounds.usesPerEntry) return stop("limit");
    if (header.seq === 0) {
      if (fact.hash !== source.genesis) return stop("foreign-source-mismatch");
      const rows = this.budget.native(this.sql, () => ({ metadata: ARCHIVE_FOREIGN_GENESIS_METADATA, inputWork: 0 })).exec(`SELECT ${text("$.input.seed.definition", 128)} AS pin, ${text("$.input.inc", 64)} AS inc, ${text("$.input.seed.kind", 16)} AS kind FROM retained_input WHERE kind = 'entry' AND digest = ? AND octet_length(bytes) = ? LIMIT 1`, content, size).toArray();
      if (rows.length !== 1 || rows[0]?.["pin"] !== source.pin || rows[0]?.["inc"] !== source.at.inc || rows[0]?.["kind"] !== source.at.kind) return stop("foreign-source-mismatch");
    }
    archiveEntryPrivacy(this.sql, location, header, policy.support, this.budget);
    const name = canonicalize(source.at), previous = this.#sources.get(name);
    if (previous && previous.pin !== source.pin) return stop("foreign-source-mismatch");
    const at = Object.freeze({ ...fact.at }), boundFact = Object.freeze({ at, seq: fact.seq, hash: fact.hash });
    this.#sources.set(name, Object.freeze({ at, pin: source.pin }));
    this.#copies.set(content, Object.freeze({ content, bytes: size, fact: boundFact, pin: source.pin, under: policy.support.definition.declared.name }));
    this.#facts.set(key, content);
    if (!this.observation?.record) return;
    this.budget.spend({ metadata: 512, inputWork: 1024 });
    // Retain the original post-privacy recording charge. The complete support
    // walk already ran for THIS cold copy at its original admission point.
    this.budget.spend({ metadata: 128, inputWork: 256 });
    const support = admitted.support;
    if (!support) return stop("unavailable");
    const copy = Object.freeze({ fact: boundFact, pin: source.pin, bytes: size, input: header.input, effects: header.effects });
    const footprint = Object.freeze({ bytes: size, input: header.input, effects: header.effects,
      declarationUnits: source.declaration.length, support, ...(source.staticNative ? { staticNative: true } : {}), membership8: source.pin === "platform:membership@8" });
    return Object.freeze({ kind: "cold", content, copy, declaration: policy.support.definition.digest, footprint });
  }
  /** Only the selected local entry's direct uses. The copied entry's own
   * uses are not recursively fetched or added to this archive. */
  scan(position: ArchivePosition, count: number): void {
    this.budget.check();
    if (this.observation?.record) this.#lastScan = null;
    if (!natural(count) || count > this.bounds.usesPerEntry) return stop("limit");
    if (this.observation?.record) this.budget.spend({ metadata: 256, inputWork: 512 });
    const recorded: Readonly<ArchiveForeignRecordedRequest>[] | undefined = this.observation?.record ? [] : undefined;
    const rows = this.budget.native(this.sql, () => ({ metadata: archiveForeignUseMetadata(count), inputWork: 0 })).exec(`SELECT ${text("$.fact.at.scope", 71, "value")} AS scope, ${text("$.fact.at.inc", 64, "value")} AS inc, ${text("$.fact.at.kind", 16, "value")} AS kind, json_extract(value, '$.fact.seq') AS seq, ${text("$.fact.hash", 71, "value")} AS hash, ${text("$.content", 71, "value")} AS content FROM entry, json_each(entry.bytes, '$.uses') WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND octet_length(entry.bytes) = ? LIMIT ?`, position.seq, position.hash, position.bytes, position.bytes, count + 1).toArray();
    if (rows.length !== count) return stop("unavailable");
    for (const row of rows) {
      const fact = { at: { scope: row["scope"], inc: row["inc"], kind: row["kind"] }, seq: row["seq"], hash: row["hash"] };
      if (!isFactRef(fact) || !isDigest(row["content"])) return stop("foreign-source-unavailable");
      const request = this.#copy(fact, row["content"]);
      if (recorded && request) recorded.push(request);
    }
    this.budget.check();
    if (recorded) {
      if (recorded.length !== count) return stop("unavailable");
      this.#lastScan = Object.freeze({ position: Object.freeze({ seq: position.seq, hash: position.hash, bytes: position.bytes }),
        uses: count, requests: Object.freeze(recorded) });
    }
  }
  /** The caller retains this immutable scalar result before closing its
   * native frame. No SQL port, owner function, body or admission escapes.
   * A failed/newer scan cannot be mistaken for the requested position. */
  recorded(position: ArchivePosition): Readonly<ArchiveForeignRecordedScan> {
    this.budget.spend({ metadata: 128, inputWork: 256 });
    const held = this.#lastScan;
    if (!this.observation?.record || !held || held.position.seq !== position.seq
      || held.position.hash !== position.hash || held.position.bytes !== position.bytes) return stop("unavailable");
    return held;
  }
  get(content: Digest): Readonly<ArchiveForeignCopy> | null {
    this.budget.spend(forecastArchiveForeignLookup());
    return this.#copies.get(content) ?? null;
  }
  source(fact: FactRef): Readonly<ArchiveForeignCopy> | null {
    this.budget.spend(forecastArchiveForeignLookup());
    const content = this.#facts.get(canonicalize(fact));
    return content === undefined ? null : this.#copies.get(content) ?? null;
  }
  selection(): readonly Readonly<ArchiveForeignCopy>[] {
    this.budget.spend(forecastArchiveForeignSelection(this.#copies.size));
    return Object.freeze([...this.#copies.values()]);
  }
  basis(): readonly Readonly<ArchiveSourceBasis>[] {
    this.budget.spend(forecastArchiveForeignBasis(this.#sources.size));
    const rows = [...this.#sources.values()].map(source => ({ source, key: canonicalize(source.at) }));
    rows.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    return Object.freeze(rows.map(row => row.source));
  }
}
