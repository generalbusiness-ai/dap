/** Native rule preparation and SQLite. Definition, authority and clock are
 * the existing TEST lane fixtures; no privacy or export admission claim. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { isEntry, parseStrict } from "@generalbusiness/dap-bytes";
import { localRetainedPlan } from "@generalbusiness/dap-derive";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { ArchivePrepared } from "../src/archive-prepared.ts";
import { ArchiveLocalReferences } from "../src/archive-local-references.ts";
import type { SqlValue } from "../src/sqlite.ts";
import { create, definition } from "./fixtures-native.ts";

test("native prepared-rule projection names the actual retained input without exposing its bytes or result", async () => {
  const lane = await create(); await lane.commitment();
  const result = await lane.inside(state => {
    // Full-byte access belongs only to this oracle, not to the projector.
    const row = state.storage.sql.exec<{ bytes: string; hash: `sha256:${string}`; size: number }>("SELECT bytes, hash, size FROM entry WHERE seq = 2 LIMIT 1").one();
    const entry = parseStrict(row.bytes); if (!isEntry(entry)) return expect.fail("The genuine assignment entry is required.");
    const all = localRetainedPlan(definition, entry, row.hash, null, PROPOSED_BOUNDS).dependencies;
    const expected = all.filter(({ dependency }) => dependency.mode === "required" && dependency.consumer === "rule-input");
    const cells: unknown[] = [], queries: string[] = [], budget = new ArchiveBudget();
    const sql = { exec(query: string, ...args: SqlValue[]) {
      queries.push(query); const rows = state.storage.sql.exec(query, ...args).toArray();
      for (const held of rows) cells.push(...Object.values(held));
      return { toArray: () => rows };
    } };
    const reader = new ArchivePrepared(definition, budget, PROPOSED_BOUNDS), position = { seq: entry.seq, hash: row.hash, bytes: row.size, input: entry.input.type };
    const projected = reader.project(sql, lane.at, position), before = budget.admitted();
    const repeated = reader.project(sql, lane.at, position), after = budget.admitted();
    const empty = reader.project(sql, lane.at, { seq: 0, hash: lane.genesis.fact.hash, bytes: state.storage.sql.exec<{ size: number }>("SELECT size FROM entry WHERE seq = 0").one().size, input: "genesis" });
    const preparedCells = [...cells];
    const references = new ArchiveLocalReferences({ named: definition.digest, definition,
      owners: new Map(), records: new Map(), preparations: new Map() }, PROPOSED_BOUNDS, budget);
    const composed = references.read(sql, lane.at, position);
    return { projected, repeated, before, after, expected, empty, cells: preparedCells, queries, input: entry.prepared[0]?.input, composed, all };
  });
  expect(result.projected).toEqual(result.expected);
  expect(result.composed).toEqual({ dependencies: result.all, ancestrySnapshot: null });
  expect(result.projected).toHaveLength(1);
  expect(result.projected[0]).toMatchObject({ dependency: { mode: "required", consumer: "rule-input", key: { kind: "rule", digest: result.input } } });
  expect(result.repeated).toEqual(result.projected); expect(result.empty).toEqual([]);
  expect(result.after.calls).toBeGreaterThan(result.before.calls);
  expect(result.after.inputWork).toBeGreaterThan(result.before.inputWork);
  expect(new Set(result.cells.filter(cell => typeof cell === "string"))).toEqual(new Set(["array", "not-self", result.input]));
  expect(result.queries.every(query => !query.includes("retained_input") && !query.startsWith("SELECT bytes"))).toBe(true);
});
