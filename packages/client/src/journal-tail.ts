/** Clone plus live journal pages (floor note, section 7). The caller owns
 * fetching and bounded clone reads; a receipt supplies no network address. */
import { DOMAINS, type Archived, type Head, type LogPage, type Read, type ScopeRef } from "@generalbusiness/dap-contract";
import { digestBytes, isHead, isLocalId, isLogPage, isRead, isRecord, isScopeRef, utf8 } from "@generalbusiness/dap-bytes";

export function isArchived(value: unknown): value is Archived {
  return isRecord(value) && Object.keys(value).length === 3 && isLocalId(value["floor"]) && value["floor"] > 0
    && typeof value["commit"] === "string" && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value["commit"])
    && isHead(value["through"]) && value["floor"] - 1 <= value["through"].seq;
}
export interface JournalClone {
  readonly scope: ScopeRef;
  readonly through: Head;
  /** Exact immutable commit's head.json, read locally without fetching. */
  commit(id: string): Promise<{ scope: ScopeRef; through: Head } | null>;
  /** Bounded, contiguous pages from this immutable clone snapshot. */
  log(from: number): Promise<Read<LogPage>>;
}
export type JournalTailRead = Read<LogPage> | { ok: false; reason: "incomplete"; detail: "floor-moved" | "floor-commit-missing" | "floor-commit-mismatch" | "clone-unavailable" };
const sameScope = (a: ScopeRef, b: ScopeRef) => a.scope === b.scope && a.inc === b.inc && a.kind === b.kind;
const sameHead = (a: Head, b: Head) => a.seq === b.seq && a.hash === b.hash;
const validRead = isRead(isLogPage);

/** Successive clone pages lead into service pages without skipping entries.
 * Three fetches without a successful service page end explicitly incomplete.
 * Fetching is caller-selected I/O; commit membership grants no authority. */
export function journalTail(initial: JournalClone, service: (from: number) => Promise<Read<LogPage>>,
  refresh: (receipt: Archived) => Promise<JournalClone | null>): { read(from: number): Promise<JournalTailRead> } {
  const scope = { ...initial.scope };
  let clone = initial, repeats = 0;
  const incomplete = (detail: Extract<JournalTailRead, { reason: "incomplete" }>["detail"]): JournalTailRead => ({ ok: false, reason: "incomplete", detail });
  const checked = async (port: (from: number) => Promise<Read<LogPage>>, from: number): Promise<Read<LogPage> | null> => {
    const got = await port(from);
    if (!validRead(got)) return null;
    if (got.ok && (!sameScope(got.value.scope, scope) || got.value.entries.some((entry, n) => entry.seq !== from + n))) return null;
    if (!got.ok && got.reason === "archived" && !isArchived(got.archived)) return null;
    return got;
  };
  return { async read(from) {
    if (!isScopeRef(scope) || !isHead(clone.through) || !isLocalId(from)) return incomplete("clone-unavailable");
    try {
      if (from <= clone.through.seq) {
        const got = await checked(n => clone.log(n), from);
        if (!got?.ok || !sameHead(got.at, clone.through) || got.value.entries.length === 0) return incomplete("clone-unavailable");
        return { ...got, complete: false, next: String(from + got.value.entries.length) };
      }
      for (;;) {
        const got = await checked(service, from);
        if (!got) return incomplete("clone-unavailable");
        if (got.ok || got.reason !== "archived") { if (got.ok) repeats = 0; return got; }
        if (from >= got.archived.floor) return incomplete("floor-commit-mismatch");
        if (repeats === 3) return incomplete("floor-moved");
        repeats++;
        const receipt: Archived = { ...got.archived, through: { ...got.archived.through } };
        const next = await refresh(receipt);
        if (!next || !sameScope(next.scope, scope) || !isHead(next.through) || next.through.seq < receipt.through.seq) return incomplete("clone-unavailable");
        const commit = await next.commit(receipt.commit);
        if (!commit) return incomplete("floor-commit-missing");
        if (!sameScope(commit.scope, scope) || !sameHead(commit.through, receipt.through)) return incomplete("floor-commit-mismatch");
        const proof = await checked(n => next.log(n), receipt.through.seq);
        const entry = proof?.ok ? proof.value.entries[0] : null;
        if (!proof?.ok || !sameHead(proof.at, next.through) || !entry || entry.seq !== receipt.through.seq || entry.hash !== receipt.through.hash
          || digestBytes(utf8(`${DOMAINS.entry}\n${entry.bytes}`)) !== receipt.through.hash) return incomplete("floor-commit-mismatch");
        clone = next;
        // Return the newly fetched prefix at the original cursor. Merely
        // jumping to the receipt's through would silently lose those entries.
        if (from <= clone.through.seq) {
          const page = await checked(n => clone.log(n), from);
          if (!page?.ok || !sameHead(page.at, clone.through) || page.value.entries.length === 0) return incomplete("clone-unavailable");
          return { ...page, complete: false, next: String(from + page.value.entries.length) };
        }
      }
    } catch { return incomplete("clone-unavailable"); }
  } };
}
