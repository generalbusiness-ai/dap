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

test("timestamp ages retain their source time, absent evidence and a clock-before-reading result", () => {
  const fact = { field: "sample", label: "Moisture age", format: "age" as const }, stamp = "2026-10-16T12:00:00Z", time = Date.parse(stamp);
  for (const [elapsed, wanted] of [[0, "0 min"], [59_999, "0 min"], [60_000, "1 min"], [3_600_000, "1 h"], [86_400_000, "1 day"], [172_800_000, "2 days"]] as const) {
    expect(formatFact(fact, { sample: stamp }, time + elapsed)).toBe(`Moisture age: ${wanted} ago (${stamp})`);
  }
  expect(formatFact(fact, { sample: null }, time)).toBe("Moisture age: —");
  expect(formatFact(fact, { sample: stamp }, time - 1)).toBe(`Moisture age: clock before reading (${stamp})`);
  expect(() => formatFact(fact, { sample: 123 }, time)).toThrow("native timestamp");
});
