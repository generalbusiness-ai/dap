import { expect, test } from "vitest";
import { canonicalBytes } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "../src/index.ts";
import { boundRecordData, boundRecordDefinition, PIN_BOUNDS } from "./fixtures-entry.ts";

test.each([false, true])("a bound decision quotes actual first-key producers, not its generic effect ceiling (native key %s)", firstKey => {
  const definition = boundRecordDefinition(firstKey);
  expect(definition.reserving!.holders["job"]!.amount).toEqual({ entries: 1, items: 0, records: firstKey ? 1 : 0, bytes: 2 * PIN_BOUNDS.entryBytes, requests: 0 });
  // Preserve the existing private projection and raw declaration bytes
  // for older scopes. Only the opt-in's record admission changes.
  const legacy = boundRecordDefinition(firstKey, false);
  expect(legacy.reserving!.holders["job"]!.amount.records).toBe(PIN_BOUNDS.derivedEffects);
  const raw = boundRecordData(firstKey, false), bytes = canonicalBytes(raw);
  expect(validateDefinition(raw, PIN_BOUNDS, undefined, { platform: true }).ok).toBe(true);
  expect(canonicalBytes(raw)).toEqual(bytes);
});
