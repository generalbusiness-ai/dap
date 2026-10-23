/** One stateless invocation over public member reads and signed requests.
 * The caller supplies HTTP allowances and real member/session bindings. */
import type { Answer, Digest, FactRef, FieldValue, Head, Item, MemberRef, ScopeRef, SignedIntent, Summary } from "@generalbusiness/dap-contract";
import { isLocalId as integer, same, entryHash, intentDigest, isDigest, isFactRef, isMemberRef, isRecord, isScopeRef } from "@generalbusiness/dap-bytes";
import { signedIntent, type ScopeHandle, type Signer } from "@generalbusiness/dap-client";
import { readCommandJournal, type OpenCommand } from "./command-journal.ts";
import { simulateRoom, type SimulatedDevice, type SimulatedZone, type SimulatorSchedule } from "./simulator.ts";

export const TICK_ANSWERS = 8, TICK_CLIMATE_ACTS = 8;
const DEVICE_OWNER: string = "device-command@1";
export interface SimulatorPorts {
  reader: Pick<ScopeHandle, "summary" | "history" | "entry">;
  submit(signed: SignedIntent): Promise<Answer>;
  answer(signed: SignedIntent): Promise<Answer>;
  /** Closes the local HTTP fence. It does not undo an accepted remote act. */
  stop(): void;
}
export interface SimulatorTick {
  scope: ScopeRef;
  definition: Digest;
  members: { sensors: MemberRef; climate: MemberRef; operator: MemberRef };
  signers: { sensors: Signer; climate: Signer };
  schedule: SimulatorSchedule;
  now: number;
}
export interface TickReport {
  result: "complete" | "stopped";
  phase: string;
  reason?: string;
  request?: { intent: Digest; kind: string };
  accepted: { kind: string; fact: FactRef }[];
  alreadyClosed: number;
  scannedThrough: FactRef | null;
  acknowledgedThrough: Head | null;
  completeWindow: boolean;
  pendingInWindow: number;
}
interface Snapshot { summary: Summary; head: Head; root: Item; zones: Item[]; devices: Item[]; alerts: Item[]; incidents: Item[]; tasks: Item[] }
class TickStop extends Error {}
const tickFailure = (reason: string): never => { throw new TickStop(reason); };
const number = (v: unknown): number => typeof v === "number" && Number.isSafeInteger(v) ? v : tickFailure("invalid-room-number");
const tickText = (v: unknown): string => typeof v === "string" ? v : tickFailure("invalid-room-text");
const headOf = (value: unknown): Head | null => value == null ? null : isRecord(value) && integer(value["seq"]) && isDigest(value["hash"])
  && Object.keys(value).sort().join(",") === "hash,seq" ? { seq: value["seq"], hash: value["hash"] } : tickFailure("invalid-command-cursor");
const seqOf = (value: unknown, scope: ScopeRef): number => integer(value) ? value : isFactRef(value) && same(value.at, scope) ? value.seq : tickFailure("invalid-room-fact");
const itemOf = (snapshot: Snapshot, id: number): Item => snapshot.summary.items.find(item => item.id === id) ?? tickFailure("room-item-unavailable");

/** Native preparation receipts have intent=null. Bind an owner's accepted
 * answer by reading its exact sealed preparation, rather than mistaking it
 * for an act receipt or trusting an unrelated accepted step. */
export async function acceptedTickFact(answer: Extract<Answer, { answer: "accepted" }>, scope: ScopeRef, definition: Digest,
  signed: SignedIntent, owner: boolean, reader: Pick<ScopeHandle, "entry">): Promise<FactRef> {
  const receipt = answer.receipt;
  if (!same(receipt.fact.at, scope) || receipt.definition !== definition || receipt.intent !== (owner ? null : intentDigest(signed.intent))) return tickFailure("accepted-receipt-mismatch");
  if (owner) {
    const read = await reader.entry(receipt.fact.seq);
    if (!read.ok || !read.complete || read.next !== undefined || read.value.hash !== receipt.fact.hash || entryHash(read.value.entry) !== receipt.fact.hash
      || read.value.entry.seq !== receipt.fact.seq || !same(read.value.entry.at, scope)) return tickFailure("owner-preparation-unavailable");
    const input = read.value.entry.input;
    if (input.type !== "preparation" || input.capability !== DEVICE_OWNER || input.step !== "answer" || !same(input.signed, signed)) return tickFailure("owner-preparation-mismatch");
  }
  return receipt.fact;
}

/** A new scheduled tick reads current recorded state. It never fabricates
 * observations for skipped minutes or automatically resends an unknown
 * request. Within one invocation each exact signed envelope is sent once;
 * an uncertain reply closes the fence. A later tick reconciles the journal,
 * with native command closure and item revisions deciding concurrent work. */
export async function simulatorTick(config: SimulatorTick, port: SimulatorPorts): Promise<TickReport> {
  const report: TickReport = { result: "stopped", phase: "read", accepted: [], alreadyClosed: 0, scannedThrough: null, acknowledgedThrough: null, completeWindow: false, pendingInWindow: 0 };
  let lastRequest: SignedIntent | undefined, climateActs = 0;
  async function snapshot(): Promise<Snapshot> {
    const read = await port.reader.summary();
    if (!read.ok || !read.complete || read.next !== undefined || !same(read.value.scope, config.scope) || read.value.definition !== config.definition || read.value.status !== "active") return tickFailure("room-snapshot-unavailable");
    const root = read.value.items.find(item => item.type === "room" && item.state === "open");
    if (!root) return tickFailure("room-root-unavailable");
    for (const role of ["sensors", "climate", "operator"] as const) if (!isMemberRef(root.parties[role]) || !same(root.parties[role], config.members[role])) return tickFailure("demo-principal-mismatch");
    const rows = (type: string) => read.value.items.filter(item => item.type === type);
    const result = { summary: read.value, head: read.at, root, zones: rows("zone"), devices: rows("device"), alerts: rows("alert"), incidents: rows("incident"), tasks: rows("task") };
    if (result.zones.length !== 4 || result.devices.length !== 12) return tickFailure("demo-room-not-commissioned");
    return result;
  }
  async function fact(position: number): Promise<{ fact: FactRef; entry: import("@generalbusiness/dap-contract").Entry }> {
    const read = await port.reader.entry(position);
    if (!read.ok || !read.complete || read.next !== undefined || read.value.entry.seq !== position || !same(read.value.entry.at, config.scope)
      || entryHash(read.value.entry) !== read.value.hash) return tickFailure("room-fact-unavailable");
    return { fact: { at: config.scope, seq: position, hash: read.value.hash }, entry: read.value.entry };
  }
  async function send(role: "sensors" | "climate", kind: string, on: number | null, fields: Record<string, FieldValue>, expected: Record<string, number>, owner = false): Promise<FactRef | "already-closed"> {
    lastRequest = await signedIntent(config.signers[role], { to: config.scope, kind, on, fields, expected }, { now: config.now, lifetimeSeconds: 120 });
    const answer = await (owner ? port.answer(lastRequest) : port.submit(lastRequest));
    if (owner && answer.answer === "refused" && answer.reason === "capability-refused" && answer.name === "device-command-closed") { report.alreadyClosed++; return "already-closed"; }
    if (answer.answer === "archived") return tickFailure(`archived:${answer.fact.seq}`);
    if (answer.answer !== "accepted") return tickFailure(`${answer.answer}:${answer.reason}${"name" in answer && answer.name ? ":" + answer.name : ""}`);
    const accepted = await acceptedTickFact(answer, config.scope, config.definition, lastRequest, owner, port.reader);
    report.accepted.push({ kind, fact: accepted }); return accepted;
  }
  async function act(role: "sensors" | "climate", current: Snapshot, kind: string, on: number | null, fields: Record<string, FieldValue>, subjects: Record<string, number>): Promise<FactRef> {
    if (role === "climate" && ++climateActs > TICK_CLIMATE_ACTS) return tickFailure("climate-act-limit");
    const expected = Object.fromEntries(Object.entries(subjects).map(([name, id]) => [name, itemOf(current, id).revision]));
    const result = await send(role, kind, on, fields, expected);
    return result === "already-closed" ? tickFailure("unexpected-closed-act") : result;
  }
  function simulation(current: Snapshot) {
    const zones: SimulatedZone[] = current.zones.map(zone => ({ id: zone.id, setpoint: number(zone.values["setpoint"]), band: number(zone.values["band"]) }));
    const devices: SimulatedDevice[] = current.devices.map(device => ({ id: device.id, zone: number(device.refs["zone"]), kind: tickText(device.values["kind"]) as SimulatedDevice["kind"],
      target: tickText(device.values["target"]) as SimulatedDevice["target"], level: number(device.values["level"]) }));
    return simulateRoom(config.schedule, config.now, zones, devices);
  }
  function outcome(command: OpenCommand, current: Snapshot) {
    const device = current.devices.find(device => device.id === command.device);
    if (!device || seqOf(device.refs["targetAt"], config.scope) !== command.fact.seq || device.values["target"] !== command.target || device.values["level"] !== command.level) {
      return { outcome: "unknown", description: "A newer target is recorded. This invocation does not apply the older command." };
    }
    const state = simulation(current).devices.find(device => device.device === command.device)!;
    return state.reported === "error" ? { outcome: "refused", description: state.description }
      : { outcome: "confirmed", description: "The target is applied in this fictional simulation. No physical device was contacted." };
  }
  try {
    let current = await snapshot();
    const acknowledged = headOf(current.root.values["commandsAnsweredThrough"]);
    report.acknowledgedThrough = acknowledged;
    let previous: Awaited<ReturnType<typeof fact>> | null = null;
    if (current.root.refs["lastReading"] != null) {
      previous = await fact(seqOf(current.root.refs["lastReading"], config.scope));
      const input = previous.entry.input;
      if (input.type !== "act" || input.signed.intent.kind !== "observe" || !same(input.signed.intent.fields["commandsAnsweredThrough"], acknowledged)
        || !same(input.signed.intent.fields["sampledAt"], current.root.values["lastSampledAt"]) || !acknowledged || acknowledged.seq >= previous.fact.seq) return tickFailure("reading-cursor-provenance-mismatch");
    } else if (acknowledged !== null || current.root.values["lastSampledAt"] != null) return tickFailure("reading-cursor-provenance-mismatch");
    const through = acknowledged ? { at: config.scope, ...acknowledged } : null;
    const window = await readCommandJournal(port.reader, config.scope, config.members.sensors, through, current.head);
    report.scannedThrough = window.through; report.completeWindow = window.complete;
    report.phase = "owner";
    const covered = new Set<number>();
    for (const command of window.open.slice(0, TICK_ANSWERS)) {
      await send("sensors", "device-command@1:answer", null, { command: command.fact, ...outcome(command, current) }, {}, true);
      covered.add(command.fact.seq);
    }
    const pending = window.open.filter(command => !covered.has(command.fact.seq)); report.pendingInWindow = pending.length;
    const firstPending = pending[0]?.fact.seq;
    const selected = window.entries.filter(sealed => firstPending === undefined || sealed.entry.seq < firstPending).at(-1);
    const advance = selected ? { seq: selected.entry.seq, hash: selected.hash } : acknowledged;
    if (!advance) return tickFailure("no-closed-command-prefix");
    current = await snapshot();
    if (!same(headOf(current.root.values["commandsAnsweredThrough"]), acknowledged)) return tickFailure("concurrent-tick-progress");
    const reading = simulation(current), readingBasis = current.head;
    report.phase = "report-device";
    for (const desired of reading.devices) {
      const device = itemOf(current, desired.device);
      if (device.values["reported"] === desired.reported && device.values["reportedLevel"] === desired.level && device.values["description"] === desired.description) continue;
      await act("sensors", current, "report-device", device.id, { reported: desired.reported, level: desired.level, description: desired.description }, { on: device.id });
    }
    report.phase = "observe";
    const priorFields = previous?.entry.input.type === "act" ? previous.entry.input.signed.intent.fields : null;
    let summaryFact = previous?.fact ?? null;
    // A duplicate callback in the same minute reuses its recorded reading.
    // Its cursor can wait until the next minute; answered reservations have
    // already settled and remain visible in the journal.
    if (!priorFields || priorFields["sampledAt"] !== reading.sampledAt || !same(priorFields["zones"], reading.zones)) {
      summaryFact = await act("sensors", current, "observe", current.root.id, { sampledAt: reading.sampledAt, zones: reading.zones.map(zone => ({ ...zone })),
        commandsAnsweredThrough: { ...advance }, targetBasis: { ...readingBasis } }, { on: current.root.id });
      report.acknowledgedThrough = advance;
    }
    if (!summaryFact) return tickFailure("reading-fact-unavailable");
    report.phase = "report-zone";
    for (const stats of reading.zones) {
      const zone = itemOf(current, stats.zone), state = stats.inBand === 25 ? "in-band" : "out-of-band";
      if (zone.state === state) continue;
      await act("sensors", current, "report-zone", zone.id, { summary: summaryFact, sampledAt: reading.sampledAt, zones: reading.zones.map(zone => ({ ...zone })),
        min: stats.min, max: stats.max, mean: stats.mean, inBand: stats.inBand }, { on: zone.id });
    }
    report.phase = "climate";
    current = await climate(await snapshot(), reading.minute);
    report.phase = "report-site";
    if (isScopeRef(current.root.refs["site"]) && current.root.refs["siteRoom"] != null) {
      const reportAt = current.root.refs["lastSiteReport"], last = reportAt == null ? null : await fact(seqOf(reportAt, config.scope)), input = last?.entry.input;
      // Reuse the declared last report for this reading and alert count.
      // Native delivery acknowledgments may follow it in the journal.
      const alreadyReported = last !== null && last.fact.seq > summaryFact.seq && input?.type === "act" && input.signed.intent.kind === "report-site"
        && input.signed.intent.actor === config.signers.sensors.key && input.signed.intent.fields["openAlerts"] === current.alerts.length;
      if (!alreadyReported) await act("sensors", current, "report-site", current.root.id, { openAlerts: current.alerts.length }, { on: current.root.id });
    }
    report.result = "complete"; report.phase = "complete";
    return report;
  } catch (error) {
    port.stop(); report.reason = error instanceof TickStop ? error.message : "public-interface-unavailable";
    if (lastRequest) report.request = { intent: intentDigest(lastRequest.intent), kind: lastRequest.intent.kind };
    return report;
  }

  async function climate(start: Snapshot, minute: number): Promise<Snapshot> {
    let current = start;
    const fault = [...current.zones].sort((a, b) => a.id - b.id)[config.schedule.faultZone - 1]!;
    const command = async (device: Item, target: string, level: number) => {
      if (device.values["reported"] === "error" || device.values["target"] === target && device.values["level"] === level) return;
      await act("climate", current, device.values["kind"] === "vent" ? "set-vent" : "set-fan", device.id, { target, level }, { on: device.id });
      current = await snapshot();
    };
    const faultActive = minute >= config.schedule.ventFault.fromMinute && minute < config.schedule.autonomousRecovery.fromMinute;
    if (faultActive && fault.state === "out-of-band") {
      const fan = current.devices.find(device => device.id === fault.refs["fan"]) ?? tickFailure("fault-fan-unavailable");
      await command(fan, "on", number(fan.values["maxLevel"]));
      for (const zone of [...current.zones].sort((a, b) => a.id - b.id).filter((_, i) => i === 0 || i === 3)) {
        const vent = current.devices.find(device => device.id === zone.refs["vent"]) ?? tickFailure("cross-draft-vent-unavailable");
        await command(vent, "open", number(vent.values["maxLevel"]));
      }
    }
    let zone = itemOf(current, fault.id), alert = current.alerts.find(alert => alert.refs["zone"] === zone.id);
    const vent = current.devices.find(device => device.id === zone.refs["vent"]) ?? tickFailure("fault-vent-unavailable");
    const fan = current.devices.find(device => device.id === zone.refs["fan"]) ?? tickFailure("fault-fan-unavailable");
    const heater = current.devices.find(device => device.id === zone.refs["heater"]) ?? tickFailure("fault-heater-unavailable");
    const exhausted = (device: Item) => device.values["reported"] === "error" || number(device.values["level"]) >= number(device.values["maxLevel"]);
    if (!alert && zone.state === "out-of-band" && exhausted(vent) && exhausted(fan)) {
      await act("climate", current, "raise-alert", null, { zone: zone.id, text: `Zone ${config.schedule.faultZone} is out of band. ${tickText(vent.values["description"])} ${tickText(fan.values["description"])}`,
        proposal: heater.values["target"] === "on" ? "Cut the heater and keep it off until the room returns to band. A person must authorize heat control." : "Keep the heater off while the climate devices recover.", target: "off", level: 0 },
      { zone: zone.id, vent: vent.id, fan: fan.id, heater: heater.id });
      current = await snapshot(); alert = current.alerts.find(alert => alert.refs["zone"] === zone.id);
    }
    if (alert) {
      if (!same(alert.parties["raisedBy"], config.members.climate)) return current;
      let incident = current.incidents.find(incident => incident.refs["alert"] === alert!.id);
      if (!incident) {
        const source = await fact(alert.id);
        await act("climate", current, "open-incident", null, { alert: source.fact }, { alert: alert.id });
        current = await snapshot(); incident = current.incidents.find(incident => incident.refs["alert"] === alert!.id);
      }
      zone = itemOf(current, zone.id);
      if (zone.state === "out-of-band" && vent.values["reported"] === "error" && !current.tasks.some(task => task.refs["device"] === vent.id)) {
        await act("climate", current, "offer-task", null, { device: vent.id, alert: alert.id, text: `Check vent ${config.schedule.faultZone}'s actuator. The simulation reports a jammed vane.` }, { device: vent.id, alert: alert.id });
        current = await snapshot();
      }
      if (zone.state === "in-band" && incident && zone.refs["summary"] != null && seqOf(zone.refs["summary"], config.scope) > seqOf(alert.refs["first"], config.scope)) {
        // Only a recorded human authorization earns a restoration proposal.
        // Its window belongs to the incident's cycle, so a missed invocation
        // cannot postpone unattended closure into another story period.
        const raised = Date.parse(tickText(alert.values["raisedTime"])), period = config.schedule.periodMinutes * 60_000;
        if (!Number.isFinite(raised)) return tickFailure("invalid-alert-time");
        const restorationEnd = Math.floor(raised / period) * period + (config.schedule.autonomousRecovery.fromMinute + config.schedule.autonomousRecovery.restorationWindowMinutes) * 60_000;
        const beforeEnd = config.now < restorationEnd;
        if (alert.state === "authorized" && alert.values["target"] === "off" && heater.values["target"] === "off") {
          if (vent.values["reported"] === "error") return current;
          if (beforeEnd) {
            await act("climate", current, "propose-restoration", alert.id, { text: "The simulated vent responds and the zone is back in band.",
              proposal: "Restore the heater? A person must authorize it. If unanswered, this incident closes at the declared window with the heater left off." },
            { on: alert.id, zone: zone.id, vent: vent.id });
            current = await snapshot(); return current;
          }
        }
        if (alert.values["target"] === "on" && heater.values["target"] === "off" && beforeEnd) return current;
        const currentHeater = itemOf(current, heater.id), first = seqOf(alert.refs["first"], config.scope), target = seqOf(currentHeater.refs["targetAt"], config.scope);
        const resolution = target <= first ? "Recovered through the declared simulation and climate response. No heater command was recorded during this incident."
          : `Recovered; the heater's later target is recorded at entry ${target}. The sensors and owner outcomes remain separate facts.`;
        await act("climate", current, "close-incident", alert.id, { incident: incident.id, resolution }, { on: alert.id, incident: incident.id, zone: zone.id });
        current = await snapshot();
      }
    }
    if (!faultActive) {
      const reset = current.devices.filter(device => device.id === fault.refs["fan"] || [...current.zones].sort((a, b) => a.id - b.id).filter((_, i) => i === 0 || i === 3).some(zone => zone.refs["vent"] === device.id));
      for (const device of reset) await command(device, device.values["kind"] === "vent" ? "closed" : "off", 0);
    }
    return current;
  }
}
