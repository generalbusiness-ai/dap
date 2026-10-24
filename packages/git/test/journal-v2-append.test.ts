/** Exact Git-edge boundary over synthetic selections. No native policy,
 * real provider credentials, hosted read or archive confirmation. */
import { afterAll, expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { verifyJournalAppend } from "../src/journal-v2-append.ts";
import { buildJournalPass } from "../src/journal-v2-layout.ts";
import { journalV2PassPath } from "../src/journal-v2-path.ts";
import { JournalObjectReader, JournalObjects, type JournalObjectSource, type JournalTreeRow } from "../src/journal-objects.ts";
import { JournalWork } from "../src/journal-work.ts";
import { archiveObjectSource, archiveRepository, rewriteArchiveFile, selectedInput, syntheticJournal, writeArchiveObjects } from "./support/journal.ts";
import { cleanup } from "./support/repo.ts";

afterAll(cleanup);
test("an append preserves old edges only at their exact parent paths and supplies every changed edge", async () => {
  const fixture = syntheticJournal(65), directory = archiveRepository("sha1");
  const make = async (first: number, last: number, parent: string | null) => {
    const budget = new ArchiveBudget({}, () => 0), entries = fixture.description.entries.slice(first, last + 1);
    const objects = first === 0 ? fixture.description.objects.map(row => ({ ...row, pass: 0 })) : [];
    budget.spend({ entries: entries.length, attempts: objects.length });
    return buildJournalPass({ format: "sha1", selection: canonicalize({ ...fixture.description, format: "artroom-local-inventory-2",
      after: first ? { seq: first - 1, hash: fixture.description.entries[first - 1]!.hash } : null,
      through: { seq: last, hash: entries.at(-1)!.hash }, entries, objects,
      omittedTexts: first === 0 ? fixture.description.omittedTexts : [], cost: budget.admitted(),
    }), input: selectedInput(fixture), parent: parent ? { id: parent, source: archiveObjectSource(directory) } : null, budget });
  };
  const initial = await make(0, 63, null);
  expect(initial.ok ? "accepted" : initial).toBe("accepted"); if (!initial.ok) return;
  writeArchiveObjects(directory, initial.archive.objects);
  const appended = await make(64, 64, initial.archive.commit);
  expect(appended.ok ? "accepted" : appended).toBe("accepted"); if (!appended.ok) return;
  writeArchiveObjects(directory, appended.archive.objects);
  const priorHead = initial.archive.objects.find(object => object.type === "blob" && new TextDecoder().decode(object.data).startsWith('{"hash":'))!;
  const supplied = new Map([...initial.archive.objects.filter(object => object.type !== "blob" || object.id === priorHead.id),
    ...appended.archive.objects].map(object => [object.id, object]));
  const requested: string[] = [];
  const source = { object: async (id: string, maximum: number) => {
    requested.push(id); const object = supplied.get(id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
  } };
  const check = (commit = appended.archive.commit, port: JournalObjectSource = source) => verifyJournalAppend({ format: "sha1", at: fixture.at,
    old: initial.archive.commit, commit, source: port, budget: new ArchiveBudget({}, () => 0) });
  expect(await check()).toEqual({ ok: true });
  // The same old/new root trees used by head validation are compared once,
  // rather than fetched again by a separate head-path walk. Each actual
  // source read still has its required metadata probe and bounded body read.
  const parsing = new JournalObjectReader("sha1", source, new JournalWork(new ArchiveBudget({}, () => 0)));
  for (const archive of [initial.archive, appended.archive]) {
    const commit = archive.objects.find(object => object.id === archive.commit)!;
    const root = parsing.commit(commit.data).tree;
    expect(requested.filter(id => id === root), "Read each root once for head and append checks").toHaveLength(2);
  }
  const oldBodies = initial.archive.objects.filter(object => object.type === "blob" && object.id !== priorHead.id).map(object => object.id);
  expect(requested.some(id => oldBodies.includes(id))).toBe(false);
  const segment = appended.archive.objects.find(object => object.type === "blob" && new TextDecoder().decode(object.data).includes('"prev":'))!;
  supplied.delete(segment.id);
  expect(await check()).toEqual({ ok: false, reason: "missing-object" });
  supplied.set(segment.id, segment);
  const changedOld = rewriteArchiveFile(directory, appended.archive.commit, journalV2PassPath(0), "{}");
  expect(await check(changedOld, archiveObjectSource(directory))).toEqual({ ok: false, reason: "parent" });
  // Hash-valid edits isolate head authority from ordinary append payloads.
  // This helper changes only the exact root/journal/v2 path and preserves
  // the old commit edge. It is a mechanical corruption fixture, not a
  // second append validator or a native admission claim.
  const full = archiveObjectSource(directory);
  const rewriteV2 = async (edit: (rows: readonly JournalTreeRow[]) => readonly JournalTreeRow[], oldTree = false) => {
    const work = new JournalWork(new ArchiveBudget({}, () => 0)), maker = new JournalObjects("sha1", work);
    const reader = new JournalObjectReader("sha1", full, work);
    const commit = reader.commit(await reader.read(oldTree ? initial.archive.commit : appended.archive.commit, "commit", 1024));
    const change = async (id: string, depth: number): Promise<string> => {
      const rows = reader.tree(await reader.read(id, "tree"));
      if (depth === 2) return maker.tree(edit(rows)).id;
      const name = depth === 0 ? "journal" : "v2", child = rows.find(row => row.name === name)!;
      const next = await change(child.id, depth + 1);
      return maker.tree(rows.map(row => row.name === name ? { ...row, id: next } : row)).id;
    };
    const tree = oldTree ? commit.tree : await change(commit.tree, 0);
    const made = maker.commit(tree, initial.archive.commit, 1_700_000_100);
    writeArchiveObjects(directory, maker.objects()); return made.id;
  };
  // A new commit with wholly unchanged trees cannot hide a missing head
  // comparison behind the same-ID subtree shortcut.
  expect(await check(await rewriteV2(rows => rows, true), full)).toEqual({ ok: false, reason: "parent" });
  const sameHead = rewriteArchiveFile(directory, appended.archive.commit, "journal/v2/head.json", new TextDecoder().decode(priorHead.data));
  expect(await check(sameHead, full)).toEqual({ ok: false, reason: "parent" });
  expect(await check(await rewriteV2(rows => rows.filter(row => row.name !== "head.json")), full)).toEqual({ ok: false, reason: "parent" });
  expect(await check(await rewriteV2(rows => rows.map(row => row.name === "head.json" ? { ...row, mode: "40000" as const, id: initial.archive.objects.find(object => object.type === "tree")!.id } : row)), full)).toEqual({ ok: false, reason: "tree" });
  const currentHead = appended.archive.objects.find(object => object.type === "blob" && new TextDecoder().decode(object.data).startsWith('{"hash":'))!;
  const head = JSON.parse(new TextDecoder().decode(currentHead.data));
  const regressed = rewriteArchiveFile(directory, appended.archive.commit, "journal/v2/head.json", canonicalize({ ...head, through: 62 }));
  expect(await check(regressed, full)).toEqual({ ok: false, reason: "parent" });
  const foreign = rewriteArchiveFile(directory, appended.archive.commit, "journal/v2/head.json", canonicalize({ ...head, scope: syntheticJournal(1, 2).at }));
  expect(await check(foreign, full)).toEqual({ ok: false, reason: "parent" });

}, 30_000);
