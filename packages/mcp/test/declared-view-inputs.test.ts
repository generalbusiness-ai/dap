import { configureInputDefinition } from "./support/definition-corpus-data.ts";
/** Scripted model calls and read/standing answers. This witnesses the mounted
 * host's pre-sign boundary, not an LLM, native submit or membership journal. */
import { expect, test } from "vitest";
import type { DeclaredDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, keyIdOfSecret, parseStrict, sign } from "@generalbusiness/artroom-bytes";
import { applicationProjectionId, applicationProjectionQueryDigest, isApplicationJournalSource, packApplication2 } from "@generalbusiness/artroom-bytes/application-v2";
import { applicationCounterPacket2 } from "../../scope/test/fixtures.ts";
import { DeclaredViewSource } from "../src/views/declared.ts";
import { ViewSessions } from "../src/views/session.ts";
import { viewTools, toolsForHost } from "../src/views/tools.ts";
import { viewInputToolName } from "../src/views/names.ts";

async function fixture(ordered = false, direction: "asc" | "desc" = "asc", missing: "first" | "last" = "first") {
  const base = await applicationCounterPacket2(), definition = parseStrict(base.package.semantic.definitions[0]!.bytes) as DeclaredDefinition;
  configureInputDefinition(definition, ordered);
  const id = definitionDigest(definition), board = base.package.presentation.views["board"]!;
  if (board.kind === "surface") throw Error("Item fixture required.");
  const { creates: _creates, ...semantic } = base.package.semantic, { semantic: _semantic, ...presentation } = base.package.presentation;
  const secret = new Uint8Array(32).fill(67);
  const projection = { ...semantic.projections["board"]!, definition: id };
  const boardSource = projection.sources["board"]!;
  if (isApplicationJournalSource(boardSource)) throw Error("Item fixture required.");
  if (ordered) projection.sources = { board: { ...boardSource, read: "many", limit: 4,
    fields: { ...boardSource.fields, probeTime: { from: { kind: "value", name: "probeTime" }, of: { type: "time" }, nullable: true } } } };
  const packet = await packApplication2({ name: "test.input", version: "1", semantic: { ...semantic, entry: id,
    definitions: [{ id, bytes: canonicalize(definition) }], projections: { board: projection } },
  presentation: { ...presentation, views: { board: { ...board, kind: "carousel", ...(ordered ? { order: { field: "probeTime", direction, missing } } : {}), acts: [{ act: "pause", label: "Measure", needs: "counting.control", when: "state = 'open'",
    args: { tag: "manual" }, parameters: {
      moisture: { kind: "int", label: "Moisture", unit: "%", min: 0, max: 100, required: false },
      ec: { kind: "decimal", label: "EC", unit: "mS/cm", min: 0, max: 10000, scale: 3, required: false },
      note: { kind: "text", label: "Note", max: 64, required: false },
    } }] } } } }, { key: keyIdOfSecret(secret), sign: bytes => sign(secret, bytes) });
  const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };
  let held = ["counting.control"], revision = 1, answer = "accepted", commitUnknown = false;
  const times: Record<string, string | null> = { 2: "2026-10-17T08:00:00Z", 3: null, 4: "2026-10-16T08:00:00Z", 9: "2026-10-16T08:00:00Z" };
  const source = new DeclaredViewSource(packet.bytes, packet.ids.release, {
    installation: async () => ({ scope, directory: { ...scope, kind: "directory" }, membership: { ...scope, kind: "membership" },
      rules: { ...scope, kind: "rules" }, destination: { ...scope, kind: "destination" }, definition: id, ids: packet.ids, item: 7 }), actions: async () => held,
    projection: async query => ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: {
      v: 1, projection: applicationProjectionId(packet.package.semantic.projections["board"]!), scope,
      at: { seq: revision, hash: `sha256:${"a".repeat(64)}` }, sources: { board: (ordered ? [2, 3, 4, 9] : [2]).map(id => ({ id, type: "board", state: "open", revision,
        fields: { lastNumber: 42, ...(ordered ? { probeTime: times[String(id)]! } : {}) } })) },
    } }),
  });
  const signed: { kind: string; args: Record<string, unknown> }[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const sessions = new ViewSessions(source, { call: async () => { throw Error("No adapter."); } }, async (kind, args, admit) => {
    await admit(); signed.push({ kind, args }); await gate;
    if (answer === "accepted" || commitUnknown) { revision++; times[String(args["on"])] = "2026-10-18T08:00:00Z"; }
    return { structuredContent: { answer, fact: { seq: 2 }, private: "must not reach the model" }, content: [], isError: false };
  }, async () => { throw Error("No unresolved original."); });
  const opening = await sessions.open("measure", "board"), tools = viewTools(sessions, source.screens), tool = tools[viewInputToolName("board", "pause")]!;
  const args = { view: "measure", item: opening.identity!.item, revision: "1", request: "one-reading", values: { moisture: 31, ec: 2.1, note: "leaf edge curl" } };
  return { source, sessions, tools, tool, args, signed, release, id, scope, held: (value: string[]) => { held = value; }, revision: (value: number) => { revision = value; }, answer: (value: string) => { answer = value; }, commitUnknown: () => { commitUnknown = true; } };
}

test("declared model input converts exact fields once, retains concurrent retries and exposes no private card data", async () => {
  const f = await fixture();
  expect(f.tool.tool.annotations?.["readOnlyHint"]).toBe(false);
  expect(toolsForHost(Object.values(f.tools).map(value => value.tool), false).map(tool => tool.name)).toContain(f.tool.tool.name);
  expect(f.tool.tool.inputSchema).toMatchObject({ properties: { values: { additionalProperties: false, properties: { ec: { type: "number", minimum: 0, maximum: 10 } } } } });
  const display = await f.sessions.read("measure");
  expect(display.context.view).toBe("measure"); expect(display.context).not.toHaveProperty("cut");
  expect(display.card?.actions).toEqual([{ id: "pause", label: "Measure", purpose: "act", input: "chat" }]);
  await expect(f.sessions.act("measure", display.cut, "pause")).rejects.toMatchObject({ reason: "shape" });
  const routed = { ...f.args, view: display.context.view, item: display.context.identity!.item, revision: display.context.identity!.revision };
  const first = f.tool.run(routed), duplicate = f.tool.run(structuredClone(routed)); f.release();
  const [one, two] = await Promise.all([first, duplicate]);
  expect(one).toEqual(two); expect(f.signed).toHaveLength(1);
  expect(f.signed[0]).toMatchObject({ kind: "pause", args: { target: f.scope.scope, on: 2, digest: f.id,
    fields: { tag: "manual", moisture: 31, ec: 2100, note: "leaf edge curl" } } });
  expect(f.signed[0]!.args["at"]).toEqual(display.card!.identity.at);
  expect(one.structuredContent).toMatchObject({ identity: { revision: "2" }, receipt: expect.stringContaining("accepted (entry 2)") });
  expect(JSON.stringify(one)).not.toMatch(/lastNumber|leaf edge curl|private|2100/);
  f.held([]);
  expect(await f.tool.run(f.args)).toEqual(one); expect(f.signed).toHaveLength(1);
  expect((await f.tool.run({ ...f.args, values: { moisture: 32 } })).structuredContent).toMatchObject({ error: "view", reason: "shape" });
});

test("changed revision, lost standing and invalid inputs refuse at the current pre-sign boundary", async () => {
  const f = await fixture(); f.release();
  for (const values of [{ ec: 2.1001 }, { moisture: 101 }, { tag: "manual" }, {}, { moisture: 31.5 }]) {
    expect((await f.tool.run({ ...f.args, values })).structuredContent).toMatchObject({ error: "view", reason: "shape" });
  }
  expect((await f.tool.run({ ...f.args, item: "3" })).structuredContent).toMatchObject({ error: "view", reason: "stale" });
  f.held([]);
  expect((await f.tool.run({ ...f.args, request: "lost-standing" })).structuredContent).toMatchObject({ error: "view", reason: "stale" });
  f.held(["counting.control"]); f.revision(2);
  expect((await f.tool.run({ ...f.args, request: "stale-revision" })).structuredContent).toMatchObject({ error: "view", reason: "stale" });
  expect(f.signed).toHaveLength(0);
});

test("an unknown measurement retains its original custody request and blocks a new submission", async () => {
  const f = await fixture(true); f.answer("unknown"); f.commitUnknown(); f.release();
  const original = await f.tool.run(f.args);
  expect(original.structuredContent["receipt"]).toContain("outcome unknown; check the original request");
  expect(await f.tool.run(f.args)).toEqual(original);
  expect((await f.tool.run({ ...f.args, request: "successor" })).structuredContent).toMatchObject({ reason: "stale" });
  const before = f.signed[0]!.args["idempotencyKey"];
  let display = await f.sessions.read("measure");
  expect(display.card?.actions).toEqual([{ id: "check-0", label: "Check original request", purpose: "check-original" }]);
  display = await f.sessions.read("measure", display.cut, { position: 0 });
  expect((await f.source.read({ screen: "board", page: "summary", position: 0 })).card?.identity.item).toBe("4");
  expect(display.card?.identity.item).toBe("3"); expect(display.card?.identity.revision).toBe("1");
  expect(display.card?.actions[0]?.purpose).toBe("check-original");
  expect(f.signed).toHaveLength(1); expect(f.signed[0]!.args["idempotencyKey"]).toBe(before);
});

test("oldest-first carousel orders missing and tied probes, then advances after an accepted input", async () => {
  const f = await fixture(true); f.release();
  let display = await f.sessions.read("measure");
  expect(display.card?.identity.item).toBe("3");
  expect(display.card?.declared?.data?.sources["board"]?.map(row => row.id)).toEqual([2, 3, 4, 9]);
  const ids = [display.card!.identity.item];
  for (const position of [1, 2, 3]) { display = await f.sessions.read("measure", display.cut, { position }); ids.push(display.card!.identity.item); }
  expect(ids).toEqual(["3", "4", "9", "2"]);
  await f.sessions.read("measure", display.cut, { position: 0 });
  const accepted = await f.tool.run(f.args);
  expect(accepted.structuredContent).toMatchObject({ identity: { item: "4", revision: "2" } });
  expect(f.signed[0]!.args["on"]).toBe(3);
  expect(await f.tool.run(f.args)).toEqual(accepted); expect(f.signed).toHaveLength(1);
  const reverse = await fixture(true, "desc", "last");
  let reversed = await reverse.sessions.read("measure"); const reverseIds = [reversed.card!.identity.item];
  for (const position of [1, 2, 3]) { reversed = await reverse.sessions.read("measure", reversed.cut, { position }); reverseIds.push(reversed.card!.identity.item); }
  expect(reverseIds).toEqual(["2", "4", "9", "3"]);
});
