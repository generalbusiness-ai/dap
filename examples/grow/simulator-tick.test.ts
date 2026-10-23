/** Actual in-memory native rules, judgments and folding. Public reads and
 * per-key and parent Device grants are SCRIPTED adapters; this does not
 * prove native install, membership/session admission or HTTP transport. */
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type DeviceCommandGrant, type SignedIntent } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { secretSigner } from "@generalbusiness/artroom-client";
import { clockOf, deviceCommand, judgePreparation, prepareRules, validateDefinition } from "@generalbusiness/dap-derive";
import { evaluateRules } from "@generalbusiness/dap-derive/rule";
import { receiptOf } from "@generalbusiness/artroom-scope/runtime";
import { created, deliver, grantOf, t, valid } from "@generalbusiness/dap-derive/testing";
import { simulatorTickParentDefinition } from "./definition-corpus-data.ts";
import { demoDefinitions } from "./demo-definitions.ts";
import { simulatorSchedule } from "./simulator.ts";
import { simulatorTick, type SimulatorPorts } from "./simulator-tick.ts";
import { nativeChild, devicePermissions, operator, climate, sensors, submit } from "./test-support.ts";

async function fixture() {
  const { room } = demoDefinitions(), fields = {
    label: "TEST hosted room", sensors: sensors.member, climate: climate.member, operator: operator.member,
  };
  // A made-up parent supplies the TEST grant in its actual sealed create
  // message. The Room then uses the native capability, judges and fold.
  const parentDefinition = valid(validateDefinition(simulatorTickParentDefinition(room, fields), PROPOSED_BOUNDS));
  const parent = created(parentDefinition, {}), code = deviceCommand();
  const spawning = parent.judge(parent.intent(operator, "spawn", { on: 0, expected: { on: 1 } }));
  if (spawning.result !== "write") throw Error("The TEST parent must create its Room.");
  const grant: DeviceCommandGrant = { capability: DEVICE_COMMAND, owner: sensors.member, bounds: { kinds: ["fan", "heater", "vent"], owners: 1 },
    root: parentDefinition.digest, definitions: [definitionDigest(room)] };
  parent.seal({ ...spawning.draft, sends: spawning.draft.sends.map(send => ({ ...send, message: { class: "request", type: "create",
    body: { ...(send.message as { body: object }).body, membership: sensors.member.membership, creationContext: { v: 2, deviceCommand: grant, delegate: false } } } })) });
  const ledger = await nativeChild(parent, parent.last.seq, room, devicePermissions);
  if (deliver(parent, ledger, 0).result !== "write" || deliver(ledger, parent, parent.last.seq).result !== "write") throw Error("The TEST parent and Room must confirm the actual creation.");
  const wrote = (result: unknown) => expect(result, JSON.stringify(result)).toMatchObject({ result: "write" });
  for (let ordinal = 1; ordinal <= 4; ordinal++) {
    wrote(await submit(ledger, operator, "commission-zone", { fields: { label: `Zone ${ordinal}`, setpoint: 2400, band: 200 } }));
    const zone = ledger.last.seq, ids: Record<string, number> = {};
    for (const kind of ["vent", "fan", "heater"] as const) {
      wrote(await submit(ledger, operator, "commission-device", { expected: { zone: ledger.item(zone).revision }, fields: {
        zone, kind, label: `${kind} ${ordinal}`, minLevel: 0, maxLevel: 100, target: kind === "vent" ? "closed" : kind === "heater" ? "on" : "off", level: kind === "heater" ? 100 : 0,
      } })); ids[kind] = ledger.last.seq;
    }
    wrote(await submit(ledger, operator, "bind-zone-devices", { on: zone, fields: ids, expected: Object.fromEntries(Object.entries({ on: zone, ...ids }).map(([key, id]) => [key, ledger.item(id).revision])) }));
  }
  let stopped = false;
  const sent: SignedIntent[] = [];
  const port: SimulatorPorts = {
    reader: {
      summary: async () => {
        const held = ledger.state.all(), scope = held.scope!;
        return { ok: true, at: scope.head, complete: true, value: { scope: scope.at, status: scope.status, definition: ledger.definition.digest,
          time: scope.time, counts: held.counts, items: held.items.filter(item => !room.items[item.type]!.states[item.state]!.final) } };
      },
      entry: async position => {
        const entry = ledger.entries[position];
        return entry ? { ok: true, at: ledger.head, value: entry, complete: true } : { ok: false, reason: "not-found" };
      },
      history: async cursor => {
        const start = Number(cursor ?? "0"), end = Math.min(start + 200, ledger.entries.length);
        return { ok: true, at: ledger.head, complete: end === ledger.entries.length, value: ledger.entries.slice(start, end), ...(end === ledger.entries.length ? {} : { next: String(end) }) };
      },
    },
    submit: async signed => {
      sent.push(signed);
      const context = ledger.context({ capabilities: code }), prepared = await evaluateRules(prepareRules(ledger.state, ledger.definition, { act: signed, context }));
      const result = ledger.submit(signed, { prepared, capabilities: code });
      if (result.result === "write") return { answer: "accepted", receipt: receiptOf(ledger.entries.at(-1)!, ledger.definition.digest) };
      if (result.result === "refused") return { answer: "refused", reason: result.reason, ...(result.name ? { name: result.name } : {}), judgedAt: ledger.head };
      expect.fail(`Unexpected native judgment: ${JSON.stringify(result)}`);
    },
    answer: async signed => {
      const result = judgePreparation(ledger.state, ledger.definition, { signed, capability: DEVICE_COMMAND, step: "answer" }, {
        clock: clockOf(ledger.state, ledger.now), bounds: PROPOSED_BOUNDS, steps: code, own: ledger.own,
        granted: () => ({ result: "granted", grant: grantOf(sensors, ledger.at, []) }),
      });
      if (result.result === "write") {
        ledger.seal(result.draft);
        return { answer: "accepted", receipt: receiptOf(ledger.entries.at(-1)!, ledger.definition.digest) };
      }
      if (result.result === "refused") return { answer: "refused", reason: result.reason, ...(result.name ? { name: result.name } : {}), judgedAt: ledger.head };
      expect.fail(`Unexpected native preparation: ${JSON.stringify(result)}`);
    },
    stop: () => { stopped = true; },
  };
  const schedule = simulatorSchedule(JSON.parse(await readFile(new URL("./demo/simulator.json", import.meta.url), "utf8")));
  const config = { scope: ledger.at, definition: ledger.definition.digest, members: { sensors: sensors.member, climate: climate.member, operator: operator.member },
    signers: { sensors: secretSigner(sensors.secret), climate: secretSigner(climate.secret) }, schedule };
  const tick = async (minute: number) => {
    ledger.now = t(minute * 60);
    return simulatorTick({ ...config, now: Date.parse(ledger.now) }, port);
  };
  return { ledger, port, sent, tick, stopped: () => stopped };
}

test("a restarted tick records only observed minutes, reuses a duplicate reading, closes unattended incidents truthfully and raises a later cycle", async () => {
  const f = await fixture();
  expect(await f.tick(0)).toMatchObject({ result: "complete" });
  const first = f.ledger.head;
  expect(await f.tick(0)).toMatchObject({ result: "complete", accepted: [] });
  expect(f.ledger.head).toEqual(first);
  expect(await f.tick(10)).toMatchObject({ result: "complete" });
  const alert = f.ledger.state.all().items.find(item => item.type === "alert")!;
  expect(alert).toMatchObject({ state: "open", values: { target: "off" } });
  expect(await f.tick(20)).toMatchObject({ result: "complete" });
  expect(await f.tick(35)).toMatchObject({ result: "complete" });
  expect(f.ledger.item(alert.id).state).toBe("closed");
  const closed = f.sent.find(signed => signed.intent.kind === "close-incident")!;
  expect(closed.intent.fields["resolution"]).toContain("No heater command was recorded");
  expect(f.sent.some(signed => ["authorize", "set-heater"].includes(signed.intent.kind))).toBe(false);
  expect(await f.tick(70)).toMatchObject({ result: "complete" });
  expect(f.ledger.state.all().items.filter(item => item.type === "alert")).toHaveLength(2);
  expect(f.sent.filter(signed => signed.intent.kind === "observe").map(signed => signed.intent.fields["sampledAt"])).toEqual([0, 10, 20, 35, 70].map(minute => t(minute * 60)));
  expect(f.stopped()).toBe(false);
});

test("an uncertain accepted write closes this invocation without sending later acts; a new tick reconciles the sealed reading", async () => {
  const f = await fixture(), original = f.port.submit;
  f.port.submit = async signed => { const answer = await original(signed); if (signed.intent.kind === "observe") throw new Error("TEST reply lost after native seal"); return answer; };
  expect(await f.tick(0)).toMatchObject({ result: "stopped", phase: "observe", reason: "public-interface-unavailable" });
  expect(f.stopped()).toBe(true);
  expect(f.sent.at(-1)!.intent.kind).toBe("observe");
  f.port.submit = original;
  expect(await f.tick(0)).toMatchObject({ result: "complete" });
  expect(f.sent.filter(signed => signed.intent.kind === "observe")).toHaveLength(1);
  expect(f.ledger.state.all().items.filter(item => item.type === "zone").every(item => item.state === "in-band")).toBe(true);
});

test("only a person cuts and restores heat; an unanswered restoration window closes with the recorded heater still off", async () => {
  for (const restore of [false, true]) {
    const f = await fixture();
    expect(await f.tick(10)).toMatchObject({ result: "complete" });
    const alert = f.ledger.state.all().items.find(item => item.type === "alert")!, heater = alert.refs["heater"] as number;
    const authorize = () => submit(f.ledger, operator, "authorize", { on: alert.id, expected: { on: f.ledger.item(alert.id).revision, heater: f.ledger.item(heater).revision } });
    expect(await authorize()).toMatchObject({ result: "write" });
    expect(await f.tick(11)).toMatchObject({ result: "complete" });
    expect(f.ledger.item(alert.id).state).toBe("authorized");
    expect(await f.tick(35)).toMatchObject({ result: "complete" });
    expect(f.ledger.item(alert.id)).toMatchObject({ state: "open", values: { target: "on" } });
    expect(f.ledger.item(heater).values["target"]).toBe("off");
    expect(f.sent.filter(signed => signed.intent.kind === "propose-restoration")).toHaveLength(1);
    if (restore) expect(await authorize()).toMatchObject({ result: "write" });
    expect(await f.tick(restore ? 36 : 40)).toMatchObject({ result: "complete" });
    expect(f.ledger.item(alert.id).state).toBe("closed");
    expect(f.ledger.item(heater).values["target"]).toBe(restore ? "on" : "off");
    expect(f.sent.some(signed => ["authorize", "set-heater"].includes(signed.intent.kind))).toBe(false);
    expect(f.sent.find(signed => signed.intent.kind === "close-incident")!.intent.fields["resolution"]).toContain("later target is recorded at entry");
  }
});

test("a room refusal ends the tick at that exact request, without later reports or climate acts", async () => {
  const f = await fixture(), original = f.port.submit;
  let refused: SignedIntent | undefined;
  f.port.submit = async signed => {
    expect(refused).toBeUndefined();
    if (signed.intent.kind === "observe") {
      // A real, separately signed concurrent observation wins the revision.
      expect(await submit(f.ledger, sensors, "observe", { on: 0, fields: { ...signed.intent.fields }, expected: { on: f.ledger.item(0).revision } })).toMatchObject({ result: "write" });
      refused = signed;
    }
    return original(signed);
  };
  expect(await f.tick(10)).toMatchObject({ result: "stopped", phase: "observe", reason: "refused:revision-moved" });
  expect(refused).toBeDefined(); expect(f.stopped()).toBe(true);
  expect(f.ledger.state.all().items.filter(item => ["alert", "incident"].includes(item.type))).toHaveLength(0);
  expect(f.sent.at(-1)).toBe(refused);
  expect(f.sent.slice(0, -1).every(signed => signed.intent.kind === "report-device")).toBe(true);
});
