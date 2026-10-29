/**
 * Grow modules for zones, devices, bench work, watering and presence.
 * Each definition passes its fact namespace, items and declared vocabulary.
 * The original modules live in examples/grow. Grow Room and Site compose
 * these modules with the same explicit dependencies.
 */
import { DEVICE_COMMAND } from "@generalbusiness/dap-contract";
import type { EffectForm, Guard, ItemType } from "@generalbusiness/dap-contract";
import {
  anyOf, author, by, comment, constant, differs, enumOf, equals, fact, final,
  grants, int, isFact, item, itemOf, list, live, member, none, now, one, open,
  optional, owned, part, party, permit, plusSeconds, record, ref, reasons,
  require, required, rule, self, signer, text, theScope, time, timed, transition,
  value, when, type FieldRefs, type ItemDef, type Of,
} from "./lib.ts";

/** Each definition declares its own grants and refusal names. */
export function growVocabulary() {
  return {
    g: grants({
      configure: "grow.configure", sense: "grow.sense", climate: "grow.climate",
      heat: "grow.heat", tend: "grow.tend", water: "grow.water",
      waterMore: "grow.water-more", apply: "grow.apply",
    }),
    r: reasons({
      wrongSummaryRoom: "wrong-summary-room", summaryMismatch: "summary-mismatch",
      invalidZoneEvidence: "invalid-zone-evidence", staleZoneSummary: "stale-zone-summary",
      noBandCrossing: "no-band-crossing", deviceError: "device-error",
      wrongDeviceKind: "wrong-device-kind", deviceLimit: "device-limit",
      invalidDeviceReport: "invalid-device-report", benchExists: "bench-exists",
      emptyProbe: "empty-probe", wrongTaskZone: "wrong-task-zone",
      emptyTaskReport: "empty-task-report", invalidWaterWindow: "invalid-water-window",
      wateringExceedsSchedule: "watering-exceeds-schedule", wrongWateringRoom: "wrong-watering-room",
      wrongWateringBench: "wrong-watering-bench", wrongWateringZone: "wrong-watering-zone",
      emptyWateringReason: "empty-watering-reason", notPresenceMember: "not-presence-member",
      presenceExists: "presence-exists", presenceNotPresent: "presence-not-present",
      wrongPresenceRoom: "wrong-presence-room", invalidHeaterProposal: "invalid-heater-proposal",
      wrongAlertCount: "wrong-alert-count", deviceAlreadyCommissioned: "device-already-commissioned",
      climateActionsRemain: "climate-actions-remain", zoneAlertOpen: "zone-alert-open",
      incidentExists: "incident-exists", recoveryNotObserved: "recovery-not-observed",
      wrongSummarySender: "wrong-summary-sender",
    }),
  };
}
export type GrowVocabulary = ReturnType<typeof growVocabulary>;

type RefSlots = ItemType["refs"];
const notEmpty = (field: string) => `$length(fields.${field}) > 0 and $not($contains(" \\t\\r\\n", $substring(fields.${field}, 0, 1)))`;

// ================================================================ zone

const temperature = int(-4000, 8000), inBandCount = int(0, 25), bandWidth = int(1, 2000);
const zones = list(record({ zone: required(itemOf("zone")), min: required(temperature), max: required(temperature), mean: required(temperature), inBand: required(inBandCount) }), 4);

/** A zone with the reference slots supplied by its definition. */
export const zoneItem = <const R extends RefSlots = {}>(under: string, refs: R = {} as R) => item("zone", {
  many: 4,
  initial: "unobserved", states: { unobserved: live, "in-band": live, "out-of-band": live },
  refs: { summary: ref.optional(fact(under, "observe")), ...refs },
  values: {
    label: value.fixed(text(80)), setpoint: value.required(temperature), band: value.required(bandWidth),
    min: value.optional(temperature), max: value.optional(temperature), mean: value.optional(temperature), inBand: value.optional(inBandCount), summaryTime: value.optional(time),
  },
});
type Zone = ReturnType<typeof zoneItem>;
const anyZoneState = (z: Of<Zone>) => z.in("unobserved", "in-band", "out-of-band");

export function zoneActs(zone: Zone, under: string, { g, r }: GrowVocabulary) {
  return {
    acts: {
      "commission-zone": open(zone, g.configure, { fields: { label: required(text(80)), setpoint: required(temperature), band: required(bandWidth) } }, ({ f, on }) => ({
        effects: [...on.take(f, "label", "setpoint", "band")],
      })),
      /** A sensor records zone summaries. report-zone uses that entry as evidence. */
      observe: comment(null, g.sense, { fields: { sampledAt: required(time), zones: required(zones) } }),
      "report-zone": transition(zone, g.sense, {
        fields: { summary: required(fact(under, "observe")), sampledAt: required(time), zones: required(zones), min: required(temperature), max: required(temperature), mean: required(temperature), inBand: required(inBandCount) },
      }, ({ f, on }) => {
        const allIn = equals(f.inBand, 25);
        return {
          guards: [
            anyZoneState(on), isFact(f.summary),
            require(equals(part(f.summary, "scope"), theScope), r.wrongSummaryRoom),
            require(equals(part(f.summary, { field: "zones" }), f.zones), r.summaryMismatch),
            require(equals(part(f.summary, { field: "sampledAt" }), f.sampledAt), r.summaryMismatch),
            require(rule("zone-evidence",
              "($id := subjects.on.id; $z := fields.zones[zone = $id]; $lo := " +
              "subjects.on.values.setpoint - subjects.on.values.band; $hi := " +
              "subjects.on.values.setpoint + subjects.on.values.band; $count($z) = 1 and " +
              "fields.min = $z.min and fields.max = $z.max and fields.mean = $z.mean and " +
              "fields.inBand = $z.inBand and fields.min <= fields.mean and fields.mean <= " +
              "fields.max and ((fields.min >= $lo and fields.max <= $hi) ? fields.inBand = 25 : " +
              "((fields.max < $lo or fields.min > $hi) ? fields.inBand = 0 : ((fields.min < $lo " +
              "and fields.max > $hi) ? fields.inBand <= 23 : (fields.inBand >= 1 and " +
              "fields.inBand <= 24)))))"
            ), r.invalidZoneEvidence),
            require(rule("zone-order",
              "subjects.on.refs.summary = null or (fields.sampledAt >= " +
              "subjects.on.values.summaryTime and (fields.summary > subjects.on.refs.summary or " +
              "(fields.summary = subjects.on.refs.summary and subjects.on.state = " +
              "'unobserved')))"
            ), r.staleZoneSummary),
            require(rule("zone-crossing",
              "subjects.on.state = 'unobserved' or (fields.inBand = 25 ? subjects.on.state = " +
              "'out-of-band' : subjects.on.state = 'in-band')"
            ), r.noBandCrossing),
          ],
          effects: [
            when(on.to("in-band"), { if: [allIn] }), when(on.to("out-of-band"), { unless: [allIn] }),
            ...on.take(f, "min", "max", "mean", "inBand"), on.value("summaryTime", f.sampledAt), on.ref("summary", f.summary),
          ],
        };
      }),
      "set-band": transition(zone, g.heat, { fields: { setpoint: required(temperature), band: required(bandWidth) } }, ({ f, on }) => ({
        guards: [anyZoneState(on)],
        // Keep the old summary. A fresh report must classify the new band.
        effects: [...on.take(f, "setpoint", "band"), on.to("unobserved")],
      })),
    },
  };
}

// ================================================================ device

const level = int(0, 100);
const kinds = enumOf("vent", "fan", "heater");
const targets = enumOf("open", "closed", "on", "off");
const reported = enumOf("open", "closed", "on", "off", "error");

/**
 * A device with the reference slots supplied by its definition.
 * targetActs names the definition's additional acts that set a target.
 */
export const deviceItem = <const R extends RefSlots = {}>(under: string, targetActs: readonly string[] = [], refs: R = {} as R) => item("device", {
  many: 12,
  initial: "active", states: { active: live },
  refs: {
    targetAt: ref.required(fact(under, "commission-device", "set-vent", "set-fan", "set-heater", ...targetActs)),
    reportedAt: ref.optional(fact(under, "report-device")),
    outcomeAt: owned(ref.optional(fact(under, "device-command@1:answer")), DEVICE_COMMAND),
    ...refs,
  },
  values: {
    kind: value.fixed(kinds), label: value.fixed(text(80)), minLevel: value.fixed(level), maxLevel: value.fixed(level),
    target: value.required(targets), level: value.required(level),
    reported: value.optional(reported), reportedLevel: value.optional(level), description: value.optional(text(1024)), reportedTime: value.optional(time),
    outcome: owned(value.optional(enumOf("confirmed", "refused", "unknown")), DEVICE_COMMAND),
  },
});
type Device = ReturnType<typeof deviceItem>;

/** The device has not reported an error. A predicate on any device subject. */
export const deviceNotFailed = (d: Of<Device>, r: GrowVocabulary["r"]) => require(anyOf([d.unset("reported")], [d.differs(d.slot("reported"), "error")]), r.deviceError);

function validTarget(kind: string, minimum: string, maximum: string): string {
  return `(((${kind} = 'vent') and fields.target in ['open', 'closed']) or ((${kind} in ['fan', 'heater']) and fields.target in ['on', 'off'])) and ((fields.target in ['closed', 'off'] and fields.level = 0) or (fields.target in ['open', 'on'] and fields.level >= 1 and fields.level >= ${minimum} and fields.level <= ${maximum} and (${kind} != 'heater' or fields.level = 100)))`;
}

const commissionFields = { kind: required(kinds), label: required(text(80)), minLevel: required(level), maxLevel: required(level), target: required(targets), level: required(level) };
type CommissionCtx = { on: Of<Device>; f: FieldRefs<typeof commissionFields> };

export function deviceActs(device: Device, { g, r }: GrowVocabulary) {
  const command = (kind: "vent" | "fan" | "heater", grant: GrowVocabulary["g"][keyof GrowVocabulary["g"]]) => transition(device, grant, { fields: { target: required(targets), level: required(level) } }, ({ f, on }) => ({
    guards: [on.in("active"), require(equals(on.slot("kind"), kind), r.wrongDeviceKind), deviceNotFailed(on, r), require(rule("device-target", validTarget("subjects.on.values.kind", "subjects.on.values.minLevel", "subjects.on.values.maxLevel")), r.deviceLimit), permit("device-command", "allowed", { kind: on.slot("kind") })],
    effects: [...on.take(f, "target", "level"), on.ref("targetAt", self), on.capability("device-command", "open", { device: on.slot("kind") })],
  }));
  /** The definition can extend these commission fields, guards and effects. */
  const commission = {
    fields: commissionFields,
    guards: (_: CommissionCtx): readonly Guard[] => [require(rule("device-setup", `fields.minLevel <= fields.maxLevel and (${validTarget("fields.kind", "fields.minLevel", "fields.maxLevel")})`), r.deviceLimit)],
    effects: ({ f, on }: CommissionCtx): readonly EffectForm[] => [...on.take(f, "kind", "label", "minLevel", "maxLevel", "target", "level"), on.ref("targetAt", self)],
  };
  return {
    commission,
    acts: {
      "commission-device": open(device, g.configure, { fields: commission.fields }, (ctx) => ({ guards: commission.guards(ctx), effects: commission.effects(ctx) })),
      "set-vent": command("vent", g.climate), "set-fan": command("fan", g.climate), "set-heater": command("heater", g.heat),
      "report-device": transition(device, g.sense, { fields: { reported: required(reported), level: required(level), description: required(text(1024)) } }, ({ f, on }) => ({
        guards: [on.in("active"), require(rule("device-report",
          "(fields.reported = 'error' and $length(fields.description) > 0) or " +
          "(fields.description = '' and (((subjects.on.values.kind = 'vent') and " +
          "fields.reported in ['open', 'closed']) or ((subjects.on.values.kind in ['fan', " +
          "'heater']) and fields.reported in ['on', 'off'])) and ((fields.reported in " +
          "['closed', 'off'] and fields.level = 0) or (fields.reported in ['open', 'on'] " +
          "and fields.level >= 1 and (subjects.on.values.kind != 'heater' or fields.level = " +
          "100))))"
        ), r.invalidDeviceReport)],
        effects: [on.value("reported", f.reported), on.value("reportedLevel", f.level), on.value("description", f.description), on.value("reportedTime", now), on.ref("reportedAt", self)],
      })),
    },
  };
}

// ================================================================ bench and task work

const METRICS = ["moisture", "ec", "ph", "height", "insects", "note"] as const;
const metric = { moisture: int(0, 100), ec: int(0, 10000), ph: int(0, 1400), height: int(0, 5000), insects: int(0, 10000), note: text(1024) } as const;

/** Items the work module refers to: the definition passes its own. */
export interface WorkDeps { zone: ItemDef<"zone">; device: ItemDef<"device", ItemType & { states: { active: object } }>; alert: ItemDef<"alert", ItemType & { states: { open: object; held: object; authorized: object }; refs: { zone: object } }> }

export function workForms(under: string, deps: WorkDeps, { g, r }: GrowVocabulary) {
  const probe = fact(under, "probe");
  const bench = item("bench", {
    many: 100,
    initial: "stale", states: { stale: live, fresh: live },
    refs: {
      zone: ref.fixed(itemOf(deps.zone)), lastProbe: ref.optional(probe),
      moistureAt: ref.optional(probe), ecAt: ref.optional(probe), phAt: ref.optional(probe), heightAt: ref.optional(probe), insectsAt: ref.optional(probe), noteAt: ref.optional(probe),
    },
    values: {
      label: value.fixed(text(80)), row: value.fixed(enumOf(..."ABCDEFGHIJ")), column: value.fixed(int(1, 10)),
      moisture: value.optional(metric.moisture), ec: value.optional(metric.ec), ph: value.optional(metric.ph), height: value.optional(metric.height), insects: value.optional(metric.insects), note: value.optional(metric.note),
      probeTime: value.optional(time), staleAt: value.optional(time),
    },
  });
  const task = item("task", {
    many: 32,
    initial: "offered", states: { offered: live, taken: live, done: final },
    parties: { performer: author(party.optional) },
    refs: { device: ref.fixed(itemOf(deps.device)), zone: ref.fixed(itemOf(deps.zone)), alert: ref.fixed(itemOf(deps.alert)), reportAt: ref.optional(fact(under, "report-task")) },
    values: { text: value.fixed(text(1024)), report: value.optional(text(2048)), reportTime: value.optional(time) },
  });
  return {
    items: [bench, task] as const, bench, task,
    acts: {
      "commission-bench": open(bench, g.configure, { also: { zone: by(deps.zone) },
        fields: { label: required(text(80)), row: required(enumOf(..."ABCDEFGHIJ")), column: required(int(1, 10)) } }, ({ f, on }) => ({
        guards: [require(none(bench, ["stale", "fresh"], (b) => [equals(b.slot("row"), f.row), equals(b.slot("column"), f.column)]), r.benchExists)],
        effects: [...on.take(f, "label", "row", "column", "zone")],
      })),
      /**
 * Each supplied reading keeps its entry reference. An omitted reading keeps
 * its previous value and entry reference.
 */
      probe: transition(bench, g.tend, { fields: { moisture: optional(metric.moisture), ec: optional(metric.ec), ph: optional(metric.ph), height: optional(metric.height), insects: optional(metric.insects), note: optional(metric.note) } }, ({ f, on }) => ({
        guards: [on.in("stale", "fresh"), require(rule("probe-content", `$exists(fields.moisture) or $exists(fields.ec) or $exists(fields.ph) or $exists(fields.height) or $exists(fields.insects) or (${notEmpty("note")})`), r.emptyProbe)],
        effects: [
          ...METRICS.flatMap((m) => { const present = differs(f[m], null); return [when(on.value(m, f[m]), { if: [present] }), when(on.ref(`${m}At`, self), { if: [present] })]; }),
          on.to("fresh"), on.value("probeTime", now), on.value("staleAt", plusSeconds(172800)), on.ref("lastProbe", self),
        ],
      })),
      "offer-task": open(task, g.climate, { fields: { text: required(text(1024)) }, also: { device: by(deps.device), alert: by(deps.alert) } }, ({ f, on, also }) => ({
        guards: [also.device.in("active"), also.alert.in("open", "held", "authorized"), require(equals(also.device.slot("zone"), also.alert.slot("zone")), r.wrongTaskZone)],
        effects: [on.ref("device", f.device), on.ref("alert", f.alert), on.ref("zone", also.device.slot("zone")), on.value("text", f.text)],
      })),
      "take-task": transition(task, g.tend, {}, ({ on }) => ({ guards: [on.in("offered")], effects: [on.to("taken"), on.party("performer", signer)] })),
      "report-task": transition(task, g.tend, { fields: { report: required(text(2048)) } }, ({ f, on }) => ({
        guards: [on.in("taken"), on.signer("performer"), require(rule("task-report-content", notEmpty("report")), r.emptyTaskReport)],
        effects: [on.to("done"), on.value("report", f.report), on.value("reportTime", now), on.ref("reportAt", self)],
      })),
    },
    timed: { "bench-stale": timed(bench, { states: ["fresh"], deadline: "staleAt", effects: (b) => [b.to("stale")] }) },
  };
}

// ================================================================ watering

export interface WateringDeps { zone: ItemDef<"zone">; bench: ItemDef<"bench", ItemType & { refs: { zone: object } }> }

export function wateringForms(under: string, deps: WateringDeps, { g, r }: GrowVocabulary) {
  const policyFields = { opensAt: required(time), closesAt: required(time), maxMl: required(int(1, 10000)) };
  const waterPolicy = item("water-policy", { initial: "active", states: { active: live }, values: { opensAt: value.required(time), closesAt: value.required(time), maxMl: value.required(int(1, 10000)) } });
  const watering = item("watering", {
    many: 32,
    initial: "asked", states: { asked: live, approved: live, declined: final, done: final },
    parties: { decidedBy: party.optional, performedBy: author(party.optional) },
    refs: {
      zone: ref.fixed(itemOf(deps.zone)), bench: ref.optional(itemOf(deps.bench)), basis: ref.optional(fact(under, "probe")),
      decisionAt: ref.optional(fact(under, "approve-watering", "decline-watering")), performedAt: ref.optional(fact(under, "water", "fulfill-watering")),
    },
    values: { amountMl: value.fixed(int(1, 10000)), mode: value.fixed(enumOf("scheduled", "requested")), reason: value.fixed(text(1024)), decision: value.optional(text(1024)), performedTime: value.optional(time) },
  });
  const setPolicy = ({ f, on }: { on: Of<typeof waterPolicy>; f: FieldRefs<typeof policyFields> }) => [...on.take(f, "opensAt", "closesAt", "maxMl")];
  const decide = (state: "approved" | "declined") => transition(watering, g.waterMore, { fields: { decision: required(text(1024)) } }, ({ f, on }) => ({
    guards: [on.in("asked")],
    effects: [on.to(state), on.party("decidedBy", signer), on.value("decision", f.decision), on.ref("decisionAt", self)],
  }));
  const performed = (on: Of<typeof watering>) => [on.party("performedBy", signer), on.value("performedTime", now), on.ref("performedAt", self)];
  return {
    items: [waterPolicy, watering] as const, waterPolicy, watering,
    acts: {
      "configure-watering": open(waterPolicy, g.configure, { fields: policyFields }, (ctx) => ({ guards: [require(rule("water-window", "fields.opensAt < fields.closesAt"), r.invalidWaterWindow)], effects: setPolicy(ctx) })),
      "set-water-policy": transition(waterPolicy, g.waterMore, { fields: policyFields }, (ctx) => ({ guards: [ctx.on.in("active"), require(rule("water-window", "fields.opensAt < fields.closesAt"), r.invalidWaterWindow)], effects: setPolicy(ctx) })),
      water: open(watering, g.water, { fields: { amountMl: required(int(1, 10000)), reason: required(text(1024)) }, also: { zone: by(deps.zone), policy: one(waterPolicy) } }, ({ f, on, also }) => ({
        guards: [also.policy.in("active"), also.policy.after("opensAt"), also.policy.before("closesAt"), require(rule("water-amount", "$exists(subjects.`also.policy`) and fields.amountMl <= subjects.`also.policy`.values.maxMl"), r.wateringExceedsSchedule)],
        effects: [on.to("done"), on.ref("zone", f.zone), on.value("amountMl", f.amountMl), on.value("mode", constant("scheduled")), on.value("reason", f.reason), ...performed(on)],
      })),
      "request-watering": open(watering, g.water, {
        fields: { amountMl: required(int(1, 10000)), reason: required(text(1024)), basis: required(fact(under, "probe")) },
        also: { zone: by(deps.zone), bench: by(deps.bench) },
      }, ({ f, on, also }) => ({
        guards: [
          isFact(f.basis), require(equals(part(f.basis, "scope"), theScope), r.wrongWateringRoom),
            require(equals(part(f.basis, "on"), f.bench), r.wrongWateringBench),
          require(equals(also.bench.slot("zone"), f.zone), r.wrongWateringZone),
            require(rule("water-request-content", notEmpty("reason")), r.emptyWateringReason),
        ],
        effects: [on.ref("zone", f.zone), on.ref("bench", f.bench), on.ref("basis", f.basis), on.value("amountMl", f.amountMl), on.value("mode", constant("requested")), on.value("reason", f.reason)],
      })),
      "approve-watering": decide("approved"), "decline-watering": decide("declined"),
      "fulfill-watering": transition(watering, g.water, {}, ({ on }) => ({ guards: [on.in("approved")], effects: [on.to("done"), ...performed(on)] })),
      /** A member records chemical work. This act commands no provider. */
      apply: comment(null, g.apply, { fields: { zone: required(itemOf(deps.zone)), product: required(text(80)), rate: required(text(80)), reason: required(text(1024)) } }),
    },
  };
}

// ================================================================ presence

export const PRESENCE_LIMIT = 32;
export function presenceForms(under: string, roomItem: ItemDef<"room">, { g, r }: GrowVocabulary) {
  const presence = item("presence", {
    many: PRESENCE_LIMIT,
    initial: "unknown", states: { unknown: live, present: live, away: live },
    parties: { member: party.fixed },
    refs: { room: ref.optional(itemOf(roomItem)), reportedAt: ref.optional(fact(under, "arrive", "leave")) },
  });
  const owner = (p: Of<typeof presence>) => require(equals(p.slot("member"), signer), r.notPresenceMember);
  const room = { room: required(itemOf(roomItem)) };
  return {
    presence,
    acts: {
      "provision-presence": open(presence, g.configure, { fields: { member: required(member) } }, ({ f, on }) => ({
        guards: [require(none(presence, ["unknown", "present", "away"], (p) => [equals(p.slot("member"), f.member)]), r.presenceExists)],
        effects: [on.party("member", f.member)],
      })),
      arrive: transition(presence, g.tend, { fields: room }, ({ f, on }) => ({
        guards: [owner(on), on.in("unknown", "present", "away")], effects: [on.to("present"), on.ref("room", f.room), on.ref("reportedAt", self)],
      })),
      leave: transition(presence, g.tend, { fields: room }, ({ f, on }) => ({
        guards: [owner(on), require(on.in("present"), r.presenceNotPresent),
            require(equals(on.slot("room"), f.room), r.wrongPresenceRoom)], effects: [on.to("away"), on.ref("reportedAt", self)],
      })),
    },
  };
}
