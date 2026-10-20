/** Real native detached-text retention and export inventory. Policy and
 * authority are TEST stand-ins. This checks metadata, not omission replay. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, textDigest, utf8 } from "@generalbusiness/artroom-bytes";
import { variant } from "@generalbusiness/dap-derive/testing";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { planArchive, planArchivePass, planArchiveConversion } from "../src/archive-build.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { readArchiveTextBytes } from "../src/archive-text.ts";
import type { Sql } from "../src/sqlite.ts";
import { at, create, rita } from "./fixtures-native.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";

test("v2 records the native canonical text byte count without reading its body while v1 keeps its old omission", async () => {
  const definition = variant(archiveDefinition.declared, data => { data.acts["remark"]!.fields["text"] = { type: "text", max: 1024, detached: true, required: true }; });
  const base = archivePolicies.get(archiveDefinition.digest)!;
  const policies = new Map([[definition.digest, { ...base, support: { ...base.support, named: definition.digest, definition } }]]);
  const lane = await create({}, {}, definition), text = 'TEST omitted text: newline\nquote" music🎵', digest = textDigest(text);
  const answer = await lane.stub.submit(lane.intent(rita, "remark", { on: 0, fields: { text: digest } }), lane.grants(), { texts: [text] });
  expect(answer.answer).toBe("accepted");
  const through = await lane.head(), queries: string[] = [];
  const built = await lane.inside(async state => {
    const sql = archiveSql(state), guarded: Sql = { transaction: sql.transaction, exec(query, ...args) {
      if (query.includes("FROM retained_input") && (query.includes("kind = 'text'") || args[0] === "text")) {
        queries.push(query);
      }
      const rows = sql.exec(query, ...args).toArray();
      for (const row of rows) {
        expect(Object.values(row)).not.toContain(text);
        expect(Object.values(row)).not.toContain(canonicalize(text));
      }
      return { toArray: () => rows };
    } };
    const absent = readArchiveTextBytes(guarded, textDigest("TEST absent"), new ArchiveBudget());
    const pass = await planArchivePass(guarded, { at: lane.at, through, after: null, bounds: PROPOSED_BOUNDS, policies,
      format: "sha1", parent: null, markedAt: at(0) }, new ArchiveBudget());
    const beforeLegacy = queries.length;
    const legacy = await planArchive(guarded, { at: lane.at, through, bounds: PROPOSED_BOUNDS, policies,
      format: "sha1", parent: null, markedAt: at(0) }, new ArchiveBudget());
    const afterLegacy = queries.length;
    if (!legacy.ok) return { absent, pass, legacy, beforeLegacy, afterLegacy, converted: legacy };
    const rows = new ArchiveRows(sql, lane.at); rows.target(archiveRepository, "sha1"); rows.mark(legacy.mark); rows.confirm(legacy.mark.commit);
    const held = new Map(legacy.archive.objects.map(object => [object.id, object]));
    const converted = await planArchiveConversion(guarded, { row: rows.load()!, bounds: PROPOSED_BOUNDS, policies, markedAt: at(1), parent: {
      id: legacy.mark.commit, source: { object: async (id, maximum) => {
        const object = held.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
      } },
    } }, new ArchiveBudget());
    return { absent, pass, legacy, beforeLegacy, afterLegacy, converted };
  });
  expect(built.absent).toBeNull(); expect(built.beforeLegacy).toBeGreaterThan(1); expect(built.afterLegacy).toBe(built.beforeLegacy);
  expect(built.pass.ok ? "accepted" : built.pass).toBe("accepted");
  expect(built.legacy.ok ? "accepted" : built.legacy).toBe("accepted");
  expect(built.converted.ok ? "accepted" : built.converted).toBe("accepted");
  if (!built.pass.ok || !built.legacy.ok || !built.converted.ok) return;
  const bytes = utf8(canonicalize(text)).length;
  expect(bytes).toBeGreaterThan(utf8(text).length);
  expect(built.pass.archive.manifest.omitted).toEqual([{ kind: "text", digest, reason: "detached-text", bytes,
    first: { scope: lane.name, seq: 1 } }]);
  expect(built.legacy.archive.manifest.omitted).toEqual([{ kind: "text", digest, reason: "detached-text" }]);
  expect(built.converted.archive.manifest.omitted).toEqual(built.pass.archive.manifest.omitted);
  expect(built.pass.archive.objects.some(object => object.type === "blob" && new TextDecoder().decode(object.data) === canonicalize(text))).toBe(false);
  expect(built.legacy.archive.objects.some(object => object.type === "blob" && new TextDecoder().decode(object.data) === canonicalize(text))).toBe(false);
});
