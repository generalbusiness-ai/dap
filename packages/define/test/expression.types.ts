/** The tag takes the names the authoring context already checks. Compiler-only fixture. */
import { expression, grants, int, item, live, one, required, rule, transition, value } from "../src/index.ts";

const permits = grants({ set: "expression.set" });
const device = item("device", { states: { ready: live }, values: { level: value.required(int(0, 100)) } });

export function typedExpressionNames() {
  return transition(device, permits.set, { fields: { minimum: required(int(0, 100)) }, also: { peer: one(device) } }, (ctx) => {
    const e = expression(ctx);
    const source = e`${ctx.f.minimum} <= ${ctx.on.slot("level")} and ${ctx.also.peer.slot("level")} >= 0`;
    // @ts-expect-error The act declares minimum, not mininum.
    const badField = () => e`${ctx.f.mininum}`;
    // @ts-expect-error The item declares level, not levle.
    const badSlot = () => e`${ctx.on.slot("levle")}`;
    // @ts-expect-error The act binds peer, not other.
    const badAlias = () => e`${ctx.also.other.slot("level")}`;
    void [badField, badSlot, badAlias];
    return { guards: [rule("level-range", source)] };
  });
}

/** View conditions share the serializer and keep their flat row namespace. */
export function typedRowExpressionNames() {
  const row = { state: { row: "state" }, "queue length": { row: "queue length" } } as const;
  const e = expression({ row });
  const source = e`${row.state} = 'ready' and ${row["queue length"]} >= 0`;
  // @ts-expect-error The bound row has state, not status.
  const badName = () => e`${{ row: "status" }}`;
  // @ts-expect-error An act field is not a projected row reference.
  const badKind = () => e`${{ field: "state" }}`;
  // @ts-expect-error Rows do not add computed parts to a reference.
  const badPart = () => e`${{ row: "state", part: "nested" }}`;
  const computed = { row: "state", part: "nested" } as const;
  // @ts-expect-error A stored structural reference also cannot select a computed part.
  const badStoredPart = () => e`${computed}`;
  void [badName, badKind, badPart, badStoredPart];
  return source;
}
