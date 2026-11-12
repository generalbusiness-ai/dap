import { describe, expect, test } from "vitest";
import { describeActLine, descriptionsOf, formFor, inline, type ActLike, type DefinitionLike } from "../src/index.ts";

const { guardSentences } = descriptionsOf({});
// @ts-expect-error A neutral description context has no MCP character-bounded renderer.
const mcpRenderer = descriptionsOf({}).describeAct;
void mcpRenderer;

// Pure declaration descriptions. Supplied records prove no read, admission,
// caller standing or Native scope outcome.
describe("descriptions are derived from the whole declaration", () => {
  // Invariant: every guard form, operand and part of the contract has a sentence; none renders as raw JSON.
  test("every guard form and operand of the contract renders as a sentence", () => {
    const operands = [{ field: "f" }, { presented: "p", part: "seq" }, { slot: "s" }, { slot: "s", of: "also.x" }, { element: "e.m" }, { element: "e" }, { item: "also.x" }, { signer: true }, { sender: true },
      { source: { field: "g" } }, { update: "state" }, { result: "reason" }, { scope: true }, { intent: true }, { none: true }, { const: 3 },
      { field: "f", part: { opened: "t" } }, { field: "f", part: { set: { item: { item: "on" }, slot: "s" } } }, { field: "f", part: { carried: "c" } }, { field: "f", part: { of: "kind", then: "seq" } }];
    const range = { type: "t", states: ["a"], where: [{ equals: { a: { slot: "s" }, b: { field: "f" } } }], except: ["also.x"] };
    const guards = [
      { state: ["a", "b"] }, { signer: ["owner"], of: "also.x" }, { notIn: ["authors"] }, { set: "s" }, { unset: "s" },
      ...operands.map((o) => ({ equals: { a: o, b: { field: "f" } } })), { differs: { a: { field: "f" }, b: { none: true } } },
      { some: range }, { none: range }, { count: { ...range, min: 1, max: { field: "n" } } }, { every: { list: "l", states: ["a"] } },
      { fact: { field: "f" } }, { fact: { presented: "p" } }, { fact: { element: "e" } }, { before: { slot: "s" } }, { after: { slot: "s" } }, { rule: "r" },
      { each: { list: { field: "l" }, as: "e", where: [{ differs: { a: { element: "e.m" }, b: { none: true } } }], guards: [{ state: ["a"] }] } },
      { has: { list: { field: "l" }, as: "e", where: [{ equals: { a: { element: "e.m" }, b: { signer: true } } }], guards: [{ set: "s" }] } },
      { anyOf: [[{ state: ["a"] }], [{ unset: "s" }]] }, { distinct: { list: { field: "l" }, as: "e", key: { element: "e.m" } } },
      { sameSet: { list: { field: "l" }, as: "e", key: { element: "e.id" }, items: range, match: [{ equals: { a: { slot: "s" }, b: { element: "e.m" } } }], ordered: true } },
      { capability: { name: "hold", guard: "staged", with: { a: { field: "f" }, b: { each: { field: "l" }, as: "e", value: { element: "e.m" } }, c: { items: range, slot: "s" } } } },
      { ifPresent: true, reason: "named", equals: { a: { field: "f" }, b: { const: "x" } } },
    ];
    const act: ActLike = { step: "transition", on: "t", grant: "g", also: { x: { item: "t", by: "f" } }, fields: { f: { type: "text", max: 9, required: true } }, presents: { p: { kind: ["k"], under: "d", required: false } }, guards, effects: [{ state: "b" }] };
    const definition: DefinitionLike = { name: "every-form", genesis: "g0", items: { t: {} }, acts: { a: act }, rules: { r: "true" } };
    const sentences = guardSentences(definition, act, { pinned: "sha256:x" });
    const texts = sentences.map(inline);
    expect(texts.length).toBe(guards.length);
    for (const text of texts) expect(text).not.toContain("the form {");
    expect(texts.at(-1)).toBe("the act's f equals \"x\", when it is given (named)");
    expect(inline(guardSentences(definition, { ...act, guards: [{ unknownForm: 1 }] }, { pinned: "sha256:x" })[0]!)).toBe("a guard of an unrecognized form");
  });

});

test("compact declaration lines retain CLI wording while sharing field, step and grant derivation", () => {
  const base = { step: "open" as const, on: "lane", grant: "issue.open", fields: {
    definition: { type: "digest", required: true }, title: { type: "text", required: true },
    body: { type: "text" }, conditions: { type: "list", required: true },
  } };
  expect(describeActLine("open-issue", base)).toBe("open-issue: opens a lane; needs issue.open. Fields: definition:digest title:text body?:text conditions:list.");
  expect(describeActLine("move", { ...base, step: "transition", on: "issue", grant: { code: "decide", grant: "issue.move" }, fields: {
    checked: { type: "code", code: "value-form" }, ready: { type: "bool", required: true },
  } })).toBe("move: moves a issue; the rule decide decides who may sign, with issue.move. Fields: checked?:value-form (rule) ready:bool.");
  expect(describeActLine("note", { ...base, step: "comment", on: null, fields: {} })).toBe("note: comments on no item; needs issue.open. Fields: none.");
});

test("catalogue bindings keep nested refusals independent and prototype-like pins unknown", () => {
  const pin = "platform:rules@1";
  const first = descriptionsOf({
    [pin]: { rules: { checkers: { refusals: ["first-catalogue"] } } },
    "constructor@1": { rules: {} },
  });
  const second = descriptionsOf({
    [pin]: { rules: { checkers: { refusals: ["second-catalogue"] } } },
    "constructor@1": { rules: {} },
  });
  const act: ActLike = { step: "comment", on: null, grant: "write", also: {}, fields: {},
    guards: [{ anyOf: [[{ code: "checkers", row: "P1" }]] }], effects: [] };
  const definition: DefinitionLike = { name: "nested-marks", genesis: "g0", items: {}, acts: { write: act } };
  expect(inline(first.guardSentences(definition, act, { pinned: pin })[0]!))
    .toBe("one of: [each check's checker is an active member whose role is checker (first-catalogue)]");
  expect(inline(second.guardSentences(definition, act, { pinned: pin })[0]!))
    .toBe("one of: [each check's checker is an active member whose role is checker (second-catalogue)]");
  expect(first.markText("constructor@1", { code: "name", row: "P1" }))
    .toBe("the platform rule name (row P1) holds");
  const offered = { ...act, fields: { body: { type: "text", max: 12, detached: true, required: true }, value: { type: "digest", value: { domain: "example", max: 32 } } }, presents: { proof: { kind: ["seen"], under: "example", required: true } } } as const;
  const neutral = formFor({ ...definition, acts: { write: offered } }, "write", { describe: first, setting: { pinned: pin }, who: { standing: "unknown" } });
  expect([neutral.fields, neutral.presents, neutral.beside]).toEqual([offered.fields, offered.presents, { texts: true, presented: true, values: true }]);
  expect(Object.hasOwn(neutral, "inputSchema")).toBe(false);
  const noBeside = formFor(definition, "write", { describe: first, setting: { pinned: pin }, who: { standing: "unknown" } });
  expect([noBeside.presents, noBeside.beside]).toEqual([{}, { texts: false, presented: false, values: false }]);
  void (() => {
    // @ts-expect-error: a transport-neutral form has no MCP envelope schema.
    return neutral.inputSchema;
  });
});
