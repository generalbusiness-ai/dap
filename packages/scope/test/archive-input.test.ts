/** Native journal/retention rows and real SQLite. Selection descriptors in
 * these focused port tests are test-authored, not export policy admission. */
import { expect, test } from "vitest";
import { canonicalize, utf8 } from "@generalbusiness/artroom-bytes";
import { archiveInput } from "../src/archive-input.ts";
import type { ArchiveInputSelection } from "../src/archive-input.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { create, definition } from "./fixtures-native.ts";

// Invariant: rebuild input reads exactly named positions and keys, even after
// a native turn appends new entries; every other request performs no SQL read.
test("reads only immutable selection keys from native SQLite", async () => {
  const lane = await create(), sealed = (await lane.sealed())[0]!, bytes = canonicalize(sealed.entry), declaration = canonicalize(definition.declared);
  const selected: ArchiveInputSelection = { entries: [{ seq: 0, hash: sealed.hash, bytes: utf8(bytes).length }], objects: [{ key: { kind: "definition", digest: definition.digest }, bytes: utf8(declaration).length }] };
  await lane.submit(lane.remark("later native entry"));
  await lane.restart();
  const read = await lane.inside(async state => {
    const calls: { query: string; args: unknown[] }[] = [], budget = new ArchiveBudget();
    const input = archiveInput({ exec(query, ...args) { calls.push({ query, args }); return state.storage.sql.exec(query, ...args); }, transaction: action => state.storage.transactionSync(action) }, selected, budget);
    const entry = await input.entry(0, utf8(bytes).length), retained = await input.retained({ kind: "definition", digest: definition.digest }, utf8(declaration).length);
    const allowedCalls = calls.length;
    expect(await input.entry(1, utf8(bytes).length)).toBeNull();
    expect(await input.entry(0, utf8(bytes).length + 1)).toBeNull();
    expect(await input.retained({ kind: "rule", digest: definition.digest }, 32)).toBeNull();
    expect(calls.length).toBe(allowedCalls);
    return { entry, retained, calls, cost: budget.admitted() };
  });
  expect(read.entry).toBe(bytes); expect(read.retained).toBe(declaration);
  expect(read.cost.attempts).toBe(5);
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
