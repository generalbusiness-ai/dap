import type { Teller } from "../src/story.ts";
import { accepted, member, writesNothing } from "../src/story.ts";
import { lending } from "../../../examples/lending/definition.ts";

export function storyTypes(story: Teller<typeof lending>): void {
  story.act("member", "borrow", { on: 1, fields: { content: "A page" } }, accepted, writesNothing);
  // @ts-expect-error The act name belongs to the definition value.
  story.act("member", "missing", { fields: {} }, accepted, writesNothing);
  // @ts-expect-error Borrow declares content, not an unknown field.
  story.act("member", "borrow", { on: 1, fields: { missing: "A page" } }, accepted, writesNothing);
  // @ts-expect-error Donation requires its declared name, description, page and content fields.
  story.act("member", "donate", { fields: { name: "A thing" } }, accepted, writesNothing);
  // @ts-expect-error The opener field is a member, not an arbitrary integer.
  story.act("member", "establish", { fields: { opener: 3, destination: member("member") } }, accepted, writesNothing);
}
