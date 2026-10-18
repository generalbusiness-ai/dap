/** Real native SQLite/turns/eviction; the host, credentials and fixture
 * admission/authority are explicit stand-ins. Actual adapter enforcement
 * and alarm wiring have separate obligations. No external provider runs. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, timeMs, timeOf } from "@generalbusiness/artroom-bytes";
import { journalRef, type JournalFormat, type JournalObject } from "@generalbusiness/artroom-git/journal";
import { readJournalArchive } from "@generalbusiness/artroom-git/journal-reader";
import { archiveSource, verifyArchive } from "@generalbusiness/artroom-replay";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { ArchiveDriver, type ArchiveCredential, type ArchiveProvider, type ArchiveSend } from "../src/archive-driver.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { at, create, rita, una, type Lane } from "./support.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";

function gate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
class ScriptedHost implements ArchiveProvider {
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
    }, clock: () => lane.c.clock.now, bounds: PROPOSED_BOUNDS, policies: archivePolicies,
    target: async () => { host.targets++; return archiveRepository; }, provider: host, ...(budget ? { budget } : {}),
  });
}
const row = (lane: Lane) => lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());

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
  const lane = await create({}, {}, archiveDefinition), host = new ScriptedHost(format); host.missingMint = true;
  const initial = await lane.inside(state => driver(lane, state, host).run()), marked = (await row(lane))!.pending!;
  expect(initial.state).toBe("retry"); expect(host.data.size).toBe(0); expect(host.sends).toEqual([]);
  await lane.restart(); lane.c.clock.now = initial.next!;
  const offered = await lane.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  await lane.did(rita, "assign", { on: offered.fact.seq, expected: { on: 1 }, fields: { performer: una.member } });
  const later = await lane.head(); await lane.restart();
  const resumed = await lane.inside(state => driver(lane, state, host).run());
  expect(resumed.state).toBe("confirmed"); expect(host.sends).toEqual([marked.commit]);
  expect((await row(lane))?.confirmed?.through).toEqual(marked.through);
  expect((await lane.inside(state => driver(lane, state, host).run())).state).toBe("confirmed");
  expect(host.sends).toHaveLength(2); expect(host.sends[1]).not.toBe(marked.commit); expect(host.targets).toBe(1);
  expect((await row(lane))?.confirmed?.through).toEqual(later); expect(await lane.head()).toEqual(later);
  const source = archiveSource({ open: (scope, work) => readJournalArchive({
    format: async () => format, resolve: async ref => ref === journalRef(lane.at.scope) ? host.pointer : null,
    object: async (id, most) => { const object = host.data.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= most ? object.data : null } : null; },
  }, scope, work) });
  const verified = await verifyArchive(source, { mode: "replay", scope: lane.at.scope, head: later, grants: "as-recorded" });
  expect(verified).toMatchObject({ kind: "verification", verification: { report: { result: "consistent", anchors: [] } } });
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
