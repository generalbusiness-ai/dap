/** One-time publication of a wholly held legacy prefix. These reads concern
 * receipt-bound pass metadata only; no archived entry is substituted for a
 * missing local entry and no historical commit is replayed. */
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";
import { JournalObjectReader, type JournalFormat, type JournalObjectSource } from "./journal-objects.ts";
import { readJournalPassParent } from "./journal-v2-parent.ts";
import { journalV2File } from "./journal-v2-tree.ts";
import { journalV2PassPath } from "./journal-v2-path.ts";
import { journalPassManifest } from "./journal-v2-manifest.ts";
import { selectedEntries, type JournalInputSource } from "./journal-layout.ts";
import { JOURNAL_SELECTION_BYTES, journalPassSelection } from "./journal-selection.ts";
import { JournalWork, refuseJournal, type JournalBudget } from "./journal-work.ts";
import { journalAnchorCopyCount } from "./journal-anchors.ts";

export async function journalLegacyCopyCount(options: { readonly format: JournalFormat; readonly at: ScopeRef;
  readonly through: Head; readonly parent: { readonly id: string; readonly source: JournalObjectSource }; readonly budget: JournalBudget }): Promise<number> {
  const work = new JournalWork(options.budget), reader = new JournalObjectReader(options.format, options.parent.source, work);
  const tree = await readJournalPassParent(reader, options.parent.id, options.at, options.through, work);
  let first = 0, copies = 0;
  while (first <= options.through.seq) {
    work.budget.spend({ attempts: 1 });
    const id = await journalV2File(reader, tree, journalV2PassPath(first), work);
    if (id === null) return refuseJournal("parent");
    const pass = journalPassManifest(await reader.read(id, "blob", JOURNAL_SELECTION_BYTES), options.format, work);
    if (pass.entries[0] !== first || pass.through.seq > options.through.seq
      || pass.through.seq === options.through.seq && pass.through.hash !== options.through.hash) return refuseJournal("parent");
    copies += journalAnchorCopyCount(pass.retained, work);
    if (!Number.isSafeInteger(copies)) return work.stop();
    first = pass.through.seq + 1;
  }
  return copies;
}

/** The same integrity/chain/use validation as the ordinary writer, on its
 * selected local entries. This has no retained, host-history or write port. */
export async function validateJournalPublicationEntries(selection: string, input: JournalInputSource, budget: JournalBudget): Promise<void> {
  const work = new JournalWork(budget);
  await selectedEntries(journalPassSelection(selection, work), input, work);
}
