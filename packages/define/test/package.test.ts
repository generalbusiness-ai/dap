import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { format } from "prettier";
import { declareRoles, entries, fieldOf, items, manifest, projection } from "../src/package.ts";
import { define, detached, item, live, open, optional, party, required, text, transition, value } from "../src/index.ts";
import { lendingPackage } from "../../../examples/lending/package.ts";
import { counterPackage } from "../../../apps/counter/package.ts";

test("the Lending manifest regenerates its retained file bytes", async () => {
  expect(await format(JSON.stringify(lendingPackage), { parser: "json" })).toBe(readFileSync(new URL("../../../examples/lending/dap.application.json", import.meta.url), "utf8"));
});
test("the Counter manifest regenerates its retained file bytes", async () => {
  expect(await format(JSON.stringify(counterPackage), { parser: "json" })).toBe(readFileSync(new URL("../../../apps/counter/dap.application.json", import.meta.url), "utf8"));
});

const roles = declareRoles({ admin: ["package.create", "package.edit"] });
const root = item("root", { states: { ready: live }, parties: { editors: party.list(3) }, values: { title: value.fixed(text(40)), note: value.optional(text(20)), attachment: value.optional(detached(64)) } });
const definition = define({ name: "package-example", genesis: "establish", items: [root], acts: {
  establish: open(root, roles.grant("package.create"), { fields: { title: required(text(40)) } }, ({ on, f }) => ({ effects: [on.value("title", f.title)] })),
  edit: transition(root, roles.grant("package.edit"), { fields: { note: optional(text(20)) } }),
  rename: transition(root, roles.grant("package.edit"), { fields: { title: required(text(40)) } }),
} });
const projected = projection(definition, "definition.json", { roots: items(root, ["editors", "title", "note"]) });
const spec = { name: "example.package", version: "1.0.0", definition: { path: "definition.json", value: definition }, projections: { state: projected }, views: {}, roles: roles.roles, scenarios: ["scenario.json"], browser: { entry: "main.ts", html: "index.html", script: "main.js" } } as const;

test("projection fields retain party-list bounds and slot nullability", () => {
  expect(projected.sources.roots).toEqual({ item: "root", read: "many", states: ["ready"], limit: 1, fields: {
    editors: { from: { kind: "party", name: "editors" }, of: { type: "list", of: { type: "member" }, max: 3 }, nullable: true },
    title: { from: { kind: "value", name: "title" }, of: { max: 40, type: "text" }, nullable: false },
    note: { from: { kind: "value", name: "note" }, of: { max: 20, type: "text" }, nullable: true },
  } });
});
test("projections refuse a field missing from one selected act or held as detached text", () => {
  const source = { events: entries(["edit", "rename"], { note: fieldOf("note") }) };
  expect(() => Reflect.apply(projection, null, [definition, "definition.json", source])).toThrow();
  expect(() => projection(definition, "definition.json", { roots: items(root, ["attachment"]) })).toThrow("cannot display detached text");
});
test("manifest runtime checking refuses a role gap and an unknown view field", () => {
  expect(() => Reflect.apply(manifest, null, [{ ...spec, roles: { admin: ["package.create"] } }])).toThrow("no role holds package.edit");
  expect(() => Reflect.apply(manifest, null, [{ ...spec, views: { bad: { projection: "state", item: "roots", title: "missing", facts: [], actor: null } } }])).toThrow("unknown field missing");
});
