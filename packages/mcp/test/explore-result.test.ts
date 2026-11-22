import { expect, test } from "vitest";
import { exploreData } from "../src/explore-result.ts";

// Invariant: an admitted result contains every changed row or no successful delta.
test("exploration projection refuses incomplete or oversized deltas", () => {
  const rows = new Map<unknown, unknown>([[1, { value: "one" }], [2, { value: "two" }]]);
  const result = { is: "admitted", changed: [1, 2], after: { row: (name: unknown) => rows.get(name) }, effects: [] };
  expect(exploreData(result, 1024)).toEqual({ is: "admitted", effects: [], rows: [{ value: "one" }, { value: "two" }] });
  expect(exploreData({ ...result, changed: [1, 3] }, 1024)).toBeNull();
  expect(exploreData(result, 30)).toBeNull();
  expect(exploreData({ ...result, changed: undefined }, 1024)).toBeNull();
});

// Invariant: one exploration never folds a page beyond its aggregate log budget.
test("the journal budget refuses excess bytes and continuation pages", async () => {
  const { ExplorationLogBudget } = await import("../src/explore-result.ts");
  const bytes = new ExplorationLogBudget();
  expect(bytes.accept([{ bytes: "é".repeat(2 * 1024 * 1024) }])).toBe(true);
  expect(bytes.accept([{ bytes: "x" }])).toBe(false);
  const pages = new ExplorationLogBudget();
  for (let n = 0; n < 16; n++) expect(pages.accept([])).toBe(true);
  expect(pages.accept([])).toBe(false);
});
