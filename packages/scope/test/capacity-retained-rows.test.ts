/** Real Scope turns and native SQLite. The small definitions, authority and
 * clock are fixtures. Raw writes below test only the storage boundary. */
import { expect, test } from "vitest";
import { type Effect, type Input, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, intentDigest, scopeIdOf, signIntent, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { checkpointOf, fits, type Draft } from "@generalbusiness/dap-derive";
import { grantOf, notesDefinition, variant } from "@generalbusiness/dap-derive/testing";
import { Turns } from "../src/turn.ts";
import { production } from "../src/ports.ts";
import { storedSequenceOf } from "./support/local-sequence.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { controls } from "../src/testing.ts";
import { scopeScaleChange } from "./definition-corpus-data.ts";
import { Lane, START, at, create, rita, stubOf } from "./fixtures-native.ts";
import { archiveDefinition, archiveSql } from "./support/archive.ts";

// Both names let these witnesses run unchanged at CDF-1 head 5339ccc5,
// whose stored total counted entry rows only. The shipped head has one key.
const total = (state: DurableObjectState): number => state.storage.sql.exec<{ n: number }>("SELECT COALESCE(SUM(CAST(v AS INTEGER)), 0) AS n FROM meta WHERE k IN ('retained-bytes', 'retained-entry-bytes')").one().n;
const held = (lane: Lane) => lane.inside(state => ({ total: total(state), rules: state.storage.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM retained_input WHERE kind='rule'").one().n }));

// Invariant: an ordinary member cannot add a distinct rule row past the
// total retained-byte limit, even when the definition has no capacity opt-in.
test("Native member rule-guard acts at the retained-byte cap refuse scope-full scopeBytes and write nothing", async () => {
  const under = variant(archiveDefinition.declared, scopeScaleChange());
  const lane = await create({}, {}, under);
  const submit = (text: string) => lane.stub.submit(lane.intent(rita, "remark", { on: 0, expected: { on: 1 }, fields: { text } }), [grantOf(rita, lane.at, ["remark"])]);
  expect(await submit("first")).toMatchObject({ answer: "accepted" });
  const before = await held(lane), head = await lane.head();
  expect(before.rules).toBe(1);
  lane.c.bounds = { ...lane.c.bounds, scopeBytes: before.total };
  await lane.restart();
  expect(await submit("second")).toEqual({ answer: "refused", reason: "scope-full", name: "scopeBytes", judgedAt: head });
  expect([await lane.head(), await held(lane)]).toEqual([head, before]);
});

async function notes(): Promise<Lane> {
  const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: {}, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: notesDefinition.digest, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const name = scopeIdOf(seed), c = controls(name, START), answer = await stubOf(name).create(signed, notesDefinition.declared);
  if (answer.answer !== "accepted") throw new Error(`the notes scope must create: ${JSON.stringify(answer)}`);
  return new Lane(name, c, answer.receipt.fact.at, answer.receipt, signed);
}

// Invariant: an actual text redaction frees its canonical stored bytes.
test("Native redaction subtracts the detached text's canonical bytes from the stored total", async () => {
  const lane = await notes(), body = "é\n😀", digest = textDigest(body), grants = [grantOf(rita, lane.at, ["write", "strike"])];
  expect(await lane.stub.submit(lane.intent(rita, "write", { on: 0, expected: { on: 1 }, fields: { body: digest } }), grants, { texts: [body] })).toMatchObject({ answer: "accepted" });
  const before = await lane.inside(state => total(state));
  expect(await lane.stub.submit(lane.intent(rita, "strike", { on: 0, expected: { on: 2 }, fields: {} }), grants)).toMatchObject({ answer: "accepted" });
  expect(await lane.inside(state => ({ total: total(state), row: new SqliteStore(archiveSql(state)).retained("text", digest) }))).toEqual({ total: before - utf8(canonicalize(body)).length, row: null });
});

// Invariant: a store without a total counts every retained payload table
// once when it opens. Later opens keep that same total.
test("Native old-store fill sums all retained_input kinds and retained_value rows once", async () => {
  const lane = await create({}, {}, archiveDefinition);
  await lane.inside(state => {
    const sql = archiveSql(state), store = new SqliteStore(sql), before = total(state);
    const rows = ["entry", "definition", "rule", "snapshot", "text"] as const;
    let added = 0;
    // Raw canonical rows deliberately bypass retain: this is an old store,
    // not a set of judged facts, definitions or rule results.
    for (const kind of rows) {
      const bytes = canonicalize(`TEST old ${kind} é`), digest = digestBytes(utf8(bytes));
      state.storage.sql.exec("INSERT INTO retained_input (kind, digest, bytes) VALUES (?, ?, ?)", kind, digest, bytes);
      added += utf8(bytes).length;
    }
    const bytes = canonicalize("TEST old value 😀"), digest = digestBytes(utf8(bytes));
    state.storage.sql.exec("INSERT INTO retained_value (domain, digest, bytes) VALUES (?, ?, ?)", "TEST-old-value", digest, bytes);
    added += utf8(bytes).length;
    state.storage.sql.exec("DELETE FROM meta WHERE k IN ('retained-bytes', 'retained-entry-bytes')");
    new SqliteStore(sql);
    const expected = before + added;
    expect(total(state)).toBe(expected);
    new SqliteStore(sql);
    expect(total(state)).toBe(expected);
    expect(store.retained("value", digest, "TEST-old-value")).not.toBeNull();
  });
});

// Invariant: the retained-byte stop and derive's entry-count admission
// exempt the same inputs. One native store carries all cases. Its seeded
// request/operation and hand-authored drafts are stand-ins: this witnesses
// the real Turns/SQLite stop, not judgment, source proof or replay.
test("Native retained-byte stop agrees with fits for timed, diagnosis, outcome, control, result, conflict, act, settlement and checkpoint", async () => {
  const lane = await create({}, {}, archiveDefinition);
  await lane.inside(async state => {
    const store = new SqliteStore(archiveSql(state));
    const pin = { pinned: { named: archiveDefinition.digest, definition: archiveDefinition, platform: null }, sequence: storedSequenceOf(store, lane.c.bounds.entryBytes) };
    const bounds = { ...lane.c.bounds, scopeBytes: 0 };
    const turns = new Turns(store, { clock: lane.c.clock, rules: production().rules, alarm: { set: () => undefined }, capabilities: null }, bounds, () => archiveDefinition, () => undefined, { value: pin }, () => pin);
    // Raw bookkeeping setup for the fold's request and outcome checks.
    state.storage.sql.exec("INSERT INTO outbox (seq,n,target,class,message,next,request) VALUES (0,0,?,'request',?,0,'tell')", canonicalize(lane.at), canonicalize({ class: "request", type: "tell", body: { message: "TEST", fields: {} } }));
    store.putOperation({ id: "0:0", owner: "hold@1", kind: "TEST-retained", most: 1, attempts: [{ attempt: 1, opened: 0, outcomes: [] }], selected: null });
    const fact = lane.genesis.fact;
    const act: Input = { type: "act", signed: lane.intent(rita, "remark", { on: 0, fields: { text: "TEST" } }), authority: [], presented: {} };
    const delivery = { type: "delivery" as const, from: fact, sourceKind: "directory" as const, n: 0 };
    const cases: { name: string; input: Input; settles?: boolean; effects?: Effect[]; exempt: boolean }[] = [
      { name: "timed", input: { type: "timed", item: 0, rule: "TEST", due: at(1) }, exempt: true },
      { name: "diagnosis", input: { type: "diagnosis", of: { seq: 0, n: 0 }, finding: "undelivered", attempts: [] }, exempt: true },
      { name: "outcome", input: { type: "outcome", operation: "0:0", attempt: 1, owner: "hold@1", kind: "TEST-retained", result: "confirmed", evidence: { basis: "own-answer", body: {} } }, effects: [{ effect: "attempt", operation: "0:0", attempt: 1, result: "confirmed", selected: null }], exempt: true },
      { name: "control", input: { ...delivery, n: 1, message: { class: "control", type: "confirm", genesis: fact } }, exempt: true },
      ...(["applied", "refused", "superseded", "conflict"] as const).map((clause, n) => ({ name: `result ${clause}`, input: { ...delivery, n: n + 2, message: { class: "result" as const, of: { from: fact, n: 0 }, outcome: "applied" as const }, clause }, exempt: clause !== "conflict" })),
      { name: "request", input: { ...delivery, n: 6, message: { class: "request", type: "tell", body: { message: "TEST", fields: {} } }, decision: "applied" }, exempt: false },
      { name: "advisory", input: { ...delivery, n: 7, message: { class: "advisory", type: "notify", body: {} } }, exempt: false },
      { name: "act", input: act, exempt: false },
      { name: "declared settlement", input: act, settles: true, exempt: true },
      { name: "checkpoint", input: { type: "checkpoint", ...checkpointOf(store) }, exempt: false },
    ];
    for (const specimen of cases) {
      const countExempt = fits(store, archiveDefinition, { scopeEntries: 0 }, specimen.input, specimen.settles ?? false);
      expect(countExempt, specimen.name).toBe(specimen.exempt);
      const bytes = canonicalize(`TEST ${specimen.name}`), digest = textDigest(`TEST ${specimen.name}`);
      const draft: Draft = { input: specimen.input, effects: specimen.effects ?? [], uses: [], prepared: [], sends: [], judgesTime: false, ...(specimen.settles ? { settles: true } : {}) };
      const before = store.scope()!.head;
      const end = await turns.run({ asks: () => [], judge: () => ({ verdict: "write", draft, retain: [{ kind: "text", digest, bytes }], sealed: () => "written", unfit: () => "unfit", full: () => "full" }) });
      expect(end, specimen.name).toEqual({ end: "answer", answer: countExempt ? "written" : "full" });
      expect(store.retained("text", digest) !== null, specimen.name).toBe(countExempt);
      expect(store.scope()!.head.seq, specimen.name).toBe(before.seq + (countExempt ? 1 : 0));
    }
  });
});
