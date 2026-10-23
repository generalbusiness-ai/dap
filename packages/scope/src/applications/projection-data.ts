/** Shared synchronous journal projection phase over a schema-bound
 * declaration. Authority, metadata, binding and final freshness remain the
 * caller's. No retry lives here. */
import type { ApplicationProjectionData, ApplicationProjectionRefusal, ItemQueryRead } from "@generalbusiness/dap-contract";
import { parseStrict } from "@generalbusiness/dap-bytes";
import { applicationProjectionQueries, applicationProjectionFactRefs, isApplicationJournalSource, projectApplicationQueryReads, type ApplicationReadProjection } from "@generalbusiness/dap-bytes/application-v2";
import { applicationProjectionJournal } from "./projection-journal.ts";
import { applicationProjectionFactTimes } from "./projection-fact-times.ts";
import { applicationProjectionFactSigners } from "./projection-fact-signers.ts";
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
  const budgets = Object.fromEntries(Object.keys(projection.sources).map(name => [name, new ItemQueryBudget("session", active)]));
  const pages = Object.entries(queries).map(([name, query]) => ({ name, query, budget: budgets[name]! }));
  const replies: Record<string, unknown> = {};
  for (const page of pages) {
    const answer = itemQueryPage(page.budget.sql("page", sql), frame, page.query, () => page.budget.available, {
      candidates: (candidates, metadata) => page.budget.spend("page", { candidates, metadata }),
      bodies: (bodies, payloadBytes) => page.budget.spend("page", { bodies, payloadBytes }),
    });
    if (!answer.ok) return { ok: false, reason: answer.reason === "row-too-large" || answer.reason === "too-large" ? "too-large" : "unavailable" };
    replies[page.name] = parseStrict(answer.serialized);
  }
  const journals: Record<string, unknown> = {};
  for (const [name, source] of Object.entries(projection.sources)) if (isApplicationJournalSource(source)) {
    const read = applicationProjectionJournal(sql, frame, source, budgets[name]!);
    if (!read.ok) return read;
    journals[name] = read.value;
  }
  const factTimes: Record<string, unknown> = {};
  for (const [name, source] of Object.entries(projection.sources)) if (!isApplicationJournalSource(source)
    && Object.values(source.fields).some(field => field.from.kind === "fact-time")) {
    const reply = replies[name] as ItemQueryRead;
    if (!reply.ok) return { ok: false, reason: "unavailable" };
    const refs = applicationProjectionFactRefs(source, frame.scope.at, reply.at, reply.value.items);
    const read = applicationProjectionFactTimes(sql, frame, refs, budgets[name]!);
    if (!read) return { ok: false, reason: "unavailable" };
    factTimes[name] = read;
  }
  const factSigners: Record<string, unknown> = {};
  for (const [name, source] of Object.entries(projection.sources)) if (!isApplicationJournalSource(source)
    && Object.values(source.fields).some(field => field.from.kind === "fact-signer")) {
    const reply = replies[name] as ItemQueryRead;
    if (!reply.ok) return { ok: false, reason: "unavailable" };
    const refs = applicationProjectionFactRefs(source, frame.scope.at, reply.at, reply.value.items, "fact-signer");
    const read = applicationProjectionFactSigners(sql, frame, refs, budgets[name]!);
    if (!read) return { ok: false, reason: "unavailable" };
    factSigners[name] = read;
  }
  return { ok: true, value: projectApplicationQueryReads(projection, definition.declared, frame.scope.at, items, replies, journals, factTimes, factSigners) };
}
