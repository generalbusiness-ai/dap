/** Archive fixture authority uses genuine Native Membership8 observations.
 * Its seat/key/role and source-birth preparation are external fixture setup;
 * each pass still pays its existing pin lookups and original complete ledger.
 * Inline Lane policy, clock and host/token/repository remain TEST fixtures. */
/** Real native SQLite/turns/eviction; the host, credentials and fixture
 * admission/authority are explicit stand-ins. Actual adapter enforcement
 * and alarm wiring have separate obligations. No external provider runs. */
import { expect, onTestFinished, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, timeOf } from "@generalbusiness/artroom-bytes";
import { journalRef } from "@generalbusiness/artroom-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/artroom-git/journal-reader";
import { archiveSource, verifyArchive, TRUSTS } from "@generalbusiness/artroom-replay";
import { ARCHIVE_BOUNDS, ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { driver, ScriptedHost } from "./support/archive-driver.ts";
import type { ArchivePolicyRegistry } from "../src/archive-inventory.ts";
import { archiveHostGate as gate } from "./support/archive-provider.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { planArchive } from "../src/archive-build.ts";
import { at, rita, una, type Lane } from "./fixtures-native.ts";
import { createNativeArchiveLane, createNativeArchiveApplicationLane, archiveAuthorityBasis, archiveAuthorityPolicies, archiveAuthorityAnchors } from "./support/archive-native-authority.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { fixtureArchiveWiring } from "./worker.ts";
import type { TestScope } from "./worker.ts";

const row = (lane: Lane) => lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());
async function alarmFixture(host: ScriptedHost, resolve = async () => { host.targets++; return archiveRepository; }, factory = false) {
  const lane = factory ? await createNativeArchiveApplicationLane() : await createNativeArchiveLane({}, {}, archiveDefinition);
  fixtureArchiveWiring.set(lane.name, { policies: { fixture: "archive-policies", registry: archiveAuthorityPolicies(lane, archivePolicies) }, fixtureSources: archiveAuthorityBasis(lane)!.pins, target: { fixture: "archive-target", resolve }, provider: host });
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
    await lane.restart();
    await lane.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
    expect(await lane.inside(state => state.storage.getAlarm())).toBe(next);
    expect(await lane.alarm()).toBe(true); expect(host.targets).toBe(1); expect(host.mintCalls).toBe(0);
    ready = true; lane.c.clock.now = timeOf(next!); await lane.restart();
    expect(await lane.alarm()).toBe(true); expect(host.sends).toHaveLength(1); expect(host.targets).toBe(2);
    expect((await row(lane))?.confirmed?.through.seq).toBeGreaterThan(before.seq);
    fixtureArchiveWiring.delete(lane.name);

    const records = observed.map(args => {
      expect(args).toHaveLength(2);
      const record = args[1] as Record<string, unknown>;
      expect(Object.keys(record).sort()).toEqual(["step", "detail", "rowPhaseAtLoad", "confirmed", "pending", "attemptsAtLoad", "hasNext", "attempted", "state", "reason", "caught", "cost", "parentRead"].sort());
      // This stand-in provider has no exact-object transport. It must not
      // invent a parent-read phase from a target failure or native work.
      expect(record["parentRead"]).toEqual({ ordinal: 0, type: "none", maximum: 0, phase: "none", refusal: "none" });
      expect(["row-load", "pin", "due-check", "target", "format", "pending-readback", "parent", "sources", "rebuild", "plan", "mark", "copy", "mint", "send", "readback", "confirm"]).toContain(record["step"]);
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
    expect(host.sends).toHaveLength(1); expect(host.mintCalls).toBe(1); expect(host.targets).toBe(2);
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

// Invariant: earlier whole entries can complete after actual lookahead has
// spent work, including the real incremental-send code and Native receipt.
test("adaptive Native passes reserve writing, incremental sending and confirmation before more lookahead", async context => {
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
  (context.task.meta as Record<string, unknown>)["adaptiveNative"] = { cap: maximum, first: first.through.seq, second: second.confirmed!.through.seq,
    costs: budgets.map(budget => budget.admitted()), quotes, lookaheads, appendCalls: host.appendCalls,
    qualification: "Actual Native checkpoint entries, adaptive scouting, fresh inventory, writer, driver copies, production incremental-send code including validator/copy/pack and Native row confirmation; HTTP/host/token/policies remain TEST stand-ins. Original production caps including 64 MiB input; bounded synchronous observations require charged discarded lookahead under a positive finish reserve. Two passes only; no cadence/10000-one-entry claim." };
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
