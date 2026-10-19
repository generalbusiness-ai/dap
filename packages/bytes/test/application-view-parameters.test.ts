import { expect, test } from "vitest";
import { ApplicationViewParameterError, decodeViewParameters, readViewParameters, viewParameterFits, viewScaledInteger } from "../src/application-view-parameters.ts";

const declared = () => readViewParameters({
  moisture: { kind: "int", label: "Moisture", unit: "%", min: 0, max: 100, required: false },
  ec: { kind: "decimal", label: "EC", unit: "mS/cm", scale: 3, min: 0, max: 10000, required: false },
  ph: { kind: "decimal", label: "pH", unit: "", scale: 2, min: 0, max: 1400, required: false },
  height: { kind: "int", label: "Height", unit: "mm", min: 0, max: 5000, required: false },
  note: { kind: "text", label: "Scouting note", max: 1024, required: false },
});
// Pure metadata/value boundary only: no model, authority, custody, scope
// judgment or freshness claim is made by these tests.
test("declared human inputs convert to exact native scalars and leave omitted readings absent", () => {
  const parameters = declared();
  expect(decodeViewParameters(parameters, { moisture: 31, ec: 2.1, ph: 5.9, note: "Dry near the edge." })).toEqual({ moisture: 31, ec: 2100, ph: 590, note: "Dry near the edge." });
  expect(decodeViewParameters(parameters, { note: "New scouting note only." })).toEqual({ note: "New scouting note only." });
  expect(viewParameterFits(parameters["ec"]!, { type: "int", min: 0, max: 10000 })).toBe(true);
  expect(viewParameterFits(parameters["ec"]!, { type: "int", min: 0, max: 9999 })).toBe(false);
  expect(viewScaledInteger(0.001, 3)).toBe(1);
  expect(viewScaledInteger(-0.01, 2)).toBe(-1);
  expect(viewScaledInteger(Number.MAX_SAFE_INTEGER, 0)).toBe(Number.MAX_SAFE_INTEGER);
  expect(viewScaledInteger(Number.MAX_SAFE_INTEGER, 1)).toBeNull();
  for (const input of [{}, { bench: 41 }, { moisture: 31.5 }, { ec: 2.1001 }, { ph: 14.01 }, { note: "é".repeat(513) }]) {
    expect(() => decodeViewParameters(parameters, input)).toThrow(ApplicationViewParameterError);
  }
});

test("parameter declarations keep closed bounded kinds, native-compatible ranges and allowed words", () => {
  for (const declaration of [{ x: { kind: "decimal", label: "EC", unit: "", min: 0, max: 10, scale: 7, required: true } },
    { x: { kind: "int", label: "Reading", unit: "", min: 0.5, max: 1, required: false } },
    { x: { kind: "text", label: "Note", max: 1024, required: false, script: "no" } }]) {
    expect(() => readViewParameters(declaration)).toThrow(ApplicationViewParameterError);
  }
  const words = readViewParameters({ choice: { kind: "enum", label: "Choice", of: ["low", "high"], required: true } });
  expect(viewParameterFits(words["choice"]!, { type: "enum", of: ["low", "high", "hold"] })).toBe(true);
  expect(viewParameterFits(words["choice"]!, { type: "enum", of: ["low"] })).toBe(false);
  expect(decodeViewParameters(words, { choice: "high" })).toEqual({ choice: "high" });
  expect(() => decodeViewParameters(words, { choice: "hold" })).toThrow(ApplicationViewParameterError);
});
