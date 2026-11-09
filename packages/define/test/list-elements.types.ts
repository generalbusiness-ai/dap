/** These assertions run in the normal strict package typecheck. */
import {
  each, elements, equals, grants, item, list, live, open, part,
  record, required, text,
} from "../src/index.ts";

const grant = grants({ establish: "typed-list.establish" });
const root = item("root", { states: { open: live } });

export const typedListAct = open(root, grant.establish, {
  fields: { rows: required(list(record({ label: required(text(40)) }), 8)) },
}, ({ f }) => ({
  guards: [each(f.rows, "row", (row) => {
    // @ts-expect-error The record declares label, not missing.
    row.missing;
    return { guards: [equals(row.label, "ready")] };
  })],
}));

const fetched = part({ field: "report" }, { field: "rows" });
export const unannotatedList = each(fetched, "row", (row) => {
  // @ts-expect-error A fetched list has no inferred record members.
  row.label;
  return { guards: [equals(row.self, "ready")] };
});
export const annotatedList = each(elements(fetched, "label"), "row", (row) => {
  // @ts-expect-error The annotation declares label, not missing.
  row.missing;
  return { guards: [equals(row.label, "ready")] };
});
