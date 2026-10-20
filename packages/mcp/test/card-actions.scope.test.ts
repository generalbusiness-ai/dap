import { expect, test } from "vitest";
import type { Item, ScopeRef } from "@generalbusiness/dap-contract";
import { firstExtents } from "@generalbusiness/dap-platform";
import type { Card, Display, ViewSource } from "../src/index.ts";
import { mcpRoom, created } from "./fixtures-native.ts";

// This projection is a FIXTURE, not a journey lane adapter. It reads and acts on the real rules scope through normal MCP
// authorization. The room helper labels the external Git host, scheduler and clock stand-ins; no real publication is claimed.
// Invariant: display/context revisions are the revisions model and app actions actually sign; duplicate or superseded
// instances cannot sign a successor, and old receipts remain readable.
test("server-retained card actions keep displayed revisions and custody across duplicate and superseded instances", async () => {
  const room = mcpRoom();
  let gateScope = "", gateNextSummary = false;
  let entered!: () => void, release!: () => void, replacing!: () => void;
  const enteredRead = new Promise<void>((resolve) => { entered = resolve; });
  const readReleased = new Promise<void>((resolve) => { release = resolve; });
  const replacementRead = new Promise<void>((resolve) => { replacing = resolve; });
  const fields = { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) };
  const source: ViewSource = { read: async (query, access) => {
    if (query.subject === "superseding-during-build") replacing();
    const result = await access.call("inspect", { scope: "rules" });
    if (result.isError) return { status: "denied", position: 0, count: 0, fallback: "The rules scope refused the read." };
    const read = result.structuredContent;
    const item = (read["items"] as Item[]).find((item) => item.id === 0)!;
    const ref = read["ref"] as ScopeRef;
    const head = read["head"] as { seq: number; hash: string };
    const card: Card = {
      identity: { kind: "policy", item: "rules-0", revision: String(item.revision), subject: { scope: ref.scope, item: 0 }, at: { on: item.revision } },
      title: "PRIVATE TITLE", summary: "PRIVATE SUMMARY", body: "PRIVATE BODY", actor: { kind: "person", name: "PRIVATE ACTOR" }, reasons: ["PRIVATE REASON"],
      projection: [{ scope: ref.scope, ...head }], reviewIntended: [], unavailable: [], waitsOn: [], settles: ["publish"],
      actions: [{ id: "publish", label: "Publish", purpose: "act", kind: "publish", args: { target: "rules", on: 0, fields, at: { on: item.revision } } }], fallback: "Read the rules scope.",
    };
    return { status: "ready", count: 1, position: query.position, card, fallback: "Read the rules scope." };
  } };
  try {
    const rita = room.agent("rita", { views: source, beforeFetch: async (url) => {
      if (gateNextSummary && new URL(url).pathname.endsWith(`/${gateScope}`)) {
        gateNextSummary = false; entered(); await readReleased;
      }
    } });
    await created(room, rita);
    const opening = await rita.call("view_needs_you", { view: "old" });
    expect(JSON.stringify(opening)).not.toContain("PRIVATE");
    const read = (args: Record<string, unknown> = {}) => rita.ok("view_read", { view: "old", ...args });
    const summary = (await read())["display"] as Display;
    expect(summary.card!.actions).toEqual([]);
    const detail = (await read({ cut: summary.cut, page: "item" }))["display"] as Display;
    expect(detail.context.identity).toEqual(detail.card!.identity);
    expect(JSON.stringify(detail.context)).not.toContain("PRIVATE");
    expect(detail.context.entriesRead).toEqual([]);
    const at = detail.context.identity!.at;

    // A real act advances the same subject after display. The following model act signs the context's old revision.
    expect((await rita.ok("rules.publish", { on: 0, fields, idempotencyKey: "move-before-model" }))["answer"]).toBe("accepted");
    const model = await rita.ok("rules.publish", { on: 0, fields, at, idempotencyKey: "model-captured" });
    expect([model["answer"], model["reason"]]).toEqual(["refused", "revision-moved"]);
    expect(rita.signedIntents.at(-1)!.expected).toEqual(at);
    const app = await rita.ok("view_act", { view: "old", cut: detail.cut, action: "publish" });
    expect((app["result"] as { structuredContent: unknown }).structuredContent).toMatchObject({ answer: "refused", reason: "revision-moved" });
    expect(rita.signedIntents.at(-1)!.expected).toEqual(at);

    const fresh = (await read({ cut: detail.cut, page: "item", refresh: true }))["display"] as Display;
    const signatures = rita.signedIntents.length;
    const args = { view: "old", cut: fresh.cut, action: "publish" };
    const pair = await Promise.all([rita.ok("view_act", args), rita.ok("view_act", args)]);
    expect(pair.map((answer) => (answer["result"] as { structuredContent: Record<string, unknown> }).structuredContent["answer"])).toEqual(["accepted", "accepted"]);
    expect(rita.signedIntents.length).toBe(signatures + 1);
    expect(rita.signedIntents.at(-1)!.expected).toEqual(fresh.context.identity!.at);
    const receipt = (pair[0]!["display"] as Display).receipt!;
    expect(receipt).toMatch(/^policy rules-0 [0-9]+: accepted/);
    expect(receipt).not.toContain(fresh.card!.identity.subject.scope);

    // Refresh to a new display cut, then supersede the instance. Unconsumed controls refuse; old receipts still read.
    const refreshed = (await read({ cut: fresh.cut, page: "item", refresh: true }))["display"] as Display;
    await rita.ok("view_needs_you", { view: "new" });
    const beforeOld = rita.signedIntents.length;
    const old = await rita.call("view_act", { view: "old", cut: refreshed.cut, action: "publish" });
    expect([old.isError, old.structuredContent["reason"]]).toEqual([true, "superseded"]);
    const retained = (await read())["display"] as Display;
    expect(retained.active).toBe(false);
    expect(retained.receipt).toBeTruthy();
    expect(rita.signedIntents.length).toBe(beforeOld);

    // A lost reply retains the original signed request. Only its check is offered; settling signs no successor.
    const newSummary = (await rita.ok("view_read", { view: "new" }))["display"] as Display;
    const newDetail = (await rita.ok("view_read", { view: "new", cut: newSummary.cut, page: "item" }))["display"] as Display;
    room.loseNextReply(`/${newDetail.card!.identity.subject.scope}/acts`);
    const lost = await rita.ok("view_act", { view: "new", cut: newDetail.cut, action: "publish" });
    expect((lost["result"] as { structuredContent: unknown }).structuredContent).toMatchObject({ error: "transport" });
    const pending = lost["display"] as Display;
    expect(pending.card!.actions.map((action) => action.purpose)).toEqual(["check-original"]);
    const beforeCheck = rita.signedIntents.length;
    const checked = await rita.ok("view_act", { view: "new", cut: pending.cut, action: pending.card!.actions[0]!.id });
    expect((checked["result"] as { structuredContent: unknown }).structuredContent).toMatchObject({ answer: "accepted" });
    expect(rita.signedIntents.length).toBe(beforeCheck);

    // Supersession while a native summary read is in flight must be checked again at signing admission.
    const ready = (await rita.ok("view_read", { view: "new", cut: (checked["display"] as Display).cut, page: "item", refresh: true }))["display"] as Display;
    gateScope = ready.card!.identity.subject.scope;
    gateNextSummary = true;
    const beforeRace = rita.signedIntents.length;
    const oldAction = rita.call("view_act", { view: "new", cut: ready.cut, action: "publish" });
    await enteredRead;
    const newer = rita.ok("view_needs_you", { view: "race-new", subject: "superseding-during-build" });
    await replacementRead;
    release();
    const refused = await oldAction;
    expect([refused.isError, refused.structuredContent["reason"]]).toEqual([true, "superseded"]);
    await newer;
    expect(rita.signedIntents.length).toBe(beforeRace);
  } finally { release(); await room.done(); }
});
