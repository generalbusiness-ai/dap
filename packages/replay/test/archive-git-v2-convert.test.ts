/** Real local Git over synthetic admitted selections. No native policy,
 * archive confirmation, provider or deployment acceptance is claimed. */
import { afterAll, expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { archiveSource, verifyArchive } from "../src/index.ts";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { buildJournalArchive } from "../../git/src/journal-layout.ts";
import { convertJournalArchiveV1 } from "../../git/src/journal-v2-convert.ts";
import { buildJournalPass } from "../../git/src/journal-v2-layout.ts";
import { readJournalArchiveV2 } from "../../git/src/journal-v2-reader.ts";
import { journalV2RetainedPath, journalV2SegmentPath } from "../../git/src/journal-v2-path.ts";
import { archiveObjectSource, archiveRepository, described, rewriteArchiveFile, selectedInput, syntheticJournal, writeArchiveObjects } from "../../git/test/support/journal.ts";
import { cleanup, git } from "../../git/test/support/repo.ts";

afterAll(cleanup);
test("a v1 conversion preserves every old body and receipt before a v2 append, without fetching old files or ancestry", async () => {
  const directory = archiveRepository("sha1"), fixture = syntheticJournal(65);
  let old: string | null = null;
  for (const count of [1, 64]) {
    const part = syntheticJournal(count), selection = described(part);
    const built = await buildJournalArchive({ format: "sha1", ...selection, input: selectedInput(part),
      parent: old ? { id: old, source: archiveObjectSource(directory) } : null });
    expect(built.ok ? "accepted" : built).toBe("accepted"); if (!built.ok) return;
    writeArchiveObjects(directory, built.archive.objects); old = built.archive.commit;
  }
  const prefix = syntheticJournal(64), calls: string[] = [], objectCalls: { id: string; limit: number }[] = [];
  const budget = new ArchiveBudget({}, () => 0);
  budget.spend({ entries: 64, attempts: prefix.description.objects.length });
  const selection = canonicalize({ ...prefix.description, format: "artroom-local-inventory-2", after: null,
    objects: prefix.description.objects.map(row => ({ ...row, pass: 0 })), cost: budget.admitted() });
  const converted = await convertJournalArchiveV1({ format: "sha1", selection, input: selectedInput(prefix, calls),
    parent: { id: old!, source: archiveObjectSource(directory, objectCalls) }, budget });
  expect(converted.ok ? "accepted" : converted).toBe("accepted"); if (!converted.ok) return;
  expect(new Set(objectCalls.map(call => call.id))).toEqual(new Set([old]));
  expect(calls.filter(call => call.startsWith("entry:"))).toHaveLength(64);
  expect(converted.archive.newInterval).toEqual([64, 63]);
  expect(converted.archive.manifest).toMatchObject({ v: 2, entries: [0, 63], through: prefix.description.through, parent: old });
  expect(converted.archive.manifest.retained.every(row => row.pass === 0)).toBe(true);
  writeArchiveObjects(directory, converted.archive.objects);
  expect(git(directory, ["rev-parse", `${converted.archive.commit}^`])).toBe(old);
  const oldFiles = git(directory, ["ls-tree", "-r", old!]).split("\n");
  const newFiles = git(directory, ["ls-tree", "-r", converted.archive.commit]).split("\n");
  expect(newFiles.every(line => line.includes("\tjournal/v2/"))).toBe(true);
  for (const line of oldFiles) {
    const [meta, path] = line.split("\t") as [string, string];
    if (path.includes("/segments/")) expect(newFiles).toContain(`${meta}\t${journalV2SegmentPath(0, Number(path.split("/").at(-1)!.split(".")[0]))}`);
    else if (path.includes("/retained/")) {
      const key = prefix.description.objects.find(row => path.endsWith(row.key.digest.slice(7)))!.key;
      expect(newFiles).toContain(`${meta}\t${journalV2RetainedPath(0, key)}`);
    }
  }
  const source = archiveObjectSource(directory), broken = rewriteArchiveFile(directory, old!, "journal/v1/head.json", "{}");
  const negativeBudget = new ArchiveBudget({}, () => 0);
  negativeBudget.spend({ entries: 64, attempts: prefix.description.objects.length });
  const refused = await convertJournalArchiveV1({ format: "sha1", selection, input: selectedInput(prefix),
    parent: { id: broken, source }, budget: negativeBudget });
  expect(refused.ok ? "accepted" : refused).toEqual({ ok: false, reason: "parent" });
  const next = fixture.description.entries[64]!;
  const nextBudget = new ArchiveBudget({}, () => 0); nextBudget.spend({ entries: 1 });
  const appended = await buildJournalPass({ format: "sha1", selection: canonicalize({ ...fixture.description,
    format: "artroom-local-inventory-2", after: prefix.description.through, entries: [next], objects: [], omittedTexts: [],
    cost: nextBudget.admitted() }), input: selectedInput(fixture),
    parent: { id: converted.archive.commit, source }, budget: nextBudget });
  expect(appended.ok ? "accepted" : appended).toBe("accepted"); if (!appended.ok) return;
  writeArchiveObjects(directory, appended.archive.objects);
  expect(git(directory, ["fsck", "--strict", "--no-dangling", appended.archive.commit])).toBe("");
  const offline = await verifyArchive(archiveSource({ open: (scope, work) => readJournalArchiveV2({
    format: async () => "sha1", resolve: async () => appended.archive.commit,
    object: (id, limit) => source.object(id, limit),
  }, scope, work) }), { mode: "integrity", scope: fixture.at.scope, head: fixture.description.through });
  expect(offline.kind === "verification" ? offline.verification.report.result : offline).toBe("consistent");
}, 30_000);
