/** Projection-route STAND-IN for the historical M4 Lending scenario. The
 * generic item/history reads still use its real issued session and native
 * SQLite state. This supplies neither an installed package nor ownership
 * authority; application-projection-native.test.ts covers that boundary. */
import type { ApplicationInstallation } from "@generalbusiness/dap-bytes/application";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { applicationProjectionQueries, applicationProjectionQueryDigest, isApplicationJournalSource, projectApplicationQueryReads, readApplicationProjectionQuery } from "@generalbusiness/dap-bytes/application-v2";
import { ScopeHandle, httpTransport, type Fetch } from "@generalbusiness/dap-client";
import { lending } from "../../../../examples/lending/definition.ts";
import { lendingStateProjection } from "../../../../examples/lending/browser/projection.ts";

export function legacyLendingProjection(origin: string, installation: Pick<ApplicationInstallation,"scope"|"directory"|"item"|"definition">, fetch: Fetch): Fetch {
  return async (url, init) => {
    const parsed = new URL(url);
    if (parsed.pathname !== `/v1/scopes/${encodeURIComponent(installation.scope.scope)}/application-projection`) return fetch(url, init);
    const query = readApplicationProjectionQuery(parsed.searchParams.get("p"));
    if (!query || query.projection !== "state" || query.install !== installation.item || canonicalize(query.directory) !== canonicalize(installation.directory)
      || canonicalize(query.scope) !== canonicalize(installation.scope)) throw Error("The historical projection stand-in received another binding.");
    const handle = new ScopeHandle(httpTransport(origin, { fetch }), query.scope.scope, init?.headers?.["authorization"] ?? null);
    const queries = applicationProjectionQueries(lendingStateProjection, query.scope, query.items);
    const replies = Object.fromEntries(await Promise.all(Object.entries(queries).map(async ([name, selection]) => [name, await handle.queryItems(selection)])));
    // This fixture's browser segment fits one history page. Refuse a larger
    // record rather than silently call its first page a complete recent tail.
    const history = await handle.history();
    if (!history.ok || !history.complete) throw Error("The historical fixture needs a complete authenticated history page.");
    const journals = Object.fromEntries(Object.entries(lendingStateProjection.sources).filter(([, source]) => isApplicationJournalSource(source)).map(([name, source]) => {
      if (!isApplicationJournalSource(source)) throw Error("Expected a journal source.");
      return [name, { scope: query.scope, at: history.at, entries: history.value.filter(sealed => sealed.entry.seq >= Math.max(0, history.at.seq - source.window + 1))
        .map(sealed => ({ seq: sealed.entry.seq, hash: sealed.hash, bytes: canonicalize(sealed.entry) })) }];
    }));
    const value = projectApplicationQueryReads(lendingStateProjection, lending, query.scope, query.items, replies, journals);
    return new Response(canonicalize({ ok: true, query: applicationProjectionQueryDigest(query), value }), { headers: { "content-type": "application/json" } });
  };
}
