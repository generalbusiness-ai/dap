/** One host-owned archive adapter for every room Worker. */
import type { Bounds, Digest, SequenceRef, Seed } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, isDigest, isSequenceRef, readItemQueryParameter, readItemQueryReply, same, utf8 } from "@generalbusiness/dap-bytes";
import { ARTIFACTS_HOST, artifactsReadiness, type ArtifactsBindings } from "../../packages/scope/src/artifacts-wiring.ts";
import { ArtifactsProvider } from "../../packages/scope/src/artifacts-host.ts";
import { archiveTarget } from "../../packages/scope/src/archive-target.ts";
import { namespace, type Binding } from "../../packages/scope/src/namespace.ts";
import { readNativeBirth } from "../../packages/scope/src/native-birth.ts";
import { FixtureArchiveSourcePins as ArchiveSourcePins, type FixtureArchiveSourceBirth } from "../../packages/scope/src/archive-source-pins.ts";
import type { ArchiveHostConfiguration, ArchiveHostItemAsk } from "../../packages/scope/src/archive-host-item.ts";
import type { NativeItemQuery } from "../../packages/scope/src/item-queries.ts";
import { isRoomRetiredStop, type RoomRetiredStop } from "../../packages/scope/src/room-retired.ts";
import type { ArchiveBudget } from "../../packages/scope/src/archive-budget.ts";
import type { ArchivePolicyRegistry } from "../../packages/scope/src/archive-inventory.ts";
import type { OutsideGiven } from "../../packages/scope/src/given.ts";
import type { RoomArchiveDriverOptions } from "../../packages/scope/src/archive-driver.ts";
import { hostRegisterScopes } from "../../packages/scope/src/installed-registers.ts";
import type { ApplicationBindings } from "../../packages/scope/src/applications/bindings.ts";
import type { Sql } from "../../packages/scope/src/sqlite.ts";
import { archiveSourceReferences } from "../../packages/scope/src/archive-source-window.ts";
import { ArchivePrefixStopped } from "../../packages/scope/src/archive-prefix.ts";
import { ArchiveStopped } from "../../packages/scope/src/archive-budget.ts";
import type { ArchiveReplayContext } from "../../packages/scope/src/archive-publication.ts";

export interface RoomArchiveEnvironment extends ArtifactsBindings, ApplicationBindings { ARCHIVE_RESTART_DIRECTIVE?: string }
export type RoomArchiveConfiguration = ArchiveHostConfiguration & { readonly service: string; readonly maxBytes: number };
/** One provider/root configuration; each Directory supplies its own binding. */
export function roomArchiveConfiguration(env: RoomArchiveEnvironment): RoomArchiveConfiguration | null {
  const ready = artifactsReadiness(env);
  if (ready.state !== "wired") return null;
  const roots = hostRegisterScopes(ready.config.registerScope, env);
  return roots ? { registerScope: roots, namespace: ready.config.namespace, host: ARTIFACTS_HOST,
    service: ready.config.host, maxBytes: ready.config.maxBytes } : null;
}

/** One target resolution prepares only the finite room graph's public birth
 * identities. Private Register/Membership bodies are never inventoried. Each
 * new pass repeats the reads/validation on its original archive allowance. */
export function roomArchiveDriver(given: OutsideGiven, sql: Sql, binding: Binding, env: RoomArchiveEnvironment, policies: ArchivePolicyRegistry, bounds: Bounds, fetch?: (request: Request) => Promise<Response>, policyOwner?: { prepare(at: SequenceRef, seed: Seed, budget: ArchiveBudget): Promise<{ readonly stop: string } | void>; current(): boolean; candidate(seq: number, budget: ArchiveBudget): Promise<void>; source(at: SequenceRef, seed: Seed, birth: { bytes: string; hash: Digest }, budget: ArchiveBudget): Promise<boolean> }): Omit<RoomArchiveDriverOptions, "sql" | "current" | "clock" | "bounds"> | null {
  const config = roomArchiveConfiguration(env), ready = artifactsReadiness(env);
  if (!config || ready.state !== "wired") return null;
  const artifacts = ready.binding;
  const prepared = new WeakMap<ArchiveBudget, Map<string, FixtureArchiveSourceBirth>>();
  const publicScopes = new WeakMap<ArchiveBudget, Readonly<{ replayScopes: readonly SequenceRef[]; replayContext: ArchiveReplayContext }>>();
  const provider = new ArtifactsProvider({ binding: artifacts, host: config.host, namespace: config.namespace, service: config.service, maxBytes: Math.min(config.maxBytes, 8 * 1024 * 1024), ...(fetch ? { fetch } : {}),
    credentialHandle: async () => { throw new Error("Archive uses no destination ledger credential"); } }).archive(() => given.clock.read());
  return { production: "room-binding", policies: { registry: policies }, provider,
    ...(policyOwner ? { preparePolicies: (at, seed, budget) => policyOwner.prepare(at, seed, budget), policyCurrent: () => policyOwner.current() } : {}),
    admit: (_at, seed) => !["register", "membership", "inbox"].includes(seed.kind) && (policies.has(seed.definition) || isDigest(seed.definition)),
    target: { resolve: async (at, seed, budget) => {
      const births = new Map<string, FixtureArchiveSourceBirth>();
      const nativeBirths = namespace(binding).births;
      const capture = async (where: SequenceRef, reply: Awaited<ReturnType<typeof nativeBirths.read>>) => {
        // archiveTarget's own admission of this same reply debits the archive budget. This copy charges nothing more.
        const admitted = readNativeBirth(reply, where, 256 * 1024, () => {});
        if (!admitted) return null;
        const birth = admitted.birth;
        if (policyOwner && !policies.has(birth.named) && !await policyOwner.source(where, admitted.entry.input.seed, { bytes: birth.proof.bytes, hash: birth.proof.fact.hash }, budget)) return null;
        const policy = policies.get(birth.named);
        if (!policy) return null;
        births.set(canonicalize(where), { at: where, birth: { bytes: birth.proof.bytes, hash: birth.proof.fact.hash }, ...(policy.declaration ? { declaration: policy.declaration } : {}) });
        return reply;
      };
      const target = archiveTarget({ births: { read: async (...args) => capture(args[0], await nativeBirths.read(...args)) },
        query: async (where, query, archiving, directory) => {
          const peer = binding.get(binding.idFromName(where.scope)) as unknown as { archiveItem(ask: ArchiveHostItemAsk): Promise<NativeItemQuery | RoomRetiredStop> };
          const answer = await peer.archiveItem({ query, archiving, directory });
          if (isRoomRetiredStop(answer)) return { ok: false, reason: "unavailable" };
          const checked = readItemQueryParameter(query);
          const page = answer.ok && checked ? readItemQueryReply(utf8(answer.serialized), checked) : null;
          const row = page?.ok && page.complete && page.value.items.length === 1 ? page.value.items[0] : null;
          // The resolver supplies its already-checked Directory full ref.
          // A bare ref or a caller's kind label does not classify this read.
          if (same(where, directory) && (!row || !isSequenceRef(row.refs["register"]) || !isSequenceRef(row.refs["membership"]))) return { ok: false, reason: "forbidden" };
          return answer;
        } });
      // Directory's own charged pass discovers/activates its quiet Rules
      // sibling. Room/Site preserve their complete target route while not
      // reading that unrelated birth on every application-journal pass.
      const discovered = await (seed.kind === "lane" ? target.discoverRoom(at, seed, budget) : target.discover(at, seed, budget));
      const repository = discovered?.repository;
      if (!repository || repository.host !== config.host || repository.namespace !== config.namespace) return null;
      prepared.set(budget, births);
      publicScopes.set(budget, Object.freeze({ replayScopes: discovered!.publicScopes, replayContext: discovered!.replayContext }));
      return repository;
    } },
    sources: async (after, through, budget, exact) => {
      const births = prepared.get(budget); if (!births) return budget.stop("unavailable");
      const replay = publicScopes.get(budget); if (!replay) return budget.stop("unavailable");
      const pins = new ArchiveSourcePins([], bounds, budget, policies), included = new Set<string>();
      const prepare = async (seq: number, sameBudget: ArchiveBudget) => {
        if (sameBudget !== budget) return budget.stop("unavailable");
        // End this synchronous native frame before any peer await. Only
        // copied source references cross it; the scout opens a fresh frame.
        await policyOwner?.candidate(seq, budget);
        const candidate = sql.transaction(() => archiveSourceReferences(sql, seq, bounds, budget));
        const sources = candidate.sources;
        for (const where of sources) {
          const key = canonicalize(where); if (included.has(key)) continue;
          let source = births.get(key);
          if (!source) {
            const reservation = budget.reserve({ nodes: 1, calls: 1, metadata: 256 * 1024, inputWork: 256 * 1024 * 8 });
            const reply = await budget.wait(async () => {
              const timeout = Math.min(10_000, budget.remaining());
              try { return await namespace(binding).births.read(where, timeout, 256 * 1024); }
              catch (error) {
                if (error instanceof ArchiveStopped) throw error;
                return null;
              }
            });
            // The debit settles the reservation at the actual size, before parsing.
            const birth = readNativeBirth(reply, where, 256 * 1024, size => budget.settle(reservation, size))?.birth ?? null;
            if (birth && policyOwner && !policies.has(birth.named)) {
              const checked = admitSequenceGenesis(birth.proof.bytes, where, bounds.entryBytes);
              if (!checked) throw new ArchivePrefixStopped("foreign-source-mismatch");
              const seed = readNativeBirth(reply, where, 256 * 1024, () => {})?.entry.input.seed;
              if (!seed || !await policyOwner.source(where, seed, { bytes: birth.proof.bytes, hash: birth.proof.fact.hash }, budget)) throw new ArchivePrefixStopped("foreign-source-unavailable");
            }
            const policy = birth ? policies.get(birth.named) : null;
            if (!birth || !policy) {
              // Bounded copies of already validated metadata only. No raw birth,
              // payload, error or transport credential enters the pass diagnostic.
              budget.spend({ metadata: 512, inputWork: 1024 });
              throw new ArchivePrefixStopped("foreign-source-unavailable", Object.freeze({
                candidate: Object.freeze({ ...candidate.position }), source: Object.freeze({ ...where }),
                classification: birth ? "unsupported-policy" as const : "birth-unavailable" as const,
                ...(birth ? birth.named.length <= 128 ? { pin: birth.named } : { pinOmitted: true as const } : {}),
              }));
            }
            source = { at: where, birth: { bytes: birth.proof.bytes, hash: birth.proof.fact.hash }, ...(policy.declaration ? { declaration: policy.declaration } : {}) };
            births.set(key, source);
          }
          if (replay.replayContext.directoryRules && same(replay.replayContext.directoryRules.at, where)) {
            // This source was already needed by the selected candidate.
            // Pay for the additional byte-factory pass before parsing it;
            // the role record never initiates a read or supplies proof.
            budget.spend({ metadata: bounds.entryBytes, inputWork: bounds.entryBytes * 8 });
            const sequence = admitSequenceGenesis(source.birth.bytes, where, bounds.entryBytes);
            if (!sequence || sequence.kind !== "rules") throw new ArchivePrefixStopped("foreign-source-mismatch");
          }
          pins.include([source], bounds, budget); included.add(key);
        }
      };
      if (exact) for (let seq = (after?.seq ?? -1) + 1; seq <= through.seq; seq++) await prepare(seq, budget);
      return { pins, ...replay, ...(exact ? {} : { prepare }) };
    },
  };
}

/** Historical fixture call shape. It uses exactly the shared adapter and
 * ignores obsolete Grow selectors; no production entry imports this alias. */
export function growArchiveDriver(given: OutsideGiven, sql: Sql, binding: Binding, env: RoomArchiveEnvironment, _release: Digest, policies: ArchivePolicyRegistry, bounds: Bounds, fetch?: (request: Request) => Promise<Response>) {
  return roomArchiveDriver(given, sql, binding, env, policies, bounds, fetch);
}
export const growArchiveConfiguration = (env: RoomArchiveEnvironment, _release: Digest) => roomArchiveConfiguration(env);
