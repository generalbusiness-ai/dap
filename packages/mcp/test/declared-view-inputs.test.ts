/** Scripted model calls and read/standing answers. This witnesses the mounted
 * host's pre-sign boundary, not an LLM, native submit or membership journal. */
import { expect, test } from "vitest";
import type { DeclaredDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, keyIdOfSecret, parseStrict, sign } from "@generalbusiness/artroom-bytes";
import { applicationProjectionId, applicationProjectionQueryDigest, packApplication2 } from "@generalbusiness/artroom-bytes/application-v2";
import { applicationCounterPacket2 } from "../../scope/test/support/application-v2-fixture.ts";
import { DeclaredViewSource } from "../src/views/declared.ts";
import { ViewSessions } from "../src/views/session.ts";
import { viewTools, toolsForHost } from "../src/views/tools.ts";
import { viewInputToolName } from "../src/views/names.ts";

async function fixture() {
  const base = await applicationCounterPacket2(), definition = parseStrict(base.package.semantic.definitions[0]!.bytes) as DeclaredDefinition;
  definition.acts["pause"] = { ...definition.acts["pause"]!, fields: {
    tag: { type: "enum", of: ["manual"], required: true }, moisture: { type: "int", min: 0, max: 100, required: false },
    ec: { type: "int", min: 0, max: 10000, required: false }, note: { type: "text", max: 64, required: false },
  } };
  const id = definitionDigest(definition), board = base.package.presentation.views["board"]!;
  if (board.kind === "surface") throw Error("Item fixture required.");
  const { creates: _creates, ...semantic } = base.package.semantic, { semantic: _semantic, ...presentation } = base.package.presentation;
  const secret = new Uint8Array(32).fill(67);
  const packet = await packApplication2({ name: "test.input", version: "1", semantic: { ...semantic, entry: id,
    definitions: [{ id, bytes: canonicalize(definition) }], projections: { board: { ...semantic.projections["board"]!, definition: id } } },
  presentation: { ...presentation, views: { board: { ...board, kind: "carousel", acts: [{ act: "pause", label: "Measure", needs: "counting.control", when: "state = 'open'",
    args: { tag: "manual" }, parameters: {
      moisture: { kind: "int", label: "Moisture", unit: "%", min: 0, max: 100, required: false },
      ec: { kind: "decimal", label: "EC", unit: "mS/cm", min: 0, max: 10000, scale: 3, required: false },
      note: { kind: "text", label: "Note", max: 64, required: false },
    } }] } } } }, { key: keyIdOfSecret(secret), sign: bytes => sign(secret, bytes) });
  const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };
  let held = ["counting.control"], revision = 1, answer = "accepted";
  const source = new DeclaredViewSource(packet.bytes, packet.ids.release, {
    installation: async () => ({ scope, directory: { ...scope, kind: "directory" }, membership: { ...scope, kind: "membership" },
      rules: { ...scope, kind: "rules" }, destination: { ...scope, kind: "destination" }, definition: id, ids: packet.ids, item: 7 }), actions: async () => held,
    projection: async query => ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: {
      v: 1, projection: applicationProjectionId(packet.package.semantic.projections["board"]!), scope,
      at: { seq: revision, hash: `sha256:${"a".repeat(64)}` }, sources: { board: [{ id: 2, type: "board", state: "open", revision, fields: { lastNumber: 42 } }] },
    } }),
  });
  const signed: { kind: string; args: Record<string, unknown> }[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const sessions = new ViewSessions(source, { call: async () => { throw Error("No adapter."); } }, async (kind, args, admit) => {
    await admit(); signed.push({ kind, args }); await gate; if (answer === "accepted") revision++;
    return { structuredContent: { answer, fact: { seq: 2 }, private: "must not reach the model" }, content: [], isError: false };
  }, async () => { throw Error("No unresolved original."); });
  const opening = await sessions.open("measure", "board"), tools = viewTools(sessions, source.screens), tool = tools[viewInputToolName("board", "pause")]!;
  const args = { view: "measure", item: opening.identity!.item, revision: "1", request: "one-reading", values: { moisture: 31, ec: 2.1, note: "leaf edge curl" } };
  return { source, sessions, tools, tool, args, signed, release, id, scope, held: (value: string[]) => { held = value; }, revision: (value: number) => { revision = value; }, answer: (value: string) => { answer = value; } };
}

test("declared model input converts exact fields once, retains concurrent retries and exposes no private card data", async () => {
  const f = await fixture();
  expect(f.tool.tool.annotations?.["readOnlyHint"]).toBe(false);
  expect(toolsForHost(Object.values(f.tools).map(value => value.tool), false).map(tool => tool.name)).toContain(f.tool.tool.name);
  expect(f.tool.tool.inputSchema).toMatchObject({ properties: { values: { additionalProperties: false, properties: { ec: { type: "number", minimum: 0, maximum: 10 } } } } });
  const display = await f.sessions.read("measure");
  expect(display.card?.actions).toEqual([{ id: "pause", label: "Measure", purpose: "act", input: "chat" }]);
  await expect(f.sessions.act("measure", display.cut, "pause")).rejects.toMatchObject({ reason: "shape" });
  const first = f.tool.run(f.args), duplicate = f.tool.run(structuredClone(f.args)); f.release();
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
  const f = await fixture(); f.answer("unknown"); f.release();
  const original = await f.tool.run(f.args);
  expect(original.structuredContent["receipt"]).toContain("outcome unknown; check the original request");
  expect(await f.tool.run(f.args)).toEqual(original);
  expect((await f.tool.run({ ...f.args, request: "successor" })).structuredContent).toMatchObject({ reason: "stale" });
  const before = f.signed[0]!.args["idempotencyKey"];
  let display = await f.sessions.read("measure");
  expect(display.card?.actions).toEqual([{ id: "check-0", label: "Check original request", purpose: "check-original" }]);
  display = await f.sessions.read("measure", display.cut, { position: 0 });
  expect(display.card?.actions[0]?.purpose).toBe("check-original");
  expect(f.signed).toHaveLength(1); expect(f.signed[0]!.args["idempotencyKey"]).toBe(before);
});
