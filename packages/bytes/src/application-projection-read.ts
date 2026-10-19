/** One pure projection over exact native query replies. The host must own
 * read authorization and the definition pin before obtaining those replies. */
import { ITEM_QUERY_BOUNDS, type DeclaredDefinition, type Head, type ItemQuery, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, parseStrict } from "./index.ts";
import { encodeItemQuery } from "./item-query.ts";
import { itemQueryReadFor } from "./item-query-read.ts";
import { applicationJson } from "./application-json.ts";
import { ApplicationPackageError } from "./application-types.ts";
import { bindApplicationProjection } from "./application-projection-binding.ts";
import { APPLICATION_PROJECTION_LIMITS as B, ApplicationProjectionError, applicationProjectionId, readApplicationProjection, type ApplicationProjectionData, type ApplicationProjectionRow, type ApplicationReadProjection } from "./application-projection.ts";
import { isApplicationJournalSource } from "./application-projection-types.ts";
import { projectApplicationJournalRead } from "./application-journal-projection.ts";
import { applicationProjectionFactRefs, readApplicationFactTimes } from "./application-fact-times.ts";

const fail = (reason: ApplicationProjectionError["reason"] = "invalid"): never => { throw new ApplicationProjectionError(reason); };
const own = (value: unknown, most: number): unknown => {
  try { return parseStrict(applicationJson(value, most)); }
  catch (error) { return fail(error instanceof ApplicationPackageError && error.reason === "limit" ? "limit" : "invalid"); }
};
function freeze(value: unknown): void {
  if (value !== null && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
}
/** Item reads require one explicit item ID per `item` source. Other sources
 * have no caller-defined filters, cursor or hidden selection parameters. */
export function applicationProjectionQueries(projection: ApplicationReadProjection, scope: ScopeRef,
  items: Readonly<Record<string, number>>): Readonly<Record<string, ItemQuery>> {
  const checked = readApplicationProjection(projection), ownedScope = own(scope, 1024) as ScopeRef;
  const selected = own(items, B.metadataBytes);
  if (!isRecord(selected)) return fail();
  const explicit = Object.entries(checked.sources).filter(([, source]) => source.read === "item").map(([name]) => name).sort();
  if (Object.keys(selected).sort().join() !== explicit.join()) return fail();
  const queries: Record<string, ItemQuery> = {};
  for (const [name, source] of Object.entries(checked.sources)) {
    if (isApplicationJournalSource(source)) continue;
    const given = selected[name];
    const query: ItemQuery = { v: 1, scope: ownedScope, type: source.item, states: source.states,
      ids: source.read === "item" ? [given as number] : null, limit: source.limit, cursor: null };
    if (encodeItemQuery(query) === null) return fail();
    queries[name] = query;
  }
  const owned = own(queries, B.metadataBytes) as Record<string, ItemQuery>;
  freeze(owned); return owned;
}
/** Every reply must cover its full selection at one identical native head.
 * A truncated page never becomes a successful partial projection. Retained
 * final rows are supplied by the query, rather than omitted via Summary. */
export function projectApplicationQueryReads(value: unknown, definition: DeclaredDefinition, scope: ScopeRef,
  items: Readonly<Record<string, number>>, replies: unknown, journals: Readonly<Record<string, unknown>> = {}, factTimes: Readonly<Record<string, unknown>> = {}): ApplicationProjectionData {
  const projection = bindApplicationProjection(value, definition), queries = applicationProjectionQueries(projection, scope, items);
  const owned = own(replies, ITEM_QUERY_BOUNDS.payloadBytes * B.sources + B.metadataBytes);
  if (!isRecord(owned) || Object.keys(owned).sort().join() !== Object.keys(queries).sort().join()) return fail();
  let at: Head | null = null;
  const sources: Record<string, ApplicationProjectionRow[]> = {};
  const journalNames = Object.entries(projection.sources).filter(([, source]) => isApplicationJournalSource(source)).map(([name]) => name).sort();
  const journalReads = own(journals, (2 * B.resultBytes + B.metadataBytes) * B.sources);
  if (!isRecord(journalReads) || Object.keys(journalReads).sort().join() !== journalNames.join()) return fail();
  const timedNames = Object.entries(projection.sources).filter(([, source]) => !isApplicationJournalSource(source)
    && Object.values(source.fields).some(field => field.from.kind === "fact-time")).map(([name]) => name).sort();
  const timeReads = own(factTimes, B.metadataBytes * B.sources);
  if (!isRecord(timeReads) || Object.keys(timeReads).sort().join() !== timedNames.join()) return fail();
  for (const [name, source] of Object.entries(projection.sources)) {
    if (isApplicationJournalSource(source)) {
      const result = projectApplicationJournalRead(source, definition, scope, journalReads[name]);
      if (at !== null && canonicalize(at) !== canonicalize(result.at)) return fail("stale");
      at = result.at; sources[name] = result.rows; continue;
    }
    const reply = owned[name];
    if (!itemQueryReadFor(reply, queries[name]!)) return fail();
    if (!reply.ok) return fail("unavailable");
    if (!reply.complete) return fail("incomplete");
    if (at !== null && canonicalize(at) !== canonicalize(reply.at)) return fail("stale");
    at = reply.at;
    if (source.read !== "many" && reply.value.items.length !== 1) return fail("incomplete");
    const times = timedNames.includes(name) ? readApplicationFactTimes(timeReads[name], scope, reply.at,
      applicationProjectionFactRefs(source, scope, reply.at, reply.value.items)) : new Map<number, string>();
    sources[name] = reply.value.items.map(item => {
      const fields: Record<string, ApplicationProjectionRow["fields"][string]> = {};
      for (const [alias, field] of Object.entries(source.fields)) {
        const slots = field.from.kind === "party" ? item.parties : field.from.kind === "ref" || field.from.kind === "fact-time" ? item.refs : item.values;
        const ref = slots[field.from.name];
        const value = field.from.kind === "fact-time" && ref !== null ? times.get(typeof ref === "number" ? ref : (ref as { seq: number }).seq) : ref;
        if (value === undefined || value === null && !field.nullable) return fail();
        fields[alias] = value;
      }
      return { id: item.id, type: item.type, state: item.state, revision: item.revision, fields };
    });
  }
  const result = own({ v: 1, projection: applicationProjectionId(projection), scope, at, sources }, B.resultBytes) as ApplicationProjectionData;
  freeze(result); return result;
}
