/** Bounded append after a confirmed receipt. No old entry, pass manifest,
 * retained-body enumeration or complete ancestor closure is read. */
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, timeMs, utf8 } from "@generalbusiness/artroom-bytes";
import { archiveSegments } from "./journal-segments.ts";
import { selectedEntries, selectedRetained, type JournalInputSource } from "./journal-layout.ts";
import { JournalObjectReader, JournalObjects, journalFormat, journalId, type JournalFormat, type JournalObject, type JournalObjectSource } from "./journal-objects.ts";
import { JOURNAL_SELECTION_BYTES, journalPassSelection, sameJournalScope, type JournalPassSelection } from "./journal-selection.ts";
import { journalV2Head, manifestOfPass, type JournalPassManifest } from "./journal-v2-manifest.ts";
import { journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath } from "./journal-v2-path.ts";
import { journalV2File, patchJournalV2Tree } from "./journal-v2-tree.ts";
import { JournalLayoutRefusal, JournalWork, refuseJournal, type JournalBudget, type JournalCost, type JournalLayoutLimits, type JournalLayoutReason } from "./journal-work.ts";

export interface JournalPassArchive {
  readonly commit: string;
  readonly tree: string;
  readonly manifest: JournalPassManifest;
  readonly manifestBytes: string;
  readonly objects: readonly JournalObject[];
  readonly selection: JournalPassSelection;
  readonly newInterval: readonly [number, number];
  readonly cost: Readonly<JournalCost>;
  readonly layoutWork: Readonly<JournalLayoutLimits>;
}
export type JournalPassResult = { readonly ok: true; readonly archive: JournalPassArchive }
  | { readonly ok: false; readonly reason: JournalLayoutReason; readonly where?: string };
export interface JournalPassOptions {
  readonly format: JournalFormat;
  readonly selection: string;
  readonly input: JournalInputSource;
  readonly parent: { readonly id: string; readonly source: JournalObjectSource } | null;
  readonly budget: JournalBudget;
}
/** Identity/position of the receipt only. This does not validate all old
 * archive files, and never claims that their history was replayed. */
async function parentTree(reader: JournalObjectReader, parent: string, at: ScopeRef, after: Head, work: JournalWork): Promise<string> {
  const commit = reader.commit(await reader.read(parent, "commit", 1024));
  const id = await journalV2File(reader, commit.tree, "journal/v2/head.json", work);
  if (id === null) return refuseJournal("parent");
  const head = journalV2Head(await reader.read(id, "blob", 1024), work);
  if (!sameJournalScope(head.scope, at) || head.through !== after.seq || head.hash !== after.hash) return refuseJournal("parent");
  return commit.tree;
}
export async function buildJournalPass(options: JournalPassOptions): Promise<JournalPassResult> {
  try {
    const work = new JournalWork(options.budget), format = journalFormat(options.format);
    const selectionBytes = options.selection, input = options.input, supplied = options.parent;
    const parent = supplied === null ? null : { id: journalId(format, supplied.id), source: supplied.source };
    const selection = journalPassSelection(selectionBytes, work);
    if ((parent === null) !== (selection.after === null)) return refuseJournal("parent");
    const reader = parent ? new JournalObjectReader(format, parent.source, work) : null;
    const tree = parent ? await parentTree(reader!, parent.id, selection.at, selection.after!, work) : null;
    const entries = await selectedEntries(selection, input, work), first = selection.after ? selection.after.seq + 1 : 0;
    const retained = await selectedRetained({ ...selection, objects: selection.objects.filter(row => row.pass === first) }, input, work);
    const manifest = manifestOfPass(selection, format, parent?.id ?? null, work);
    work.metadata(selectionBytes.length * 3 + 2048); work.input(selectionBytes.length * 3 + 2048, 2);
    const manifestBytes = canonicalize(manifest), headBytes = canonicalize({ v: 2, scope: selection.at, through: selection.through.seq, hash: selection.through.hash });
    if (utf8(manifestBytes).length > JOURNAL_SELECTION_BYTES || utf8(headBytes).length > 1024) return work.stop();
    const size = entries.reduce((sum, row) => sum + row.descriptor.bytes, 0) + Math.max(0, entries.length - 1);
    work.spend({ outputWork: size }); work.input(size, 8); work.metadata(entries.length * 64);
    const segments = archiveSegments(entries.map(row => ({ seq: row.descriptor.seq, bytes: row.bytes })), size);
    const files = [{ path: "journal/v2/head.json", data: utf8(headBytes) }, { path: journalV2PassPath(first), data: utf8(manifestBytes) },
      ...segments.map(segment => ({ path: journalV2SegmentPath(segment.first), data: segment.bytes })),
      ...[...retained.values()].map(file => ({ path: journalV2RetainedPath(first, file.key), data: file.data }))];
    const maker = new JournalObjects(format, work), updated = await patchJournalV2Tree(reader, tree, files, maker, work);
    const last = entries.at(-1)!;
    const milliseconds = timeMs(last.entry.time);
    if (milliseconds === null || milliseconds < 0) return refuseJournal("timestamp");
    const commit = maker.commit(updated, parent?.id ?? null, Math.floor(milliseconds / 1000));
    const objects = maker.objects(); work.check();
    return { ok: true, archive: { commit: commit.id, tree: updated, manifest, manifestBytes, objects, selection,
      newInterval: [first, selection.through.seq], cost: options.budget.admitted(), layoutWork: { ...work.used } } };
  } catch (error) {
    if (error instanceof JournalLayoutRefusal) return { ok: false, reason: error.reason, ...(error.where ? { where: error.where } : {}) };
    const reason = error && typeof error === "object" && "reason" in error ? error.reason : "unavailable";
    return { ok: false, reason: reason === "limit" || reason === "timeout" ? reason : "unavailable" };
  }
}
