/** Trusted read/session/standing ports are explicit fixtures. This witnesses
 * generic routing and the mounted pre-sign boundary, not native authority. */
import { expect, test } from "vitest";
import type { ApplicationProjectionRow, DeclaredDefinition, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, keyIdOfSecret, parseStrict, sign } from "@generalbusiness/artroom-bytes";
import { applicationProjectionId, applicationProjectionQueryDigest, packApplication2, readApplicationProjection } from "@generalbusiness/artroom-bytes/application-v2";
import { applicationCounterPacket2 } from "../../scope/test/support/application-v2-fixture.ts";
import { DeclaredViewSource } from "../src/views/declared.ts";
import { ViewSessions } from "../src/views/session.ts";
import type { CallResult } from "../src/service.ts";

const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };
const membership: ScopeRef = { ...scope, kind: "membership" };
const rule = "'counting.control' in viewer.grants and item.state = 'open' and ((viewer.member.member = '@alice' and item.id = 2) or (viewer.member.member = '@bob' and item.id = 4))";
async function fixture(condition = rule) {
  const base = await applicationCounterPacket2(), board = base.package.presentation.views["board"]!;
  if (board.kind === "surface") throw Error("Item fixture required.");
  const definition = parseStrict(base.package.semantic.definitions[0]!.bytes) as DeclaredDefinition;
  definition.items["board"] = { ...definition.items["board"]!, many: true, max: 4 };
  const id = definitionDigest(definition), { creates: _creates, ...semantic } = base.package.semantic;
  const { semantic: _semantic, ...presentation } = base.package.presentation;
  const fields = { lastNumber: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false } };
  const projections = Object.fromEntries(["queue", "record"].map(name => [name, readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: {
    board: { item: "board", read: name === "queue" ? "many" : "item", states: ["finished", "open", "paused"], limit: name === "queue" ? 4 : 1, fields },
  } })]));
  const secret = new Uint8Array(32).fill(67);
  const packet = await packApplication2({ name: "test.routing", version: "1", semantic: { ...semantic, entry: id,
    definitions: [{ id, bytes: canonicalize(definition) }], projections }, presentation: { ...presentation, views: {
    queue: { ...board, kind: "carousel", projection: "queue", for: condition },
    record: { ...board, kind: "record", projection: "record" },
  } } }, { key: keyIdOfSecret(secret), sign: bytes => sign(secret, bytes) });
  let viewer: { member: MemberRef; grants: string[] } | null = { member: { membership, member: "@alice" }, grants: ["counting.control"] };
  let rows: ApplicationProjectionRow[] = [
    { id: 2, type: "board", state: "open", revision: 1, fields: { lastNumber: 11 } },
    { id: 3, type: "board", state: "paused", revision: 1, fields: { lastNumber: 93 } },
    { id: 4, type: "board", state: "open", revision: 1, fields: { lastNumber: 44 } },
  ];
  const source = new DeclaredViewSource(packet.bytes, packet.ids.release, {
    installation: async () => ({ scope, membership, directory: { ...scope, kind: "directory" }, rules: { ...scope, kind: "rules" },
      destination: { ...scope, kind: "destination" }, definition: id, ids: packet.ids, item: 7 }),
    viewer: async () => viewer, actions: async () => viewer?.grants ?? [],
    projection: async query => ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: {
      v: 1, projection: applicationProjectionId(projections[query.projection]!), scope, at: { seq: 9, hash: `sha256:${"b".repeat(64)}` },
      sources: { board: query.projection === "record" ? rows.filter(row => row.id === query.items["board"]) : rows },
    } }),
  });
  let signed = 0;
  const sessions = new ViewSessions(source, { call: async () => { throw Error("No host application code runs."); } }, async (_kind, _args, admit) => {
    await admit(); signed++;
    return { structuredContent: { answer: "accepted" }, content: [], isError: false } satisfies CallResult;
  }, async () => { throw Error("No original request is unresolved."); });
  return { source, sessions, signed: () => signed, viewer: (value: typeof viewer) => { viewer = value; }, rows: (value: typeof rows) => { rows = value; } };
}

test("carousel routes from trusted member, grants and item state without exposing other rows; explicit records retain ordinary grants", async () => {
  const f = await fixture();
  const opening = await f.sessions.open("alice", "queue"), alice = f.sessions.display("alice");
  expect(alice.count).toBe(1); expect(alice.card?.identity.item).toBe("2");
  expect(alice.card?.actions.map(action => action.id)).toEqual(["pause"]);
  expect(alice.card?.declared?.data).toBeUndefined(); expect(alice.data).toBeUndefined();
  expect(JSON.stringify(alice)).not.toContain("lastNumber: 44");
  expect(JSON.stringify(opening)).not.toContain("lastNumber");
  f.viewer({ member: { membership, member: "@bob" }, grants: ["counting.control"] });
  await f.sessions.open("bob", "queue"); expect(f.sessions.display("bob").card?.identity.item).toBe("4");
  f.viewer({ member: { membership, member: "@alice" }, grants: [] });
  await f.sessions.open("no-grant", "queue");
  const empty = f.sessions.display("no-grant");
  expect(empty).toMatchObject({ status: "empty", count: 0, scope, context: { projection: [{ scope: scope.scope, seq: 9 }] } });
  expect(empty.data).toBeUndefined();
  await f.sessions.open("explicit", "record", undefined, { board: 4 });
  expect(f.sessions.display("explicit").card).toMatchObject({ identity: { item: "4" }, actions: [] });
});

test("a changed route at unchanged native item revision refuses before signing", async () => {
  const f = await fixture(); await f.sessions.open("queue", "queue");
  const before = f.sessions.display("queue");
  f.viewer({ member: { membership, member: "@bob" }, grants: ["counting.control"] });
  await expect(f.sessions.act("queue", before.cut, "pause")).rejects.toMatchObject({ reason: "stale" });
  expect(f.signed()).toBe(0);
});

test("missing or foreign viewer and nonboolean or failed rules stay unavailable", async () => {
  for (const viewer of [null, { member: { membership: { ...membership, inc: `in_${"b".repeat(26)}` as const }, member: "@alice" as const }, grants: ["counting.control"] }]) {
    const f = await fixture(); f.viewer(viewer);
    await expect(f.source.read({ screen: "queue", page: "summary", position: 0 })).rejects.toMatchObject({ reason: "unavailable" });
  }
  for (const condition of ["item.missing", "'yes'", "$substring(1, 0)"]) {
    const f = await fixture(condition);
    await expect(f.source.read({ screen: "queue", page: "summary", position: 0 })).rejects.toMatchObject({ reason: "unavailable" });
  }
  await expect(fixture("$number('wrong')")).rejects.toThrow("Only the named pure profile functions can be called");
});
