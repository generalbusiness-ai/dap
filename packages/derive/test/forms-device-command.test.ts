import { deviceConditions, wholeDeviceData, conditionalDeviceData, deviceParentData } from "./definition-corpus/forms-device-variants.ts";
import { expect, test } from "vitest";
import { newIncarnation } from "@generalbusiness/dap-bytes";
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type DeviceCommandGrant, type EffectForm, type FactRef, type FieldValue, type Grant, type SignedIntent } from "@generalbusiness/dap-contract";
import { capabilitiesOf, clockOf, deviceCommand, fits, holdCapability, judgeGenesis, judgePreparation, ownerReservations, reserved, validateDefinition, type Own, type PreparationJudgment, type Steps, type ValidDefinition } from "../src/index.ts";
import { Ledger, T0, creation, created, deliver, grantOf, keys, valid, deviceCommandFixture as scope } from "./fixtures-entry.ts";



test("capability-owned outcomes reject ordinary act, receive, timed and opaque rule writers by name", () => {
  expect(validateDefinition(scope, PROPOSED_BOUNDS)).toMatchObject({ ok: true });
  const write: EffectForm = { value: { slot: "outcome", from: { const: "confirmed" } } };
  const variants = [
    { ...scope, acts: { ...scope.acts, command: { ...scope.acts["command"]!, effects: [write] } } },
    { ...scope, acts: { ...scope.acts, command: { ...scope.acts["command"]!, effects: [{ ref: { slot: "outcomeAt", from: null } }] } } },
    { ...scope, receives: { update: { ...scope.receives["update"]!, effects: [{ ...write, of: "also.device" }] } } },
    { ...scope, timed: { expire: { ...scope.timed["expire"]!, effects: [write, { state: "closed" }] } } },
  ];
  for (const input of variants) {
    const checked = validateDefinition(input, PROPOSED_BOUNDS);
    expect(checked.ok ? [] : checked.problems.map(problem => problem.code)).toEqual(["capability-slot-owned"]);
  }
  const platform = { ...scope, outcomes: {}, acts: { ...scope.acts, command: { ...scope.acts["command"]!, effects: [{ code: "opaque-writer", row: "test" }] } } };
  const checked = validateDefinition(platform, PROPOSED_BOUNDS, undefined, { platform: true });
  expect(checked.ok ? [] : checked.problems.map(problem => problem.code)).toEqual(["capability-slot-owned"]);
  // The legacy fast path cannot admit owned slots without their declaration.
  for (const declared of [scope, platform]) {
    const unlisted = validateDefinition({ ...declared, capabilities: [] }, PROPOSED_BOUNDS, undefined, { platform: declared === platform });
    expect(unlisted.ok).toBe(false);
    expect(unlisted.ok ? [] : unlisted.problems.map(problem => problem.code)).toContain("capability");
  }
});

const code = capabilitiesOf(holdCapability({ tokensPerHold: 2, rootRetentionSeconds: null }), deviceCommand());
const definition = valid(validateDefinition(scope, PROPOSED_BOUNDS));

/** Real pure judges, native capability and fold. Parent grant metadata and
 * membership authority are SCRIPTED: this is no native installation proof. */
function fixture(granted = true, under: ValidDefinition = definition) {
  const parentDefinition = valid(validateDefinition(deviceParentData(under.digest), PROPOSED_BOUNDS));
  const parent = created(parentDefinition, {}), child = new Ledger(under);
  const drafted = parent.judge(parent.intent(keys.rita, "spawn", { on: 0, expected: { on: 1 } }));
  if (drafted.result !== "write") throw new Error(`fixture parent: ${drafted.result}`);
  const grant: DeviceCommandGrant = { capability: DEVICE_COMMAND, owner: keys.rita.member, bounds: { kinds: ["heater"], owners: 1 }, root: parentDefinition.digest, definitions: [under.digest] };
  parent.seal({ ...drafted.draft, sends: drafted.draft.sends.map(send => ({ ...send, message: { class: "request", type: "create",
    body: { ...(send.message as { body: object }).body, membership: keys.rita.member.membership,
      creationContext: granted ? { v: 2, deviceCommand: grant, delegate: false } : { v: 1 } } } })) });
  const { asked, source } = creation(parent, 1, 0);
  const genesis = judgeGenesis(child.state, under, asked, { clock: clockOf(child.state, T0), bounds: child.bounds, facts: [], prepared: [], source, capabilities: code });
  if (genesis.result !== "write") throw new Error(`fixture genesis: ${genesis.result}`);
  child.seal(genesis.draft);
  expect(deliver(parent, child, 0, 0).result).toBe("write");
  expect(deliver(child, parent, parent.last.seq, 0).result).toBe("write");
  const command = (device: number, level = 80) => child.act(keys.rita, "command", { on: device, expected: { on: child.item(device).revision }, fields: { target: "on", level } }, { capabilities: code });
  const commission = (kind = "heater") => {
    const j = child.act(keys.rita, "commission", { fields: { kind } }, { capabilities: code });
    expect(j.result).toBe("write");
    return child.last.seq;
  };
  const answer = (command: FactRef, outcome = "confirmed", who = keys.rita, extra: { own?: Own; steps?: Steps; grant?: Grant; fields?: Record<string, FieldValue>; signed?: SignedIntent } = {}) => {
    const signed = extra.signed ?? child.intent(who, `${DEVICE_COMMAND}:answer`, { fields: { command, outcome, description: "simulated device answer", ...extra.fields } });
    const judgment = judgePreparation(child.state, under, { signed, capability: DEVICE_COMMAND, step: "answer" }, {
      clock: clockOf(child.state, child.now), bounds: child.bounds, steps: extra.steps ?? code, own: extra.own ?? child.own,
      granted: asked => {
        expect(asked.scopeGrant).toBe(true);
        return { result: "granted", grant: extra.grant ?? grantOf(who, child.at, []) };
      },
    });
    return { signed, judgment };
  };
  return { s: child, command, commission, answer };
}

function written(s: Ledger, judgment: PreparationJudgment) {
  expect(judgment.result).toBe("write");
  if (judgment.result !== "write") throw new Error(`answer: ${JSON.stringify(judgment)}`);
  return s.seal(judgment.draft);
}

test("sensor revisions do not invalidate an owner's answer; an older answer closes only its command and unknown is final", () => {
  const { s, command, commission, answer } = fixture();
  const device = commission();
  expect(command(device).result).toBe("write");
  const first = s.fact(s.last.seq);
  expect(s.state.record(DEVICE_COMMAND, "command", [first.seq])).toMatchObject({ state: "open", values: { targetAt: first.seq, owner: keys.rita.member, decided: 0 } });
  expect(s.act(keys.rita, "report", { on: device, expected: { on: s.item(device).revision }, fields: { reported: 20 } }, { capabilities: code }).result).toBe("write");
  expect(s.item(device).revision).toBeGreaterThan(2);
  const confirmed = written(s, answer(first).judgment);
  expect([s.item(device).values["reported"], s.item(device).values["outcome"], s.item(device).refs["outcomeAt"]]).toEqual([20, "confirmed", confirmed.seq]);
  const repeat = answer(first, "confirmed", keys.rita, { signed: (confirmed.input as { signed: SignedIntent }).signed });
  expect(repeat.judgment).toEqual({ result: "repeat", seq: confirmed.seq });
  expect(answer(first).judgment).toMatchObject({ result: "refused", name: "device-command-closed" });
  expect(command(device, 30).result).toBe("write");
  const old = s.fact(s.last.seq);
  expect([s.item(device).values["outcome"], s.item(device).refs["outcomeAt"]]).toEqual([null, null]);
  expect(command(device, 60).result).toBe("write");
  const latest = s.fact(s.last.seq);
  written(s, answer(latest, "refused").judgment);
  const before = s.item(device);
  const late = written(s, answer(old, "unknown").judgment);
  expect(late.effects).toHaveLength(1);
  expect(s.item(device)).toEqual(before);
  expect(s.state.record(DEVICE_COMMAND, "command", [old.seq])).toMatchObject({ state: "unknown", values: { decided: 1 } });
  expect(answer(old).judgment).toMatchObject({ result: "refused", name: "device-command-closed" });
  expect(ownerReservations(code, s.state, definition).entries).toBe(0);
});

test("only the full granted owner can answer an exact local command, within granted kinds; missing proof stays unavailable", () => {
  const { s, command, commission, answer } = fixture();
  const device = commission();
  expect(command(device).result).toBe("write");
  const fact = s.fact(s.last.seq), head = s.head;
  expect(answer(fact, "confirmed", keys.vic).judgment).toMatchObject({ result: "refused", name: "device-command-not-owner" });
  const foreignInc = newIncarnation(new Uint8Array(16).fill(94));
  expect(answer(fact, "confirmed", keys.rita, { grant: { ...grantOf(keys.rita, s.at, []),
    subject: { ...keys.rita.member, membership: { ...keys.rita.member.membership, inc: foreignInc } } } }).judgment)
    .toMatchObject({ result: "refused", name: "device-command-not-owner" });
  expect(answer({ ...fact, at: { ...fact.at, inc: foreignInc } }).judgment).toMatchObject({ result: "refused", name: "device-command-unknown" });
  expect(answer({ ...fact, seq: 0 }).judgment).toMatchObject({ result: "refused", name: "device-command-unknown" });
  expect(answer({ ...fact, hash: s.fact(0).hash }).judgment).toMatchObject({ result: "refused", name: "device-command-unknown" });
  expect(answer(fact, "confirmed", keys.rita, { own: seq => seq === fact.seq ? null : s.own(seq) }).judgment).toEqual({ result: "unavailable", reason: "unavailable" });
  expect(answer(fact, "confirmed", keys.rita, { own: () => null }).judgment).toEqual({ result: "unavailable", reason: "unavailable" });
  expect(answer(fact, "confirmed", keys.rita, { fields: { unexpected: true } }).judgment).toMatchObject({ result: "refused", reason: "bad-field" });
  expect(s.head).toEqual(head);
  const fan = commission("fan");
  expect(command(fan)).toMatchObject({ result: "refused", name: "device-kind-ungranted" });
  const noGrant = fixture(false), unowned = noGrant.commission();
  expect(noGrant.command(unowned).result).toBe("write");
  expect(noGrant.s.item(unowned).values["target"]).toBe("on");
  expect(noGrant.s.state.recordCount(DEVICE_COMMAND, "command")).toBe(0);
  expect(noGrant.answer(noGrant.s.fact(noGrant.s.last.seq)).judgment).toMatchObject({ result: "refused", name: "device-command-ungranted" });
});

test("a pending command reserves one bounded answer; only its actual closing preparation spends it", () => {
  const { s, command, commission, answer } = fixture();
  const device = commission();
  expect(command(device).result).toBe("write");
  const fact = s.fact(s.last.seq);
  expect(ownerReservations(code, s.state, definition)).toEqual({ entries: 1, bytes: PROPOSED_BOUNDS.entryBytes, items: 0, records: 0, requests: 0 });
  const j = answer(fact).judgment;
  if (j.result !== "write") throw new Error("owner answer must derive");
  expect(j.draft.settles).toBe(true);
  // The entry counter is already at its admission edge. New work cannot
  // consume the pending answer and closing-checkpoint allowance.
  const limit = s.head.seq + reserved(s.state, definition, s.last.input, code).entries + 1;
  expect(fits(s.state, definition, { scopeEntries: limit - 1 }, s.last.input, false, code)).toBe(false);
  written(s, j);
  expect(fits(s.state, definition, { scopeEntries: limit }, s.last.input, j.draft.settles, code)).toBe(true);
  expect(ownerReservations(code, s.state, definition).entries).toBe(0);
  const unbound = fixture(), unboundID = unbound.commission();
  expect(unbound.command(unboundID).result).toBe("write");
  const unrelated = unbound.answer(unbound.s.fact(unbound.s.last.seq), "confirmed", keys.rita,
    { steps: { ...code, derive: () => ({ records: [], opens: [] }) } }).judgment;
  if (unrelated.result !== "write") throw new Error("scripted unbound preparation must derive");
  expect(unrelated.draft.settles).toBeUndefined();
  written(unbound.s, unrelated);
  expect(fits(unbound.s.state, definition, { scopeEntries: limit }, unbound.s.last.input, unrelated.draft.settles, code)).toBe(false);
  expect(ownerReservations(code, unbound.s.state, definition).entries).toBe(1);
  // Conditional writes keep their original order and share one condition.
  // When skipped, open cannot borrow commission's earlier targetAt fact.
  for (const condition of deviceConditions) {
    const conditional = conditionalDeviceData(condition);
    const conditionalDefinition = valid(validateDefinition(conditional, PROPOSED_BOUNDS));
    const conditionalScope = fixture(true, conditionalDefinition), conditionalID = conditionalScope.commission();
    expect(conditionalScope.command(conditionalID, 30).result).toBe("write");
    expect(conditionalScope.s.item(conditionalID)).toMatchObject({ values: { target: "off", level: 0 }, refs: { targetAt: conditionalID } });
    expect(conditionalScope.s.state.recordCount(DEVICE_COMMAND, "command")).toBe(0);
    expect(ownerReservations(code, conditionalScope.s.state, conditionalDefinition).entries).toBe(0);
    expect(conditionalScope.command(conditionalID, 80).result).toBe("write");
    expect(conditionalScope.s.state.record(DEVICE_COMMAND, "command", [conditionalScope.s.last.seq])).toMatchObject({ values: { target: "on", level: 80, targetAt: conditionalScope.s.last.seq } });
    expect(ownerReservations(code, conditionalScope.s.state, conditionalDefinition).entries).toBe(1);
  }
  const under = valid(validateDefinition(wholeDeviceData(), PROPOSED_BOUNDS));
  const whole = fixture(true, under), id = whole.commission();
  expect(whole.command(id).result).toBe("write");
  const answerJ = whole.answer(whole.s.fact(whole.s.last.seq)).judgment;
  written(whole.s, answerJ);
  expect(fits(whole.s.state, under, { scopeEntries: 1 }, whole.s.last.input, true, code)).toBe(false);
});

test("a device command follows all target writes, binds one device and opens at most once", () => {
  const claimed = structuredClone(scope);
  claimed.items["device"]!.values["target"]!.capability = DEVICE_COMMAND;
  const checked = validateDefinition(claimed, PROPOSED_BOUNDS);
  expect(checked.ok ? [] : checked.problems.map(problem => problem.code)).toContain("capability-slot-owned");
  const effects = scope.acts["command"]!.effects;
  for (const changed of [effects.slice(0, -1), [...effects.slice(0, -1), { capability: { name: "device-command", do: "open", with: { device: { const: "heater" } } } }], [...effects, effects.at(-1)!],
    // Both accepted-order counterexamples from checker finding F1.
    [effects[3]!, effects[0]!, effects[1]!, effects[2]!],
    [effects[2]!, effects[3]!, effects[0]!, effects[1]!],
    // Correct order is insufficient when only the fact write can be skipped.
    [effects[0]!, effects[1]!, { ...effects[2]!, if: [{ equals: { a: { field: "level" }, b: { const: 30 } } }] }, effects[3]!],
    [effects[0]!, effects[1]!, { ...effects[2]!, unless: [{ equals: { a: { field: "level" }, b: { const: 80 } } }] }, effects[3]!],
    [...effects.slice(0, 3), { state: "closed" }, effects[3]!],
    [...effects.slice(0, -1), { ...effects[3]!, if: [{ equals: { a: { field: "level" }, b: { const: 80 } } }] }],
  ]) {
    const input = { ...scope, acts: { ...scope.acts, command: { ...scope.acts["command"]!, effects: changed } } };
    const checked = validateDefinition(input, PROPOSED_BOUNDS);
    expect(checked.ok ? [] : checked.problems.map(problem => problem.code)).toContain("capability");
  }
  for (const guards of [scope.acts["command"]!.guards.filter(guard => !("capability" in guard)),
    [{ state: ["active"] }, { capability: { name: "device-command", guard: "allowed", with: { kind: { const: "heater" } } } }],
  ]) {
    const input = { ...scope, acts: { ...scope.acts, command: { ...scope.acts["command"]!, guards } } };
    const checked = validateDefinition(input, PROPOSED_BOUNDS);
    expect(checked.ok ? [] : checked.problems.map(problem => problem.code)).toContain("capability");
  }
  // A correct kind operand is no proof if runtime can skip the guard itself.
  const skippable = structuredClone(scope), command = skippable.acts["command"]!;
  command.fields["optionalDevice"] = { type: "item", of: "device", required: false };
  command.also["optionalDevice"] = { item: "device", by: "optionalDevice" };
  command.guards = [...command.guards.filter(guard => !("capability" in guard)),
    { of: "also.optionalDevice", capability: { name: "device-command", guard: "allowed", with: { kind: { slot: "kind", of: "on" } } } }];
  const refused = validateDefinition(skippable, PROPOSED_BOUNDS);
  expect(refused.ok ? [] : refused.problems.map(problem => problem.code)).toContain("capability");
  // The open effect's own subject must not skip an otherwise allowed command.
  command.guards = scope.acts["command"]!.guards;
  command.effects = command.effects.map((effect, i) => i === 3 ? {
    of: "also.optionalDevice", capability: { name: "device-command", do: "open", with: { device: { slot: "kind", of: "on" } } },
  } : effect);
  const skippedOpen = validateDefinition(skippable, PROPOSED_BOUNDS);
  expect(skippedOpen.ok ? [] : skippedOpen.problems.map(problem => problem.code)).toContain("capability");
});
