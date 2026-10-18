/** Actual native validator, restricted rules, judges, seal/fold and replay.
 * Grants and the separate scenario-owner outcomes are explicit stand-ins;
 * no native membership, device, transport or operation owner is witnessed. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest, type RetainedInput } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, digestBytes } from "@generalbusiness/artroom-bytes";
import { prepareRules, validateDefinition } from "@generalbusiness/dap-derive";
import { evaluateRules, RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { created, grantOf, keys, valid, type Actor, type Ledger, type Over } from "@generalbusiness/dap-derive/testing";
import { MemorySource, verify } from "@generalbusiness/artroom-replay";
import { deviceForms } from "./device.ts";

const under = "grow-device-fixture", forms = deviceForms(under);
const definition: DeclaredDefinition = { format: "artroom-definition-1", name: under, profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
  items: { root: { many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: {}, refs: {}, values: {} }, device: forms.item },
  acts: { establish: { step: "open", on: "root", grant: "grow.configure", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] }, ...forms.acts }, receives: {}, timed: {}, rules: forms.rules };
const operator = keys.paul, climate = keys.una, sensors: Actor = { ...keys.vic, principal: operator.member };
const permissions = [[operator, ["grow.configure", "grow.climate", "grow.heat"]], [climate, ["grow.climate"]], [sensors, ["grow.sense"]]] as const;
const retained = new WeakMap<Ledger, Map<Digest, RetainedInput>>();
function make(): Ledger {
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
  const ledger = created(valid(checked), {});
  retained.set(ledger, new Map());
  ledger.grants = () => permissions.map(([who, actions]) => ({ grant: grantOf(who, ledger.at, actions), current: true }));
  return ledger;
}
async function submit(ledger: Ledger, who: Actor, kind: string, over: Over = {}) {
  const signed = ledger.intent(who, kind, over), context = ledger.context();
  const inputs = prepareRules(ledger.state, ledger.definition, { act: signed, context }), prepared = await evaluateRules(inputs);
  const result = ledger.submit(signed, { prepared });
  if (result.result === "write") for (const input of inputs) {
    const digest = digestBytes(canonicalBytes(input.input));
    if (result.draft.prepared.some(prepared => prepared.input === digest)) retained.get(ledger)!.set(digest, { kind: "rule", digest, bytes: canonicalize(input.input) });
  }
  return result;
}
const on = (ledger: Ledger, id: number, fields: Record<string, import("@generalbusiness/dap-contract").FieldValue>): Over => ({ on: id, expected: { on: ledger.item(id).revision }, fields });
async function commission(ledger: Ledger, kind: "vent" | "heater", maxLevel = 100): Promise<number> {
  expect(await submit(ledger, operator, "commission-device", { fields: { kind, label: `${kind} 2`, minLevel: 0, maxLevel, target: kind === "vent" ? "closed" : "off", level: 0 } })).toMatchObject({ result: "write" });
  return ledger.last.seq;
}
async function replay(ledger: Ledger) {
  const source = new MemorySource([{ scope: ledger.at, entries: ledger.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })),
    retained: [{ kind: "definition", digest: ledger.definition.digest, bytes: canonicalize(definition) }, ...retained.get(ledger)!.values()] }]);
  return verify(source, { mode: "replay", scope: ledger.at.scope, grants: "as-recorded", bounds: PROPOSED_BOUNDS });
}

test("device target, sensor report and scenario-owner outcome keep separate writers and exact evidence", async () => {
  const ledger = make(), heater = await commission(ledger, "heater");
  expect(ledger.item(heater).values["reported"]).toBeNull();
  const description = "Overcurrent trip; commanded on, reads off.";
  expect(await submit(ledger, sensors, "report-device", on(ledger, heater, { reported: "error", level: 0, description }))).toMatchObject({ result: "write" });
  const failed = structuredClone(ledger.item(heater)), head = ledger.head;
  expect(await submit(ledger, operator, "set-heater", on(ledger, heater, { target: "on", level: 100 }))).toMatchObject({ result: "refused", reason: "guard-failed", name: "device-error" });
  const report = failed.refs["reportedAt"];
  if (typeof report !== "number") expect.fail("the self reference must name its own native report entry");
  const explanation = { refusedAt: head, device: heater, revision: failed.revision, reportedAt: ledger.fact(report), description: failed.values["description"] };
  expect(explanation.description).toBe(description); expect(explanation.reportedAt).toEqual(ledger.fact(head.seq));
  expect(ledger.head).toEqual(head); expect(ledger.item(heater).values["target"]).toBe("off");

  expect(await submit(ledger, sensors, "report-device", on(ledger, heater, { reported: "on", level: 100, description: "" }))).toMatchObject({ result: "write" });
  const reportedAt = ledger.item(heater).refs["reportedAt"];
  expect(await submit(ledger, operator, "set-heater", on(ledger, heater, { target: "off", level: 0 }))).toMatchObject({ result: "write" });
  const command = ledger.fact(ledger.last.seq), afterCommand = structuredClone(ledger.item(heater));
  expect(afterCommand.values).toMatchObject({ target: "off", reported: "on" }); expect(afterCommand.refs["reportedAt"]).toEqual(reportedAt);
  const scenarioOwnerOutcomes = [{ label: "non-native-scenario-owner", command, device: heater, outcome: "confirmed" }];
  expect(scenarioOwnerOutcomes[0]!.command).toEqual(command); expect(ledger.item(heater)).toEqual(afterCommand);
  expect(ledger.item(heater).values).not.toHaveProperty("outcome");
  expect(await submit(ledger, climate, "set-heater", on(ledger, heater, { target: "on", level: 100 }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(await submit(ledger, climate, "set-vent", on(ledger, heater, { target: "open", level: 100 }))).toMatchObject({ result: "refused", reason: "guard-failed", name: "wrong-device-kind" });
  expect(explanation).toMatchObject({ revision: failed.revision, description });
  const result = await replay(ledger); expect([result.report.result, result.why]).toEqual(["consistent", null]); expect(result.report.trusts.join(" ")).toContain("authority");
});

test("climate limits and sensor-only reporting are judged from explicit grants and native guards", async () => {
  const ledger = make(), vent = await commission(ledger, "vent", 70);
  expect(await submit(ledger, climate, "set-vent", on(ledger, vent, { target: "open", level: 71 }))).toMatchObject({ result: "refused", reason: "guard-failed", name: "device-limit" });
  expect(await submit(ledger, climate, "set-vent", on(ledger, vent, { target: "open", level: 70 }))).toMatchObject({ result: "write" });
  expect(await submit(ledger, climate, "report-device", on(ledger, vent, { reported: "closed", level: 0, description: "" }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(await submit(ledger, sensors, "set-vent", on(ledger, vent, { target: "closed", level: 0 }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(await submit(ledger, sensors, "report-device", on(ledger, vent, { reported: "on", level: 100, description: "" }))).toMatchObject({ result: "refused", reason: "guard-failed", name: "invalid-device-report" });
  expect(await submit(ledger, sensors, "report-device", on(ledger, vent, { reported: "error", level: 0, description: "Vane jammed." }))).toMatchObject({ result: "write" });
  expect(await submit(ledger, climate, "set-vent", on(ledger, vent, { target: "closed", level: 0 }))).toMatchObject({ result: "refused", reason: "guard-failed", name: "device-error" });
  expect(ledger.item(vent).values).toMatchObject({ target: "open", level: 70, reported: "error" });
  expect((await replay(ledger)).report.result).toBe("consistent");
});
