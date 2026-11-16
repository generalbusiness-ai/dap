import { expect, test } from "vitest";
import { isDigest } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "../src/index.ts";
import { definitionCorpus } from "./definition-corpus/index.ts";
import { INVENTORY_CORPUS_TEST_BOUND, inventoryCorpusGraphs } from "./definition-corpus/scope-fixtures.ts";

test.for(definitionCorpus)("pinned definition corpus [%#]: $name", async row => {
  const checked = validateDefinition(await row.declaration(), row.bounds, row.profiles, row.options);
  const named = `Pinned definition corpus refused ${row.name}; origins: ${row.origins.join(", ")}`;
  expect(checked.ok ? [] : checked.problems, named).toEqual([]);
  if (row.expectedDigest !== undefined) {
    expect(isDigest(row.expectedDigest), `Missing or malformed existing pin for ${row.name}; origins: ${row.origins.join(", ")}`).toBe(true);
    if (checked.ok) expect(checked.definition.digest, named).toBe(row.expectedDigest);
  }
});

test("definition corpus registrations keep unique names and origin labels", () => {
  expect(new Set(definitionCorpus.map(row => row.name)).size).toBe(definitionCorpus.length);
  expect(definitionCorpus.filter(row => row.name.length === 0 || row.origins.length === 0).map(row => row.name)).toEqual([]);
  expect(inventoryCorpusGraphs.map(lengths => lengths.reduce((sum, length) => sum + length, 0) + 1))
    .toEqual([INVENTORY_CORPUS_TEST_BOUND, INVENTORY_CORPUS_TEST_BOUND + 1]);
  expect(inventoryCorpusGraphs.flat().every(length => Number.isSafeInteger(length) && length >= 1 && length <= 17)).toBe(true);
});
