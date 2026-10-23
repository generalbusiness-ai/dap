/** Session-only native projection at one captured journal head. The owner
 * authenticates before metadata peers, has one deadline and never retries. */
import { APPLICATION_PROJECTION_WIRE_BOUNDS as B, type ApplicationProjectionRefusal, type ScopeId } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isRecord, isScopeRef, parseStrict } from "@generalbusiness/dap-bytes";
import { applicationJson } from "@generalbusiness/dap-bytes/application";
import { timeMs } from "@generalbusiness/dap-derive";
import { applicationProjectionQueryDigest, ApplicationProjectionError, bindApplicationProjection, isApplicationJournalSource, readApplicationProjectionQuery } from "@generalbusiness/dap-bytes/application-v2";
import { ItemQueryBudget } from "../item-query-budget.ts";
import { PreparationFlights, type PreparationRun } from "../preparation-flight.ts";
import { preparedSessionRefusal, type QueryVisibility, type SessionPreparation } from "../session-preparation.ts";
import { authenticateSession, type Sessions } from "../sessions.ts";
import type { Clock } from "../ports.ts";
import type { Sql } from "../sqlite.ts";
import { APPLICATION_DECLARATION_BYTES, type ApplicationDeclarationSource } from "./projection-source.ts";
import { applicationProjectionData } from "./projection-data.ts";
import type { NativeBirthSource } from "../native-birth.ts";
import { projectionScopeOwned } from "./projection-ownership.ts";
export type NativeApplicationProjection = { ok: true; serialized: string } | { ok: false; reason: ApplicationProjectionRefusal };
const no = (reason: ApplicationProjectionRefusal): NativeApplicationProjection => ({ ok: false, reason });
export interface ApplicationProjectionConfig {
  name: ScopeId | null;
  sql: Pick<Sql, "exec">;
  sessions(): Sessions | null;
  clock: Clock;
  sessionPreparation: SessionPreparation;
  flights: PreparationFlights;
  source: ApplicationDeclarationSource | null;
  births?: NativeBirthSource | null;
}
export class ApplicationProjections {
  constructor(readonly config: ApplicationProjectionConfig) {}
  read(encoded: unknown, reader: unknown): Promise<NativeApplicationProjection> {
    return this.config.flights.run(run => this.#run(encoded, reader, run)).then(result => result ?? no("unavailable"));
  }
  async #run(encoded: unknown, reader: unknown, run: PreparationRun): Promise<NativeApplicationProjection> {
    const c = this.config, query = readApplicationProjectionQuery(encoded);
    if (!query || !c.name || query.scope.scope !== c.name) return no("invalid-query");
    if (typeof reader !== "string" || reader.length > B.sessionChars || reader.startsWith("Signed ")) return no("forbidden");
    const authenticated = authenticateSession(c.sessions, reader);
    if (!("claims" in authenticated)) return no(authenticated.refused || "forbidden");
    const reading = timeMs(c.clock.read()), ends = timeMs(authenticated.claims.ends);
    if (reading === null || ends === null || reading >= ends) return no("forbidden");
    const preparation = new ItemQueryBudget("session", run.active);
    const result = await c.sessionPreparation.prepare(reader, "empty", run, preparation.preparation("preparation"), () => {
      preparation.spend("preparation", { rpcs: 1 }); preparation.reservePeerPreparation();
    });
    if (!run.active() || !preparation.available) return no("unavailable");
    if (!result.ok) return no(result.reason);
    const { prepared } = result, { frame } = prepared;
    if (canonicalize(frame.scope.at) !== canonicalize(query.scope)) return no("wrong-scope");
    const definition = frame.pinned.definition;
    if (!definition || frame.scope.status !== "active" || !isDigest(frame.pinned.named) || !c.source) return no("query-not-ready");
    const reply = await c.source.read(query.directory, query.install, query.projection, run);
    if (!run.active() || !preparation.available) return no("unavailable");
    try {
      const metadata: unknown = parseStrict(applicationJson(reply, APPLICATION_DECLARATION_BYTES));
      if (!isRecord(metadata) || Object.keys(metadata).sort().join() !== "definition,installation,name,projection,v" || metadata["v"] !== 1
        || metadata["name"] !== query.projection || !isRecord(metadata["installation"]) || !isRecord(metadata["definition"])) return no("query-not-ready");
      const installed = metadata["installation"], declared = metadata["definition"];
      if (installed["item"] !== query.install || !isDigest(installed["definition"]) || declared["id"] !== definition.digest
        || declared["bytes"] !== canonicalize(definition.declared) || !isScopeRef(installed["scope"]) || !isScopeRef(installed["directory"])
        || !isScopeRef(installed["membership"])
        || canonicalize(installed["directory"]) !== canonicalize(query.directory) || canonicalize(installed["membership"]) !== canonicalize(prepared.membership)) return no("query-not-ready");
      const projection = bindApplicationProjection(metadata["projection"], definition.declared);
      const owned = await projectionScopeOwned(frame, installed["scope"], installed["definition"], query.directory, c.births ?? null, run);
      if (!run.active() || !preparation.available) return no("unavailable");
      if (owned !== "owned") return no(owned === "too-large" ? "too-large" : owned === "unavailable" ? "unavailable" : "query-not-ready");
      let live = false, hasFinal = false, history = false;
      for (const source of Object.values(projection.sources)) {
        if (isApplicationJournalSource(source)) { history = true; continue; }
        for (const state of source.states) {
          if (definition.declared.items[source.item]!.states[state]!.final) hasFinal = true; else live = true;
        }
      }
      const visibility: QueryVisibility = live && hasFinal ? "mixed" : hasFinal ? "final" : live ? "live" : "empty";
      const guard = () => preparedSessionRefusal(c, frame, reader, visibility, prepared.membership, prepared.resolvedBirth, history);
      if (!frame.current() || !run.active()) return no("unavailable");
      const denied = guard(); if (denied !== null) return no(denied);
      const projected = applicationProjectionData(c.sql, frame, projection, query.items, run.active);
      if (!projected.ok) return no(projected.reason);
      const serialized = applicationJson({ ok: true, query: applicationProjectionQueryDigest(query), value: projected.value }, B.resultBytes);
      if (!run.active() || !preparation.available || !frame.current() || !run.active()) return no("unavailable");
      // LAST authority check: no storage, support callback, await or write follows.
      const final = guard(); return final === null ? { ok: true, serialized } : no(final);
    } catch (error) {
      return no(error instanceof ApplicationProjectionError && ["incomplete", "stale"].includes(error.reason) ? error.reason as "incomplete" | "stale"
        : error instanceof ApplicationProjectionError && error.reason === "limit" ? "too-large" : "unavailable");
    }
  }
}
