import { readFileSync } from "node:fs";
import { expect, expectTypeOf, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { created, grantOf, keys, valid, directory, type Ledger } from "@generalbusiness/dap-derive/testing";
import { lending as lendingData } from "../../examples/lending/definition.ts";
import { LENDING_DEFINITION } from "../../examples/lending/pin.ts";
import { counting as countingData } from "../../apps/counter/definition.ts";
import { COUNTING_DEFINITION } from "../../apps/counter/pin.ts";
import { lending } from "./lending.ts";
import { counting } from "./counter.ts";
import { compile } from "./lib.ts";
import { actsOn, formFor, room } from "./room.ts";

// ---------------------------------------------------------------- the rewrites are the pinned bytes

test("the lending rewrite compiles to the exact pinned definition", () => {
  const { definition, digest, findings } = compile(lending);
  expect(definition).toEqual(lendingData);
  expect(digest).toBe(LENDING_DEFINITION);
  expect(digest).toBe(definitionDigest(lendingData));
  expect(Buffer.from(canonicalize(definition) + "\n")).toEqual(readFileSync(new URL("../../examples/lending/definition.json", import.meta.url)));
  expect(findings).toEqual([]);
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
});

test("the counter rewrite compiles to the exact pinned definition", () => {
  const { definition, digest, findings } = compile(counting);
  expect(definition).toEqual(countingData);
  expect(digest).toBe(COUNTING_DEFINITION);
  expect(Buffer.from(canonicalize(definition) + "\n")).toEqual(readFileSync(new URL("../../apps/counter/definition.json", import.meta.url)));
  expect(findings).toEqual([]);
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
});

test("the builder's findings catch a rule that reads a field or a slot that does not exist", () => {
  const broken = { ...lending, rules: { "shelf-page": "fields.path = subjects.on.values.title" } };
  expect(compile(broken).findings).toEqual([
    { act: "donate", rule: "shelf-page", names: "path", message: "reads a field the act does not declare" },
    { act: "donate", rule: "shelf-page", names: "title", message: "reads a value slot none of the act's items declares" },
  ]);
});

// ---------------------------------------------------------------- the literal types flow to the client and the interface

test("the definition's numbers are literal types, so an interface derives its limits instead of repeating them", () => {
  expectTypeOf(lending.items.thing.values.name.of.max).toEqualTypeOf<80>();
  expectTypeOf(lending.items.thing.values.reason.of.max).toEqualTypeOf<280>();
  expectTypeOf(lending.items.thing.max).toEqualTypeOf<number>();
  // examples/lending/browser/model.ts declares NAME_BYTES = 80, DESCRIPTION_BYTES = 1000, REASON_BYTES = 280 and LendingAct by hand.
  expect([lending.items.thing.values.name.of.max, lending.items.thing.values.description.of.max, lending.items.thing.values.reason.of.max]).toEqual([80, 1000, 280]);
  expect(Object.keys(lending.acts).filter((k) => k !== lending.genesis)).toEqual(["donate", "borrow", "return", "cancel", "publish"]);
  expect(formFor(lending, "donate")).toEqual([
    { name: "name", kind: "text", required: true, max: 80 },
    { name: "description", kind: "text", required: true, max: 1000 },
    { name: "content", kind: "text", required: true, max: 4096 },
    { name: "page", kind: "text", required: true, max: 1024 },
  ]);
  expect(formFor(counting, "cancel-turn").at(-1)).toEqual({ name: "reason", kind: "enum", required: true, options: ["disconnect", "media-error"] });
  expect(actsOn(lending, "thing", "available")).toEqual(["borrow", "cancel"]);
  expect(actsOn(lending, "thing", "lent")).toEqual(["return", "cancel"]);
  expect(actsOn(lending, "thing", "gone")).toEqual([]);
});

// ---------------------------------------------------------------- the typed room

const destination = { ...directory, kind: "destination" as const };
const grants = (s: Ledger) => ({ grants: [keys.rita, keys.una, keys.vic].map((who) => ({ grant: grantOf(who, s.at, who === keys.rita ? ["lending.member", "lending.staff"] : ["lending.member"]), current: true })) });
const page = (s: Ledger) => `shelf/${s.entries.length.toString(16).padStart(16, "0")}.md`;

test("Nasruddin and the pot through the typed room: expected revisions come from the definition, fields from the types", async () => {
  const s = created(valid(validateDefinition(lending, PROPOSED_BOUNDS, RULE_PROFILES)), { opener: keys.rita.member, destination });
  const r = room(lending, s, grants), rita = r.as(keys.rita), una = r.as(keys.una), vic = r.as(keys.vic);
  const content = "A signed page";

  expect((await rita.donate({ fields: { name: "Big pot", description: "A heavy copper pot. Holds eight litres.", page: page(s), content } })).result).toBe("write");
  const big = s.last.seq;
  expect((await una.borrow({ on: big, fields: { content } })).result).toBe("write");
  expect(r.item(big)).toMatchObject({ state: "lent", parties: { borrower: keys.una.member } });
  expect(await vic.borrow({ on: big, fields: { content } })).toMatchObject({ result: "refused", reason: "guard-failed" });
  expect((await una.return({ on: big, fields: { content } })).result).toBe("write");
  expect(await una.cancel({ on: big, fields: { reason: "The pot died", content } })).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect((await rita.cancel({ on: big, fields: { reason: "Nasruddin says the pot died", content } })).result).toBe("write");
  expect(r.item(big)).toMatchObject({ state: "gone", values: { reason: "Nasruddin says the pot died" } });
  // publish names its thing by a field; the room resolves that `also` rule to the thing's revision.
  expect((await una.publish({ on: r.one("library").id, fields: { thing: big, content: "Corrected gone page" } })).result).toBe("write");
  expect(s.last.sends[0]).toMatchObject({ to: destination, message: { body: { message: "publish-file", fields: { content: "Corrected gone page" } } } });
  expect(s.entries.map(({ entry }) => (entry.input.type === "act" ? entry.input.signed.intent.kind : entry.input.type))).toEqual(["genesis", "donate", "borrow", "return", "cancel", "publish"]);
  expect(s.replay().snapshot()).toBe(s.state.snapshot());
});
