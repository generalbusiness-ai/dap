/** Clone and service ports are scripted bounded reads. This witnesses client
 * correlation and explicit archived answers, not Git parsing or authority. */
import { expect, test } from "vitest";
import type { Archived, Head, LogPage, Read, ScopeRef } from "@generalbusiness/dap-contract";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { ANSWERS } from "../src/answers.ts";
import { ScopeHandle, bindingTransport, journalTail, type JournalClone, type ServiceBinding } from "../src/index.ts";

const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };
const row = (seq: number) => { const bytes = `scripted journal bytes ${seq}`; return { seq, bytes, hash: digestBytes(utf8(`${DOMAINS.entry}\n${bytes}`)) }; };
const head = (seq: number): Head => ({ seq, hash: row(seq).hash });
const receipt = (seq: number): Archived => ({ floor: seq, commit: seq.toString(16).padStart(40, "0"), through: head(seq) });
const page = (from: number, through: number): Read<LogPage> => ({ ok: true, at: head(through), complete: true, value: { scope, definition: "platform:task@1", entries: from <= through ? [row(from)] : [] } });
const clone = (through: number): JournalClone => ({ scope, through: head(through), commit: async id => id === receipt(through).commit ? { scope, through: head(through) } : null, log: async from => page(from, through) });

test("both archived answer forms require the exact receipt and following a receipt preserves it", async () => {
  const archived = receipt(9), fact = { at: scope, ...head(1) };
  const answer = { answer: "archived", archived, fact };
  expect(ANSWERS.submit(answer)).toBe(true);
  const read = { ok: false, reason: "archived", archived, fact, next: "9" };
  for (const guard of [ANSWERS.settle, ANSWERS.entry, ANSWERS.history, ANSWERS.log]) expect(guard(read)).toBe(true);
  for (const bad of [undefined, {}, { ...archived, commit: "main" }, { ...archived, floor: 11 }, { ...archived, extra: true }]) {
    expect(ANSWERS.submit({ ...answer, archived: bad })).toBe(false);
    expect(ANSWERS.entry({ ...read, archived: bad })).toBe(false);
  }
  expect(ANSWERS.submit({ ...answer, fact: { ...fact, seq: 9 } })).toBe(false);
  expect(ANSWERS.entry({ ok: false, reason: "archived" })).toBe(false);
  const transport = bindingTransport({ entry: async () => read } as unknown as ServiceBinding);
  const handle = new ScopeHandle(transport, scope.scope);
  const followed = await handle.followReceipt({ fact } as never);
  expect(followed).toEqual({ ok: false, reason: "archived", archived });
  if (!followed.ok && followed.reason === "archived") expect(followed.archived).toEqual(archived);
});

test("a refreshed clone returns the missing prefix and checks commit identity plus the through entry's bytes", async () => {
  const seen: number[] = [];
  const service = async (from: number): Promise<Read<LogPage>> => { seen.push(from); return from < 9 ? { ok: false, reason: "archived", archived: receipt(9) } : page(from, 10); };
  let fetches = 0;
  const tail = journalTail(clone(1), service, async wanted => { expect(wanted).toEqual(receipt(9)); fetches++; return clone(9); });
  expect(await tail.read(2)).toMatchObject({ ok: true, complete: false, next: "3", value: { entries: [row(2)] } });
  expect(await tail.read(10)).toMatchObject({ ok: true, value: { entries: [row(10)] } });
  expect([fetches, seen]).toEqual([1, [2, 10]]);
  for (const broken of [
    { ...clone(9), commit: async () => null },
    { ...clone(9), commit: async () => ({ scope: { ...scope, inc: `in_${"b".repeat(26)}` as const }, through: head(9) }) },
    { ...clone(9), log: async (from: number) => from === 9 ? { ...page(9, 9), value: { scope, definition: "platform:task@1", entries: [{ ...row(9), bytes: "changed after its hash" }] } } as Read<LogPage> : page(from, 9) },
  ]) {
    expect(await journalTail(clone(1), service, async () => broken).read(2)).toMatchObject({ ok: false, reason: "incomplete", detail: expect.stringMatching(/^floor-commit-/) });
  }
});

test("three moving-floor refreshes preserve their prefixes and the next repeat is incomplete", async () => {
  let next = 2, fetches = 0;
  const tail = journalTail(clone(0), async () => ({ ok: false, reason: "archived", archived: receipt((next += 2) - 2) }), async wanted => { fetches++; return clone(wanted.through.seq); });
  for (const from of [1, 3, 5]) expect(await tail.read(from)).toMatchObject({ ok: true, complete: false });
  expect(await tail.read(7)).toEqual({ ok: false, reason: "incomplete", detail: "floor-moved" });
  expect(fetches).toBe(3);
});
