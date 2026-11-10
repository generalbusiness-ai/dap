/** The manifest consumes the literal action and field types, not a copied schema. */
import { declareRoles, entries, fieldOf, items, manifest, projection } from "../src/package.ts";
import { define, item, live, open, required, text, value } from "../src/index.ts";

const permits = declareRoles({ admin: ["typed.create"], writer: ["typed.edit"] });
const root = item("root", { states: { ready: live }, values: { title: value.fixed(text(20)) } });
const definition = define({ name: "typed-package", genesis: "establish", items: [root], acts: {
  establish: open(root, permits.grant("typed.create"), { fields: { title: required(text(20)) } }, ({ on, f }) => ({ effects: [on.value("title", f.title)] })),
  edit: open(root, permits.grant("typed.edit"), { fields: { title: required(text(20)) } }, ({ on, f }) => ({ effects: [on.value("title", f.title)] })),
} });
const state = projection(definition, "definition.json", { roots: items(root, ["title"]) });
const spec = { name: "typed.package", version: "1.0.0", definition: { path: "definition.json", value: definition }, projections: { state }, views: {}, roles: permits.roles, scenarios: ["basic.json"], browser: { entry: "main.ts", html: "index.html", script: "main.js" } } as const;
manifest(spec);
// @ts-expect-error The real edit act requires typed.edit, which no remaining role holds.
manifest({ ...spec, roles: { admin: ["typed.create"] } });
// @ts-expect-error The projection's source has title, not missing.
manifest({ ...spec, views: { bad: { projection: "state", item: "roots", title: "missing", facts: [], actor: null } } });
// @ts-expect-error Roles declare the complete action union before the definition.
permits.grant("typed.remove");
// @ts-expect-error A slot comes from the declared item value.
items(root, ["missing"]);
// @ts-expect-error The entry projection's selected act has no missing field.
projection(definition, "definition.json", { events: entries(["edit"], { invalid: fieldOf("missing") }) });
