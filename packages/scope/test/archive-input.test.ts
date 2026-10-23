/** Native journal/retention rows and real SQLite. Selection descriptors in
 * these focused port tests are test-authored, not export policy admission. */
import { expect, test } from "vitest";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { archiveInput } from "../src/archive-input.ts";
import type { ArchiveInputSelection } from "../src/archive-input.ts";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { archiveEntryReadForecast, archiveInputBaseReservation, archiveInputRetainedReadForecast } from "../src/archive-input-cost.ts";
import { create, definition } from "./fixtures-native.ts";

const difference = (after: ArchiveCost, before: ArchiveCost): ArchiveCost => Object.fromEntries(
  Object.keys(after).map(key => [key, after[key as keyof ArchiveCost] - before[key as keyof ArchiveCost]]),
) as ArchiveCost;

// Invariant: rebuild input reads exactly named positions and keys, even after
// a native turn appends new entries; every other request performs no SQL read.
test("reads only immutable selection keys from native SQLite", async () => {
  const lane = await create(), sealed = (await lane.sealed())[0]!, bytes = canonicalize(sealed.entry), declaration = canonicalize(definition.declared);
  const selected: ArchiveInputSelection = { entries: [{ seq: 0, hash: sealed.hash, bytes: utf8(bytes).length }], objects: [{ key: { kind: "definition", digest: definition.digest }, bytes: utf8(declaration).length }] };
  await lane.submit(lane.remark("later native entry"));
  await lane.restart();
  const read = await lane.inside(async state => {
    const calls: { query: string; args: unknown[] }[] = [], budget = new ArchiveBudget();
    const before = budget.admitted();
    const input = archiveInput({ exec(query, ...args) { calls.push({ query, args }); return state.storage.sql.exec(query, ...args); }, transaction: action => state.storage.transactionSync(action) }, selected, budget);
    const initialized = budget.admitted();
    const entry = await input.entry(0, utf8(bytes).length), entryEnd = budget.admitted();
    const retained = await input.retained({ kind: "definition", digest: definition.digest }, utf8(declaration).length), retainedEnd = budget.admitted();
    expect(await input.entry(0, utf8(bytes).length)).toBe(bytes); const repeatedEntryEnd = budget.admitted();
    expect(await input.retained({ kind: "definition", digest: definition.digest }, utf8(declaration).length)).toBe(declaration);
    const repeatedRetainedEnd = budget.admitted(), zero = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
    // Original counter formulas, captured before extracting input pricing.
    // Retained cache hits still reserve all repeated validation work.
    expect(difference(initialized, before)).toEqual({ ...zero, metadata: 384, inputWork: 768 });
    const entryCost = { ...zero, attempts: 1, calls: 2, metadata: 128, inputWork: 384 + utf8(bytes).length * 9 };
    expect(difference(entryEnd, initialized)).toEqual(entryCost);
    expect(difference(repeatedEntryEnd, retainedEnd)).toEqual(entryCost);
    expect(difference(retainedEnd, entryEnd)).toEqual({ ...zero, attempts: 1, calls: 2, metadata: 96,
      inputWork: 352 + utf8(declaration).length * 33 + declaration.length * 3 });
    expect(difference(repeatedRetainedEnd, repeatedEntryEnd)).toEqual({ ...zero, attempts: 1, inputWork: 256 + declaration.length * 99 });
    expect(difference(initialized, before)).toEqual({ ...zero, ...archiveInputBaseReservation(1, 1) });
    expect(difference(entryEnd, initialized)).toEqual({ ...zero, ...archiveEntryReadForecast(utf8(bytes).length) });
    expect(difference(repeatedEntryEnd, retainedEnd)).toEqual({ ...zero, ...archiveEntryReadForecast(utf8(bytes).length) });
    const retainedForecast = archiveInputRetainedReadForecast(utf8(declaration).length);
    for (const cost of [difference(retainedEnd, entryEnd), difference(repeatedRetainedEnd, repeatedEntryEnd)]) {
      for (const key of Object.keys(zero) as (keyof ArchiveCost)[]) expect(cost[key]).toBeLessThanOrEqual(retainedForecast[key] ?? 0);
    }
    const allowedCalls = calls.length;
    expect(await input.entry(1, utf8(bytes).length)).toBeNull();
    expect(await input.entry(0, utf8(bytes).length + 1)).toBeNull();
    expect(await input.retained({ kind: "rule", digest: definition.digest }, 32)).toBeNull();
    expect(calls.length).toBe(allowedCalls);
    return { entry, retained, calls, cost: budget.admitted() };
  });
  expect(read.entry).toBe(bytes); expect(read.retained).toBe(declaration);
  expect(read.cost.attempts).toBe(7);
  expect(read.calls.every(call => call.query.includes(" WHERE ") && !call.query.includes("ORDER BY") && !call.query.includes("meta"))).toBe(true);
  for (const call of read.calls) expect(call.args[0]).toBe(call.query.includes(" FROM entry ") ? 0 : "definition");
});

// Invariant: an unreadable named body is missing rather than substituted,
// and the shared budget fences the SQL read before its body allocation.
test("returns no substitution for a missing named input and honors its original allowance", async () => {
  const lane = await create(), sealed = (await lane.sealed())[0]!, bytes = canonicalize(sealed.entry), declaration = canonicalize(definition.declared);
  const selected: ArchiveInputSelection = { entries: [{ seq: 0, hash: sealed.hash, bytes: utf8(bytes).length }], objects: [{ key: { kind: "definition", digest: definition.digest }, bytes: utf8(declaration).length }] };
  await lane.inside(async state => {
    const sql = { exec: (query: string, ...args: (string | number | null | ArrayBuffer | ArrayBufferView)[]) => state.storage.sql.exec(query, ...args), transaction: <T>(action: () => T) => state.storage.transactionSync(action) };
    const input = archiveInput(sql, selected, new ArchiveBudget());
    state.storage.sql.exec("DELETE FROM retained_input WHERE kind = 'definition' AND digest = ?", definition.digest);
    expect(await input.retained({ kind: "definition", digest: definition.digest }, utf8(declaration).length)).toBeNull();
    state.storage.sql.exec("UPDATE entry SET bytes = bytes || ' ' WHERE seq = 0");
    expect(await input.entry(0, utf8(bytes).length)).toBeNull();
    let calls = 0;
    const empty = archiveInput({ ...sql, exec(query, ...args) { calls++; return state.storage.sql.exec(query, ...args); } }, selected, new ArchiveBudget({ calls: 0 }));
    let stopped = false; try { await empty.entry(0, utf8(bytes).length); } catch { stopped = true; }
    expect(stopped).toBe(true); expect(calls).toBe(0);
  });
});
