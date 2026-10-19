/** The real pure simulation, not native authority or a device/provider. */
import { expect, test } from "vitest";
import { simulateRoom, simulatorSchedule, type SimulatedDevice } from "./simulator.ts";
const schedule = { v: 1 as const, cadenceMinutes: 1, periodMinutes: 60, faultZone: 2,
  ventFault: { fromMinute: 10, untilMinute: 35 }, fanFault: { fromMinute: 20, untilMinute: 40 }, autonomousRecovery: {"fromMinute": 35, "description": "At minute 35 the simulated vent vane frees and the room returns to band; the fan trip resets at minute 40. Cross-draft and a working fan reduce the fault heat load. A person cutting the heater can shorten the fault. The climate agent closes the incident and records whether a heater command occurred."} };
const zones = [1, 5, 9, 13].map(id => ({ id, setpoint: 2400, band: 200 }));
const devices: SimulatedDevice[] = zones.flatMap(zone => (["vent", "fan", "heater"] as const).map((kind, i) => ({ id: zone.id + i + 1, zone: zone.id, kind,
  target: kind === "vent" ? "closed" as const : kind === "heater" ? "on" as const : "off" as const, level: kind === "heater" ? 100 : 0 })));
const at = (minute: number) => Date.UTC(2026, 9, 19, 12, minute);

test("a restart and a dropped tick preserve the periodic story; recorded heater targets change the current summary without inventing missed observations", () => {
  const start = simulateRoom(schedule, at(0), zones, devices);
  expect(start.zones.map(z => z.inBand)).toEqual([25, 25, 25, 25]);
  const fault = simulateRoom(schedule, at(20), zones, devices);
  expect(fault.zones[1]).toEqual({ zone: 5, min: 2780, max: 2900, mean: 2840, inBand: 0 });
  expect(fault.devices.filter(d => d.reported === "error").map(d => d.device)).toEqual([6, 7]);
  const draft = devices.map(d => (d.id === 2 || d.id === 14) ? { ...d, target: "open" as const, level: 100 } : d);
  expect(simulateRoom(schedule, at(20), zones, draft).zones[1]).toEqual({ zone: 5, min: 2620, max: 2740, mean: 2680, inBand: 0 });
  const restored = simulateRoom(JSON.parse(JSON.stringify(schedule)), at(20), structuredClone(zones), structuredClone(devices));
  expect(restored).toEqual(fault);
  // No call at minute21: the next invocation uses the current journal
  // targets, not a private simulation counter or a fabricated old reading.
  const cut = draft.map(d => d.id === 8 ? { ...d, target: "off" as const, level: 0 } : d);
  const caught = simulateRoom(schedule, at(22) + 59_999, zones, cut);
  expect(caught.sampledAt).toBe("2026-10-19T12:22:00Z");
  expect(caught.zones[1]).toEqual({ zone: 5, min: 2420, max: 2540, mean: 2480, inBand: 25 });
  expect(caught.devices.find(d => d.device === 8)).toEqual({ device: 8, reported: "off", level: 0, description: "" });
  expect(caught.devices.filter(d => d.reported === "error")).toHaveLength(2);
  const next = simulateRoom(schedule, at(80), zones, devices);
  expect({ ...next, sampledAt: fault.sampledAt, cycle: fault.cycle }).toEqual(fault);
  expect(next.cycle).toBe(fault.cycle + 1);
  expect(simulateRoom(schedule, at(35), zones, draft).zones.every(z => z.inBand === 25)).toBe(true);
  expect(simulateRoom(schedule, at(45), zones, devices).devices.every(d => d.reported !== "error")).toBe(true);
  const previousCut = devices.map(d => d.id === 8 ? { ...d, target: "off" as const, level: 0 } : d);
  expect(simulateRoom(schedule, at(70), zones, previousCut).zones[1]!.inBand).toBeLessThan(25);
});

test("untrusted cadence or incomplete targets cannot produce a plausible reading", () => {
  expect(() => simulatorSchedule({ ...schedule, cadenceMinutes: 0 })).toThrow("schedule");
  expect(() => simulatorSchedule({ ...schedule, cadenceMinutes: 3 })).toThrow("period");
  expect(() => simulateRoom(schedule, at(0), zones, devices.slice(1))).toThrow("room");
  expect(() => simulateRoom(schedule, at(0), zones, devices.map(d => d.id === 8 ? { ...d, level: 50 } : d))).toThrow("target");
  expect(() => simulateRoom(schedule, at(0), zones, devices.map(d => d.id === 6 ? { ...d, id: 7 } : d))).toThrow("target");
});
