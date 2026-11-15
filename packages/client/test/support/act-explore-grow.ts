/** Real command judgment/fold/count/reservations. Parent grant metadata and
 * per-key authority are TEST fixtures, not installer or Membership proof. */
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type DeviceCommandGrant } from "@generalbusiness/dap-contract";
import { isRecord } from "@generalbusiness/dap-bytes";
import { deviceCommand, prepareRules, validateDefinition } from "@generalbusiness/dap-derive";
import { evaluateRules, RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { created, deliver, valid } from "@generalbusiness/dap-derive/testing";
import { room } from "../../../../examples/grow/room.ts";
import { simulatorTickParentDefinition } from "../../../../examples/grow/definition-corpus-data.ts";
import { climate, devicePermissions, nativeChild, operator, sensors, submit } from "../../../../examples/grow/test-support.ts";

/** Use the actual generated Room; only the labelled TEST launcher is data. */
export async function growExploreCommand() {
  const checked = valid(validateDefinition(room, PROPOSED_BOUNDS, RULE_PROFILES));
  const parent = valid(validateDefinition(simulatorTickParentDefinition(room, { label: "TEST Explore Room" }), PROPOSED_BOUNDS, RULE_PROFILES));
  const launcher = created(parent, {}, "E1-grow-launcher");
  const capabilities = deviceCommand();
  const spawning = launcher.judge(launcher.intent(operator, "spawn", { on: 0, expected: { on: 1 }, idempotencyKey: "E1-grow-spawn" }));
  if (spawning.result !== "write") throw new Error("the TEST Grow parent did not judge its creation");
  const send = spawning.draft.sends[0];
  if (spawning.draft.sends.length !== 1 || !send || send.message.class !== "request" || send.message.type !== "create"
    || !isRecord(send.message.body)) throw new Error("the TEST launcher did not create the actual Room");
  const grant: DeviceCommandGrant = { capability: DEVICE_COMMAND, owner: sensors.member,
    bounds: { kinds: ["fan"], owners: 1 }, root: parent.digest, definitions: [checked.digest] };
  // As in forms-device-command.test.ts, metadata stands in for installation.
  // The child receives this exact sealed source, not a replacement genesis.
  launcher.seal({ ...spawning.draft, sends: [{ ...send, message: { ...send.message, body: { ...send.message.body,
    membership: sensors.member.membership, creationContext: { v: 2, deviceCommand: grant, delegate: false },
  } } }] });
  const ledger = await nativeChild(launcher, launcher.last.seq, room, devicePermissions);
  if (deliver(launcher, ledger, 0).result !== "write" || deliver(ledger, launcher, launcher.last.seq).result !== "write") {
    throw new Error("the TEST Room creation did not confirm");
  }
  const zone = await submit(ledger, operator, "commission-zone", { fields: { label: "TEST Zone", setpoint: 2400, band: 200 } });
  if (zone.result !== "write") throw new Error("the actual Grow zone was not commissioned");
  const zoneId = ledger.last.seq;
  const device = await submit(ledger, operator, "commission-device", { expected: { zone: ledger.item(zoneId).revision }, fields: {
    zone: zoneId, kind: "fan", label: "TEST Fan", minLevel: 0, maxLevel: 100, target: "off", level: 0,
  } });
  if (device.result !== "write") throw new Error("the actual Grow fan was not commissioned");
  const fan = ledger.last.seq, key = "E1-grow-command";
  const command = ledger.intent(climate, "set-fan", { on: fan, expected: { on: ledger.item(fan).revision },
    fields: { target: "on", level: 100 }, idempotencyKey: key });
  const inputs = prepareRules(ledger.state, ledger.definition, { act: command, context: ledger.context({ capabilities }) });
  const prepared = await evaluateRules(inputs);
  const over = { capabilities, prepared, facts: [], reading: ledger.now };
  const context = ledger.context(over);
  return { ledger, capabilities, fan, key, command, over, context, actor: climate.key,
    evidence: prepared.map(value => value.input) };
}
