/** Genuine native genesis/act rows and SQLite. This witnesses reference
 * projection only, not privacy admission, integrity, export or Replay. */
import { expect, test } from "vitest";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { textDigest } from "@generalbusiness/dap-bytes";
import { outcomeValueDependencies, type OperationRules } from "@generalbusiness/dap-derive";
import { ARCHIVE_CERTIFIED_RULES_COHORT, RULES_CERTIFICATE_KIND, destinationEvidenceValues, platform, rulesCertificateEvidenceValues } from "@generalbusiness/dap-platform";
import { ArchiveOutcomeValues } from "../src/archive-outcome-values.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { readArchiveDigestFields } from "../src/archive-digest-fields.ts";
import type { SqlValue } from "../src/sqlite.ts";
import { create, definition, rita } from "./fixtures-native.ts";

test("native field projection returns only requested digest scalars, preserves slots and binds the exact source while charging repeated reads", async () => {
  const lane = await create(), note = "TEST inline note: the metadata reader must not return this";
  await lane.did(rita, "remark", { on: 0, fields: { text: note } });
  const result = await lane.inside(state => {
    const budget = new ArchiveBudget(), cells: unknown[] = [];
    const sql = { exec(query: string, ...args: SqlValue[]) {
      const rows = state.storage.sql.exec(query, ...args).toArray();
      for (const row of rows) cells.push(...Object.values(row));
      return { toArray: () => rows };
    } };
    // Test inputs come from actual keyed native size/hash metadata.
    const position = (seq: number) => {
      const row = state.storage.sql.exec<{ hash: string; size: number }>("SELECT hash, size FROM entry WHERE seq = ? LIMIT 1", seq).one();
      return { seq, hash: row.hash as typeof definition.digest, bytes: row.size };
    };
    const genesis = position(0), act = position(1);
    const read = (at: typeof genesis, paths: readonly string[]) => {
      try { return { ok: true as const, fields: readArchiveDigestFields(sql, at, paths, budget) }; }
      catch (error) { return { ok: false as const, reason: error && typeof error === "object" && "reason" in error ? error.reason : "unexpected" }; }
    };
    const single = read(genesis, ["$.input.seed.definition"]);
    const batch = read(genesis, ["$.input.seed.definition", "$.input.type", "$.absent"]);
    const inline = read(act, ["$.input.signed.intent.fields.text"]);
    const before = budget.admitted(), repeated = read(genesis, ["$.input.seed.definition"]), after = budget.admitted();
    const wrongSource = read({ ...genesis, hash: textDigest("TEST wrong source identity") }, ["$.input.seed.definition"]);
    return { single, batch, inline, repeated, wrongSource, cells, before, after };
  });
  // Observe SQL's actual returned cells before any JS digest guard: the
  // reader must not first return an inline string and then discard it.
  expect([...new Set(result.cells.filter(cell => typeof cell === "string"))]).toEqual([definition.digest]);
  expect(result.cells).not.toContain(note);
  expect(result.single).toEqual({ ok: true, fields: [definition.digest] });
  expect(result.batch).toEqual({ ok: true, fields: [definition.digest, null, null] });
  expect(result.inline).toEqual({ ok: true, fields: [null] });
  expect(result.repeated).toEqual(result.single);
  expect(result.after.calls).toBeGreaterThan(result.before.calls);
  expect(result.after.inputWork).toBeGreaterThan(result.before.inputWork);
  expect(result.wrongSource).toEqual({ ok: false, reason: "mismatch" });


  // SCRIPTED scalar SQL port: selector identity, grammar and mutation guards
  // only. The separate native G14 journey owns real SQL/body correspondence,
  // authenticated certificate provenance and full archive export.
  const at = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "destination" } as ScopeRef;
  const proposal = textDigest("SCRIPTED admitted policy"), proof = textDigest("SCRIPTED admitted tree proof"), hash = textDigest("SCRIPTED selected outcome");
  const started = { at, seq: 1, hash: textDigest("SCRIPTED certificate opening") }, position = { seq: 2, hash, bytes: 512 };
  const native = platform(ARCHIVE_CERTIFIED_RULES_COHORT.destination)!.rules["rules-certificate-outcome-v14"];
  if (!native || native.place !== "outcome") return expect.fail("The exact native certificate owner is required.");
  expect(native.rules.values).toBe(rulesCertificateEvidenceValues);
  const rules: OperationRules = { ...native.rules, valueDomains: native.rules.valueDomains!.map(row => ({ ...row })) };
  const owners = (given: OperationRules, owner: string = ARCHIVE_CERTIFIED_RULES_COHORT.destination, kind: string = RULES_CERTIFICATE_KIND) => new Map([[owner, new Map([[kind, given]])]]);
  const budget = new ArchiveBudget(), queries: string[] = [];
  const good: Record<string, SqlValue> = { body_object: 1, body_keys: 3, proposal, proof, started_object: 1, started_keys: 3,
    at_object: 1, at_keys: 3, scope: at.scope, inc: at.inc, kind: at.kind, seq: started.seq, hash: started.hash };
  let projected = good;
  let mutate: (() => void) | undefined;
  const sql = { exec(query: string) {
    queries.push(query);
    if (query.includes("known.key AS slot")) return { toArray: () => [{ slot: 0, result: "confirmed" }] };
    mutate?.();
    return { toArray: () => [projected] };
  } };
  const projector = new ArchiveOutcomeValues(owners(rules), budget, PROPOSED_BOUNDS);
  const origin = { at: { at, seq: position.seq, hash }, input: "outcome" as const };
  const expected = outcomeValueDependencies(origin, rules, { basis: "own-answer", body: { proposal, proof, started } })!
    .map(({ dependency, value }) => ({ dependency, max: value.max }));
  expect(projector.project(sql, at, position)).toEqual(expected);
  expect(expected.map(row => row.dependency)).toMatchObject([
    { mode: "required", consumer: "outcome-value", key: { kind: "value", domain: "artroom-rules-policy-1", digest: proposal } },
    { mode: "required", consumer: "outcome-value", key: { kind: "value", domain: "artroom-rules-tree-1", digest: proof } },
  ]);
  const before = budget.admitted();
  expect(projector.project(sql, at, position)).toEqual(expected);
  const after = budget.admitted();
  expect(after.calls).toBeGreaterThan(before.calls);
  expect(after.inputWork).toBeGreaterThan(before.inputWork);
  // Extra body fields and malformed actual started scalars select no values,
  // exactly as the native callback does; no valid fact is fabricated.
  projected = { ...good, body_keys: 4 };
  expect(projector.project(sql, at, position)).toEqual([]);
  expect(rulesCertificateEvidenceValues({ basis: "own-answer", body: { proposal, proof, started, extra: true } })).toEqual([]);
  projected = { ...good, hash: null };
  expect(projector.project(sql, at, position)).toEqual([]);
  expect(rulesCertificateEvidenceValues({ basis: "own-answer", body: { proposal, proof, started: { ...started, hash: null } } })).toEqual([]);
  const attempts = queries.length;
  expect(() => new ArchiveOutcomeValues(owners(rules, "platform:destination@13"), budget, PROPOSED_BOUNDS)).toThrow("unsupported-archive-cohort");
  expect(() => new ArchiveOutcomeValues(owners(rules, ARCHIVE_CERTIFIED_RULES_COHORT.destination, "judge"), budget, PROPOSED_BOUNDS)).toThrow("unsupported-archive-cohort");
  expect(queries).toHaveLength(attempts);
  let callbackCalls = 0;
  const alien = () => { callbackCalls++; return []; };
  expect(() => new ArchiveOutcomeValues(owners({ ...rules, values: alien }), budget, PROPOSED_BOUNDS)).toThrow("unsupported-archive-cohort");
  expect(() => new ArchiveOutcomeValues(owners({ ...rules, values: destinationEvidenceValues }), budget, PROPOSED_BOUNDS)).toThrow("unsupported-archive-cohort");
  expect(() => new ArchiveOutcomeValues(owners({ ...rules, valueDomains: [{ domain: "artroom-rules-policy-1", max: 262145 }, { domain: "artroom-rules-tree-1", max: 262144 }] }), budget, PROPOSED_BOUNDS)).toThrow("unsupported-archive-cohort");
  projected = good;
  mutate = () => { rules.values = alien; };
  expect(() => projector.project(sql, at, position)).toThrow("unsupported-archive-cohort");
  expect(callbackCalls).toBe(0);
  rules.values = native.rules.values;
  mutate = () => { rules.valueDomains = [...rules.valueDomains!].reverse(); };
  expect(() => projector.project(sql, at, position)).toThrow("unsupported-archive-cohort");
});
