import { configurePledgeDefinition, configureConstantDefinition, configureSeriesDefinition } from "./support/definition-corpus-data.ts";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
/** Pure presentation and mounted-view custody-boundary fixtures. The native
 * install/projection/standing ports below are explicit in-memory answers. */
import { expect, test } from "vitest";
import type { DeclaredDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, keyIdOfSecret, parseStrict, sign } from "@generalbusiness/dap-bytes";
import type { ApplicationInstallation } from "@generalbusiness/dap-bytes/application";
import { applicationProjectionId, applicationProjectionQueryDigest, packApplication2, readApplicationProjection } from "@generalbusiness/dap-bytes/application-v2";
import { applicationCounterPacket2, applicationCounterNavigationPacket2 } from "../../scope/test/fixtures.ts";
import { DeclaredViewSource } from "../src/views/declared.ts";
import { ViewSessions } from "../src/views/session.ts";
import type { CallResult } from "../src/service.ts";
import { viewTools } from "../src/views/tools.ts";
import { viewToolName } from "../src/views/names.ts";
const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };

async function fixture(navigation = false) {
  const packet = navigation ? await applicationCounterNavigationPacket2() : await applicationCounterPacket2();
  let installation: ApplicationInstallation | null = { scope, directory: { ...scope, kind: "directory" }, membership: { ...scope, kind: "membership" },
    rules: { ...scope, kind: "rules" }, destination: { ...scope, kind: "destination" }, definition: packet.package.semantic.entry, ids: packet.ids, item: 7 };
  let actions = ["counting.control"], state = "open", revision = 1;
  const source = new DeclaredViewSource(packet.bytes, packet.ids.release, {
    installation: async () => installation,
    actions: async () => actions,
    projection: async query => ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: {
      v: 1, projection: applicationProjectionId(packet.package.semantic.projections["board"]!), scope: installation!.scope,
      at: { seq: revision, hash: `sha256:${"a".repeat(64)}` }, sources: { board: [{ id: 2, type: "board", state, revision, fields: { lastNumber: 42 } }] },
    } }),
  });
  let signed = 0;
  const sessions = new ViewSessions(source, { call: async () => { throw Error("No application read adapter runs."); } }, async (_kind, _args, admit) => {
    await admit(); signed++;
    return { structuredContent: { answer: "accepted" }, content: [{ type: "text", text: "Fixture accepted." }], isError: false } satisfies CallResult;
  }, async () => { throw Error("No original is unresolved."); });
  return { source, sessions, signed: () => signed, actions: (value: string[]) => { actions = value; },
    state: (value: string) => { state = value; }, revision: (value: number) => { revision = value; },
    installation: (value: ApplicationInstallation | null) => { installation = value; } };
}

test("declared fallback and identity open quietly; the app gets the exact projection and only offered controls", async () => {
  const f = await fixture(), opening = await f.sessions.open("first", "board");
  expect(opening.text).toBe("Board 2: open board 2, revision 1.");
  expect(JSON.stringify(opening)).not.toContain("lastNumber");
  expect(JSON.stringify(opening)).not.toContain("42");
  const detail = await f.sessions.read("first", 0, { page: "item" });
  expect(detail.card?.declared?.data?.sources["board"]![0]!.fields).toEqual({ lastNumber: 42 });
  expect(detail.card?.reasons).toEqual(["lastNumber: 42"]);
  expect(detail.card?.actions.map(action => action.id)).toEqual(["pause"]);
  expect((await f.sessions.act("first", detail.cut, "pause")).result.structuredContent["answer"]).toBe("accepted");
  expect(f.signed()).toBe(1);
  f.state("paused");
  const hidden = await f.source.read({ screen: "board", page: "item", position: 0 });
  expect(hidden.card?.actions).toEqual([]);
  f.installation(null);
  await expect(f.source.read({ screen: "board", page: "item", position: 0 })).rejects.toMatchObject({ reason: "unavailable" });
});

test("the host repeats current revision and held-action checks before a new envelope can be signed", async () => {
  for (const loss of ["revision", "actions"] as const) {
    const f = await fixture();
    await f.sessions.open("first", "board");
    const detail = await f.sessions.read("first", 0, { page: "item" });
    expect(detail.card?.actions).toHaveLength(1);
    if (loss === "revision") f.revision(2); else f.actions([]);
    await expect(f.sessions.act("first", detail.cut, "pause")).rejects.toMatchObject({ reason: "stale" });
    expect(f.signed()).toBe(0);
    // A separately opened current display, with the original role action,
    // remains a passing control for each refused path.
    f.actions(["counting.control"]);
    await f.sessions.open("current", "board");
    const current = await f.sessions.read("current", 0, { page: "item" });
    expect((await f.sessions.act("current", current.cut, "pause")).result.structuredContent["answer"]).toBe("accepted");
    expect(f.signed()).toBe(1);
  }
});

test("a declared record opens directly in detail with its declared Back target", async () => {
  const f = await fixture(true), opening = await f.sessions.open("record", "record");
  expect(opening.text).toBe("Board 2: open board 2, revision 1.");
  expect(JSON.stringify(opening)).not.toContain("lastNumber");
  const display = await f.sessions.read("record");
  expect(display.query.page).toBe("item");
  expect(display.card?.declared).toMatchObject({ kind: "record", display: "fullscreen", back: "board" });
  expect(display.card?.actions.map(action => action.id)).toEqual(["pause"]);
});

// Invariant: two controls on the same row retain their own complete expected
// subjects, and a secondary revision change refuses before a signature.
test("declared controls capture different subject sets and repeat secondary revisions before signing", async () => {
  const base = await applicationCounterPacket2(), definition = parseStrict(base.package.semantic.definitions[0]!.bytes) as DeclaredDefinition;
  configurePledgeDefinition(definition);
  const id = definitionDigest(definition), secret = new Uint8Array(32).fill(67);
  const board = base.package.presentation.views["board"]!;
  if (board.kind === "surface") throw Error("This fixture needs a board.");
  const packet = await packApplication2({ name: "test.declared-subjects", version: "1", semantic: {
    ...emptyPackageComposition(), v: 2, entry: id, definitions: [{ id, bytes: canonicalize(definition) }], host: base.package.semantic.host,
    capabilities: [], roles: base.package.semantic.roles, predecessor: null, projections: { board: readApplicationProjection({
      v: 1, definition: id, revision: "revision", sources: {
        board: { item: "board", read: "one", states: ["finished", "open", "paused"], limit: 1, fields: {
          selected: { from: { kind: "ref", name: "pledge" }, of: { type: "item", of: "promise" }, nullable: true },
        } },
        promises: { item: "promise", read: "many", states: ["cancelled", "expired", "failed", "fulfilled", "pledged"], limit: 1, fields: {} },
      },
    }) },
  }, presentation: { v: 2, entry: "index.html", assets: base.package.presentation.assets, descriptions: {}, resources: {}, views: {
    board: { ...board, facts: ["state"], acts: [...board.acts, { act: "hold-pledge", label: "Hold pledge", needs: "counting.control", when: "state = 'open'" }] },
  } } }, { key: keyIdOfSecret(secret), sign: bytes => sign(secret, bytes) });
  let revision = 7, present = true, signed = 0;
  const sent: unknown[] = [];
  const installation: ApplicationInstallation = { scope, directory: { ...scope, kind: "directory" }, membership: { ...scope, kind: "membership" },
    rules: { ...scope, kind: "rules" }, destination: { ...scope, kind: "destination" }, definition: id, ids: packet.ids, item: 7 };
  const source = new DeclaredViewSource(packet.bytes, packet.ids.release, {
    installation: async () => installation, actions: async () => ["counting.control"],
    projection: async query => ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: {
      v: 1, projection: applicationProjectionId(packet.package.semantic.projections["board"]!), scope, at: { seq: revision + 10, hash: `sha256:${"a".repeat(64)}` }, sources: {
        board: [{ id: 2, type: "board", state: "open", revision: 1, fields: { selected: 3 } }],
        promises: present ? [{ id: 3, type: "promise", state: "pledged", revision, fields: {} }] : [],
      },
    } }),
  });
  const sessions = new ViewSessions(source, { call: async () => { throw Error("No adapter."); } }, async (_kind, args, admit) => {
    await admit(); signed++; sent.push(args["at"]);
    return { structuredContent: { answer: "accepted" }, content: [], isError: false };
  }, async () => { throw Error("No unresolved original."); });
  await sessions.open("old", "board");
  const old = await sessions.read("old", 0, { page: "item" });
  const captured = await source.read({ screen: "board", page: "item", position: 0 });
  expect(captured.card?.actions.map(action => action.args["at"])).toEqual([{ on: 1 }, { on: 1, pledge: 7 }]);
  revision = 8;
  const stale = await sessions.act("old", old.cut, "hold-pledge").then(() => ({ reason: "signed" }), error => ({ reason: error.reason }));
  expect(stale).toEqual({ reason: "stale" });
  expect(signed).toBe(0);
  expect((await sessions.act("old", old.cut, "pause")).result.structuredContent["answer"]).toBe("accepted");
  await sessions.open("fresh", "board");
  const fresh = await sessions.read("fresh", 0, { page: "item" });
  expect((await sessions.act("fresh", fresh.cut, "hold-pledge")).result.structuredContent["answer"]).toBe("accepted");
  expect(sent).toEqual([{ on: 1 }, { on: 1, pledge: 8 }]);
  present = false;
  const incomplete = await source.read({ screen: "board", page: "item", position: 0 });
  expect(incomplete.card?.actions.map(action => action.id)).toEqual(["pause"]);
});

// Invariant: lawful punctuation, long names and read/act never shadow a
// mounted-view operation or another view's opening.
test("declared opening tool names preserve exact names without reserved-name collisions", async () => {
  const names = ["alpha-beta", "alpha.beta", "alpha_beta", "read", "act", "A".repeat(128), "board"];
  const screens = names.map(name => ({ name, resource: `ui://fixture/${name}` }));
  const sessions = new ViewSessions({ declared: true, read: async query => ({ status: "empty", count: 0, position: 0, fallback: query.screen }) },
    { call: async () => { throw Error("No read adapter."); } }, async () => { throw Error("No act."); }, async () => { throw Error("No original."); });
  const tools = viewTools(sessions, screens), openings = names.map(name => viewToolName(name, true));
  expect(new Set(openings).size).toBe(names.length);
  expect(openings.every(name => /^[A-Za-z0-9_-]{1,128}$/.test(name) && name !== "view_read" && name !== "view_act")).toBe(true);
  expect(viewToolName("board", true)).toBe("view_board");
  expect(viewToolName("needs-you")).toBe("view_needs_you");
  for (const [index, name] of names.entries()) {
    const opened = await tools[openings[index]!]!.run({ view: `opening-${index}` });
    expect(opened.structuredContent["screen"]).toBe(name);
    expect(opened.content[0]!.text).toBe(name);
  }
  expect(tools["view_read"]?.tool._meta?.["ui"]).toEqual({ visibility: ["app"] });
  expect(tools["view_act"]?.tool._meta?.["ui"]).toEqual({ visibility: ["app"] });
});

// Invariant: fixed choices retain their exact native fields and distinct
// custody identities, and renewed admission refuses stale or altered choices.
test("two constant choices retain one native act and recheck fields, standing and revision before signing", async () => {
  const base = await applicationCounterPacket2(), definition = parseStrict(base.package.semantic.definitions[0]!.bytes) as DeclaredDefinition;
  configureConstantDefinition(definition);
  const id = definitionDigest(definition), board = base.package.presentation.views["board"]!;
  if (board.kind === "surface") throw Error("Board fixture required.");
  const controls = [{ act: "pause", label: "Off", needs: "counting.control", when: "state = 'open'", args: { target: "off", level: 0 } },
    { act: "pause", label: "On", needs: "counting.control", when: "state = 'open'", args: { target: "on", level: 100 } }];
  const secret = new Uint8Array(32).fill(67);
  const { creates: _creates, ...semantic } = base.package.semantic;
  const { semantic: _semantic, ...presentation } = base.package.presentation;
  const packet = await packApplication2({ name: "test.constants", version: "1", semantic: { ...semantic,
    entry: id, definitions: [{ id, bytes: canonicalize(definition) }], projections: { board: { ...base.package.semantic.projections["board"]!, definition: id } } },
    presentation: { ...presentation, views: { board: { ...board, acts: controls } } } },
    { key: keyIdOfSecret(secret), sign: bytes => sign(secret, bytes) });
  const installation: ApplicationInstallation = { scope, directory: { ...scope, kind: "directory" }, membership: { ...scope, kind: "membership" },
    rules: { ...scope, kind: "rules" }, destination: { ...scope, kind: "destination" }, definition: id, ids: packet.ids, item: 7 };
  let held = ["counting.control"], revision = 1;
  const source = new DeclaredViewSource(packet.bytes, packet.ids.release, { installation: async () => installation, actions: async () => held,
    projection: async query => ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: {
      v: 1, projection: applicationProjectionId(packet.package.semantic.projections["board"]!), scope,
      at: { seq: revision, hash: `sha256:${"a".repeat(64)}` }, sources: { board: [{ id: 2, type: "board", state: "open", revision, fields: { lastNumber: 42 } }] },
    } }),
  });
  const query = { screen: "board", page: "item" as const, position: 0 }, card = (await source.read(query)).card!;
  expect(card.actions.map(action => [action.id, action.kind, action.args["fields"]])).toEqual([
    ["pause:0", "pause", { target: "off", level: 0 }], ["pause:1", "pause", { target: "on", level: 100 }],
  ]);
  await expect(source.admit(query, card, card.actions[0]!)).resolves.toBeUndefined();
  await expect(source.admit(query, card, card.actions[1]!)).resolves.toBeUndefined();
  const altered = structuredClone(card.actions[0]!); altered.args["fields"] = { target: "on", level: 100 };
  await expect(source.admit(query, card, altered)).rejects.toMatchObject({ reason: "stale" });
  held = []; await expect(source.admit(query, card, card.actions[0]!)).rejects.toMatchObject({ reason: "stale" });
  held = ["counting.control"]; revision = 2;
  await expect(source.admit(query, card, card.actions[0]!)).rejects.toMatchObject({ reason: "stale" });
});

// In-memory read answers expose only presentation: native projection bytes,
// history completeness and authority are witnessed in the owning Scope tests.
test("record history keeps only the last selected-item samples and their exact source facts and times", async () => {
  const base = await applicationCounterPacket2(), definition = parseStrict(base.package.semantic.definitions[0]!.bytes) as DeclaredDefinition;
  configureSeriesDefinition(definition);
  const id = definitionDigest(definition), board = base.package.presentation.views["board"]!;
  if (board.kind === "surface") throw Error("Board fixture required.");
  const projection = readApplicationProjection({ ...base.package.semantic.projections["board"]!, definition: id, sources: {
    ...base.package.semantic.projections["board"]!.sources,
    history: { read: "entries", acts: ["pause"], window: 100, limit: 100, latestBy: null,
      fields: { mean: { from: { kind: "field", name: "mean" }, of: { type: "int", min: -4000, max: 8000 }, nullable: false } } },
  } });
  const { creates: _creates, ...semantic } = base.package.semantic, { semantic: _semantic, ...presentation } = base.package.presentation;
  const secret = new Uint8Array(32).fill(67);
  const packet = await packApplication2({ name: "test.series", version: "1", semantic: { ...semantic, entry: id,
    definitions: [{ id, bytes: canonicalize(definition) }], projections: { board: projection } }, presentation: { ...presentation, views: {
      board: { ...board, kind: "record", acts: [], series: { source: "history", field: "mean", label: "Mean", scale: 2, unit: "°C", last: 2 } },
    } } }, { key: keyIdOfSecret(secret), sign: bytes => sign(secret, bytes) });
  const installation: ApplicationInstallation = { scope, directory: { ...scope, kind: "directory" }, membership: { ...scope, kind: "membership" },
    rules: { ...scope, kind: "rules" }, destination: { ...scope, kind: "destination" }, definition: id, ids: packet.ids, item: 7 };
  const point = (seq: number, on: number, mean: number, time: string) => ({ id: seq, type: "pause", state: "sealed", revision: seq, on, time,
    fields: { mean }, entry: { at: scope, seq, hash: `sha256:${"b".repeat(64)}` as const } });
  let history = [point(1, 2, 2400, "2026-10-18T12:00:00Z"), point(3, 2, 2650, "2026-10-18T12:05:00Z"),
    point(5, 2, 2300, "2026-10-18T12:10:00Z"), point(19, 99, 8000, "2026-10-18T12:15:00Z")];
  const source = new DeclaredViewSource(packet.bytes, packet.ids.release, { installation: async () => installation, actions: async () => [],
    projection: async query => ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: {
      v: 1, projection: applicationProjectionId(projection), scope, at: { seq: 20, hash: `sha256:${"a".repeat(64)}` },
      sources: { board: [{ id: 2, type: "board", state: "open", revision: 1, fields: { lastNumber: 42 } }], history },
    } }),
  });
  const query = { screen: "board", page: "item" as const, position: 0 }, series = (await source.read(query)).card!.declared!.series!;
  expect(series.samples).toEqual([point(3, 2, 2650, "2026-10-18T12:05:00Z"), point(5, 2, 2300, "2026-10-18T12:10:00Z")].map(row => ({ value: row.fields.mean, time: row.time, entry: row.entry })));
  expect(series.fallback).toBe("Mean: 2 recorded samples in the last 100 native entries. Latest 23 °C at 2026-10-18T12:10:00Z; lowest 23 °C at 2026-10-18T12:10:00Z; highest 26.5 °C at 2026-10-18T12:05:00Z.");
  history = [point(19, 99, 8000, "2026-10-18T12:15:00Z")];
  expect((await source.read(query)).card!.declared!.series).toMatchObject({ samples: [], fallback: "Mean: no recorded samples in the last 100 native entries." });
});
