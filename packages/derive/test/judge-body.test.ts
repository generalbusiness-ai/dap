/** Real in-memory body/runtime judges. Fixture grants and platform rules are
 * explicit stand-ins; no native commit, membership service or transport runs. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { ActType, Effect, Intent } from "@generalbusiness/dap-contract";
import { judgeActBody, validateDefinition, type Capabilities } from "../src/index.ts";
import { Scope, created, deskDefinition, directory, grantOf, keys, laneDefinition, on, otherLane, t, valid, variant } from "./fixtures.ts";
import { gateRules, gateWith } from "./fixtures-marks.ts";
import { Works, changed, works } from "./fixtures-holds.ts";
import { deviceCommandFixture } from "./fixtures-device-command.ts";
import { M } from "./definition-corpus/forms-settles-data.ts";
import { settlesChanges } from "./definition-corpus/settles-variants.ts";

const { rita } = keys;
const act = (over: Partial<ActType> & Pick<ActType, "step" | "on">): ActType => ({
  grant: "probe", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...over,
});
const bodyOf = ({ kind, on, fields, expected }: Intent) => ({ kind, on, fields, expected });

test("the unsigned body shares consequences and authority checks without inventing envelope expiry", () => {
  const scope = new Scope(laneDefinition), before = scope.state.snapshot();
  const signed = scope.intent(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  const body = bodyOf(signed.intent), context = { ...scope.context(), actor: rita.key };
  const recorded = scope.judge(signed), answer = judgeActBody(scope.state, scope.definition, body, context);
  expect(recorded.result).toBe("write"); expect(answer.result).toBe("write");
  if (recorded.result !== "write" || answer.result !== "write") return expect.fail("both real paths must admit this act");
  expect(recorded.draft).toEqual({ input: recorded.draft.input, ...answer.draft, judgesTime: true });
  expect(Object.hasOwn(answer.draft, "input")).toBe(false);
  expect([recorded.draft.judgesTime, answer.draft.judgesTime]).toEqual([true, false]);
  expect(answer.signer).toEqual({ member: rita.member, principal: rita.principal });
  expect(answer.selfRefs).toEqual([]);
  expect(judgeActBody(scope.state, scope.definition, body, { ...context, grants: null })).toMatchObject({ result: "unavailable", reason: "authority-unavailable" });
  expect(judgeActBody(scope.state, scope.definition, body, { ...context, grants: [] })).toMatchObject({ result: "refused", reason: "unauthorized" });
  const grant = grantOf(rita, scope.at, ["offer"], t(10));
  const timed = judgeActBody(scope.state, scope.definition, body, { ...context, grants: [{ grant, current: true }] });
  expect(timed.result === "write" && timed.draft.judgesTime).toBe(true);
  expect(judgeActBody(scope.state, scope.definition, body,
    { ...scope.context({ reading: t(10) }), actor: rita.key, grants: [{ grant, current: true }] })).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(scope.state.snapshot()).toBe(before);
});

test("only a reached intent read stops a body and exposes no earlier partial effects", () => {
  const definition = variant(deskDefinition.declared, data => {
    data.items.repo.values.marker = { fixed: false, required: false, of: { type: "int", min: 0, max: 1 } };
    data.items.repo.values.seen = { fixed: false, required: false, of: { type: "digest" } };
    data.acts.probe = act({ step: "transition", on: "repo", fields: { run: { type: "bool", required: true } }, effects: [
      { value: { slot: "marker", from: { const: 1 } } },
      { value: { slot: "seen", from: { intent: true } }, if: [{ equals: { a: { field: "run" }, b: { const: true } } }] },
    ] });
  });
  const scope = created(definition), before = scope.state.snapshot();
  const body = { kind: "probe", on: 0, expected: { on: scope.item(0).revision }, fields: { run: false } };
  const context = { ...scope.context(), actor: rita.key };
  const skipped = judgeActBody(scope.state, definition, body, context);
  expect(skipped.result).toBe("write");
  if (skipped.result !== "write") return expect.fail("the conditional read must stay skipped");
  expect(skipped.draft.effects).toEqual([{ effect: "value", item: 0, slot: "marker", value: 1 }]);
  expect(judgeActBody(scope.state, definition, { ...body, fields: { run: true } }, context))
    .toEqual({ result: "unavailable", reason: "unavailable", lacks: ["intent"] });
  expect(scope.state.snapshot()).toBe(before);
});

test("primitive capability intent stays lazy through the effect context copy and stops only on the reached read", () => {
  const definition = valid(validateDefinition(deviceCommandFixture, PROPOSED_BOUNDS));
  const scope = created(definition, {}, "TEST primitive intent");
  const device = scope.did(rita, "commission", { fields: { kind: "fan" } });
  const before = scope.state.snapshot();
  const body = { kind: "command", on: device.seq, fields: { target: "on", level: 1 }, expected: { on: scope.item(device.seq).revision } };
  let readAt: "none" | "guard" | "effect" = "none";
  const visited: string[] = [];
  // Scripted primitive rules witness the actual given/copy boundary, not
  // device-command authority or command records.
  const capabilities: Capabilities = {
    implements: () => true,
    guard(_capability, _guard, _args, given) { visited.push("guard"); if (readAt === "guard") void given.intent; return true; },
    effect(_capability, _effect, _args, given) { visited.push("effect"); if (readAt === "effect") void given.intent; return []; },
  };
  const context = { ...scope.context(), actor: rita.key, capabilities };
  expect(judgeActBody(scope.state, definition, body, context).result).toBe("write");
  expect(visited.splice(0)).toEqual(["guard", "effect"]);
  readAt = "guard";
  expect(judgeActBody(scope.state, definition, body, context)).toEqual({ result: "unavailable", reason: "unavailable", lacks: ["intent"] });
  expect(visited.splice(0)).toEqual(["guard"]);
  readAt = "effect";
  expect(judgeActBody(scope.state, definition, body, context)).toEqual({ result: "unavailable", reason: "unavailable", lacks: ["intent"] });
  expect(visited).toEqual(["guard", "effect"]);
  expect(scope.state.snapshot()).toBe(before);
});

test("a reached scope creation needs the real cause and returns no partial opening", () => {
  const scope = created(), body = { kind: "open-issue", on: null, expected: {}, fields: { title: "TEST child" } };
  const before = scope.state.snapshot();
  expect(judgeActBody(scope.state, scope.definition, body, { ...scope.context(), actor: rita.key }))
    .toEqual({ result: "unavailable", reason: "unavailable", lacks: ["intent"] });
  expect(scope.state.snapshot()).toBe(before);
});

test("item-only holds and empty workspaces remain supported while reached workspace records or operations stop the body", () => {
  const scope = new Scope(laneDefinition);
  const offered = scope.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  scope.did(rita, "assign", { ...on(scope, offered.seq), fields: { performer: keys.una.member } });
  const body = { kind: "take-hold", on: null, fields: { commitment: offered.seq }, expected: { commitment: scope.item(offered.seq).revision } };
  const context = { ...scope.context(), actor: keys.una.key }, before = scope.state.snapshot();
  const itemOnly = judgeActBody(scope.state, scope.definition, body, context);
  expect(itemOnly.result).toBe("write");
  if (itemOnly.result !== "write") return expect.fail("the item hold must admit without a workspace");
  const held = itemOnly.draft.effects.find(effect => effect.effect === "hold");
  expect(held?.effect).toBe("hold");
  if (!held || held.effect !== "hold") return expect.fail("the item hold must be derived");
  let derived: readonly Effect[] = [];
  // Scripted workspace output witnesses the real emission/admission boundary,
  // not operation identifiers, external execution or workspace authority.
  const capabilities: Capabilities = { implements: () => true, guard: () => true, effect: () => [], workspace: () => derived };
  const withWorkspace = { ...context, capabilities };
  const empty = judgeActBody(scope.state, scope.definition, body, withWorkspace);
  expect(empty.result === "write" && empty.draft.effects).toEqual(itemOnly.draft.effects);
  derived = [{ effect: "record", capability: "hold@1", kind: "fork", key: [held.item], state: "creating", values: {} }];
  expect(judgeActBody(scope.state, scope.definition, body, withWorkspace)).toEqual({ result: "unavailable", reason: "unavailable", lacks: ["entry"] });
  derived = [
    { effect: "operation", k: 0, owner: "hold@1", kind: "fork", attempts: 1 },
    { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null },
  ];
  expect(judgeActBody(scope.state, scope.definition, body, withWorkspace)).toEqual({ result: "unavailable", reason: "unavailable", lacks: ["entry"] });
  expect(scope.state.snapshot()).toBe(before);
});

test("a Native given cannot read a fabricated signed input", () => {
  const scope = new Scope(gateWith()), rules = gateRules();
  const body = { kind: "enter", on: 0, expected: { on: scope.item(0).revision }, fields: { secret: "TEST absent ticket" } };
  expect(judgeActBody(scope.state, scope.definition, body, { ...scope.context(), platform: rules, actor: rita.key }))
    .toEqual({ result: "unavailable", reason: "unavailable", lacks: ["intent"] });
  expect(rules.ran).toEqual({});
});

test("self-ref metadata names actual emitted refs without relabeling equal numeric values", () => {
  const definition = variant(deskDefinition.declared, data => {
    data.items.issue.refs = {
      me: { fixed: true, required: false, to: { type: "item", of: "issue" } },
      at: { fixed: true, required: false, to: { type: "fact", kind: ["probe"], under: data.name } },
    };
    data.items.issue.values.marker = { fixed: false, required: false, of: { type: "int", min: 0, max: 10 } };
    data.acts.probe = act({ step: "open", on: "issue", effects: [
      { ref: { slot: "me", from: "self" } }, { ref: { slot: "at", from: "self" } },
      { value: { slot: "marker", from: { const: 1 } } },
    ] });
  });
  const scope = created(definition);
  const answer = judgeActBody(scope.state, definition, { kind: "probe", on: null, fields: {}, expected: {} }, { ...scope.context(), actor: rita.key });
  expect(answer.result).toBe("write");
  if (answer.result !== "write") return expect.fail("the two self refs must admit");
  expect(answer.selfRefs).toEqual([1, 2]);
  expect(answer.draft.effects).toEqual([
    { effect: "open", item: 1, type: "issue", state: "asked" },
    { effect: "ref", item: 1, slot: "me", to: 1 },
    { effect: "ref", item: 1, slot: "at", to: 1 },
    { effect: "value", item: 1, slot: "marker", value: 1 },
  ]);
});

test("the keyless body draws on the same holder account and stops when its request count is empty", () => {
  const definition = valid(changed(works, data => {
    data.items.job.refs = { ...data.items.job.refs, peer: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } };
    data.acts.use = { ...data.acts.again, grant: "works.use", fields: { peer: { type: "scope", kind: "lane", required: true } },
      effects: [{ ref: { slot: "peer", from: { field: "peer" } } }],
      sends: [{ tell: { to: { slot: "peer" }, message: "hello", fields: {}, result: {} } }] };
  }));
  const scope = new Works(definition);
  expect(scope.start()).toBe("written");
  const job = scope.last.seq;
  const body = () => ({ kind: "use", on: job, expected: { on: scope.item(job).revision }, fields: { peer: otherLane } });
  const context = () => ({ ...scope.context(), platform: scope.rules, actor: rita.key });
  const allowed = judgeActBody(scope.state, definition, body(), context());
  expect(allowed.result).toBe("write");
  if (allowed.result !== "write") return expect.fail("the holder starts with one request");
  expect(allowed.drawn.holders.get(job)?.requests ?? 0).toBe(0);
  expect(allowed.drawn.accounts).toEqual([{ seq: scope.head.seq + 1, n: 0, item: job }]);
  expect(scope.does("use", { ...on(scope, job), fields: { peer: otherLane } })).toBe("written");
  expect(scope.state.holder(job)?.requests ?? 0).toBe(0);
  expect(judgeActBody(scope.state, definition, body(), context())).toEqual({ result: "unavailable", reason: "unavailable" });
});

test("body item duties use the actual pre-entry settlement target when the same effects move its selector", () => {
  const definition = variant(M, settlesChanges.alias);
  const scope = new Scope(definition), { una } = keys;
  const start = () => scope.did(una, "start", { fields: { desk: directory } }).seq;
  const primary = start(), oldTarget = start(), nextTarget = start();
  scope.did(una, "point", { ...on(scope, primary), fields: { target: oldTarget } });
  const over = { ...on(scope, primary, { target: oldTarget }), fields: { next: nextTarget } };
  const signed = scope.intent(una, "mark-target", over), before = scope.state.snapshot();
  const answer = judgeActBody(scope.state, definition, bodyOf(signed.intent), { ...scope.context(), actor: una.key });
  expect(answer.result).toBe("write");
  if (answer.result !== "write") return expect.fail("the shared marker body must write");
  expect(answer.itemSettlement).toEqual({ item: oldTarget, form: { of: "also.target", in: ["open", "held"], sets: "a" } });
  expect(answer.itemDuties.get(oldTarget)?.some(duty => duty.slot === "a")).toBe(false);
  expect(answer.itemDuties.has(nextTarget)).toBe(false);
  expect(scope.state.snapshot()).toBe(before);
  scope.did(una, "mark-target", over);
  for (const [id, duties] of answer.itemDuties) expect(scope.state.itemDuties(id)).toEqual(duties);
  expect(scope.state.itemDuties(nextTarget).some(duty => duty.slot === "a")).toBe(true);
});

test("typed pending equality rejects numeric constants and copied working refs retain their actual provenance", () => {
  const definition = variant(deskDefinition.declared, data => {
    data.items.repo.refs.peer = { fixed: false, required: false, to: { type: "item", of: "issue" } };
    data.items.repo.values.matched = { fixed: false, required: false, of: { type: "item", of: "issue" } };
    const fields: ActType["fields"] = { left: { type: "item", of: "issue", required: true }, right: { type: "item", of: "issue", required: true } };
    data.acts.same = act({ step: "transition", on: "repo", fields, guards: [{ equals: { a: { field: "left" }, b: { field: "right" } } }] });
    for (const n of [1, 2]) data.acts[`number-${n}`] = act({ step: "transition", on: "repo", fields,
      guards: [{ equals: { a: { field: "left" }, b: { const: n } } }] });
    data.acts.copy = act({ step: "transition", on: "repo", fields, effects: [
      { ref: { slot: "peer", from: { field: "left" } } },
      { value: { slot: "matched", from: { slot: "peer" } } },
    ] });
    data.acts.shape = act({ step: "transition", on: "repo", fields: {
      list: { type: "list", of: { type: "item", of: "issue" }, max: 2, required: true },
      record: { type: "record", of: { "0": { type: "item", of: "issue", required: true } }, required: true },
    }, guards: [{ equals: { a: { field: "list" }, b: { field: "record" } } }] });
  });
  const scope = created(definition);
  const first = scope.did(rita, "open-issue", { fields: { title: "TEST first" } }).seq;
  const second = scope.did(rita, "open-issue", { fields: { title: "TEST second" } }).seq;
  const left = scope.item(first), right = scope.item(second), firstToken = {}, secondToken = {};
  let rightOrigin: "same" | "different" | "recorded" = "same";
  // The scripted position port supplies hypothetical identities. The real
  // fixture rows supply item content, not a native or committed alias claim.
  const provenance: NonNullable<Parameters<typeof judgeActBody>[3]["provenance"]> = ({ origin, type, value }) => {
    if (type?.type !== "item") return null;
    if (origin.at === "field" && ["left", "right", "list", "record"].includes(String(origin.path[0]))) {
      if (origin.path[0] === "right" && rightOrigin === "recorded") return { is: "recorded", id: second, item: right };
      const other = origin.path[0] === "right" && rightOrigin !== "same";
      return { is: "pending", token: other ? secondToken : firstToken, item: other ? right : left, alias: other ? second : first };
    }
    return typeof value === "number" ? { is: "recorded", id: value, item: scope.state.item(value) } : null;
  };
  const context = { ...scope.context(), actor: rita.key, provenance };
  const body = (kind: string) => ({ kind, on: 0, expected: { on: scope.item(0).revision }, fields: { left: first, right: rightOrigin === "same" ? first : second } });
  expect(judgeActBody(scope.state, definition, body("same"), context).result).toBe("write");
  rightOrigin = "different";
  expect(judgeActBody(scope.state, definition, body("same"), context)).toMatchObject({ result: "refused", reason: "guard-failed" });
  rightOrigin = "recorded";
  expect(judgeActBody(scope.state, definition, body("same"), context)).toMatchObject({ result: "refused", reason: "guard-failed" });
  for (const n of [1, 2]) expect(judgeActBody(scope.state, definition, body(`number-${n}`), context))
    .toEqual({ result: "unavailable", reason: "unavailable", lacks: ["entry"] });
  const copied = judgeActBody(scope.state, definition, body("copy"), context);
  expect(copied.result).toBe("write");
  if (copied.result !== "write") return expect.fail("the typed copy must keep its Source");
  expect(copied.outputRefs).toEqual([
    { effect: 0, path: ["to"], token: firstToken },
    { effect: 1, path: ["value"], token: firstToken },
  ]);
  expect(copied.draft.effects).toEqual([
    { effect: "ref", item: 0, slot: "peer", to: first },
    { effect: "value", item: 0, slot: "matched", value: first },
  ]);
  expect(judgeActBody(scope.state, definition, { ...body("shape"), fields: { list: [first], record: { "0": first } } }, context))
    .toMatchObject({ result: "refused", reason: "guard-failed" });
});

test("logical after bases do not accept equal counters and opaque pending metadata stays lazy", () => {
  const definition = valid(validateDefinition(deviceCommandFixture, PROPOSED_BOUNDS));
  const scope = created(definition, {}, "TEST pending metadata");
  const device = scope.did(rita, "commission", { fields: { kind: "fan" } }).seq;
  const row = scope.item(device), token = {}, subject = {};
  let numericBasis = false, read: "none" | "id" | "revision" | "opened" = "none";
  const provenance: NonNullable<Parameters<typeof judgeActBody>[3]["provenance"]> = ({ origin }) => {
    if (origin.at === "on" || (origin.at === "item" && origin.item === row)) return { is: "pending", token, item: row, alias: device };
    if (origin.at === "expected") return numericBasis ? { is: "recorded-revision", value: row.revision, subject } : { is: "after", token, subject };
    if (origin.at === "revision") return { is: "after", token, subject };
    if (origin.at === "opened") return { is: "entry" };
    return null;
  };
  const capabilities: Capabilities = {
    implements: () => true,
    guard: () => true,
    effect(_capability, _effect, _args, given) { if (read !== "none") void given.fromItems?.["device"]?.[read]; return []; },
  };
  const body = { kind: "command", on: device, fields: { target: "on", level: 1 }, expected: { on: row.revision } };
  const context = { ...scope.context(), actor: rita.key, capabilities, provenance };
  expect(judgeActBody(scope.state, definition, body, context).result).toBe("write");
  numericBasis = true;
  expect(judgeActBody(scope.state, definition, body, context)).toEqual({ result: "unavailable", reason: "unavailable", lacks: ["entry"] });
  numericBasis = false;
  for (const member of ["id", "revision", "opened"] as const) {
    read = member;
    expect(judgeActBody(scope.state, definition, body, context)).toEqual({ result: "unavailable", reason: "unavailable", lacks: ["entry"] });
  }
});

test("a source, a recorded number and an absent numeric target keep separate lookup meanings", () => {
  const definition = variant(deskDefinition.declared, data => {
    data.acts.lookup = act({ step: "transition", on: "repo", fields: { target: { type: "item", of: "issue", required: true } } });
  });
  const scope = created(definition), id = scope.did(rita, "open-issue", { fields: { title: "TEST lookup" } }).seq;
  const row = scope.item(id), token = {};
  let mode: "source" | "recorded" | "missing-pending" | "missing-clear" = "source";
  const provenance: NonNullable<Parameters<typeof judgeActBody>[3]["provenance"]> = ({ origin, type, value }) => {
    if (type?.type !== "item" || typeof value !== "number") return null;
    if (origin.at === "field" && origin.path[0] === "target") {
      if (mode === "source") return { is: "pending", token, item: row, alias: id };
      if (mode === "missing-pending") return { is: "entry" };
      return { is: "recorded", id: value, item: mode === "recorded" ? row : null };
    }
    return { is: "recorded", id: value, item: scope.state.item(value) };
  };
  const context = { ...scope.context(), actor: rita.key, provenance };
  const body = () => ({ kind: "lookup", on: 0, expected: { on: scope.item(0).revision }, fields: { target: mode.startsWith("missing") ? 999 : id } });
  expect(judgeActBody(scope.state, definition, body(), context).result).toBe("write");
  mode = "recorded";
  expect(judgeActBody(scope.state, definition, body(), context).result).toBe("write");
  mode = "missing-pending";
  expect(judgeActBody(scope.state, definition, body(), context)).toEqual({ result: "unavailable", reason: "unavailable", lacks: ["entry"] });
  mode = "missing-clear";
  expect(judgeActBody(scope.state, definition, body(), context)).toMatchObject({ result: "refused", reason: "no-item" });
});

test("numeric absence changes only when the actual current opening becomes lookupable", () => {
  const definition = variant(deviceCommandFixture, data => {
    data.acts["phase-open"] = structuredClone(data.acts.commission);
    data.acts["phase-open"].guards = [{ capability: { name: "device-command", guard: "allowed", with: { kind: { field: "kind" } } } }];
    data.acts["phase-open"].effects.push({ capability: { name: "device-command", do: "open", with: { device: { slot: "kind" } } } });
  });
  const scope = created(definition, {}, "TEST actual opening phase");
  const device = scope.did(rita, "commission", { fields: { kind: "fan" } }).seq;
  const seen: unknown[] = [];
  const provenance: NonNullable<Parameters<typeof judgeActBody>[3]["provenance"]> = ({ value }) =>
    typeof value === "number" ? { is: "recorded", id: value, item: scope.state.item(value) } : null;
  const capabilities: Capabilities = {
    implements: () => true,
    guard(_capability, _guard, _args, given) { seen.push(["guard", given.view.item(999)]); return true; },
    effect(_capability, _effect, _args, given) {
      seen.push(["known after", given.view.item(0)?.id]);
      seen.push(["missing after", given.view.item(999)]);
      return [];
    },
  };
  const context = { ...scope.context(), actor: rita.key, capabilities, provenance };
  const before = scope.state.snapshot();
  expect(judgeActBody(scope.state, definition, { kind: "phase-open", on: null, fields: { kind: "heater" }, expected: {} }, context))
    .toEqual({ result: "unavailable", reason: "unavailable", lacks: ["entry"] });
  expect(seen).toEqual([["guard", null], ["known after", 0]]);
  expect(scope.state.snapshot()).toBe(before);
  seen.length = 0;
  expect(judgeActBody(scope.state, definition,
    { kind: "command", on: device, fields: { target: "on", level: 1 }, expected: { on: scope.item(device).revision } }, context).result).toBe("write");
  expect(seen).toEqual([["guard", null], ["known after", 0], ["missing after", null]]);
  expect(scope.state.snapshot()).toBe(before);
});
