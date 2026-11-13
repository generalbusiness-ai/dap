/**
 * `ScopeHandle.log` checks each page before a caller folds it. STAND-IN: a scripted service binding answers `summary` and `log`.
 * It proves what the handle refuses and how it labels a page, not what a scope stores or which rows a reader may see. The scope
 * test `packages/scope/test/handle-log.test.ts` folds the pages of a real scope.
 */
import { expect, test } from "vitest";
import type { Head, LogPage, Read, ScopeRef } from "@generalbusiness/dap-contract";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { ScopeHandle, TransportError, bindingTransport, secretSigner, signedReads, type ServiceBinding } from "../src/index.ts";

const DEFINITION = "platform:task@1";
const SESSION = "Session TEST-token";
const hashOf = (bytes: string) => digestBytes(utf8(`${DOMAINS.entry}\n${bytes}`));
// Entry 0 is a genesis: its seed names the scope and its hash is the genesis. Later entries name that genesis.
const seed = { v: 1, kind: "lane", definition: DEFINITION, creator: null, cause: `sha256:${"c".repeat(64)}`, ordinal: 0 };
const born = canonicalize({ v: 1, seq: 0, text: "TEST entry 0", input: { type: "genesis", seed } } as never);
const ref: ScopeRef = { scope: scopeIdOf(seed as never), genesis: hashOf(born) as ScopeRef["genesis"] };
const other: ScopeRef = { scope: `sc_${"b".repeat(51)}a`, genesis: `sha256:${"b".repeat(64)}` };
const row = (seq: number, at: ScopeRef = ref) => {
  const bytes = seq === 0 && at === ref ? born : canonicalize({ v: 1, genesis: at.genesis, seq, text: `TEST entry ${seq}` } as never);
  return { seq, bytes, hash: hashOf(bytes) };
};
const head = (seq: number): Head => ({ seq, hash: row(seq).hash });
const page = (seqs: number[], at: number, next?: string, value: Partial<LogPage> = {}): Read<LogPage> =>
  ({ ok: true, at: head(at), value: { scope: ref, definition: DEFINITION, entries: seqs.map(seq => row(seq)), ...value }, complete: next === undefined, ...(next === undefined ? {} : { next }) });

/** A handle over a binding that answers its summary and then the given log page. */
function handleOf(answer: Read<LogPage>, reader: unknown = SESSION, sign = false) {
  const readers: unknown[] = [];
  const binding = bindingTransport({
    summary: async () => ({ ok: true, at: head(9), value: { scope: ref, status: "active", definition: DEFINITION, time: "2099-01-01T00:00:00Z", items: [], counts: [] }, complete: true }),
    log: async (_scope: string, reader: unknown) => { readers.push(reader); return answer; },
  } as unknown as ServiceBinding);
  const transport = sign ? signedReads(binding, secretSigner(new Uint8Array(32).fill(5)), { now: () => Date.parse("2099-01-01T00:00:00Z") }) : binding;
  return { handle: new ScopeHandle(transport, ref.scope, reader), readers };
}

// Invariant: a session page whose seqs run from the cursor to its `next`, or to the head when it has none, is whole.
test("a session page that runs without a gap from the cursor to its next or to the head is whole", async () => {
  expect(await handleOf(page([0, 1, 2], 9, "3")).handle.log()).toMatchObject({ ok: true, coverage: "whole", next: "3" });
  expect(await handleOf(page([3, 4, 5, 6, 7, 8, 9], 9)).handle.log("3")).toMatchObject({ ok: true, coverage: "whole", complete: true });
  expect(await handleOf(page([], 9)).handle.log("10")).toMatchObject({ ok: true, coverage: "whole" });
  const archived: Read<LogPage> = { ok: false, reason: "archived", archived: { floor: 4, commit: "c".repeat(40), through: head(3) }, next: "4" };
  expect(await handleOf(archived).handle.log("1")).toEqual(archived);
});

// Invariant: a page is refused when an entry's bytes do not hash to its hash, or when it is another scope's.
test("a page with a wrong hash, another scope's page or another definition's page is refused", async () => {
  const wrong = page([0, 1, 2], 9, "3");
  if (wrong.ok) wrong.value = { ...wrong.value, entries: wrong.value.entries.map((entry, i) => i === 1 ? { ...entry, hash: row(5).hash } : entry) };
  await expect(handleOf(wrong).handle.log()).rejects.toThrow(new TransportError("log entry 1 does not hash to its hash"));
  await expect(handleOf(page([0, 1], 9, "2", { scope: other })).handle.log()).rejects.toThrow(new TransportError("the log page is of another scope or definition"));
  await expect(handleOf(page([0, 1], 9, "2", { definition: "platform:task@2" })).handle.log()).rejects.toThrow(new TransportError("the log page is of another scope or definition"));
  await expect(handleOf(page([0, 1], 9, "2", { entries: [row(0), row(1, other)] })).handle.log()).rejects.toThrow(new TransportError("log entry 1 is not this scope's entry at that seq"));
  // An entry with no input names neither a seed nor a genesis, so it is not this scope's entry.
  const bare = canonicalize({ v: 1, seq: 1, text: "TEST entry 1" } as never);
  await expect(handleOf(page([0, 1], 9, "2", { entries: [row(0), { seq: 1, bytes: bare, hash: hashOf(bare) }] })).handle.log()).rejects.toThrow(new TransportError("log entry 1 is not this scope's entry at that seq"));
  await expect(handleOf(page([0, 2, 1], 9, "3")).handle.log()).rejects.toThrow(new TransportError("the log page's seqs do not rise from the cursor to the head"));
});

// Invariant: a page with a gap is never whole, even from a session.
test("a session page with a gap is filtered", async () => {
  expect(await handleOf(page([0, 1, 3], 9, "4")).handle.log()).toMatchObject({ ok: true, coverage: "filtered" });
  expect(await handleOf(page([4, 5], 9, "6")).handle.log("3")).toMatchObject({ ok: true, coverage: "filtered" });
});

// Invariant: a page whose rows stop before the head while it reports `complete` is never whole. A signed read keeps such a prefix:
// the scope computes `complete` and `next` before it filters the rows.
test("a cut tail is filtered: a signed read whose kept rows run without a gap from the start, and a session page short of the head", async () => {
  const signed = handleOf(page([0, 1, 2], 9), null, true);
  expect(await signed.handle.log()).toMatchObject({ ok: true, complete: true, coverage: "filtered" });
  expect(String(signed.readers[0])).toMatch(/^Signed /);
  // A signed page that meets its `next` is still filtered, and the same page from a session is whole.
  expect(await handleOf(page([0, 1, 2], 9, "3"), null, true).handle.log()).toMatchObject({ ok: true, coverage: "filtered" });
  expect(await handleOf(page([0, 1, 2], 9, "3")).handle.log()).toMatchObject({ ok: true, coverage: "whole" });
  expect(await handleOf(page([0, 1, 2], 9)).handle.log()).toMatchObject({ ok: true, complete: true, coverage: "filtered" });
});

// Invariant: the transport sends no minimum with `log`, so the handle refuses a page below the minimum it was given.
test("a page below the read minimum is refused", async () => {
  await expect(handleOf(page([0, 1, 2], 2)).handle.log(undefined, { at: ref, head: 5 })).rejects.toThrow(new TransportError("the reply does not reach the read minimum"));
  await expect(handleOf(page([0, 1, 2], 2)).handle.log(undefined, { at: other, head: 0 })).rejects.toThrow(new TransportError("the read minimum names another scope"));
  expect(await handleOf(page([0, 1, 2], 2)).handle.log(undefined, { at: ref, head: 2 })).toMatchObject({ ok: true, coverage: "whole" });
});
