/** The manifest consumes the literal action and field types, not a copied schema. */
import { declareRoles, entries, fieldOf, items, manifest, projection, views } from "../src/package.ts";
import { define, fact, int, item, itemOf, list, live, member, open, optional, party, record, required, scope, text, time, transition, value } from "../src/index.ts";

const permits = declareRoles({ admin: ["typed.create"], writer: ["typed.edit"] });
const root = item("root", { states: { ready: live }, parties: { owner: party.required }, values: { title: value.fixed(text(20)), count: value.optional(int(0, 20)), at: value.optional(time) } });
const definition = define({ name: "typed-package", genesis: "establish", items: [root], acts: {
  establish: open(root, permits.grant("typed.create"), { fields: { title: required(text(20)) } }, ({ on, f }) => ({ effects: [on.value("title", f.title)] })),
  edit: transition(root, permits.grant("typed.edit"), { fields: {
    title: required(text(20)), target: optional(itemOf(root)), destination: optional(scope("destination")),
    evidence: optional(fact("typed-package", "edit")), citation: optional({ type: "reference", fragment: 64 }),
    nested: optional(record({ targets: required(list(itemOf(root), 3)), signer: required(member), destination: optional(scope("destination")) })),
  } }, ({ on, f }) => ({ effects: [on.value("title", f.title)] })),
} });
const state = projection(definition, "definition.json", { roots: items(root, ["title", "owner", "count", "at"]) });
const spec = { name: "typed.package", version: "1.0.0", definition: { path: "definition.json", value: definition }, projections: { state }, views: {}, roles: permits.roles, scenarios: ["basic.json"], browser: { entry: "main.ts", html: "index.html", script: "main.js" } } as const;
manifest(spec);
// @ts-expect-error The real edit act requires typed.edit, which no remaining role holds.
manifest({ ...spec, roles: { admin: ["typed.create"] } });
// @ts-expect-error Roles declare the complete action union before the definition.
permits.grant("typed.remove");
// @ts-expect-error A slot comes from the declared item value.
items(root, ["missing"]);
// @ts-expect-error The entry projection's selected act has no missing field.
projection(definition, "definition.json", { events: entries(["edit"], { invalid: fieldOf("missing") }) });

/** The actual definition and selected field types also constrain view authoring. */
export function typedViewBindings() {
  const activity = projection(definition, "definition.json", { events: entries(["edit"], { actor: "signer" }) });
  const view = views(definition, { state, activity }, permits.roles);
  const layout = { display: "inline", back: null, context: "Root", fallback: "Root", title: "title", facts: [] } as const;
  const good = view.card("state", "roots", ({ row, text, when, act }) => ({
    ...layout, actor: "owner", title: "title", facts: ["state", { field: "count", label: "Count", scale: 0, unit: "" }, { field: "at", label: "When", format: "age" }],
    context: text`root ${row.id}`, acts: [act("edit", "Edit", when`${row.count} >= 0`, { parameters: { title: { kind: "text", label: "Title", required: true, max: 20 } } })],
  }));
  manifest({ ...spec, views: { root: good } });
  // @ts-expect-error The selected source declares title, not missing.
  manifest({ ...spec, views: { root: { ...good, title: "missing" } } });
  // @ts-expect-error The bound projection has roots, not root.
  view.card("state", "root", () => layout);
  // @ts-expect-error A log selects an entry source.
  view.log("state", "roots", () => layout);
  // @ts-expect-error Only a selected member field can identify the actor.
  view.card("state", "roots", () => ({ ...layout, actor: "title" }));
  // @ts-expect-error Scaled facts require a selected integer field.
  view.card("state", "roots", () => ({ ...layout, facts: [{ field: "title", label: "Title", scale: 0, unit: "" }] }));
  // @ts-expect-error Age facts require a selected time field.
  view.card("state", "roots", () => ({ ...layout, facts: [{ field: "count", label: "Count", format: "age" }] }));
  view.card("state", "roots", ({ row, text, when, act }) => {
    // @ts-expect-error Template references come from this selected row.
    text`${row.missing}`;
    // @ts-expect-error Rule references come from this selected row.
    when`${{ row: "missing" }}`;
    // @ts-expect-error The definition declares edit, not remove.
    act("remove", "Remove", "true");
    // @ts-expect-error The native title field takes text, not an integer.
    act("edit", "Edit", "true", { args: { title: 3 } });
    const destination = { scope: "sc_test", genesis: "sha256:test", kind: "destination" } as const;
    const signer = { membership: { ...destination, kind: "membership" }, member: "@tester" } as const;
    act("edit", "Edit", "true", { args: { title: "Title", target: 1, destination, evidence: { at: destination, seq: 0, hash: "sha256:test" }, citation: { document: "sha256:test" }, nested: { targets: [1], signer, destination } } });
    // @ts-expect-error A native local item is a number, not its string spelling.
    act("edit", "Edit", "true", { args: { target: "1" } });
    // @ts-expect-error A scope field requires its declared native scope reference.
    act("edit", "Edit", "true", { args: { destination: { ...destination, kind: "membership" } } });
    // @ts-expect-error A fact field requires a native entry reference.
    act("edit", "Edit", "true", { args: { evidence: 1 } });
    // @ts-expect-error A citation requires a document or entry reference.
    act("edit", "Edit", "true", { args: { citation: "sha256:test" } });
    // @ts-expect-error Nested native item lists retain their numeric element type.
    act("edit", "Edit", "true", { args: { nested: { targets: ["1"], signer } } });
    // @ts-expect-error A nested record retains its required native members.
    act("edit", "Edit", "true", { args: { nested: { targets: [1] } } });
    // @ts-expect-error The human title input must fit its native text field.
    act("edit", "Edit", "true", { parameters: { title: { kind: "int", label: "Title", required: true, min: 0, max: 20, unit: "" } } });
    const computed = { row: "count", part: "nested" } as const;
    // @ts-expect-error The bound view condition also refuses stored computed-part references.
    when`${computed}`;
    const computedWaiting = { row: "waiting", part: "nested" } as const;
    // @ts-expect-error The special waiting token also refuses stored computed-part references.
    text`${computedWaiting}`;
    return layout;
  });
  const limited = views(definition, { state }, { reader: ["typed.create"] });
  limited.card("state", "roots", ({ act }) => {
    // @ts-expect-error No supplied role holds the real edit act's grant.
    act("edit", "Edit", "true");
    return layout;
  });
  view.log("activity", "events", ctx => {
    // @ts-expect-error Journal rows expose no native act constructor.
    ctx.act("edit", "Edit", "true");
    return { ...layout, title: "type", actor: "actor", facts: ["time"] };
  });
}
