/** Synthetic selections over real entry bytes and Git objects. No native
 * admission, confirmation, floor, service or provider is claimed here. */
import { afterAll, expect, test } from "vitest";
import { canonicalize, entryHash, parseStrict } from "@generalbusiness/dap-bytes";
import type { Entry } from "@generalbusiness/dap-contract";
import { archiveSource, verifyArchive } from "../src/index.ts";
import { gitSource } from "../src/git.ts";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { buildJournalPass } from "../../git/src/journal-v2-layout.ts";
import { prepareJournalPass, type JournalPassPreparation } from "../../git/src/journal-v2-preparation.ts";
import { readJournalArchiveV2 } from "../../git/src/journal-v2-reader.ts";
import { journalRef } from "../../git/src/journal-path.ts";
import type { JournalReadResult } from "../../git/src/journal-reader.ts";
import { journalV2PassPath, journalV2SegmentPath } from "../../git/src/journal-v2-path.ts";
import { ArchiveSegmentCursor } from "../../git/src/journal-segments.ts";
import { archiveObjectSource, archiveRepository, selectedInput, syntheticJournal, writeArchiveObjects } from "../../git/test/support/journal.ts";
import { cleanup, git } from "../../git/test/support/repo.ts";

afterAll(cleanup);
test("three v2 passes cover ten thousand entries without rereading old entries or rewriting earlier files", async () => {
  const fixture = syntheticJournal(10_000), calls: string[] = [], directory = archiveRepository("sha1");
  const input = selectedInput(fixture, calls);
  let previous: { commit: string; through: { seq: number; hash: ReturnType<typeof entryHash> } } | null = null;
  let priorFiles: string[] = [];
  for (const [first, last] of [[0, 4095], [4096, 8191], [8192, 9999]] as const) {
    const budget = new ArchiveBudget({}, () => 0), entries = fixture.description.entries.slice(first, last + 1);
    const objects = first === 0 ? fixture.description.objects.map(object => ({ ...object, pass: 0 }))
      : [{ ...fixture.description.objects[0]!, pass: 0, consumers: [{ mode: "required", origin: {
        at: { at: fixture.at, seq: first, hash: entries[0]!.hash }, input: "checkpoint",
      }, consumer: "rule-input", purpose: "replay-required", key: fixture.description.objects[0]!.key }] }];
    budget.spend({ entries: entries.length, attempts: objects.length });
    const selection = canonicalize({ ...fixture.description, format: "artroom-local-inventory-2", entries, objects,
      after: previous?.through ?? null, through: { seq: last, hash: entries.at(-1)!.hash },
      omittedTexts: first === 0 ? fixture.description.omittedTexts : [], cost: budget.admitted() });
    calls.length = 0;
    const parent = previous ? { id: previous.commit, source: archiveObjectSource(directory) } : null;
    let preparation: JournalPassPreparation | undefined;
    if (first === 8192) {
      const before = budget.admitted();
      const prepared = await prepareJournalPass({ format: "sha1", at: fixture.at, after: previous!.through, parent, budget });
      expect(prepared.ok, JSON.stringify(prepared)).toBe(true); if (!prepared.ok) return;
      preparation = prepared.preparation;
      preparation.work.metadata(256);
      const grouping = new ArchiveSegmentCursor(entries.reduce((n, entry) => n + entry.bytes, 0) + entries.length - 1);
      for (const entry of entries) {
        const firstSegment = grouping.append(entry.seq, entry.bytes);
        if (firstSegment !== null) await preparation.prepare([journalV2SegmentPath(first, firstSegment)]);
      }
      const attributed = preparation.metadataCost(), live = budget.admitted();
      for (const key of Object.keys(before) as (keyof typeof before)[]) {
        expect(live[key] - attributed[key]).toBe(before[key] + (key === "metadata" || key === "inputWork" ? 256 : 0));
      }
      expect(grouping.segments).toBe(2);
      expect(calls).toEqual([]); // No entry or retained input before metadata preparation.
      expect(preparation.work.budget).toBe(budget);
      expect(await buildJournalPass({ format: "sha1", selection, input, parent, budget: new ArchiveBudget({}, () => 0), preparation }))
        .toEqual({ ok: false, reason: "parent" });
      expect(calls).toEqual([]);
    }
    const built = await buildJournalPass({ format: "sha1", selection, input, parent, budget, ...(preparation ? { preparation } : {}) });
    expect(built.ok, JSON.stringify(built)).toBe(true); if (!built.ok) return;
    expect(built.archive.newInterval).toEqual([first, last]);
    if (preparation) {
      const beforeReuse = calls.length;
      expect(await buildJournalPass({ format: "sha1", selection, input, parent, budget, preparation })).toEqual({ ok: false, reason: "unavailable" });
      expect(calls.length).toBe(beforeReuse);
    }
    expect(calls.filter(call => call.startsWith("entry:"))).toEqual(entries.map(entry => `entry:${entry.seq}`));
    if (first !== 0) expect(calls.every(call => call.startsWith("entry:"))).toBe(true);
    writeArchiveObjects(directory, built.archive.objects);
    const files = git(directory, ["ls-tree", "-r", built.archive.commit]).split("\n");
    expect(files.some(line => line.endsWith("\t" + journalV2PassPath(first)))).toBe(true);
    expect(files.some(line => line.endsWith("\t" + journalV2SegmentPath(first)))).toBe(true);
    for (const old of priorFiles.filter(line => !line.endsWith("\tjournal/v2/head.json"))) expect(files).toContain(old);
    expect(git(directory, ["fsck", "--strict", "--no-dangling", built.archive.commit])).toBe("");
    if (first !== 0) {
      // Hash and descriptor agree, but the first entry does not follow the
      // confirmed receipt. A copied body cannot choose a different chain.
      const raw = parseStrict(fixture.bodies[first]!) as Entry;
      const bad = { ...raw, prev: fixture.description.entries[0]!.hash }, bytes = canonicalize(bad), hash = entryHash(bad);
      const changed = JSON.parse(selection); changed.entries[0].hash = hash;
      for (const object of changed.objects) for (const consumer of object.consumers) consumer.origin.at.hash = hash;
      const control = new ArchiveBudget({}, () => 0); control.spend({ entries: entries.length, attempts: objects.length });
      const refused = await buildJournalPass({ format: "sha1", selection: canonicalize(changed), parent, budget: control,
        input: { ...input, entry: (seq, limit) => seq === first ? Promise.resolve(bytes) : input.entry(seq, limit) },
      });
      expect(refused.ok ? "accepted" : refused).toEqual({ ok: false, reason: "input-mismatch", where: `entry:${first}` });
    }
    previous = { commit: built.archive.commit, through: built.archive.manifest.through }; priorFiles = files;
  }
  const captured: JournalReadResult[] = [], source = archiveObjectSource(directory);
  const offline = await verifyArchive(archiveSource({ open: async (scope, work) => {
    const read = await readJournalArchiveV2({ format: async () => "sha1", resolve: async () => previous!.commit,
      object: (id, limit) => source.object(id, limit),
    }, scope, work);
    captured.push(read); return read;
  } }), { mode: "integrity", scope: fixture.at.scope, head: fixture.description.through });
  expect(offline.kind === "verification" ? offline.verification.report.result : offline).toBe("consistent");
  const opened = captured[0]!;
  expect(opened.ok, JSON.stringify(opened.ok ? { ok: true } : opened)).toBe(true);
  if (opened.ok) {
    expect(opened.archive.entries.map(entry => entry.bytes)).toEqual(fixture.bodies);
    expect(opened.archive.head).toEqual(fixture.description.through);
    expect(Object.isFrozen(opened.archive.entries[0])).toBe(true);
  }
  git(directory, ["update-ref", journalRef(fixture.at.scope), previous!.commit]);
  const local = await verifyArchive(gitSource(directory), { mode: "integrity", scope: fixture.at.scope, head: fixture.description.through });
  expect(local.kind === "verification" ? local.verification.report.result : local).toBe("consistent");
  const limited = await verifyArchive(archiveSource({ open: (scope, work) => readJournalArchiveV2({
    format: async () => "sha1", resolve: async () => previous!.commit, object: (id, limit) => source.object(id, limit),
  }, scope, work, { entries: 9999 }) }), { mode: "integrity", scope: fixture.at.scope });
  expect(limited).toMatchObject({ kind: "archive-failure", result: "limit" });
}, 30_000);
