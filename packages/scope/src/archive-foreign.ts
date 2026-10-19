/** Direct retained-copy metadata only. No payload body, recursive source
 * history, policy certificate or production admission is supplied here. */
import { INVITATION_KEY_MEMBERSHIP } from "@generalbusiness/dap-contract";
import type { Bounds, Digest, FactRef, PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isFactRef, platformName } from "@generalbusiness/artroom-bytes";
import { derivable } from "@generalbusiness/dap-derive";
import { ArchiveBudget } from "./archive-budget.ts";
import { archiveEntryHeader, archiveEntryPrivacy, archiveMetadataText, archiveSupportMetadata } from "./archive-entry-metadata.ts";
import type { ArchivePolicyRegistry, ReviewedArchivePolicy } from "./archive-inventory.ts";
import { ArchivePrefixStopped, type ArchivePosition, type ArchivePrefixReason } from "./archive-prefix.ts";
import type { FixtureArchiveSourcePins, ArchiveSourceBasis, ArchiveSourcePin } from "./archive-source-pins.ts";
import type { Sql } from "./sqlite.ts";

export interface ArchiveForeignCopy {
  readonly content: Digest; readonly bytes: number; readonly fact: FactRef;
  readonly pin: Digest | PlatformDefinition; readonly under: string;
}
const same = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
const natural = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && !Object.is(v, -0);
const stop = (reason: ArchivePrefixReason): never => { throw new ArchivePrefixStopped(reason); };
const text = archiveMetadataText;

/** The fixture supplies source pins before this synchronous pass opens.
 * Policy is separate and keyed by exact pin; neither a source name nor a
 * source-pin lookup admits an inline class, owner, record, step or domain. */
export class ArchiveForeignMetadata {
  readonly #copies = new Map<Digest, Readonly<ArchiveForeignCopy>>();
  readonly #facts = new Map<string, Digest>();
  readonly #sources = new Map<string, Readonly<ArchiveSourceBasis>>();
  constructor(readonly sql: Pick<Sql, "exec">, readonly sources: FixtureArchiveSourcePins,
    readonly policies: ArchivePolicyRegistry, readonly bounds: Bounds, readonly budget: ArchiveBudget) {
    if (sources.fixture !== "archive-source-pins") return stop("foreign-source-unavailable");
    budget.check();
  }
  #policy(source: ArchiveSourcePin): ReviewedArchivePolicy {
    const pin = source.pin;
    if (!isDigest(pin) && pin.startsWith("platform:membership@") && pin !== INVITATION_KEY_MEMBERSHIP) return stop("unsupported-credential-cohort");
    const policy = this.policies.get(pin);
    if (!policy || !policy.review || policy.review.length > 512 || policy.support.named !== pin) return stop("unsupported-archive-cohort");
    if (isDigest(pin) ? policy.support.definition.digest !== pin : policy.support.definition.declared.name !== platformName(pin)) return stop("foreign-source-mismatch");
    if (canonicalize(policy.support.definition.declared) !== source.declaration) return stop("foreign-source-mismatch");
    if (!derivable(policy.support.definition, policy.support.capabilities)) return stop("unsupported-archive-cohort");
    archiveSupportMetadata(policy.support, this.budget);
    return policy;
  }
  #copy(fact: FactRef, content: Digest): void {
    this.budget.spend({ attempts: 1, inputWork: 512 });
    const prior = this.#copies.get(content);
    if (prior) {
      this.budget.spend({ inputWork: prior.bytes * 64 });
      if (!same(prior.fact, fact)) return stop("foreign-source-mismatch");
      return;
    }
    const key = canonicalize(fact), priorContent = this.#facts.get(key);
    if (priorContent !== undefined && priorContent !== content) return stop("foreign-source-mismatch");
    const sizes = this.budget.native(this.sql, () => ({ metadata: 128, inputWork: 0 })).exec("SELECT octet_length(bytes) AS size, typeof(bytes) AS type FROM retained_input WHERE kind = 'entry' AND digest = ? LIMIT 1", content).toArray();
    if (sizes.length === 0) return stop("incomplete");
    const size = sizes[0]?.["size"];
    if (sizes.length !== 1 || sizes[0]?.["type"] !== "text" || !natural(size) || size === 0) return stop("unavailable");
    if (size > this.bounds.entryBytes) return stop("limit");
    const location = { kind: "copy" as const, content, bytes: size }, header = archiveEntryHeader(this.sql, location, this.budget);
    if (!same(header.at, fact.at) || header.seq !== fact.seq) return stop("foreign-source-mismatch");
    const source = this.sources.get(header.at, this.budget);
    if (!source) return stop("foreign-source-unavailable");
    const policy = this.#policy(source);
    if (!policy.entryTypes.has(header.input)) return stop("unsupported-archive-cohort");
    if (header.uses > this.bounds.usesPerEntry) return stop("limit");
    if (header.seq === 0) {
      if (fact.hash !== source.genesis) return stop("foreign-source-mismatch");
      const rows = this.budget.native(this.sql, () => ({ metadata: 512, inputWork: 0 })).exec(`SELECT ${text("$.input.seed.definition", 128)} AS pin, ${text("$.input.inc", 64)} AS inc, ${text("$.input.seed.kind", 16)} AS kind FROM retained_input WHERE kind = 'entry' AND digest = ? AND octet_length(bytes) = ? LIMIT 1`, content, size).toArray();
      if (rows.length !== 1 || rows[0]?.["pin"] !== source.pin || rows[0]?.["inc"] !== source.at.inc || rows[0]?.["kind"] !== source.at.kind) return stop("foreign-source-mismatch");
    }
    archiveEntryPrivacy(this.sql, location, header, policy.support, this.budget);
    const name = canonicalize(source.at), previous = this.#sources.get(name);
    if (previous && previous.pin !== source.pin) return stop("foreign-source-mismatch");
    const at = Object.freeze({ ...fact.at }), boundFact = Object.freeze({ at, seq: fact.seq, hash: fact.hash });
    this.#sources.set(name, Object.freeze({ at, pin: source.pin }));
    this.#copies.set(content, Object.freeze({ content, bytes: size, fact: boundFact, pin: source.pin, under: policy.support.definition.declared.name }));
    this.#facts.set(key, content);
  }
  /** Only the selected local entry's direct uses. The copied entry's own
   * uses are not recursively fetched or added to this archive. */
  scan(position: ArchivePosition, count: number): void {
    this.budget.check();
    if (!natural(count) || count > this.bounds.usesPerEntry) return stop("limit");
    const rows = this.budget.native(this.sql, () => ({ metadata: (count + 1) * 768, inputWork: 0 })).exec(`SELECT ${text("$.fact.at.scope", 71, "value")} AS scope, ${text("$.fact.at.inc", 64, "value")} AS inc, ${text("$.fact.at.kind", 16, "value")} AS kind, json_extract(value, '$.fact.seq') AS seq, ${text("$.fact.hash", 71, "value")} AS hash, ${text("$.content", 71, "value")} AS content FROM entry, json_each(entry.bytes, '$.uses') WHERE entry.seq = ? AND entry.hash = ? AND entry.size = ? AND octet_length(entry.bytes) = ? LIMIT ?`, position.seq, position.hash, position.bytes, position.bytes, count + 1).toArray();
    if (rows.length !== count) return stop("unavailable");
    for (const row of rows) {
      const fact = { at: { scope: row["scope"], inc: row["inc"], kind: row["kind"] }, seq: row["seq"], hash: row["hash"] };
      if (!isFactRef(fact) || !isDigest(row["content"])) return stop("foreign-source-unavailable");
      this.#copy(fact, row["content"]);
    }
    this.budget.check();
  }
  get(content: Digest): Readonly<ArchiveForeignCopy> | null {
    this.budget.spend({ attempts: 1, metadata: 256, inputWork: 512 });
    return this.#copies.get(content) ?? null;
  }
  source(fact: FactRef): Readonly<ArchiveForeignCopy> | null {
    this.budget.spend({ attempts: 1, metadata: 256, inputWork: 512 });
    const content = this.#facts.get(canonicalize(fact));
    return content === undefined ? null : this.#copies.get(content) ?? null;
  }
  selection(): readonly Readonly<ArchiveForeignCopy>[] {
    this.budget.spend({ metadata: this.#copies.size * 512, inputWork: this.#copies.size * 1024 });
    return Object.freeze([...this.#copies.values()]);
  }
  basis(): readonly Readonly<ArchiveSourceBasis>[] {
    this.budget.spend({ metadata: this.#sources.size * 512, inputWork: this.#sources.size * 4096 });
    const rows = [...this.#sources.values()].map(source => ({ source, key: canonicalize(source.at) }));
    rows.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    return Object.freeze(rows.map(row => row.source));
  }
}
