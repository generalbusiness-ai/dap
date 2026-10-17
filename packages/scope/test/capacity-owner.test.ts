import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry } from "@generalbusiness/dap-contract";
import { parseStrict } from "@generalbusiness/artroom-bytes";
import { JOB_READ_ACTION, ownerReservations, reserved } from "@generalbusiness/dap-derive";
import { grantOf, variant } from "@generalbusiness/dap-derive/testing";
import { SqliteStore } from "../src/index.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { controls } from "../src/testing.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, creation, definition, stubOf, una, vic } from "./support.ts";

test("native read-token reservations keep their entry bytes after the mint replaces its key and the object is evicted", async () => {
  // Real scope, native preparation/outcome code, SQLite, driver and eviction.
  // Lane data and authority are fixtures. The host answer below is a
  // stand-in, not a token minted at any provider. No raw record is injected.
  const under = variant(definition.declared, d => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.capabilities.push({ name: "git-read", version: 1 });
    const name = { type: "text", max: 64 };
    const checks = { type: "list", max: 4, of: { type: "record", of: { name: { ...name, required: true }, checker: { type: "member", required: true } } } };
    d.items.rules = { many: false, max: 1, states: { current: { final: false } }, initial: "current", parties: {}, refs: {}, values: { checks: { fixed: true, required: true, of: checks } } };
    d.items.job = { many: true, max: 4, states: { requested: { final: false } }, initial: "requested", parties: {}, refs: {}, values: { name: { fixed: true, required: true, of: name }, deadline: { fixed: true, required: true, of: { type: "time" } } } };
    const form = { grant: "report", also: {}, guards: [], sends: [], attention: [] };
    d.acts.publish = { ...form, step: "open", on: "rules", fields: { checks: { ...checks, required: true } }, effects: [{ value: { slot: "checks", from: { field: "checks" } } }] };
    d.acts["request-check"] = { ...form, step: "open", on: "job", fields: { name: { ...name, required: true } }, effects: [{ value: { slot: "name", from: { field: "name" } } }, { value: { slot: "deadline", from: { time: { plusSeconds: 1800 } } } }] };
  });
  const asked = creation(at(60), under), c = controls(asked.name, START);
  let sends = 0;
  wired.set(asked.name, () => ({ capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, outside: {
    accepts: (owner, kind) => owner === "git-read@1" && kind === "mint",
    send: async () => { sends++; return { result: "confirmed", evidence: { basis: "own-answer", body: { token: "tok_capacity_probe", ends: at(1700) } } }; },
  } }));
  try {
    const created = await stubOf(asked.name).create(asked.signed, under.declared);
    if (created.answer !== "accepted") throw new Error(`capacity owner scope must create: ${JSON.stringify(created)}`);
    const scope = new Lane(asked.name, c, created.receipt.fact.at, created.receipt, asked.signed);
    await scope.did(una, "publish", { fields: { checks: [{ name: "ci", checker: vic.member }] } });
    const job = await scope.did(una, "request-check", { fields: { name: "ci" } });
    expect(await scope.stub.prepare(scope.intent(vic, "git-read@1:job-read", { fields: { job: job.fact } }), [grantOf(vic, scope.at, [JOB_READ_ACTION])], "git-read@1", "job-read")).toMatchObject({ answer: "accepted" });
    await (scope.object as unknown as { effect(): Promise<number> }).effect();
    const inspect = () => scope.inside(state => {
      const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
      const head = parseStrict(store.stored(store.scope()!.head.seq)!.bytes) as Entry;
      return { keys: store.keyCounts(), token: store.record("git-read@1", "token", [1])?.state, owner: ownerReservations(CAPABILITY_CODE, store, under), pending: reserved(store, under, head.input, CAPABILITY_CODE), snapshot: store.all() };
    });
    const before = await inspect();
    expect([sends, before.keys.records, before.token]).toEqual([1, 1, "live"]);
    expect(before.owner).toEqual({ entries: 6, items: 0, records: 0, bytes: 6 * PROPOSED_BOUNDS.entryBytes, requests: 0 });
    expect(before.pending).toEqual({ entries: 7, items: 0, records: 0, bytes: 7 * PROPOSED_BOUNDS.entryBytes, requests: 0 });
    await scope.restart();
    expect(await inspect()).toEqual(before);
    expect(sends).toBe(1);
  } finally { wired.delete(asked.name); }
});
