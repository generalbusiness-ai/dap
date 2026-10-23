/** Recorded sensor summaries and native threshold judgments. The readings,
 * member grants and root-directory setup are labelled local fixtures. */
import { expect, test } from "vitest";
import type { FactRef, FieldValue } from "@generalbusiness/dap-contract";
import { t } from "@generalbusiness/dap-derive/testing";
import { nativeScenario, on, operator, climate, sensors, devicePermissions, replay, submit, type Ledger } from "./test-support.ts";
import { zoneTestDefinition } from "./definition-corpus-data.ts";

const definition = zoneTestDefinition();
interface Stats { zone: number; min: number; max: number; mean: number; inBand: number }
const normal = (zone: number): Stats => ({ zone, min: 2300, max: 2500, mean: 2400, inBand: 25 });
const hot = (zone: number): Stats => ({ zone, min: 2400, max: 2740, mean: 2650, inBand: 10 });
const make = () => nativeScenario(definition, devicePermissions);
async function commission(ledger: Ledger): Promise<number> {
  expect(await submit(ledger, operator, "commission-zone", { fields: { label: "Zone 2", setpoint: 2400, band: 200 } })).toMatchObject({ result: "write" });
  return ledger.last.seq;
}
async function observe(ledger: Ledger, stats: Stats[], seconds: number, sampleSeconds = seconds): Promise<{ summary: FactRef; sampledAt: string; zones: FieldValue }> {
  ledger.now = t(seconds);
  const zones = stats.map(stat => ({ ...stat })), before = stats.map(stat => structuredClone(ledger.item(stat.zone)));
  expect(await submit(ledger, sensors, "observe", { fields: { sampledAt: t(sampleSeconds), zones } })).toMatchObject({ result: "write" });
  expect(stats.map(stat => ledger.item(stat.zone))).toEqual(before);
  expect(ledger.last.effects).toEqual([]); expect(ledger.last.sends).toEqual([]);
  return { summary: ledger.fact(ledger.last.seq), sampledAt: t(sampleSeconds), zones };
}
async function report(ledger: Ledger, stats: Stats, summary: Awaited<ReturnType<typeof observe>>, override: Record<string, FieldValue> = {}) {
  return submit(ledger, sensors, "report-zone", on(ledger, stats.zone, { ...summary, min: stats.min, max: stats.max, mean: stats.mean, inBand: stats.inBand, ...override }));
}
const wrote = (result: Awaited<ReturnType<typeof report>>): void => { expect(result, JSON.stringify(result)).toMatchObject({ result: "write" }); };

test("observe remains a comment and sensors classify only initial evidence and actual band crossings", async () => {
  const ledger = make(), zone = await commission(ledger);
  expect(ledger.item(zone)).toMatchObject({ state: "unobserved", values: { min: null, max: null } });
  const first = await observe(ledger, [normal(zone)], 0);
  wrote(await report(ledger, normal(zone), first));
  expect(ledger.item(zone)).toMatchObject({ state: "in-band", values: { min: 2300, max: 2500, mean: 2400, inBand: 25, summaryTime: t(0) } });
  const periodic = await observe(ledger, [normal(zone)], 300), head = ledger.head;
  expect(await report(ledger, normal(zone), periodic)).toMatchObject({ result: "refused", reason: "guard-failed", name: "no-band-crossing" });
  expect(ledger.head).toEqual(head);
  const crossing = await observe(ledger, [hot(zone)], 315);
  expect(await report(ledger, hot(zone), crossing)).toMatchObject({ result: "write" });
  expect(ledger.item(zone)).toMatchObject({ state: "out-of-band", values: { max: 2740, inBand: 10, summaryTime: t(315) } });
  expect(await report(ledger, normal(zone), first)).toMatchObject({ result: "refused", reason: "guard-failed", name: "stale-zone-summary" });
  const backdated = await observe(ledger, [normal(zone)], 320, 0);
  expect(await report(ledger, normal(zone), backdated)).toMatchObject({ result: "refused", reason: "guard-failed", name: "stale-zone-summary" });
  const cool = await observe(ledger, [normal(zone)], 600);
  expect(await report(ledger, normal(zone), cool)).toMatchObject({ result: "write" });
  expect(ledger.item(zone).state).toBe("in-band");
  const result = await replay(ledger); expect([result.report.result, result.why]).toEqual(["consistent", null]);
});

test("a real summary from another room cannot classify this room's identically numbered zone", async () => {
  const ledger = make(), zone = await commission(ledger);
  const foreign = nativeScenario(definition, devicePermissions, {}, "other-room"), otherZone = await commission(foreign);
  expect(otherZone).toBe(zone); expect(foreign.at.scope).not.toBe(ledger.at.scope);
  const summary = await observe(foreign, [hot(otherZone)], 0);
  const result = await submit(ledger, sensors, "report-zone", on(ledger, zone, { ...summary, min: 2400, max: 2740, mean: 2650, inBand: 10 }),
    [{ fact: summary.summary, entry: foreign.last, under: definition.name }]);
  expect(result).toMatchObject({ result: "refused", reason: "guard-failed", name: "wrong-summary-room" });
  expect(ledger.item(zone).state).toBe("unobserved"); expect((await replay(ledger)).report.result).toBe("consistent");
});

test("a threshold cannot substitute another summary, time, zone or inconsistent classification", async () => {
  const ledger = make(), zone = await commission(ledger), other = await commission(ledger);
  const first = await observe(ledger, [normal(zone), normal(other)], 0);
  for (const override of [
    { sampledAt: t(1) }, { zones: [{ ...hot(zone) }, { ...normal(other) }] }, { min: 2200 }, { inBand: 24 }, { max: 2200 },
    { zones: [{ ...hot(zone) }, { ...normal(other) }], min: 2400, max: 2740, mean: 2650, inBand: 10 },
  ]) expect(await report(ledger, normal(zone), first, override)).toMatchObject({ result: "refused", reason: "guard-failed" });
  // The summary is a sensor claim, but impossible counts are not enough to
  // classify a zone: extrema themselves account for one or two cells.
  for (const stats of [
    { zone, min: 2700, max: 2800, mean: 2750, inBand: 1 },
    { zone, min: 2400, max: 2700, mean: 2500, inBand: 0 },
    { zone, min: 2100, max: 2700, mean: 2400, inBand: 24 },
  ]) {
    const invalid = await observe(ledger, [stats], 0);
    expect(await report(ledger, stats, invalid)).toMatchObject({ result: "refused", reason: "guard-failed", name: "invalid-zone-evidence" });
  }
  expect(ledger.item(zone).state).toBe("unobserved");
  expect(await submit(ledger, climate, "report-zone", on(ledger, zone, { ...first, min: 2300, max: 2500, mean: 2400, inBand: 25 }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(await report(ledger, normal(zone), first)).toMatchObject({ result: "write" });
  const missing = await observe(ledger, [hot(other)], 300);
  expect(await report(ledger, hot(zone), missing)).toMatchObject({ result: "refused", reason: "guard-failed", name: "invalid-zone-evidence" });
  expect(ledger.item(zone).state).toBe("in-band");
  expect((await replay(ledger)).report.result).toBe("consistent");
});

test("operator band changes invalidate classification until another explicit sensor report", async () => {
  const ledger = make(), zone = await commission(ledger), first = await observe(ledger, [normal(zone)], 0);
  expect(await report(ledger, normal(zone), first)).toMatchObject({ result: "write" });
  const evidence = structuredClone(ledger.item(zone).refs);
  expect(await submit(ledger, climate, "set-band", on(ledger, zone, { setpoint: 2700, band: 200 }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(await submit(ledger, operator, "set-band", on(ledger, zone, { setpoint: 2700, band: 200 }))).toMatchObject({ result: "write" });
  expect(ledger.item(zone)).toMatchObject({ state: "unobserved", refs: evidence, values: { setpoint: 2700, band: 200, mean: 2400 } });
  const outside = { zone, min: 2300, max: 2490, mean: 2400, inBand: 0 }, summary = await observe(ledger, [outside], 300);
  expect(await report(ledger, outside, summary)).toMatchObject({ result: "write" });
  expect(ledger.item(zone).state).toBe("out-of-band");
  expect((await replay(ledger)).report.result).toBe("consistent");
});
