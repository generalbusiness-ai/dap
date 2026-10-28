/** The lending scenario as a story. examples/lending/scenarios/application.json is the witness. */
import { lending } from "./lending.ts";
import { lendingPackage } from "./lending-package.ts";
import { accepted, member, reference, refused, tell } from "./story.ts";

const seed = (digit: string, next: string) => (digit + next).repeat(32);

export const lendingStory = () => tell({
  name: "lending-package", time: "2026-10-18T12:00:00Z", definition: lending, projections: lendingPackage.projections,
  actors: { member: { seed: seed("2", "2"), actions: ["lending.member"] }, staff: { seed: seed("2", "3"), actions: ["lending.staff"] }, visitor: { seed: seed("2", "4"), actions: [] } },
  founding: { actor: "member", fields: { opener: member("member"), destination: reference("destination") } },
}, (s) => {
  s.projection("state");
  const donation = s.act("member", "donate", { fields: { name: "Copper pot", description: "A maintained package fixture", page: "shelf/0123456789abcdef.md", content: "A signed fixture page" } }, accepted, "donation");
  s.retry(donation, accepted);
  s.act("visitor", "borrow", { on: 1, fields: { content: "No membership" } }, refused("unauthorized"));
  s.act("member", "borrow", { on: 1, fields: { content: "Borrowed in the local fixture" } }, accepted);
  s.assert(1, { state: "lent", parties: { borrower: member("member") } });
  s.act("member", "cancel", { on: 1, fields: { reason: "No staff grant", content: "Refused" } }, refused("unauthorized"));
  s.act("member", "return", { on: 1, fields: { content: "Returned in the local fixture" } }, accepted);
  s.assert(1, { state: "available" });
  s.act("member", "donate", { fields: { name: "Unsafe path", description: "Must refuse", page: "README.md", content: "No write outside shelf" } }, refused("guard-failed"));
  s.act("staff", "cancel", { on: 1, fields: { reason: "Retired fixture", content: "Closed in the local fixture" } }, accepted);
  s.assert(1, { state: "gone", values: { reason: "Retired fixture" } });
  s.projection("state", ["library", "thing"], { thing: ["name", "reason"] });
  s.projection("activity", ["events"]);
});
