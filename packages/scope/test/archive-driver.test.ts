/** Real native SQLite/turns/eviction; the host, credentials and fixture
 * admission/authority are explicit stand-ins. Actual adapter enforcement
 * and alarm wiring have separate obligations. No external provider runs. */
import { expect, onTestFinished, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, timeOf, utf8 } from "@generalbusiness/artroom-bytes";
import { idOf } from "@generalbusiness/artroom-git";
import { variant } from "@generalbusiness/dap-derive/testing";
import { journalRef, type JournalFormat } from "@generalbusiness/artroom-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/artroom-git/journal-reader";
import { archiveSource, verifyArchive } from "@generalbusiness/artroom-replay";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { ArchiveDriver } from "../src/archive-driver.ts";
import type { ArchivePolicyRegistry } from "../src/archive-inventory.ts";
import { ScriptedArchiveHost, archiveHostGate as gate } from "./support/archive-provider.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { planArchive } from "../src/archive-build.ts";
import { at, create, rita, una, type Lane } from "./fixtures-native.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { fixtureArchiveWiring } from "./worker.ts";
import type { TestScope } from "./worker.ts";

class ScriptedHost extends ScriptedArchiveHost {
  constructor(format: JournalFormat) { super(format, () => atTime); }
}
const atTime = at(0);
function driver(lane: Lane, state: DurableObjectState, host: ScriptedHost, budget?: () => ArchiveBudget, after?: number, policies: ArchivePolicyRegistry = archivePolicies) {
  const sql = archiveSql(state);
  return new ArchiveDriver({
    sql: after === undefined ? sql : { transaction: sql.transaction, exec(query, ...args) {
      if (/\bFROM entry\b/.test(query)) {
        // Scalar projection may bind JSON paths before the position. Check
        // the actual seq predicate's parameter, never the first argument.
        const source = query.replace(/'(?:''|[^'])*'/g, "''"), predicate = /\b(?:entry\.)?seq (>=|>|=) \?/.exec(source);
        expect(predicate, query).not.toBeNull();
        const index = (source.slice(0, predicate!.index).match(/\?/g) ?? []).length, seq = args[index];
        expect(typeof seq).toBe("number");
        if (predicate![1] === ">") expect(seq as number).toBeGreaterThanOrEqual(after);
        else expect(seq as number).toBeGreaterThan(after);
      }
      return sql.exec(query, ...args);
    } }, current: () => {
      const value = state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'scope'").one();
      const scope = JSON.parse(value.v); return { at: scope.at, head: scope.head };
    }, clock: () => lane.c.clock.now, bounds: PROPOSED_BOUNDS, policies: { fixture: "archive-policies", registry: policies },
    target: { fixture: "archive-target", resolve: async () => { host.targets++; return archiveRepository; } }, provider: host, ...(budget ? { budget } : {}),
  });
}
const row = (lane: Lane) => lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());
async function alarmFixture(host: ScriptedHost, resolve = async () => { host.targets++; return archiveRepository; }) {
  const lane = await create({}, {}, archiveDefinition);
  fixtureArchiveWiring.set(lane.name, { policies: { fixture: "archive-policies", registry: archivePolicies }, target: { fixture: "archive-target", resolve }, provider: host });
  onTestFinished(() => { fixtureArchiveWiring.delete(lane.name); });
  await lane.restart();
  await lane.did(rita, "remark", { on: 0, fields: { text: "schedule the fixture archive" } });
  return lane;
}

// Native alarm owns the writer. Its host wait does not hold native turns,
// and confirmation schedules the later prefix through the same alarm.
test("the real native alarm archives asynchronously while sixteen turns complete", async () => {
  const host = new ScriptedHost("sha1"); host.blocked = gate();
  const lane = await alarmFixture(host), before = await lane.head();
  const running = lane.alarm(); await host.started.promise;
  const replies = await Promise.all(Array.from({ length: 16 }, (_, index) => lane.submit(lane.remark(`alarm flood ${index}`))));
  expect(replies.every(reply => reply.answer === "accepted")).toBe(true); expect(host.sends).toEqual([]);
  const later = await lane.head(); host.blocked.release(); expect(await running).toBe(true);
  expect((await row(lane))?.confirmed?.through).toEqual(before); expect(await lane.head()).toEqual(later);
  expect(await lane.inside(state => state.storage.getAlarm())).not.toBeNull();
  expect(await lane.alarm()).toBe(true); expect((await row(lane))?.confirmed?.through).toEqual(later);
  expect(host.sends).toHaveLength(2); expect(host.targets).toBe(1); expect(await lane.head()).toEqual(later);
  fixtureArchiveWiring.delete(lane.name);
}, 20_000);

// Deliberate storage-corruption fixtures, not native transitions. The real
// alarm must persist the named stop before another token or send is attempted.
test.each(["missing-input", "rebuild-mismatch"] as const)("native archive alarm stops %s without another mint or send", async reason => {
  const host = new ScriptedHost("sha1"); host.missingMint = true;
  const lane = await alarmFixture(host); expect(await lane.alarm()).toBe(true);
  const marked = (await row(lane))!; lane.c.clock.now = marked.next!;
  await lane.inside(state => {
    if (reason === "missing-input") state.storage.sql.exec("DELETE FROM retained_input WHERE kind = 'definition' AND digest = ?", archiveDefinition.digest);
    else {
      const bytes = state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'archive-row-1'").one().v;
      const altered = JSON.parse(bytes); altered.pending.commit = "b".repeat(40);
      state.storage.sql.exec("UPDATE meta SET v = ? WHERE k = 'archive-row-1'", canonicalize(altered));
    }
  });
  await lane.restart(); expect(await lane.alarm()).toBe(true);
  expect((await row(lane))?.stopped?.reason).toBe(reason); expect(host.mintCalls).toBe(1); expect(host.sends).toEqual([]);
  expect(await lane.inside(state => state.storage.getAlarm())).toBeNull();
});

// A real alarm reset before Mark must retain its wake without a row/token.
// A later entry must not shorten that lookup backoff.
test("a pre-Mark target failure survives eviction and new native input without losing its alarm", async () => {
  const host = new ScriptedHost("sha1"); let ready = false;
  const lane = await alarmFixture(host, async () => { host.targets++; if (!ready) throw new Error("fixture target unavailable"); return archiveRepository; });
  const before = await lane.head(); expect(await lane.alarm()).toBe(true); expect(await row(lane)).toBeNull();
  const next = await lane.inside(state => state.storage.getAlarm()); expect(next).not.toBeNull();
  await lane.restart();
  await lane.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  expect(await lane.inside(state => state.storage.getAlarm())).toBe(next);
  expect(await lane.alarm()).toBe(true); expect(host.targets).toBe(1); expect(host.mintCalls).toBe(0);
  ready = true; lane.c.clock.now = timeOf(next!); await lane.restart();
  expect(await lane.alarm()).toBe(true); expect(host.sends).toHaveLength(1); expect(host.targets).toBe(2);
  expect((await row(lane))?.confirmed?.through.seq).toBeGreaterThan(before.seq);
  fixtureArchiveWiring.delete(lane.name);
});

// Invariant: a lost own send answer is resolved from the ref, never by
// creating a second commit, writing a journal entry or reminting on success.
test("confirms a lost reply by read-back with no second commit or journal entry", async () => {
  const lane = await create({}, {}, archiveDefinition), host = new ScriptedHost("sha1"), before = await lane.head(); host.loseReply = true;
  const result = await lane.inside(state => driver(lane, state, host).run());
  expect(result.state).toBe("confirmed"); expect(host.sends).toHaveLength(1); expect(host.mintCalls).toBe(1); expect(host.revoked).toBe(1);
  expect((await row(lane))?.confirmed?.commit).toBe(host.pointer);
  expect(await lane.head()).toEqual(before);
  expect((await lane.inside(state => driver(lane, state, host).run())).state).toBe("idle");
  expect(host.sends).toHaveLength(1); expect(host.targets).toBe(1);
});

// Invariant: earlier whole entries can complete after actual lookahead has
// spent work, including the real incremental-send code and Native receipt.
test("adaptive Native passes reserve writing, incremental sending and confirmation before more lookahead", async context => {
  const lane = await create({}, {}, archiveDefinition), host = new ScriptedHost("sha1");
  await runInDurableObject(lane.object, async instance => {
    for (let n = 0; n < 300; n++) expect(await (instance as TestScope).checkpoint()).toMatchObject({ answer: "written" });
  });
  const head = await lane.head(), budgets: ArchiveBudget[] = [], maximum = 40 * 1024 * 1024;
  const quotes: { cost: Partial<ArchiveCost>; spent: ArchiveCost }[] = [];
  const makeBudget = () => {
    const budget = new ArchiveBudget({ inputWork: maximum }), canSpend = budget.canSpend.bind(budget);
    budget.canSpend = cost => {
      if ((cost.entries ?? 0) > 0 && (cost.inputWork ?? 0) > 16 * 1024 * 1024) { if (quotes.length === 8) quotes.shift(); quotes.push({ cost: { ...cost }, spent: budget.admitted() }); }
      return canSpend(cost);
    };
    budgets.push(budget); return budget;
  };
  const initial = await lane.inside(state => driver(lane, state, host, makeBudget).run());
  expect(initial, JSON.stringify({ initial, cost: budgets.map(budget => budget.admitted()), quotes })).toMatchObject({ state: "confirmed" });
  const first = (await row(lane))!.confirmed!;
  expect(first.through.seq).toBeGreaterThanOrEqual(0); expect(first.through.seq).toBeLessThan(128);
  expect(await lane.inside(state => driver(lane, state, host, makeBudget, first.through.seq).run())).toMatchObject({ state: "confirmed" });
  const second = (await row(lane))!;
  expect(second.pending).toBeNull(); expect(second.confirmed!.through.seq).toBeGreaterThan(first.through.seq);
  expect(second.confirmed!.through.seq).toBeLessThan(head.seq); expect(host.appendCalls).toBe(1);
  expect(budgets).toHaveLength(2);
  for (const budget of budgets) { expect(budget.admitted().inputWork).toBeLessThanOrEqual(maximum); expect(budget.admitted().entries).toBeGreaterThan(2); }
  expect(await lane.head()).toEqual(head); expect(host.closureReads).toBe(0);
  (context.task.meta as Record<string, unknown>)["adaptiveNative"] = { cap: maximum, first: first.through.seq, second: second.confirmed!.through.seq,
    costs: budgets.map(budget => budget.admitted()), quotes, appendCalls: host.appendCalls,
    qualification: "Actual Native checkpoint entries, adaptive scouting, fresh inventory, writer, driver copies, production incremental-send code including validator/copy/pack and Native row confirmation; HTTP/host/token/policies remain TEST stand-ins. Entry and other caps unchanged; input cap lowered to40MiB. Two passes only; no cadence/10000-one-entry claim." };
});

test("adaptive Native selection finishes a covered earlier prefix before an uncovered later class", async () => {
  const lane = await create({}, {}, archiveDefinition), host = new ScriptedHost("sha1");
  await lane.did(rita, "remark", { on: 0, fields: { text: "uncovered later native act" } });
  const policy = archivePolicies.get(archiveDefinition.digest)!, policies: ArchivePolicyRegistry = new Map([[archiveDefinition.digest, { ...policy, entryTypes: new Set(["genesis"]) }]]);
  expect(await lane.inside(state => driver(lane, state, host, undefined, undefined, policies).run())).toMatchObject({ state: "confirmed" });
  const confirmed = (await row(lane))!.confirmed!; expect(confirmed.through.seq).toBe(0);
  expect(await lane.inside(state => driver(lane, state, host, undefined, 0, policies).run())).toMatchObject({ state: "stopped", reason: "unsupported-archive-cohort" });
  expect((await row(lane))!.confirmed).toEqual(confirmed); expect(host.sends).toHaveLength(1);
});

// Invariant: a persisted mark, not today's inventory, determines the first
// send after actual eviction and a new native retained-input turn.
test.each(["sha1", "sha256"] as const)("resumes marked %s bytes after eviction and then archives the later rule input", async format => {
  const host = new ScriptedHost(format); host.missingMint = true;
  const lane = await alarmFixture(host);
  expect(await lane.alarm()).toBe(true);
  const initial = (await row(lane))!, marked = initial.pending!;
  expect(marked).not.toBeNull(); expect(host.data.size).toBe(0); expect(host.sends).toEqual([]);
  await lane.restart(); lane.c.clock.now = initial.next!;
  const offered = await lane.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  await lane.did(rita, "assign", { on: offered.fact.seq, expected: { on: 1 }, fields: { performer: una.member } });
  const later = await lane.head(); await lane.restart();
  expect(await lane.alarm()).toBe(true); expect(host.sends).toEqual([marked.commit]);
  expect((await row(lane))?.confirmed?.through).toEqual(marked.through);
  expect(await lane.alarm()).toBe(true);
  expect(host.sends).toHaveLength(2); expect(host.sends[1]).not.toBe(marked.commit); expect(host.targets).toBe(1);
  expect((await row(lane))?.confirmed?.through).toEqual(later); expect(await lane.head()).toEqual(later);
  const source = archiveSource({ open: (scope, work) => readJournalRepositoryArchive({
    format: async () => format, resolve: async ref => ref === journalRef(lane.at.scope) ? host.pointer : null,
    object: async (id, most) => { const object = host.data.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= most ? object.data : null } : null; },
  }, scope, work) });
  const verified = await verifyArchive(source, { mode: "replay", scope: lane.at.scope, head: later, grants: "as-recorded" });
  expect(verified).toMatchObject({ kind: "verification", verification: { report: { result: "consistent", anchors: [] } } });
  fixtureArchiveWiring.delete(lane.name);
});

test("stops on an unexpected ref without overwriting it", async () => {
  const lane = await create({}, {}, archiveDefinition), host = new ScriptedHost("sha1"); host.pointer = "f".repeat(40);
  const before = await lane.head(), result = await lane.inside(state => driver(lane, state, host).run());
  expect(result).toMatchObject({ state: "stopped", reason: "conflict" }); expect(host.pointer).toBe("f".repeat(40)); expect(host.sends).toEqual([]);
  expect((await row(lane))?.stopped?.reason).toBe("conflict"); expect(await lane.head()).toEqual(before);
});

// Invariant: pending host I/O and duplicate pass requests never hold a
// native turn; only the original pass sends, and later entries stay queued.
test("coalesces one host pass while a flood of native turns completes", async () => {
  const lane = await create({}, {}, archiveDefinition), host = new ScriptedHost("sha1"); host.blocked = gate();
  const running = lane.inside(state => { const writer = driver(lane, state, host); return Promise.all([writer.run(), writer.run()]); });
  await host.started.promise;
  const replies = await Promise.all(Array.from({ length: 16 }, (_, index) => lane.submit(lane.remark(`native turn ${index}`))));
  expect(replies.every(reply => reply.answer === "accepted")).toBe(true); expect(host.sends).toEqual([]);
  host.blocked.release();
  expect((await running).map(result => result.state)).toEqual(["confirmed", "confirmed"]); expect(host.sends).toHaveLength(1); expect(host.mintCalls).toBe(1);
  expect((await row(lane))?.confirmed?.through.seq).toBe(0);
  expect(await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).wake())).not.toBeNull();
}, 20_000);

// A fake elapsed clock drives the real deadline fence. No sleep, timeout
// widening, actual token or provider is used.
test("a late host continuation cannot send or record after the original deadline", async () => {
  const lane = await create({}, {}, archiveDefinition), host = new ScriptedHost("sha1"); host.blocked = gate(); let elapsed = 0;
  const running = lane.inside(state => driver(lane, state, host, () => new ArchiveBudget({}, () => elapsed, 1000)).run());
  await host.started.promise; elapsed = 1000; host.blocked.release();
  expect(await running).toMatchObject({ state: "retry", reason: "timeout" }); expect(host.sends).toEqual([]); expect(host.lastAllowed!()).toBe(false);
  const pending = await row(lane); expect(pending?.pending).not.toBeNull(); expect(pending?.confirmed).toBeNull();
  expect(canonicalize(pending)).not.toContain("TEST ARCHIVE TOKEN");
});

// Actual Native signed acts/retention, original-ledger confirmed passes and
// eviction. Entry cap2 means one scout plus one fresh admitted entry; every
// other original cap and the30s per-pass deadline remains unchanged.
test("the Native driver confirms ten thousand one-entry passes and preserves retained rule inputs from pass3700", async context => {
  const declared = variant(archiveDefinition.declared, data => {
    data.acts.remark.step = "transition"; // No effects: the primary item stays unchanged.
    data.rules["archive-text"] = 'fields.text != ""';
    data.acts.remark.guards.push({ rule: "archive-text" });
  });
  const original = archivePolicies.get(archiveDefinition.digest)!, policies: ArchivePolicyRegistry = new Map([[declared.digest,
    { ...original, support: { ...original.support, named: declared.digest, definition: declared } }]]);
  const lane = await create({}, {}, declared), host = new ScriptedHost("sha1"), started = performance.now();
  let old!: { digest: `sha256:${string}`; bytes: string };
  const fields = (n: number) => ({ text: `actual retained rule input ${n}` });
  for (let seq = 1; seq < 10_000; seq++) {
    const answer = await lane.stub.submit(lane.intent(rita, "remark", { on: 0, expected: { on: 1 }, fields: fields(seq) }), lane.grants());
    expect(answer, `Native rule act ${seq}`).toMatchObject({ answer: "accepted" });
    if (answer.answer !== "accepted") return;
    expect(answer.receipt.fact.seq).toBe(seq);
    if (seq % 2500 === 0) console.info("TEST Native retained-input generation", JSON.stringify({ entries: seq + 1, elapsedSeconds: (performance.now() - started) / 1000 }));
    if (seq === 3700) old = await lane.inside(state => {
      const digest = state.storage.sql.exec<{ digest: `sha256:${string}` }>("SELECT json_extract(bytes, '$.prepared[0].input') AS digest FROM entry WHERE seq = ?", seq).one().digest;
      return { digest, bytes: state.storage.sql.exec<{ bytes: string }>("SELECT bytes FROM retained_input WHERE kind = 'rule' AND digest = ?", digest).one().bytes };
    });
  }
  const head = await lane.head(); expect(head.seq).toBe(9999);
  const maximum: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
  const samples: { seq: number; cost: ArchiveCost }[] = [];
  const receipt = async (previous: number) => lane.inside(async state => {
    let budget!: ArchiveBudget;
    const result = await driver(lane, state, host, () => budget = new ArchiveBudget({ entries: 2 }), previous < 0 ? undefined : previous, policies).run();
    const cost = budget.admitted();
    // Observation after the completed archive pass, never a second archive
    // allowance. The real mark/attempt/confirm already used `budget`.
    const stored = new ArchiveRows(archiveSql(state), lane.at).load();
    return { result, cost, confirmed: stored?.confirmed ?? null };
  });
  let previous = -1;
  for (let seq = 0; seq < 10_000; seq++) {
    const outcome = await receipt(previous);
    expect(outcome.result, JSON.stringify({ seq, ...outcome })).toMatchObject({ state: "confirmed" });
    expect(outcome.confirmed?.through.seq).toBe(seq); expect(outcome.cost.entries).toBe(2);
    for (const key of Object.keys(maximum) as (keyof ArchiveCost)[]) maximum[key] = Math.max(maximum[key], outcome.cost[key]);
    if ([0, 999, 3699, 3700, 4999, 9999].includes(seq)) samples.push({ seq, cost: outcome.cost });
    previous = seq;
    if (seq === 3700) await lane.restart();
    if (seq % 1000 === 999) console.info("TEST Native one-entry archive progress", JSON.stringify({ confirmed: seq + 1, elapsedSeconds: (performance.now() - started) / 1000, maximum }));
  }
  expect(host.sends).toHaveLength(10_000); expect(host.appendCalls).toBe(9999);
  const oldBlob = idOf("blob", utf8(old.bytes));
  expect(host.data.get(oldBlob)?.type).toBe("blob");
  expect(await lane.inside(state => state.storage.sql.exec<{ pass: number }>("SELECT pass FROM retained_input WHERE kind = 'rule' AND digest = ?", old.digest).one().pass)).toBe(3700);
  const unrelatedBytes = canonicalize({ unused: true }), unrelated = { digest: digestBytes(utf8(unrelatedBytes)), bytes: unrelatedBytes };
  // Explicit unreferenced negative fixture, not a Native business event.
  await lane.inside(state => state.storage.sql.exec("INSERT INTO retained_input (kind, digest, bytes) VALUES ('rule', ?, ?)", unrelated.digest, unrelated.bytes).toArray());
  let extraObjects: readonly string[] = [];
  const send = host.sendArchive.bind(host);
  host.sendArchive = async request => { extraObjects = request.objects.map(object => object.id); return send(request); };
  expect(await lane.stub.submit(lane.intent(rita, "remark", { on: 0, expected: { on: 1 }, fields: fields(3700) }), lane.grants())).toMatchObject({ answer: "accepted" });
  expect(await lane.inside(state => state.storage.sql.exec<{ digest: string }>("SELECT json_extract(bytes, '$.prepared[0].input') AS digest FROM entry WHERE seq = 10000").one().digest)).toBe(old.digest);
  const extra = await receipt(previous); expect(extra.result, JSON.stringify(extra)).toMatchObject({ state: "confirmed" });
  expect(extra.confirmed?.through.seq).toBe(10_000); expect(extra.cost.entries).toBe(2);
  expect(extraObjects).not.toContain(oldBlob);
  expect(await lane.inside(state => state.storage.sql.exec<{ pass: number }>("SELECT pass FROM retained_input WHERE kind = 'rule' AND digest = ?", old.digest).one().pass)).toBe(3700);
  expect(host.sends).toHaveLength(10_001); expect(host.appendCalls).toBe(10_000); expect(host.closureReads).toBe(0);
  const retained = await lane.inside(state => state.storage.sql.exec<{ count: number }>("SELECT count(*) AS count FROM retained_input WHERE kind = 'rule' AND pass IS NOT NULL").one().count);
  expect(retained).toBe(9999); expect(retained).toBeGreaterThan(4608);
  const later = await lane.head(), source = archiveSource({ open: (scope, work) => readJournalRepositoryArchive({
    format: async () => "sha1", resolve: async () => host.pointer,
    object: async (id, limit) => { const object = host.data.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
  }, scope, work) });
  const verified = await verifyArchive(source, { mode: "replay", scope: lane.at.scope, head: later, grants: "as-recorded" });
  expect(verified).toMatchObject({ kind: "verification", verification: { report: { result: "consistent", anchors: [] } } });
  expect(await lane.head()).toEqual(later);
  (context.task.meta as Record<string, unknown>)["nativeOneEntryScale"] = { confirmedPasses: host.sends.length, retainedRuleInputs: retained, samples, maximum,
    extra: extra.cost, pass3700: { digest: old.digest, blob: oldBlob, outgoingAgain: extraObjects.includes(oldBlob), pass: 3700 },
    elapsedSeconds: (performance.now() - started) / 1000, exactParentReads: host.objectReads.length,
    qualification: "Actual Native signed acts and real rule evaluation, SQLite retention, 10000 confirmed one-entry passes plus one and eviction at3700. Each pass has one original30s ledger; trusted entry cap lowered to2 for scout1+fresh1, all other original caps unchanged. Production SHA1 incremental send copy/hash/validator/pack uses scripted HTTP/token/repository; policy/source/authority are TEST fixtures. Receipt inspections are separate test observations, no archive phase reset. 9999 distinct actual Native rule inputs; extra repeats the3700 rule input without resending its blob; unreferenced negative row remains unconfirmed. Offline current-tree clone/replay is separate; no real Git clone, external provider, deployed custody or cadence claim." };
}, 1_200_000);

test("the native driver confirms a pending v1 attempt before a separate same-cutoff conversion and new v2 pass", async () => {
  const lane = await create({}, {}, archiveDefinition), host = new ScriptedHost("sha1"), head = await lane.head();
  const old = await lane.inside(state => planArchive(archiveSql(state), { at: lane.at, through: head, bounds: PROPOSED_BOUNDS,
    policies: archivePolicies, format: "sha1", parent: null, markedAt: at(0) }, new ArchiveBudget()));
  expect(old.ok ? "accepted" : old).toBe("accepted"); if (!old.ok) return;
  await lane.inside(state => { const rows = new ArchiveRows(archiveSql(state), lane.at); rows.target(archiveRepository, "sha1"); rows.mark(old.mark); });
  await lane.restart();
  expect(await lane.inside(state => driver(lane, state, host).run())).toMatchObject({ state: "confirmed" });
  expect(host.sends).toEqual([old.mark.commit]);
  expect((await row(lane))!.confirmed).toEqual({ commit: old.mark.commit, through: head });
  // Conversion must still be scheduled when no new entry arrived.
  expect(await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).wake())).not.toBeNull();
  await lane.restart();
  expect(await lane.inside(state => driver(lane, state, host).run())).toMatchObject({ state: "confirmed" });
  const converted = (await row(lane))!.confirmed!;
  expect(converted).toMatchObject({ through: head, layout: 2 }); expect(converted.commit).not.toBe(old.mark.commit);
  expect(new Set(host.objectReads)).toEqual(new Set([old.mark.commit]));
  expect(host.sends).toHaveLength(2); expect(await lane.head()).toEqual(head);
  await lane.submit(lane.remark("first post-conversion native entry"));
  const later = await lane.head(); await lane.restart();
  const appended = await lane.inside(state => driver(lane, state, host, undefined, head.seq).run());
  expect(appended, JSON.stringify({ appended, stored: await row(lane) })).toMatchObject({ state: "confirmed" });
  expect((await row(lane))!.confirmed).toMatchObject({ through: later, layout: 2 });
  expect(host.sends).toHaveLength(3); expect(host.closureReads).toBe(0); expect(await lane.head()).toEqual(later);
}, 20_000);
