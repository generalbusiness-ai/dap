/** Validate a v2 append from exact old/new Git edges. Unchanged objects
 * may remain absent only at the same path, mode and ID in the old tree.
 * This is no complete parent closure, privacy certificate or replay. */
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { isScopeRef } from "@generalbusiness/dap-bytes";
import { JournalObjectReader, journalFormat, journalId, type JournalFormat, type JournalObjectSource, type JournalTreeRow } from "./journal-objects.ts";
import { sameJournalScope } from "./journal-selection.ts";
import { journalV2Head } from "./journal-v2-manifest.ts";
import { journalV2Directory, readJournalV2Path } from "./journal-v2-path.ts";
import { journalV2File, journalV2TreeBytes } from "./journal-v2-tree.ts";
import { JournalLayoutRefusal, JournalWork, refuseJournal, type JournalBudget, type JournalLayoutReason } from "./journal-work.ts";

export async function verifyJournalAppend(options: { readonly format: JournalFormat; readonly at: ScopeRef;
  readonly old: string; readonly commit: string; readonly source: JournalObjectSource; readonly budget: JournalBudget;
}): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: JournalLayoutReason }> {
  try {
    const format = journalFormat(options.format), work = new JournalWork(options.budget);
    if (!isScopeRef(options.at)) return refuseJournal("parent");
    const at = { ...options.at }, old = journalId(format, options.old), id = journalId(format, options.commit);
    const reader = new JournalObjectReader(format, options.source, work);
    const previous = reader.commit(await reader.read(old, "commit", 1024));
    const next = reader.commit(await reader.read(id, "commit", 1024));
    if (next.parent !== old) return refuseJournal("parent");
    const head = async (tree: string) => {
      const blob = await journalV2File(reader, tree, "journal/v2/head.json", work);
      if (blob === null) return refuseJournal("parent");
      return journalV2Head(await reader.read(blob, "blob", 1024), work);
    };
    const before = await head(previous.tree), after = await head(next.tree);
    if (!sameJournalScope(before.scope, at) || !sameJournalScope(after.scope, at) || after.through <= before.through) return refuseJournal("parent");
    async function tree(newId: string, oldId: string | null, prefix: string, depth: number): Promise<void> {
      work.depth(depth); work.budget.spend({ nodes: 1 });
      const rows = async (key: string): Promise<readonly JournalTreeRow[]> => reader.tree(await reader.read(key, "tree", journalV2TreeBytes(prefix)));
      const was = oldId === null ? [] : await rows(oldId), now = await rows(newId);
      const maximum = journalV2Directory(prefix)?.maximum ?? refuseJournal("tree", prefix);
      if (now.length === 0) return refuseJournal("tree");
      if (was.length > maximum || now.length > maximum) return work.stop();
      work.metadata((was.length + now.length) * 128);
      const oldRows = new Map(was.map(row => [row.name, row])), newRows = new Map(now.map(row => [row.name, row]));
      for (const row of was) if (!newRows.has(row.name)) return refuseJournal("parent");
      for (const row of now) {
        work.check(); const prior = oldRows.get(row.name), path = prefix + row.name;
        if (path.length > 1024) return work.stop();
        if (prior && prior.mode !== row.mode) return refuseJournal("tree");
        // Only a hash checked edge of this exact parent at this exact path
        // can avoid traversal. A matching ID elsewhere grants nothing.
        if (prior?.id === row.id) continue;
        if (row.mode === "40000") await tree(row.id, prior?.id ?? null, path + "/", depth + 1);
        else {
          if (!readJournalV2Path(path)) return refuseJournal("tree");
          if (prior && path !== "journal/v2/head.json") return refuseJournal("parent");
          await reader.read(row.id, "blob");
        }
      }
    }
    await tree(next.tree, previous.tree, "", 0); work.check();
    return { ok: true };
  } catch (error) {
    if (error instanceof JournalLayoutRefusal) return { ok: false, reason: error.reason };
    const reason = error && typeof error === "object" && "reason" in error ? error.reason : "unavailable";
    return { ok: false, reason: reason === "limit" || reason === "timeout" ? reason : "unavailable" };
  }
}
