/**
 * The grow modules in the v2 vocabulary: zone, device, bench and task work,
 * watering, presence. Each is a function of what flows down from the
 * definition that uses it: the name its facts are under, and the items it
 * refers to. examples/grow/{zone,device,work,watering,presence}.ts are the
 * originals; grow-room.ts and grow-site.ts compose these as room.ts and
 * site.ts compose those.
 */
import { DEVICE_COMMAND } from "@generalbusiness/dap-contract";
import type { EffectForm, Guard, ItemType } from "@generalbusiness/dap-contract";
import {
  anyOf, author, by, comment, constant, differs, enumOf, equals, fact, final, int, isFact, item, itemOf, list, live, member, none, now, one, open, optional, owned, part, party, permit, plusSeconds, range, record, ref,
  refuse, required, rule, self, signer, text, theScope, time, timed, transition, value, when, type FieldRefs, type ItemDef, type Of,
} from "./lib.ts";

type RefSlots = ItemType["refs"];
const notEmpty = (field: string) => `$length(fields.${field}) > 0 and $not($contains(" \\t\\r\\n", $substring(fields.${field}, 0, 1)))`;

// ================================================================ zone

const temperature = int(-4000, 8000), inBandCount = int(0, 25), bandWidth = int(1, 2000);
const zones = list(record({ zone: required(itemOf("zone")), min: required(temperature), max: required(temperature), mean: required(temperature), inBand: required(inBandCount) }), 4);

/** A zone; `refs` adds the definition's own references (the room binds its devices). */
export const zoneItem = <const R extends RefSlots = {}>(under: string, refs: R = {} as R) => item("zone", {
  many: 4,
  states: { unobserved: live, "in-band": live, "out-of-band": live },
  refs: { summary: ref.optional(fact(under, "observe")), ...refs },
  values: {
    label: value.fixed(text(80)), setpoint: value.required(temperature), band: value.required(bandWidth),
    min: value.optional(temperature), max: value.optional(temperature), mean: value.optional(temperature), inBand: value.optional(inBandCount), summaryTime: value.optional(time),
  },
});
type Zone = ReturnType<typeof zoneItem>;
const anyZoneState = (z: Of<Zone>) => z.in("unobserved", "in-band", "out-of-band");

export function zoneActs(zone: Zone, under: string) {
  return {
    acts: {
      "commission-zone": open(zone, "grow.configure", { fields: { label: required(text(80)), setpoint: required(temperature), band: required(bandWidth) } }, ({ f, on }) => ({
        effects: [on.value("label", f.label), on.value("setpoint", f.setpoint), on.value("band", f.band)],
      })),
      /** A sensor's summary of every zone: a comment on no item, which report-zone presents as its evidence. */
      observe: comment(null, "grow.sense", { fields: { sampledAt: required(time), zones: required(zones) } }),
      "report-zone": transition(zone, "grow.sense", {
        fields: { summary: required(fact(under, "observe")), sampledAt: required(time), zones: required(zones), min: required(temperature), max: required(temperature), mean: required(temperature), inBand: required(inBandCount) },
      }, ({ f, on }) => {
        const allIn = equals(f.inBand, constant(25));
        return {
          guards: [
            anyZoneState(on), isFact(f.summary),
            refuse("wrong-summary-room", equals(part(f.summary, "scope"), theScope)),
            refuse("summary-mismatch", equals(part(f.summary, { field: "zones" }), f.zones)),
            refuse("summary-mismatch", equals(part(f.summary, { field: "sampledAt" }), f.sampledAt)),
            refuse("invalid-zone-evidence", rule("zone-evidence")), refuse("stale-zone-summary", rule("zone-order")), refuse("no-band-crossing", rule("zone-crossing")),
          ],
          effects: [
            when(on.to("in-band"), { if: [allIn] }), when(on.to("out-of-band"), { unless: [allIn] }),
            on.value("min", f.min), on.value("max", f.max), on.value("mean", f.mean), on.value("inBand", f.inBand), on.value("summaryTime", f.sampledAt), on.ref("summary", f.summary),
          ],
        };
      }),
      "set-band": transition(zone, "grow.heat", { fields: { setpoint: required(temperature), band: required(bandWidth) } }, ({ f, on }) => ({
        guards: [anyZoneState(on)],
        // Old summary bytes remain evidence of the old classification; sensors must report the new band before the state can say.
        effects: [on.value("setpoint", f.setpoint), on.value("band", f.band), on.to("unobserved")],
      })),
    },
    rules: {
      "zone-evidence": "($id := subjects.on.id; $z := fields.zones[zone = $id]; $lo := subjects.on.values.setpoint - subjects.on.values.band; $hi := subjects.on.values.setpoint + subjects.on.values.band; $count($z) = 1 and fields.min = $z.min and fields.max = $z.max and fields.mean = $z.mean and fields.inBand = $z.inBand and fields.min <= fields.mean and fields.mean <= fields.max and ((fields.min >= $lo and fields.max <= $hi) ? fields.inBand = 25 : ((fields.max < $lo or fields.min > $hi) ? fields.inBand = 0 : ((fields.min < $lo and fields.max > $hi) ? fields.inBand <= 23 : (fields.inBand >= 1 and fields.inBand <= 24)))))",
      "zone-crossing": "subjects.on.state = 'unobserved' or (fields.inBand = 25 ? subjects.on.state = 'out-of-band' : subjects.on.state = 'in-band')",
      "zone-order": "subjects.on.refs.summary = null or (fields.sampledAt >= subjects.on.values.summaryTime and (fields.summary > subjects.on.refs.summary or (fields.summary = subjects.on.refs.summary and subjects.on.state = 'unobserved')))",
    },
  };
}

// ================================================================ device

const level = int(0, 100);
const kinds = enumOf("vent", "fan", "heater");
const targets = enumOf("open", "closed", "on", "off");
const reported = enumOf("open", "closed", "on", "off", "error");

/** A device; `targetActs` names the definition's other acts that set a target; `refs` adds its references. */
export const deviceItem = <const R extends RefSlots = {}>(under: string, targetActs: readonly string[] = [], refs: R = {} as R) => item("device", {
  many: 12,
  states: { active: live },
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
export const deviceNotFailed = (d: Of<Device>) => refuse("device-error", anyOf([d.unset("reported")], [d.differs(d.slot("reported"), constant("error"))]));

function validTarget(kind: string, minimum: string, maximum: string): string {
  return `(((${kind} = 'vent') and fields.target in ['open', 'closed']) or ((${kind} in ['fan', 'heater']) and fields.target in ['on', 'off'])) and ((fields.target in ['closed', 'off'] and fields.level = 0) or (fields.target in ['open', 'on'] and fields.level >= 1 and fields.level >= ${minimum} and fields.level <= ${maximum} and (${kind} != 'heater' or fields.level = 100)))`;
}

const commissionFields = { kind: required(kinds), label: required(text(80)), minLevel: required(level), maxLevel: required(level), target: required(targets), level: required(level) };
type CommissionCtx = { on: Of<Device>; f: FieldRefs<typeof commissionFields> };

export function deviceActs(device: Device) {
  const command = (kind: "vent" | "fan" | "heater", grant: string) => transition(device, grant, { fields: { target: required(targets), level: required(level) } }, ({ f, on }) => ({
    guards: [on.in("active"), refuse("wrong-device-kind", equals(on.slot("kind"), constant(kind))), deviceNotFailed(on), refuse("device-limit", rule("device-target")), permit("device-command", "allowed", { kind: on.slot("kind") })],
    effects: [on.value("target", f.target), on.value("level", f.level), on.ref("targetAt", self), on.capability("device-command", "open", { device: on.slot("kind") })],
  }));
  /** The parts of commission-device, for a definition that adds fields, subjects, guards and effects of its own. */
  const commission = {
    fields: commissionFields,
    guards: (_: CommissionCtx): readonly Guard[] => [refuse("device-limit", rule("device-setup"))],
    effects: ({ f, on }: CommissionCtx): readonly EffectForm[] => [on.value("kind", f.kind), on.value("label", f.label), on.value("minLevel", f.minLevel), on.value("maxLevel", f.maxLevel), on.value("target", f.target), on.value("level", f.level), on.ref("targetAt", self)],
  };
  return {
    commission,
    acts: {
      "commission-device": open(device, "grow.configure", { fields: commission.fields }, (ctx) => ({ guards: commission.guards(ctx), effects: commission.effects(ctx) })),
      "set-vent": command("vent", "grow.climate"), "set-fan": command("fan", "grow.climate"), "set-heater": command("heater", "grow.heat"),
      "report-device": transition(device, "grow.sense", { fields: { reported: required(reported), level: required(level), description: required(text(1024)) } }, ({ f, on }) => ({
        guards: [on.in("active"), refuse("invalid-device-report", rule("device-report"))],
        effects: [on.value("reported", f.reported), on.value("reportedLevel", f.level), on.value("description", f.description), on.value("reportedTime", now), on.ref("reportedAt", self)],
      })),
    },
    rules: {
      "device-setup": `fields.minLevel <= fields.maxLevel and (${validTarget("fields.kind", "fields.minLevel", "fields.maxLevel")})`,
      "device-target": validTarget("subjects.on.values.kind", "subjects.on.values.minLevel", "subjects.on.values.maxLevel"),
      "device-report": "(fields.reported = 'error' and $length(fields.description) > 0) or (fields.description = '' and (((subjects.on.values.kind = 'vent') and fields.reported in ['open', 'closed']) or ((subjects.on.values.kind in ['fan', 'heater']) and fields.reported in ['on', 'off'])) and ((fields.reported in ['closed', 'off'] and fields.level = 0) or (fields.reported in ['open', 'on'] and fields.level >= 1 and (subjects.on.values.kind != 'heater' or fields.level = 100))))",
    },
  };
}

// ================================================================ bench and task work

const METRICS = ["moisture", "ec", "ph", "height", "insects", "note"] as const;
const metric = { moisture: int(0, 100), ec: int(0, 10000), ph: int(0, 1400), height: int(0, 5000), insects: int(0, 10000), note: text(1024) } as const;

/** Items the work module refers to: the definition passes its own. */
export interface WorkDeps { zone: ItemDef<"zone">; device: ItemDef<"device", ItemType & { states: { active: object } }>; alert: ItemDef<"alert", ItemType & { states: { open: object; held: object; authorized: object }; refs: { zone: object } }> }

export function workForms(under: string, deps: WorkDeps) {
  const probe = fact(under, "probe");
  const bench = item("bench", {
    many: 100,
    states: { stale: live, fresh: live },
    refs: {
      zone: ref.fixed(itemOf("zone")), lastProbe: ref.optional(probe),
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
    states: { offered: live, taken: live, done: final },
    parties: { performer: author(party.optional) },
    refs: { device: ref.fixed(itemOf("device")), zone: ref.fixed(itemOf("zone")), alert: ref.fixed(itemOf("alert")), reportAt: ref.optional(fact(under, "report-task")) },
    values: { text: value.fixed(text(1024)), report: value.optional(text(2048)), reportTime: value.optional(time) },
  });
  return {
    items: [bench, task] as const, bench, task,
    acts: {
      "commission-bench": open(bench, "grow.configure", { also: { zone: by(deps.zone, "zone") },
        fields: { zone: required(itemOf("zone")), label: required(text(80)), row: required(enumOf(..."ABCDEFGHIJ")), column: required(int(1, 10)) } }, ({ f, on }) => ({
        guards: [refuse("bench-exists", none(range(bench, ["stale", "fresh"], { where: (b) => [equals(b.slot("row"), f.row), equals(b.slot("column"), f.column)] })))],
        effects: [on.value("label", f.label), on.value("row", f.row), on.value("column", f.column), on.ref("zone", f.zone)],
      })),
      /** Each supplied reading keeps its own entry reference; absent readings are not invented. */
      probe: transition(bench, "grow.tend", { fields: { moisture: optional(metric.moisture), ec: optional(metric.ec), ph: optional(metric.ph), height: optional(metric.height), insects: optional(metric.insects), note: optional(metric.note) } }, ({ f, on }) => ({
        guards: [on.in("stale", "fresh"), refuse("empty-probe", rule("probe-content"))],
        effects: [
          ...METRICS.flatMap((m) => { const present = differs(f[m], { none: true }); return [when(on.value(m, f[m]), { if: [present] }), when(on.ref(`${m}At`, self), { if: [present] })]; }),
          on.to("fresh"), on.value("probeTime", now), on.value("staleAt", plusSeconds(172800)), on.ref("lastProbe", self),
        ],
      })),
      "offer-task": open(task, "grow.climate", { fields: { device: required(itemOf("device")), alert: required(itemOf("alert")), text: required(text(1024)) }, also: { device: by(deps.device, "device"), alert: by(deps.alert, "alert") } }, ({ f, on, also }) => ({
        guards: [also.device.in("active"), also.alert.in("open", "held", "authorized"), refuse("wrong-task-zone", equals(also.device.slot("zone"), also.alert.slot("zone")))],
        effects: [on.ref("device", f.device), on.ref("alert", f.alert), on.ref("zone", also.device.slot("zone")), on.value("text", f.text)],
      })),
      "take-task": transition(task, "grow.tend", {}, ({ on }) => ({ guards: [on.in("offered")], effects: [on.to("taken"), on.party("performer", signer)] })),
      "report-task": transition(task, "grow.tend", { fields: { report: required(text(2048)) } }, ({ f, on }) => ({
        guards: [on.in("taken"), on.signer("performer"), refuse("empty-task-report", rule("task-report-content"))],
        effects: [on.to("done"), on.value("report", f.report), on.value("reportTime", now), on.ref("reportAt", self)],
      })),
    },
    rules: { "probe-content": `$exists(fields.moisture) or $exists(fields.ec) or $exists(fields.ph) or $exists(fields.height) or $exists(fields.insects) or (${notEmpty("note")})`, "task-report-content": notEmpty("report") },
    timed: { "bench-stale": timed(bench, { states: ["fresh"], deadline: "staleAt", effects: (b) => [b.to("stale")] }) },
  };
}

// ================================================================ watering

export interface WateringDeps { zone: ItemDef<"zone">; bench: ItemDef<"bench", ItemType & { refs: { zone: object } }> }

export function wateringForms(under: string, deps: WateringDeps) {
  const policyFields = { opensAt: required(time), closesAt: required(time), maxMl: required(int(1, 10000)) };
  const waterPolicy = item("water-policy", { states: { active: live }, values: { opensAt: value.required(time), closesAt: value.required(time), maxMl: value.required(int(1, 10000)) } });
  const watering = item("watering", {
    many: 32,
    states: { asked: live, approved: live, declined: final, done: final },
    parties: { decidedBy: party.optional, performedBy: author(party.optional) },
    refs: {
      zone: ref.fixed(itemOf("zone")), bench: ref.optional(itemOf("bench")), basis: ref.optional(fact(under, "probe")),
      decisionAt: ref.optional(fact(under, "approve-watering", "decline-watering")), performedAt: ref.optional(fact(under, "water", "fulfill-watering")),
    },
    values: { amountMl: value.fixed(int(1, 10000)), mode: value.fixed(enumOf("scheduled", "requested")), reason: value.fixed(text(1024)), decision: value.optional(text(1024)), performedTime: value.optional(time) },
  });
  const setPolicy = ({ f, on }: { on: Of<typeof waterPolicy>; f: FieldRefs<typeof policyFields> }) => [on.value("opensAt", f.opensAt), on.value("closesAt", f.closesAt), on.value("maxMl", f.maxMl)];
  const decide = (state: "approved" | "declined") => transition(watering, "grow.water-more", { fields: { decision: required(text(1024)) } }, ({ f, on }) => ({
    guards: [on.in("asked")],
    effects: [on.to(state), on.party("decidedBy", signer), on.value("decision", f.decision), on.ref("decisionAt", self)],
  }));
  const performed = (on: Of<typeof watering>) => [on.party("performedBy", signer), on.value("performedTime", now), on.ref("performedAt", self)];
  return {
    items: [waterPolicy, watering] as const, waterPolicy, watering,
    acts: {
      "configure-watering": open(waterPolicy, "grow.configure", { fields: policyFields }, (ctx) => ({ guards: [refuse("invalid-water-window", rule("water-window"))], effects: setPolicy(ctx) })),
      "set-water-policy": transition(waterPolicy, "grow.water-more", { fields: policyFields }, (ctx) => ({ guards: [ctx.on.in("active"), refuse("invalid-water-window", rule("water-window"))], effects: setPolicy(ctx) })),
      water: open(watering, "grow.water", { fields: { zone: required(itemOf("zone")), amountMl: required(int(1, 10000)), reason: required(text(1024)) }, also: { zone: by(deps.zone, "zone"), policy: one(waterPolicy) } }, ({ f, on, also }) => ({
        guards: [also.policy.in("active"), also.policy.after("opensAt"), also.policy.before("closesAt"), refuse("watering-exceeds-schedule", rule("water-amount"))],
        effects: [on.to("done"), on.ref("zone", f.zone), on.value("amountMl", f.amountMl), on.value("mode", constant("scheduled")), on.value("reason", f.reason), ...performed(on)],
      })),
      "request-watering": open(watering, "grow.water", {
        fields: { zone: required(itemOf("zone")), amountMl: required(int(1, 10000)), reason: required(text(1024)), bench: required(itemOf("bench")), basis: required(fact(under, "probe")) },
        also: { zone: by(deps.zone, "zone"), bench: by(deps.bench, "bench") },
      }, ({ f, on, also }) => ({
        guards: [
          isFact(f.basis), refuse("wrong-watering-room", equals(part(f.basis, "scope"), theScope)), refuse("wrong-watering-bench", equals(part(f.basis, "on"), f.bench)),
          refuse("wrong-watering-zone", equals(also.bench.slot("zone"), f.zone)), refuse("empty-watering-reason", rule("water-request-content")),
        ],
        effects: [on.ref("zone", f.zone), on.ref("bench", f.bench), on.ref("basis", f.basis), on.value("amountMl", f.amountMl), on.value("mode", constant("requested")), on.value("reason", f.reason)],
      })),
      "approve-watering": decide("approved"), "decline-watering": decide("declined"),
      "fulfill-watering": transition(watering, "grow.water", {}, ({ on }) => ({ guards: [on.in("approved")], effects: [on.to("done"), ...performed(on)] })),
      /** A member's statement of chemical work; no provider is actuated. */
      apply: comment(null, "grow.apply", { fields: { zone: required(itemOf("zone")), product: required(text(80)), rate: required(text(80)), reason: required(text(1024)) } }),
    },
    rules: { "water-window": "fields.opensAt < fields.closesAt", "water-amount": "$exists(subjects.`also.policy`) and fields.amountMl <= subjects.`also.policy`.values.maxMl", "water-request-content": notEmpty("reason") },
  };
}

// ================================================================ presence

export const PRESENCE_LIMIT = 32;
export function presenceForms(under: string) {
  const presence = item("presence", {
    many: PRESENCE_LIMIT,
    states: { unknown: live, present: live, away: live },
    parties: { member: party.fixed },
    refs: { room: ref.optional(itemOf("room")), reportedAt: ref.optional(fact(under, "arrive", "leave")) },
  });
  const owner = (p: Of<typeof presence>) => refuse("not-presence-member", equals(p.slot("member"), signer));
  const room = { room: required(itemOf("room")) };
  return {
    presence,
    acts: {
      "provision-presence": open(presence, "grow.configure", { fields: { member: required(member) } }, ({ f, on }) => ({
        guards: [refuse("presence-exists", none(range(presence, ["unknown", "present", "away"], { where: (p) => [equals(p.slot("member"), f.member)] })))],
        effects: [on.party("member", f.member)],
      })),
      arrive: transition(presence, "grow.tend", { fields: room }, ({ f, on }) => ({
        guards: [owner(on), on.in("unknown", "present", "away")], effects: [on.to("present"), on.ref("room", f.room), on.ref("reportedAt", self)],
      })),
      leave: transition(presence, "grow.tend", { fields: room }, ({ f, on }) => ({
        guards: [owner(on), refuse("presence-not-present", on.in("present")), refuse("wrong-presence-room", equals(on.slot("room"), f.room))], effects: [on.to("away"), on.ref("reportedAt", self)],
      })),
    },
  };
}
