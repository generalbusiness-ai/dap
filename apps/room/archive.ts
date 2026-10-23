/** Grow's explicit host-owned archive wiring. No member or Worker secret. */
import type { Bounds, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isScopeId, isScopeRef, parseStrict, readItemQueryParameter, readItemQueryReply, utf8 } from "@generalbusiness/dap-bytes";
import { ARTIFACTS_HOST, ARTIFACTS_NAMESPACE, artifactsBinding, artifactsConfiguration, type ArtifactsBindings } from "../../packages/scope/src/artifacts-wiring.ts";
import { ArtifactsProvider } from "../../packages/scope/src/artifacts-host.ts";
import { archiveTarget } from "../../packages/scope/src/archive-target.ts";
import { namespace, type Binding } from "../../packages/scope/src/namespace.ts";
import { readNativeBirth } from "../../packages/scope/src/native-birth.ts";
import { FixtureArchiveSourcePins as ArchiveSourcePins, type FixtureArchiveSourceBirth } from "../../packages/scope/src/archive-source-pins.ts";
import type { ArchiveHostConfiguration, ArchiveHostItemAsk } from "../../packages/scope/src/archive-host-item.ts";
import type { NativeItemQuery } from "../../packages/scope/src/item-queries.ts";
import type { ArchiveBudget } from "../../packages/scope/src/archive-budget.ts";
import type { ArchivePolicyRegistry } from "../../packages/scope/src/archive-inventory.ts";
import type { OutsideGiven } from "../../packages/scope/src/given.ts";
import type { RoomArchiveDriverOptions } from "../../packages/scope/src/archive-driver.ts";
import { exact } from "../../packages/scope/src/host-wiring.ts";
import { DEMO_RELEASE } from "../../examples/grow/demo-release.ts";
import type { Sql } from "../../packages/scope/src/sqlite.ts";
import { archiveSourceReferences } from "../../packages/scope/src/archive-source-window.ts";
import { stopArchivePrefix } from "../../packages/scope/src/archive-prefix.ts";
import { ArchiveStopped } from "../../packages/scope/src/archive-budget.ts";

export interface GrowArchiveEnvironment extends ArtifactsBindings { GROW_ARCHIVE_CONFIG?: string }
export function growArchiveConfiguration(env: GrowArchiveEnvironment): (ArchiveHostConfiguration & { readonly repositoryName: string; readonly service: string; readonly maxBytes: number }) | null {
  try {
    const host = artifactsConfiguration(env.ARTIFACTS_CONFIG);
    if (!host || host.namespace !== ARTIFACTS_NAMESPACE || typeof env.GROW_ARCHIVE_CONFIG !== "string" || env.GROW_ARCHIVE_CONFIG.length > 2048) return null;
    const config = exact(parseStrict(env.GROW_ARCHIVE_CONFIG), ["policy", "release", "directory", "repositoryName"]);
    if (!config || config["policy"] !== "grow-room-archive-1" || config["release"] !== DEMO_RELEASE || !isScopeId(config["directory"])
      || typeof config["repositoryName"] !== "string" || !/^[a-z2-7]{52}-1$/.test(config["repositoryName"])) return null;
    return { registerScope: host.registerScope, namespace: host.namespace, host: ARTIFACTS_HOST, directory: config["directory"], repositoryName: config["repositoryName"], service: host.host, maxBytes: host.maxBytes };
  } catch { return null; }
}

/** One target resolution prepares only the finite room graph's public birth
 * identities. Private Register/Membership bodies are never inventoried. Each
 * new pass repeats the reads/validation on its original archive allowance. */
export function growArchiveDriver(given: OutsideGiven, sql: Sql, binding: Binding, env: GrowArchiveEnvironment, policies: ArchivePolicyRegistry, bounds: Bounds, fetch?: (request: Request) => Promise<Response>): Omit<RoomArchiveDriverOptions, "sql" | "current" | "clock" | "bounds"> | null {
  const config = growArchiveConfiguration(env), artifacts = artifactsBinding(env.ARTIFACTS);
  if (!config || !artifacts) return null;
  const prepared = new WeakMap<ArchiveBudget, Map<string, FixtureArchiveSourceBirth>>();
  const publicScopes = new WeakMap<ArchiveBudget, readonly ScopeRef[]>();
  const provider = new ArtifactsProvider({ binding: artifacts, host: config.host, namespace: config.namespace, service: config.service, maxBytes: Math.min(config.maxBytes, 8 * 1024 * 1024), ...(fetch ? { fetch } : {}),
    credentialHandle: async () => { throw new Error("Archive uses no destination ledger credential"); } }).archive(() => given.clock.read());
  return { production: "room-binding", policies: { registry: policies }, provider,
    admit: (at, seed) => !["register", "membership", "inbox"].includes(at.kind) && policies.has(seed.definition),
    target: { resolve: async (at, seed, budget) => {
      const births = new Map<string, FixtureArchiveSourceBirth>();
      const nativeBirths = namespace(binding).births;
      const capture = (where: ScopeRef, reply: Awaited<ReturnType<typeof nativeBirths.read>>) => {
        const birth = readNativeBirth(reply, where, 256 * 1024);
        if (!birth) return null;
        const policy = policies.get(birth.named);
        if (!policy) return null;
        births.set(canonicalize(where), { at: where, birth: { bytes: birth.proof.bytes, hash: birth.proof.fact.hash }, ...(policy.declaration ? { declaration: policy.declaration } : {}) });
        return reply;
      };
      const target = archiveTarget({ births: { read: async (...args) => capture(args[0], await nativeBirths.read(...args)) },
        query: async (where, query, archiving, directory) => {
          if (directory.scope !== config.directory) return { ok: false, reason: "forbidden" };
          const peer = binding.get(binding.idFromName(where.scope)) as unknown as { archiveItem(ask: ArchiveHostItemAsk): Promise<NativeItemQuery> };
          const answer = await peer.archiveItem({ query, archiving, directory });
          const checked = readItemQueryParameter(query);
          const page = answer.ok && checked ? readItemQueryReply(utf8(answer.serialized), checked) : null;
          const row = page?.ok && page.complete && page.value.items.length === 1 ? page.value.items[0] : null;
          if (where.kind === "directory" && (!row || !isScopeRef(row.refs["register"]) || !isScopeRef(row.refs["membership"]))) return { ok: false, reason: "forbidden" };
          return answer;
        } });
      // Directory's own charged pass discovers/activates its quiet Rules
      // sibling. Room/Site preserve their complete target route while not
      // reading that unrelated birth on every application-journal pass.
      const discovered = await (at.kind === "lane" ? target.discoverRoom(at, seed, budget) : target.discover(at, seed, budget));
      const repository = discovered?.repository;
      if (!repository || repository.host !== config.host || repository.namespace !== config.namespace || repository.name !== config.repositoryName) return null;
      prepared.set(budget, births);
      publicScopes.set(budget, discovered!.publicScopes);
      return repository;
    } },
    sources: async (after, through, budget, exact) => {
      const births = prepared.get(budget); if (!births) return budget.stop("unavailable");
      const pins = new ArchiveSourcePins([], bounds, budget, policies), included = new Set<string>();
      const prepare = async (seq: number, sameBudget: ArchiveBudget) => {
        if (sameBudget !== budget) return budget.stop("unavailable");
        // End this synchronous native frame before any peer await. Only
        // copied source references cross it; the scout opens a fresh frame.
        const sources = sql.transaction(() => archiveSourceReferences(sql, seq, bounds, budget).sources);
        for (const where of sources) {
          const key = canonicalize(where); if (included.has(key)) continue;
          let source = births.get(key);
          if (!source) {
            budget.spend({ nodes: 1, calls: 1, metadata: 256 * 1024, inputWork: 256 * 1024 * 8 });
            const reply = await budget.wait(async () => {
              const timeout = Math.min(10_000, budget.remaining());
              try { return await namespace(binding).births.read(where, timeout, 256 * 1024); }
              catch (error) {
                if (error instanceof ArchiveStopped) throw error;
                return null;
              }
            });
            const birth = readNativeBirth(reply, where, 256 * 1024), policy = birth ? policies.get(birth.named) : null;
            if (!birth || !policy) return stopArchivePrefix("foreign-source-unavailable");
            source = { at: where, birth: { bytes: birth.proof.bytes, hash: birth.proof.fact.hash }, ...(policy.declaration ? { declaration: policy.declaration } : {}) };
            births.set(key, source);
          }
          pins.include([source], bounds, budget); included.add(key);
        }
      };
      if (exact) for (let seq = (after?.seq ?? -1) + 1; seq <= through.seq; seq++) await prepare(seq, budget);
      const replayScopes = publicScopes.get(budget); if (!replayScopes) return budget.stop("unavailable");
      return { pins, replayScopes, ...(exact ? {} : { prepare }) };
    },
  };
}
