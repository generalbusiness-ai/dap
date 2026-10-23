/** FAKE service data for custody and rendered preview witnesses. Uses the
 * shared pure producer; no native storage, installation or authority runs. */
import type { Head, Summary } from "@generalbusiness/dap-contract";
import { canonicalize, itemQueryArgument, itemQueryDigest } from "@generalbusiness/dap-bytes";
import { applicationProjectionQueries, applicationProjectionQueryDigest, projectApplicationQueryReads, readApplicationProjectionQuery } from "@generalbusiness/dap-bytes/application-v2";
import { countingCommitments } from "../commitments.ts";
import { counterStateProjection } from "./projection.ts";

export function scriptedCounterProjection(encoded: string, summary: Summary, at: Head): string {
  const query = readApplicationProjectionQuery(encoded);
  if (!query || query.projection !== "state" || canonicalize(query.scope) !== canonicalize(summary.scope) || Object.keys(query.items).length) throw Error("The FAKE service received another projection selection.");
  const queries = applicationProjectionQueries(counterStateProjection, summary.scope, {});
  const replies = Object.fromEntries(Object.entries(queries).map(([name, query]) => {
    const source = counterStateProjection.sources[name]!;
    if (!("item" in source)) throw Error("The FAKE Counter service expects item sources.");
    const items = summary.items.filter(item => item.type === source.item && source.states.includes(item.state)).map(item => {
      // Old Summary fixtures omit unset slots. Native retained item queries
      // include those selected nullable slots explicitly as null.
      const selected = { ...item, values: { ...item.values }, refs: { ...item.refs }, parties: { ...item.parties } };
      for (const field of Object.values(source.fields)) {
        const slots = field.from.kind === "value" ? selected.values : field.from.kind === "ref" ? selected.refs : selected.parties;
        if (field.nullable && !Object.hasOwn(slots, field.from.name)) Object.defineProperty(slots, field.from.name, { value: null, enumerable: true });
      }
      return selected;
    });
    return [name, { ok: true, at, complete: true, value: { v: 1, scope: summary.scope, query: itemQueryDigest(query), argument: itemQueryArgument(query), items } }];
  }));
  return canonicalize({ ok: true, query: applicationProjectionQueryDigest(query), value: projectApplicationQueryReads(counterStateProjection, countingCommitments, summary.scope, {}, replies) });
}
