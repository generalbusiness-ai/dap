/** Genuine native genesis/act rows and SQLite. This witnesses reference
 * projection only, not privacy admission, integrity, export or Replay. */
import { expect, test } from "vitest";
import { textDigest } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { readArchiveDigestFields } from "../src/archive-digest-fields.ts";
import type { SqlValue } from "../src/sqlite.ts";
import { create, definition, rita } from "./fixtures-native.ts";

test("native field projection returns only requested digest scalars, preserves slots and binds the exact source while charging repeated reads", async () => {
  const lane = await create(), note = "TEST inline note: the metadata reader must not return this";
  await lane.did(rita, "remark", { on: 0, fields: { text: note } });
  const result = await lane.inside(state => {
    const budget = new ArchiveBudget(), cells: unknown[] = [];
    const sql = { exec(query: string, ...args: SqlValue[]) {
      const rows = state.storage.sql.exec(query, ...args).toArray();
      for (const row of rows) cells.push(...Object.values(row));
      return { toArray: () => rows };
    } };
    // Test inputs come from actual keyed native size/hash metadata.
    const position = (seq: number) => {
      const row = state.storage.sql.exec<{ hash: string; size: number }>("SELECT hash, size FROM entry WHERE seq = ? LIMIT 1", seq).one();
      return { seq, hash: row.hash as typeof definition.digest, bytes: row.size };
    };
    const genesis = position(0), act = position(1);
    const read = (at: typeof genesis, paths: readonly string[]) => {
      try { return { ok: true as const, fields: readArchiveDigestFields(sql, at, paths, budget) }; }
      catch (error) { return { ok: false as const, reason: error && typeof error === "object" && "reason" in error ? error.reason : "unexpected" }; }
    };
    const single = read(genesis, ["$.input.seed.definition"]);
    const batch = read(genesis, ["$.input.seed.definition", "$.input.type", "$.absent"]);
    const inline = read(act, ["$.input.signed.intent.fields.text"]);
    const before = budget.admitted(), repeated = read(genesis, ["$.input.seed.definition"]), after = budget.admitted();
    const wrongSource = read({ ...genesis, hash: textDigest("TEST wrong source identity") }, ["$.input.seed.definition"]);
    return { single, batch, inline, repeated, wrongSource, cells, before, after };
  });
  // Observe SQL's actual returned cells before any JS digest guard: the
  // reader must not first return an inline string and then discard it.
  expect([...new Set(result.cells.filter(cell => typeof cell === "string"))]).toEqual([definition.digest]);
  expect(result.cells).not.toContain(note);
  expect(result.single).toEqual({ ok: true, fields: [definition.digest] });
  expect(result.batch).toEqual({ ok: true, fields: [definition.digest, null, null] });
  expect(result.inline).toEqual({ ok: true, fields: [null] });
  expect(result.repeated).toEqual(result.single);
  expect(result.after.calls).toBeGreaterThan(result.before.calls);
  expect(result.after.inputWork).toBeGreaterThan(result.before.inputWork);
  expect(result.wrongSource).toEqual({ ok: false, reason: "mismatch" });
});
