/** Pure presentation and mounted-view custody-boundary fixtures. The native
 * install/projection/standing ports below are explicit in-memory answers. */
import { expect, test } from "vitest";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import type { ApplicationInstallation } from "@generalbusiness/artroom-bytes/application";
import { applicationProjectionId, applicationProjectionQueryDigest } from "@generalbusiness/artroom-bytes/application-v2";
import { applicationCounterPacket2 } from "../../scope/test/support/application-v2-fixture.ts";
import { DeclaredViewSource } from "../src/views/declared.ts";
import { ViewSessions } from "../src/views/session.ts";
import type { CallResult } from "../src/service.ts";
const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };

async function fixture() {
  const packet = await applicationCounterPacket2();
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
  expect(detail.card?.declared?.data.sources["board"]![0]!.fields).toEqual({ lastNumber: 42 });
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
