/** Receipt-bound parent metadata only; no old payload or ancestor walk. */
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";
import { JournalObjectReader } from "./journal-objects.ts";
import { sameJournalScope } from "./journal-selection.ts";
import { journalV2Head } from "./journal-v2-manifest.ts";
import { journalV2File } from "./journal-v2-tree.ts";
import { JournalWork, refuseJournal } from "./journal-work.ts";

/** Identity/position of the receipt only. This does not validate all old
 * archive files, and never claims that their history was replayed. */
export async function readJournalPassParent(reader: JournalObjectReader, parent: string, at: ScopeRef, after: Head, work: JournalWork): Promise<string> {
  const commit = reader.commit(await reader.read(parent, "commit", 1024));
  const id = await journalV2File(reader, commit.tree, "journal/v2/head.json", work);
  if (id === null) return refuseJournal("parent");
  const head = journalV2Head(await reader.read(id, "blob", 1024), work);
  if (!sameJournalScope(head.scope, at) || head.through !== after.seq || head.hash !== after.hash) return refuseJournal("parent");
  return commit.tree;
}
