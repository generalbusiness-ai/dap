/** SCRIPTED public journal entries: exercises the client reconstruction
 * boundary only, never native issuance, authority or owner settlement. */
import { expect, test } from "vitest";
import type { Entry, MemberRef, ScopeRef, Sealed } from "@generalbusiness/dap-contract";
import { canonicalBytes, entryHash, scopeIdOf } from "@generalbusiness/dap-bytes";
import { openCommands, readCommandJournal } from "./command-journal.ts";
const scope: ScopeRef = { scope: scopeIdOf({ v: 1, kind: "lane", creator: null, cause: `sha256:${"2".repeat(64)}`, ordinal: 0, definition: `sha256:${"1".repeat(64)}` }), inc: "in_aaaaaaaaaaaaaaaaaaaaaaaaaa", kind: "lane" };
const owner: MemberRef = { membership: { ...scope, kind: "membership" }, member: "@sensors" };
function history(extra = 0): Sealed[] {
  const result: Sealed[] = [];
  const append = (effects: unknown[]) => {
    const seq = result.length;
    // The fixture deliberately scripts both the entries and effects. It is
    // hashed as a public read would be; no judge, membership or grant runs.
    const entry: Entry = JSON.parse(JSON.stringify({ v: 1, at: scope, seq, prev: result.at(-1)?.hash ?? null, time: "2026-10-19T12:00:00Z", clamped: false, epoch: 0,
      input: { type: "timed", item: 0, rule: "TEST-scripted", due: "2026-10-19T12:00:00Z" }, uses: [], prepared: [], effects, sends: [] }));
    result.push({ entry, hash: entryHash(entry) });
  };
  const values = (seq: number) => ({ device: 8, kind: "heater", target: seq === 1 ? "on" : "off", level: seq === 1 ? 100 : 0, targetAt: seq, owner, decided: 0 });
  const record = (key: number, state: string, v: unknown) => ({ effect: "record", capability: "device-command@1", kind: "command", key: [key], state, values: v });
  append([]); append([record(1, "open", values(1))]); append([record(2, "open", values(2))]);
  append([{ effect: "value", item: 8, slot: "reported", value: "on" }]);
  append([record(1, "confirmed", { ...values(1), decided: 1, description: "TEST late closure", answerAt: 4 })]);
  if (extra > 0) {
    append([record(2, "confirmed", { ...values(2), decided: 1, description: "TEST second closure", answerAt: 5 })]);
    while (result.length < extra) append([]);
  }
  return result;
}

test("complete public coverage keeps an old pending command until its own closure; gaps, stale heads, wrong ownership and limits never imply absence", async () => {
  const journal = history(), at = (n: number) => ({ seq: n, hash: journal[n]!.hash });
  expect(openCommands(scope, owner, null, at(3), journal.slice(0, 4)).map(c => [c.fact.seq, c.target])).toEqual([[1, "on"], [2, "off"]]);
  expect(openCommands(scope, owner, null, at(4), journal).map(c => [c.fact, c.target])).toEqual([[{ at: scope, seq: 2, hash: journal[2]!.hash }, "off"]]);
  for (const suffix of [journal.slice(1), journal.slice(0, 4), [...journal.slice(0, 2), ...journal.slice(3)]]) expect(() => openCommands(scope, owner, null, at(4), suffix)).toThrow("coverage");
  expect(() => openCommands(scope, { ...owner, member: "@climate" }, null, at(4), journal)).toThrow("coverage");
  expect(() => openCommands(scope, owner, null, { seq: 4, hash: `sha256:${"0".repeat(64)}` }, journal)).toThrow("coverage");
  expect(() => openCommands(scope, owner, null, { seq: 800, hash: journal[4]!.hash }, [])).toThrow("coverage");
  // An acknowledged command may close after the scanned position. That
  // later closure must not strand a subsequent window or hide command2.
  expect(openCommands(scope, owner, { at: scope, ...at(1) }, at(4), journal.slice(2)).map(c => c.fact.seq)).toEqual([2]);
  const calls: (string | undefined)[] = [];
  const read = await readCommandJournal({ history: async cursor => {
    calls.push(cursor);
    return cursor === "0" ? { ok: true, at: at(4), value: journal.slice(0, 3), complete: false, next: "TEST-next" }
      : { ok: true, at: at(4), value: journal.slice(3), complete: true };
  } }, scope, owner, null, at(4));
  expect(calls).toEqual(["0", "TEST-next"]); expect(read.open.map(c => c.fact.seq)).toEqual([2]);
  await expect(readCommandJournal({ history: async () => ({ ok: true, at: at(4), value: journal.slice(0, 3), complete: true }) }, scope, owner, null, at(4))).rejects.toThrow("coverage");
  const backlog = history(811), last = backlog.at(-1)!, head = { seq: last.entry.seq, hash: last.hash };
  const publicPages = { history: async (cursor?: string) => {
    const from = Number(cursor ?? "0"), end = Math.min(from + 200, backlog.length);
    return { ok: true as const, at: head, value: backlog.slice(from, end), complete: end === backlog.length, ...(end === backlog.length ? {} : { next: String(end) }) };
  } };
  const first = await readCommandJournal(publicPages, scope, owner, null, head);
  expect([first.entries.length, first.through!.seq, first.complete, first.open.length]).toEqual([800, 799, false, 0]);
  const next = await readCommandJournal(publicPages, scope, owner, first.through, head);
  expect([next.entries.length, next.through!.seq, next.complete, next.open.length]).toEqual([11, 810, true, 0]);
  // SCRIPTED large entries, with a public-history-like one-MiB page bound.
  // The retained prefix leaves room for the tick's other replies, then the
  // following invocation resumes at the first entry not acknowledged.
  const large = history(400);
  for (const sealed of large) {
    sealed.entry.prev = sealed.entry.seq === 0 ? null : large[sealed.entry.seq - 1]!.hash;
    sealed.entry.effects = [...sealed.entry.effects, { effect: "value", item: 0, slot: "TEST-padding", value: "x".repeat(7000) }];
    sealed.hash = entryHash(sealed.entry);
  }
  const largeHead = { seq: large.length - 1, hash: large.at(-1)!.hash };
  const largePages = { history: async (cursor?: string) => {
    const from = Number(cursor ?? "0"); let end = from, bytes = 0;
    while (end < large.length && end - from < 200) {
      const size = canonicalBytes(large[end]!.entry).length;
      if (end > from && bytes + size > 1024 * 1024) break;
      bytes += size; end++;
    }
    return { ok: true as const, at: largeHead, value: large.slice(from, end), complete: end === large.length, ...(end === large.length ? {} : { next: String(end) }) };
  } };
  const bytePrefix = await readCommandJournal(largePages, scope, owner, null, largeHead);
  expect(bytePrefix.complete).toBe(false); expect(canonicalBytes(bytePrefix.entries).length).toBeLessThanOrEqual(1024 * 1024);
  const byteNext = await readCommandJournal(largePages, scope, owner, bytePrefix.through, largeHead);
  expect(byteNext.entries[0]!.entry.seq).toBe(bytePrefix.through!.seq + 1);
  expect(byteNext.through!.seq).toBeGreaterThan(bytePrefix.through!.seq);
  const corrupted = structuredClone(journal); corrupted[3]!.entry.prev = journal[0]!.hash;
  expect(() => openCommands(scope, owner, null, at(4), corrupted)).toThrow("coverage");
});
