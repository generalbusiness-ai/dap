/** Five isolated author mistakes. Strings become scratch files, never suppressed TS errors. */
export const diagnosticCases = [
  { id: "undeclared-state", mistake: "A state the act's item does not declare", typescript: { code: 2345, tokens: ["undeclared", "open"] } },
  { id: "undeclared-field", mistake: "A field the act does not declare", typescript: { code: 2339, tokens: ["undeclared", "label"] } },
  { id: "wrong-subject-slot", mistake: "A value slot declared only on another item", typescript: { code: 2345, tokens: ["other", "label"] } },
  { id: "unheld-grant", mistake: "A declared act grant no role holds", typescript: { code: 2345, tokens: ["example.write", "missingGrants"] } },
  { id: "undeclared-reason", mistake: "A refusal reason outside the declared reason names", typescript: { code: 2339, tokens: ["undeclared", "blocked"] } },
] as const;
export type DiagnosticCase = typeof diagnosticCases[number]["id"] | "baseline";

/** Before uses the old literal APIs; after uses the declared grant/reason APIs. */
export function fixtureSource(side: "before" | "after", selected: DiagnosticCase, lib: string): string {
  const modern = side === "after";
  const grants = modern ? 'B.grants({ read: "example.read", write: "example.write" })' : '{ read: "example.read", write: "example.write" } as const';
  const reasons = modern ? 'B.reasons({ blocked: "blocked" })' : '{ blocked: "blocked" } as const';
  const held = selected === "unheld-grant" ? '{ reader: [g.read] }' : '{ reader: [g.read, g.write] }';
  const roles = modern ? `B.roles(g, ${held})` : held;
  const guard = selected === "undeclared-state" ? 'on.in("undeclared")'
    : selected === "undeclared-reason" ? modern
      ? 'B.require(B.equals(B.constant(1), B.constant(1)), r.undeclared)'
      : 'B.refuse("undeclared", B.equals(B.constant(1), B.constant(1)))'
    : 'on.in("open")';
  const effect = selected === "undeclared-field" ? 'on.value("label", f.undeclared)'
    : selected === "wrong-subject-slot" ? 'on.value("other", f.label)'
    : 'on.value("label", f.label)';
  return `import * as B from ${JSON.stringify(lib)};
const g = ${grants};
export const r = ${reasons};
export const held = ${roles};
const root = B.item("root", { states: { open: B.live }, values: { label: B.value.optional(B.text(40)) } });
const sibling = B.item("sibling", { states: { open: B.live }, values: { other: B.value.optional(B.text(40)) } });
export const definition = B.define({ name: "diagnostic", genesis: "found", items: [root, sibling], ${modern ? 'grants: g, reasons: r,' : ''}
  acts: {
    found: B.open(root, g.read, {}, () => ({})),
    probe: B.transition(root, g.write, { fields: { label: B.required(B.text(40)) } }, ({ f, on }) => ({
      guards: [${guard}], effects: [${effect}],
    })),
  },
});
`;
}
