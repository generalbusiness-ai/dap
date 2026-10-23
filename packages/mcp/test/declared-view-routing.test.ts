import { configureRoutingDefinition } from "./support/definition-corpus-data.ts";
/** Trusted read/session/standing ports are explicit fixtures. This witnesses
 * generic routing and the mounted pre-sign boundary, not native authority. */
import { expect, test } from "vitest";
import type { ApplicationProjectionQuery, ApplicationProjectionRow, DeclaredDefinition, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, keyIdOfSecret, parseStrict, sign } from "@generalbusiness/artroom-bytes";
import { applicationProjectionId, applicationProjectionQueryDigest, packApplication2, readApplicationProjection } from "@generalbusiness/artroom-bytes/application-v2";
import { applicationCounterPacket2 } from "../../scope/test/fixtures.ts";
import { DeclaredViewSource } from "../src/views/declared.ts";
import { ViewSessions } from "../src/views/session.ts";
import type { CallResult } from "../src/service.ts";

const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };
const membership: ScopeRef = { ...scope, kind: "membership" };
const rule = "'counting.control' in viewer.grants and item.state = 'open' and ((viewer.member.member = '@alice' and item.id = 2) or (viewer.member.member = '@bob' and item.id = 4))";
async function fixture(condition = rule, related = false, outcome: "accepted" | "unknown" = "accepted", withMembers = false) {
  const base = await applicationCounterPacket2(), board = base.package.presentation.views["board"]!;
  if (board.kind === "surface") throw Error("Item fixture required.");
  const definition = parseStrict(base.package.semantic.definitions[0]!.bytes) as DeclaredDefinition;
  configureRoutingDefinition(definition, withMembers);
  const id = definitionDigest(definition), { creates: _creates, ...semantic } = base.package.semantic;
  const { semantic: _semantic, ...presentation } = base.package.presentation;
  const fields = { lastNumber: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
    ...(withMembers ? { worker: { from: { kind: "party", name: "worker" }, of: { type: "member" }, nullable: true } } : {}) };
  const projections = Object.fromEntries(["queue", "record", "related"].map(name => [name, readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: {
    board: { item: "board", read: name === "record" ? "item" : "many", states: ["finished", "open", "paused"], limit: name === "record" ? 1 : 4, fields },
  } })]));
  const secret = new Uint8Array(32).fill(67);
  const packet = await packApplication2({ name: "test.routing", version: "1", semantic: { ...semantic, entry: id,
    definitions: [{ id, bytes: canonicalize(definition) }], projections }, presentation: { ...presentation, views: {
    queue: { ...board, kind: "carousel", projection: "queue", for: condition, ...(related ? { reads: { roster: { projection: "related", scope: "installation" as const } } } : {}) },
    record: { ...board, kind: "record", projection: "record" },
  } } }, { key: keyIdOfSecret(secret), sign: bytes => sign(secret, bytes) });
  let viewer: { member: MemberRef; grants: string[] } | null = { member: { membership, member: "@alice" }, grants: ["counting.control"] };
  let rows: ApplicationProjectionRow[] = [
    { id: 2, type: "board", state: "open", revision: 1, fields: { lastNumber: 11 } },
    { id: 3, type: "board", state: "paused", revision: 1, fields: { lastNumber: 93 } },
    { id: 4, type: "board", state: "open", revision: 1, fields: { lastNumber: 44 } },
  ];
  if (withMembers) rows = rows.map(row => ({ ...row, fields: { ...row.fields,
    worker: { membership, member: row.id === 2 ? "@alice" : row.id === 3 ? "@hidden" : "@bob" } } }));
  const queries: ApplicationProjectionQuery[] = [];
  const memberReads: ScopeRef[] = [];
  let relatedFailure: "scope" | "projection" | "forbidden" | null = null, head = 9;
  const source = new DeclaredViewSource(packet.bytes, packet.ids.release, {
    installation: async () => ({ scope, membership, directory: { ...scope, kind: "directory" }, rules: { ...scope, kind: "rules" },
      destination: { ...scope, kind: "destination" }, definition: id, ids: packet.ids, item: 7 }),
    viewer: async () => viewer, actions: async () => viewer?.grants ?? [],
    members: async reference => { memberReads.push(reference); return null; },
    projection: async query => {
      queries.push(structuredClone(query));
      const related = query.projection === "related";
      if (related && relatedFailure === "forbidden") return { ok: false, reason: "forbidden" };
      return { ok: true, query: applicationProjectionQueryDigest(query)!, value: {
      v: 1, projection: related && relatedFailure === "projection" ? `sha256:${"c".repeat(64)}` : applicationProjectionId(projections[query.projection]!),
      scope: related && relatedFailure === "scope" ? { ...query.scope, inc: `in_${"c".repeat(25)}a` } : query.scope,
      at: { seq: related ? head - 2 : head, hash: `sha256:${"b".repeat(64)}` },
      sources: { board: query.projection === "record" ? rows.filter(row => row.id === query.items["board"]) : rows },
    } }; },
  });
  let signed = 0;
  const sessions = new ViewSessions(source, { call: async () => { throw Error("No host application code runs."); } }, async (_kind, _args, admit) => {
    await admit(); signed++;
    return { structuredContent: { answer: outcome }, content: [], isError: false } satisfies CallResult;
  }, async () => { throw Error("No original request is unresolved."); });
  return { source, sessions, queries, memberReads, signed: () => signed, viewer: (value: typeof viewer) => { viewer = value; },
    rows: (value: typeof rows) => { rows = value; head++; }, relatedFailure: (value: typeof relatedFailure) => { relatedFailure = value; } };
}

// Invariant: identity resolution cannot disclose rows that a routed queue
// withheld, or turn an unknown assignment into a member lookup.
test("routed identity tables contain only the displayed row and unknown assignments make no member read", async () => {
  const f = await fixture(rule, false, "accepted", true);
  await f.sessions.open("member-queue", "queue");
  const display = f.sessions.display("member-queue");
  expect(Object.values(display.members!.records).map(record => record.ref.member)).toEqual(["@alice"]);
  expect(JSON.stringify(display)).not.toContain("@bob");
  expect(JSON.stringify(display)).not.toContain("@hidden");
  expect(f.memberReads).toEqual([membership]);
  const unknown = await fixture("item.missing", false, "accepted", true);
  await unknown.sessions.open("unknown-queue", "queue");
  expect(unknown.sessions.display("unknown-queue").members).toBeUndefined();
  expect(unknown.memberReads).toEqual([]);
});

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

test("declared root reads retain both heads and recheck current routing without caller scope or item bindings", async () => {
  const f = await fixture(`(${rule}) ? (reads.roster.sources.board[id = 4].fields.lastNumber = 44 ? true : null) : false`, true);
  const child: ScopeRef = { ...scope, scope: `sc_${"d".repeat(51)}a`, inc: `in_${"d".repeat(25)}a` };
  await f.sessions.open("related", "queue", undefined, undefined, child);
  const display = f.sessions.display("related");
  expect(display.card?.identity.item).toBe("2");
  expect(display.context.projection).toEqual([
    { scope: child.scope, seq: 9, hash: `sha256:${"b".repeat(64)}` },
    { scope: scope.scope, seq: 7, hash: `sha256:${"b".repeat(64)}` },
  ]);
  expect(f.queries.map(query => ({ projection: query.projection, scope: query.scope, items: query.items }))).toEqual([
    { projection: "queue", scope: child, items: {} }, { projection: "related", scope, items: {} },
  ]);
  expect(display.card?.declared?.data).toBeUndefined();
  f.rows([
    { id: 2, type: "board", state: "open", revision: 1, fields: { lastNumber: 11 } },
    { id: 4, type: "board", state: "open", revision: 2, fields: { lastNumber: 45 } },
  ]);
  await expect(f.sessions.act("related", display.cut, "pause")).rejects.toMatchObject({ reason: "unavailable" });
  expect(f.signed()).toBe(0);
  for (const failure of ["scope", "projection", "forbidden"] as const) {
    f.relatedFailure(failure);
    await expect(f.source.read({ screen: "queue", page: "summary", position: 0, scope: child })).rejects.toMatchObject({ reason: "unavailable" });
  }
});

test("a changed route at unchanged native item revision refuses before signing", async () => {
  const f = await fixture(); await f.sessions.open("queue", "queue");
  const before = f.sessions.display("queue");
  f.viewer({ member: { membership, member: "@bob" }, grants: ["counting.control"] });
  await expect(f.sessions.act("queue", before.cut, "pause")).rejects.toMatchObject({ reason: "stale" });
  expect(f.signed()).toBe(0);
});

test("automatic refresh recovers a shortened member queue without retargeting explicit navigation or stale acts", async () => {
  const f = await fixture("'counting.control' in viewer.grants and item.state = 'open'");
  await f.sessions.open("shortened", "queue");
  const last = await f.sessions.read("shortened", 0, { position: 1 });
  expect(last.card?.identity.item).toBe("4");
  f.rows([{ id: 2, type: "board", state: "open", revision: 1, fields: { lastNumber: 11 } }]);
  await expect(f.sessions.read("shortened", last.cut, { position: 1 })).rejects.toMatchObject({ reason: "shape" });
  const refreshed = await f.sessions.read("shortened", last.cut, { refresh: true });
  expect(refreshed).toMatchObject({ position: 0, count: 1, query: { position: 0 }, card: { identity: { item: "2" } } });
  expect(refreshed.query.refresh).toBeUndefined();
  await expect(f.sessions.act("shortened", last.cut, "pause")).rejects.toMatchObject({ reason: "stale" });
  expect(f.signed()).toBe(0);
});

test("automatic member-queue refresh retains an unknown original even when current routing selects another item", async () => {
  const f = await fixture("'counting.control' in viewer.grants", false, "unknown");
  await f.sessions.open("unknown", "queue");
  const current = f.sessions.display("unknown");
  const unknown = await f.sessions.act("unknown", current.cut, "pause");
  f.rows([{ id: 4, type: "board", state: "open", revision: 1, fields: { lastNumber: 44 } }]);
  expect((await f.source.read({ screen: "queue", page: "summary", position: 0 })).card?.identity.item).toBe("4");
  const retained = await f.sessions.read("unknown", unknown.display.cut, { refresh: true });
  expect(retained.card?.identity.item).toBe("2");
  expect(retained.card?.unresolvedOriginal).toBe(true);
  expect(retained.card?.actions.map(action => action.purpose)).toEqual(["check-original"]);
  expect(f.signed()).toBe(1);
});

test("missing or foreign viewer and nonboolean or failed rules stay unavailable", async () => {
  for (const viewer of [null, { member: { membership: { ...membership, inc: `in_${"b".repeat(25)}a` as const }, member: "@alice" as const }, grants: ["counting.control"] }]) {
    const f = await fixture(); f.viewer(viewer);
    await expect(f.source.read({ screen: "queue", page: "summary", position: 0 })).rejects.toMatchObject({ reason: "unavailable" });
  }
  for (const condition of ["item.missing", "'yes'", "$substring(1, 0)"]) {
    const f = await fixture(condition);
    await f.sessions.open("unknown-membership", "queue");
    const display = f.sessions.display("unknown-membership");
    expect(display).toMatchObject({ status: "unavailable", card: { title: "Assignment unavailable", identity: { item: "2" }, actions: [],
      declared: { actor: null } }, context: { projection: [{ scope: scope.scope, seq: 9 }] } });
    expect(display.card?.declared?.data).toBeUndefined(); expect(display.card?.reasons).toEqual([]);
  }
  await expect(fixture("$number('wrong')")).rejects.toThrow("Only the named pure profile functions can be called");
});
