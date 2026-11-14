/** Real in-memory body/runtime judges. Fixture grants and platform rules are
 * explicit stand-ins; no native commit, membership service or transport runs. */
import { expect, test } from "vitest";
import type { ActType, Intent } from "@generalbusiness/dap-contract";
import { judgeActBody, type Capabilities } from "../src/index.ts";
import { Scope, created, deskDefinition, grantOf, keys, laneDefinition, on, otherLane, t, valid, variant } from "./fixtures.ts";
import { gateRules, gateWith } from "./fixtures-marks.ts";
import { Works, changed, works } from "./fixtures-holds.ts";

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
  const definition = variant(deskDefinition.declared, data => {
    data.capabilities = [{ name: "device-command", version: 1 }];
    data.acts.probe = act({ step: "transition", on: "repo",
      guards: [{ capability: { name: "device-command", guard: "allowed", with: { kind: { const: "fan" } } } }],
      effects: [{ capability: { name: "device-command", do: "open", with: { device: { const: "fan" } } } }],
    });
  });
  const scope = created(definition), before = scope.state.snapshot();
  const body = { kind: "probe", on: 0, fields: {}, expected: { on: scope.item(0).revision } };
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
      me: { fixed: true, required: true, to: { type: "item", of: "issue" } },
      at: { fixed: true, required: true, to: { type: "fact", kind: ["probe"], under: data.name } },
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
    data.acts.use = { ...data.acts.again, grant: "works.use", fields: { peer: { type: "scope", kind: "lane", required: true } },
      sends: [{ tell: { to: { field: "peer" }, message: "hello", fields: {}, result: {} } }] };
  }));
  const scope = new Works(definition);
  expect(scope.start()).toBe("written");
  const job = scope.last.seq;
  const body = () => ({ kind: "use", ...on(scope, job), fields: { peer: otherLane } });
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
