/** Shared synchronous declaration admission. Each walk repeats native reads
 * and validation on the original budget, including repeated roots. The
 * caller owns one aggregate visited set shared with foreign admission.
 * This selects no entry, rule, snapshot or value body. */
import type { Bounds, Digest, PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, natural, utf8 } from "@generalbusiness/dap-bytes";
import { creates, derivable, validateDefinition, type ValidDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { archiveDeclarationValidationWork } from "./archive-inventory-cost.ts";
import { validateArchiveNativeRoot } from "./archive-native-root.ts";
import type { ArchivePolicyRegistry, ReviewedArchivePolicy } from "./archive-inventory.ts";
import { archiveSupportMetadata } from "./archive-privacy.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import type { ArchiveRetainedReader } from "./archive-retained.ts";

interface DefinitionMetadata { readonly definition: ValidDefinition; readonly bytes: number }
export interface ArchiveDeclarationClosure { readonly root: Digest; readonly nodes: readonly Digest[]; readonly complete: boolean }
export class ArchiveDeclarations {
  readonly #metadata = new Map<Digest, DefinitionMetadata | null>();
  readonly #closures = new Map<Digest, ArchiveDeclarationClosure>();
  constructor(readonly reader: ArchiveRetainedReader, readonly bounds: Bounds,
    readonly reviewed: ArchivePolicyRegistry, readonly visited: Set<Digest>,
    /** Trusted scout sizes only narrow original reads. A missing key refuses
     * before its body; every permitted read still validates afresh. */
    readonly declarationSizes?: ReadonlyMap<Digest, number | null>) {}
  definition(digest: Digest): DefinitionMetadata | null | undefined { return this.#metadata.get(digest); }
  closure(digest: Digest): ArchiveDeclarationClosure | undefined { return this.#closures.get(digest); }
  /** Re-admit the exact local root and all archive-only children before
   * entry planning. Platform code reserves its original fixed maximum. */
  root(named: Digest | PlatformDefinition): { readonly definition: ValidDefinition; readonly platformClosure: ArchiveDeclarationClosure | null } {
    const rootPolicy = this.reviewed.get(named);
    if (!rootPolicy || !rootPolicy.review || rootPolicy.review.length > 512 || rootPolicy.support.named !== named) return stop("unsupported-archive-cohort");
    let definition = rootPolicy.support.definition;
    let platformClosure: ArchiveDeclarationClosure | null = null;
    if (isDigest(named)) {
      const root = this.walk(named);
      if (!root.complete) return stop("incomplete");
      definition = this.definition(named)!.definition;
    } else {
      definition = validateArchiveNativeRoot(named, this.bounds, this.reviewed, this.reader.budget);
      this.visited.add(definition.digest);
      platformClosure = this.walk(definition.digest, definition);
      if (!platformClosure.complete) return stop("incomplete");
    }
    return { definition, platformClosure };
  }
  #policyOf(digest: Digest): ReviewedArchivePolicy {
    const policy = this.reviewed.get(digest);
    if (!policy || !policy.review || policy.review.length > 512 || policy.support.named !== digest || policy.support.definition.digest !== digest) return stop("unsupported-archive-cohort");
    return policy;
  }
  #declaration(digest: Digest): DefinitionMetadata | null {
    this.reader.budget.check();
    // Even a cached/missing declaration request spends an attempt and
    // validation allowance through the same reader.
    if (!this.visited.has(digest)) { this.reader.budget.spend({ nodes: 1 }); this.visited.add(digest); }
    if (!this.reviewed.has(digest) && !this.reader.definitionPresent(digest)) { this.#metadata.set(digest, null); return null; }
    const policy = this.#policyOf(digest);
    const maximum = this.declarationSizes === undefined ? this.bounds.definitionBytes : this.declarationSizes.get(digest);
    if (maximum === null) {
      if (this.reader.measure({ kind: "definition", digest }, this.bounds.definitionBytes) !== null) return stop("mismatch");
      this.#metadata.set(digest, null); return null;
    }
    if (maximum === undefined || !natural(maximum) || maximum === 0 || maximum > this.bounds.definitionBytes) return stop("mismatch");
    const got = this.reader.read({ kind: "definition", digest }, maximum);
    if (!got) { this.#metadata.set(digest, null); return null; }
    this.reader.budget.spend({ inputWork: archiveDeclarationValidationWork(got.bytes.length) });
    const checked = validateDefinition(got.value, this.bounds, RULE_PROFILES);
    this.reader.budget.check();
    if (!checked.ok || checked.definition.digest !== digest || canonicalize(policy.support.definition.declared) !== got.bytes) return stop("mismatch");
    if (!derivable(checked.definition, policy.support.capabilities)) return stop("unsupported-archive-cohort");
    archiveSupportMetadata({ ...policy.support, definition: checked.definition }, this.reader.budget);
    const value = { definition: checked.definition, bytes: utf8(got.bytes).length };
    this.#metadata.set(digest, value); return value;
  }
  walk(root: Digest, platformRoot?: ValidDefinition): ArchiveDeclarationClosure {
    // This is an actual closure request even on a cache hit. Read and
    // validate again; a cache never enlarges per-root/aggregate bounds.
    const asked = new Set<Digest>(platformRoot ? [root] : []), nodes: Digest[] = [], queue = platformRoot ? creates(platformRoot.declared) : [root];
    let complete = true;
    for (let digest = queue.shift(); digest !== undefined; digest = queue.shift()) {
      this.reader.budget.check();
      if (asked.has(digest)) continue;
      // Native convention: root plus at most namedDefinitions children.
      if (asked.size > this.bounds.namedDefinitions) return stop("limit");
      asked.add(digest); nodes.push(digest);
      const matched = this.#declaration(digest);
      if (!matched) { complete = false; continue; }
      queue.push(...creates(matched.definition.declared));
    }
    const value = { root, nodes, complete }; this.#closures.set(root, value); return value;
  }
}
