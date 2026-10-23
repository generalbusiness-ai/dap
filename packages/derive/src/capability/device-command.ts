/** Local command facts, shared by production and replay. Performs no device write. */
import { DEVICE_COMMAND, type DeviceCommandGrant, type DeviceCommandOutcome, type FactRef, type Intent } from "@generalbusiness/dap-contract";
import { isFactRef, isLocalId, utf8 } from "@generalbusiness/dap-bytes";
import type { Capabilities, CapabilityDerived, CapabilityGiven, CapabilityItemEffect, Recorded } from "../capability.ts";
import { creationContextOf } from "../creation-context.ts";
import type { Own } from "../fields.ts";
import { WINDOWS } from "../grant.ts";
import { amountMath, NOTHING, type Amount } from "../held.ts";
import type { Owners } from "../ledger.ts";
import type { StepDerived, StepGiven, StepRefusal, Steps } from "../prepare.ts";
import type { Item, StateView } from "../state.ts";
import type { ValidDefinition } from "../validate/index.ts";
import { own, same } from "../values.ts";

const unavailable = { unavailable: true } as const;
const outcomes = ["confirmed", "refused", "unknown"] as const;
const listed = (definition: ValidDefinition) => definition.declared.capabilities.some(cap => `${cap.name}@${cap.version}` === DEVICE_COMMAND);

/** Only the already accepted, exact retained genesis supplies this authority. */
function grantOf(view: StateView, definition: ValidDefinition, history?: Own): DeviceCommandGrant | null | typeof unavailable {
  const scope = view.scope(), genesis = history?.(0);
  if (!scope || !genesis) return unavailable;
  if (genesis.hash !== scope.genesis.hash || !same(genesis.entry.at, scope.at) || genesis.entry.seq !== 0
    || genesis.entry.input.type !== "genesis" || genesis.entry.input.decision !== "applied") return null;
  const context = creationContextOf(genesis.entry.input.message?.body, definition.digest);
  return context.kind === "marked" && context.deviceCommand?.definitions.includes(definition.digest) ? context.deviceCommand : null;
}

function deviceOf(item: Item | undefined | null, definition: ValidDefinition): Item | null {
  const type = item && own(definition.declared.items, item.type);
  return item && type && !type.states[item.state]?.final && type.values["outcome"]?.capability === DEVICE_COMMAND
    && type.refs["outcomeAt"]?.capability === DEVICE_COMMAND ? item : null;
}

function open(args: Readonly<Record<string, unknown>>, given: CapabilityGiven): CapabilityDerived | typeof unavailable {
  const grant = grantOf(given.view, given.definition, given.own);
  if (grant && "unavailable" in grant) return grant;
  const device = deviceOf(given.fromItems?.["device"], given.definition);
  // Conditional target writes that did not run cannot borrow an old fact.
  if (!grant || !device || device.refs["targetAt"] !== given.self || args["device"] !== device.values["kind"]
    || !grant.bounds.kinds.some(kind => kind === device.values["kind"])) return { records: [] };
  const target = device.values["target"], level = device.values["level"];
  if (typeof target !== "string" || !["open", "closed", "on", "off"].includes(target)
    || typeof level !== "number" || !Number.isSafeInteger(level) || level < 0 || level > 100) throw new Error(`${DEVICE_COMMAND}: invalid target`);
  const command: Recorded = { kind: "command", key: [given.self], state: "open",
    values: { device: device.id, kind: device.values["kind"], target, level, targetAt: given.self, owner: grant.owner, decided: 0 } };
  return { records: [command], itemEffects: [
    { effect: "value", item: device.id, slot: "outcome", value: null },
    { effect: "ref", item: device.id, slot: "outcomeAt", to: null },
  ] };
}

function answerAsked(intent: Intent): { command: FactRef; outcome: DeviceCommandOutcome; description: string } | null {
  const fields = intent.fields;
  if (intent.kind !== `${DEVICE_COMMAND}:answer` || intent.on !== null || Object.keys(intent.expected).length !== 0
    || Object.keys(fields).length !== 3 || !isFactRef(fields["command"]) || typeof fields["outcome"] !== "string"
    || !outcomes.includes(fields["outcome"] as DeviceCommandOutcome) || typeof fields["description"] !== "string"
    || utf8(fields["description"]).length > 1024) return null;
  return { command: fields["command"], outcome: fields["outcome"] as DeviceCommandOutcome, description: fields["description"] };
}

const refused = (name: string): { refused: StepRefusal } => ({ refused: { reason: "capability-refused", name } });

function available(given: StepGiven): boolean {
  const grant = grantOf(given.view, given.definition, given.own);
  if (grant && "unavailable" in grant) return false;
  const asked = answerAsked(given.intent);
  // Authority refusals and unknown records disclose no command body.
  if (!grant || !same(grant.owner, given.signer.member) || !asked || !same(asked.command.at, given.scope.at)
    || given.view.record(DEVICE_COMMAND, "command", [asked.command.seq])?.state !== "open") return true;
  return given.own?.(asked.command.seq) != null;
}

function answer(given: StepGiven): StepDerived | { refused: StepRefusal } {
  const grant = grantOf(given.view, given.definition, given.own);
  if (!grant || "unavailable" in grant) return refused("device-command-ungranted");
  if (!same(grant.owner, given.signer.member)) return refused("device-command-not-owner");
  const asked = answerAsked(given.intent);
  if (!asked) return { refused: { reason: "bad-field", detail: "answer requires only command (a full fact), outcome and description (at most 1024 UTF-8 bytes)" } };
  const command = same(asked.command.at, given.scope.at) ? given.view.record(DEVICE_COMMAND, "command", [asked.command.seq]) : null;
  if (!command) return refused("device-command-unknown");
  if (command.state !== "open") return refused("device-command-closed");
  const source = given.own?.(asked.command.seq);
  if (!source || source.hash !== asked.command.hash || !same(source.entry.at, given.scope.at) || source.entry.seq !== asked.command.seq
    || command.seq !== asked.command.seq || !source.entry.effects.some(effect => effect.effect === "record" && effect.capability === DEVICE_COMMAND
      && effect.kind === "command" && effect.state === "open" && same(effect.key, command.key) && same(effect.values, command.values))) return refused("device-command-unknown");
  const values = command.values;
  if (!same(values["owner"], grant.owner) || !grant.bounds.kinds.some(kind => kind === values["kind"])
    || values["targetAt"] !== asked.command.seq || values["decided"] !== 0 || !isLocalId(values["device"])) return refused("device-kind-ungranted");
  const device = deviceOf(given.view.item(values["device"]), given.definition);
  const current = device && device.refs["targetAt"] === asked.command.seq && device.values["kind"] === values["kind"]
    && device.values["target"] === values["target"] && device.values["level"] === values["level"];
  const itemEffects: readonly CapabilityItemEffect[] = current ? [
    { effect: "value", item: device.id, slot: "outcome", value: asked.outcome },
    { effect: "ref", item: device.id, slot: "outcomeAt", to: given.self },
  ] : [];
  return { records: [{ kind: "command", key: command.key, state: asked.outcome,
    values: { ...values, decided: 1, description: asked.description, answerAt: given.self } }], opens: [], itemEffects,
    reservation: { record: "command", key: command.key } };
}

function reservations(view: StateView, definition: ValidDefinition): Amount {
  if (!listed(definition)) return NOTHING;
  // Replaces existing keys/slots; creates no item, record, request or retained
  // input beside one journal entry. The preparation index is derived history.
  return amountMath(definition.declared.capacity?.name === "whole-scope").times(
    view.recordCount(DEVICE_COMMAND, "command", "open"), definition.pendingWorkAmounts.entry);
}

export function deviceCommand(): Capabilities & Steps & Owners {
  return {
    implements: ((form: unknown, step?: string) => typeof form === "string" ? form === DEVICE_COMMAND && step === "answer"
      : form !== null && typeof form === "object" && "capability" in form && form.capability === DEVICE_COMMAND
        && "form" in form && "name" in form && (form.form === "listed" && form.name === DEVICE_COMMAND
          || form.form === "kind" && form.name === `${DEVICE_COMMAND}:answer`
          || form.form === "guard" && form.name === "allowed" || form.form === "effect" && form.name === "open")) as Capabilities["implements"] & Steps["implements"],
    guard: (_capability, _guard, args, given) => {
      const grant = grantOf(given.view, given.definition, given.own);
      if (grant && "unavailable" in grant) return grant;
      return !grant || grant.bounds.kinds.some(kind => kind === args["kind"]) ? true : "device-kind-ungranted";
    },
    effect: (_capability, _effect, args, given) => {
      const result = open(args, given);
      if ("unavailable" in result) throw new Error(`${DEVICE_COMMAND}: retained genesis unavailable`);
      return result.records;
    },
    deriveEffect: (_capability, _effect, args, given) => open(args, given),
    grant: (capability, step) => capability === DEVICE_COMMAND && step === "answer" ? { action: `${DEVICE_COMMAND}:answer`, window: WINDOWS.ordinary } : null,
    available: (_capability, _step, given) => available(given),
    derive: (_capability, _step, given) => answer(given),
    maxima: [
      { capability: DEVICE_COMMAND, form: "effect", name: "open", effects: 3, operations: 0, requests: 0 },
      { capability: DEVICE_COMMAND, form: "step", name: "answer", effects: 3, operations: 0, requests: 0 },
    ],
    rules: () => null,
    reserves: (view, definition) => reservations(view, definition).entries,
    reservations,
  };
}
