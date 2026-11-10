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
