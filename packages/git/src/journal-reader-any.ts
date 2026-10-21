/** Resolve once, detect the layout from two bounded trees, then invoke its
 * complete reader against that immutable commit. No version fallback. */
import type { ScopeId } from "@generalbusiness/dap-contract";
import { GitRefusal } from "./names.ts";
import { journalRef } from "./journal-path.ts";
import { JournalObjectReader, journalId } from "./journal-objects.ts";
import { JournalLayoutRefusal, JournalWork } from "./journal-work.ts";
import { readJournalArchive, type JournalReadBudget, type JournalReadRepository, type JournalReadResult } from "./journal-reader.ts";
import { readJournalArchiveV2, type JournalV2ReadOptions } from "./journal-v2-reader.ts";

export async function readJournalRepositoryArchive(repository: JournalReadRepository, scope: ScopeId, budget: JournalReadBudget, options: JournalV2ReadOptions = {}): Promise<JournalReadResult> {
  const location: { scope: ScopeId; ref?: string; commit?: string } = { scope };
  try {
    budget.check(); const ref = journalRef(scope); location.ref = ref;
    const format = await repository.format(budget), id = await repository.resolve(ref, budget);
    if (id === null) { budget.scope(); return { ok: false, result: "not-found", reason: "archive ref is absent", location }; }
    location.commit = journalId(format, id);
    const work = new JournalWork(budget), reader = new JournalObjectReader(format, {
      object: (id, limit) => { if (limit > 0) budget.bytes(limit); return repository.object(id, limit, budget); },
    }, work);
    const commit = reader.commit(await reader.read(id, "commit", 1024));
    const root = reader.tree(await reader.read(commit.tree, "tree", 1000 * 295));
    const journal = root.find(row => row.name === "journal" && row.mode === "40000");
    const children = journal ? reader.tree(await reader.read(journal.id, "tree", 1000 * 295)) : [];
    const v2 = children.some(row => row.name === "v2");
    const pinned: JournalReadRepository = { format: async () => format, resolve: async name => name === ref ? id : null,
      object: (id, limit, work) => repository.object(id, limit, work), ...(repository.settle ? { settle: () => repository.settle!() } : {}) };
    return v2 ? await readJournalArchiveV2(pinned, scope, budget, options) : await readJournalArchive(pinned, scope, budget);
  } catch (error) {
    const reason = error && typeof error === "object" && "reason" in error ? error.reason : "unavailable";
    const result = reason === "limit" || reason === "timeout" || reason === "unavailable" ? reason
      : error instanceof GitRefusal || error instanceof JournalLayoutRefusal && reason === "tree" ? "refused"
      : error instanceof JournalLayoutRefusal ? "mismatch" : "unavailable";
    return { ok: false, result, reason: error instanceof Error ? error.message : "archive read is unavailable", location };
  }
}
