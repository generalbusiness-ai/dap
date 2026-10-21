/** Bounded scripted clone/service ports. Raw stored bytes are deliberately
 * tokens: these tests witness composition, not a valid journal judgment. */
import { expect, test } from "vitest";
import type { Archived, ScopeRef } from "@generalbusiness/dap-contract";
import { cloneTailSource, hashOfBytes, httpSource, MemorySource, type HistorySource } from "../src/index.ts";
const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };
const row = (seq: number) => ({ seq, bytes: `scripted bytes ${seq}`, hash: hashOfBytes(`scripted bytes ${seq}`) });
const head = (seq: number) => ({ seq, hash: row(seq).hash });
const receipt = (seq: number): Archived => ({ floor: seq, commit: seq.toString(16).padStart(40, "0"), through: head(seq) });
const clone = (through: number): HistorySource => Object.assign(new MemorySource([{ scope, entries: Array.from({ length: through + 1 }, (_, seq) => row(seq)), retained: [] }], 2), {
  floorReceipt: async () => ({ ok: true as const, scope, through: head(through), bytes: 128 }),
});
const allow = { bytes: 1024 * 1024, entries: 2 };

test("clone plus tail advertises the live head and never jumps over the newly fetched prefix", async () => {
  const reads: number[] = [], refreshed: Archived[] = [];
  const service: HistorySource = { ...clone(10), retained: async () => ({ ok: false, reason: "not-found" }), page: async (_scope, from) => {
    reads.push(from);
    return from < 9 ? { ok: false, reason: "archived", archived: receipt(9), bytes: 100 } : clone(10).page(scope.scope, from, allow);
  } };
  const source = cloneTailSource(clone(1), service, async (_scope, wanted) => { refreshed.push(wanted); return clone(9); });
  const seqs: number[] = [];
  let from = 0;
  for (;;) {
    const got = await source.page(scope.scope, from, allow);
    expect(got.ok).toBe(true); if (!got.ok) throw new Error(got.reason);
    expect(got.page.head).toEqual(head(10));
    seqs.push(...got.page.entries.map(entry => entry.seq));
    if (got.page.next === null) break;
    from = got.page.next;
  }
  expect(seqs).toEqual(Array.from({ length: 11 }, (_, n) => n));
  expect(refreshed).toEqual([receipt(9)]);
  expect(reads[0]).toBe(2);
  const small = await cloneTailSource(clone(1), service, async () => clone(9)).page(scope.scope, 0, { bytes: 40, entries: 2 });
  expect(small).toMatchObject({ ok: false, reason: "too-large" });
});

test("a moving floor stops after three refreshes and wrong commit or through bytes cannot cross a gap", async () => {
  let next = 2, fetches = 0;
  const service: HistorySource = { ...clone(0), retained: async () => ({ ok: false, reason: "not-found" }), page: async () => ({ ok: false, reason: "archived", archived: receipt((next += 2) - 2), bytes: 100 }) };
  const source = cloneTailSource(clone(0), service, async (_scope, wanted) => { fetches++; return clone(wanted.through.seq); });
  expect(await source.page(scope.scope, 0, allow)).toMatchObject({ ok: false, reason: "floor-moved" });
  expect(fetches).toBe(3);
  const fixed = { ...service, page: async () => ({ ok: false as const, reason: "archived", archived: receipt(9), bytes: 100 }) };
  const badCommit = { ...clone(9), floorReceipt: async () => ({ ok: true as const, scope, through: head(8), bytes: 100 }) };
  expect(await cloneTailSource(clone(0), fixed, async () => badCommit).page(scope.scope, 0, allow)).toMatchObject({ ok: false, reason: "floor-commit-mismatch" });
  const badBytes = clone(9), page = badBytes.page.bind(badBytes);
  badBytes.page = async (...args) => {
    const got = await page(...args);
    return got.ok && args[1] === 9 ? { ...got, page: { ...got.page, entries: [{ ...row(9), bytes: "changed bytes" }] } } : got;
  };
  expect(await cloneTailSource(clone(0), fixed, async () => badBytes).page(scope.scope, 0, allow)).toMatchObject({ ok: false, reason: "floor-commit-mismatch" });
});

test("HTTP preserves a valid archived receipt and rejects malformed receipt metadata", async () => {
  for (const archived of [receipt(9), { ...receipt(9), floor: 11 }, { ...receipt(9), commit: "refs/heads/main" }]) {
    const source = httpSource("https://scripted.invalid", { fetch: async () => ({ status: 410, body: new Response(JSON.stringify({ ok: false, reason: "archived", archived, next: "9" })).body }) });
    const got = await source.page(scope.scope, 2, allow);
    expect(got).toMatchObject(archived === undefined || archived.floor !== 9 || archived.commit !== receipt(9).commit ? { ok: false, reason: "unavailable" } : { ok: false, reason: "archived", archived });
  }
});
