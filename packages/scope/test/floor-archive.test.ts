/** Archive fixture authority uses genuine Native Membership8 observations.
 * Its seat/key/role and source-birth preparation are external fixture setup;
 * each pass still pays its existing pin lookups and original complete ledger.
 * Inline Lane policy, clock and host/token/repository remain TEST fixtures. */
/** Actual native inputs, archive driver, confirmed receipt rows and
 * alarm floor writer. Declaration/grants/policy/clock and repository, HTTP
 * replies and tokens are explicit fixtures. No deployed host/custody claim. */
import { expect, onTestFinished, test } from "vitest";
import { countedEntries, stateDigest } from "@generalbusiness/dap-derive";
import type { Entry } from "@generalbusiness/dap-contract";
import { timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { ArchiveRows } from "../src/archive-row.ts";
import { ArchiveBudget, ARCHIVE_BOUNDS, type ArchiveCost } from "../src/archive-budget.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { at, type Lane } from "./fixtures-native.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { ScriptedArchiveHost } from "./support/archive-provider.ts";
import { nativeArchiveFixture, createNativeArchiveLane, archiveAuthorityBasis, archiveAuthorityPolicies } from "./support/archive-native-authority.ts";
import { fixtureArchiveWiring } from "./worker.ts";

const policies = (margin: number, minimum: number) => new Map([...archivePolicies].map(([pin, policy]) => [pin, {
  ...policy, entryTypes: new Set([...policy.entryTypes, "floor" as const]), floor: { margin, minimum },
}]));

async function archiveAlarm(lane: Lane, alarmTimes?: number[]) {
  const due = await lane.alarmAt();
  expect(due).not.toBeNull();
  // Confirmation has an existing durable retry time. Triggering the alarm
  // without advancing its scripted clock cannot make that retry due.
  lane.c.clock.now = timeOf(Math.max(timeMs(lane.c.clock.now)!, due!));
  alarmTimes?.push(timeMs(lane.c.clock.now)! - timeMs(at(0))!);
  expect(await lane.alarm()).toBe(true);
}

// The native alarm must archive a small prefix even when floor policy is
// enabled, while its minimum/window prevents an unnecessary floor entry.
test.each([{ inputs: 10, complete: true }, { inputs: 4800, complete: false }])("Native floor-policy alarm measures a$inputs-input archive prefix", async ({ inputs, complete }) => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedArchiveHost("sha1", () => lane.c.clock.now), budgets: ArchiveBudget[] = [];
  fixtureArchiveWiring.set(lane.name, {
    fixtureSources: archiveAuthorityBasis(lane)!.pins,
    policies: { fixture: "archive-policies", registry: archiveAuthorityPolicies(lane, policies(10000, 1000)) },
    target: { fixture: "archive-target", resolve: async () => { host.targets++; return archiveRepository; } }, provider: host,
    budget: () => { const budget = new ArchiveBudget(); budgets.push(budget); return budget; },
  });
  onTestFinished(() => { fixtureArchiveWiring.delete(lane.name); });
  await lane.restart();
  for (let n = 0; n < inputs; n++) expect((await lane.submit(lane.remark(`${complete ? "small prefix" : "old input"} ${n}`))).answer).toBe("accepted");
  const head = await lane.head();
  for (let alarm = 0; alarm < (complete ? 8 : 1); alarm++) {
    await archiveAlarm(lane);
    const observed = await lane.inside(state => {
      const sql = archiveSql(state), row = new ArchiveRows(sql, lane.at).load();
      return { next: row?.next, wake: new ArchiveRows(sql, lane.at).wake(), attempts: row?.attempts, pending: row?.pending?.through.seq,
        confirmed: row?.confirmed?.through.seq, stopped: row?.stopped, floor: new SqliteStore(sql).floor() };
    });
    console.info("floor-policy archive alarm", { inputs, alarm, time: lane.c.clock.now, observed,
      targets: host.targets, mints: host.mintCalls, sends: host.sends.length, budget: budgets.at(-1)?.admitted() });
    expect(observed.stopped).toBeNull(); expect(observed.floor).toBeNull();
    if (!complete) { expect(observed.confirmed).toBeGreaterThanOrEqual(0); expect(observed.confirmed).toBeLessThanOrEqual(head.seq); return; }
    if (observed.confirmed === head.seq) { expect(await lane.head()).toEqual(head); return; }
  }
  expect.fail("a small native archive prefix must confirm within its actual alarm schedule");
}, 30_000);

// Invariant: the actual writer uses its confirmed receipt and minimum
// increment, rather than creating a succession of one-entry floors.
test("Native alarm writer advances a30000-entry journal in five bounded floors then waits for a1000-position target rise", async () => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedArchiveHost("sha1", () => lane.c.clock.now);
  const budgets: ArchiveBudget[] = [];
  fixtureArchiveWiring.set(lane.name, {
    fixtureSources: archiveAuthorityBasis(lane)!.pins,
    policies: { fixture: "archive-policies", registry: archiveAuthorityPolicies(lane, policies(10000, 1000)) },
    target: { fixture: "archive-target", resolve: async () => archiveRepository }, provider: host,
    budget: () => { const budget = new ArchiveBudget(); budgets.push(budget); return budget; },
  });
  onTestFinished(() => { fixtureArchiveWiring.delete(lane.name); });
  await lane.restart();
  for (let n = 0; n < 29000; n++) expect((await lane.submit(lane.remark(`old input ${n}`))).answer).toBe("accepted");
  const through = await lane.head(); expect(through.seq).toBe(29000);
  const alarmTimes: number[] = [], confirmations: number[] = [], progress: unknown[] = [];
  onTestFinished(() => { console.info("floor history prefix summary", { alarmCount: alarmTimes.length,
    confirmationCount: confirmations.length, first: progress[0], last: progress.at(-1) }); });
  // The clock has not passed the intent lifetime, so these real archive
  // alarms may confirm the prefix but cannot write a floor yet.
  for (let pass = 0; ; pass++) {
    // The former128 fixture guard was not enough for measured31-entry
    // passes. Like the existing cadence witness, require strict progress
    // and allow at most one alarm per entry, within the same600s deadline.
    expect(pass).toBeLessThan(through.seq + 1);
    await archiveAlarm(lane, alarmTimes);
    const row = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());
    progress.push({ confirmed: row?.confirmed?.through.seq, pending: row?.pending?.through.seq,
      next: row?.next, attempts: row?.attempts, stopped: row?.stopped, mints: host.mintCalls, sends: host.sends.length });
    const cost = budgets.at(-1)!.admitted();
    for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof ArchiveCost)[]) expect(cost[key]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]);
    console.info("F2 history archive alarm", JSON.stringify({ alarm: pass, at: lane.c.clock.now, ...progress.at(-1) as object, cost }));
    expect(row?.stopped).toBeNull();
    expect(row?.pending).toBeNull();
    expect(row?.confirmed?.through.seq).toBeGreaterThan(confirmations.at(-1) ?? -1);
    confirmations.push(row!.confirmed!.through.seq);
    if (row?.confirmed?.through.seq === through.seq) break;
  }
  const receipt = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load()!.confirmed!);
  expect(receipt.layout).toBe(2); expect(receipt.through).toEqual(through);
  expect(timeMs(lane.c.clock.now)! - timeMs(at(0))!).toBeLessThan(lane.c.bounds.intentLifetimeSeconds * 1000);
  console.info("floor history prefix confirmed", { alarmCount: alarmTimes.length, through: receipt.through.seq, milliseconds: alarmTimes.at(-1) });
  for (let n = 0; n < 999; n++) expect((await lane.submit(lane.remark(`recent input ${n}`))).answer).toBe("accepted");
  expect((await lane.head()).seq).toBe(29999);
  lane.c.clock.now = at(1000);
  const floors: number[] = [];
  for (let n = 0; n < 5; n++) {
    // The scripted host withholds a new credential. This keeps the genuine
    // already-confirmed receipt through29000 while the floor writer runs.
    host.missingMint = true;
    await archiveAlarm(lane);
    const floor = await lane.inside(state => {
      const store = new SqliteStore(archiveSql(state)), current = store.scope()!;
      const entry = JSON.parse(store.stored(current.head.seq)!.bytes) as Entry;
      expect(entry.input).toMatchObject({ type: "floor", receipt: { commit: receipt.commit, through } });
      return store.floor()!.floor;
    });
    floors.push(floor);
  }
  expect(floors).toEqual([4096, 8192, 12288, 16384, 20004]);
  const before = await lane.head();
  host.missingMint = true; await archiveAlarm(lane);
  expect(await lane.head()).toEqual(before);
  for (let n = 0; n < 998; n++) expect((await lane.submit(lane.remark(`target rise ${n}`))).answer).toBe("accepted");
  host.missingMint = true; await archiveAlarm(lane);
  expect(await lane.inside(state => new SqliteStore(archiveSql(state)).floor()!.floor)).toBe(20004);
  expect((await lane.submit(lane.remark("target rises by exactly1000"))).answer).toBe("accepted");
  host.missingMint = true; await archiveAlarm(lane);
  expect(await lane.inside(state => new SqliteStore(archiveSql(state)).floor()!.floor)).toBe(21004);
  const stable = () => lane.inside(state => {
    const store = new SqliteStore(archiveSql(state)), count = countedEntries(store), rows = state.storage.sql.exec("SELECT COUNT(*) AS n FROM entry").one()["n"];
    expect(count).toBe(rows);
    return { floor: store.floor(), head: store.scope()!.head, count, digest: stateDigest(store.all()) };
  });
  const beforeRestart = await stable(); await lane.restart(); expect(await stable()).toEqual(beforeRestart);
}, 600_000);


// Invariant: a floor is writable at the exact entry ceiling and lets a
// bounded native scope keep accepting inputs; without floors it stops there.
test("Native archive floors reclaim an exact2000-entry ceiling while10000 real inputs continue", async () => {
  const fixture = await nativeArchiveFixture();
  const fixed = await fixture.create({ scopeEntries: 2000 }, {}, archiveDefinition);
  for (let n = 0; n < 1998; n++) expect((await fixed.submit(fixed.remark(`fixed ${n}`))).answer).toBe("accepted");
  // Legacy admission reserves its closing checkpoint. Fill that actual
  // reserved slot, rather than pretending an ordinary act can consume it.
  expect(await fixed.stub.checkpoint()).toMatchObject({ answer: "written" });
  expect(await fixed.submit(fixed.remark("past the fixed ceiling"))).toMatchObject({ answer: "refused", reason: "scope-full" });
  expect((await fixed.head()).seq).toBe(1999);

  const lane = await fixture.create({ scopeEntries: 2000 }, {}, archiveDefinition), host = new ScriptedArchiveHost("sha1", () => lane.c.clock.now), budgets: ArchiveBudget[] = [];
  fixtureArchiveWiring.set(lane.name, {
    fixtureSources: archiveAuthorityBasis(lane)!.pins,
    policies: { fixture: "archive-policies", registry: archiveAuthorityPolicies(lane, policies(200, 500)) },
    target: { fixture: "archive-target", resolve: async () => archiveRepository }, provider: host,
    budget: () => { const budget = new ArchiveBudget(); budgets.push(budget); return budget; },
  });
  onTestFinished(() => { fixtureArchiveWiring.delete(lane.name); });
  await lane.restart();
  let inputs = 0, seconds = 0, floors = 0, alarms = 0;
  const held = () => lane.inside(state => countedEntries(new SqliteStore(archiveSql(state))));
  for (; inputs < 1998; inputs++) expect((await lane.submit(lane.remark(`bounded ${inputs}`))).answer).toBe("accepted");
  expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written" }); inputs++;
  expect(await held()).toBe(2000);
  const fullHead = await lane.head();
  while (inputs < 9999) {
    const batch = Math.min(500, 9999 - inputs);
    seconds += 1000; lane.c.clock.now = at(seconds);
    const start = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load()?.confirmed?.through.seq ?? -1);
    const backlog = (await lane.head()).seq - start;
    let confirmed = start;
    for (let alarm = 0; (await held()) + batch >= 2000; alarm++) {
      expect(alarm).toBeLessThan(backlog);
      await archiveAlarm(lane);
      const cost = budgets.at(-1)!.admitted();
      for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof ArchiveCost)[]) expect(cost[key]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]);
      const state = await lane.inside(storage => {
        const sql = archiveSql(storage), store = new SqliteStore(sql), row = new ArchiveRows(sql, lane.at).load();
        expect(row?.stopped).toBeNull();
        expect(row?.pending).toBeNull(); expect(row?.confirmed?.through.seq).toBeGreaterThan(confirmed);
        confirmed = row!.confirmed!.through.seq;
        return store.floor();
      });
      alarms++;
      console.info("F2 capacity archive alarm", JSON.stringify({ alarms, inputs, at: lane.c.clock.now,
        confirmed, floor: state?.floor ?? null, held: await held(), cost }));
      if (state) floors = Math.max(floors, state.floor);
    }
    expect(await held()).toBeLessThan(2000);
    if (inputs === 1999) expect((await lane.head()).seq).toBeGreaterThan(fullHead.seq); // a floor wrote while initially full
    for (let n = 0; n < batch; n++, inputs++) expect((await lane.submit(lane.remark(`bounded ${inputs}`))).answer).toBe("accepted");
  }
  expect(inputs + 1).toBe(10000);
  expect(floors).toBeGreaterThan(0);
  expect((await lane.head()).seq).toBeGreaterThanOrEqual(10000);
  expect(await held()).toBeLessThan(2000);
  await lane.restart();
  expect(await held()).toBeLessThan(2000);
  console.info("F2 capacity summary", { protocolInputs: inputs + 1, signedRemarks: inputs - 1, checkpoints: 1, genesis: 1, archiveAlarms: alarms, floor: floors,
    head: (await lane.head()).seq, held: await held(), scopeEntries: lane.c.bounds.scopeEntries });
}, 600_000);
