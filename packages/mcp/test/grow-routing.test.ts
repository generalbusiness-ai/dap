/** Actual owned Core/SQLite Site comments and room births. Installation,
 * membership, read sessions and held-grant lookup remain explicit fixtures.
 * This producer witness makes no per-member queue or presence-coverage claim. */
import { expect, test } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { canonicalize } from "@generalbusiness/artroom-bytes";
import { secretSigner } from "@generalbusiness/artroom-client";
import { prepareGrowCheck } from "../../../examples/grow/prepare-check.ts";
import { prepareApplicationDirectory } from "../../cli/src/application-files.ts";
import { openOwnedGrowScenario } from "./support/grow-owned-session.ts";
import { growOperator } from "./support/grow-operator.ts";

test("owned Site presence retains native signers, room references and exact heads across two actual Room births", async () => {
  const root = await prepareGrowCheck();
  let session: Awaited<ReturnType<typeof openOwnedGrowScenario>> | undefined;
  try {
    const { packet } = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)));
    const input = JSON.parse(await readFile(new URL("./support/grow-owned-fault-scenario.json", import.meta.url), "utf8")) as { steps: unknown[] };
    input.steps = input.steps.slice(0, 1);
    session = await openOwnedGrowScenario(packet, input);
    const f = growOperator(packet, session, "grow.tend", "day"), night = session.actors.find(actor => actor.name === "night")!;
    expect(f.member).toEqual(session.actors.find(actor => actor.name === "day")!.member);
    expect((await f.source.port.viewer!())?.member).toEqual(f.member);
    const rooms = () => session!.site.state.page("room", ["pending", "active", "failed"], null, 3).items;
    const roomA = rooms().find(item => canonicalize(item.refs["scope"]) === canonicalize(session!.scope.at))!;
    const roomB = await session.createRoom("Room B");
    expect(roomB.scope.at).not.toEqual(session.scope.at);
    expect(session.site.state.item(roomB.item)).toMatchObject({ state: "active", refs: { scope: roomB.scope.at } });
    const before = structuredClone([session.site.state.item(0), ...rooms()]);
    const arrive = await f.nativeAct("day", "arrive", null, { room: roomA.id }, {}, "site");
    if (arrive.answer !== "accepted") throw Error(`Native day arrival ${arrive.answer}.`);
    const query = { v: 1 as const, scope: session.site.at, directory: session.directory.at, install: 7, projection: "presence", items: {} };
    const first = await f.source.port.projection(query);
    if (!first.ok) throw Error(`Native presence read ${first.reason}.`);
    expect(first.value.at).toEqual(session.site.state.scope()!.head);
    expect(first.value.sources["events"]).toEqual([expect.objectContaining({ type: "arrive", entry: arrive.receipt.fact, fields: { actor: f.member, room: roomA.id } })]);
    for (const [actor, kind, room] of [["day", "arrive", roomB.item], ["day", "leave", roomA.id], ["night", "arrive", roomA.id]] as const) {
      expect((await f.nativeAct(actor, kind, null, { room }, {}, "site")).answer).toBe("accepted");
    }
    const next = await f.source.port.projection(query);
    if (!next.ok) throw Error(`Native presence read ${next.reason}.`);
    expect(next.value.at).toEqual(session.site.state.scope()!.head);
    expect(next.value.at.seq).toBe(first.value.at.seq + 3);
    expect(next.value.sources["events"]!.map(row => ({ type: row.type, ...row.fields }))).toEqual([
      { type: "arrive", actor: f.member, room: roomA.id },
      { type: "arrive", actor: f.member, room: roomB.item },
      { type: "leave", actor: f.member, room: roomA.id },
      { type: "arrive", actor: night.member, room: roomA.id },
    ]);
    expect([session.site.state.item(0), ...rooms()]).toEqual(before);
    // The declared journal is a recent window, not persistent current state.
    // Day's real arrival in B is now outside coverage; no row may invent it.
    for (let i = 0; i < 100; i++) expect((await f.nativeAct("night", "arrive", null, { room: roomA.id }, {}, "site")).answer).toBe("accepted");
    const bounded = await f.source.port.projection(query);
    if (!bounded.ok) throw Error(`Native bounded presence read ${bounded.reason}.`);
    expect(bounded.value.at).toEqual(session.site.state.scope()!.head);
    expect(bounded.value.sources["events"]).toHaveLength(100);
    expect(bounded.value.sources["events"]!.every(row => canonicalize(row.fields["actor"]) === canonicalize(night.member))).toBe(true);
    expect(first.value.sources["events"]![0]!.entry).toEqual(arrive.receipt.fact);
    expect(f.signatures()).toBe(0); expect(f.submitted).toEqual([]);
    for (const scope of [session.site, roomB.scope]) {
      const replay = await scope.replay(); expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    }
  } finally { session?.close(); await rm(root, { recursive: true, force: true }); }
});
