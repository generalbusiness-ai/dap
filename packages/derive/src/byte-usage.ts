/**
 * Logical retained bytes, once per byte domain/digest. This is bookkeeping
 * for checked history, not byte validation, task reservation or authority.
 * A replay can retain an explicit unknown size until that text's redaction;
 * it cannot mistake the known subtotal for a complete byte check.
 */
import { ACCEPTED_KEY_OVERHEAD_BYTES, DOMAINS, type Digest, type KeyId, type RetainedInput } from "@generalbusiness/dap-contract";
import { canonicalize, retainedByteDomain, utf8 } from "@generalbusiness/dap-bytes";
import { AmountError, naturalAmount, NOTHING } from "./held.ts";

export type ByteCount = { complete: true; bytes: number } | { complete: false; knownBytes: number; missing: number };
type Key = Pick<RetainedInput, "kind" | "digest" | "domain">;
interface Counted { size: number | null; sources: Set<string> }

/** Planner dc426978: the migrated row's fixed overhead and its UTF-8 key. */
export const archivedAcceptedKeyBytes = (idempotencyKey: string): number => ACCEPTED_KEY_OVERHEAD_BYTES + utf8(idempotencyKey).length;

export class ByteUsage {
  readonly #sources = new Map<string, string>();
  readonly #counted = new Map<string, Counted>();
  readonly #accepted = new Set<string>();
  #bytes = 0;
  #missing = 0;

  #natural(n: number): number { naturalAmount({ ...NOTHING, bytes: n }); return n; }
  #source(input: Key): string { return canonicalize(["retained", input.kind, input.kind === "value" ? input.domain : null, input.digest]); }

  #keep(source: string, domain: string | null, digest: Digest, size: number | null): void {
    if (size !== null) this.#natural(size);
    const key = canonicalize([domain, digest]), was = this.#sources.get(source), held = this.#counted.get(key);
    if (was !== undefined && was !== key) throw new AmountError("one byte source cannot change its identity");
    if (held?.size !== undefined && held.size !== null && size !== null && held.size !== size) throw new AmountError("one byte domain and digest has inconsistent sizes");
    const known = held?.size ?? size;
    const bytes = this.#natural(this.#bytes + ((known ?? 0) - (held?.size ?? 0)));
    const missing = this.#natural(this.#missing + (held === undefined && known === null ? 1 : held?.size === null && known !== null ? -1 : 0));
    // Check all arithmetic before changing a reference or subtotal.
    const next = held ?? { size: known, sources: new Set<string>() };
    next.size = known;
    next.sources.add(source);
    this.#counted.set(key, next);
    this.#sources.set(source, key);
    this.#bytes = bytes;
    this.#missing = missing;
  }

  journal(seq: number, hash: Digest, size: number): void {
    this.#natural(seq);
    this.#keep(canonicalize(["entry", seq]), DOMAINS.entry, hash, size);
  }

  /** A migrated accepted key is a durable row, independent of payload
   * deduplication. Repeating a floor cannot charge its actor/key again. */
  migrateAccepted(actor: KeyId, idempotencyKey: string): void {
    const key = canonicalize([actor, idempotencyKey]);
    if (this.#accepted.has(key)) return;
    const bytes = this.#natural(this.#bytes + archivedAcceptedKeyBytes(idempotencyKey));
    this.#accepted.add(key);
    this.#bytes = bytes;
  }

  retain(input: Key, size: number | null): void {
    if (size === null && input.kind !== "text") throw new AmountError("only a historical detached text may have an unknown byte size");
    const domain = retainedByteDomain(input.kind, input.domain);
    this.#keep(this.#source(input), domain, input.digest, size);
  }

  #drop(source: string): void {
    const key = this.#sources.get(source);
    if (key === undefined) return;
    const held = this.#counted.get(key)!;
    if (held.sources.size === 1) {
      const bytes = this.#natural(this.#bytes - (held.size ?? 0));
      const missing = this.#natural(this.#missing - (held.size === null ? 1 : 0));
      this.#counted.delete(key);
      this.#bytes = bytes;
      this.#missing = missing;
    } else held.sources.delete(source);
    this.#sources.delete(source);
  }

  /** A floor drops only the journal's source; retained copies of the same
   * byte-domain/digest keep their one charge. */
  dropJournal(seq: number): void { this.#drop(canonicalize(["entry", this.#natural(seq)])); }

  /** Only detached-text retained sources are redacted. */
  redact(digest: Digest): void { this.#drop(this.#source({ kind: "text", digest })); }

  /** Constant-time identity check for a historical missing-text interval. */
  unknownText(digest: Digest): boolean {
    return this.#counted.get(canonicalize([DOMAINS.text, digest]))?.size === null;
  }

  count(): ByteCount {
    return this.#missing === 0 ? { complete: true, bytes: this.#bytes } : { complete: false, knownBytes: this.#bytes, missing: this.#missing };
  }
}
