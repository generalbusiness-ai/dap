/** One local, caller-owned synchronous read frame. No route, writer,
 * certificate, provider lease, current authority or replay verdict. */
import type { Bounds, Digest, FactRef, Head, Input, PlatformDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isDigest, isEntry, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { localRetainedPlan, requiredDependency, snapshotRead, UnsupportedConsumer } from "@generalbusiness/dap-derive";
import type { DependencyOrigin, LocalRetainedPlan, RequiredDependency, RetainedDependency, RetainedKey, TextDependency } from "@generalbusiness/dap-derive";
import { ArchiveBudget, ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";
import { archivePinValidationWork, archiveInventoryEntryWork } from "./archive-inventory-cost.ts";
import { ARCHIVE_PIN_BYTES, ARCHIVE_SCOPE_METADATA_BYTES, readArchivePin, readArchivePinAfterReceipt } from "./archive-pin.ts";
import { stopArchivePrefix as stop, archivePrefixMetadata, archiveRootMetadata, type ArchivePrefix, ArchivePrefixStopped, type ArchivePrefixReason } from "./archive-prefix.ts";
import { archivePrivacyMetadata, type ArchiveSupport } from "./archive-privacy.ts";
import { ArchiveRetainedReader, readArchiveProbe, archiveRetainedExpectedSize } from "./archive-retained.ts";
import type { Sql } from "./sqlite.ts";
import { ArchiveForeignMetadata, type ArchiveForeignExpectedCopy } from "./archive-foreign.ts";
import type { ArchiveSourceBasis, FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { readRetainedArchivePass } from "./archive-retained-pass.ts";
import { readArchiveTextBytes } from "./archive-text.ts";
import { ArchiveDeclarations } from "./archive-declarations.ts";
import type { ArchivePlanFence } from "./archive-plan-fence.ts";
import type { ArchiveRootMetadata } from "./archive-prefix.ts";

/** Loaded only from trusted reviewer/native configuration, never request
 * input. `entryTypes` is the reviewed coverage of inline signed fields and
 * owner evidence, in addition to the exact definition's policy. A supplied
 * support table or a digest in a set alone does not supply this coverage.
 * This module configures no new certificate, including for declarations.
 * Membership journals remain excluded. Two public Membership8 copy kinds
 * have a separate native-consumer check before any body selection. */
export interface ReviewedArchivePolicy {
  /** Explicit reviewed opt-in; absent from every deployed/default policy. */
  readonly floor?: { readonly margin: number; readonly minimum: number };
  readonly review: string;
  readonly entryTypes: ReadonlySet<Input["type"]>;
  readonly support: ArchiveSupport;
  /** Exact canonical digest-declaration bytes from trusted configuration.
   * Consumers still validate them under each pass's original allowance. */
  readonly declaration?: string;
}
export type ArchivePolicyRegistry = ReadonlyMap<Digest | PlatformDefinition, ReviewedArchivePolicy>;
export interface ArchiveSelectedObject {
  readonly key: RetainedKey;
  readonly bytes: number;
  readonly consumers: readonly RetainedDependency[];
  readonly foreign?: { readonly fact: FactRef; readonly pin: Digest | PlatformDefinition };
  readonly pass?: number;
}
export interface ArchiveInventory {
  readonly format: "artroom-local-inventory-1" | "artroom-local-inventory-2";
  readonly at: ScopeRef;
  readonly through: Head;
  readonly entries: readonly { readonly seq: number; readonly hash: Digest; readonly bytes: number }[];
  readonly objects: readonly ArchiveSelectedObject[];
  readonly omittedTexts: readonly (TextDependency & { readonly bytes?: number })[];
  readonly ancestryUnwalked: readonly DependencyOrigin[];
  readonly replay: "unchecked";
  readonly retention: "observed-local";
  readonly cost: ArchiveCost;
  readonly foreignSources?: readonly ArchiveSourceBasis[];
  readonly after?: Head | null;
}
export type ArchiveInventoryResult = { readonly ok: true; readonly inventory: ArchiveInventory } | { readonly ok: false; readonly reason: ArchivePrefixReason | "timeout" };
const nameOf = (key: RetainedKey) => JSON.stringify(key.kind === "value" ? [key.kind, key.domain, key.digest] : [key.kind, key.digest]);

/** Native Bounds and reviewed policies belong to the caller's trusted
 * context. The caller supplies its real Sql.transaction (transactionSync).
 * All work is synchronous: no provider task can outlive this frame. The
 * same one budget is used across every stage and every cache hit. */
type InventoryArguments = Parameters<typeof inventoryArchiveInternal> extends [boolean, ...infer Rest] ? Rest : never;
export function inventoryArchive(...args: InventoryArguments): ArchiveInventoryResult { return inventoryArchiveInternal(false, ...args); }
/** Full root semantics supply this fresh v2 inventory's native pin digest. */
export function inventoryArchiveRoot(...args: InventoryArguments): ArchiveInventoryResult { return inventoryArchiveInternal(true, ...args); }
function inventoryArchiveInternal(coupled: boolean, sql: Sql, at: ScopeRef, through: Head, bounds: Bounds, reviewed: ArchivePolicyRegistry, budget = new ArchiveBudget(), fixtureSources?: FixtureArchiveSourcePins, after?: Head | null, forecast?: ArchivePlanFence, declarationSizes?: ReadonlyMap<Digest, number | null>, expectedCopies?: ReadonlyMap<Digest, Readonly<ArchiveForeignExpectedCopy>>, retainedSizes?: ReadonlyMap<string, number | null>): ArchiveInventoryResult {
  try {
    return sql.transaction(() => {
      budget.check();
      const certified = { has: (digest: Digest) => reviewed.has(digest) };
      const collect = (prefix: ArchivePrefix, completed?: ArchiveRootMetadata): ArchiveInventoryResult => {
        const rootPolicy = reviewed.get(prefix.pin.seed.definition);
        if (!rootPolicy || !rootPolicy.review || rootPolicy.review.length > 512 || rootPolicy.support.named !== prefix.pin.seed.definition) return stop("unsupported-archive-cohort");
        let reader = completed?.reader ?? new ArchiveRetainedReader(sql, budget, [], retainedSizes);
        const visited = completed?.visited ?? new Set<Digest>();
        const declarations = completed?.declarations ?? new ArchiveDeclarations(reader, bounds, reviewed, visited, declarationSizes);
        const { definition, platformClosure } = completed ?? declarations.root(prefix.pin.seed.definition);
        const foreign = fixtureSources ? new ArchiveForeignMetadata(sql, fixtureSources, reviewed, bounds, budget, visited, prefix.pin.seed.definition, expectedCopies ? { expected: expectedCopies } : undefined) : undefined;
        const admitted = archivePrivacyMetadata(sql, prefix, { ...rootPolicy.support, definition }, budget, foreign);
        const firstPosition = admitted.positions[0]!;
        const rootOrigin: DependencyOrigin = { at: { at, seq: firstPosition.seq, hash: firstPosition.hash }, input: firstPosition.input };
        // First finish admission of ALL inline local-entry classes. A trusted
        // owner table/root certificate alone cannot authorize their bodies.
        if (admitted.positions.some(position => !rootPolicy.entryTypes.has(position.input))) return stop("unsupported-archive-cohort");
        forecast?.start(admitted, budget);
        // No copied/value/rule/snapshot body is available to this reader until
        // every selected local and foreign inline class has passed metadata.
        const copies = foreign?.selection() ?? [];
        if (copies.length) reader = new ArchiveRetainedReader(sql, budget, copies, retainedSizes);
        const plans: { origin: DependencyOrigin; plan: LocalRetainedPlan }[] = [];
        for (const position of admitted.positions) {
          budget.spend({ inputWork: archiveInventoryEntryWork(position.bytes) });
          const rows = budget.native(sql, () => ({ metadata: 0, inputWork: position.bytes })).exec("SELECT bytes FROM entry WHERE seq = ? AND hash = ? AND size = ? AND typeof(bytes) = 'text' AND octet_length(bytes) = ? LIMIT 1", position.seq, position.hash, position.bytes, position.bytes).toArray();
          const bytes = rows[0]?.["bytes"];
          if (rows.length !== 1 || typeof bytes !== "string" || bytes.length > position.bytes || utf8(bytes).length !== position.bytes) return stop("mismatch");
          const entry: unknown = parseStrict(bytes);
          if (!isEntry(entry) || entry.seq !== position.seq || entry.at.scope !== at.scope || entry.at.inc !== at.inc || entry.at.kind !== at.kind || entry.input.type !== position.input || canonicalize(entry) !== bytes || entryHash(entry) !== position.hash) return stop("mismatch");
          if (entry.seq === 0 && (entry.input.type !== "genesis" || canonicalize(entry.input.seed) !== canonicalize(prefix.pin.seed) || entry.input.inc !== at.inc || canonicalize(entry.input.source) !== canonicalize(prefix.frame.genesis.source) || entry.input.n !== prefix.frame.genesis.n)) return stop("mismatch");
          for (const use of entry.uses) {
            const copy = foreign?.get(use.content);
            if (!copy || canonicalize(copy.fact) !== canonicalize(use.fact)) return stop("foreign-source-mismatch");
          }
          let deliveryUnder: string | undefined;
          if (entry.input.type === "delivery" && Object.values(definition.declared.receives).some(handler => handler.from.under !== undefined)) {
            const sender = foreign?.source(entry.input.from);
            if (!sender) return stop("unsupported-foreign-copy");
            deliveryUnder = sender.under;
          }
          const rules = entry.input.type === "outcome" ? rootPolicy.support.owners.get(entry.input.owner)?.get(entry.input.kind) ?? null : null;
          const origin: DependencyOrigin = { at: { at, seq: entry.seq, hash: position.hash }, input: entry.input.type };
          const plan = localRetainedPlan(definition, entry, position.hash, rules, bounds, deliveryUnder);
          forecast?.check(position, plan);
          budget.check();
          plans.push({ origin, plan });
        }
        forecast?.finish();
        // The local-entry planning stage publishes no bodies or partial plan.
        // Classify every required and potential definition root/closure before
        // selecting ANY rule/snapshot/value payload. Potential probe roots may
        // be missing; only a subsequently selected root must be complete.
        for (const { plan } of plans) for (const { dependency } of plan.dependencies) {
          if (dependency.mode === "required" && dependency.key.kind === "definition") {
            if (!declarations.walk(dependency.key.digest).complete) return stop("incomplete");
          } else if (dependency.mode === "probe") for (const { key } of dependency.choices) if (key.kind === "definition") declarations.walk(key.digest);
        }
        const objects = new Map<string, { key: RetainedKey; bytes: number; consumers: RetainedDependency[]; foreign?: { fact: FactRef; pin: Digest | PlatformDefinition }; pass?: number }>();
        const omittedTexts: (TextDependency & { readonly bytes?: number })[] = [], ancestryUnwalked: DependencyOrigin[] = [];
        const add = (key: RetainedKey, bytes: number, consumer: RetainedDependency) => {
          const name = nameOf(key), prior = objects.get(name);
          if (prior) prior.consumers.push(consumer);
          else {
            const copy = key.kind === "entry" ? foreign?.get(key.digest) : null;
            if (key.kind === "entry" && (!copy || copy.bytes !== bytes)) return stop("foreign-source-mismatch");
            const pass = after === undefined ? undefined : readRetainedArchivePass(sql, key, budget) ?? firstPosition.seq;
            if (pass !== undefined && pass > firstPosition.seq) return stop("mismatch");
            objects.set(name, { key, bytes, consumers: [consumer], ...(copy ? { foreign: { fact: copy.fact, pin: copy.pin } } : {}), ...(pass === undefined ? {} : { pass }) });
          }
        };
        const selectClosure = (digest: Digest, consumer: RequiredDependency | Extract<RetainedDependency, { mode: "probe" }>) => {
          const closure = declarations.closure(digest);
          if (!closure?.complete) return stop("incomplete");
          for (const node of closure.nodes) {
            const matched = declarations.definition(node);
            if (!matched) return stop("incomplete");
            add({ kind: "definition", digest: node }, matched.bytes, node === digest ? consumer : requiredDependency(consumer.origin, "definition-child", { kind: "definition", digest: node }));
          }
        };
        if (isDigest(prefix.pin.seed.definition)) selectClosure(prefix.pin.seed.definition, requiredDependency(rootOrigin, "declaration", { kind: "definition", digest: prefix.pin.seed.definition }));
        else for (const child of platformClosure!.nodes) {
          const matched = declarations.definition(child);
          if (!matched) return stop("incomplete");
          add({ kind: "definition", digest: child }, matched.bytes, requiredDependency(rootOrigin, "definition-child", { kind: "definition", digest: child }));
        }
        for (const { origin, plan } of plans) {
          for (const { dependency, max } of plan.dependencies) {
            budget.check();
            if (dependency.mode === "text") {
              if (after === undefined) omittedTexts.push(dependency);
              else {
                const expected = retainedSizes ? archiveRetainedExpectedSize(dependency.key, retainedSizes, budget) : undefined;
                const bytes = readArchiveTextBytes(sql, dependency.key.digest, budget);
                if (retainedSizes && expected !== bytes) return stop("mismatch");
                if (bytes !== null) omittedTexts.push({ ...dependency, bytes });
              }
              continue;
            }
            if (dependency.mode === "probe") {
              const selected = readArchiveProbe(reader, dependency, max, bounds.definitionBytes);
              if (!selected) return stop("incomplete");
              if (selected.key.kind === "definition") selectClosure(selected.key.digest, dependency);
              else add(selected.key, utf8(selected.value.bytes).length, dependency);
            } else if (dependency.key.kind === "definition") {
              const got = reader.read(dependency.key, max);
              if (!got) return stop("incomplete");
              selectClosure(dependency.key.digest, dependency);
            } else {
              const got = reader.read(dependency.key, max);
              if (!got) return stop("incomplete");
              if (dependency.key.kind === "snapshot") {
                const pairs = snapshotRead(dependency.key.digest, got.bytes);
                if (!pairs) return stop("mismatch");
                if (plan.ancestry?.snapshot.digest === dependency.key.digest && pairs.length !== plan.ancestry.snapshot.count) return stop("mismatch");
              }
              add(dependency.key, utf8(got.bytes).length, dependency);
            }
          }
          if (plan.ancestry) ancestryUnwalked.push(origin);
        }
        // Rebind native scope/pin/cutoff before the only result. No await or
        // mutation can occur between this fence and returning the descriptor.
        budget.spend({ inputWork: archivePinValidationWork() });
        const finalPin = (after ? readArchivePinAfterReceipt : readArchivePin)(budget.native(sql, () => ({ metadata: ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES, inputWork: 0 })), at);
        budget.check();
        if (!finalPin || canonicalize(finalPin) !== canonicalize(prefix.pin)) return stop("mismatch");
        const cutoff = budget.native(sql, () => ({ metadata: 128, inputWork: 0 })).exec("SELECT hash, size, octet_length(bytes) AS actual FROM entry WHERE seq = ? AND typeof(hash) = 'text' AND octet_length(hash) = 71 LIMIT 1", through.seq).toArray(), last = admitted.positions.at(-1)!;
        if (cutoff.length !== 1 || cutoff[0]?.["hash"] !== through.hash || cutoff[0]?.["size"] !== last.bytes || cutoff[0]?.["actual"] !== last.bytes) return stop("mismatch");
        const foreignSources = foreign?.basis() ?? [];
        budget.check();
        return { ok: true as const, inventory: { format: after === undefined ? "artroom-local-inventory-1" as const : "artroom-local-inventory-2" as const, at, through, entries: prefix.positions, objects: [...objects.values()], omittedTexts, ancestryUnwalked, replay: "unchecked" as const, retention: "observed-local" as const, cost: budget.admitted(), ...(foreignSources.length ? { foreignSources } : {}), ...(after === undefined ? {} : { after: prefix.after ?? null }) } };
      };
      if (coupled) {
        const completed = archiveRootMetadata(sql, at, through, bounds, budget, reviewed, after, declarationSizes, retainedSizes);
        return collect(completed.prefix, completed);
      }
      return collect(archivePrefixMetadata(sql, at, through, bounds, budget, certified, after));
    });
  } catch (error) {
    if (error instanceof ArchiveStopped || error instanceof ArchivePrefixStopped) return { ok: false, reason: error.reason };
    if (error instanceof UnsupportedConsumer) return { ok: false, reason: "unsupported-archive-cohort" };
    return { ok: false, reason: "unavailable" };
  }
}
