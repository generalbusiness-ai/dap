/** The retained Lending scenario, with every judge outcome asserted during generation.
 * Grants and membership/destination references are explicit TEST stand-ins. */
import { accepted, member, reference, refused, tell, writesNothing, type EntryAssertion, type OutcomeAssertion, type StorySpec } from "@generalbusiness/dap-define/story";
import { lending } from "./definition.ts";
import { lendingPackage } from "./package.ts";

const page = "shelf/0123456789abcdef.md";
const publication = (content: string, path = page) => [{ n: 0, to: reference("destination"), message: { class: "request", type: "tell", body: { message: "publish-file", fields: { path, content } } } }];
const entry = (kind: string, effects: EntryAssertion["effects"], content: string, path = page): OutcomeAssertion => ({ entries: [{ input: { type: "act", kind }, effects, sends: publication(content, path) }] });

export const lendingStorySpec = {
  name: "lending-package", time: "2026-10-18T12:00:00Z", definition: lending, projections: lendingPackage.projections,
  actors: {
    member: { seed: "22".repeat(32), actions: ["lending.member"] },
    neighbour: { seed: "25".repeat(32), actions: ["lending.member"] },
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
  const until = "2026-10-18T13:00:00Z";
  const held = (item: number, day: string, holder = "member", tool = 1, expiry = until): OutcomeAssertion => ({ entries: [{ input: { type: "act", kind: "reserve" }, effects: [
    { effect: "open", item, type: "reservation", state: "held" },
    { effect: "party", item, slot: "holder", member: member(holder) },
    { effect: "ref", item, slot: "tool", to: tool },
    { effect: "value", item, slot: "day", value: day },
    { effect: "value", item, slot: "until", value: expiry },
  ], sends: [] }] });
  story.act("member", "reserve", { fields: { tool: 1, day: "2026-10-18", until } }, accepted, held(2, "2026-10-18"));
  story.act("neighbour", "reserve", { fields: { tool: 1, day: "2026-10-18", until } }, refused("guard-failed", "tool-day-taken"), writesNothing);
  // The second slot reverses admission order. Its expiry need not fall on its day label.
  story.act("neighbour", "reserve", { fields: { tool: 1, day: "2026-10-19", until } }, accepted, held(3, "2026-10-19", "neighbour"));
  story.act("member", "reserve", { fields: { tool: 1, day: "2026-10-19", until } }, refused("guard-failed", "tool-day-taken"), writesNothing);
  story.assert(1, { state: "available", revision: 1 });
  story.assert(2, { state: "held", refs: { tool: 1 }, values: { day: "2026-10-18", until } });
  story.assert(3, { state: "held", refs: { tool: 1 }, values: { day: "2026-10-19", until } });
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
  story.advance(until, { entries: [2, 3].map(item => ({ input: { type: "timed", item, rule: "lapse", due: until }, effects: [{ effect: "state", item, state: "lapsed" }], sends: [] })) });
  story.assert(2, { state: "lapsed" });
  story.assert(3, { state: "lapsed" });
  story.assert(1, { state: "gone", values: { reason: "Retired fixture" } });
  // A fresh available tool keeps these release cases separate from the original lapse.
  const nextPage = "shelf/fedcba9876543210.md", later = "2026-10-18T14:00:00Z";
  story.act("member", "donate", { fields: { name: "Garden fork", description: "A release fixture", page: nextPage, content: "Available for reservations" } }, accepted, entry("donate", [
    { effect: "open", item: 9, type: "thing", state: "available" },
    { effect: "party", item: 9, slot: "donor", member: member("member") },
    { effect: "value", item: 9, slot: "name", value: "Garden fork" },
    { effect: "value", item: 9, slot: "description", value: "A release fixture" },
    { effect: "value", item: 9, slot: "page", value: nextPage },
  ], "Available for reservations", nextPage));
  story.act("member", "reserve", { fields: { tool: 9, day: "2026-10-18", until: later } }, accepted, held(10, "2026-10-18", "member", 9, later));
  story.act("member", "reserve", { fields: { tool: 9, day: "2026-10-19", until: later } }, accepted, held(11, "2026-10-19", "member", 9, later));
  story.act("member", "reserve", { fields: { tool: 9, day: "2026-10-20", until: later } }, refused("guard-failed"), writesNothing);
  story.act("neighbour", "release", { on: 10, fields: {} }, refused("guard-failed"), writesNothing);
  story.act("member", "release", { on: 10, fields: {} }, accepted, { entries: [{ input: { type: "act", kind: "release" }, effects: [{ effect: "state", item: 10, state: "released" }], sends: [] }] });
  story.act("neighbour", "reserve", { fields: { tool: 9, day: "2026-10-18", until: later } }, accepted, held(13, "2026-10-18", "neighbour", 9, later));
  story.assert(10, { state: "released", parties: { holder: member("member") } });
  story.assert(13, { state: "held", parties: { holder: member("neighbour") } });
  story.act("staff", "release-by-staff", { on: 11, fields: {} }, accepted, { entries: [{ input: { type: "act", kind: "release-by-staff" }, effects: [{ effect: "state", item: 11, state: "released" }], sends: [] }] });
  story.act("neighbour", "reserve", { fields: { tool: 9, day: "2026-10-19", until: later } }, accepted, held(15, "2026-10-19", "neighbour", 9, later));
  story.assert(11, { state: "released", parties: { holder: member("member") } });
  story.assert(9, { state: "available", revision: 9 });

});
