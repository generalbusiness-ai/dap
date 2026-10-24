/** One-time publication of a wholly held legacy prefix. These reads concern
 * receipt-bound pass metadata only; no archived entry is substituted for a
 * missing local entry and no historical commit is replayed. */
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";
import { JournalObjectReader, type JournalFormat, type JournalObjectSource } from "./journal-objects.ts";
import { readJournalPassParent } from "./journal-v2-parent.ts";
import { JournalPassPreparation } from "./journal-v2-preparation.ts";
import { countJournalLegacyCopies } from "./journal-anchor-legacy-count.ts";
import { journalV2File } from "./journal-v2-tree.ts";
import { journalV2PassPath } from "./journal-v2-path.ts";
import { selectedEntries, type JournalInputSource } from "./journal-layout.ts";
import { journalPassSelection } from "./journal-selection.ts";
import { JournalWork, refuseJournal, type JournalBudget } from "./journal-work.ts";

export async function journalLegacyCopyCount(options: { readonly format: JournalFormat; readonly at: ScopeRef;
  readonly through: Head; readonly parent: { readonly id: string; readonly source: JournalObjectSource }; readonly budget: JournalBudget;
  readonly preparation?: JournalPassPreparation }): Promise<number> {
  if (options.preparation !== undefined) {
    if (!(options.preparation instanceof JournalPassPreparation)) return refuseJournal("parent");
    return options.preparation.legacyCopyCount(options);
  }
  const work = new JournalWork(options.budget), reader = new JournalObjectReader(options.format, options.parent.source, work);
  const tree = await readJournalPassParent(reader, options.parent.id, options.at, options.through, work);
  return countJournalLegacyCopies(reader, options.through, work, first => journalV2File(reader, tree, journalV2PassPath(first), work));
}

/** The same integrity/chain/use validation as the ordinary writer, on its
 * selected local entries. This has no retained, host-history or write port. */
export async function validateJournalPublicationEntries(selection: string, input: JournalInputSource, budget: JournalBudget): Promise<void> {
  const work = new JournalWork(budget);
  await selectedEntries(journalPassSelection(selection, work), input, work);
}
