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
import { viewInputToolName, viewToolName } from "../src/views/names.ts";
import type { Display } from "../src/views/types.ts";

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

test("member queues route native alerts, present tender work and watering decisions, and refuse lost routes before signing", async () => {
  const root = await prepareGrowCheck();
  let session: Awaited<ReturnType<typeof openOwnedGrowScenario>> | undefined;
  try {
    const { packet } = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)));
    const input = JSON.parse(await readFile(new URL("./support/grow-owned-fault-scenario.json", import.meta.url), "utf8")) as {
      steps: { act?: { kind: string; fields: Record<string, unknown> } }[];
    };
    const offered = input.steps.findIndex(step => step.act?.kind === "offer-task");
    expect(offered).toBeGreaterThan(0); input.steps = input.steps.slice(0, offered + 1);
    input.steps[offered]!.act!.fields["text"] = "Check vent 2's actuator in Room A, zone 2.";
    session = await openOwnedGrowScenario(packet, input);
    const people = {
      operator: growOperator(packet, session, "grow.heat", "operator"),
      day: growOperator(packet, session, "grow.tend", "day"),
      night: growOperator(packet, session, "grow.tend", "night"),
      head: growOperator(packet, session, "grow.water-more", "head"),
    };
    const { operator, day, night, head } = people;
    await day.advance(session.time);
    const task = session.scope.state.page("task", ["offered"], null, 32).items[0]!;
    const bench = session.scope.state.page("bench", ["fresh", "stale"], null, 100).items.find(item => item.values["label"] === "D4")!;
    const zone = bench.refs["zone"]; if (typeof zone !== "number") throw Error("The native bench has no local zone.");
    const probe = await day.nativeAct("day", "probe", bench.id, { ec: 2800 }, { on: bench.id });
    if (probe.answer !== "accepted") throw Error(`Native basis probe ${probe.answer}.`);
    const ask = async (reason: string) => {
      const result = await head.nativeAct("irrigation", "request-watering", null,
        { zone, bench: bench.id, basis: probe.receipt.fact, amountMl: 800, reason }, { zone, bench: bench.id });
      if (result.answer !== "accepted") throw Error(`Native watering request ${result.answer}.`);
      return session!.scope.state.page("watering", ["asked"], null, 32).items.at(-1)!;
    };
    const request = await ask("High EC on D4; request early watering.");
    const roomA = session.site.state.page("room", ["active"], null, 3).items.find(item => canonicalize(item.refs["scope"]) === canonicalize(session!.scope.at))!;
    const roomB = await session.createRoom("Room B");
    const present = async (who: "day" | "night", kind: "arrive" | "leave", room: number) => {
      expect((await day.nativeAct(who, kind, null, { room }, {}, "site")).answer).toBe("accepted");
    };
    const open = async (person: typeof day, screen: string, key: string, items?: Record<string, number>) => {
      const opening = await person.service.call(viewToolName(screen, true), { view: key, scope: session!.scope.at, ...(items ? { items } : {}) });
      expect(opening.isError, JSON.stringify(opening)).toBe(false);
      expect(JSON.stringify(opening)).not.toContain("sources");
      const result = await person.service.call("view_read", { view: key });
      expect(result.isError, JSON.stringify(result)).toBe(false);
      return result.structuredContent["display"] as Display;
    };
    // No covered arrival or matching leave is unknown, never an empty queue.
    const unknown = await open(day, "tasks", "unknown-presence");
    expect(unknown).toMatchObject({ status: "unavailable", count: 1, card: { title: "Assignment unavailable", identity: { item: String(task.id) }, actions: [] } });
    expect(unknown.card?.declared?.data).toBeUndefined();
    expect(unknown.context.projection).toContainEqual({ scope: session.site.at.scope, ...session.site.state.scope()!.head });
    expect(JSON.stringify(unknown)).not.toContain("Check vent 2's actuator");
    await present("day", "arrive", roomA.id); await present("night", "arrive", roomB.item);
    const expected = { operator: [1, 0, 0], day: [0, 1, 0], head: [0, 0, 1] };
    const displays: Record<string, Display> = {};
    for (const name of ["operator", "day", "head"] as const) for (const [i, screen] of ["alerts", "tasks", "watering-requests"].entries()) {
      const key = `${name}-${screen}`, display = await open(people[name], screen, key);
      displays[key] = display; expect(display.count).toBe(expected[name][i]);
      expect(display.data).toBeUndefined(); expect(display.card?.declared?.data).toBeUndefined();
    }
    expect(displays["operator-alerts"]!.card?.actions.map(action => action.label)).toEqual(["Authorize", "Hold 60 s"]);
    expect(displays["day-tasks"]!.card).toMatchObject({ title: "Check vent 2's actuator in Room A, zone 2.", actions: [{ label: "Take" }] });
    expect(displays["head-watering-requests"]!.card?.actions.map(action => action.label)).toEqual(["Approve", "Decline"]);
    expect((await open(night, "tasks", "other-room")).count).toBe(0);
    // A scope-authorized reader may explicitly request the other records.
    expect((await open(operator, "task-record", "explicit-task", { task: task.id })).card).toMatchObject({ identity: { item: String(task.id) }, actions: [] });
    expect((await open(day, "watering-record", "explicit-water", { watering: request.id })).card?.actions).toEqual([]);
    expect((await open(day, "alert-record", "explicit-alert", { alert: Number(displays["operator-alerts"]!.card!.identity.item) })).card?.actions).toEqual([]);

    // Leaving changes the route at the same native task revision.
    await present("day", "leave", roomA.id);
    const stale = displays["day-tasks"]!;
    expect((await day.service.call("view_act", { view: "day-tasks", cut: stale.cut, action: "take-task" })).isError).toBe(true);
    expect(day.signatures()).toBe(0); expect(session.scope.state.item(task.id)!.revision).toBe(task.revision);
    expect((await open(day, "tasks", "left-room")).count).toBe(0);
    await present("day", "arrive", roomA.id);
    const beforeCoverageLoss = await open(day, "tasks", "coverage-loss");
    for (let i = 0; i < 100; i++) await present("night", "arrive", roomB.item);
    const lostCoverage = await day.service.call("view_act", { view: "coverage-loss", cut: beforeCoverageLoss.cut, action: "take-task" });
    expect(day.signatures()).toBe(0); expect(session.scope.state.item(task.id)!.revision).toBe(task.revision);
    expect(lostCoverage.isError).toBe(true);
    const uncovered = await open(day, "tasks", "uncovered-presence");
    expect(uncovered).toMatchObject({ status: "unavailable", count: 1, card: { identity: { item: String(task.id) }, actions: [] } });
    expect(uncovered.context.projection).toContainEqual({ scope: session.site.at.scope, ...session.site.state.scope()!.head });
    await present("day", "leave", roomA.id);
    expect((await open(day, "tasks", "covered-negative")).count).toBe(0);
    await present("day", "arrive", roomA.id); await present("day", "leave", roomB.item);
    const current = await open(day, "tasks", "current-task");
    expect(current.count).toBe(1); // A wrong-room leave does not cancel A.
    expect(current.context.projection).toContainEqual({ scope: session.site.at.scope, ...session.site.state.scope()!.head });
    await present("night", "arrive", roomA.id);
    const competing = await open(night, "tasks", "competing-task");
    expect(competing.count).toBe(1);
    const taken = await day.service.call("view_act", { view: "current-task", cut: current.cut, action: "take-task" });
    expect(taken.isError, JSON.stringify(taken)).toBe(false);
    expect(taken.structuredContent["result"]).toMatchObject({ structuredContent: { answer: "accepted" } });
    expect(day.signatures()).toBe(1); expect(day.submitted[0]!.intent).toMatchObject({ kind: "take-task", on: task.id, expected: { on: task.revision } });
    expect(session.scope.state.item(task.id)).toMatchObject({ state: "taken", parties: { performer: day.member } });
    expect((await night.service.call("view_act", { view: "competing-task", cut: competing.cut, action: "take-task" })).isError).toBe(true);
    expect(night.signatures()).toBe(0);
    // A button act returns its captured card and receipt; the app then reads
    // the fresh native state. Do not mistake the receipt for that refresh.
    const refreshed = await day.service.call("view_read", { view: "current-task", cut: current.cut, refresh: true });
    expect(refreshed.isError, JSON.stringify(refreshed)).toBe(false);
    const reportCard = refreshed.structuredContent["display"] as Display;
    expect(reportCard.card?.actions).toEqual([{ id: "report-task", label: "Report", purpose: "act", input: "chat" }]);
    const reported = await day.service.call(viewInputToolName("tasks", "report-task"), { view: "current-task", item: String(task.id),
      revision: reportCard.card!.identity.revision, request: "report-task-1", values: { report: "Freed the jammed vane by hand." } });
    expect(reported.isError, JSON.stringify(reported)).toBe(false); expect(day.signatures()).toBe(2);
    expect(reported.structuredContent["receipt"]).toContain("accepted"); expect(JSON.stringify(reported)).not.toContain("sources");
    expect(session.scope.state.item(task.id)).toMatchObject({ state: "done", values: { report: "Freed the jammed vane by hand." } });
    const empty = await day.service.call("view_read", { view: "current-task" });
    expect(empty.structuredContent["display"]).toMatchObject({ status: "empty", count: 0, refresh: 2000,
      back: { screen: "grid", scope: session.scope.at }, context: { navigation: ["back"] } });

    const water = displays["head-watering-requests"]!; head.actions([]);
    expect((await head.service.call("view_act", { view: "head-watering-requests", cut: water.cut, action: "approve-watering" })).isError).toBe(true);
    expect(head.signatures()).toBe(0); head.actions(["grow.water-more"]);
    const approve = await open(head, "watering-requests", "approve-request");
    expect((await head.service.call("view_act", { view: "approve-request", cut: approve.cut, action: "approve-watering" })).isError).toBe(false);
    expect(session.scope.state.item(request.id)).toMatchObject({ state: "approved", parties: { decidedBy: head.member }, values: { decision: "Approved as requested." } });
    const second = await ask("High EC on D4; second manual request.");
    const decline = await open(head, "watering-requests", "decline-request");
    expect((await head.service.call("view_act", { view: "decline-request", cut: decline.cut, action: "decline-watering" })).isError).toBe(false);
    expect(session.scope.state.item(second.id)).toMatchObject({ state: "declined", values: { decision: "Declined." } });
    expect(head.signatures()).toBe(2); expect(operator.signatures()).toBe(0);
    for (const scope of [session.site, session.scope, roomB.scope]) {
      const replay = await scope.replay(); expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    }
  } finally { session?.close(); await rm(root, { recursive: true, force: true }); }
});
