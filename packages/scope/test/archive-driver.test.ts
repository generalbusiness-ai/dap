/** Real native SQLite/turns/eviction; the host, credentials and fixture
 * admission/authority are explicit stand-ins. Actual adapter enforcement
 * and alarm wiring have separate obligations. No external provider runs. */
import { expect, onTestFinished, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, timeMs, timeOf } from "@generalbusiness/artroom-bytes";
import { journalRef, type JournalFormat, type JournalObject } from "@generalbusiness/artroom-git/journal";
import { readJournalArchive } from "@generalbusiness/artroom-git/journal-reader";
import { archiveSource, verifyArchive } from "@generalbusiness/artroom-replay";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { ArchiveDriver, type ArchiveCredential, type FixtureArchiveProvider, type ArchiveSend } from "../src/archive-driver.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { at, create, rita, una, type Lane } from "./fixtures-native.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { fixtureArchiveWiring } from "./worker.ts";

function gate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
class ScriptedHost implements FixtureArchiveProvider {
  readonly fixture = "archive-provider";
  readonly data = new Map<string, JournalObject>();
  readonly sends: string[] = [];
  readonly tokens = new WeakMap<ArchiveCredential, ScopeRef>();
  readonly started = gate();
  formatName: JournalFormat;
  pointer: string | null = null;
  missingMint = false;
  loseReply = false;
  mintCalls = 0;
  targets = 0;
  revoked = 0;
  blocked: ReturnType<typeof gate> | null = null;
  lastAllowed: (() => boolean) | null = null;
  constructor(format: JournalFormat) { this.formatName = format; }
  async format() { return this.formatName; }
  async ref() { return this.pointer; }
  async objects() { return [...this.data.values()]; }
  async mintArchive(_repository: unknown, at: ScopeRef, allowed: () => boolean) {
    expect(allowed()).toBe(true); this.mintCalls++;
    if (this.missingMint) { this.missingMint = false; return null; }
    const credential = Object.freeze({ id: `fixture-${this.mintCalls}`, ends: timeOf(timeMs(atTime)! + 3_600_000), plaintext: "TEST ARCHIVE TOKEN" });
    this.tokens.set(credential, { ...at }); return credential;
  }
  async sendArchive(request: ArchiveSend) {
    this.lastAllowed = request.allowed; this.started.release();
    await this.blocked?.promise;
    if (!request.allowed()) return null;
    // A stand-in's guard is not evidence of the actual provider adapter.
    expect(request.ref).toBe(journalRef(request.at.scope));
    expect(this.tokens.get(request.credential)).toEqual(request.at);
    if (request.old !== this.pointer) return { send: "refused" };
    for (const object of request.objects) this.data.set(object.id, { ...object, data: new Uint8Array(object.data) });
    this.pointer = request.commit; this.sends.push(request.commit);
    return this.loseReply ? null : { send: "accepted" };
  }
  async revokeArchive(credential: ArchiveCredential) { this.tokens.delete(credential); this.revoked++; }
}
const atTime = at(0);
function driver(lane: Lane, state: DurableObjectState, host: ScriptedHost, budget?: () => ArchiveBudget) {
  return new ArchiveDriver({
    sql: archiveSql(state), current: () => {
      const value = state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'scope'").one();
      const scope = JSON.parse(value.v); return { at: scope.at, head: scope.head };
    }, clock: () => lane.c.clock.now, bounds: PROPOSED_BOUNDS, policies: { fixture: "archive-policies", registry: archivePolicies },
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
  const source = archiveSource({ open: (scope, work) => readJournalArchive({
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
