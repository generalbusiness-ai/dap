/** Bounded native retained-byte mechanism. This helper grants no phase or
 * privacy admission. The owning inventory must finish privacy/root policy
 * before value/rule/snapshot selection; declaration metadata is permitted
 * earlier. Copies need exact already-classified descriptors; detached texts
 * are never read here. */
import { natural } from "@generalbusiness/dap-bytes";
import { DOMAINS, RETAINED_INPUT_BYTES, type Digest } from "@generalbusiness/dap-contract";
import { canonicalize, domainRetainedJSON, entryHash, isDigest, isEntry, isFactRef, isPlatformDefinition, rawRetainedJSON, utf8 } from "@generalbusiness/dap-bytes";
import { checkedRetainedKey, type ProbeDependency, type RetainedKey } from "@generalbusiness/dap-derive";
import { ARCHIVE_BOUNDS, ArchiveBudget, ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";
import { ArchivePrefixStopped } from "./archive-prefix.ts";
import type { Sql } from "./sqlite.ts";
import type { ArchiveForeignCopy } from "./archive-foreign.ts";
import { ARCHIVE_NATIVE_VALUE_DOMAINS } from "@generalbusiness/dap-git/archive-policy";

export interface ArchiveRetainedValue { readonly bytes: string; readonly value: unknown }
export type ArchiveRetainedCopy = Pick<ArchiveForeignCopy, "content" | "bytes" | "fact" | "pin">;
// Supported decoding vocabulary, not permission to read/export. The owning
// whole-prefix classifier checks every exact native pin/data/place first.
const nativeDomains: ReadonlySet<string> = new Set([...Object.values(DOMAINS), ...ARCHIVE_NATIVE_VALUE_DOMAINS]);
export const archiveRetainedKeyName = (key: RetainedKey | { readonly kind: "text"; readonly digest: Digest }): string => JSON.stringify(key.kind === "value" ? [key.kind, key.domain, key.digest] : [key.kind, key.digest]);
const REQUEST_WORK = 256, SIZE_METADATA = 96, DEFINITION_PRESENCE_METADATA = 32;
/** Original unreviewed declaration existence check only, never a body. */
export const archiveDefinitionPresenceForecast = (): Readonly<Partial<ArchiveCost>> =>
  Object.freeze({ attempts: 1, calls: 1, metadata: DEFINITION_PRESENCE_METADATA, inputWork: REQUEST_WORK + DEFINITION_PRESENCE_METADATA });
const coldWork = (bytes: number) => bytes * 32;
const cachedWork = (units: number) => units * 3 * 32;

/** Future read only: the keyed measurement has already spent its own
 * attempt/call. Cover both cold bytes and cached UTF-16 validation without
 * assuming a cache hit or crediting any original debit. A size does not
 * validate content or select a probe. */
export function archiveRetainedReadForecast(bytes: number | null): Partial<ArchiveCost> {
  if (bytes !== null && (!natural(bytes) || bytes === 0 || bytes > RETAINED_INPUT_BYTES)) throw new ArchiveStopped("unavailable");
  return { attempts: 1, calls: bytes === null ? 1 : 2, metadata: SIZE_METADATA,
    inputWork: REQUEST_WORK + SIZE_METADATA + (bytes === null ? 0 : Math.max(coldWork(bytes) + bytes, cachedWork(bytes))) };
}

/** An actually fresh reader's first request for a key. This prices the
 * original cold mechanism; no scout cache or validation credit is used. */
export function archiveRetainedColdReadForecast(bytes: number | null): Partial<ArchiveCost> {
  if (bytes !== null && (!natural(bytes) || bytes === 0 || bytes > RETAINED_INPUT_BYTES)) throw new ArchiveStopped("unavailable");
  return { attempts: 1, calls: bytes === null ? 1 : 2, metadata: SIZE_METADATA,
    inputWork: REQUEST_WORK + SIZE_METADATA + (bytes === null ? 0 : coldWork(bytes) + bytes) };
}

/** New metadata-fence bookkeeping; original request/read fees remain.
 * Keys include text omissions, whose expected sizes are checked by inventory. */
export const archiveRetainedExpectationCost = (): Partial<ArchiveCost> => ({ metadata: 1024, inputWork: 2048 });
export function archiveRetainedExpectedSize(key: RetainedKey | { readonly kind: "text"; readonly digest: Digest }, sizes: ReadonlyMap<string, number | null>, budget: ArchiveBudget): number | null {
  budget.spend(archiveRetainedExpectationCost());
  const name = archiveRetainedKeyName(key);
  if (!sizes.has(name)) throw new ArchivePrefixStopped("mismatch");
  return sizes.get(name)!;
}
export function archiveRetainedHandoffCost(keys: number): Partial<ArchiveCost> {
  if (!natural(keys) || keys > ARCHIVE_BOUNDS.attempts) throw new ArchiveStopped("unavailable");
  return { metadata: 128 + keys * 256, inputWork: 256 + keys * 512 };
}

export class ArchiveRetainedReader {
  readonly #cache = new Map<string, string>();
  readonly #copies = new Map<Digest, Readonly<ArchiveRetainedCopy>>();
  /** The owning pass supplies descriptors only after every local/foreign
   * policy class is admitted, or from its exact immutable marked selection. */
  constructor(readonly sql: Pick<Sql, "exec">, readonly budget: ArchiveBudget, copies: readonly Readonly<ArchiveRetainedCopy>[] = [], readonly expectedSizes?: ReadonlyMap<string, number | null>) {
    if (copies.length > ARCHIVE_BOUNDS.attempts) budget.stop("limit");
    budget.spend({ metadata: copies.length * 512, inputWork: copies.length * 1024 });
    for (const copy of copies) this.#rememberCopy(copy, false);
  }
  #rememberCopy(copy: Readonly<ArchiveRetainedCopy>, repeated: boolean): void {
    if (!isDigest(copy.content) || !isFactRef(copy.fact) || !isDigest(copy.pin) && !isPlatformDefinition(copy.pin)
      || !natural(copy.bytes) || copy.bytes === 0 || copy.bytes > RETAINED_INPUT_BYTES) this.budget.stop("unavailable");
    const prior = this.#copies.get(copy.content);
    if (prior) {
      if (!repeated || prior.bytes !== copy.bytes || prior.pin !== copy.pin || canonicalize(prior.fact) !== canonicalize(copy.fact)) this.budget.stop("unavailable");
      return;
    }
    if (this.#copies.size === ARCHIVE_BOUNDS.attempts) this.budget.stop("limit");
    this.#copies.set(copy.content, Object.freeze({ ...copy, fact: Object.freeze({ ...copy.fact, at: Object.freeze({ ...copy.fact.at }) }) }));
  }
  /** Add only an already classified descriptor inside the owner's native
   * metadata frame. This does not grant privacy or body-read admission.
   * Pay the original copy-table price even for an identical registration;
   * conflicting facts/sizes/pins can never replace a descriptor. */
  registerCopy(copy: Readonly<ArchiveRetainedCopy>): void {
    this.budget.spend({ metadata: 512, inputWork: 1024 });
    this.#rememberCopy(copy, true);
  }
  /** An unconfigured potential definition probe may be genuinely absent.
   * Inspect only its native keyed existence before requesting policy; an
   * uncovered present candidate still refuses before any body fetch. */
  definitionPresent(digest: Digest): boolean {
    checkedRetainedKey({ kind: "definition", digest });
    this.budget.spend({ attempts: 1, inputWork: REQUEST_WORK });
    const rows = this.budget.native(this.sql, () => ({ metadata: DEFINITION_PRESENCE_METADATA, inputWork: 0 })).exec("SELECT 1 AS present FROM retained_input WHERE kind = 'definition' AND digest = ? LIMIT 1", digest).toArray();
    if (rows.length === 0) return false;
    if (rows.length !== 1 || rows[0]?.["present"] !== 1) return this.budget.stop("unavailable");
    return true;
  }
  #request(key: RetainedKey, max: number): Readonly<ArchiveRetainedCopy> | undefined {
    checkedRetainedKey(key);
    this.budget.spend({ attempts: 1, inputWork: REQUEST_WORK });
    if (this.expectedSizes) archiveRetainedExpectedSize(key, this.expectedSizes, this.budget);
    const copy = key.kind === "entry" ? this.#copies.get(key.digest) : undefined;
    if (key.kind === "entry" && !copy) throw new ArchivePrefixStopped("unsupported-foreign-copy");
    // Runtime check as well as the closed TypeScript key; never fall through
    // an unknown future kind into the ordinary retained_input table.
    if (!["definition", "entry", "rule", "snapshot", "value"].includes(key.kind)) throw new ArchivePrefixStopped("unavailable");
    if (key.kind === "value" && (!nativeDomains.has(key.domain) || key.domain === DOMAINS.definition)) throw new ArchivePrefixStopped("unsupported-custom-domain");
    if (!natural(max) || max === 0 || max > RETAINED_INPUT_BYTES) return this.budget.stop("limit");
    return copy;
  }
  #size(key: RetainedKey, max: number, copy: Readonly<ArchiveRetainedCopy> | undefined): number | null {
    const value = key.kind === "value", where = value ? "domain = ? AND digest = ?" : "kind = ? AND digest = ?", table = value ? "retained_value" : "retained_input";
    const rows = this.budget.native(this.sql, () => ({ metadata: SIZE_METADATA, inputWork: 0 })).exec(`SELECT octet_length(bytes) AS size, typeof(bytes) AS type FROM ${table} WHERE ${where} LIMIT 1`, key.kind === "value" ? key.domain : key.kind, key.digest).toArray();
    const row = rows[0], bytes = rows.length === 1 && row?.["type"] === "text" && natural(row["size"])
      && row["size"] > 0 && row["size"] <= RETAINED_INPUT_BYTES ? row["size"] : null;
    if (this.expectedSizes && this.expectedSizes.get(archiveRetainedKeyName(key)) !== bytes) throw new ArchivePrefixStopped("mismatch");
    if (bytes === null || bytes > max) return null;
    if (copy && bytes !== copy.bytes) return null;
    return bytes;
  }
  /** Scalar keyed metadata for a cost forecast, never content validation
   * or permission to select a body. A later read measures again. Repeated
   * measurements and missing keys each spend an attempt and native call. */
  measure(key: RetainedKey, max: number): number | null {
    return this.#size(key, max, this.#request(key, max));
  }
  /** Every request spends an attempt, including failed probes and cache
   * hits. Decode/hash work is reserved again before repeat validation. */
  read(key: RetainedKey, max: number): ArchiveRetainedValue | null {
    const copy = this.#request(key, max);
    const cacheKey = archiveRetainedKeyName(key);
    let bytes = this.#cache.get(cacheKey);
    let size: number;
    if (bytes === undefined) {
      const value = key.kind === "value", where = value ? "domain = ? AND digest = ?" : "kind = ? AND digest = ?", table = value ? "retained_value" : "retained_input";
      const bindings = [key.kind === "value" ? key.domain : key.kind, key.digest];
      const measured = this.#size(key, max, copy);
      if (measured === null) return null;
      size = measured;
      this.budget.spend({ inputWork: coldWork(size) });
      const body = this.budget.native(this.sql, () => ({ metadata: 0, inputWork: size })).exec(`SELECT bytes FROM ${table} WHERE ${where} AND typeof(bytes) = 'text' AND octet_length(bytes) = ? LIMIT 1`, ...bindings, size).toArray();
      if (body.length !== 1 || typeof body[0]?.["bytes"] !== "string") return this.budget.stop("unavailable");
      bytes = body[0]["bytes"];
    } else {
      // UTF-16 length is a lower bound before allocating UTF-8. The
      // reservation is conservative for up to three bytes per code unit.
      if (bytes.length > max) return null;
      this.budget.spend({ inputWork: cachedWork(bytes.length) });
      size = utf8(bytes).length;
    }
    if (bytes.length > max || utf8(bytes).length !== size || size > max) return null;
    const parsed = key.kind === "rule" || key.kind === "entry" ? rawRetainedJSON(key.digest, bytes)
      : domainRetainedJSON(key.kind === "value" ? key.domain : key.kind === "definition" ? DOMAINS.definition : DOMAINS.snapshot, key.digest, bytes, { canonical: true, max });
    this.budget.check();
    if (parsed === undefined || canonicalize(parsed) !== bytes) return null;
    if (copy && (!isEntry(parsed) || parsed.seq !== copy.fact.seq || canonicalize(parsed.at) !== canonicalize(copy.fact.at)
      || entryHash(parsed) !== copy.fact.hash || size !== copy.bytes || parsed.input.type === "genesis" && parsed.input.seed.definition !== copy.pin)) return null;
    this.budget.check();
    this.#cache.set(cacheKey, bytes);
    return { bytes, value: parsed };
  }
}

/** Ordered byte-validated probe, after the caller's closed dependency
 * admission. A miss/invalid candidate spends its attempt and selects nothing;
 * the first valid native key wins and later candidates are never fetched. */
export function readArchiveProbe(reader: ArchiveRetainedReader, probe: ProbeDependency, max: number, definitionBytes: number): { key: RetainedKey; value: ArchiveRetainedValue } | null {
  for (const { key } of probe.choices) {
    const value = reader.read(key, key.kind === "definition" ? Math.min(max, definitionBytes) : max);
    if (value) return { key, value };
  }
  return null;
}
