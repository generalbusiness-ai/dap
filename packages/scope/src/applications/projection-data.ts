/** Shared synchronous journal projection phase over a schema-bound
 * declaration. Authority, metadata, binding and final freshness remain the
 * caller's. No retry lives here. */
import type { ApplicationProjectionData, ApplicationProjectionRefusal } from "@generalbusiness/dap-contract";
import { parseStrict } from "@generalbusiness/artroom-bytes";
import { applicationProjectionQueries, projectApplicationQueryReads, type ApplicationReadProjection } from "@generalbusiness/artroom-bytes/application-v2";
import { ItemQueryBudget } from "../item-query-budget.ts";
import { itemQueryPage } from "../item-query-page.ts";
import type { PreparedRead } from "../read-preparation.ts";
import type { Sql } from "../sqlite.ts";
export function applicationProjectionData(sql: Pick<Sql, "exec">, frame: Pick<PreparedRead, "scope" | "pinned">,
  projection: ApplicationReadProjection, items: Readonly<Record<string, number>>, active: () => boolean):
  { ok: true; value: ApplicationProjectionData } | { ok: false; reason: ApplicationProjectionRefusal } {
  const definition = frame.pinned.definition;
  if (!definition || !active()) return { ok: false, reason: "unavailable" };
  let queries;
  try { queries = applicationProjectionQueries(projection, frame.scope.at, items); }
  catch { return { ok: false, reason: "invalid-query" }; }
  // Reserve one unchanged native page allowance per source, once, at most
  // eight. No continuation, reset, top-up, retry or borrowing.
  const pages = Object.entries(queries).map(([name, query]) => ({ name, query, budget: new ItemQueryBudget("session", active) }));
  const replies: Record<string, unknown> = {};
  for (const page of pages) {
    const answer = itemQueryPage(page.budget.sql("page", sql), frame, page.query, () => page.budget.available, {
      candidates: (candidates, metadata) => page.budget.spend("page", { candidates, metadata }),
      bodies: (bodies, payloadBytes) => page.budget.spend("page", { bodies, payloadBytes }),
    });
    if (!answer.ok) return { ok: false, reason: answer.reason === "row-too-large" || answer.reason === "too-large" ? "too-large" : "unavailable" };
    replies[page.name] = parseStrict(answer.serialized);
  }
  return { ok: true, value: projectApplicationQueryReads(projection, definition.declared, frame.scope.at, items, replies) };
}
