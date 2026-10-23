/** Scripted read ports: bounded CLI selection and byte identity only.
 * Native Directory/install/authority behavior belongs to the Scope witness. */
import { expect, test } from "vitest";
import { ITEM_QUERY_BOUNDS, ITEM_QUERY_ORDER, type Item, type ItemQuery, type ItemQueryRead, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, encodeItemQueryCursor, itemQueryArgument, itemQueryDigest, newIncarnation, readItemQueryParameter, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import type { Transport } from "@generalbusiness/dap-client";
import { counting } from "../../../apps/counter/definition.ts";
import { applicationList, APPLICATION_LIST_ROWS } from "../src/application-list.ts";
import { command, type Context } from "../src/index.ts";

const directory: ScopeRef = { kind: "directory", scope: `sc_${"a".repeat(52)}`, inc: newIncarnation(new Uint8Array(16).fill(1)) };
const child: ScopeRef = { kind: "lane", scope: scopeIdOf({ v: 1, kind: "lane", definition: definitionDigest(counting), creator: directory, cause: textDigest("fixture creation"), ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(2)) };
const head = { seq: 9, hash: textDigest("directory head") };
const declaration = { ...counting, name: 'Count | "notes"\nnext\u0085\u2028\u2029' }, bytes = canonicalize(declaration), digest = definitionDigest(declaration);
const item = (id: number): Item => ({ id, type: "application", state: "created", revision: 2, opened: null,
  parties: {}, refs: { scope: child }, values: { definition: digest }, attributed: [] });

function fixture() {
  const queries: ItemQuery[] = [], reads: string[] = [];
  let mode: "prefix" | "complete" | "stale" | "wrong-scope" = "prefix", retained = bytes;
  const transport = new Proxy({
    async queryItems(scope: string, reader: unknown, encoded: string): Promise<ItemQueryRead> {
      expect([scope, reader]).toEqual([directory.scope, "Session TEST"]);
      const query = readItemQueryParameter(encoded)!; queries.push(query);
      if (mode === "stale") return { ok: false, reason: "stale-cursor" };
      return { ok: true, at: head, complete: mode === "complete", value: { v: 1,
        scope: mode === "wrong-scope" ? { ...directory, inc: child.inc } : directory,
        query: itemQueryDigest(query)!, argument: itemQueryArgument(query)!, items: mode === "complete" ? [] : [item(2), item(4)] },
        ...(mode === "complete" ? {} : { next: encodeItemQueryCursor({ v: 1, scope: directory, head, query: itemQueryDigest(query)!, order: ITEM_QUERY_ORDER, bounds: ITEM_QUERY_BOUNDS, limit: query.limit, last: 4 })! }) };
    },
    async retained(scope: string, reader: unknown, kind: string, named: string) {
      expect([scope, reader, kind, named]).toEqual([directory.scope, "Session TEST", "definition", digest]); reads.push(named);
      return { ok: true as const, at: head, complete: true, value: { kind: "definition" as const, digest, bytes: retained } };
    },
  }, { get: (target, property) => { if (!(property in target)) throw new Error(`No summary/history/child scan: ${String(property)}`); return Reflect.get(target, property); } }) as unknown as Transport;
  return { transport, queries, reads, mode: (value: typeof mode) => { mode = value; }, retained: (value: string) => { retained = value; } };
}

test("apps reads one exact bounded page, checks names once per digest and leaves continuation explicit", async () => {
  const f = fixture(), page = await applicationList(f.transport, "Session TEST", directory, null);
  expect(page.code).toBe(0); expect(f.queries).toEqual([{ v: 1, scope: directory, type: "application", states: ["created"], ids: null, limit: APPLICATION_LIST_ROWS, cursor: null }]);
  expect(f.reads).toEqual([digest]);
  expect(page.lines).toContain(String.raw`Count \| \"notes\"\nnext\u0085\u2028\u2029 | ${digest} | ${canonicalize(child)}`);
  expect(page.lines).toContain("2 created applications in this page; selected suffix incomplete.");
  const next = page.lines.find(line => line.startsWith("Next page: dap apps --cursor "))!.split(" --cursor ")[1]!;
  f.mode("stale");
  expect(await applicationList(f.transport, "Session TEST", directory, next)).toEqual({ code: 1, lines: ["Application query refused: stale-cursor. Coverage is incomplete."] });
  expect(f.queries).toHaveLength(2); expect(f.queries[1]!.cursor).toBe(next); expect(f.reads).toEqual([digest]);
  f.mode("complete");
  expect((await applicationList(f.transport, "Session TEST", directory, next)).lines).toContain("0 created applications in this page; selected suffix complete.");
});

test("apps never promotes mismatched definition bytes or another Directory incarnation into a named result", async () => {
  const f = fixture(); f.retained(canonicalize({ ...declaration, name: "Different bytes" }));
  const page = await applicationList(f.transport, "Session TEST", directory, null);
  expect(page.code).toBe(0); expect(page.lines).toContain(`(name unavailable) | ${digest} | ${canonicalize(child)}`);
  expect(page.lines).toContain("Names unavailable for 2 rows; their recorded definitions and scopes are shown.");
  f.mode("wrong-scope");
  await expect(applicationList(f.transport, "Session TEST", directory, null)).rejects.toThrow("reply does not match");
  expect(f.reads).toHaveLength(1);
  for (const args of [["apps", "extra"], ["apps", "--cursor", "one", "--cursor", "two"]]) expect((await command({} as Context, args)).code).toBe(2);
});
