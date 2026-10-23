import { turnWholeChange, turnAbandonChange, turnTargetChange, turnRequestsChange } from "./definition-corpus-data.ts";
import { describe, expect, test, vi } from "vitest";
import { DOMAINS, PROPOSED_BOUNDS, type Receipt} from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, rawRetainedJSON, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { AmountError, MemoryState, applyEntry, checkpointOf, reserved, stateDigest, timeMs } from "@generalbusiness/dap-derive";
import { SqliteStore, Turns, Wakes, production } from "../src/index.ts";
import { variant } from "@generalbusiness/dap-derive/testing";
import { HOLD, at, definition, create, rita, una, vic } from "./fixtures-native.ts";

// The shared lane's unused link form names a dummy child digest. These
// settlement/storage witnesses need a closed opt-in birth, so omit only
// that unresolved create. Child-closure admission has dedicated witnesses.
const wholeDefinition = variant(definition.declared, turnWholeChange());

test("holder settlement bookkeeping survives actual eviction, rolls back atomically and counts as no logical record or retained byte", async () => {
  // Raw derived-bookkeeping writes on real SQLite, explicitly not judged
  // holder settlements. The pure holder witness proves when the fold writes
  // this fact; this probe proves persistence, checkpoint projection and units.
  const under = wholeDefinition;
  const scope = await create({}, {}, under);
  const written = await scope.inside(state => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    const counts = store.keyCounts(), bytes = store.logicalBytes();
    expect(store.all().settledHolders).toBeUndefined();
    store.transaction(() => store.settleHolder(900));
    const before = store.all();
    let rolledBack = false;
    try { store.transaction(() => { store.settleHolder(901); throw new Error("rollback holder settlement probe"); }); }
    catch (error) { rolledBack = error instanceof Error && error.message === "rollback holder settlement probe"; }
    return { counts, bytes, afterCounts: store.keyCounts(), afterBytes: store.logicalBytes(), before, after: store.all(), rolledBack };
  });
  expect(written.rolledBack).toBe(true);
  expect(written.after).toEqual(written.before);
  expect([written.afterCounts, written.afterBytes]).toEqual([written.counts, written.bytes]);
  expect(written.after.settledHolders).toEqual([900]);
  await scope.restart();
  const reopened = await scope.inside(state => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    return { settled: store.holderSettled(900), rolledBack: store.holderSettled(901), snapshot: store.all() };
  });
  expect(reopened).toEqual({ settled: true, rolledBack: false, snapshot: written.after });
});

test("opt-in report duty survives an ordinary final transition and actual object eviction; at a filled scope only its real settlement spends that room", async () => {
  // Real scope, judge, fold, SQLite and object eviction. The lane data and
  // membership/grants are the existing labelled test fixture's stand-ins.
  const under = variant(wholeDefinition.declared, turnAbandonChange());
  const openReport = async (limit: number) => {
    const scope = await create({ scopeEntries: limit }, {}, under);
    const commitment = await scope.commitment();
    const report = (await scope.did(una, "report", { fields: { commitment }, expected: { commitment: 2 } })).fact.seq;
    return { scope, report };
  };
  const { scope: stuck, report } = await openReport(8);
  expect(await stuck.act(vic, "abandon", { on: report, expected: { on: 1 } })).toMatchObject({ answer: "accepted" });
  expect(await stuck.submit(stuck.remark())).toMatchObject({ answer: "accepted" });
  await stuck.restart();
  expect(await stuck.submit(stuck.remark())).toMatchObject({ answer: "refused", reason: "scope-full" });
  expect((await stuck.head()).seq).toBe(5);
  const duties = await stuck.inside(state => new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) }).all().itemDuties);
  expect(duties).toEqual([{ item: report, kind: "state", slot: null, amount: { entries: 1, items: 0, records: 0, bytes: PROPOSED_BOUNDS.entryBytes + 262_144, requests: 0 } }]);

  const { scope: settled, report: pending } = await openReport(6);
  await settled.restart();
  expect(await settled.submit(settled.remark())).toMatchObject({ answer: "refused", reason: "scope-full" });
  expect(await settled.act(vic, "accept-report", { on: pending, expected: { on: 1 } })).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 4 } } });
  expect(await settled.stub.checkpoint()).toMatchObject({ answer: "written", fact: { seq: 5 } });
});

test("an opt-in native alias settlement spends only the selected report's duty while an ordinary final change of its primary report remains reserved", async () => {
  // Real native scope/judgment/SQLite/eviction with the shared lane and
  // scripted membership/grants fixture; no native platform authority.
  const under = variant(wholeDefinition.declared, turnTargetChange());
  const s = await create({ scopeEntries: 8 }, {}, under);
  const commitment = await s.commitment();
  const report = async () => (await s.did(una, "report", { fields: { commitment }, expected: { commitment: 2 } })).fact.seq;
  const primary = await report(), target = await report();
  expect(await s.submit(s.remark())).toMatchObject({ answer: "refused", reason: "scope-full" });
  expect(await s.act(vic, "accept-peer", { on: primary, fields: { target }, expected: { on: 1, target: 1 } })).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 5 } } });
  await s.restart();
  const duties = await s.inside(state => new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) }).itemDuties());
  expect(duties.map(duty => [duty.item, duty.kind])).toEqual([[primary, "state"]]);
  expect(await s.submit(s.remark())).toMatchObject({ answer: "refused", reason: "scope-full" });
  expect((await s.head()).seq).toBe(5);
});

test("the opt-in foreign-entry retained-writer ceiling accepts exact bytes and refuses one more without changing legacy retention", async () => {
  // Real Turns, transaction and SQLite with hand-authored draft/retention.
  // The JSON string payload intentionally is not a foreign sealed entry;
  // this witnesses the size boundary, not hash or authority validation.
  for (const whole of [false, true]) {
    const under = whole ? wholeDefinition : definition;
    const s = await create({}, {}, under);
    const results = await s.inside(async (state) => {
      const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: (work) => state.storage.transactionSync(work) });
      const turns = new Turns(store, { clock: s.c.clock, rules: production().rules, alarm: { set: () => undefined }, capabilities: null }, s.c.bounds, () => under, () => undefined);
      const run = async (size: number) => {
        const bytes = canonicalize("x".repeat(size - 2)), digest = digestBytes(utf8(bytes));
        const end = await turns.run({ asks: () => [], judge: (view) => ({ verdict: "write", retain: [{ kind: "entry", digest, bytes }], draft: { input: { type: "checkpoint", ...checkpointOf(view) }, uses: [], prepared: [], effects: [], sends: [], judgesTime: false }, sealed: () => "written", unfit: () => "unfit", full: () => "full" }) });
        return { end, retained: store.retained("entry", digest) !== null };
      };
      const before = store.scope()!.head.seq;
      const exact = await run(s.c.bounds.entryBytes), extra = await run(s.c.bounds.entryBytes + 1);
      return { exact, extra, written: store.scope()!.head.seq - before };
    });
    expect(results).toEqual({ exact: { end: { end: "answer", answer: "written" }, retained: true }, extra: { end: { end: "answer", answer: whole ? "unfit" : "written" }, retained: !whole }, written: whole ? 1 : 2 });
  }
});

test("the opt-in rule-input writer ceiling accepts exact canonical bytes and refuses one more even when evaluation returns false; legacy retention is unchanged", async () => {
  // Real Turns, rule evaluator, transaction and SQLite; asks/judge below
  // are deliberately supplied by hand. This is the retained-writer
  // boundary, not an authentic act, valid checkpoint or replay witness.
  for (const whole of [false, true]) {
    const under = whole ? wholeDefinition : definition;
    const s = await create({}, {}, under);
    const result = await s.inside(async (state) => {
      const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: (work) => state.storage.transactionSync(work) });
      const turns = new Turns(store, { clock: s.c.clock, rules: production().rules, alarm: { set: () => undefined }, capabilities: null }, s.c.bounds, () => under, () => undefined);
      const limit = 262_144;
      const run = (bytes: number) => {
        const input = "x".repeat(bytes - 2), canonical = canonicalize(input), digest = digestBytes(utf8(canonical));
        return turns.run({
          asks: () => [{ rule: "not-self", source: under.declared.rules["not-self"]!, input, digest }],
          judge: (view, _clock, prepared) => {
            expect(prepared).toEqual([{ rule: "not-self", input: digest, result: false }]);
            return { verdict: "write", retain: [], draft: { input: { type: "checkpoint", ...checkpointOf(view) }, uses: [], prepared, effects: [], sends: [], judgesTime: false }, sealed: () => "written", unfit: () => "unfit", full: () => "full" };
          },
        }).then((end) => ({ end, size: utf8(canonical).length, prepared: store.retained("rule", digest) !== null }));
      };
      const before = store.scope()!.head.seq;
      const exact = await run(limit), extra = await run(limit + 1);
      return { before, after: store.scope()!.head.seq, exact, extra };
    });
    expect(result.exact).toEqual({ end: { end: "answer", answer: "written" }, size: 262_144, prepared: true });
    expect(result.extra).toEqual({ end: { end: "answer", answer: whole ? "unfit" : "written" }, size: 262_145, prepared: !whole });
    expect(result.after - result.before).toBe(whole ? 1 : 2);
  }
});

test("logical bytes in real SQLite count UTF-8 payloads once across journal and retained domains, redact texts, and roll back retention", async () => {
  const s = await create();
  const sizes = await s.inside(async (state) => {
    // Raw storage-boundary writes. No payload here is offered as a judged
    // act, producer reservation, privacy admission or publication witness.
    const open = () => new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: (work) => state.storage.transactionSync(work) });
    const store = open(), journal = store.storedFrom(0, 100), first = journal[0]!;
    // This fixture's genesis also retains its pinned definition. No rule
    // runs on genesis, and no foreign fact or detached text is supplied.
    const initialBytes = journal.reduce((n, row) => n + utf8(row.bytes).length, 0) + utf8(canonicalize(definition.declared)).length;
    const rawDigest = digestBytes(utf8(first.bytes)), rawBytes = utf8(first.bytes).length;
    expect(rawDigest).not.toBe(first.hash);
    expect(rawRetainedJSON(rawDigest, first.bytes)).toEqual(JSON.parse(first.bytes));
    const before = store.logicalBytes();
    // The recorded size is a cache; the retained byte check reads actual
    // payload lengths, and excludes all folded-state/bookkeeping bytes.
    state.storage.sql.exec("UPDATE entry SET size=1");
    store.putRecord({ capability: "hold@1", kind: "byte-probe", key: ["large-metadata"], state: "live", values: { ignored: "x".repeat(1024) }, seq: 900 });
    const afterMetadata = store.logicalBytes();
    // Native journal hashes are tagged. Foreign retained copies use a raw
    // content digest, as rule inputs do. The raw JSON copy is a separate
    // domain from the journal; its entry/rule storage aliases count once.
    store.retain({ kind: "entry", digest: rawDigest, bytes: first.bytes, under: "fixture" });
    store.retain({ kind: "rule", digest: rawDigest, bytes: first.bytes });
    store.retain({ kind: "value", domain: DOMAINS.entry, digest: first.hash, bytes: first.bytes });
    const duplicated = store.logicalBytes();
    const text = canonicalize("é😀"), digest = textDigest("é😀");
    store.retain({ kind: "text", digest, bytes: text });
    store.retain({ kind: "text", digest, bytes: text });
    const withText = store.logicalBytes();
    const rule = canonicalize({ text: "é😀" });
    store.retain({ kind: "rule", digest: digestBytes(utf8(rule)), bytes: rule });
    const withRule = store.logicalBytes();
    store.forget("text", digest);
    const redacted = store.logicalBytes();
    let rolledBack = false;
    try {
      store.transaction(() => { store.retain({ kind: "text", digest: textDigest("q"), bytes: canonicalize("q") }); throw new Error("rollback byte probe"); });
    } catch (error) { rolledBack = error instanceof Error && error.message === "rollback byte probe"; }
    const afterRollback = store.logicalBytes();
    let rejectedConflict = false;
    try {
      store.transaction(() => {
        state.storage.sql.exec("UPDATE retained_value SET bytes=bytes || ' ' WHERE domain=? AND digest=?", DOMAINS.entry, first.hash);
        store.logicalBytes();
      });
    } catch (error) {
      if (!(error instanceof AmountError)) throw error;
      rejectedConflict = true;
    }
    return { initialBytes, rawBytes, before, afterMetadata, duplicated, withText, withRule, redacted, rolledBack, afterRollback, rejectedConflict, afterConflict: store.logicalBytes(), reopened: open().logicalBytes() };
  });
  expect([sizes.before, sizes.afterMetadata]).toEqual(Array(2).fill(sizes.initialBytes));
  expect(sizes.duplicated).toBe(sizes.initialBytes + sizes.rawBytes);
  // JSON string é😀 is 8 UTF-8 bytes; the rule's JSON record is 17.
  expect([sizes.withText, sizes.withRule]).toEqual([sizes.initialBytes + sizes.rawBytes + 8, sizes.initialBytes + sizes.rawBytes + 25]);
  expect([sizes.redacted, sizes.afterRollback, sizes.afterConflict, sizes.reopened]).toEqual(Array(4).fill(sizes.initialBytes + sizes.rawBytes + 17));
  expect([sizes.rolledBack, sizes.rejectedConflict]).toEqual([true, true]);
});

test("logical key counts in real SQLite retain final keys, ignore transport ACKs, survive reopening and roll back with their writes", async () => {
  const s = await create();
  const counts = await s.inside(async (state) => {
    // Raw storage-boundary writes, deliberately not judged or sealed acts.
    // This witnesses SQL units/rollback only, not authority or capacity admission.
    const open = () => new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: (work) => state.storage.transactionSync(work) });
    const store = open(), before = store.keyCounts(), scope = store.scope()!;
    const item = { ...store.all().items[0]!, id: 900, type: "count-probe", state: "open" };
    const record = { capability: "hold@1" as const, kind: "count-probe", key: ["one"], state: "live", values: {}, seq: 900 };
    const relation = { owner: scope.at, name: "count-probe", item: 900, state: "live", revision: 900 };
    store.transaction(() => { store.putItem(item); store.putRecord(record); store.putRelation(relation); });
    const inserted = store.keyCounts();
    store.transaction(() => {
      store.putItem({ ...item, state: "final" });
      store.putRecord({ ...record, state: "final" });
      store.putRelation({ ...relation, state: "final" });
    });
    const replaced = store.keyCounts();
    state.storage.sql.exec("INSERT INTO outbox (seq,n,target,class,message,next,request) VALUES (?,0,?,'request',?,0,'tell')", 900, canonicalize(scope.at), canonicalize({ class: "request", type: "tell", body: { message: "count-probe", fields: {} } }));
    const request = { seq: 900, n: 0, hash: scope.head.hash, type: "tell" as const, to: scope.at, result: null, diagnosis: null };
    store.acknowledge(900, 0, [], { at: scope.at, ...scope.head });
    const acknowledged = store.keyCounts();
    store.putRequest({ ...request, diagnosis: { seq: 901, finding: "delivery-unavailable" } });
    const unavailable = store.keyCounts();
    store.putRequest({ ...request, diagnosis: { seq: 902, finding: "undelivered" } });
    const undelivered = store.keyCounts();
    store.putRequest({ ...request, result: { seq: 903, clause: "applied" } });
    const answered = store.keyCounts();
    let rolledBack = false;
    try {
      store.transaction(() => { store.putItem({ ...item, id: 901 }); store.putRecord({ ...record, key: ["two"] }); throw new Error("rollback count probe"); });
    } catch (error) { rolledBack = error instanceof Error && error.message === "rollback count probe"; }
    return { before, inserted, replaced, acknowledged, unavailable, undelivered, answered, rolledBack, afterRollback: store.keyCounts(), reopened: open().keyCounts() };
  });
  const retained = { ...counts.before, items: counts.before.items + 1, records: counts.before.records + 2 };
  const pending = { ...retained, requests: retained.requests + 1 };
  expect([counts.inserted, counts.replaced]).toEqual([retained, retained]);
  expect([counts.acknowledged, counts.unavailable]).toEqual([pending, pending]);
  expect([counts.undelivered, counts.answered, counts.afterRollback, counts.reopened]).toEqual([retained, retained, retained, retained]);
  expect(counts.rolledBack).toBe(true);
});

describe("the head check (section 5.2, steps 4 to 6)", () => {
  test("a second act commits while the first is in preparation; the first starts again from step 3 and is prepared and judged on the new head", async () => {
    const s = await create();
    const commitment = await s.commitment();                  // entries 1 and 2: assigned to una, revision 2
    const assign = (to: typeof una, revision: number) => s.intent(rita, "assign", { on: commitment, expected: { on: revision }, fields: { performer: to.member } });
    /** Submit `first`, wait until it is in step 5, at the gate before its rule is evaluated, then commit `second` and let the first go on. */
    const race = async (first: ReturnType<typeof assign>, second: () => Promise<Receipt>) => {
      s.c.gate.hold();
      const waiting = s.submit(first).then((answer) => answer);
      await s.c.gate.held();
      const committed = await second();
      s.c.gate.release();
      return { answer: await waiting, committed };
    };

    // The second act is una's hold under the commitment. It leaves the commitment's revision at 2 and adds to its attribution history,
    // which the first act's rule reads. The first act's commit finds another head and writes nothing. From step 3 its rule is prepared
    // over the new head, and it is accepted as the next entry. Without the restart its prepared result would not fit, and it could not be judged.
    const held = await race(assign(vic, 2), () => s.did(una, "take-hold", { fields: { commitment }, expected: { commitment: 2 } }));
    expect([held.committed.fact.seq, held.answer]).toMatchObject([3, { answer: "accepted", receipt: { fact: { seq: 4 } } }]);
    expect((await s.entries(4))[0]!.prev).toBe(held.committed.fact.hash);

    // The second act moves the revision the first expects. The first is refused, and the refusal is a statement about the new head.
    const moved = await race(assign(una, 3), () => s.did(rita, "assign", { on: commitment, expected: { on: 3 }, fields: { performer: vic.member } }));
    const { seq, hash } = moved.committed.fact;
    expect([seq, moved.answer, await s.head()]).toEqual([5, { answer: "refused", reason: "revision-moved", judgedAt: { seq, hash } }, { seq, hash }]);
  });
});

describe("a due expiry is written before any other input (section 5.2, steps 3 and 6.3)", () => {
  test("an act whose commit reading is at two holds' deadline stops; the drain writes both ends, the lower item first, and then the act", async () => {
    const s = await create();
    const [low, high] = await s.holds(2);                     // entries 1 to 6; both holds end at the same time
    expect(await s.alarmAt()).toBe(timeMs(at(HOLD)));         // after a commit, the alarm is at the earliest deadline
    // Step 3 reads one second before the deadline and finds nothing due. Every later reading is the deadline.
    s.c.clock.now = at(HOLD);
    const remark = s.remark();
    s.c.clock.script.push(at(HOLD - 1));
    expect(await s.submit(remark)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 9 } } });
    const timed = (item: number) => ({ type: "timed", item, rule: "hold-end", due: at(HOLD) });
    expect((await s.entries(7)).map((e) => [e.time, e.input.type === "act" ? "act" : e.input])).toEqual([[at(HOLD), timed(low!)], [at(HOLD), timed(high!)], [at(HOLD), "act"]]);
    expect(await s.alarmAt()).toBeNull();
  });
});

describe("what follows the head is told of each commit (`Turns.onSealed`)", () => {
  test("a turn tells its listener after each entry that it seals, a timed entry as an input's, at that entry's head and in order; a turn that writes nothing tells nothing; a listener that fails changes no entry. The turns are made by hand over the object's storage", async () => {
    const s = await create();
    await s.holds(2);                                         // entries 1 to 6; both holds end at the same time
    s.c.clock.now = at(HOLD);
    const told = await s.inside(async (state) => {
      const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: (closure) => state.storage.transactionSync(closure) });
      const wakes = new Wakes(store, { set: (time) => (time === null ? state.storage.deleteAlarm() : state.storage.setAlarm(timeMs(time)!)) }, false);
      const turns = new Turns(store, { clock: s.c.clock, rules: production().rules, alarm: wakes.deadline, capabilities: null }, s.c.bounds, () => definition, () => undefined);
      const heads: number[] = [];
      turns.onSealed(() => { heads.push(store.scope()!.head.seq); });
      // An input that writes one entry: a checkpoint, as the scope's own `checkpoint` drafts it.
      const write = () => turns.run<number>({ asks: () => [], judge: (view) => ({ verdict: "write", retain: [], draft: { input: { type: "checkpoint", ...checkpointOf(view) }, uses: [], prepared: [], effects: [], sends: [], judgesTime: false }, sealed: ({ entry }) => entry.seq, unfit: () => -1, full: () => -1 }) });
      // The alarm's turn: the two holds end, in entries 7 and 8. Then an input, entry 9.
      // The last two write nothing: an input that is answered with no entry, and an alarm's turn with nothing due.
      const ends = [await turns.run(null), await write(), await turns.run<number>({ asks: () => [], judge: () => ({ verdict: "answer", answer: 0 }) }), await turns.run(null)];
      const after = [...heads];
      // A listener that fails: the entry is sealed all the same, and the turn answers.
      turns.onSealed(() => { throw new Error("a listener failed"); });
      return { ends, after, failing: await write().catch(() => "the turn failed"), head: store.scope()!.head.seq };
    });
    expect(told).toEqual({ ends: [{ end: "idle" }, { end: "answer", answer: 9 }, { end: "answer", answer: 0 }, { end: "idle" }], after: [7, 8, 9], failing: { end: "answer", answer: 10 }, head: 10 });
  });
});

describe("the budget of timed attempts, here 2 for a turn (section 5.2, step 7)", () => {
  const budget = { timedAttemptsPerTurn: 2 };

  test.each([
    { due: 1, answer: "accepted", written: 1, left: 0 },
    { due: 2, answer: "accepted", written: 2, left: 0 },
    { due: 3, answer: "busy", written: 2, left: 1 },
  ])("$due due: $written timed entries are written, $left stays due, and the waiting act is $answer", async ({ due, answer, written, left }) => {
    const s = await create(budget);
    await s.holds(due);
    const head = (await s.head()).seq;
    s.c.clock.now = at(HOLD);
    const remark = s.remark();
    const answered = await s.submit(remark);
    expect(answered.answer === "unavailable" ? answered.reason : answered.answer).toBe(answer);
    expect([(await s.head()).seq, await s.count("hold", "ended"), await s.count("hold", "held")]).toEqual([head + written + (answer === "accepted" ? 1 : 0), written, left]);
    if (answer !== "busy") return;
    // The timed entries are kept and the alarm is set again, a retry delay ahead. The act's key was not consumed: sent again, it follows the last expiry.
    expect(await s.alarmAt()).toBe(timeMs(at(HOLD + PROPOSED_BOUNDS.drainRetrySeconds)));
    expect(await s.submit(remark)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: head + due + 1 } } });
  });

  test("a selection dropped each time, the clock reading the deadline at selection and one second less at commit, ends the turn busy with nothing written", async () => {
    const s = await create(budget);
    await s.holds(1);
    const head = await s.head();
    s.c.clock.now = at(HOLD);
    const remark = s.remark();
    // Two selections and their two commits. The entry before is earlier than both readings, so the clock is not behind.
    s.c.clock.script.push(at(HOLD), at(HOLD - 1), at(HOLD), at(HOLD - 1));
    expect([await s.submit(remark), s.c.clock.script, await s.head()]).toEqual([{ answer: "unavailable", reason: "busy" }, [], head]);
    // The hold is still due and the key is not consumed. A turn whose readings are all the deadline writes the expiry, then the act.
    expect(await s.submit(remark)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: head.seq + 2 } } });
  });

  test("the restarts of one turn are bounded, here at 1: an act whose every commit finds the hold newly due ends busy with nothing written", async () => {
    const s = await create({ turnRestarts: 1 });
    await s.holds(1);
    const head = await s.head();
    s.c.clock.now = at(HOLD - 1);
    const remark = s.remark();
    // Twice: step 3 reads before the deadline and finds nothing due, and the commit reads the deadline and stops.
    s.c.clock.script.push(at(HOLD - 1), at(HOLD), at(HOLD - 1), at(HOLD));
    expect([await s.submit(remark), s.c.clock.script, await s.head()]).toEqual([{ answer: "unavailable", reason: "busy" }, [], head]);
    s.c.clock.now = at(HOLD);
    expect(await s.submit(remark)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: head.seq + 2 } } });
  });

  test("preparation has a time limit, here 10 milliseconds: an act whose rule is not evaluated in time is answered unavailable and writes nothing; one that is evaluated in time is accepted", async () => {
    // The limit is the turn's own timer, driven by fake timers: the test says when the 10 milliseconds have passed, and nothing waits on the clock.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const s = await create({ preparationSeconds: 0.01 });
      const commitment = (await s.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } })).fact.seq;
      const head = await s.head();
      const assign = (to: typeof una) => s.act(rita, "assign", { on: commitment, expected: { on: 1 }, fields: { performer: to.member } });
      // The rule is held at the gate and the limit passes: the act is answered unavailable.
      s.c.gate.hold();
      const late = assign(una);
      await s.c.gate.held();
      await vi.advanceTimersByTimeAsync(10);
      expect([await late, await s.head()]).toEqual([{ answer: "unavailable", reason: "unavailable" }, head]);
      s.c.gate.release();
      // The rule is held, and released before the limit passes: the act is not cut off.
      s.c.gate.hold();
      const inTime = assign(una);
      await s.c.gate.held();
      await vi.advanceTimersByTimeAsync(5);
      s.c.gate.release();
      expect(await inTime).toMatchObject({ answer: "accepted" });
    } finally {
      vi.useRealTimers();
    }
  });

  test("an alarm's turn has the same budget: it writes 2 of 3, leaves the third due and sets the alarm again; the next alarm writes it", async () => {
    const s = await create(budget);
    await s.holds(3);
    const head = (await s.head()).seq;
    s.c.clock.now = at(HOLD);
    expect([await s.alarm(), (await s.head()).seq, await s.count("hold", "held"), await s.alarmAt()]).toEqual([true, head + 2, 1, timeMs(at(HOLD + PROPOSED_BOUNDS.drainRetrySeconds))]);
    expect([await s.alarm(), (await s.head()).seq, await s.count("hold", "held"), await s.alarmAt()]).toEqual([true, head + 3, 0, null]);
  });
});

describe("the clock behind the history (section 5.3)", () => {
  test("with a transition due, nothing is written and every input is answered clock-behind", async () => {
    const s = await create({ timedAttemptsPerTurn: 1 });
    await s.holds(2);
    // An alarm's turn at the deadline writes the first end and spends its budget. The second hold is due as of that entry's time.
    s.c.clock.now = at(HOLD);
    await s.alarm();
    const head = await s.head();
    expect([head.seq, await s.count("hold", "held")]).toEqual([7, 1]);

    s.c.clock.now = at(HOLD - 10);
    const behind = { answer: "unavailable", reason: "clock-behind" };
    expect([await s.submit(s.remark()), await s.stub.checkpoint(), await s.alarm(), await s.head()]).toEqual([behind, behind, true, head]);
  });

  test("with nothing due, an act is answered clock-behind and a checkpoint, which judges no time, is written with the previous entry's time, clamped", async () => {
    const s = await create();
    s.c.clock.now = at(100);
    await s.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
    s.c.clock.now = at(70);
    expect(await s.submit(s.remark())).toEqual({ answer: "unavailable", reason: "clock-behind" });
    expect(await s.stub.checkpoint()).toMatchObject({ answer: "written", fact: { seq: 2 } });
    const sealed = await s.sealed();
    const checkpoint = sealed[2]!.entry;
    expect(checkpoint).toMatchObject({ seq: 2, time: at(100), clamped: true, input: { type: "checkpoint", through: 1 } });
    // The digest it carries is the one a verifier computes: entries 0 and 1 folded in memory by the same fold give the state the store holds.
    const memory = new MemoryState();
    for (const { entry, hash } of sealed.slice(0, 2)) applyEntry(memory, definition, entry, hash);
    expect(checkpoint.input).toMatchObject({ state: stateDigest(memory.all()) });
  });
});

describe("the scope's budget (section 9.2), here 12 entries", () => {
  test.each(["legacy", "whole-scope"] as const)("%s: new work cannot take admitted holds' timed entries or the closing checkpoint", async cohort => {
    const under = cohort === "whole-scope" ? wholeDefinition : definition;
    const s = await create({ scopeEntries: 12 }, {}, under);
    const holds = await s.holds(2);                           // entries 1 to 6: two holds, each with a deadline that reserves one entry
    const commitment = await s.commitment();                  // entries 7 and 8: nine entries, and three reserved with the closing checkpoint
    const head = await s.head();
    // A third hold would be entry 9 and would reserve a fourth entry: ten and four do not fit in twelve. Nothing is written.
    expect(await s.act(una, "take-hold", { fields: { commitment }, expected: { commitment: 2 } })).toEqual({ answer: "refused", reason: "scope-full", judgedAt: head, ...(cohort === "whole-scope" ? { name: "scopeEntries" } : {}) });
    // Both admitted ends are written, and the closing checkpoint that was reserved from the start.
    s.c.clock.now = at(HOLD);
    expect([await s.alarm(), (await s.entries(9)).map((e) => e.input.type), await s.count("hold", "ended")]).toEqual([true, ["timed", "timed"], holds.length]);
    expect(await s.stub.checkpoint()).toMatchObject({ answer: "written", fact: { seq: 11 } });
    expect(await s.submit(s.remark())).toMatchObject({ answer: "refused", reason: "scope-full", judgedAt: { seq: 11 } });
  });

  // The fourth witness of section 17.4 of the contract, and its last paragraph.
  test.each([
    { scopeEntries: 6, beside: { answer: "unavailable", reason: "unavailable" }, closing: 5 },
    { scopeEntries: 7, beside: { answer: "written" }, closing: 6 },
  ])("a checkpoint beside a pending hold is new work, and with $scopeEntries entries it is $beside.answer; the closing checkpoint is entry $closing", async ({ scopeEntries, beside, closing }) => {
    const s = await create({ scopeEntries });
    await s.holds(1);                                         // entries 1 to 3: four written, and two reserved: the hold's end and the closing checkpoint
    // With six entries none is free: written here, it would take the entry the closing checkpoint needs after the hold's end.
    expect(await s.stub.checkpoint()).toMatchObject(beside);
    s.c.clock.now = at(HOLD);
    await s.alarm();
    // No other task is pending and the head is not a checkpoint: this one is the closing checkpoint, and the history ends on it.
    expect([await s.stub.checkpoint(), (await s.head()).seq]).toMatchObject([{ answer: "written", fact: { seq: closing } }, scopeEntries - 1]);
  });

  test.each(["legacy", "whole-scope"] as const)("%s: a full report scope still writes its acceptance and the request that acceptance reserved", async cohort => {
    const base = cohort === "whole-scope" ? wholeDefinition : definition;
    const s = await create({ scopeEntries: 6 }, {}, base);
    const commitment = await s.commitment();                  // entries 1 and 2
    const report = (await s.did(una, "report", { fields: { commitment }, expected: { commitment: 2 } })).fact.seq;   // entry 3: four written, two reserved
    expect(await s.submit(s.remark())).toMatchObject({ answer: "refused", reason: "scope-full" });
    // The act that takes the report out of `reported` settles it. It is written against the report's own reservation, in the commit.
    expect(await s.act(vic, "accept-report", { on: report, expected: { on: 1 } })).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 4 } } });
    expect(await s.stub.checkpoint()).toMatchObject({ answer: "written", fact: { seq: 5 } });

    // The same lane, where the acceptance also asks for a lane to be created, and where the clause of another request, of a
    // renewal, can move a hold's end. A report then reserves three entries: the acceptance, and the two of the request it sends.
    // Legacy requests use the global largest clause and may pass the entry
    // ceiling under the settlement exemption. The opt-in handoff keeps this
    // send's own Amount, so its checked settlement remains within the ceiling.
    const asks = { create: { kind: "lane", definition: "self", fields: { title: { const: "another" }, opener: { signer: true } } } };
    const asking = variant(base.declared, turnRequestsChange(asks));
    expect([asking.pending, asking.clauseEntries]).toEqual([{ report: { reported: 3 } }, 1]);
    const a = await create({ scopeEntries: 8 }, {}, asking);
    const under = await a.commitment();
    const reported = (await a.did(una, "report", { fields: { commitment: under }, expected: { commitment: 2 } })).fact.seq;   // four written, four reserved
    if (cohort === "whole-scope") await a.restart();
    expect([await a.submit(a.remark()), await a.act(vic, "accept-report", { on: reported, expected: { on: 1 } }), await a.submit(a.remark())])
      .toMatchObject([{ answer: "refused", reason: "scope-full" }, { answer: "accepted", receipt: { fact: { seq: 4 }, sends: ["4.0"] } }, { answer: "refused", reason: "scope-full" }]);
    if (cohort === "whole-scope") {
      const row = await a.inside(state => {
        const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
        const last = JSON.parse(store.stored(store.scope()!.head.seq)!.bytes);
        // Real judged acceptance/storage at the filled entry budget. Test
        // authority and the unresolved transport remain fixture stand-ins.
        return [store.scope()!.head.seq + 1, reserved(store, asking, last.input).entries];
      });
      expect(row).toEqual([5, 3]);
    }
  });

  test("after a closing checkpoint nothing is reserved; the next entry that is not a checkpoint is admitted only with a closing checkpoint reserved again", async () => {
    const s = await create({ scopeEntries: 3 });
    expect(await s.stub.checkpoint()).toMatchObject({ answer: "written", fact: { seq: 1 } });
    // A remark would be the third entry and would reserve a fourth. A checkpoint on a head that is a checkpoint is new work that reserves nothing.
    expect([await s.submit(s.remark()), await s.stub.checkpoint()]).toMatchObject([{ answer: "refused", reason: "scope-full" }, { answer: "written", fact: { seq: 2 } }]);
  });
});
