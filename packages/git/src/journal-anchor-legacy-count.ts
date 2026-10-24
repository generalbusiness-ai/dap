/** Shared strict manifest/range checks for both receipt-bound legacy readers.
 * The resolver supplies only an immutable prior-pass blob ID, never bytes or
 * an authority decision. Both callers retain their original reader/work. */
import type { Head } from "@generalbusiness/dap-contract";
import { JournalObjectReader } from "./journal-objects.ts";
import { journalPassManifest } from "./journal-v2-manifest.ts";
import { JOURNAL_SELECTION_BYTES } from "./journal-selection.ts";
import { JournalWork, refuseJournal } from "./journal-work.ts";
import { journalAnchorCopyCount } from "./journal-anchors.ts";

export async function countJournalLegacyCopies(reader: JournalObjectReader, through: Head, work: JournalWork,
  resolve: (first: number) => Promise<string | null>): Promise<number> {
  let first = 0, copies = 0;
  while (first <= through.seq) {
    work.budget.spend({ attempts: 1 });
    const id = await resolve(first);
    if (id === null) return refuseJournal("parent");
    const pass = journalPassManifest(await reader.read(id, "blob", JOURNAL_SELECTION_BYTES), reader.format, work);
    if (pass.entries[0] !== first || pass.through.seq > through.seq
      || pass.through.seq === through.seq && pass.through.hash !== through.hash) return refuseJournal("parent");
    copies += journalAnchorCopyCount(pass.retained, work);
    if (!Number.isSafeInteger(copies)) return work.stop();
    first = pass.through.seq + 1;
  }
  return copies;
}
