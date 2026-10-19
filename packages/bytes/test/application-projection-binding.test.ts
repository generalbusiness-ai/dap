import { expect, test } from "vitest";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { definitionDigest } from "../src/index.ts";
import { definition as empty } from "./fixtures.ts";
import { bindApplicationProjection } from "../src/application-projection-binding.ts";
import { ApplicationProjectionError } from "../src/application-projection.ts";

// Made-up native schema, not a runtime or whole-definition admission witness.
const definition = (): DeclaredDefinition => ({ ...empty, items: { alert: {
  many: true, max: 20, initial: "open", states: { open: { final: false }, done: { final: true } },
  parties: { author: { fixed: true, required: true, author: true, list: false },
    watchers: { fixed: false, required: false, author: false, list: true, max: 4 } },
  refs: { parent: { fixed: true, required: false, to: { type: "item", of: "alert" } } },
  values: { text: { fixed: true, required: true, of: { type: "text", max: 1024 } } },
} } });
const projection = (native = definition()) => ({ v: 1, definition: definitionDigest(native), revision: "revision", sources: {
  alerts: { item: "alert", read: "many", states: ["done", "open"], limit: 20, fields: {
    text: { from: { kind: "value", name: "text" }, of: { type: "text", max: 1024 }, nullable: false },
    actor: { from: { kind: "party", name: "author" }, of: { type: "member" }, nullable: false },
    watchers: { from: { kind: "party", name: "watchers" }, of: { type: "list", of: { type: "member" }, max: 4 }, nullable: true },
    parent: { from: { kind: "ref", name: "parent" }, of: { type: "item", of: "alert" }, nullable: true },
  } },
} });

// Invariant: a projection cannot rename absent native slots, change their
// types or hide optional absence under a non-null declaration.
test("binding follows the exact definition, state, slot kind, type and optionality", () => {
  const native = definition(), input = projection(native);
  const bound = bindApplicationProjection(input, native);
  expect(bound).toEqual(input); expect(bound).not.toBe(input);
  native.items["alert"]!.values["text"]!.of = { type: "text", max: 2048 };
  expect(bound.sources["alerts"]!.fields["text"]!.of).toEqual({ type: "text", max: 1024 });
  expect(() => bindApplicationProjection(input, native)).toThrow(ApplicationProjectionError);
  const refuse = (change: (value: ReturnType<typeof projection>) => void) => {
    const value = projection(); change(value);
    expect(() => bindApplicationProjection(value, definition())).toThrow("application-projection-binding");
  };
  refuse(p => { p.sources.alerts.item = "missing"; });
  refuse(p => { p.sources.alerts.states = ["missing"]; });
  refuse(p => { p.sources.alerts.fields.text.from.name = "missing"; });
  refuse(p => { p.sources.alerts.fields.actor.from.name = "constructor"; p.sources.alerts.fields.actor.nullable = true; });
  refuse(p => { p.sources.alerts.fields.text.from.kind = "ref"; });
  refuse(p => { p.sources.alerts.fields.text.of.max = 2048; });
  refuse(p => { p.sources.alerts.fields.watchers.of.max = 5; });
  refuse(p => { p.sources.alerts.fields.parent.nullable = false; });
  refuse(p => { p.sources.alerts.fields.text.nullable = true; });
});

test("binding refuses detached text and executable definition input before a getter runs", () => {
  const native = definition();
  native.items["alert"]!.values["text"]!.of = { type: "text", max: 1024, detached: true };
  expect(() => bindApplicationProjection(projection(native), native)).toThrow("application-projection-binding");
  const ordinary = definition(), input = projection(ordinary); let calls = 0;
  Object.defineProperty(ordinary.items["alert"]!.values["text"], "of", { enumerable: true, get() { calls++; return { type: "text", max: 1024 }; } });
  expect(() => bindApplicationProjection(input, ordinary)).toThrow("application-projection-binding");
  expect(calls).toBe(0);
});
