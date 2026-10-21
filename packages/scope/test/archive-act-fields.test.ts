/** Real native signed acts and SQLite. Root data and grants are TEST
 * fixtures. This is field projection, not complete dependency admission. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { isEntry, parseStrict, textDigest } from "@generalbusiness/artroom-bytes";
import { localRetainedPlan } from "@generalbusiness/dap-derive";
import { variant } from "@generalbusiness/dap-derive/testing";
import { ArchiveActFields } from "../src/archive-act-fields.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import type { SqlValue } from "../src/sqlite.ts";
import { create, definition, rita } from "./fixtures-native.ts";

test.each([false, true])("native act field projection shares the byte selector with detached=%s and ignores inline digest-shaped text", async detached => {
  const declared = variant(definition.declared, data => {
    data.acts["remark"]!.fields["text"] = { type: "text", max: 128, required: true, ...(detached ? { detached: true } : {}) };
    data.acts["remark"]!.fields["extra"] = { type: "text", max: 128, required: false };
  });
  const lane = await create({}, {}, declared), raw = "TEST native reference; no body projection 🎵";
  const digest = textDigest(raw), inline = textDigest("TEST digest-shaped inline field, never a detached consumer");
  const answer = await lane.stub.submit(lane.intent(rita, "remark", { on: 0, fields: { text: detached ? digest : inline, extra: inline } }), lane.grants(), detached ? { texts: [raw] } : {});
  expect(answer.answer).toBe("accepted");
  const result = await lane.inside(state => {
    // Only the test oracle reads the full genuine entry. The projector's
    // own SQL port below records exactly what crossed its boundary.
    const row = state.storage.sql.exec<{ bytes: string; size: number; hash: typeof digest }>("SELECT bytes, size, hash FROM entry WHERE seq = 1 LIMIT 1").one();
    const entry = parseStrict(row.bytes); if (!isEntry(entry)) return expect.fail("Native fixture must have a genuine entry.");
    const expected = localRetainedPlan(declared, entry, row.hash, null, PROPOSED_BOUNDS).dependencies.filter(({ dependency }) => dependency.mode === "text" || dependency.mode === "required" && dependency.consumer === "act-value");
    const budget = new ArchiveBudget(), cells: unknown[] = [];
    const sql = { exec(query: string, ...args: SqlValue[]) {
      const rows = state.storage.sql.exec(query, ...args).toArray();
      for (const held of rows) cells.push(...Object.values(held));
      return { toArray: () => rows };
    } };
    const reader = new ArchiveActFields(sql, declared, budget, PROPOSED_BOUNDS);
    const projected = reader.project(lane.at, { seq: 1, hash: row.hash, bytes: row.size });
    const before = budget.admitted();
    const repeated = reader.project(lane.at, { seq: 1, hash: row.hash, bytes: row.size }), after = budget.admitted();
    return { projected, repeated, expected, before, after, cells };
  });
  expect(result.projected.kind).toBe("remark");
  expect(result.projected.dependencies).toEqual(result.expected);
  expect(result.projected.dependencies.map(row => row.dependency.mode === "text" ? row.dependency.key.digest : "unexpected")).toEqual(detached ? [digest] : []);
  expect([...new Set(result.cells.filter(cell => typeof cell === "string"))]).toEqual(detached ? ["remark", digest] : ["remark"]);
  expect(result.cells).not.toContain(inline);
  expect(result.cells).not.toContain(raw);
  expect(result.repeated).toEqual(result.projected);
  expect(result.after.calls).toBeGreaterThan(result.before.calls);
  expect(result.after.inputWork).toBeGreaterThan(result.before.inputWork);
});
