import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { format } from "prettier";
import { declareRoles, entries, fieldOf, items, manifest, projection, views } from "../src/package.ts";
import { define, detached, expression, item, live, one, open, optional, party, required, text, transition, value } from "../src/index.ts";
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
test("views bind real rows, acts, inputs and templates while retaining the existing presentation format", () => {
  const activity = projection(definition, "definition.json", { events: entries(["edit"], { actor: "signer" }) });
  const view = views(definition, { state: projected, activity }, roles.roles);
  const card = view.card("state", "roots", ({ row, waiting, text, when, act }) => ({
    title: "title", summary: "note", facts: ["state", { field: "revision", label: "Revision", scale: 0, unit: "" }],
    display: "inline", back: null,
    acts: [act("edit", "Edit", when`${row.state} = 'ready'`, { parameters: { note: { kind: "text", label: "Note", required: false, max: 20 } } })],
    waiting: { ready: text`Ready: ${row.title}` }, context: text`root ${row.id} ${waiting}`, fallback: text`${row.title}: ${row.state}`,
  }));
  const log = view.log("activity", "events", ({ row, text }) => ({
    title: "type", actor: "actor", facts: [{ field: "time", label: "When", format: "age" }], display: "fullscreen", back: "root",
    context: text`Entry ${row.id}`, fallback: text`${row.type}`,
  }));
  const given = { ...spec, projections: { state: projected, activity }, views: { root: card, history: log } };
  expect(manifest(given).presentation.views).toEqual({ root: card, history: log });
  expect(card.acts).toEqual([{ act: "edit", label: "Edit", parameters: { note: { kind: "text", label: "Note", required: false, max: 20 } }, needs: "package.edit", when: "state = 'ready'" }]);
  expect([card.context, card.fallback]).toEqual(["root {id} {waiting}", "{title}: {state}"]);
  let source = "";
  transition(root, roles.grant("package.edit"), { fields: { title: required(text(40)) }, also: { peer: one(root) } }, ctx => {
    source = expression(ctx)`${ctx.f.title} = ${ctx.on.slot("title")} and ${ctx.also.peer.slot("title")} != null`;
    return {};
  });
  expect(source).toBe("fields.title = subjects.on.values.title and subjects.`also.peer`.values.title != null");
  const row = { "and": { row: "and" } } as const;
  expect(expression({ row })`${row.and} = true`).toBe("`and` = true");
  expect(() => Reflect.apply(manifest, null, [{ ...spec, roles: { admin: ["package.create"] } }])).toThrow("no role holds package.edit");
  const forged = { ...card, title: "missing" };
  expect(() => Reflect.apply(manifest, null, [{ ...given, views: { root: forged } }])).toThrow("unknown field missing");
  expect(() => Reflect.apply(manifest, null, [{ ...given, views: { root: { ...card, actor: "title" } } }])).toThrow("member field");
  const foreign = { ...card, acts: [{ act: "edit", label: "Edit", needs: "package.create", when: "true" }] };
  expect(() => manifest({ ...given, views: { root: foreign } })).toThrow("source and roles");
  const extra = { ...card, extra: true };
  expect(() => manifest({ ...given, views: { root: extra } })).toThrow("unsupported fields");
  expect(() => manifest({ ...given, views: { root: { ...card, context: "{missing}" } } })).toThrow("unknown field missing");
  expect(() => Reflect.apply(manifest, null, [{ ...given, views: { root: { ...card, facts: [{ field: "title", label: "Title", scale: 0, unit: "" }] } } }])).toThrow("integer field");
  expect(() => manifest({ ...given, views: { root: { ...card, acts: [{ act: "edit", label: "Edit", needs: "package.edit", when: "true", args: { note: 3 } }] } } })).toThrow("invalid argument note");
  const wrongSource = { ...projected, sources: { roots: { ...projected.sources.roots, fields: { ...projected.sources.roots.fields, title: { ...projected.sources.roots.fields.title, of: { type: "int", min: 0, max: 40 } } } } } } as const;
  expect(() => manifest({ ...given, projections: { ...given.projections, state: wrongSource }, views: { root: card } })).toThrow("binding differs");
});
