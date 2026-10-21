/** Real native SQLite/turns/eviction; the host, credentials and fixture
 * admission/authority are explicit stand-ins. Actual adapter enforcement
 * and alarm wiring have separate obligations. No external provider runs. */
import { expect, onTestFinished, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, timeOf } from "@generalbusiness/artroom-bytes";
import { journalRef } from "@generalbusiness/artroom-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/artroom-git/journal-reader";
import { archiveSource, verifyArchive } from "@generalbusiness/artroom-replay";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { driver, ScriptedHost } from "./support/archive-driver.ts";
import type { ArchivePolicyRegistry } from "../src/archive-inventory.ts";
import { archiveHostGate as gate } from "./support/archive-provider.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { planArchive } from "../src/archive-build.ts";
import { at, create, rita, una, type Lane } from "./fixtures-native.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { fixtureArchiveWiring } from "./worker.ts";
import type { TestScope } from "./worker.ts";

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
