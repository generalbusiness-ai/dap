import { expect, test } from "vitest";
import { textDigest } from "../src/index.ts";
import { APPLICATION_PROJECTION_LIMITS, ApplicationProjectionError, applicationProjectionId, readApplicationProjection } from "../src/application-projection.ts";
const declaration = () => ({ v: 1, definition: textDigest("PUBLIC TEST projection definition"), revision: "revision", sources: {
  alert: { item: "alert", read: "item", states: ["held", "open"], limit: 1, fields: {
    text: { from: { kind: "value", name: "text" }, of: { type: "text", max: 1024 }, nullable: false },
    raisedBy: { from: { kind: "party", name: "raisedBy" }, of: { type: "member" }, nullable: false },
  } },
} });
// Invariant: declaration identity covers the exact typed read and is owned,
// so later caller changes cannot alter the shared projection contract.
test("a typed declaration owns its complete input and changes identity when the read changes", () => {
  const input = declaration(), read = readApplicationProjection(input), id = applicationProjectionId(read);
  input.sources.alert.fields.text.from.name = "proposal";
  expect(read.sources["alert"]!.fields["text"]!.from.name).toBe("text");
  expect(applicationProjectionId(read)).toBe(id); expect(applicationProjectionId(readApplicationProjection(input))).not.toBe(id);
  expect(Object.isFrozen(read.sources["alert"]!.fields["text"]!.of)).toBe(true);
});
// Invariant: unknown syntax, metadata aliases, unbounded reads and executable
// input refuse before an accessor or later consumer can act on them.
test("invalid or oversized declarations refuse without invoking getters", () => {
  const bad = declaration(); let getter = 0;
  Object.defineProperty(bad.sources.alert.fields.text.from, "name", { enumerable: true, get() { getter++; return "text"; } });
  expect(() => readApplicationProjection(bad)).toThrow(ApplicationProjectionError); expect(getter).toBe(0);
  for (const value of [
    { ...declaration(), unknown: true }, { ...declaration(), revision: "state" },
    { ...declaration(), sources: {} },
    { ...declaration(), sources: { alert: { ...declaration().sources.alert, read: ["item"] } } },
    { ...declaration(), sources: { alert: { ...declaration().sources.alert, limit: 2 } } },
    { ...declaration(), sources: { alert: { ...declaration().sources.alert, states: ["open", "held"] } } },
    { ...declaration(), sources: { alert: { ...declaration().sources.alert, fields: { revision: declaration().sources.alert.fields.text } } } },
    { ...declaration(), sources: { alert: { ...declaration().sources.alert, fields: { text: { ...declaration().sources.alert.fields.text, of: { type: "code", run: "eval" } } } } } },
    { ...declaration(), padding: "x".repeat(APPLICATION_PROJECTION_LIMITS.metadataBytes) },
  ]) expect(() => readApplicationProjection(value)).toThrow(ApplicationProjectionError);
});
