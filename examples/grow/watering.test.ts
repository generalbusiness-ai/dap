/** Native recorded watering work. Explicit fixture grants do not exercise
 * membership admission, pumps, chemical handling or provider effects. */
import { expect, test } from "vitest";
import { keyIdOfSecret } from "@generalbusiness/dap-bytes";
import { keys, member, t } from "@generalbusiness/dap-derive/testing";
import { room } from "./room.ts";
import { nativeScenario, devicePermissions, operator, climate, on, replay, submit, type Actor, type Ledger } from "./test-support.ts";
const head = keys.sam, secret = new Uint8Array(32).fill(7), irrigation: Actor = { secret, key: keyIdOfSecret(secret), member: member("irrigation"), principal: head.member };
const permissions = [...devicePermissions, [head, ["grow.water-more", "grow.apply", "grow.water"]], [keys.rita, ["grow.tend"]], [irrigation, ["grow.water"]]] as const;
const wrote = (result: Awaited<ReturnType<typeof submit>>) => expect(result, JSON.stringify(result)).toMatchObject({ result: "write" });
const expected = (ledger: Ledger, items: Record<string, number>) => Object.fromEntries(Object.entries(items).map(([name, id]) => [name, ledger.item(id).revision]));
async function setup(foundingKey = "found") {
  const ledger = nativeScenario(room, permissions, { label: "Room A" }, foundingKey);
  wrote(await submit(ledger, operator, "commission-zone", { fields: { label: "Zone 2", setpoint: 2400, band: 200 } }));
  return { ledger, zone: ledger.last.seq };
}
const policyFields = { opensAt: t(100), closesAt: t(200), maxMl: 400 };
const waterFields = (zone: number, amountMl = 400) => ({ zone, amountMl, reason: "Scheduled irrigation." });

test("scheduled watering requires a policy, an open time window and its amount limit", async () => {
  const { ledger, zone } = await setup();
  expect(await submit(ledger, irrigation, "water", { expected: expected(ledger, { zone }), fields: waterFields(zone) })).toMatchObject({ result: "refused", reason: "guard-failed" });
  expect(await submit(ledger, operator, "configure-watering", { fields: { ...policyFields, closesAt: t(100) } })).toMatchObject({ result: "refused", reason: "guard-failed", name: "invalid-water-window" });
  wrote(await submit(ledger, operator, "configure-watering", { fields: policyFields })); const policy = ledger.last.seq;
  for (const time of [99, 100, 200]) {
    ledger.now = t(time);
    expect(await submit(ledger, irrigation, "water", { expected: expected(ledger, { zone, policy }), fields: waterFields(zone) })).toMatchObject({ result: "refused", reason: "guard-failed" });
  }
  ledger.now = t(101);
  expect(await submit(ledger, irrigation, "water", { expected: expected(ledger, { zone, policy }), fields: waterFields(zone, 401) })).toMatchObject({ result: "refused", reason: "guard-failed", name: "watering-exceeds-schedule" });
  expect(await submit(ledger, climate, "water", { expected: expected(ledger, { zone, policy }), fields: waterFields(zone) })).toMatchObject({ result: "refused", reason: "unauthorized" });
  wrote(await submit(ledger, irrigation, "water", { expected: expected(ledger, { zone, policy }), fields: waterFields(zone) }));
  expect(ledger.item(ledger.last.seq)).toMatchObject({ state: "done", values: { amountMl: 400, mode: "scheduled", performedTime: t(101) }, refs: { zone, performedAt: ledger.last.seq }, parties: { performedBy: irrigation.member } });
  expect(await submit(ledger, irrigation, "set-water-policy", on(ledger, policy, { ...policyFields, maxMl: 800 }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  wrote(await submit(ledger, head, "set-water-policy", on(ledger, policy, { ...policyFields, maxMl: 800 })));
  expect((await replay(ledger)).report.result).toBe("consistent");
});

test("an exception needs a head-grower decision before the irrigation member records fulfillment", async () => {
  const { ledger, zone } = await setup();
  wrote(await submit(ledger, operator, "commission-bench", { expected: expected(ledger, { zone }), fields: { zone, label: "D4", row: "D", column: 4 } })); const bench = ledger.last.seq;
  wrote(await submit(ledger, keys.rita, "probe", on(ledger, bench, { ec: 2800 }))); const basis = ledger.fact(ledger.last.seq);
  const fields = { zone, bench, amountMl: 800, reason: "Early watering after the tender's high-EC report.", basis };
  wrote(await submit(ledger, operator, "commission-bench", { expected: expected(ledger, { zone }), fields: { zone, label: "D5", row: "D", column: 5 } })); const otherBench = ledger.last.seq;
  expect(await submit(ledger, irrigation, "request-watering", { expected: expected(ledger, { zone, bench: otherBench }), fields: { ...fields, bench: otherBench } })).toMatchObject({ result: "refused", reason: "guard-failed", name: "wrong-watering-bench" });
  wrote(await submit(ledger, operator, "commission-zone", { fields: { label: "Zone 3", setpoint: 2400, band: 200 } })); const otherZone = ledger.last.seq;
  expect(await submit(ledger, irrigation, "request-watering", { expected: expected(ledger, { zone: otherZone, bench }), fields: { ...fields, zone: otherZone } })).toMatchObject({ result: "refused", reason: "guard-failed", name: "wrong-watering-zone" });
  const other = await setup("other-room"), foreign = other.ledger;
  wrote(await submit(foreign, operator, "commission-bench", { expected: expected(foreign, { zone: other.zone }), fields: { zone: other.zone, label: "D4", row: "D", column: 4 } })); const foreignBench = foreign.last.seq;
  wrote(await submit(foreign, keys.rita, "probe", on(foreign, foreignBench, { ec: 2800 }))); const foreignBasis = foreign.fact(foreign.last.seq);
  expect(foreignBench).toBe(bench); expect(foreign.at.scope).not.toBe(ledger.at.scope);
  expect(await submit(ledger, irrigation, "request-watering", { expected: expected(ledger, { zone, bench }), fields: { ...fields, basis: foreignBasis } }, [{ fact: foreignBasis, entry: foreign.last, under: room.name }])).toMatchObject({ result: "refused", reason: "guard-failed", name: "wrong-watering-room" });
  expect(await submit(ledger, irrigation, "request-watering", { expected: expected(ledger, { zone, bench }), fields: { ...fields, reason: " " } })).toMatchObject({ result: "refused", reason: "guard-failed", name: "empty-watering-reason" });
  wrote(await submit(ledger, irrigation, "request-watering", { expected: expected(ledger, { zone, bench }), fields })); const request = ledger.last.seq;
  expect(await submit(ledger, irrigation, "fulfill-watering", on(ledger, request, {}))).toMatchObject({ result: "refused", reason: "guard-failed" });
  for (const who of [irrigation, operator, climate]) expect(await submit(ledger, who, "approve-watering", on(ledger, request, { decision: "Proceed." }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  wrote(await submit(ledger, head, "approve-watering", on(ledger, request, { decision: "Approve 800 ml now." }))); const approval = ledger.last.seq;
  ledger.now = t(50);
  wrote(await submit(ledger, irrigation, "fulfill-watering", on(ledger, request, {})));
  expect(ledger.item(request)).toMatchObject({ state: "done", values: { amountMl: 800, mode: "requested", performedTime: t(50) }, refs: { zone, bench, basis: basis.seq, decisionAt: approval, performedAt: ledger.last.seq }, parties: { decidedBy: head.member, performedBy: irrigation.member } });
  expect(await submit(ledger, irrigation, "fulfill-watering", on(ledger, request, {}))).toMatchObject({ result: "refused", reason: "final" });
  wrote(await submit(ledger, head, "request-watering", { expected: expected(ledger, { zone, bench }), fields })); const declined = ledger.last.seq;
  wrote(await submit(ledger, head, "decline-watering", on(ledger, declined, { decision: "Wait for the next reading." })));
  expect(await submit(ledger, irrigation, "fulfill-watering", on(ledger, declined, {}))).toMatchObject({ result: "refused", reason: "final" });
  const items = structuredClone(ledger.state.all().items), apply = { zone, product: "Fixture product", rate: "Fixture rate", reason: "Recorded head-grower work." };
  expect(await submit(ledger, irrigation, "apply", { fields: apply })).toMatchObject({ result: "refused", reason: "unauthorized" });
  wrote(await submit(ledger, head, "apply", { fields: apply })); expect(ledger.state.all().items).toEqual(items);
  expect((await replay(ledger)).report.result).toBe("consistent");
});
