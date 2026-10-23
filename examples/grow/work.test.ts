/** Native probe/tender fixtures. Grants, readings and root setup are scripted;
 * text reports are member statements, with no photo custody or device effect. */
import { expect, test } from "vitest";
import { keyIdOfSecret } from "@generalbusiness/dap-bytes";
import { keys, member, t } from "@generalbusiness/dap-derive/testing";
import { room } from "./room.ts";
import { nativeScenario, devicePermissions, operator, climate, sensors, on, replay, submit, type Actor, type Ledger } from "./test-support.ts";
const day = keys.rita, secret = new Uint8Array(32).fill(6), night: Actor = { secret, key: keyIdOfSecret(secret), member: member("night-tender"), principal: null };
const permissions = [...devicePermissions, [day, ["grow.tend"]], [night, ["grow.tend"]]] as const;
const wrote = (result: Awaited<ReturnType<typeof submit>>) => expect(result, JSON.stringify(result)).toMatchObject({ result: "write" });
const revisions = (ledger: Ledger, items: Record<string, number>) => Object.fromEntries(Object.entries(items).map(([name, id]) => [name, ledger.item(id).revision]));
async function setup() {
  const ledger = nativeScenario(room, permissions, { label: "Room A" });
  wrote(await submit(ledger, operator, "commission-zone", { fields: { label: "Zone 2", setpoint: 2400, band: 200 } })); const zone = ledger.last.seq;
  wrote(await submit(ledger, operator, "commission-bench", { expected: revisions(ledger, { zone }), fields: { zone, label: "C4", row: "C", column: 4 } }));
  return { ledger, zone, bench: ledger.last.seq };
}

test("partial probes preserve independent measurement provenance and stale after48 hours from the latest probe", async () => {
  const { ledger, bench } = await setup();
  expect(ledger.item(bench)).toMatchObject({ state: "stale", values: { moisture: null, ec: null, ph: null, staleAt: null } });
  expect(ledger.drain()).toEqual([]);
  wrote(await submit(ledger, day, "probe", on(ledger, bench, { moisture: 31, ec: 2100, ph: 590 })));
  const first = ledger.last.seq;
  expect(ledger.item(bench)).toMatchObject({ state: "fresh", values: { moisture: 31, ec: 2100, ph: 590, height: null, insects: null, staleAt: t(172800) }, refs: { moistureAt: first, ecAt: first, phAt: first, heightAt: null } });
  ledger.now = t(600);
  wrote(await submit(ledger, day, "probe", on(ledger, bench, { ec: 2200 })));
  const second = ledger.last.seq;
  expect(ledger.item(bench)).toMatchObject({ values: { moisture: 31, ec: 2200, ph: 590, probeTime: t(600), staleAt: t(173400) }, refs: { moistureAt: first, ecAt: second, phAt: first, lastProbe: second } });
  ledger.now = t(172800); expect(ledger.drain()).toEqual([]); expect(ledger.item(bench).state).toBe("fresh");
  ledger.now = t(173399); expect(ledger.drain()).toEqual([]);
  ledger.now = t(173400); expect(ledger.drain()).toHaveLength(1); expect(ledger.item(bench).state).toBe("stale");
  wrote(await submit(ledger, night, "probe", on(ledger, bench, { moisture: 0, insects: 0, note: "No insects caught." })));
  expect(ledger.item(bench)).toMatchObject({ state: "fresh", values: { moisture: 0, insects: 0, ec: 2200 }, refs: { ecAt: second } });
  const result = await replay(ledger); expect([result.report.result, result.why]).toEqual(["consistent", null]);
});

test("empty, malformed and unauthorized probes and duplicate bench cells refuse without refreshing evidence", async () => {
  const { ledger, zone, bench } = await setup(), before = structuredClone(ledger.item(bench)), head = ledger.head;
  for (const fields of [{}, { note: "" }, { note: "   " }]) expect(await submit(ledger, day, "probe", on(ledger, bench, fields))).toMatchObject({ result: "refused", reason: "guard-failed", name: "empty-probe" });
  for (const fields of [{ moisture: 101 }, { ec: -1 }, { ph: 1401 }, { height: 5001 }, { insects: 10001 }]) expect(await submit(ledger, day, "probe", on(ledger, bench, fields))).toMatchObject({ result: "refused", reason: "bad-field" });
  expect(await submit(ledger, climate, "probe", on(ledger, bench, { moisture: 31 }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(ledger.item(bench)).toEqual(before); expect(ledger.head).toEqual(head);
  expect(await submit(ledger, operator, "commission-bench", { expected: revisions(ledger, { zone }), fields: { zone, label: "Duplicate C4", row: "C", column: 4 } })).toMatchObject({ result: "refused", reason: "guard-failed", name: "bench-exists" });
  expect((await replay(ledger)).report.result).toBe("consistent");
});

test("the tender who takes a maintenance task reports it without changing device observations", async () => {
  const { ledger, zone } = await setup(), devices: Record<string, number> = {};
  for (const kind of ["vent", "fan", "heater"] as const) {
    wrote(await submit(ledger, operator, "commission-device", { expected: revisions(ledger, { zone }), fields: { zone, kind, label: `${kind} 2`, minLevel: 0, maxLevel: 100, target: kind === "vent" ? "closed" : "off", level: 0 } })); devices[kind] = ledger.last.seq;
  }
  const vent = devices["vent"]!, fan = devices["fan"]!, heater = devices["heater"]!;
  wrote(await submit(ledger, operator, "bind-zone-devices", { on: zone, expected: revisions(ledger, { on: zone, vent, fan, heater }), fields: { vent, fan, heater } }));
  const stats = [{ zone, min: 2400, max: 2740, mean: 2650, inBand: 10 }];
  wrote(await submit(ledger, sensors, "observe", { fields: { sampledAt: ledger.now, zones: stats } })); const summary = ledger.fact(ledger.last.seq);
  wrote(await submit(ledger, sensors, "report-zone", on(ledger, zone, { summary, sampledAt: ledger.now, zones: stats, min: 2400, max: 2740, mean: 2650, inBand: 10 })));
  for (const [kind, id] of [["set-vent", vent], ["set-fan", fan]] as const) wrote(await submit(ledger, climate, kind, on(ledger, id, { target: kind === "set-vent" ? "open" : "on", level: 100 })));
  wrote(await submit(ledger, sensors, "report-device", on(ledger, vent, { reported: "error", level: 0, description: "Vane jammed." })));
  wrote(await submit(ledger, climate, "raise-alert", { expected: revisions(ledger, { zone, vent, fan, heater }), fields: { zone, text: "Zone 2 hot.", proposal: "Cut heater.", target: "off", level: 0 } })); const alert = ledger.last.seq;
  wrote(await submit(ledger, climate, "offer-task", { expected: revisions(ledger, { device: vent, alert }), fields: { device: vent, alert, text: "Free vent 2's jammed vane." } })); const task = ledger.last.seq;
  expect(await submit(ledger, day, "report-task", on(ledger, task, { report: "Freed." }))).toMatchObject({ result: "refused", reason: "guard-failed" });
  wrote(await submit(ledger, day, "take-task", on(ledger, task, {})));
  expect(await submit(ledger, night, "take-task", on(ledger, task, {}))).toMatchObject({ result: "refused", reason: "guard-failed" });
  expect(await submit(ledger, night, "report-task", on(ledger, task, { report: "Freed." }))).toMatchObject({ result: "refused", reason: "guard-failed" });
  expect(await submit(ledger, day, "report-task", on(ledger, task, { report: "  " }))).toMatchObject({ result: "refused", reason: "guard-failed", name: "empty-task-report" });
  const observation = structuredClone(ledger.item(vent));
  wrote(await submit(ledger, day, "report-task", on(ledger, task, { report: "Freed the jammed vane by hand." })));
  expect(ledger.item(task)).toMatchObject({ state: "done", parties: { performer: day.member }, refs: { reportAt: ledger.last.seq } });
  expect(ledger.item(vent)).toEqual(observation);
  wrote(await submit(ledger, sensors, "report-device", on(ledger, vent, { reported: "open", level: 100, description: "" })));
  expect(ledger.item(vent).values["reported"]).toBe("open");
  expect((await replay(ledger)).report.result).toBe("consistent");
});
