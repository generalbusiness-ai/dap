import { expect, test } from "vitest";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { textDigest } from "@generalbusiness/dap-bytes";
import { bindActBasis } from "../src/act-basis.ts";
import { actVersion } from "../src/act-version.ts";
import type { Act, Source } from "../src/act-types.ts";
import { clientNotes as notes } from "./definition-corpus-data.ts";

test("binding preserves written text and symbolic names while capturing only missing subject revisions", () => {
  const at: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"a".repeat(64)}` };
  const prior: Source = {
    key: "earlier-note",
    version: actVersion({ kind: "start", on: null, fields: {}, expected: {} }),
  };
  const body = "Text remains the authority's value.";
  const act: Act<typeof notes, "write"> = { kind: "write", on: { output: prior }, fields: { body } };
  // An internal alias and detached-text digest serve judgment only. Neither
  // becomes the author's act or the source version that names it.
  const lowered = { on: 17, fields: { body: textDigest(body) } };
  const subjects = [{ id: 17, type: "note", refs: {}, revision: { after: prior } }];
  const bound = bindActBasis(notes, act, subjects, lowered, at);
  expect(bound).toEqual({ act: { ...act, expected: { on: { after: prior } } }, bound: ["on"] });
  expect(act.expected).toBeUndefined();
  const source: Source = { key: "write-note", version: actVersion(bound.act) };
  expect(source.version).not.toBe(actVersion({ ...lowered, kind: "write", expected: { on: 1 } }));
  expect(actVersion({ ...bound.act, fields: { body: `${body}!` } })).not.toBe(source.version);
  expect(actVersion({ ...bound.act, on: { output: { ...prior, key: "another-note" } } })).not.toBe(source.version);

  const captured = bindActBasis(notes, { ...act, expected: { on: 3 } }, subjects, lowered, at);
  expect(captured.act.expected).toEqual({ on: 3 });
  expect(captured.bound).toEqual([]);
});
