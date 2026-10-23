/** Exact Git-edge boundary over synthetic selections. No native policy,
 * real provider credentials, hosted read or archive confirmation. */
import { afterAll, expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { verifyJournalAppend } from "../src/journal-v2-append.ts";
import { buildJournalPass } from "../src/journal-v2-layout.ts";
import { journalV2PassPath } from "../src/journal-v2-path.ts";
import type { JournalObjectSource } from "../src/journal-objects.ts";
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
  const oldBodies = initial.archive.objects.filter(object => object.type === "blob" && object.id !== priorHead.id).map(object => object.id);
  expect(requested.some(id => oldBodies.includes(id))).toBe(false);
  const segment = appended.archive.objects.find(object => object.type === "blob" && new TextDecoder().decode(object.data).includes('"prev":'))!;
  supplied.delete(segment.id);
  expect(await check()).toEqual({ ok: false, reason: "missing-object" });
  supplied.set(segment.id, segment);
  const changedOld = rewriteArchiveFile(directory, appended.archive.commit, journalV2PassPath(0), "{}");
  expect(await check(changedOld, archiveObjectSource(directory))).toEqual({ ok: false, reason: "parent" });
}, 30_000);
