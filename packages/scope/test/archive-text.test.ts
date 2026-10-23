import { archiveTextChange } from "./definition-corpus-data.ts";
/** Real native detached-text retention and export inventory. Policy and
 * authority are TEST stand-ins. Replay uses the native exported journal. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { variant } from "@generalbusiness/dap-derive/testing";
import { buildJournalPass, type JournalPassArchive } from "@generalbusiness/dap-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/dap-git/journal-reader";
import { archiveSource, verifyArchive, render, TRUSTS, type ArchiveSourceOptions } from "@generalbusiness/dap-replay";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { planArchive, planArchivePass, planArchiveConversion } from "../src/archive-build.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { readArchiveTextBytes } from "../src/archive-text.ts";
import { archiveInput } from "../src/archive-input.ts";
import type { Sql } from "../src/sqlite.ts";
import { at, create, rita } from "./fixtures-native.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";

test("v2 records the native canonical text byte count without reading its body while v1 keeps its old omission", async () => {
  const definition = variant(archiveDefinition.declared, archiveTextChange());
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
  const read = (archive: JournalPassArchive) => {
    const objects = new Map(archive.objects.map(object => [object.id, object])), budget = new ArchiveBudget(); let bytes = 0;
    return readJournalRepositoryArchive({ format: async () => "sha1", resolve: async () => archive.commit,
      object: async (id, maximum) => { const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null; },
    }, lane.name, Object.assign(budget, { scope: () => budget.spend({ nodes: 1 }), bytes: (size: number) => { bytes += size; if (bytes > 8 * 1024 * 1024) budget.stop("limit"); } }));
  };
  const opened = await read(built.pass.archive);
  expect(opened.ok ? "accepted" : opened).toBe("accepted"); if (!opened.ok) return;
  expect(opened.archive.omittedTexts).toEqual([{ digest, bytes, first: { scope: lane.name, seq: 1 } }]);
  const replay = (archive: JournalPassArchive, options: ArchiveSourceOptions = {}) => {
    const objects = new Map(archive.objects.map(object => [object.id, object]));
    return verifyArchive(archiveSource({ open: (scope, work) => readJournalRepositoryArchive({
      format: async () => "sha1", resolve: async () => archive.commit,
      object: async (id, maximum) => { const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null; },
    }, scope, work) }, options), { mode: "replay", scope: lane.name, head: through, grants: "as-recorded" });
  };
  // A legacy external-text hook is deliberately supplied as a trap: a
  // measured omission must never call it or pretend that it read the body.
  let textReads = 0;
  const offline = await replay(built.pass.archive, { texts: { read: async () => { textReads++; return { ok: true, text }; } } });
  expect(offline).toMatchObject({ kind: "verification", verification: { report: { result: "consistent", omittedTexts: [
    { digest, bytes, first: { at: lane.at, seq: 1, hash: through.hash } },
  ] } } });
  expect(textReads).toBe(0);
  if (offline.kind === "verification") {
    expect(offline.verification.report.incompleteBytes).toBeUndefined();
    expect(offline.verification.report.trusts).toContain(TRUSTS.omitted);
    expect(render(offline.verification.report)).toContain(`${digest}: ${bytes} bytes`);
    expect(render(offline.verification.report)).not.toContain(text);
  }
  // Deliberately corrupt only clone metadata, starting from the actual
  // native export and the same native entry/input port. No fake journal.
  const selection = JSON.parse(built.pass.mark.manifest), extra = structuredClone(selection.omittedTexts[0]);
  extra.key.digest = textDigest("TEST unrelated omission"); selection.omittedTexts.push(extra);
  const corrupted = await lane.inside(state => {
    const budget = new ArchiveBudget(); budget.spend(selection.cost);
    return buildJournalPass({ format: "sha1", selection: canonicalize(selection), input: archiveInput(archiveSql(state), selection, budget), parent: null, budget });
  });
  expect(corrupted.ok ? "accepted" : corrupted).toBe("accepted"); if (!corrupted.ok) return;
  expect(await read(corrupted.archive)).toMatchObject({ ok: false, result: "refused" });
  selection.omittedTexts = [];
  const missing = await lane.inside(state => {
    const budget = new ArchiveBudget(); budget.spend(selection.cost);
    return buildJournalPass({ format: "sha1", selection: canonicalize(selection), input: archiveInput(archiveSql(state), selection, budget), parent: null, budget });
  });
  expect(missing.ok ? "accepted" : missing).toBe("accepted"); if (!missing.ok) return;
  expect(await replay(missing.archive)).toMatchObject({ kind: "verification", verification: { report: { result: "incomplete", at: { at: lane.at, seq: 1, hash: through.hash }, incompleteBytes: [{ scope: lane.at, from: 1, through: 1, reason: "retained text unavailable" }] } } });
});
