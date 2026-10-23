/** Real definition validation and in-memory native judgments, SCRIPTED
 * grants giving both agents the same coarse actions. No install/DO proof. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { demoDefinitions } from "./demo-definitions.ts";
import { nativeScenario, nativeCreatedSite, nativeChild, submit, operator, sensors, climate } from "./test-support.ts";

const coarse = ["grow.sense", "grow.climate"];
const permissions = [[operator, ["grow.configure", "grow.heat", "grow.climate"]], [sensors, coarse], [climate, coarse]] as const;
test("the signed demo forms separate agents sharing one native role, forward exact principals and record fenced scan progress in the existing reading", async () => {
  const { site, room } = demoDefinitions();
  for (const definition of [site, room]) { const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES); expect(checked.ok ? [] : checked.problems).toEqual([]); }
  expect(site.acts["create-room"]!.sends).toEqual(expect.arrayContaining([expect.objectContaining({ create: expect.objectContaining({ definition: definitionDigest(room), fields: expect.objectContaining({ sensors: { slot: "sensors", of: "also.demoSite" }, climate: { slot: "climate", of: "also.demoSite" } }) }) })]));
  const assignments = { label: "TEST demo", sensors: sensors.member, climate: climate.member, operator: operator.member };
  const graph = await nativeCreatedSite(site, permissions, assignments);
  expect(await submit(graph.site, operator, "create-room", { fields: { label: "TEST child" }, expected: { demoSite: graph.site.item(0).revision } })).toMatchObject({ result: "write" });
  const child = await nativeChild(graph.site, graph.site.last.seq, room, permissions);
  expect(child.item(0).parties).toMatchObject({ sensors: sensors.member, climate: climate.member, operator: operator.member });
  const ledger = nativeScenario(room, permissions, assignments);
  const fields = { sampledAt: ledger.now, zones: [], targetBasis: { seq: 0, hash: ledger.fact(0).hash }, commandsAnsweredThrough: { seq: 0, hash: ledger.fact(0).hash } };
  const expected = () => ({ on: ledger.item(0).revision });
  const wrong = await submit(ledger, climate, "observe", { on: 0, fields, expected: expected() });
  expect(wrong).toMatchObject({ result: "refused", reason: "guard-failed", name: "not-demo-sensors" });
  expect(await submit(ledger, sensors, "observe", { on: 0, fields, expected: expected() })).toMatchObject({ result: "write" });
  expect(ledger.item(0)).toMatchObject({ values: { commandsAnsweredThrough: fields.commandsAnsweredThrough, lastSampledAt: ledger.now }, refs: { lastReading: 1 } });
  const stale = { ...fields, commandsAnsweredThrough: { seq: 0, hash: definitionDigest(room) } };
  expect(await submit(ledger, sensors, "observe", { on: 0, fields: stale, expected: expected() })).toMatchObject({ result: "refused", reason: "guard-failed", name: "stale-demo-reading" });
  expect(await submit(ledger, operator, "commission-zone", { fields: { label: "Zone A", setpoint: 2400, band: 200 } })).toMatchObject({ result: "write" });
  const zone = ledger.last.seq;
  expect(await submit(ledger, operator, "commission-device", { fields: { zone, kind: "fan", label: "Fan A", minLevel: 0, maxLevel: 100, target: "off", level: 0 }, expected: { zone: ledger.item(zone).revision } })).toMatchObject({ result: "write" });
  const fan = ledger.last.seq, target = { on: fan, fields: { target: "on", level: 100 }, expected: { on: ledger.item(fan).revision } };
  expect(await submit(ledger, sensors, "set-fan", target)).toMatchObject({ result: "refused", reason: "guard-failed", name: "not-demo-climate" });
  expect(await submit(ledger, climate, "set-fan", target)).toMatchObject({ result: "write" });
});
