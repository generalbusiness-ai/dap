import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { format } from "prettier";
import { define, final, grants, item, live, open, plusSeconds, time, timed, value } from "../src/index.ts";
import { accepted, member, tell, writesNothing, type OutcomeAssertion, type StorySpec, type Teller } from "../src/story.ts";
import { lendingStory, lendingStorySpec } from "../../../examples/lending/story.ts";

test("the Lending story uses real judges and regenerates its retained scenario bytes", async () => {
  expect(await format(JSON.stringify(await lendingStory()), { parser: "json" })).toBe(readFileSync(new URL("../../../examples/lending/scenarios/application.json", import.meta.url), "utf8"));
});

// These grants and the scope's signed founding are scripted TEST authority, not native membership.
const grant = grants({ create: "story.create" });
const root = item("root", { states: { open: live } });
const timer = item("timer", { states: { open: live, done: final }, values: { until: value.required(time) } });
const definition = define({ name: "story-example", genesis: "establish", items: [root, timer], acts: {
  establish: open(root, grant.create),
  begin: open(timer, grant.create, {}, ({ on }) => ({ effects: [on.value("until", plusSeconds(5))] })),
}, timed: { finish: timed(timer, { states: ["open"], deadline: "until", effects: on => [on.to("done")] }) } });
const foundingAsserts: OutcomeAssertion = { entries: [{ input: { type: "genesis", kind: "establish" }, effects: [
  { effect: "open", item: 0, type: "root", state: "open" },
], sends: [] }] };
const spec: StorySpec<typeof definition> = { name: "clock-story", time: "2026-11-10T00:00:00Z", definition, projections: {}, actors: { alice: { seed: "11".repeat(32), actions: ["story.create"] } }, founding: { actor: "alice", fields: {} }, foundingAsserts };
const beginAsserts: OutcomeAssertion = { entries: [{ input: { type: "act", kind: "begin" }, effects: [
  { effect: "open", item: 1, type: "timer", state: "open" }, { effect: "value", item: 1, slot: "until", value: "2026-11-10T00:00:05Z" },
], sends: [] }] };
const begin = (story: Teller<typeof definition>, save?: string) => story.act("alice", "begin", { fields: {} }, accepted, beginAsserts, save);

test("a story refuses unasserted timed work and accepts the exact firing at its step", async () => {
  await expect(tell(spec, story => { begin(story); story.advance("2026-11-10T00:00:06Z", writesNothing); })).rejects.toThrow("timed outcomes");
  const story = await tell(spec, teller => {
    begin(teller);
    teller.advance("2026-11-10T00:00:06Z", { entries: [{ input: { type: "timed", item: 1, rule: "finish", due: "2026-11-10T00:00:05Z" }, effects: [{ effect: "state", item: 1, state: "done" }], sends: [] }] });
    teller.assert(1, { state: "done" });
  });
  expect(story.steps.slice(1)).toEqual([{ advance: "2026-11-10T00:00:06Z" }, { assert: { item: 1, state: "done" } }]);
});
test("story generation keeps closed v1 shapes and requires valid names and checked behavior", async () => {
  const extraFounding = { actor: "alice", fields: {}, extra: 1 };
  const extraAssertion = { state: "open", extra: 1 };
  await expect(tell({ ...spec, founding: extraFounding }, story => story.assert(0, { state: "open" }))).rejects.toThrow("founding accepts only actor and fields");
  await expect(tell(spec, story => story.assert(0, extraAssertion))).rejects.toThrow("item assertion accepts only state, revision and slot maps");
  await expect(tell(spec, story => story.assert(0, { values: {}, parties: {}, refs: {} }))).rejects.toThrow("must test a state, revision or slot");
  await expect(tell(spec, story => { begin(story, "Bad Save"); })).rejects.toThrow("short scenario name");
  await expect(tell(spec, story => story.advance("2026-11-10T00:00:06Z", writesNothing))).rejects.toThrow("needs an expected act or retry answer");
  const story = await tell(spec, teller => { teller.advance("2026-11-10T00:00:06Z", writesNothing); teller.assert(0, { values: {}, state: "open" }); });
  expect(JSON.stringify(story.steps)).toBe('[{"advance":"2026-11-10T00:00:06Z"},{"assert":{"item":0,"values":{},"state":"open"}}]');
});
test("a story refuses an unasserted founding entry or effect", async () => {
  await expect(tell({ ...spec, foundingAsserts: writesNothing }, story => story.assert(0, { state: "open" }))).rejects.toThrow("founding outcomes");
  await expect(tell({ ...spec, foundingAsserts: { entries: [{ input: { type: "genesis", kind: "establish" }, effects: [], sends: [] }] } }, story => story.assert(0, { state: "open" }))).rejects.toThrow("founding outcomes");
});
test("a story refuses an accepted expectation when the real judge refuses", async () => {
  await expect(tell(spec, story => { story.act("alice", "establish", { fields: {} }, accepted, writesNothing); })).rejects.toThrow("the story's assertion does not match");
});
test("a story refuses an unasserted send even when its entry and effects match", async () => {
  await expect(tell(lendingStorySpec, story => {
    story.act("member", "donate", { fields: { name: "Copper pot", description: "A maintained package fixture", page: "shelf/0123456789abcdef.md", content: "A signed fixture page" } }, accepted, { entries: [{ input: { type: "act", kind: "donate" }, effects: [
      { effect: "open", item: 1, type: "thing", state: "available" },
      { effect: "party", item: 1, slot: "donor", member: member("member") },
      { effect: "value", item: 1, slot: "name", value: "Copper pot" },
      { effect: "value", item: 1, slot: "description", value: "A maintained package fixture" },
      { effect: "value", item: 1, slot: "page", value: "shelf/0123456789abcdef.md" },
    ], sends: [] }] });
  })).rejects.toThrow("donate outcomes");
});
