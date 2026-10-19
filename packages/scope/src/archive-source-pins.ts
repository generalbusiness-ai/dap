/** Immutable fixture preparation for foreign archive source identity.
 * A verified header/pin is metadata, never reviewed privacy coverage,
 * production provenance, consent or permission to export a payload. */
import type { Bounds, Digest, PlatformDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, entryHash, isDigest, isEntry, isRecord, isScopeRef, parseStrict, scopeIdOf, utf8 } from "@generalbusiness/artroom-bytes";
import { outcomeValueDomains, validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { platform } from "@generalbusiness/dap-platform";
import { ArchiveBudget } from "./archive-budget.ts";
import { ArchivePrefixStopped } from "./archive-prefix.ts";

export const ARCHIVE_SOURCE_PINS = 64;
export interface FixtureArchiveSourceBirth {
  readonly at: ScopeRef;
  /** Actual genesis0 read through the existing authorized fixture reader.
   * Construction verifies integrity, not that this caller used that reader. */
  readonly birth: { readonly bytes: string; readonly hash: Digest };
  /** Exact retained declaration bytes for a digest pin. Native platform
   * pins use their finite registry data and need no retained declaration. */
  readonly declaration?: string;
}
export interface ArchiveSourceBasis { readonly at: ScopeRef; readonly pin: Digest | PlatformDefinition }
export interface ArchiveSourcePin extends ArchiveSourceBasis { readonly genesis: Digest; readonly declaration: string }
const same = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
const stop = (reason: "mismatch" | "unavailable" | "unsupported-archive-cohort"): never => { throw new ArchivePrefixStopped(reason); };
const json = (bytes: string): unknown => { try { return parseStrict(bytes); } catch { return stop("mismatch"); } };
const birthInput = (value: unknown): value is FixtureArchiveSourceBirth => isRecord(value) && isRecord(value["birth"])
  && isScopeRef(value["at"]) && isDigest(value["birth"]["hash"]) && typeof value["birth"]["bytes"] === "string";

/** No public route constructs this port. A2/A3 fixture setup owns the native
 * graph reads before the synchronous inventory frame. Each pass must charge
 * lookup/validation work again; a prebuilt map gives no free cache path. */
export class FixtureArchiveSourcePins {
  readonly fixture = "archive-source-pins" as const;
  readonly #sources = new Map<string, Readonly<ArchiveSourcePin>>();
  constructor(sources: readonly FixtureArchiveSourceBirth[], bounds: Bounds, budget: ArchiveBudget) {
    budget.check();
    if (!Array.isArray(sources) || sources.length > ARCHIVE_SOURCE_PINS) budget.stop("limit");
    for (const source of sources) {
      budget.check();
      if (!birthInput(source)) return stop("unavailable");
      const bytes = source.birth.bytes;
      if (!bytes.length || bytes.length > bounds.entryBytes) budget.stop("limit");
      budget.spend({ metadata: 512, inputWork: bytes.length * 3 * 32 });
      if (utf8(bytes).length > bounds.entryBytes) budget.stop("limit");
      const entry = json(bytes);
      if (!isEntry(entry) || canonicalize(entry) !== bytes || entryHash(entry) !== source.birth.hash || entry.seq !== 0 || entry.prev !== null
        || entry.input.type !== "genesis" || !same(entry.at, source.at) || entry.input.inc !== source.at.inc
        || entry.input.seed.kind !== source.at.kind || scopeIdOf(entry.input.seed) !== source.at.scope) return stop("mismatch");
      const pin = entry.input.seed.definition;
      const native = isDigest(pin) ? null : platform(pin);
      let declaration: string;
      if (isDigest(pin)) {
        if (typeof source.declaration !== "string") return stop("unavailable");
        declaration = source.declaration;
      } else {
        if (!native) return stop("unsupported-archive-cohort");
        budget.spend({ inputWork: bounds.definitionBytes * 16 });
        declaration = canonicalize(native.data);
        if (source.declaration !== undefined && source.declaration !== declaration) return stop("mismatch");
      }
      if (!declaration.length || declaration.length > bounds.definitionBytes) budget.stop("limit");
      budget.spend({ inputWork: declaration.length * 3 * 32 });
      if (utf8(declaration).length > bounds.definitionBytes) budget.stop("limit");
      const raw = json(declaration), checked = validateDefinition(raw, bounds, RULE_PROFILES,
        native ? { platform: true, outcomeValues: outcomeValueDomains(native.data, native.rules) } : {});
      if (!checked.ok || canonicalize(raw) !== declaration || isDigest(pin) && definitionDigest(checked.definition.declared) !== pin) return stop("mismatch");
      const key = canonicalize(source.at);
      if (this.#sources.has(key)) return stop("mismatch");
      const at = Object.freeze({ ...source.at });
      this.#sources.set(key, Object.freeze({ at, pin, genesis: source.birth.hash, declaration }));
    }
    budget.check();
  }
  /** Full scope/incarnation/kind only. Neither producer name nor receiver
   * alias is a key. Callers must separately join an explicit reviewed policy. */
  get(at: ScopeRef, budget: ArchiveBudget): Readonly<ArchiveSourcePin> | null {
    budget.spend({ attempts: 1, metadata: 512, inputWork: 1024 });
    if (!isScopeRef(at)) return stop("unavailable");
    const source = this.#sources.get(canonicalize(at));
    if (!source) return null;
    // Includes a repeated declaration comparison in the same pass allowance,
    // even when the caller already used this source or its policy.
    budget.spend({ inputWork: source.declaration.length * 3 * 16 });
    return source;
  }
}
