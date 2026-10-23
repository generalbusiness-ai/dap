/** One v1 receipt becomes the first v2 pass. The native caller re-admits
 * its bounded local prefix; matching the complete v1 tree binds every
 * regenerated segment and retained byte to the confirmed Git receipt. */
import { canonicalize, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import { journalFileTree, journalPhysicalFiles } from "./journal-files.ts";
import { selectedEntries, selectedRetained } from "./journal-layout.ts";
import { manifestOfSelection } from "./journal-manifest.ts";
import { JournalObjectReader, JournalObjects, journalFormat, journalId } from "./journal-objects.ts";
import { archiveSegments } from "./journal-segments.ts";
import { JOURNAL_SELECTION_BYTES, journalPassSelection } from "./journal-selection.ts";
import { manifestOfPass } from "./journal-v2-manifest.ts";
import { journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath } from "./journal-v2-path.ts";
import { patchJournalV2Tree } from "./journal-v2-tree.ts";
import type { JournalPassOptions, JournalPassResult } from "./journal-v2-layout.ts";
import { JournalLayoutRefusal, JournalWork, refuseJournal } from "./journal-work.ts";
import { journalAnchorPublication, journalAnchorCopyCount, journalPublicationUnits } from "./journal-anchors.ts";

export async function convertJournalArchiveV1(options: JournalPassOptions): Promise<JournalPassResult> {
  try {
    const work = new JournalWork(options.budget), format = journalFormat(options.format);
    const selectionBytes = options.selection, input = options.input;
    const supplied = options.parent;
    if (!supplied) return refuseJournal("parent");
    const parent = { id: journalId(format, supplied.id), source: supplied.source };
    const selection = journalPassSelection(selectionBytes, work);
    if (selection.after !== null || selection.through.seq >= 4096 || selection.objects.some(row => row.pass !== 0)) return refuseJournal("parent");
    const reader = new JournalObjectReader(format, parent.source, work);
    // No old segment, retained file, pass manifest or ancestor is fetched.
    const previous = reader.commit(await reader.read(parent.id, "commit", 1024));
    const entries = await selectedEntries(selection, input, work);
    const retained = await selectedRetained(selection, input, work);
    const milliseconds = timeMs(entries.at(-1)!.entry.time);
    if (milliseconds === null || milliseconds < 0) return refuseJournal("timestamp");
    const seconds = Math.floor(milliseconds / 1000);
    if (previous.seconds !== seconds) return refuseJournal("parent");
    const size = entries.reduce((sum, row) => sum + row.descriptor.bytes, 0) + Math.max(0, entries.length - 1);
    work.spend({ outputWork: size }); work.input(size, 8); work.metadata(entries.length * 64);
    const segments = archiveSegments(entries.map(row => ({ seq: row.descriptor.seq, bytes: row.bytes })), size);
    const reserve = selectionBytes.length * 3 + 2048;
    work.spend({ outputWork: reserve * 2 }); work.input(reserve, 4); work.metadata(reserve * 2);
    const oldManifest = canonicalize(manifestOfSelection(selection, format, previous.parent, work));
    const oldHead = canonicalize({ v: 1, scope: selection.at, through: selection.through.seq, hash: selection.through.hash });
    if (utf8(oldManifest).length > JOURNAL_SELECTION_BYTES) return work.stop();
    const oldFiles = journalPhysicalFiles(segments, [...retained.values()], utf8(oldHead), utf8(oldManifest), work);
    const oldTree = journalFileTree(oldFiles, new JournalObjects(format, work), work);
    // Equality covers the complete canonical old file set, all byte hashes,
    // S2b basis, omissions and original manifest parent. A local prefix or
    // metadata certificate alone could not establish this equality.
    if (oldTree !== previous.tree) return refuseJournal("parent");
    const redacted = new Set<string>();
    for (const row of entries) for (const effect of row.entry.effects) if (effect.effect === "redact") for (const digest of effect.texts) {
      work.metadata(128); redacted.add(digest);
    }
    // The old manifest remains exact above. The new one needs no omission
    // row when this converted journal already supplies its tombstone.
    const publication = options.publication ? journalAnchorPublication(options.publication(), journalAnchorCopyCount(selection.objects, work), 0, work, [selection.at]) : null;
    const annotated = publication ? { ...selection, ...publication } : selection;
    if (publication) {
      const extra = journalPublicationUnits(publication.anchors.length + (publication.legacyAnchors?.anchors.length ?? 0)) * 3;
      work.metadata(extra); work.input(extra, 2);
    }
    const manifest = manifestOfPass({ ...annotated, omitted: selection.omitted.filter(row => !redacted.has(row.digest)) }, format, parent.id, work);
    const manifestBytes = canonicalize(manifest);
    const headBytes = canonicalize({ v: 2, scope: selection.at, through: selection.through.seq, hash: selection.through.hash });
    if (utf8(manifestBytes).length > JOURNAL_SELECTION_BYTES) return work.stop();
    const files = [{ path: "journal/v2/head.json", data: utf8(headBytes) },
      { path: journalV2PassPath(0), data: utf8(manifestBytes) },
      ...segments.map(segment => ({ path: journalV2SegmentPath(0, segment.first), data: segment.bytes })),
      ...[...retained.values()].map(file => ({ path: journalV2RetainedPath(0, file.key), data: file.data }))];
    const maker = new JournalObjects(format, work);
    const tree = await patchJournalV2Tree(null, null, files, maker, work);
    const commit = maker.commit(tree, parent.id, seconds);
    work.check();
    return { ok: true, archive: { commit: commit.id, tree, manifest, manifestBytes, objects: maker.objects(), selection: annotated,
      // The represented first pass is [0, through]; conversion adds no entry.
      newInterval: [selection.through.seq + 1, selection.through.seq], cost: options.budget.admitted(), layoutWork: { ...work.used } } };
  } catch (error) {
    if (error instanceof JournalLayoutRefusal) return { ok: false, reason: error.reason, ...(error.where ? { where: error.where } : {}) };
    const reason = error && typeof error === "object" && "reason" in error ? error.reason : "unavailable";
    return { ok: false, reason: reason === "limit" || reason === "timeout" ? reason : "unavailable" };
  }
}
