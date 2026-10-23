import { expect, test } from "vitest";
import { ItemQueryBudget, ItemQueryUnavailable } from "../src/item-query-budget.ts";
import { applicationProjectionFactTimes } from "../src/applications/projection-fact-times.ts";
import { applicationProjectionFactSigners } from "../src/applications/projection-fact-signers.ts";
import { textDigest } from "@generalbusiness/dap-bytes";
import type { SqlValue } from "../src/sqlite.ts";

// Invariant: operation admission stops the next native call before execution, fences the whole
// operation on exhaustion, and disallows a phase from another credential mode. SQL is a STAND-IN.
test("causal query SQL admits its 128th call and refuses the 129th before execution or another phase", () => {
  let calls = 0;
  const raw = { exec: () => { calls++; return { toArray: () => [] }; } };
  // Zero metadata in this stand-in isolates the call ceiling: reserving
  // 4096 bytes per call also reaches the separate 512 KiB ceiling at 128.
  const budget = new ItemQueryBudget("signed", () => true), sql = budget.sql("causal", raw);
  for (let n = 0; n < 128; n++) sql.exec("SELECT 1");
  expect(calls).toBe(128);
  expect(() => sql.exec("SELECT 1")).toThrow(ItemQueryUnavailable);
  expect(() => budget.sql("page", raw).exec("SELECT 1")).toThrow(ItemQueryUnavailable);
  expect(calls).toBe(128);
  const session = new ItemQueryBudget("session", () => true);
  expect(() => session.sql("causal", raw).exec("SELECT 1")).toThrow(ItemQueryUnavailable);
  expect(calls).toBe(128);
});

// Invariant: signer metadata shares the existing source budget even after
// a full item page; exhaustion prevents SQL. SQL answers are stand-ins.
test("fact-signer metadata admits no entry bodies and cannot top up the source allowance", () => {
  const scope = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" as const };
  const hash = textDigest("PUBLIC TEST exact recorded signer"), frame = { scope: { at: scope, head: { seq: 100, hash } } } as Parameters<typeof applicationProjectionFactSigners>[1];
  const signer = { membership: { ...scope, kind: "membership" }, member: "@recorded" };
  const refs = Array.from({ length: 100 }, (_, seq) => ({ seq, hash })), queries: string[] = [];
  const sql = { exec(query: string, ...args: SqlValue[]) {
    queries.push(query);
    return { toArray: () => args.slice(0, -1).map(seq => ({ seq, hash, signer: JSON.stringify(signer) })) };
  } };
  const budget = new ItemQueryBudget("session", () => true);
  budget.spend("page", { bodies: 100, payloadBytes: 200000, metadata: 16000 });
  expect(applicationProjectionFactSigners(sql, frame, refs, budget)?.entries[99]?.signer).toEqual(signer);
  expect(budget.admitted().total).toMatchObject({ bodies: 100, payloadBytes: 200000, metadata: 92800, candidates: 100, calls: 2 });
  expect(queries.every(query => !/\bbytes\b/.test(query))).toBe(true);
  queries.length = 0;
  const exhausted = new ItemQueryBudget("session", () => true);
  exhausted.spend("page", { metadata: 128 * 1024 - 76799 });
  expect(() => applicationProjectionFactSigners(sql, frame, refs, exhausted)).toThrow(ItemQueryUnavailable);
  expect(queries).toHaveLength(0);
});

// Invariant: composing G2p retains its unchanged local cap and also spends the parent allowance;
// stopping the owning operation prevents the next preparation cost before storage or validation.
test("query preparation preserves phase limits, accounts genesis reservation once, and inherits owner lifetime", () => {
  let active = true;
  const budget = new ItemQueryBudget("session", () => active), local = budget.preparation("preparation");
  local.spend({ calls: 16, genesis: 1024 * 1024 });
  budget.reservePeerPreparation();
  expect(budget.admitted().total).toMatchObject({ calls: 32, historyBodies: 2, historyBytes: 2 * 1024 * 1024, genesisBytes: 2 * 1024 * 1024 });
  expect(() => local.spend({ calls: 1 })).toThrow();
  active = false;
  expect(() => budget.preparation("preparation").spend({ metadata: 1 })).toThrow();
  expect(budget.admitted().total.metadata).toBe(64 * 1024);
});

test("fact-time metadata spends the existing source allowance before its bounded indexed lookups", () => {
  const scope = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" as const };
  const hash = textDigest("PUBLIC TEST fact-time metadata"), frame = { scope: { at: scope, head: { seq: 200, hash } } } as Parameters<typeof applicationProjectionFactTimes>[1];
  const refs = Array.from({ length: 200 }, (_, i) => ({ seq: i + 1, hash: null }));
  const queries: string[] = [];
  const sql = { exec(query: string, ...args: SqlValue[]) {
    queries.push(query);
    return { toArray: () => args.slice(0, -1).map(seq => ({ seq, hash, time: "2026-10-16T08:00:00Z" })) };
  } };
  const budget = new ItemQueryBudget("session", () => true);
  expect(applicationProjectionFactTimes(sql, frame, refs, budget)?.entries).toHaveLength(200);
  expect(budget.admitted().total).toMatchObject({ calls: 2, candidates: 200, metadata: 32000, bodies: 0, payloadBytes: 0 });
  expect(queries.every(query => !/\bbytes\b/.test(query))).toBe(true);
  queries.length = 0;
  const exhausted = new ItemQueryBudget("session", () => true);
  exhausted.spend("page", { metadata: 128 * 1024 - 15999 });
  expect(() => applicationProjectionFactTimes(sql, frame, refs, exhausted)).toThrow(ItemQueryUnavailable);
  expect(queries).toHaveLength(0);
});
