import { expect, test } from "vitest";
import { command } from "../src/line.ts";
import { memoryStore } from "../src/store.ts";

test("archive clone requires a destination before reading configuration, signing or consuming a credential", async () => {
  const result = await command({ store: memoryStore(), git: { run: async () => expect.fail("No Git before a destination") } }, ["clone", "--archive"]);
  expect(result.code).toBe(2);
  expect(result.lines).toEqual(["clone --archive needs an explicit directory."]);
});
