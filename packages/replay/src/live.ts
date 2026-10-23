/** A complete local clone followed by a live service tail. Fetching stays
 * with the caller; archived receipts carry no URL and grant no authority. */
import type { Archived, ScopeId } from "@generalbusiness/dap-contract";
import { isHead, isScopeRef, natural } from "@generalbusiness/dap-bytes";
import { hashOfBytes, PAGE_REPLY_BYTES, type Allow, type HistorySource, type Page, type Unread } from "./source.ts";

/** Every refresh returns a new immutable local snapshot. The three-repeat
 * bound covers a floor that advances again while the caller fetches. */
export function cloneTailSource(initial: HistorySource, service: HistorySource,
  refresh: (scope: ScopeId, receipt: Archived) => Promise<HistorySource | null>): HistorySource {
  const clones = new Map<ScopeId, HistorySource>();
  const cloneFor = (scope: ScopeId) => clones.get(scope) ?? initial;
  return {
    async floorReceipt(scope, commit, allow) {
      return cloneFor(scope).floorReceipt?.(scope, commit, allow) ?? { ok: false, reason: "floor-commit-missing" };
    },
    async page(scope, from, allow) {
      let clone = cloneFor(scope), bytes = 0;
      const fail = (reason: string): Unread => ({ ok: false, reason, bytes });
      const left = (): Allow => ({ entries: allow.entries, bytes: Math.max(0, Math.min(allow.bytes, PAGE_REPLY_BYTES) - bytes) });
      const charge = (count: number | undefined): boolean => {
        if (count === undefined) return true;
        if (!natural(count) || count > left().bytes) return false;
        bytes += count; return true;
      };
      const valid = (page: Page, start: number) => isScopeRef(page.scope) && page.scope.scope === scope && isHead(page.head)
        && page.entries.length <= allow.entries && page.entries.every((entry, n) => entry.seq === start + n)
        && (page.next === null || page.next === start + page.entries.length);
      if (!natural(from) || !natural(allow.bytes) || !natural(allow.entries)) return fail("unavailable");
      try {
        for (let repeats = 0; ; repeats++) {
          const prefix = await clone.page(scope, from, left());
          if (!charge(prefix.bytes)) return fail("too-large");
          if (!prefix.ok) {
            if (prefix.reason !== "not-found") return fail(prefix.reason);
            const live = await service.page(scope, from, left());
            if (!charge(live.bytes)) return fail("too-large");
            if (live.ok) return { ...live, bytes };
            if (live.reason !== "archived" || !live.archived) return { ...live, bytes };
            if (from >= live.archived.floor) return fail("floor-commit-mismatch");
            if (repeats === 3) return fail("floor-moved");
            const next = await refresh(scope, live.archived);
            if (!next) return fail("floor-commit-missing");
            const checked = await check(next, live.archived);
            if (checked) return fail(checked);
            clone = next; clones.set(scope, clone); continue;
          }
          if (!valid(prefix.page, from)) return fail("unavailable");
          const tailFrom = prefix.page.head.seq + 1;
          const tail = await service.page(scope, tailFrom, left());
          if (!charge(tail.bytes)) return fail("too-large");
          if (!tail.ok) {
            if (tail.reason !== "archived" || !tail.archived) return { ...tail, bytes };
            if (tailFrom >= tail.archived.floor) return fail("floor-commit-mismatch");
            if (repeats === 3) return fail("floor-moved");
            const next = await refresh(scope, tail.archived);
            if (!next) return fail("floor-commit-missing");
            const checked = await check(next, tail.archived, prefix.page.scope);
            if (checked) return fail(checked);
            clone = next; clones.set(scope, clone); continue;
          }
          if (!valid(tail.page, tailFrom) || tail.page.scope.inc !== prefix.page.scope.inc || tail.page.scope.kind !== prefix.page.scope.kind
            || tail.page.head.seq < prefix.page.head.seq || tail.page.head.seq === prefix.page.head.seq && tail.page.head.hash !== prefix.page.head.hash) return fail("floor-commit-mismatch");
          if (from > prefix.page.head.seq) {
            if (from === tailFrom) return { ...tail, bytes };
            const got = await service.page(scope, from, left());
            if (!charge(got.bytes)) return fail("too-large");
            return { ...got, bytes };
          }
          if (prefix.page.entries.length === 0) return fail("unavailable");
          const next = from + prefix.page.entries.length;
          return { ok: true, bytes, page: { ...prefix.page, head: tail.page.head, next: next <= tail.page.head.seq ? next : null } };
        }
      } catch { return fail("unavailable"); }

      async function check(next: HistorySource, receipt: Archived, expected?: Page["scope"]): Promise<string | null> {
        if (!natural(receipt.floor) || receipt.floor === 0 || !isHead(receipt.through) || receipt.floor - 1 > receipt.through.seq
          || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(receipt.commit)) return "floor-commit-mismatch";
        const proof = await next.floorReceipt?.(scope, receipt.commit, left());
        if (!proof) return "floor-commit-missing";
        if (!charge(proof.bytes)) return "too-large";
        if (!proof.ok) return proof.reason;
        if (proof.scope.scope !== scope || expected && (proof.scope.inc !== expected.inc || proof.scope.kind !== expected.kind)
          || proof.through.seq !== receipt.through.seq || proof.through.hash !== receipt.through.hash) return "floor-commit-mismatch";
        const entry = await next.page(scope, receipt.through.seq, { ...left(), entries: 1 });
        if (!charge(entry.bytes)) return "too-large";
        if (!entry.ok) return entry.reason;
        const row = entry.page.entries[0];
        if (!row || entry.page.head.seq < receipt.through.seq || row.seq !== receipt.through.seq || row.hash !== receipt.through.hash || hashOfBytes(row.bytes) !== receipt.through.hash
          || entry.page.scope.inc !== proof.scope.inc || entry.page.scope.kind !== proof.scope.kind) return "floor-commit-mismatch";
        return null;
      }
    },
    async retained(scope, kind, digest, allow, domain) {
      const clone = await cloneFor(scope).retained(scope, kind, digest, allow, domain);
      return clone.ok || clone.reason !== "not-found" ? clone : service.retained(scope, kind, digest, allow, domain);
    },
    async omittedText(scope, digest, allow) {
      return cloneFor(scope).omittedText?.(scope, digest, allow) ?? { ok: false, reason: "not-found" };
    },
  };
}
