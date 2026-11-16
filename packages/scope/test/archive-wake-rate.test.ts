/** AR-1: an idle room with the archive wired wakes a bounded number of times
 * an hour. The native object, its alarms, SQLite and eviction are real; the
 * archive factory goes through the production `archive` wiring seam. The
 * policy, target and provider ports are TEST stand-ins. They count the calls
 * that a production pass makes to the shared Directory scope. */
import { expect, onTestFinished, test } from "vitest";
import { timeOf } from "@generalbusiness/dap-bytes";
import { ArchivePolicyPending } from "../src/archive-budget.ts";
import { ARCHIVE_RETRY_FLOOR_SECONDS } from "../src/archive-driver.ts";
import { ScriptedHost } from "./support/archive-driver.ts";
import { rita } from "./fixtures-native.ts";
import { archiveAuthorityPolicies, createNativeArchiveLane } from "./support/archive-native-authority.ts";
import { archiveDefinition, archivePolicies } from "./support/archive.ts";
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

test.each(["policy-pending", "target-missing"] as const)("an idle room whose archive stays %s wakes at most 6 times in an hour", async kind => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedHost("sha1");
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
  for (let at = await lane.alarmAt(); at !== null && at < start + HOUR_MS && passes.length <= RUNAWAY; at = await lane.alarmAt()) {
    const now = Math.max(at, Date.parse(lane.c.clock.now));
    lane.c.clock.now = timeOf(now);
    // Eviction between wakes: only stored state carries the backoff.
    await lane.restart();
    expect(await lane.alarm()).toBe(true);
    passes.push(now - start);
    lane.c.clock.now = timeOf(now + PASS_MS);
  }
  const gaps = passes.slice(1).map((at, index) => (at - passes[index]!) / 1000);
  expect(gaps, "each retry without progress doubles from the floor").toEqual([1, 2, 4, 8, 16].map(factor => factor * ARCHIVE_RETRY_FLOOR_SECONDS));
  expect(passes.length).toBeLessThanOrEqual(CEILING);
  expect(directoryCalls).toBe(passes.length);
  expect(host.mintCalls).toBe(0); expect(host.sends).toEqual([]);
}, 30_000);
