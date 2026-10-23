/** Bounded append after a confirmed receipt. No old entry, pass manifest,
 * retained-body enumeration or complete ancestor closure is read. */
import { canonicalize, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import { archiveSegments } from "./journal-segments.ts";
import { selectedEntries, selectedRetained, type JournalInputSource } from "./journal-layout.ts";
import { JournalObjectReader, JournalObjects, journalFormat, journalId, type JournalFormat, type JournalObject, type JournalObjectSource } from "./journal-objects.ts";
import { JOURNAL_SELECTION_BYTES, journalPassSelection, type JournalPassSelection } from "./journal-selection.ts";
import { manifestOfPass, type JournalPassManifest } from "./journal-v2-manifest.ts";
import { journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath } from "./journal-v2-path.ts";
import { patchJournalV2Tree } from "./journal-v2-tree.ts";
import { readJournalPassParent } from "./journal-v2-parent.ts";
import { JournalPassPreparation } from "./journal-v2-preparation.ts";
import { JournalLayoutRefusal, JournalWork, refuseJournal, type JournalBudget, type JournalCost, type JournalLayoutLimits, type JournalLayoutReason } from "./journal-work.ts";
import { journalPassSerializationMetadata, journalSegmentReservation } from "./journal-pass-cost.ts";
import { journalAnchorPublication, journalAnchorCopyCount, journalPublicationUnits, type JournalAnchorPublication } from "./journal-anchors.ts";

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
  readonly preparation?: JournalPassPreparation;
  /** Metadata finalization only, once after selected entry integrity/chain
   * validation. It cannot change the admitted source selection or input. */
  readonly publication?: () => JournalAnchorPublication;
}
export async function buildJournalPass(options: JournalPassOptions): Promise<JournalPassResult> {
  try {
    const prepared = options.preparation;
    if (prepared !== undefined && !(prepared instanceof JournalPassPreparation)) return refuseJournal("parent");
    const work = prepared?.work ?? new JournalWork(options.budget), format = journalFormat(options.format);
    if (work.budget !== options.budget) return refuseJournal("parent");
    const selectionBytes = options.selection, input = options.input, supplied = options.parent;
    const parent = supplied === null ? null : { id: journalId(format, supplied.id), source: supplied.source };
    const selection = journalPassSelection(selectionBytes, work);
    if ((parent === null) !== (selection.after === null)) return refuseJournal("parent");
    const patch = prepared?.consume(format, selection.at, selection.after, parent?.id ?? null, options.budget);
    const reader = !prepared && parent ? new JournalObjectReader(format, parent.source, work) : null;
    const tree = !prepared && parent ? await readJournalPassParent(reader!, parent.id, selection.at, selection.after!, work) : null;
    const entries = await selectedEntries(selection, input, work), first = selection.after ? selection.after.seq + 1 : 0;
    const retained = await selectedRetained({ ...selection, objects: selection.objects.filter(row => row.pass === first) }, input, work);
    const publication = options.publication ? journalAnchorPublication(options.publication(), journalAnchorCopyCount(selection.objects, work), first, work, [selection.at]) : null;
    const annotated = publication ? { ...selection, ...publication } : selection;
    const manifest = manifestOfPass(annotated, format, parent?.id ?? null, work);
    const serialization = journalPassSerializationMetadata(selectionBytes.length + (publication ? journalPublicationUnits(publication.anchors.length + (publication.legacyAnchors?.anchors.length ?? 0)) : 0));
    work.metadata(serialization); work.input(serialization, 2);
    const manifestBytes = canonicalize(manifest), headBytes = canonicalize({ v: 2, scope: selection.at, through: selection.through.seq, hash: selection.through.hash });
    if (utf8(manifestBytes).length > JOURNAL_SELECTION_BYTES || utf8(headBytes).length > 1024) return work.stop();
    const grouping = journalSegmentReservation(entries.length, entries.reduce((sum, row) => sum + row.descriptor.bytes, 0)), size = grouping.outputWork;
    work.spend({ outputWork: size }); work.input(grouping.inputWork); work.metadata(grouping.metadata);
    const segments = archiveSegments(entries.map(row => ({ seq: row.descriptor.seq, bytes: row.bytes })), size);
    const files = [{ path: "journal/v2/head.json", data: utf8(headBytes) }, { path: journalV2PassPath(first), data: utf8(manifestBytes) },
      ...segments.map(segment => ({ path: journalV2SegmentPath(first, segment.first), data: segment.bytes })),
      ...[...retained.values()].map(file => ({ path: journalV2RetainedPath(first, file.key), data: file.data }))];
    const maker = new JournalObjects(format, work), updated = patch ? patch.finish(files, maker) : await patchJournalV2Tree(reader, tree, files, maker, work);
    const last = entries.at(-1)!;
    const milliseconds = timeMs(last.entry.time);
    if (milliseconds === null || milliseconds < 0) return refuseJournal("timestamp");
    const commit = maker.commit(updated, parent?.id ?? null, Math.floor(milliseconds / 1000));
    const objects = maker.objects(); work.check();
    return { ok: true, archive: { commit: commit.id, tree: updated, manifest, manifestBytes, objects, selection: annotated,
      newInterval: [first, selection.through.seq], cost: options.budget.admitted(), layoutWork: { ...work.used } } };
  } catch (error) {
    if (error instanceof JournalLayoutRefusal) return { ok: false, reason: error.reason, ...(error.where ? { where: error.where } : {}) };
    const reason = error && typeof error === "object" && "reason" in error ? error.reason : "unavailable";
    return { ok: false, reason: reason === "limit" || reason === "timeout" ? reason : "unavailable" };
  }
}
