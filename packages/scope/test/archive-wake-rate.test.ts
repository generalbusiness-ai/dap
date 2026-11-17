/** AR-1: an idle room with the archive wired wakes a bounded number of times
 * an hour. The native object, its alarms, SQLite and eviction are real; the
 * archive factory goes through the production `archive` wiring seam. The
 * policy, target and provider ports are TEST stand-ins. They count the calls
 * that a production pass makes to the shared Directory scope. */
import { expect, onTestFinished, test } from "vitest";
import { canonicalize, parseStrict, timeOf } from "@generalbusiness/dap-bytes";
import { ArchivePolicyPending } from "../src/archive-budget.ts";
import { ARCHIVE_RETRY_FLOOR_SECONDS, ARCHIVE_UNBOUND_RECHECK_SECONDS } from "../src/archive-driver.ts";
import { ScriptedHost } from "./support/archive-driver.ts";
import { rita } from "./fixtures-native.ts";
import { archiveAuthorityPolicies, createNativeArchiveApplicationLane } from "./support/archive-native-authority.ts";
import { archivePolicies } from "./support/archive.ts";
import { roomArchiveWiring } from "./worker.ts";

const HOUR_MS = 3_600_000;
/** Each pass takes this long in the simulated hour. */
const PASS_MS = 250;
/** The ceiling the AR-1 note states: delays of 60, 120, 240, 480 and 960 s
 * after the first pass put at most 6 passes in the first hour. Before AR-1, a
 * pending policy re-ran at once and a missing target re-ran every second. */
const CEILING = 6;
/** Stop a loop that does not back off, so the failure names the count. */
const RUNAWAY = 100;
/** In `other-alarms` mode, another owner's alarm fires this often. */
const OTHER_MS = 30_000;

// `old`: the room carries the wake that the code before AR-1 left, a
// deferred one-second retry already in the past with no retry count, as on
// the live rooms when the archive comes back on.
// `mode`: `evicted` restarts the object before every wake, so only stored
// state carries the backoff. `resident` keeps the object in memory, so the
// in-memory fallback takes part. `other-alarms` also keeps it in memory and
// fires an alarm every 30 s between archive wakes, as outside effects,
// dispatch retries and signer maintenance do. Every scope alarm runs the
// archive, so each of those passes is one that is not due.
const kinds = ["policy-pending", "target-missing"] as const, modes = ["evicted", "resident", "other-alarms"] as const;
const cases = kinds.flatMap(kind => modes.flatMap(mode => [false, true].map(old => ({ kind, mode, old }))));
test.each(cases)("an idle room whose archive stays $kind ($mode, old wake: $old) wakes at most 6 times in an hour", async ({ kind, mode, old }) => {
  // A platform lane: its object honours the production `archive` wiring.
  const lane = await createNativeArchiveApplicationLane(), host = new ScriptedHost("sha1");
  let directoryCalls = 0;
  roomArchiveWiring.set(lane.name, () => ({ production: "room-binding", provider: host,
    policies: { registry: archiveAuthorityPolicies(lane, archivePolicies) }, admit: () => true,
    ...(kind === "policy-pending" ? { preparePolicies: async () => { directoryCalls++; throw new ArchivePolicyPending(); } } : {}),
    target: { resolve: async () => { directoryCalls++; return null; } } }));
  onTestFinished(() => { roomArchiveWiring.delete(lane.name); });
  await lane.restart();
  // One member act stores a wake at its commit time. Then the room is idle.
  await lane.did(rita, "remark", { on: 0, fields: { text: "one act, then the room is idle" } });
  const start = Date.parse(lane.c.clock.now), passes: number[] = [];
  let notDue = 0, last = start;
  if (old) await lane.inside(async state => {
    state.storage.sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", "archive-wake-1",
      canonicalize({ pending: true, stopped: false, next: timeOf(start - 1000) }));
    await state.storage.setAlarm(start - 1000);
  });
  for (let at = await lane.alarmAt(); at !== null && at < start + HOUR_MS && passes.length <= RUNAWAY; at = await lane.alarmAt()) {
    const due = Math.max(at, Date.parse(lane.c.clock.now));
    if (mode === "other-alarms" && last + OTHER_MS < due) {
      // Another owner's alarm before the archive is due: no port call, and
      // the archive's wake stays where it was.
      last += OTHER_MS; lane.c.clock.now = timeOf(last);
      const calls = directoryCalls;
      expect(await lane.alarm()).toBe(true);
      expect(directoryCalls, "a pass that is not due calls no policy or target port").toBe(calls);
      expect(await lane.alarmAt(), "a pass that is not due keeps the stored wake").toBe(at);
      notDue++; continue;
    }
    lane.c.clock.now = timeOf(due);
    if (mode === "evicted") await lane.restart();
    expect(await lane.alarm()).toBe(true);
    passes.push(due - start);
    last = due + PASS_MS; lane.c.clock.now = timeOf(last);
  }
  const gaps = passes.slice(1).map((at, index) => (at - passes[index]!) / 1000);
  expect(gaps, "each retry without progress doubles from the floor").toEqual([1, 2, 4, 8, 16].map(factor => factor * ARCHIVE_RETRY_FLOOR_SECONDS));
  expect(passes.length).toBeLessThanOrEqual(CEILING);
  expect(directoryCalls).toBe(passes.length);
  if (mode === "other-alarms") expect(notDue, "other alarms fell between the archive wakes").toBeGreaterThan(50);
  expect(host.mintCalls).toBe(0); expect(host.sends).toEqual([]);
}, 60_000);

/** AR-4: a lane whose Directory names no archive destination. The room keeps
 * committing every minute, as Room A's simulator does. */
test("an unbound lane that commits every minute makes one pass a day, and an unreadable target after it keeps the AR-1 backoff", async () => {
  const lane = await createNativeArchiveApplicationLane(), host = new ScriptedHost("sha1");
  let directoryCalls = 0, answer: "unbound" | null = "unbound";
  roomArchiveWiring.set(lane.name, () => ({ production: "room-binding", provider: host,
    policies: { registry: archiveAuthorityPolicies(lane, archivePolicies) }, admit: () => true,
    target: { resolve: async () => { directoryCalls++; return answer; } } }));
  onTestFinished(() => { roomArchiveWiring.delete(lane.name); });
  await lane.restart();
  await lane.did(rita, "remark", { on: 0, fields: { text: "the first act wakes the archive" } });
  const start = Date.parse(lane.c.clock.now);
  const wake = () => lane.inside(state => parseStrict(state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'archive-wake-1'").one().v) as Record<string, unknown>);
  // The first pass gets the definite answer and stores the member marker.
  lane.c.clock.now = timeOf(Math.max(start, (await lane.alarmAt()) ?? start));
  expect(await lane.alarm()).toBe(true);
  expect(directoryCalls).toBe(1);
  const marked = await wake();
  expect(marked).toEqual({ pending: false, stopped: false, next: expect.any(String), unbound: "member" });
  const recheck = Date.parse(marked["next"] as string);
  expect(recheck - Date.parse(lane.c.clock.now), "the recheck waits one day").toBe(ARCHIVE_UNBOUND_RECHECK_SECONDS * 1000);
  // An hour of commits, one a minute, each followed by the scope's alarm.
  for (let minute = 1; minute <= 60; minute++) {
    lane.c.clock.now = timeOf(start + minute * 60_000);
    await lane.did(rita, "remark", { on: 0, fields: { text: `minute ${minute}` } });
    expect(await lane.alarm()).toBe(true);
  }
  expect(directoryCalls, "no commit wakes an unbound member").toBe(1);
  expect(await wake(), "commits leave the marker and its recheck").toEqual(marked);
  expect(await lane.alarmAt()).toBe(recheck);
  // The daily recheck: still unbound, so one more pass and one more day.
  lane.c.clock.now = timeOf(recheck); await lane.restart();
  expect(await lane.alarm()).toBe(true);
  expect(directoryCalls).toBe(2);
  expect(await wake()).toEqual({ pending: false, stopped: false, next: timeOf(recheck + ARCHIVE_UNBOUND_RECHECK_SECONDS * 1000), unbound: "member" });
  // The next recheck cannot read the target: a transient failure keeps the
  // AR-1 backoff from the floor, and drops the marker.
  answer = null;
  lane.c.clock.now = timeOf(recheck + ARCHIVE_UNBOUND_RECHECK_SECONDS * 1000);
  expect(await lane.alarm()).toBe(true);
  expect(directoryCalls).toBe(3);
  expect(await wake()).toEqual({ pending: true, stopped: false, next: timeOf(Date.parse(lane.c.clock.now) + ARCHIVE_RETRY_FLOOR_SECONDS * 1000), retries: 1 });
  expect(host.mintCalls).toBe(0); expect(host.sends).toEqual([]);
}, 60_000);
