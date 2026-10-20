/** Explicit caller trust derived only from already admitted copied facts.
 * No copied body is proof, and no private source journal is read/exported. */
import type { FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { same } from "@generalbusiness/artroom-bytes";
import type { JournalSelection } from "@generalbusiness/artroom-git/journal";
import type { ArchiveBudget } from "./archive-budget.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";

/** `archived` is the exact producer closure selected for this repository.
 * Its copied facts must be replayed. Only Register17 and Membership8 facts
 * outside that closure may become anchors under decision 5a642337. */
export function archiveReplayAnchors(selection: { readonly at: ScopeRef; readonly objects: readonly { readonly foreign?: NonNullable<JournalSelection["objects"][number]["foreign"]> }[] }, archived: readonly ScopeRef[], budget: ArchiveBudget): readonly FactRef[] {
  budget.spend({ nodes: archived.length, metadata: archived.length * 512, inputWork: archived.length * 1024 });
  const scopes = new Map<string, ScopeRef>();
  for (const at of archived) {
    const prior = scopes.get(at.scope);
    if (prior && !same(prior, at)) return stop("foreign-source-mismatch");
    scopes.set(at.scope, at);
  }
  if (!same(scopes.get(selection.at.scope), selection.at)) return stop("foreign-source-mismatch");
  const anchors = new Map<string, FactRef>();
  for (const object of selection.objects) {
    budget.spend({ inputWork: 1024 });
    if (!object.foreign) continue;
    const { fact, pin } = object.foreign, replayed = scopes.get(fact.at.scope);
    if (replayed) {
      if (!same(replayed, fact.at)) return stop("foreign-source-mismatch");
      continue;
    }
    if (pin !== "platform:register@17" && pin !== "platform:membership@8") return stop("unsupported-foreign-copy");
    const key = `${fact.at.scope}:${fact.seq}`, prior = anchors.get(key);
    if (prior && !same(prior, fact)) return stop("foreign-source-mismatch");
    if (!prior) {
      budget.spend({ metadata: 512 });
      anchors.set(key, Object.freeze({ at: Object.freeze({ ...fact.at }), seq: fact.seq, hash: fact.hash }));
    }
  }
  budget.spend({ inputWork: anchors.size * 1024 * (Math.ceil(Math.log2(anchors.size + 1)) + 1) });
  const result = [...anchors.values()].sort((a, b) => a.at.scope < b.at.scope ? -1 : a.at.scope > b.at.scope ? 1 : a.seq - b.seq);
  budget.check();
  return Object.freeze(result);
}
