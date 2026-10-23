/** Native driver fixture shared by functional and scale cases. Host,
 * and policy remain explicitly labelled test stand-ins. Opted-in lanes use
 * actual Native Membership authority with separately prepared fixture pins. */
import { expect } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { JournalFormat } from "@generalbusiness/dap-git/journal";
import type { ArchiveBudget } from "../../src/archive-budget.ts";
import { ArchiveDriver } from "../../src/archive-driver.ts";
import type { ArchivePolicyRegistry } from "../../src/archive-inventory.ts";
import type { Sql } from "../../src/sqlite.ts";
import { at, type Lane } from "../fixtures-native.ts";
import { ScriptedArchiveHost } from "./archive-provider.ts";
import { archiveAuthorityBasis, archiveAuthorityPolicies } from "./archive-native-authority.ts";
import { archivePolicies, archiveRepository, archiveSql } from "./archive.ts";

export class ScriptedHost extends ScriptedArchiveHost {
  constructor(format: JournalFormat) { super(format, () => atTime); }
}
const atTime = at(0);
export function driver(lane: Lane, state: DurableObjectState, host: ScriptedHost, budget?: () => ArchiveBudget, after?: number, policies: ArchivePolicyRegistry = archivePolicies, sql: Sql = archiveSql(state)) {
  return new ArchiveDriver({
    sql: after === undefined ? sql : { transaction: sql.transaction, exec(query, ...args) {
      if (/\bFROM entry\b/.test(query)) {
        // Scalar projection may bind JSON paths before the position. Check
        // the actual seq predicate's parameter, never the first argument.
        const source = query.replace(/'(?:''|[^'])*'/g, "''"), predicate = /\b(?:entry\.)?seq (>=|>|=) \?/.exec(source);
        expect(predicate, query).not.toBeNull();
        const index = (source.slice(0, predicate!.index).match(/\?/g) ?? []).length, seq = args[index];
        expect(typeof seq).toBe("number");
        if (predicate![1] === ">") expect(seq as number).toBeGreaterThanOrEqual(after);
        else expect(seq as number).toBeGreaterThan(after);
      }
      return sql.exec(query, ...args);
    } }, current: () => {
      const value = state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'scope'").one();
      const scope = JSON.parse(value.v); return { at: scope.at, head: scope.head };
    }, clock: () => lane.c.clock.now, bounds: PROPOSED_BOUNDS, policies: { fixture: "archive-policies", registry: archiveAuthorityPolicies(lane, policies) },
    ...(archiveAuthorityBasis(lane) ? { fixtureSources: archiveAuthorityBasis(lane)!.pins } : {}),
    target: { fixture: "archive-target", resolve: async () => { host.targets++; return archiveRepository; } }, provider: host, ...(budget ? { budget } : {}),
  });
}
