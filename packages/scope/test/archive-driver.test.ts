/** Archive fixture authority uses genuine Native Membership8 observations.
 * Its seat/key/role and source-birth preparation are external fixture setup;
 * each pass still pays its existing pin lookups and original complete ledger.
 * Inline Lane policy, clock and host/token/repository remain TEST fixtures. */
/** Real native SQLite/turns/eviction; the host, credentials and fixture
 * admission/authority are explicit stand-ins. Actual adapter enforcement
 * and alarm wiring have separate obligations. No external provider runs. */
import { expect, onTestFinished, test, vi } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { journalRef } from "@generalbusiness/dap-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/dap-git/journal-reader";
import { archiveSource, verifyArchive, TRUSTS } from "@generalbusiness/dap-replay";
import { ARCHIVE_BOUNDS, ArchiveBudget, type ArchiveCost, type ArchiveCapacityRefusal } from "../src/archive-budget.ts";
import { driver, ScriptedHost } from "./support/archive-driver.ts";
import type { ArchivePolicyRegistry } from "../src/archive-inventory.ts";
import { archiveHostGate as gate } from "./support/archive-provider.ts";
import { ArchivePrefixStopped } from "../src/archive-prefix.ts";
import { ArchiveDriver } from "../src/archive-driver.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { planArchive, type ArchiveFixedFinish } from "../src/archive-build.ts";
import { at, rita, una, type Lane } from "./fixtures-native.ts";
import { createNativeArchiveLane, createNativeArchiveApplicationLane, archiveAuthorityBasis, archiveAuthorityPolicies, archiveAuthorityAnchors } from "./support/archive-native-authority.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { fixtureArchiveWiring, fixtureArchiveRestart } from "./worker.ts";
import type { TestScope } from "./worker.ts";
import type { readArchiveCapacityObservation } from "../src/archive-capacity-observation.ts";

// Observe the existing production diagnostic; no scheduling or budget hook.
function passDiagnostics() {
  const records: { state: string; reason: string; capacityRefusal: ArchiveCapacityRefusal | null; cost: ArchiveCost; fixedFinish: ArchiveFixedFinish | null;
    capacityObservation: ReturnType<typeof readArchiveCapacityObservation> }[] = [], info = console.info;
  const log = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
    if (args[0] === "archive-pass-diagnostic-v1") records.push(args[1] as (typeof records)[number]);
    info(...args);
  });
  onTestFinished(() => log.mockRestore());
  return records;
}
const row = (lane: Lane) => lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());
async function alarmFixture(host: ScriptedHost, resolve = async () => { host.targets++; return archiveRepository; }, factory = false,
  options: { budget?: () => ArchiveBudget; maxBytes?: number } = {}) {
  const lane = factory ? await createNativeArchiveApplicationLane() : await createNativeArchiveLane({}, {}, archiveDefinition);
  fixtureArchiveWiring.set(lane.name, { policies: { fixture: "archive-policies", registry: archiveAuthorityPolicies(lane, archivePolicies) }, fixtureSources: archiveAuthorityBasis(lane)!.pins, target: { fixture: "archive-target", resolve }, provider: host, ...options });
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
  const remaining = later.seq - before.seq;
  expect(remaining).toBe(16); expect(host.sends).toHaveLength(1);
  let confirmed = before, sends = 1;
  // The original budget can finish an earlier whole prefix. Each real
  // scheduled continuation must advance, so at most one per remaining
  // position is needed; neither a retry loop nor a larger budget is used.
  for (let pass = 0; pass < remaining && confirmed.seq < later.seq; pass++) {
    expect(await lane.inside(state => state.storage.getAlarm())).not.toBeNull();
    expect(await lane.alarm()).toBe(true);
    const advanced = await row(lane);
    if (!advanced?.confirmed) expect.fail("a scheduled archive continuation must confirm a prefix");
    expect(advanced.stopped).toBeNull(); expect(advanced.pending).toBeNull();
    expect(advanced.confirmed.through.seq).toBeGreaterThan(confirmed.seq);
    expect(advanced.confirmed.through.seq).toBeLessThanOrEqual(later.seq);
    confirmed = advanced.confirmed.through;
    expect(host.sends).toHaveLength(++sends);
    expect(host.targets).toBe(1); expect(await lane.head()).toEqual(later);
  }
  expect(confirmed).toEqual(later);
  expect(host.sends).toHaveLength(sends); expect(host.targets).toBe(1); expect(await lane.head()).toEqual(later);
  fixtureArchiveWiring.delete(lane.name);
}, 20_000);

// Deliberate platform-alarm reset reconstruction, not hosted cancellation
// evidence. Recovery only schedules the durable wake: it must not seal or
// enter the scripted archive host until the actual alarm is dispatched.
test("a native birth read restores a lost archive alarm without shortening backoff or a prior alarm", async () => {
  let lookups = 0;
  const host = new class extends ScriptedHost {
    override async format() { lookups++; return super.format(); }
    override async ref() { lookups++; return super.ref(); }
  }("sha1");
  host.missingMint = true;
  const lane = await alarmFixture(host, undefined, true);
  expect(await lane.alarm()).toBe(true);
  const first = (await row(lane))!;
  expect(first.attempts).toBe(1);
  expect(Date.parse(first.next!) - Date.parse(lane.c.clock.now)).toBe(PROPOSED_BOUNDS.dispatchRetrySeconds * 1000);
  // A second failed mint keeps the existing Mark cadence, independently
  // of the new pre-Mark capacity counter.
  lane.c.clock.now = first.next!; host.missingMint = true;
  await lane.restart(); expect(await lane.alarm()).toBe(true);
  const pending = (await row(lane))!;
  expect(pending.attempts).toBe(2); expect(pending.pending).toEqual(first.pending);
  expect(Date.parse(pending.next!) - Date.parse(lane.c.clock.now)).toBe(PROPOSED_BOUNDS.dispatchRetrySeconds * 2 * 1000);
  expect(pending.pending).not.toBeNull(); expect(pending.confirmed).toBeNull();
  expect(pending.next).not.toBeNull();
  const next = Date.parse(pending.next!), head = await lane.head();
  expect(next).toBeGreaterThan(Date.parse(lane.c.clock.now));
  const before = { lookups, targets: host.targets, mints: host.mintCalls, sends: [...host.sends], reads: [...host.objectReads], closures: host.closureReads };
  const readBirth = async () => {
    await (lane.object as unknown as { nativeBirth(at: unknown, milliseconds: number): Promise<unknown> }).nativeBirth(lane.at, 10_000);
    // Join the actual object's already-scheduled callbacks, without another
    // native turn, clock advance, driver call, or invented scheduling hook.
    await lane.inside((_state, instance) => (instance as { awaitScheduledCallbacks(): Promise<unknown> }).awaitScheduledCallbacks());
  };
  await lane.inside(state => state.storage.deleteAlarm());
  expect(await lane.alarmAt()).toBeNull();
  await readBirth();
  expect(await lane.alarmAt(), "a read must re-arm the exact future archive backoff").toBe(next);
  expect(await row(lane)).toEqual(pending);
  const earlier = next - 1;
  await lane.inside(state => state.storage.setAlarm(earlier));
  await readBirth();
  expect(await lane.alarmAt(), "recovery must not postpone an earlier native alarm").toBe(earlier);
  await lane.inside(state => state.storage.setAlarm(next + 1));
  await readBirth();
  expect(await lane.alarmAt(), "recovery must replace a later alarm with the archive wake").toBe(next);
  lane.c.clock.now = pending.next!;
  await lane.inside(state => state.storage.deleteAlarm());
  await readBirth();
  expect(await lane.alarmAt(), "a due durable archive wake must regain its alarm").toBe(next);
  expect(await row(lane)).toEqual(pending);
  expect(await lane.head()).toEqual(head);
  expect({ lookups, targets: host.targets, mints: host.mintCalls, sends: [...host.sends], reads: [...host.objectReads], closures: host.closureReads }).toEqual(before);
  expect(await lane.alarm()).toBe(true);
  const confirmed = (await row(lane))!;
  expect(confirmed.pending).toBeNull(); expect(confirmed.stopped).toBeNull();
  expect(confirmed.confirmed).toMatchObject({ commit: pending.pending!.commit, through: pending.pending!.through, layout: 2 });
  expect(host.sends).toEqual([pending.pending!.commit]);
  expect(await lane.head()).toEqual(head);
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
  const originalInfo = console.info, observed: unknown[][] = [];
  console.info = (...args: unknown[]) => { if (args[0] === "archive-pass-diagnostic-v1") observed.push(args); else originalInfo(...args); };
  try {
    const host = new ScriptedHost("sha1"); let ready = false;
    const lane = await alarmFixture(host, async () => { host.targets++; if (!ready) throw new Error("TEST PRIVATE ERROR SENTINEL"); return archiveRepository; });
    const before = await lane.head(); expect(await lane.alarm()).toBe(true); expect(await row(lane)).toBeNull();
    const next = await lane.inside(state => state.storage.getAlarm()); expect(next).not.toBeNull();
    expect(next! - Date.parse(lane.c.clock.now)).toBe(PROPOSED_BOUNDS.dispatchRetrySeconds * 1000);
    await lane.restart();
    await lane.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
    expect(await lane.inside(state => state.storage.getAlarm())).toBe(next);
    expect(await lane.alarm()).toBe(true); expect(host.targets).toBe(1); expect(host.mintCalls).toBe(0);
    lane.c.clock.now = timeOf(next!); await lane.restart();
    expect(await lane.alarm()).toBe(true); expect(host.targets).toBe(2);
    const second = await lane.alarmAt();
    expect(second! - Date.parse(lane.c.clock.now)).toBe(PROPOSED_BOUNDS.dispatchRetrySeconds * 1000);
    ready = true; lane.c.clock.now = timeOf(second!); await lane.restart();
    expect(await lane.alarm()).toBe(true); expect(host.sends).toHaveLength(1); expect(host.targets).toBe(3);
    expect((await row(lane))?.confirmed?.through.seq).toBeGreaterThan(before.seq);
    fixtureArchiveWiring.delete(lane.name);

    const records = observed.map(args => {
      expect(args).toHaveLength(2);
      const record = args[1] as Record<string, unknown>;
      expect(Object.keys(record).sort()).toEqual(["step", "detail", "rowPhaseAtLoad", "confirmed", "pending", "attemptsAtLoad", "hasNext", "attempted", "state", "reason", "caught", "cost", "reservationCosts", "parentRead", "capacityRefusal", "fixedFinish", "sourceFailure", "capacityObservation"].sort());
      expect(record["capacityObservation"]).toBeNull();
      // This stand-in provider has no exact-object transport. It must not
      // invent a parent-read phase from a target failure or native work.
      expect(record["capacityRefusal"]).toBeNull();
      expect(record["fixedFinish"]).toBeNull();
      expect(record["sourceFailure"]).toBeNull();
      expect(record["parentRead"]).toEqual({ ordinal: 0, type: "none", maximum: 0, phase: "none", refusal: "none" });
      expect(["row-load", "pin", "due-check", "target", "format", "pending-readback", "parent", "bootstrap", "sources", "rebuild", "plan", "frontier", "mark", "copy", "mint", "send", "readback", "confirm"]).toContain(record["step"]);
      expect(["none", "not-due", "wake-not-due", "target-missing", "target-different"]).toContain(record["detail"]);
      expect(["unknown", "absent", "stopped", "pending", "confirmed", "target"]).toContain(record["rowPhaseAtLoad"]);
      expect(["idle", "disabled", "retry", "stopped", "confirmed", "threw"]).toContain(record["state"]);
      for (const key of ["reason", "caught"]) expect(["none", "other", "limit", "timeout", "unavailable", "conflict", "mismatch", "parent", "missing-input", "rebuild-mismatch", "unsupported-archive-cohort"]).toContain(record[key]);
      for (const key of ["confirmed", "pending", "attemptsAtLoad"]) {
        const value = record[key];
        expect(value === null || typeof value === "number" && Number.isSafeInteger(value) && value >= 0).toBe(true);
      }
      expect(typeof record["hasNext"]).toBe("boolean"); expect(typeof record["attempted"]).toBe("boolean");
      const cost = record["cost"] as Record<string, unknown>;
      expect(Object.keys(cost).sort()).toEqual(Object.keys(ARCHIVE_BOUNDS).sort());
      for (const value of Object.values(cost)) expect(typeof value === "number" && Number.isSafeInteger(value) && value >= 0).toBe(true);
      const reservationCosts = record["reservationCosts"] as ReturnType<ArchiveBudget["reservationCosts"]>;
      expect(Object.keys(reservationCosts).sort()).toEqual(["metadataReserved", "metadataSettled", "unsettledMetadata", "settlementRefusal"].sort());
      for (const value of [reservationCosts.metadataReserved, reservationCosts.metadataSettled, reservationCosts.unsettledMetadata]) expect(Number.isSafeInteger(value) && value >= 0).toBe(true);
      expect(reservationCosts.metadataSettled).toBe(cost["metadata"]);
      expect(reservationCosts.metadataReserved).toBeGreaterThanOrEqual(reservationCosts.metadataSettled);
      expect(reservationCosts.unsettledMetadata).toBeLessThanOrEqual(reservationCosts.metadataSettled);
      expect(reservationCosts.settlementRefusal).toBe("none");
      return record;
    });
    expect(records.some(record => record["step"] === "target" && record["state"] === "retry" && record["caught"] === "unavailable")).toBe(true);
    expect(records.some(record => record["detail"] === "wake-not-due" || record["detail"] === "not-due")).toBe(true);
    expect(records.some(record => record["step"] === "confirm" && record["state"] === "confirmed")).toBe(true);
    const printed = JSON.stringify(observed);
    for (const secret of ["TEST PRIVATE ERROR SENTINEL", "TEST ARCHIVE TOKEN", ...Object.values(archiveRepository)]) expect(printed).not.toContain(secret);
    // The same already-confirmed driver result survives a synchronous logger
    // failure. No extra mint/send is needed to exercise observation failure.
    const confirmed = await row(lane), head = await lane.head();
    expect(confirmed?.confirmed?.through.seq).toBeGreaterThanOrEqual(head.seq);
    let loggerCalls = 0;
    console.info = (...args: unknown[]) => { if (args[0] === "archive-pass-diagnostic-v1") { loggerCalls++; throw new Error("TEST LOGGER FAILURE"); } originalInfo(...args); };
    expect(await lane.inside(state => driver(lane, state, host).run())).toEqual({ state: "idle", next: null });
    expect(loggerCalls).toBe(1); expect(await row(lane)).toEqual(confirmed); expect(await lane.head()).toEqual(head);
    expect(host.sends).toHaveLength(1); expect(host.mintCalls).toBe(1); expect(host.targets).toBe(3);
  } finally { console.info = originalInfo; }
});

// Invariant: a lost own send answer is resolved from the ref, never by
// creating a second commit, writing a journal entry or reminting on success.
test("confirms a lost reply by read-back with no second commit or journal entry", async () => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedHost("sha1"), before = await lane.head(); host.loseReply = true;
  const result = await lane.inside(state => driver(lane, state, host).run());
  expect(result.state).toBe("confirmed"); expect(host.sends).toHaveLength(1); expect(host.mintCalls).toBe(1); expect(host.revoked).toBe(1);
  expect((await row(lane))?.confirmed?.commit).toBe(host.pointer);
  expect(await lane.head()).toEqual(before);
  expect((await lane.inside(state => driver(lane, state, host).run())).state).toBe("idle");
  expect(host.sends).toHaveLength(1); expect(host.targets).toBe(1);
});

// Each Native archive fixture owns its clock until this test finishes.
// Separate registrations keep the production fixture lifetime guard intact.
test.each([0, 1])("a native archive shortage at %s entries retries the same head after eviction", async entries => {
  const diagnostics = passDiagnostics();
  const retryHost = new ScriptedHost("sha1"), quotes: { cost: Partial<ArchiveCost>; spent: ArchiveCost; fits: boolean }[] = [];
  let limited = 0;
  const makeShortage = () => {
    const budget = new class extends ArchiveBudget {
      override lookahead<T>(reserve: Partial<ArchiveCost>, read: () => T) {
        const result = super.lookahead(reserve, read);
        if (result.kind === "limited") limited++;
        return result;
      }
      override async lookaheadAsync<T>(reserve: Partial<ArchiveCost>, read: () => Promise<T>) {
        const result = await super.lookaheadAsync(reserve, read);
        if (result.kind === "limited") limited++;
        return result;
      }
    }({ entries }), canSpend = budget.canSpend.bind(budget);
    budget.canSpend = cost => {
      const fits = canSpend(cost);
      // Observe the actual complete finish quote, without changing either
      // its forecast or the original budget's admission decision.
      if ((cost.entries ?? 0) > 0 && (cost.nodes ?? 0) > 0 && (cost.calls ?? 0) > 0) {
        if (quotes.length === 8) quotes.shift();
        quotes.push({ cost: { ...cost }, spent: budget.admitted(), fits });
      }
      return fits;
    };
    return budget;
  };
  const budgets: ArchiveBudget[] = [];
  const retryLane = await alarmFixture(retryHost, undefined, false, { budget: () => {
    const budget = budgets.length === 0 ? makeShortage() : new ArchiveBudget(); budgets.push(budget); return budget;
  } });
  const before = await retryLane.head(), due = timeOf(Date.parse(retryLane.c.clock.now) + PROPOSED_BOUNDS.dispatchRetrySeconds * 2 * 1000);
  expect(await retryLane.alarm()).toBe(true);
  expect(budgets).toHaveLength(1);
  const shortage = budgets[0]!; expect(() => shortage.check()).not.toThrow();
  expect(diagnostics).toHaveLength(1);
  const refusal = diagnostics[0]!.capacityRefusal;
  expect(refusal, "the actual no-prefix capacity exit must carry its own refusal").not.toBeNull();
  expect(refusal).toMatchObject({ site: entries === 0 ? "scout-open" : "finish-affordability", kind: entries === 0 ? "debit" : "finish-quote" });
  expect(refusal!.shortfall.entries).toBeGreaterThan(0);
  expect(refusal!.used.entries).toBe(entries); expect(refusal!.limit.entries).toBe(entries);
  const deferred = (await row(retryLane))!;
  expect(deferred).toMatchObject({ pending: null, confirmed: null, stopped: null, attempts: 0, next: null });
  expect(await retryLane.inside(state => new ArchiveRows(archiveSql(state), retryLane.at).wake())).toBe(due);
  expect(await retryLane.alarmAt()).toBe(Date.parse(due));
  expect(retryHost.mintCalls).toBe(0); expect(retryHost.sends).toEqual([]);
  expect(await retryLane.head()).toEqual(before);
  if (entries === 0) {
    expect(limited, "the first native prefix read must actually exhaust the lowered lookahead allowance").toBeGreaterThan(0);
    expect(quotes).toEqual([]);
  } else {
    // Scouting paid for the first entry. Fresh finishing inventory owes
    // that entry again, so a real non-null quote cannot fit entries=1.
    const refused = quotes.find(quote => !quote.fits && quote.spent.entries === 1 && (quote.cost.entries ?? 0) > 0);
    expect(refused, JSON.stringify({ limited, quotes })).toBeDefined();
    expect(refused!.spent.entries + refused!.cost.entries!).toBeGreaterThan(entries);
  }
  const spent = shortage.admitted();
  expect(spent.inputWork).toBeGreaterThan(0);
  for (const key of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const) {
    expect(spent[key]).toBeLessThanOrEqual(key === "entries" ? entries : ARCHIVE_BOUNDS[key]);
  }
  await retryLane.restart(); retryLane.c.clock.now = due;
  expect(await row(retryLane)).toEqual(deferred);
  expect(await retryLane.alarm()).toBe(true); expect(budgets).toHaveLength(2);
  expect((await row(retryLane))!).toMatchObject({ pending: null, stopped: null, confirmed: { through: before } });
  expect(retryHost.sends).toHaveLength(1); expect(await retryLane.head()).toEqual(before);
  expect(shortage.admitted()).toEqual(spent);
  expect(diagnostics.at(-1)).toMatchObject({ state: "confirmed", capacityRefusal: null });
  console.info("archive-capacity-deferral-witness", { entries, limited, quotes, spent, due,
    confirmed: (await row(retryLane))!.confirmed!.through,
    qualification: "Actual Native alarms, persisted wake, eviction and confirmation; only the first pass lowers the existing entries allowance. Host, credentials and policy admission remain TEST stand-ins. No hosted cancellation cause or recovery is established." });
});

// Real Native alarms and eviction; the existing host and policy are TEST
// stand-ins. Literal observed delays distinguish reset, escalation and cap.
test("capacity deferrals survive eviction, cap at five minutes and reset after progress", async () => {
  const host = new ScriptedHost("sha1"); let shortage = true;
  const lane = await alarmFixture(host, undefined, false, { budget: () => new ArchiveBudget(shortage ? { entries: 0 } : {}) });
  const head = await lane.head(), delays = [2, 4, 8, 16, 32, 64, 128, 256, 300, 300, 300];
  let deferred: Awaited<ReturnType<typeof row>> = null;
  for (const [index, seconds] of delays.entries()) {
    const now = Date.parse(lane.c.clock.now);
    expect(await lane.alarm()).toBe(true);
    const actual = (await row(lane))!;
    expect(actual).toMatchObject({ confirmed: null, pending: null, attempts: 0, stopped: null, next: null });
    if (deferred) expect(actual).toEqual(deferred);
    deferred = actual;
    const wake = await lane.inside(state => JSON.parse(state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'archive-wake-1'").one().v));
    expect(wake).toEqual({ capacityDeferrals: index + 1, pending: true, stopped: false, next: timeOf(now + seconds * 1000) });
    expect(await lane.alarmAt()).toBe(now + seconds * 1000);
    expect(host.sends).toEqual([]); expect(host.mintCalls).toBe(0); expect(await lane.head()).toEqual(head);
    // A fresh activation reads the persisted count, not a driver field.
    lane.c.clock.now = wake.next; await lane.restart();
  }
  shortage = false;
  expect(await lane.alarm()).toBe(true);
  expect((await row(lane))!).toMatchObject({ confirmed: { through: head }, pending: null, stopped: null });
  expect(host.sends).toHaveLength(1);
  const cleared = await lane.inside(state => JSON.parse(state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'archive-wake-1'").one().v));
  expect(cleared).toEqual({ pending: false, stopped: false, next: null });
  await lane.did(rita, "remark", { on: 0, fields: { text: "a new prefix after capacity progress" } });
  shortage = true;
  const now = Date.parse(lane.c.clock.now);
  expect(await lane.alarm()).toBe(true);
  const reset = await lane.inside(state => JSON.parse(state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'archive-wake-1'").one().v));
  expect(reset).toEqual({ capacityDeferrals: 1, pending: true, stopped: false, next: timeOf(now + 2000) });
  expect(await lane.alarmAt()).toBe(now + 2000);
  expect((await row(lane))!).toMatchObject({ confirmed: { through: head }, pending: null, stopped: null });
  expect(host.sends).toHaveLength(1);
});

test("a native archive null transfer forecast remains stopped without a wake or Mark", async context => {
  const diagnostics = passDiagnostics();
  // A byte/layout refusal is not evidence of temporary capacity shortage.
  // maxBytes=1 makes the real transfer forecast null; it must stay stopped.
  const hardHost = new ScriptedHost("sha1"), hardBudgets: ArchiveBudget[] = [];
  let hardQuotes = 0;
  const hardLane = await alarmFixture(hardHost, undefined, false, { budget: () => {
    const budget = new ArchiveBudget(), canSpend = budget.canSpend.bind(budget);
    budget.canSpend = cost => {
      if ((cost.entries ?? 0) > 0 && (cost.nodes ?? 0) > 0 && (cost.calls ?? 0) > 0) hardQuotes++;
      return canSpend(cost);
    };
    hardBudgets.push(budget); return budget;
  }, maxBytes: 1 }), hardHead = await hardLane.head();
  expect(await hardLane.alarm()).toBe(true);
  expect(hardBudgets).toHaveLength(1);
  expect((await row(hardLane))!).toMatchObject({ pending: null, confirmed: null, stopped: { reason: "limit" }, attempts: 0, next: null });
  expect(diagnostics.at(-1)).toMatchObject({ state: "stopped", capacityRefusal: null });
  expect(hardQuotes).toBe(0); expect(hardHost.mintCalls).toBe(0); expect(hardHost.sends).toEqual([]);
  expect(await hardLane.inside(state => new ArchiveRows(archiveSql(state), hardLane.at).wake())).toBeNull();
  expect(await hardLane.alarmAt()).toBeNull(); expect(await hardLane.head()).toEqual(hardHead);
  (context.task.meta as Record<string, unknown>)["nullTransferRefusal"] = { maxBytes: 1, quotes: hardQuotes, spent: hardBudgets[0]!.admitted(),
    qualification: "Real transfer forecast under a one-byte fixture maximum, not a synthetic planner failure; host, credentials and policy admission remain TEST stand-ins." };
});

// Invariant: earlier whole entries can complete after actual lookahead has
// spent work, including the real incremental-send code and Native receipt.
test("adaptive Native passes reserve writing, incremental sending and confirmation before more lookahead", async context => {
  const diagnostics = passDiagnostics();
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedHost("sha1");
  await lane.inside(async (_state, instance) => {
    for (let n = 0; n < 300; n++) expect(await (instance as TestScope).checkpoint()).toMatchObject({ answer: "written" });
  });
  const head = await lane.head(), budgets: ArchiveBudget[] = [], maximum = ARCHIVE_BOUNDS.inputWork;
  const quotes: { cost: Partial<ArchiveCost>; spent: ArchiveCost }[] = [];
  const lookaheads: { kind: "position" | "limited"; seq: number | null; reserve: Partial<ArchiveCost>; before: ArchiveCost; after: ArchiveCost }[][] = [];
  const makeBudget = () => {
    const observed: (typeof lookaheads)[number] = []; lookaheads.push(observed);
    const budget = new class extends ArchiveBudget {
      override lookahead<T>(reserve: Partial<ArchiveCost>, read: () => T) {
        const before = this.admitted(), result = super.lookahead(reserve, read);
        if ((reserve.inputWork ?? 0) > 0) {
          let kind: "position" | "limited" | undefined, seq: number | null = null;
          if (result.kind === "limited") kind = "limited";
          else if (result.value && typeof result.value === "object" && "kind" in result.value) {
            if (result.value.kind === "limited") kind = "limited";
            else if (result.value.kind === "position" && "position" in result.value && result.value.position
              && typeof result.value.position === "object" && "seq" in result.value.position && typeof result.value.position.seq === "number") {
              kind = "position"; seq = result.value.position.seq;
            }
          }
          if (kind) {
            if (observed.length === 8) observed.shift();
            observed.push({ kind, seq, reserve: { ...reserve }, before, after: this.admitted() });
          }
        }
        return result;
      }
    }(), canSpend = budget.canSpend.bind(budget);
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
  for (const [index, budget] of budgets.entries()) {
    const spent = budget.admitted(), through = index === 0 ? first.through.seq : second.confirmed!.through.seq;
    for (const key of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const) expect(spent[key]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]);
    expect(spent.entries).toBeGreaterThan(2);
    expect(lookaheads[index]!.some(read => read.after.inputWork > read.before.inputWork
      && (read.kind === "limited" || read.seq !== null && read.seq > through)), JSON.stringify({ through, lookaheads: lookaheads[index] })).toBe(true);
  }
  expect(await lane.head()).toEqual(head); expect(host.closureReads).toBe(0);
  expect(diagnostics).toHaveLength(2);
  for (const diagnostic of diagnostics) expect(diagnostic).toMatchObject({ state: "confirmed", capacityRefusal: null });
  // Exercise the production strategy selector with genuine Native entries
  // and published frontier, but explicit TEST target/source/provider ports.
  // A fresh capacity wake must not retry adaptive scouting in that budget.
  const sourceOrder: string[] = [], fixedBudgets: ArchiveBudget[] = [];
  let withdraw = false, hardWithdraw = false;
  const productionPass = (shortage = false, metadata?: number, observe = false) => lane.inside(state => {
    const budget = observe ? undefined : new ArchiveBudget(shortage ? { entries: 0 } : metadata === undefined ? {} : { metadata });
    if (budget) fixedBudgets.push(budget);
    return new ArchiveDriver({ production: "room-binding", sql: archiveSql(state),
      current: () => ({ at: lane.at, head }), clock: () => lane.c.clock.now, bounds: PROPOSED_BOUNDS,
      policies: { registry: archiveAuthorityPolicies(lane, archivePolicies) }, admit: () => true,
      provider: host, ...(budget ? { budget: () => budget } : {}),
      target: { resolve: async () => { sourceOrder.push("target"); return archiveRepository; } },
      sources: async (_after, _through, actualBudget, exact) => {
        if (budget) expect(actualBudget).toBe(budget); else fixedBudgets.push(actualBudget);
        expect(exact).toBe(false); sourceOrder.push("sources");
        return { pins: archiveAuthorityBasis(lane)!.pins, prepare: async (seq, sameBudget) => {
          expect(sameBudget).toBe(actualBudget); sourceOrder.push(`prepare:${seq}`);
          if (hardWithdraw) throw new ArchivePrefixStopped("foreign-source-unavailable");
          if (withdraw) actualBudget.stop("unavailable");
        } };
      },
    }).run();
  });
  const published = second.confirmed!;
  expect(published).toMatchObject({ layout: 2, anchorsPublished: true });
  expect(await productionPass(true)).toMatchObject({ state: "retry", reason: "limit" });
  const capacityWake = await lane.inside(state => JSON.parse(state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'archive-wake-1'").one().v));
  expect(capacityWake.capacityDeferrals).toBe(1);
  expect((await row(lane))!.confirmed).toEqual(published); expect((await row(lane))!.pending).toBeNull();
  const sendsBefore = host.sends.length, mintsBefore = host.mintCalls;
  // A lower per-turn metadata allowance must reach the complete fixed
  // quote, not exhaust a discovery debit. If 512 KiB cannot reach that
  // boundary this fixture fails visibly; no affordability result is faked.
  lane.c.clock.now = capacityWake.next; sourceOrder.length = 0;
  const constrainedMetadata = 512 * 1024;
  expect(await productionPass(false, constrainedMetadata)).toMatchObject({ state: "retry", reason: "limit" });
  const refusedFixed = diagnostics.at(-1)!;
  expect(refusedFixed.fixedFinish, JSON.stringify(refusedFixed)).not.toBeNull();
  expect(refusedFixed.capacityRefusal, JSON.stringify(refusedFixed)).toMatchObject({
    site: "finish-affordability", kind: "finish-quote", limit: { metadata: constrainedMetadata }, reserved: { metadata: 65_536 },
  });
  expect(refusedFixed.capacityRefusal!.shortfall.metadata).toBeGreaterThan(0);
  expect(refusedFixed.fixedFinish!.metadataMargin).toBe(65_536);
  expect(refusedFixed.capacityRefusal!.used).toEqual(refusedFixed.fixedFinish!.used);
  expect(refusedFixed.capacityRefusal!.requested).toEqual(refusedFixed.fixedFinish!.remaining);
  expect(refusedFixed.cost.metadata).toBeLessThanOrEqual(constrainedMetadata);
  expect(sourceOrder).toEqual(["target", "sources", `prepare:${published.through.seq + 1}`]);
  expect((await row(lane))!.confirmed).toEqual(published); expect((await row(lane))!.pending).toBeNull();
  expect(host.sends).toHaveLength(sendsBefore); expect(host.mintCalls).toBe(mintsBefore);
  const afterQuoteWake = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).wake());
  expect(afterQuoteWake).not.toBeNull();
  // The same confirmed receipt supplies an actual quote for a new trusted
  // test limit. This fresh turn must fit R itself but refuse its 64 KiB
  // margin; the assertions below use its new actual U/R, not the old ones.
  const marginOnlyMetadata = refusedFixed.fixedFinish!.used.metadata + refusedFixed.fixedFinish!.remaining.metadata + 32_768;
  expect(Number.isSafeInteger(marginOnlyMetadata)).toBe(true);
  expect(marginOnlyMetadata).toBeLessThanOrEqual(ARCHIVE_BOUNDS.metadata);
  lane.c.clock.now = afterQuoteWake!; sourceOrder.length = 0;
  expect(await productionPass(false, marginOnlyMetadata)).toMatchObject({ state: "retry", reason: "limit" });
  const refusedMargin = diagnostics.at(-1)!;
  expect(refusedMargin.fixedFinish, JSON.stringify(refusedMargin)).not.toBeNull();
  const marginQuote = refusedMargin.fixedFinish!;
  const actualWithoutMargin = marginQuote.used.metadata + marginQuote.remaining.metadata;
  expect(actualWithoutMargin, JSON.stringify(refusedMargin)).toBeLessThanOrEqual(marginOnlyMetadata);
  expect(actualWithoutMargin + 65_536, JSON.stringify(refusedMargin)).toBeGreaterThan(marginOnlyMetadata);
  expect(marginQuote.metadataMargin).toBe(65_536);
  expect(refusedMargin.capacityRefusal, JSON.stringify(refusedMargin)).toMatchObject({
    site: "finish-affordability", kind: "finish-quote", limit: { metadata: marginOnlyMetadata }, reserved: { metadata: 65_536 },
  });
  expect(refusedMargin.capacityRefusal!.used).toEqual(marginQuote.used);
  expect(refusedMargin.capacityRefusal!.requested).toEqual(marginQuote.remaining);
  expect(refusedMargin.capacityRefusal!.shortfall.metadata).toBeGreaterThan(0);
  expect(refusedMargin.cost.metadata).toBeLessThanOrEqual(marginOnlyMetadata);
  expect(sourceOrder).toEqual(["target", "sources", `prepare:${published.through.seq + 1}`]);
  expect((await row(lane))!.confirmed).toEqual(published); expect((await row(lane))!.pending).toBeNull();
  expect(host.sends).toHaveLength(sendsBefore); expect(host.mintCalls).toBe(mintsBefore);
  const afterMarginWake = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).wake());
  expect(afterMarginWake).not.toBeNull();
  // Each retry gets its own ordinary original allowance; neither earlier
  // constrained budget is raised, reset or reused after its refusal.
  lane.c.clock.now = afterMarginWake!; withdraw = true; sourceOrder.length = 0;
  expect(await productionPass()).toMatchObject({ state: "retry", reason: "unavailable" });
  expect(sourceOrder).toEqual(["target", "sources", `prepare:${published.through.seq + 1}`]);
  expect((await row(lane))!.confirmed).toEqual(published); expect((await row(lane))!.pending).toBeNull();
  expect(host.sends).toHaveLength(sendsBefore); expect(host.mintCalls).toBe(mintsBefore);
  const retryAt = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).wake());
  expect(retryAt).not.toBeNull(); lane.c.clock.now = retryAt!;
  withdraw = false; sourceOrder.length = 0;
  expect(await productionPass(false, undefined, true)).toMatchObject({ state: "confirmed" });
  expect(sourceOrder).toEqual(["target", "sources", `prepare:${published.through.seq + 1}`]);
  const fixedReceipt = (await row(lane))!;
  expect(fixedReceipt.confirmed!.through.seq).toBe(published.through.seq + 1);
  expect(fixedReceipt.confirmed!.through.seq).toBeLessThan(head.seq);
  expect(fixedReceipt).toMatchObject({ pending: null, stopped: null });
  expect(host.sends).toHaveLength(sendsBefore + 1);
  const finished = diagnostics.at(-1)!;
  expect(finished).toMatchObject({ state: "confirmed", capacityRefusal: null });
  expect(finished.fixedFinish, JSON.stringify(finished)).not.toBeNull();
  const fixedQuote = finished.fixedFinish!;
  // The default production budget emits the already-computed native quote.
  // TEST host/source ports remain; numeric capture is no admission authority.
  const capture = finished.capacityObservation!;
  expect(capture.ledgerReconciled).toBe(true);
  expect(capture.admitted).toEqual(finished.cost);
  expect(capture.firstQuote?.throughSeq).toBe(published.through.seq + 1);
  expect(capture.firstQuote?.throughHash).toBe(fixedReceipt.confirmed!.through.hash);
  expect(capture.firstQuote?.costs?.total).toEqual(fixedQuote.remaining);
  expect(capture.firstQuote?.admitted).toEqual(fixedQuote.used);
  expect(capture.firstFinishAttribution?.admitted).toEqual(fixedQuote.used);
  expect(capture.firstFinishAttribution?.complete, JSON.stringify(capture.firstFinishAttribution)).toBe(true);
  expect(capture.selectedQuote?.throughSeq).toBe(fixedReceipt.confirmed!.through.seq);
  expect(capture.selectedQuote?.throughHash).toBe(fixedReceipt.confirmed!.through.hash);
  expect(capture.rowContext?.snapshotConsumed).toBe(true);
  expect(capture.finishGeometryComplete, JSON.stringify(capture.firstQuote)).toBe(true);
  const captureText = JSON.stringify(capture);
  for (const secret of ["TEST ARCHIVE TOKEN", ...Object.values(archiveRepository)]) expect(captureText).not.toContain(secret);
  // Every string leaf must be the fixed qualification/availability label or
  // an explicitly named immutable head hash. A single byte of content fails.
  const privateFree = (value: unknown, key = ""): boolean => {
    if (value === null || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0;
    if (typeof value === "string") return key === "throughHash" ? /^sha256:[0-9a-f]{64}$/.test(value)
      : key === "qualification" ? value === "Numeric diagnostic only; observer overhead can affect the original timeout. No source, body or admission authority."
      : key === "debitAttribution" && ["observed", "unavailable"].includes(value);
    if (Array.isArray(value)) return value.every(item => privateFree(item));
    return typeof value === "object" && Object.entries(value).every(([field, item]) => privateFree(item, field));
  };
  expect(privateFree(capture)).toBe(true);
  expect(privateFree({ ...capture, content: "x" })).toBe(false);
  (context.task.meta as Record<string, unknown>)["capacityCaptureBytes"] = new TextEncoder().encode(captureText).length;
  expect(fixedQuote.metadataMargin).toBe(65_536);
  for (const key of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const) {
    expect(finished.cost[key], JSON.stringify({ key, finished })).toBeLessThanOrEqual(fixedQuote.used[key] + fixedQuote.remaining[key]);
  }
  expect(ARCHIVE_BOUNDS.metadata - finished.cost.metadata, JSON.stringify(finished)).toBeGreaterThanOrEqual(fixedQuote.metadataMargin);
  expect(await lane.head()).toEqual(head);
  for (const budget of fixedBudgets) {
    const cost = budget.admitted();
    for (const key of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const) expect(cost[key]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]);
  }
  // Put the irreversible hard-source refusal last: no test resets a stop
  // or invents a second Native fixture with a conflicting clock owner.
  expect(await productionPass(true)).toMatchObject({ state: "retry", reason: "limit" });
  const hardWake = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).wake());
  expect(hardWake).not.toBeNull(); lane.c.clock.now = hardWake!;
  const hardMints = host.mintCalls, hardSends = host.sends.length;
  hardWithdraw = true; sourceOrder.length = 0;
  expect(await productionPass()).toMatchObject({ state: "stopped", reason: "foreign-source-unavailable", next: null });
  expect(sourceOrder).toEqual(["target", "sources", `prepare:${fixedReceipt.confirmed!.through.seq + 1}`]);
  const hardDiagnostic = diagnostics.at(-1)!;
  expect(hardDiagnostic.fixedFinish).toBeNull(); expect(hardDiagnostic.capacityRefusal).toBeNull();
  expect((await row(lane))!).toMatchObject({ confirmed: fixedReceipt.confirmed, pending: null, stopped: { reason: "foreign-source-unavailable" } });
  expect(host.mintCalls).toBe(hardMints); expect(host.sends).toHaveLength(hardSends);
  expect(await lane.head()).toEqual(head);
  (context.task.meta as Record<string, unknown>)["adaptiveNative"] = { cap: maximum, first: first.through.seq, second: second.confirmed!.through.seq,
    costs: budgets.map(budget => budget.admitted()), quotes, lookaheads, appendCalls: host.appendCalls,
    fixed: { refusedFixed, refusedMargin, marginOnlyMetadata, finished, hardDiagnostic, sourceOrder, costs: fixedBudgets.map(budget => budget.admitted()), through: fixedReceipt.confirmed!.through },
    qualification: "Actual Native checkpoint entries, adaptive scouting, fresh inventory, writer, driver copies, production incremental-send code including validator/copy/pack and Native row confirmation; HTTP/host/token/policies remain TEST stand-ins. Original production caps including 64 MiB input; bounded synchronous observations require charged discarded lookahead under a positive finish reserve. Two original adaptive passes plus genuine capacity wakes, a constrained complete-quote refusal, a margin-only refusal, an unavailable source retry, one fixed-next confirmation and a final preserved hard-source refusal; no cadence/10000-one-entry claim." };
});

test("adaptive Native selection finishes a covered earlier prefix before an uncovered later class", async () => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedHost("sha1");
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
  const lane = await alarmFixture(host, undefined, true);
  expect(await lane.alarm()).toBe(true);
  const initial = (await row(lane))!, marked = initial.pending!;
  expect(marked).not.toBeNull(); expect(host.data.size).toBe(0); expect(host.sends).toEqual([]);
  await lane.restart(); lane.c.clock.now = initial.next!;
  const offered = await lane.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  const assigned = await lane.did(rita, "assign", { on: offered.fact.seq, expected: { on: 1 }, fields: { performer: una.member } });
  const rule = (await lane.entries(assigned.fact.seq))[0]?.prepared.find(prepared => prepared.rule === "not-self");
  expect(rule).toBeDefined();
  if (!rule) expect.fail("the later genuine native assign must retain its rule input");
  expect(await lane.inside(state => state.storage.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM retained_input WHERE kind = 'rule' AND digest = ?", rule.input).one().n)).toBe(1);
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
  // Explicit caller words from the actual Directory create entry and an
  // independent Membership read. No anchor comes from archive output.
  const anchors = archiveAuthorityAnchors(lane); expect(anchors.length).toBeGreaterThan(0);
  const verified = await verifyArchive(source, { mode: "replay", scope: lane.at.scope, head: later, grants: "as-recorded",
    anchors: anchors.map(fact => ({ scope: fact.at.scope, seq: fact.seq, hash: fact.hash })) });
  const reason = (verified.kind === "verification" ? verified.verification.why : verified.reason) ?? "";
  const diagnostic = { kind: verified.kind, reason: reason.slice(0, 2048), reasonTruncated: reason.length > 2048,
    ...(verified.kind === "verification" ? { result: verified.verification.report.result, at: verified.verification.report.at,
      target: verified.verification.report.target, coverage: verified.verification.report.coverage.slice(0, 4),
      coverageCount: verified.verification.report.coverage.length, anchorCount: verified.verification.report.anchors.length,
      missingCount: verified.verification.report.dependencies.missing.length }
      : { result: verified.result, scope: verified.location.scope, commit: verified.location.commit }) };
  expect(verified, JSON.stringify(diagnostic)).toMatchObject({ kind: "verification", verification: { report: { result: "consistent", anchors, trusts: expect.arrayContaining([TRUSTS.anchors, TRUSTS.observed]) } } });
  fixtureArchiveWiring.delete(lane.name);
});

test("stops on an unexpected ref without overwriting it", async () => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedHost("sha1"); host.pointer = "f".repeat(40);
  const before = await lane.head(), result = await lane.inside(state => driver(lane, state, host).run());
  expect(result).toMatchObject({ state: "stopped", reason: "conflict" }); expect(host.pointer).toBe("f".repeat(40)); expect(host.sends).toEqual([]);
  expect((await row(lane))?.stopped?.reason).toBe("conflict"); expect(await lane.head()).toEqual(before);
});

// Invariant: pending host I/O and duplicate pass requests never hold a
// native turn; only the original pass sends, and later entries stay queued.
test("coalesces one host pass while a flood of native turns completes", async () => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedHost("sha1"); host.blocked = gate();
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
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedHost("sha1"); host.blocked = gate(); let elapsed = 0;
  const running = lane.inside(state => driver(lane, state, host, () => new ArchiveBudget({}, () => elapsed, 1000)).run());
  await host.started.promise; elapsed = 1000; host.blocked.release();
  expect(await running).toMatchObject({ state: "retry", reason: "timeout" }); expect(host.sends).toEqual([]); expect(host.lastAllowed!()).toBe(false);
  const pending = await row(lane); expect(pending?.pending).not.toBeNull(); expect(pending?.confirmed).toBeNull();
  expect(canonicalize(pending)).not.toContain("TEST ARCHIVE TOKEN");
});

test("the native driver confirms a pending v1 attempt before a separate same-cutoff conversion and new v2 pass", async () => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedHost("sha1"), head = await lane.head();
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

// Installed deployment setting is a TEST stand-in for CF deployment authority.
// The receipt/frontier and follow-up alarm below are actual Native archive work.
test("a deployment restart is consumed after the diagnostic on ordinary ingress and preserves the confirmed frontier", async () => {
  const host = new ScriptedHost("sha1"), lane = await alarmFixture(host, undefined, true);
  expect(await lane.alarm()).toBe(true);
  const confirmed = (await row(lane))!;
  expect(confirmed.confirmed?.layout).toBe(2); expect(confirmed.pending).toBeNull();
  await lane.did(rita,"remark",{ on:0,fields:{ text:"waiting after the historical fixture stop" } });
  await lane.inside(state => new ArchiveRows(archiveSql(state),lane.at).stop("limit"));
  const stopped = (await row(lane))!, head = await lane.head();
  const frontier = await lane.inside(state => state.storage.sql.exec("SELECT k,v FROM meta WHERE k IN ('archive-frontier-confirmed-1','archive-frontier-pending-1') ORDER BY k").toArray());
  expect(frontier.some(value => value["k"] === "archive-frontier-confirmed-1")).toBe(true);
  const payload = { v:1 as const,at:lane.at,repository:stopped.repository,format:stopped.format,confirmed:stopped.confirmed!,rowDigest:digestBytes(utf8(canonicalize(stopped))),generation:0,expires:timeOf(Date.parse(lane.c.clock.now)+600_000) };
  fixtureArchiveRestart.set(lane.name,canonicalize({ ...payload,command:digestBytes(utf8(canonicalize(payload))) }));
  onTestFinished(() => { fixtureArchiveRestart.delete(lane.name); });
  const diagnostics: Record<string,unknown>[] = [];
  const log = vi.spyOn(console,"info").mockImplementation((...args: unknown[]) => {
    const [label,value] = args;
    if (label === "archive-row-diagnostic-v1" && typeof value === "object" && value !== null) diagnostics.push(value as Record<string,unknown>);
  });
  onTestFinished(() => log.mockRestore());
  await lane.restart();
  const calls = { targets:host.targets,mints:host.mintCalls,sends:host.sends.length,closures:host.closureReads,reads:host.objectReads.length };
  await (lane.object as unknown as { nativeBirth(at:unknown,milliseconds:number):Promise<unknown> }).nativeBirth(lane.at,10_000);
  await lane.inside((_state,instance) => (instance as { awaitScheduledCallbacks():Promise<unknown> }).awaitScheduledCallbacks());
  const restarted = (await row(lane))!;
  expect(diagnostics.some(value => value["rowDigest"] === payload.rowDigest && value["restartGeneration"] === 0 && value["phase"] === "stopped")).toBe(true);
  expect(restarted).toEqual({ ...stopped,stopped:null });
  expect(restarted.confirmed).toEqual(confirmed.confirmed); expect(restarted.next).toBeNull(); expect(restarted.pending).toBeNull();
  expect(await lane.inside(state => state.storage.sql.exec("SELECT k,v FROM meta WHERE k IN ('archive-frontier-confirmed-1','archive-frontier-pending-1') ORDER BY k").toArray())).toEqual(frontier);
  expect(await lane.head()).toEqual(head);
  expect({ targets:host.targets,mints:host.mintCalls,sends:host.sends.length,closures:host.closureReads,reads:host.objectReads.length }).toEqual(calls);
  expect((await lane.inside(state => new ArchiveRows(archiveSql(state),lane.at).restartReceipt())).generation).toBe(1);
  const next = await lane.alarmAt(); expect(next).not.toBeNull();
  // Latest directive replay is read-only, including after a later foreign-source stop.
  await lane.inside(state => new ArchiveRows(archiveSql(state),lane.at).stop("foreign-source-unavailable"));
  await lane.restart();
  await (lane.object as unknown as { nativeBirth(at:unknown,milliseconds:number):Promise<unknown> }).nativeBirth(lane.at,10_000);
  await lane.inside((_state,instance) => (instance as { awaitScheduledCallbacks():Promise<unknown> }).awaitScheduledCallbacks());
  expect((await row(lane))!.stopped?.reason).toBe("foreign-source-unavailable");
  // A fresh diagnostic-bound operator generation is required to retry again.
  const again = (await row(lane))!, payload2 = { ...payload,generation:1,rowDigest:digestBytes(utf8(canonicalize(again))) };
  fixtureArchiveRestart.set(lane.name,canonicalize({ ...payload2,command:digestBytes(utf8(canonicalize(payload2))) }));
  await lane.restart();
  await (lane.object as unknown as { nativeBirth(at:unknown,milliseconds:number):Promise<unknown> }).nativeBirth(lane.at,10_000);
  await lane.inside((_state,instance) => (instance as { awaitScheduledCallbacks():Promise<unknown> }).awaitScheduledCallbacks());
  const archiveWake = await lane.inside(state => new ArchiveRows(archiveSql(state),lane.at).wake());
  expect(archiveWake).not.toBeNull();
  expect(Date.parse(archiveWake!)).toBeGreaterThan(Date.parse(lane.c.clock.now));
  const platformAlarm = await lane.alarmAt();
  expect(platformAlarm).not.toBeNull();
  expect(platformAlarm!).toBeLessThanOrEqual(Date.parse(archiveWake!));
  // Other native owners can have an earlier platform alarm. Dispatch this
  // archive pass when its own persisted retry is due.
  lane.c.clock.now = archiveWake!;
  expect(await lane.alarm()).toBe(true);
  expect((await row(lane))!.confirmed?.through).toEqual(head);
},20_000);
