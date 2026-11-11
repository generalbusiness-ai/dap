/** The retained Lending scenario, with every judge outcome asserted during generation.
 * Grants and membership/destination references are explicit TEST stand-ins. */
import { accepted, member, reference, refused, tell, writesNothing, type EntryAssertion, type OutcomeAssertion, type StorySpec } from "@generalbusiness/dap-define/story";
import { lending } from "./definition.ts";
import { lendingPackage } from "./package.ts";

const page = "shelf/0123456789abcdef.md";
const publication = (content: string) => [{ n: 0, to: reference("destination"), message: { class: "request", type: "tell", body: { message: "publish-file", fields: { path: page, content } } } }];
const entry = (kind: string, effects: EntryAssertion["effects"], content: string): OutcomeAssertion => ({ entries: [{ input: { type: "act", kind }, effects, sends: publication(content) }] });

export const lendingStorySpec = {
  name: "lending-package", time: "2026-10-18T12:00:00Z", definition: lending, projections: lendingPackage.projections,
  actors: {
    member: { seed: "22".repeat(32), actions: ["lending.member"] },
    staff: { seed: "23".repeat(32), actions: ["lending.staff"] },
    visitor: { seed: "24".repeat(32), actions: [] },
  },
  founding: { actor: "member", fields: { opener: member("member"), destination: reference("destination") } },
  foundingAsserts: { entries: [{ input: { type: "genesis", kind: "establish" }, effects: [
    { effect: "open", item: 0, type: "library", state: "open" },
    { effect: "party", item: 0, slot: "founder", member: member("member") },
    { effect: "ref", item: 0, slot: "destination", to: reference("destination") },
  ], sends: [] }] },
} satisfies StorySpec<typeof lending>;

export const lendingStory = () => tell(lendingStorySpec, story => {
  story.projection("state");
  const donation = story.act("member", "donate", { fields: { name: "Copper pot", description: "A maintained package fixture", page, content: "A signed fixture page" } }, accepted, entry("donate", [
    { effect: "open", item: 1, type: "thing", state: "available" },
    { effect: "party", item: 1, slot: "donor", member: member("member") },
    { effect: "value", item: 1, slot: "name", value: "Copper pot" },
    { effect: "value", item: 1, slot: "description", value: "A maintained package fixture" },
    { effect: "value", item: 1, slot: "page", value: page },
  ], "A signed fixture page"), "donation");
  story.retry(donation, accepted, writesNothing);
  story.act("visitor", "borrow", { on: 1, fields: { content: "No membership" } }, refused("unauthorized"), writesNothing);
  story.act("member", "borrow", { on: 1, fields: { content: "Borrowed in the local fixture" } }, accepted, entry("borrow", [
    { effect: "state", item: 1, state: "lent" }, { effect: "party", item: 1, slot: "borrower", member: member("member") },
  ], "Borrowed in the local fixture"));
  story.assert(1, { state: "lent", parties: { borrower: member("member") } });
  story.act("member", "cancel", { on: 1, fields: { reason: "No staff grant", content: "Refused" } }, refused("unauthorized"), writesNothing);
  story.act("member", "return", { on: 1, fields: { content: "Returned in the local fixture" } }, accepted, entry("return", [
    { effect: "state", item: 1, state: "available" }, { effect: "party", item: 1, slot: "borrower", member: null },
  ], "Returned in the local fixture"));
  story.assert(1, { state: "available" });
  story.act("member", "donate", { fields: { name: "Unsafe path", description: "Must refuse", page: "README.md", content: "No write outside shelf" } }, refused("guard-failed"), writesNothing);
  story.act("staff", "cancel", { on: 1, fields: { reason: "Retired fixture", content: "Closed in the local fixture" } }, accepted, entry("cancel", [
    { effect: "state", item: 1, state: "gone" },
    { effect: "value", item: 1, slot: "reason", value: "Retired fixture" },
    { effect: "party", item: 1, slot: "borrower", member: null },
  ], "Closed in the local fixture"));
  story.assert(1, { state: "gone", values: { reason: "Retired fixture" } });
  story.projection("state", { sources: ["library", "thing"], fields: { thing: ["name", "reason"] } });
  story.projection("activity", { at: "head", sources: ["events"] });
});
