import { expect, test } from "vitest";
import { act, command, memoryStore, type Context } from "../src/index.ts";

// Invariant: an invalid target never reaches custody, signing, reads or canonicalization.
test("a handle or noninteger target is refused before I/O rather than becoming NaN", async () => {
  const store = memoryStore();
  let reads = 0;
  const ctx: Context = { store: { ...store, config: async () => { reads++; throw Error("invalid target must not read configuration"); } }, fetch: async () => { throw Error("invalid target must not reach the network"); } };
  const handle = await command(ctx, ["act", "set-role", "--on", "membership", "--target", "@m1", "--set", "role=member"]);
  expect(handle.code).toBe(2);
  expect(handle.lines.join("\n")).toContain("nonnegative item number");
  expect(handle.lines.join("\n")).toContain("Nothing was signed or sent");
  for (const target of [NaN, -1, 0.5, Infinity]) expect((await act(ctx, "set-role", { target })).code).toBe(2);
  expect(reads).toBe(0);
  // A numeric target passes syntax validation and reaches ordinary config admission.
  const numeric = await command({ store }, ["act", "set-role", "--on", "membership", "--target", "1", "--set", "role=member"]);
  expect(numeric).toEqual({ code: 2, lines: ["No room is set up here. Run: dap install <base-url>, or dap join <link>."] });
});
