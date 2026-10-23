/** Namespace-only host reads authorized by the admitted room binding.
 * No session, member, inspector, public reader or HTTP route uses this port.
 * This helper accepts trusted host input: it does not independently prove
 * ask.archiving's lineage. The production target's checked birth walk does
 * that before either item query. Namespace RPC access alone is no proof. */
import type { ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest, isEntry, isFactRef, isScopeRef, parseStrict, readItemQueryParameter, same } from "@generalbusiness/dap-bytes";
import { isEntryOf } from "@generalbusiness/dap-derive";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as C, directoryIdOf } from "@generalbusiness/dap-platform";
import type { OutsideGiven } from "./given.ts";
import { hostBound } from "./host-wiring.ts";
import { itemQueryPage } from "./item-query-page.ts";
import type { NativeItemQuery } from "./item-queries.ts";
import type { Pinned } from "./core.ts";
import type { Sql } from "./sqlite.ts";

export interface ArchiveHostConfiguration { readonly registerScope: ScopeId; readonly host: string; readonly namespace: string; readonly directory: ScopeId }
export interface ArchiveHostItemAsk { readonly query: string; readonly archiving: ScopeRef; readonly directory: ScopeRef }

export function archiveHostItem(sql: Pick<Sql, "exec">, given: OutsideGiven, pinned: Pinned | null, config: ArchiveHostConfiguration | null, ask: ArchiveHostItemAsk): NativeItemQuery {
  const refused = { ok: false, reason: "forbidden" } as const;
  try {
    if (!config || !ask || !isScopeRef(ask.archiving) || !isScopeRef(ask.directory) || ask.directory.kind !== "directory" || ask.directory.scope !== config.directory
      || ["register", "membership", "inbox"].includes(ask.archiving.kind)) return refused;
    const query = typeof ask.query === "string" ? readItemQueryParameter(ask.query) : null;
    const scope = given.scope(), genesis = given.genesis();
    if (!query || !scope || !pinned || !same(query.scope, scope.at) || query.limit !== 1 || query.cursor !== null || query.ids !== null) return refused;
    if (scope.at.kind === "directory") {
      if (!same(scope.at, ask.directory) || pinned.named !== C.directory || query.type !== "repository" || query.states.join() !== "open") return refused;
      const row = given.state.page("repository", ["open"], null, 1).items[0];
      const claim = row?.refs["claim"], repository = row?.values["repository"] as Record<string, unknown> | undefined;
      if (row?.values["archive"] !== "journal" || !same(row.refs["register"], genesis?.seed.creator)
        || genesis?.seed.creator?.scope !== config.registerScope || !isFactRef(claim) || claim.at.scope !== config.registerScope
        || repository?.["host"] !== config.host || repository["namespace"] !== config.namespace) return refused;
      const use = given.own(0)?.entry.uses.find(use => same(use.fact, claim));
      const retained = use ? given.retained("entry", use.content) : null;
      const opening = retained ? parseStrict(retained.bytes) : null;
      if (!isEntry(opening) || !isEntryOf(opening, claim) || opening.input.type !== "act" || opening.input.signed.intent.kind !== "found") return refused;
      const seeds = opening.effects.filter(effect => effect.effect === "value" && effect.item === claim.seq && effect.slot === "seed");
      const seed = seeds.length === 1 && seeds[0]?.effect === "value" ? seeds[0].value : null;
      if (!isDigest(seed) || directoryIdOf(seed) !== scope.at.scope) return refused;
    } else if (scope.at.kind === "destination") {
      if (pinned.named !== C.destination || query.type !== "branch" || query.states.join() !== "empty,ready"
        || !same(genesis?.seed.creator, ask.directory) || !hostBound(given, config.registerScope, config.host, config.namespace)(pinned.named)) return refused;
    } else return refused;
    return itemQueryPage(sql, { scope, pinned }, query, () => true);
  } catch { return refused; }
}
