import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, SCOPE_BOUNDS } from "@generalbusiness/dap-contract";
import { AmountError, capacityFull, type Amount } from "../src/index.ts";

test("capacity equality admits all five budgets, while one more used or reserved unit names the exhausted budget", () => {
  const dimensions = ["entries", "bytes", "items", "records", "requests"] as const;
  const used: Amount = { entries: 2, bytes: 20, items: 1, records: 3, requests: 1 };
  const pending: Amount = { entries: 4, bytes: 40, items: 2, records: 1, requests: 3 };
  const exact = { ...PROPOSED_BOUNDS, scopeEntries: 6, scopeBytes: 60, scopeItems: 3, scopeRecords: 4, scopeRequests: 4 };
  expect(capacityFull(used, pending, exact)).toBeNull();
  for (const [i, bound] of SCOPE_BOUNDS.entries()) {
    const dimension = dimensions[i]!;
    expect(capacityFull({ ...used, [dimension]: used[dimension] + 1 }, pending, exact)).toBe(bound);
    expect(capacityFull(used, { ...pending, [dimension]: pending[dimension] + 1 }, exact)).toBe(bound);
  }
  expect(() => capacityFull(used, pending, { ...exact, scopeEntries: 0, scopeRequests: NaN })).toThrow(AmountError);
  expect(() => capacityFull({ ...used, bytes: Number.MAX_SAFE_INTEGER }, pending, exact)).toThrow(AmountError);
});
