import { expect, test } from "vitest";
import { formatFact } from "../src/views/facts.ts";

test("fixed-point facts preserve exact decimal digits, signs, zero and unavailable values", () => {
  const fact = { field: "temperature", label: "Mean", scale: 2, unit: "°C" };
  for (const [value, wanted] of [[2650, "26.5"], [2300, "23"], [-1, "-0.01"], [-500, "-5"], [0, "0"], [Number.MAX_SAFE_INTEGER, "90071992547409.91"]] as const) {
    expect(formatFact(fact, { temperature: value })).toBe(`Mean: ${wanted} °C`);
  }
  expect(formatFact({ ...fact, scale: 6 }, { temperature: 1 })).toBe("Mean: 0.000001 °C");
  expect(formatFact({ ...fact, scale: 0, unit: "" }, { temperature: 2300 })).toBe("Mean: 2300");
  expect(formatFact(fact, { temperature: null })).toBe("Mean: —");
  for (const value of ["2650", 1.5, Number.MAX_SAFE_INTEGER + 1]) expect(() => formatFact(fact, { temperature: value })).toThrow("integer value");
  expect(formatFact("state", { state: "open" })).toBe("state: open");
});
