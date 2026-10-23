/** Native room/incident fault fixtures. Targets are intentions, grants are
 * scripted and outcomes are separately labelled scenario-owner records. */
import { expect, test } from "vitest";
import type { FactRef, SignedIntent } from "@generalbusiness/dap-contract";
import { keyIdOfSecret } from "@generalbusiness/dap-bytes";
import { t, keys, member, deliver } from "@generalbusiness/dap-derive/testing";
import { room } from "./room.ts";
import { site } from "./site.ts";
import { sitePresence } from "./presence.ts";
import { nativeScenario, nativeCreatedSite, nativeChild, devicePermissions, operator, climate, sensors, on, replay, submit, type Actor, type Ledger } from "./test-support.ts";

interface Zone { id: number; vent: number; fan: number; heater: number }
const wrote = (result: Awaited<ReturnType<typeof submit>>) => expect(result, JSON.stringify(result)).toMatchObject({ result: "write" });
const revisions = (ledger: Ledger, items: Record<string, number>): Record<string, number> => Object.fromEntries(Object.entries(items).map(([name, id]) => [name, ledger.item(id).revision]));
async function setup(heaterMax = 100, supplied?: Ledger): Promise<{ ledger: Ledger; zones: Zone[] }> {
  const ledger = supplied ?? nativeScenario(room, devicePermissions, { label: "Room A" }), zones: Zone[] = [];
  for (let number = 1; number <= 4; number++) {
    wrote(await submit(ledger, operator, "commission-zone", { fields: { label: `Zone ${number}`, setpoint: 2400, band: 200 } }));
    const id = ledger.last.seq, devices: Record<string, number> = {};
    for (const kind of ["vent", "fan", "heater"] as const) {
      const heaterOn = kind === "heater" && heaterMax === 100;
      wrote(await submit(ledger, operator, "commission-device", { expected: revisions(ledger, { zone: id }), fields: { zone: id, kind, label: `${kind} ${number}`, minLevel: 0, maxLevel: kind === "heater" ? heaterMax : 100, target: kind === "vent" ? "closed" : heaterOn ? "on" : "off", level: heaterOn ? 100 : 0 } }));
      devices[kind] = ledger.last.seq;
    }
    const zone: Zone = { id, vent: devices["vent"]!, fan: devices["fan"]!, heater: devices["heater"]! }; zones.push(zone);
    wrote(await submit(ledger, operator, "bind-zone-devices", { on: id, expected: revisions(ledger, { on: id, vent: zone.vent, fan: zone.fan, heater: zone.heater }), fields: { vent: zone.vent, fan: zone.fan, heater: zone.heater } }));
  }
  return { ledger, zones };
}
async function summary(ledger: Ledger, zones: Zone[], seconds: number, out: number | null) {
  ledger.now = t(seconds);
  const values = zones.map(zone => ({ zone: zone.id, min: 2300, max: zone.id === out ? 2740 : 2500, mean: zone.id === out ? 2650 : 2400, inBand: zone.id === out ? 10 : 25 }));
  wrote(await submit(ledger, sensors, "observe", { fields: { sampledAt: ledger.now, zones: values } }));
  const fact = ledger.fact(ledger.last.seq);
  return { fact, values, sampledAt: ledger.now };
}
async function classify(ledger: Ledger, zone: Zone, sample: Awaited<ReturnType<typeof summary>>) {
  const stats = sample.values.find(stats => stats.zone === zone.id)!;
  return submit(ledger, sensors, "report-zone", on(ledger, zone.id, { summary: sample.fact, sampledAt: sample.sampledAt, zones: sample.values, min: stats.min, max: stats.max, mean: stats.mean, inBand: stats.inBand }));
}
const raise = (ledger: Ledger, zone: Zone) => submit(ledger, climate, "raise-alert", { expected: revisions(ledger, { zone: zone.id, vent: zone.vent, fan: zone.fan, heater: zone.heater }), fields: { zone: zone.id, text: "Zone 2 is hot; vent jammed and fan tripped.", proposal: "Cut heater 2 until the zone is back in band.", target: "off", level: 0 } });
const authorize = (ledger: Ledger, alert: number, heater: number) => submit(ledger, operator, "authorize", { on: alert, expected: revisions(ledger, { on: alert, heater }) });

test("four-zone climate fault holds, refuses stale authority, authorizes only targets, restores and closes an exact incident range", async () => {
  const day = keys.rita, head = keys.sam, secret = new Uint8Array(32).fill(7);
  const irrigation: Actor = { secret, key: keyIdOfSecret(secret), member: member("irrigation"), principal: head.member };
  const permissions = [...devicePermissions, [day, ["grow.tend"]], [head, ["grow.water-more", "grow.apply", "grow.water"]], [irrigation, ["grow.water"]]] as const;
  const { launcher, site: parent } = await nativeCreatedSite(site, permissions, { label: "Test grow site" });
  const rooms: Ledger[] = [], rows: number[] = [];
  for (const label of ["Room A", "Room B", "Room C"]) {
    wrote(await submit(parent, operator, "create-room", { fields: { label } })); const row = parent.last.seq;
    const child = await nativeChild(parent, row, room, permissions, 20 + rooms.length);
    expect(deliver(parent, child, 0).result).toBe("write");
    expect(deliver(child, parent, parent.last.seq).result).toBe("write"); rooms.push(child); rows.push(row);
  }
  const { ledger, zones } = await setup(100, rooms[0]!), zone = zones[1]!, benches = new Map<string, number>();
  for (let row = 0; row < 10; row++) for (let column = 1; column <= 10; column++) {
    const label = `${"ABCDEFGHIJ"[row]}${column}`, benchZone = zones[(row < 5 ? 0 : 2) + (column <= 5 ? 0 : 1)]!;
    wrote(await submit(ledger, operator, "commission-bench", { expected: revisions(ledger, { zone: benchZone.id }), fields: { zone: benchZone.id, label, row: "ABCDEFGHIJ"[row]!, column } })); benches.set(label, ledger.last.seq);
  }
  expect(benches.size).toBe(100);
  for (const zone of zones) expect(ledger.state.all().items.filter(item => item.type === "bench" && item.refs["zone"] === zone.id)).toHaveLength(25);
  const c4 = benches.get("C4")!, d4 = benches.get("D4")!, benchZone = zones[0]!.id;
  wrote(await submit(parent, operator, "provision-presence", { fields: { member: day.member } })); const dayPresence = parent.last.seq;
  wrote(await submit(parent, day, "arrive", on(parent, dayPresence, { room: rows[0]! }))); expect(sitePresence(parent.state.all().items, position => parent.fact(position))).toHaveLength(1);
  wrote(await submit(ledger, day, "probe", on(ledger, c4, { moisture: 31, ec: 2100, ph: 590 })));
  wrote(await submit(ledger, operator, "configure-watering", { fields: { opensAt: t(900), closesAt: t(1200), maxMl: 400 } }));
  type Outcome = "confirmed" | "refused" | "unknown";
  const outcomes: { label: "non-native-scenario-owner"; command: FactRef; outcome: Outcome }[] = [];
  const outcome = (result: Outcome) => outcomes.push({ label: "non-native-scenario-owner", command: ledger.fact(ledger.last.seq), outcome: result });
  const publishCount = async (openAlerts: number) => {
    wrote(await submit(ledger, sensors, "report-site", on(ledger, 0, { openAlerts })));
    parent.now = ledger.now; expect(deliver(parent, ledger, ledger.last.seq).result).toBe("write");
    expect(parent.item(rows[0]!).values["openAlerts"]).toBe(openAlerts);
  };
  const initial = await summary(ledger, zones, 0, null);
  for (const zone of zones) wrote(await classify(ledger, zone, initial));
  expect(await raise(ledger, zone)).toMatchObject({ result: "refused", reason: "guard-failed" });
  const hot = await summary(ledger, zones, 300, zone.id); wrote(await classify(ledger, zone, hot));
  expect(await raise(ledger, zone)).toMatchObject({ result: "refused", reason: "guard-failed", name: "climate-actions-remain" });
  wrote(await submit(ledger, climate, "set-vent", on(ledger, zone.vent, { target: "open", level: 100 }))); outcome("refused");
  wrote(await submit(ledger, sensors, "report-device", on(ledger, zone.vent, { reported: "error", level: 0, description: "Commanded open, reads closed; no response." })));
  expect(await submit(ledger, climate, "set-vent", on(ledger, zone.vent, { target: "closed", level: 0 }))).toMatchObject({ result: "refused", reason: "guard-failed", name: "device-error" });
  wrote(await submit(ledger, climate, "set-fan", on(ledger, zone.fan, { target: "on", level: 100 }))); outcome("confirmed");
  wrote(await submit(ledger, sensors, "report-device", on(ledger, zone.fan, { reported: "error", level: 0, description: "Overcurrent trip." })));
  for (const cross of [zones[0]!, zones[3]!]) { wrote(await submit(ledger, climate, "set-vent", on(ledger, cross.vent, { target: "open", level: 100 }))); outcome("confirmed"); }
  wrote(await raise(ledger, zone)); const alert = ledger.last.seq, raised = ledger.fact(alert);
  wrote(await submit(ledger, climate, "open-incident", { expected: revisions(ledger, { alert }), fields: { alert: raised } })); const incident = ledger.last.seq;
  await publishCount(1);
  wrote(await submit(ledger, climate, "offer-task", { expected: revisions(ledger, { device: zone.vent, alert }), fields: { device: zone.vent, alert, text: "Free vent 2's jammed vane by hand." } })); const task = ledger.last.seq;
  wrote(await submit(ledger, day, "take-task", on(ledger, task, {})));
  const old: SignedIntent = ledger.intent(operator, "authorize", { on: alert, expected: revisions(ledger, { on: alert, heater: zone.heater }), notAfter: t(600) });
  wrote(await submit(ledger, operator, "hold", on(ledger, alert, {})));
  const heldRevision = ledger.item(alert).revision;
  wrote(await submit(ledger, day, "probe", on(ledger, d4, { ec: 2800 }))); const waterBasis = ledger.fact(ledger.last.seq);
  wrote(await submit(ledger, irrigation, "request-watering", { expected: revisions(ledger, { zone: benchZone, bench: d4 }), fields: { zone: benchZone, bench: d4, basis: waterBasis, amountMl: 800, reason: "High EC on D4; request early watering." } })); const watering = ledger.last.seq;
  expect(ledger.item(alert).state).toBe("held"); expect(ledger.item(watering).state).toBe("asked"); expect(ledger.item(task).state).toBe("taken");
  ledger.now = t(359); expect(ledger.drain()).toEqual([]); expect(ledger.item(alert).state).toBe("held");
  ledger.now = t(360); expect(ledger.drain()).toHaveLength(1); expect(ledger.item(alert)).toMatchObject({ state: "open", revision: heldRevision + 1 });
  expect(ledger.submit(old)).toMatchObject({ result: "refused", reason: "revision-moved" });
  wrote(await authorize(ledger, alert, zone.heater));
  outcome("confirmed");
  expect(ledger.item(zone.heater).values["target"]).toBe("off"); expect(ledger.item(zone.heater).values["reported"]).toBeNull();
  wrote(await submit(ledger, head, "approve-watering", on(ledger, watering, { decision: "Approve 800 ml now for D4." })));
  wrote(await submit(ledger, irrigation, "fulfill-watering", on(ledger, watering, {}))); expect(ledger.item(watering)).toMatchObject({ state: "done", values: { amountMl: 800 }, refs: { basis: waterBasis.seq }, parties: { decidedBy: head.member, performedBy: irrigation.member } });
  wrote(await submit(ledger, sensors, "report-device", on(ledger, zone.heater, { reported: "on", level: 100, description: "" })));
  expect(ledger.item(zone.heater).values).toMatchObject({ target: "off", reported: "on" });
  expect(await submit(ledger, climate, "set-heater", on(ledger, zone.heater, { target: "on", level: 100 }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(await submit(ledger, climate, "close-incident", { on: alert, expected: revisions(ledger, { on: alert, incident, zone: zone.id }), fields: { incident } })).toMatchObject({ result: "refused", reason: "guard-failed" });
  wrote(await submit(ledger, sensors, "report-device", on(ledger, zone.heater, { reported: "off", level: 0, description: "" })));
  wrote(await submit(ledger, day, "report-task", on(ledger, task, { report: "Freed the jammed vane by hand." })));
  expect(ledger.item(zone.vent).values["reported"]).toBe("error");
  wrote(await submit(ledger, sensors, "report-device", on(ledger, zone.vent, { reported: "open", level: 100, description: "" })));
  const cool = await summary(ledger, zones, 600, null); wrote(await classify(ledger, zone, cool));
  for (const cross of [zones[0]!, zones[3]!]) { wrote(await submit(ledger, climate, "set-vent", on(ledger, cross.vent, { target: "closed", level: 0 }))); outcome("confirmed"); }
  wrote(await submit(ledger, climate, "propose-restoration", { on: alert, expected: revisions(ledger, { on: alert, zone: zone.id, vent: zone.vent }), fields: { text: "Vent 2 is responding.", proposal: "Restore heater 2?" } }));
  wrote(await authorize(ledger, alert, zone.heater)); outcome("confirmed");
  wrote(await submit(ledger, sensors, "report-device", on(ledger, zone.heater, { reported: "on", level: 100, description: "" })));
  wrote(await submit(ledger, climate, "close-incident", { on: alert, expected: revisions(ledger, { on: alert, incident, zone: zone.id }), fields: { incident } }));
  expect(ledger.item(alert).state).toBe("closed"); expect(ledger.item(incident)).toMatchObject({ state: "closed", refs: { first: alert, last: ledger.last.seq } });
  expect(ledger.item(zone.fan).values["reported"]).toBe("error"); expect(outcomes).toHaveLength(8);
  expect(new Set(outcomes.map(record => record.command.hash)).size).toBe(8);
  expect(ledger.item(zone.heater).values["outcome"]).toBeNull();
  expect(ledger.state.recordCount("device-command@1", "command")).toBe(0); // no installed grant in this fixture
  await publishCount(0);
  parent.now = ledger.now; wrote(await submit(parent, day, "leave", on(parent, dayPresence, { room: rows[0]! }))); expect(sitePresence(parent.state.all().items, position => parent.fact(position))).toEqual([]);
  ledger.now = t(172800); expect(ledger.drain()).toHaveLength(1); expect(ledger.item(c4).state).toBe("stale"); expect(ledger.item(d4).state).toBe("fresh");
  ledger.now = t(173100); expect(ledger.drain()).toHaveLength(1); expect(ledger.item(d4).state).toBe("stale");
  for (const current of [parent, ...rooms]) { const result = await replay(current, [launcher, parent, ...rooms].filter(other => other !== current)); expect([result.report.result, result.why]).toEqual(["consistent", null]); }
});

async function eligible(heaterMax = 100) {
  const { ledger, zones } = await setup(heaterMax), zone = zones[1]!;
  const sample = await summary(ledger, zones, 0, zone.id); wrote(await classify(ledger, zone, sample));
  wrote(await submit(ledger, climate, "set-vent", on(ledger, zone.vent, { target: "open", level: 100 })));
  wrote(await submit(ledger, climate, "set-fan", on(ledger, zone.fan, { target: "on", level: 100 })));
  wrote(await raise(ledger, zone)); const alert = ledger.last.seq, source = ledger.fact(alert);
  wrote(await submit(ledger, climate, "open-incident", { expected: revisions(ledger, { alert }), fields: { alert: source } }));
  return { ledger, zones, zone, alert, incident: ledger.last.seq, source };
}

test("an authorization cannot command an errored or disabled heater or give its authority to the climate agent", async () => {
  const { ledger, zone, alert } = await eligible(70);
  expect(await submit(ledger, climate, "authorize", { on: alert, expected: revisions(ledger, { on: alert, heater: zone.heater }) })).toMatchObject({ result: "refused", reason: "unauthorized" });
  wrote(await submit(ledger, sensors, "report-device", on(ledger, zone.heater, { reported: "error", level: 0, description: "Heater relay is stuck." })));
  const before = structuredClone(ledger.item(zone.heater));
  expect(await authorize(ledger, alert, zone.heater)).toMatchObject({ result: "refused", reason: "guard-failed", name: "device-error" });
  expect(ledger.item(zone.heater)).toEqual(before); expect(ledger.item(alert).state).toBe("open");
  wrote(await submit(ledger, sensors, "report-device", on(ledger, zone.heater, { reported: "off", level: 0, description: "" })));
  wrote(await authorize(ledger, alert, zone.heater));
  expect(await submit(ledger, climate, "propose-restoration", { on: alert, expected: revisions(ledger, { on: alert, zone: zone.id, vent: zone.vent }), fields: { text: "Vent status unknown.", proposal: "Restore heater?" } })).toMatchObject({ result: "refused", reason: "guard-failed" });
  wrote(await submit(ledger, sensors, "report-device", on(ledger, zone.vent, { reported: "open", level: 100, description: "" })));
  wrote(await submit(ledger, climate, "propose-restoration", { on: alert, expected: revisions(ledger, { on: alert, zone: zone.id, vent: zone.vent }), fields: { text: "Vent responds.", proposal: "Restore heater?" } }));
  expect(await authorize(ledger, alert, zone.heater)).toMatchObject({ result: "refused", reason: "guard-failed", name: "device-limit" });
  expect(ledger.item(zone.heater).values["target"]).toBe("off");
  expect((await replay(ledger)).report.result).toBe("consistent");
});

test("one alert has one incident, and recovery must cite a summary recorded after it was raised", async () => {
  const { ledger, zones } = await setup(), zone = zones[1]!;
  const hot = await summary(ledger, zones, 0, zone.id); wrote(await classify(ledger, zone, hot));
  for (const [kind, id] of [["set-vent", zone.vent], ["set-fan", zone.fan]] as const) wrote(await submit(ledger, climate, kind, on(ledger, id, { target: kind === "set-vent" ? "open" : "on", level: 100 })));
  const earlierCool = await summary(ledger, zones, 10, null);
  wrote(await raise(ledger, zone)); const alert = ledger.last.seq, source = ledger.fact(alert);
  wrote(await submit(ledger, climate, "open-incident", { expected: revisions(ledger, { alert }), fields: { alert: source } })); const incident = ledger.last.seq;
  expect(await submit(ledger, climate, "open-incident", { expected: revisions(ledger, { alert }), fields: { alert: source } })).toMatchObject({ result: "refused", reason: "guard-failed", name: "incident-exists" });
  wrote(await classify(ledger, zone, earlierCool));
  expect(await submit(ledger, climate, "close-incident", { on: alert, expected: revisions(ledger, { on: alert, incident, zone: zone.id }), fields: { incident } })).toMatchObject({ result: "refused", reason: "guard-failed", name: "recovery-not-observed" });
  expect(ledger.item(alert).state).toBe("open"); expect((await replay(ledger)).report.result).toBe("consistent");
});

test("room commissioning refuses duplicate kinds and bindings from another zone", async () => {
  const { ledger, zones } = await setup(), first = zones[0]!, second = zones[1]!;
  expect(await submit(ledger, operator, "commission-device", { expected: revisions(ledger, { zone: first.id }), fields: { zone: first.id, kind: "vent", label: "Duplicate", minLevel: 0, maxLevel: 100, target: "closed", level: 0 } })).toMatchObject({ result: "refused", reason: "guard-failed", name: "device-already-commissioned" });
  expect(await submit(ledger, operator, "bind-zone-devices", { on: first.id, expected: revisions(ledger, { on: first.id, vent: second.vent, fan: first.fan, heater: first.heater }), fields: { vent: second.vent, fan: first.fan, heater: first.heater } })).toMatchObject({ result: "refused", reason: "guard-failed" });
  expect((await replay(ledger)).report.result).toBe("consistent");
});
