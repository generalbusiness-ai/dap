/** Synthetic selections over real entry bytes and Git objects. No native
 * admission, confirmation, floor, service or provider is claimed here. */
import { afterAll, expect, test } from "vitest";
import { canonicalize, entryHash, parseStrict } from "@generalbusiness/artroom-bytes";
import type { Entry } from "@generalbusiness/dap-contract";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { buildJournalPass } from "../src/journal-v2-layout.ts";
import { journalV2PassPath, journalV2SegmentPath } from "../src/journal-v2-path.ts";
import { archiveObjectSource, archiveRepository, selectedInput, syntheticJournal, writeArchiveObjects } from "./support/journal.ts";
import { cleanup, git } from "./support/repo.ts";

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
    const built = await buildJournalPass({ format: "sha1", selection, input, parent, budget });
    expect(built.ok, JSON.stringify(built)).toBe(true); if (!built.ok) return;
    expect(built.archive.newInterval).toEqual([first, last]);
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
      expect(await buildJournalPass({ format: "sha1", selection: canonicalize(changed), parent, budget: control,
        input: { ...input, entry: (seq, limit) => seq === first ? Promise.resolve(bytes) : input.entry(seq, limit) },
      })).toEqual({ ok: false, reason: "input-mismatch", where: `entry:${first}` });
    }
    previous = { commit: built.archive.commit, through: built.archive.manifest.through }; priorFiles = files;
  }
}, 30_000);
