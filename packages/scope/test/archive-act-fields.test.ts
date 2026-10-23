import { archiveActFieldsChange } from "./definition-corpus-data.ts";
/** Real native signed acts and SQLite. The first cases use TEST lane data
 * and grants; the final case creates the actual Rules scope. This is field
 * projection, not complete dependency or privacy admission. */
import { expect, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import { DOMAINS, PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, isEntry, parseStrict, textDigest } from "@generalbusiness/dap-bytes";
import { localRetainedPlan, outcomeValueDomains, validateDefinition } from "@generalbusiness/dap-derive";
import { notesDefinition, variant } from "@generalbusiness/dap-derive/testing";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { platform } from "@generalbusiness/dap-platform";
import { ArchiveActFields } from "../src/archive-act-fields.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import type { SqlValue } from "../src/sqlite.ts";
import { create, definition, rita } from "./fixtures-native.ts";
import { sessionRoom } from "./support/session-room.ts";

test.each([false, true])("native act field projection shares the byte selector with detached=%s and ignores inline digest-shaped text", async detached => {
  const declared = variant(definition.declared, archiveActFieldsChange(detached));
  const lane = await create({}, {}, declared), raw = "TEST native reference; no body projection 🎵";
  const digest = textDigest(raw), inline = textDigest("TEST digest-shaped inline field, never a detached consumer");
  const answer = await lane.stub.submit(lane.intent(rita, "remark", { on: 0, fields: { text: detached ? digest : inline, extra: inline } }), lane.grants(), detached ? { texts: [raw] } : {});
  expect(answer.answer).toBe("accepted");
  const result = await lane.inside(state => {
    // Only the test oracle reads the full genuine entry. The projector's
    // own SQL port below records exactly what crossed its boundary.
    const row = state.storage.sql.exec<{ bytes: string; size: number; hash: typeof digest }>("SELECT bytes, size, hash FROM entry WHERE seq = 1 LIMIT 1").one();
    const entry = parseStrict(row.bytes); if (!isEntry(entry)) return expect.fail("Native fixture must have a genuine entry.");
    const expected = localRetainedPlan(declared, entry, row.hash, null, PROPOSED_BOUNDS).dependencies.filter(({ dependency }) => dependency.mode === "text" || dependency.mode === "required" && dependency.consumer === "act-value");
    const budget = new ArchiveBudget(), cells: unknown[] = [];
    let firstCalls = 0, secondCalls = 0;
    const read = (query: string, args: SqlValue[]) => {
      const rows = state.storage.sql.exec(query, ...args).toArray();
      for (const held of rows) cells.push(...Object.values(held));
      return { toArray: () => rows };
    };
    const sql = { exec(query: string, ...args: SqlValue[]) { firstCalls++; return read(query, args); } };
    const fresh = { exec(query: string, ...args: SqlValue[]) { secondCalls++; return read(query, args); } };
    const reader = new ArchiveActFields(declared, budget, PROPOSED_BOUNDS);
    const projected = reader.project(sql, lane.at, { seq: 1, hash: row.hash, bytes: row.size });
    const before = budget.admitted(), oldCalls = firstCalls;
    // Real native SQL through a distinct per-call port. Reusing paid schema
    // metadata must never make the next projection use the previous port.
    const repeated = reader.project(fresh, lane.at, { seq: 1, hash: row.hash, bytes: row.size }), after = budget.admitted();
    return { projected, repeated, expected, before, after, cells, oldCalls, firstCalls, secondCalls };
  });
  expect(result.projected.kind).toBe("remark");
  expect(result.projected.dependencies).toEqual(result.expected);
  expect(result.projected.dependencies.map(row => row.dependency.mode === "text" ? row.dependency.key.digest : "unexpected")).toEqual(detached ? [digest] : []);
  expect([...new Set(result.cells.filter(cell => typeof cell === "string"))]).toEqual(detached ? ["remark", digest] : ["remark"]);
  expect(result.cells).not.toContain(inline);
  expect(result.cells).not.toContain(raw);
  expect(result.repeated).toEqual(result.projected);
  expect(result.after.calls).toBeGreaterThan(result.before.calls);
  expect(result.after.inputWork).toBeGreaterThan(result.before.inputWork);
  expect(result.firstCalls).toBe(result.oldCalls); expect(result.secondCalls).toBe(result.oldCalls);
  expect(result.after.metadata - result.before.metadata).toBeLessThan(PROPOSED_BOUNDS.definitionBytes);
});

test("native Rules activation projects the definition key under the owning definition ceiling", async () => {
  // Real native Register/Directory/Rules creation and production rules.
  // Host, clock and setup inspection remain the sessionRoom TEST fixtures.
  const room = await sessionRoom("platform:register@3"), { life } = room, membership = room.children[0]!, rules = room.children[1]!;
  try {
    const seat = await life.wait(() => membership.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => membership.did(rita, "first-key", { fields: { member: seat }, expected: await membership.expected({ roster: 0, member: seat }) }));
    const answer = await life.wait(async () => rules.stub.submit(await rules.intent(rita, "activate", {
      fields: { digest: notesDefinition.digest, name: notesDefinition.declared.name },
    }), [], { values: [canonicalize(notesDefinition.declared)] }));
    expect(answer.answer, JSON.stringify(answer)).toBe("accepted");
    if (answer.answer !== "accepted") return;
    const pin = (await life.wait(() => rules.summary())).value.definition;
    if (pin !== "platform:rules@2") return expect.fail("The actual native Rules2 scope is required.");
    const native = platform(pin)!;
    // This remains large enough for both genuine definitions. A place's
    // larger declared ceiling cannot widen the owning archive's bound.
    const bounds = { ...PROPOSED_BOUNDS, definitionBytes: PROPOSED_BOUNDS.definitionBytes - 1 };
    const checked = validateDefinition(native.data, bounds, RULE_PROFILES, { platform: true, outcomeValues: outcomeValueDomains(native.data, native.rules) });
    if (!checked.ok) return expect.fail("The native Rules data must validate under this owning bound.");
    const result = await life.wait(() => runInDurableObject(rules.object, (_instance, state) => {
      const row = state.storage.sql.exec<{ bytes: string; hash: typeof notesDefinition.digest; size: number }>("SELECT bytes, hash, size FROM entry WHERE seq = ? LIMIT 1", answer.receipt.fact.seq).one();
      const entry = parseStrict(row.bytes); if (!isEntry(entry)) return expect.fail("The actual native activation entry is required.");
      const expected = localRetainedPlan(checked.definition, entry, row.hash, null, bounds).dependencies.filter(({ dependency }) => dependency.mode === "required" && dependency.consumer === "act-value");
      const cells: unknown[] = [], sql = { exec(query: string, ...args: SqlValue[]) {
        const rows = state.storage.sql.exec(query, ...args).toArray();
        for (const held of rows) cells.push(...Object.values(held));
        return { toArray: () => rows };
      } };
      return { expected, projected: new ArchiveActFields(checked.definition, new ArchiveBudget(), bounds).project(sql, entry.at, { seq: entry.seq, hash: row.hash, bytes: row.size }), cells };
    }));
    expect(result.projected.dependencies).toEqual(result.expected);
    expect(result.projected.dependencies).toHaveLength(1);
    expect(result.projected.dependencies[0]).toMatchObject({ dependency: { mode: "required", consumer: "act-value", key: { kind: "definition", digest: notesDefinition.digest } }, max: bounds.definitionBytes });
    expect([...new Set(result.cells.filter(cell => typeof cell === "string"))]).toEqual(["activate", notesDefinition.digest]);
    expect(result.cells).not.toContain(DOMAINS.definition);
    expect(result.cells).not.toContain(canonicalize(notesDefinition.declared));
  } finally { life.release(); }
});
