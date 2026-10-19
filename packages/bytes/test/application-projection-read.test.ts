import { expect, test } from "vitest";
import { ITEM_QUERY_BOUNDS, ITEM_QUERY_ORDER, type DeclaredDefinition, type Head, type Item, type ItemQuery, type ItemQueryRead } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, encodeItemQueryCursor, itemQueryArgument, itemQueryDigest, textDigest } from "../src/index.ts";
import { definition as empty, directory as scope } from "./fixtures.ts";
import { applicationProjectionQueries, projectApplicationQueryReads } from "../src/application-projection-read.ts";
import { readApplicationProjection } from "../src/application-projection.ts";

// Native rows and query envelopes below are scripted. No journal, read
// authorization, host route, MCP tool or kit runs in this pure witness.
const definition: DeclaredDefinition = { ...empty, items: { note: {
  many: true, max: 20, initial: "open", states: { open: { final: false }, done: { final: true } }, parties: {}, refs: {},
  values: { text: { required: true, fixed: false, of: { type: "text", max: 100 } },
    secret: { required: true, fixed: false, of: { type: "text", max: 100 } } },
} } };
const fields = { text: { from: { kind: "value", name: "text" }, of: { type: "text", max: 100 }, nullable: false } };
const projection = readApplicationProjection({ v: 1, definition: definitionDigest(definition), revision: "revision", sources: {
  all: { item: "note", read: "many", states: ["done", "open"], limit: 20, fields },
  selected: { item: "note", read: "item", states: ["done", "open"], limit: 1, fields },
} });
const head: Head = { seq: 12, hash: textDigest("PUBLIC TEST projection head") };
const row = (id: number, state = "open"): Item => ({ id, type: "note", state, revision: 3, opened: textDigest("PUBLIC TEST opening"), parties: {}, refs: {},
  values: { text: "Shown note", secret: "Unselected native content" }, attributed: [] });
const queries = applicationProjectionQueries(projection, scope, { selected: 1 });
function reply(query: ItemQuery, items: readonly Item[], at = head, complete = true): ItemQueryRead {
  return { ok: true, at, value: { v: 1, scope, query: itemQueryDigest(query)!, argument: itemQueryArgument(query)!, items }, complete,
    ...(complete ? {} : { next: encodeItemQueryCursor({ v: 1, scope, head: at, query: itemQueryDigest(query)!, order: ITEM_QUERY_ORDER, bounds: ITEM_QUERY_BOUNDS, limit: query.limit, last: items.at(-1)!.id })! }) };
}
const replies = () => ({ all: reply(queries["all"]!, [row(1), row(2, "done")]), selected: reply(queries["selected"]!, [row(1)]) });

// Invariant: selected fields and native row identity at one exact head form
// the complete result; final rows survive, while unselected content does not.
test("one canonical projection keeps final rows and revisions while selecting only declared fields", () => {
  const input = replies(), result = projectApplicationQueryReads(projection, definition, scope, { selected: 1 }, input);
  expect(result.at).toEqual(head);
  expect(result.sources["all"]).toEqual([
    { id: 1, type: "note", state: "open", revision: 3, fields: { text: "Shown note" } },
    { id: 2, type: "note", state: "done", revision: 3, fields: { text: "Shown note" } },
  ]);
  expect(result.sources["selected"]).toHaveLength(1);
  expect(canonicalize(result)).not.toContain("Unselected native content");
  expect(canonicalize(result)).not.toContain("opened");
  input.all = reply(queries["all"]!, []);
  expect(result.sources["all"]).toHaveLength(2);
  expect(Object.isFrozen(result.sources["all"]![0]!.fields)).toBe(true);
});

// Invariant: no prefix, mixed head, wrong selection or unavailable native
// reply can masquerade as a complete projection at the displayed revision.
test("incomplete, changed-head and mismatched native reads refuse beside a complete passing control", () => {
  const read = (input: unknown, items = { selected: 1 }) => projectApplicationQueryReads(projection, definition, scope, items, input);
  expect(read(replies()).sources["all"]).toHaveLength(2);
  expect(() => read({ ...replies(), all: reply(queries["all"]!, [row(1)], head, false) })).toThrow("application-projection-incomplete");
  expect(() => read({ ...replies(), selected: reply(queries["selected"]!, [row(1)], { ...head, seq: 13 }) })).toThrow("application-projection-stale");
  expect(() => read({ ...replies(), selected: reply(queries["selected"]!, []) })).toThrow("application-projection-incomplete");
  expect(() => read({ ...replies(), selected: reply(queries["selected"]!, [row(2)]) })).toThrow("application-projection-invalid");
  expect(() => read({ ...replies(), all: { ok: false, reason: "forbidden" } })).toThrow("application-projection-unavailable");
  expect(() => read(replies(), { selected: 2 })).toThrow("application-projection-invalid");
  expect(() => applicationProjectionQueries(projection, scope, { selected: 1, all: 1 })).toThrow("application-projection-invalid");
});
