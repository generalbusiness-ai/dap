/** Fictional physical state, computed afresh from the clock and recorded
 * targets. Samples are transient; only their summaries enter the journal. */
export interface SimulatorSchedule {
  readonly v: 1;
  readonly cadenceMinutes: number;
  readonly periodMinutes: number;
  /** One-based ordinal in the commissioned zones' ID order. */
  readonly faultZone: number;
  readonly ventFault: { readonly fromMinute: number; readonly untilMinute: number };
  readonly fanFault: { readonly fromMinute: number; readonly untilMinute: number };
}
export interface SimulatedZone {
  readonly id: number;
  readonly setpoint: number;
  readonly band: number;
}
export interface SimulatedDevice {
  readonly id: number;
  readonly zone: number;
  readonly kind: "vent" | "fan" | "heater";
  readonly target: "open" | "closed" | "on" | "off";
  readonly level: number;
}
export interface DeviceReport {
  readonly device: number;
  readonly reported: "open" | "closed" | "on" | "off" | "error";
  readonly level: number;
  readonly description: string;
}
export interface ZoneSummary {
  readonly zone: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly inBand: number;
}
export interface SimulatedReading {
  readonly sampledAt: string;
  readonly cycle: number;
  readonly minute: number;
  readonly zones: readonly ZoneSummary[];
  readonly devices: readonly DeviceReport[];
}
const integer = (value: number, min: number, max: number): boolean => Number.isSafeInteger(value) && value >= min && value <= max;

/** Validate the signed asset before accepting any clock or room input. */
export function simulatorSchedule(value: unknown): SimulatorSchedule {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid simulator schedule");
  const s = value as SimulatorSchedule;
  if (Object.keys(value).sort().join(",") !== "cadenceMinutes,fanFault,faultZone,periodMinutes,v,ventFault" || s.v !== 1
    || !integer(s.cadenceMinutes, 1, 60) || !integer(s.periodMinutes, 1, 1440) || s.periodMinutes % s.cadenceMinutes !== 0
    || !integer(s.faultZone, 1, 4)) throw new Error("invalid simulator schedule");
  for (const range of [s.ventFault, s.fanFault]) {
    if (!range || typeof range !== "object" || Object.keys(range).sort().join(",") !== "fromMinute,untilMinute"
      || !integer(range.fromMinute, 0, s.periodMinutes - 1) || !integer(range.untilMinute, range.fromMinute + 1, s.periodMinutes)
      || range.fromMinute % s.cadenceMinutes !== 0 || range.untilMinute % s.cadenceMinutes !== 0) throw new Error("invalid simulator fault period");
  }
  return structuredClone(s);
}

/** No accumulated temperature, random seed, counter, timer or private state.
 * A missed tick produces the current reading on the next invocation. It
 * never invents intervening observations or a person's intervention. */
export function simulateRoom(schedule: SimulatorSchedule, now: number, zones: readonly SimulatedZone[], devices: readonly SimulatedDevice[]): SimulatedReading {
  const s = simulatorSchedule(schedule);
  if (!integer(now, 0, 8_640_000_000_000_000) || !integer(zones.length, 1, 4) || devices.length !== zones.length * 3) throw new Error("invalid simulated room");
  const ordered = [...zones].sort((a, b) => a.id - b.id), ids = new Set<number>(), deviceIds = new Set<number>();
  for (const zone of ordered) {
    if (!integer(zone.id, 0, Number.MAX_SAFE_INTEGER) || ids.has(zone.id) || !integer(zone.setpoint, -4000, 8000) || !integer(zone.band, 1, 2000)) throw new Error("invalid simulated zone");
    ids.add(zone.id);
    for (const kind of ["vent", "fan", "heater"] as const) if (devices.filter(d => d.zone === zone.id && d.kind === kind).length !== 1) throw new Error("incomplete simulated devices");
  }
  for (const device of devices) {
    const off = device.target === "off" || device.target === "closed";
    if (!integer(device.id, 0, Number.MAX_SAFE_INTEGER) || deviceIds.has(device.id) || !ids.has(device.zone)
      || !["vent", "fan", "heater"].includes(device.kind) || !integer(device.level, 0, 100)
      || !(device.kind === "vent" ? ["open", "closed"] : ["on", "off"]).includes(device.target)
      || (off ? device.level !== 0 : device.level < 1 || (device.kind === "heater" && device.level !== 100))) throw new Error("invalid simulated target");
    deviceIds.add(device.id);
  }
  const cadence = s.cadenceMinutes * 60_000, sample = Math.floor(now / cadence) * cadence;
  const elapsed = Math.floor(sample / 60_000), minute = elapsed % s.periodMinutes, cycle = Math.floor(elapsed / s.periodMinutes);
  if (s.faultZone > ordered.length) throw new Error("uncommissioned simulator fault zone");
  const faultZone = ordered[s.faultZone - 1]!.id;
  const inside = (range: SimulatorSchedule["ventFault"]): boolean => minute >= range.fromMinute && minute < range.untilMinute;
  const reports = [...devices].sort((a, b) => a.id - b.id).map((device): DeviceReport => {
    const fault = device.zone === faultZone && ((device.kind === "vent" && inside(s.ventFault)) || (device.kind === "fan" && inside(s.fanFault)));
    return fault ? { device: device.id, reported: "error", level: 0, description: device.kind === "vent"
      ? "Simulated vent vane is jammed closed and does not respond to its target."
      : "Simulated fan has stopped on an overcurrent trip." }
      : { device: device.id, reported: device.target, level: device.level, description: "" };
  });
  const summaries = ordered.map((zone): ZoneSummary => {
    const heater = devices.find(d => d.zone === zone.id && d.kind === "heater")!;
    const warmFault = zone.id === faultZone && inside(s.ventFault);
    // A heat cut has a visible causal effect even during the repeating
    // obstruction. The clock clears fictional faults; no repair is imputed
    // to a tender. Integer offsets total zero across 25 transient samples.
    const activeLevel = (kind: "vent" | "fan", of: number): number => {
      const d = devices.find(d => d.zone === of && d.kind === kind)!;
      return reports.find(r => r.device === d.id)!.reported === "error" ? 0 : d.level;
    };
    const crossDraft = warmFault ? ordered.filter((_, i) => i === 0 || i === 3).reduce((n, z) => n + Math.floor(activeLevel("vent", z.id) * 0.8), 0) : 0;
    const cooling = warmFault ? activeLevel("fan", zone.id) + crossDraft : 0;
    const base = zone.setpoint + (warmFault && heater.target === "on" ? 440 - cooling : heater.target === "off" ? -40 : 0);
    const samples = Array.from({ length: 25 }, (_, i) => Math.max(-4000, Math.min(8000, base + (i - 12) * 5)));
    return { zone: zone.id, min: Math.min(...samples), max: Math.max(...samples), mean: Math.round(samples.reduce((a, b) => a + b, 0) / 25),
      inBand: samples.filter(t => t >= zone.setpoint - zone.band && t <= zone.setpoint + zone.band).length };
  });
  return { sampledAt: new Date(sample).toISOString().replace(".000Z", "Z"), cycle, minute, zones: summaries, devices: reports };
}
