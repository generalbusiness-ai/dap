import { expect, test } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { secretSigner } from "@generalbusiness/artroom-client";
import { prepareGrowCheck } from "../../../examples/grow/prepare-check.ts";
import { prepareApplicationDirectory } from "../../cli/src/application-files.ts";
import { openOwnedGrowScenario } from "./support/grow-owned-session.ts";
import { growOperator } from "./support/grow-operator.ts";
import { viewToolName } from "../src/views/names.ts";
import type { Display } from "../src/views/types.ts";

test("Grow's displayed alert refuses lost standing and stale revisions before custody, then signs only the heater target once", async () => {
  const root = await prepareGrowCheck();
  let session: Awaited<ReturnType<typeof openOwnedGrowScenario>> | undefined;
  try {
    const { packet } = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)));
    // Literal owned-lane positions include the native confirmation at 1.
    const input = JSON.parse(await readFile(new URL("./support/grow-owned-fault-scenario.json", import.meta.url), "utf8")) as { steps: { act?: { kind: string }; expect?: { answer: string } }[] };
    const end = input.steps.findIndex(step => step.act?.kind === "open-incident" && step.expect?.answer === "accepted");
    expect(end).toBeGreaterThan(0); input.steps = input.steps.slice(0, end + 1);
    session = await openOwnedGrowScenario(packet, input);
    expect(session.site.at.kind).toBe("lane"); expect(session.scope.at.kind).toBe("lane");
    const f = growOperator(packet, session), alert = session.scope.state.item(137)!, heater = session.scope.state.item(10)!;
    const open = async (view: string) => {
      const opening = await f.service.call(viewToolName("alert-record", true), { view, scope: session!.scope.at, items: { alert: alert.id } });
      expect(opening.isError, JSON.stringify(opening)).toBe(false);
      expect(JSON.stringify(opening)).not.toContain("sources");
      const read = await f.service.call("view_read", { view });
      expect(read.isError, JSON.stringify(read)).toBe(false);
      return read.structuredContent["display"] as Display;
    };
    expect((await f.service.call(viewToolName("zone", true), { view: "zone-history", scope: session.scope.at, items: { zone: 7 } })).isError).toBe(false);
    const history = (await f.service.call("view_read", { view: "zone-history" })).structuredContent["display"] as Display;
    expect(history.card?.declared?.series?.samples.map(point => [point.value, point.time])).toEqual([
      [2400, "2026-10-18T12:00:00Z"], [2650, "2026-10-18T12:05:00Z"],
    ]);
    expect(history.card?.declared?.series?.samples.every(point => point.entry.at.scope === session!.scope.at.scope)).toBe(true);
    expect(history.card?.declared?.links).toEqual([
      { label: "Open heater controls", screen: "heater", items: { device: 10 } },
      { label: "Open vent controls", screen: "vent", items: { device: 8 } },
    ]);
    const lost = await open("lost"); expect(lost.card?.actions.map(action => action.id)).toEqual(["authorize", "hold"]);
    const before = f.signatures(); f.actions([]);
    expect((await f.service.call("view_act", { view: "lost", cut: lost.cut, action: "authorize" })).isError).toBe(true);
    expect(f.signatures()).toBe(before); expect(f.submitted).toHaveLength(0);
    f.actions(["grow.heat"]);
    const stale = await open("stale"), current = await open("current");
    const acted = await f.service.call("view_act", { view: "current", cut: current.cut, action: "authorize" });
    expect(acted.isError, JSON.stringify(acted)).toBe(false);
    expect(acted.structuredContent["result"]).toMatchObject({ structuredContent: { answer: "accepted" } });
    expect(f.submitted).toHaveLength(1);
    expect(f.submitted[0]!.intent).toMatchObject({ to: session.scope.at, kind: "authorize", on: alert.id, expected: { on: alert.revision, heater: heater.revision } });
    expect(session.scope.state.item(10)!.values).toMatchObject({ target: "off", reported: null });
    expect(session.scope.state.item(137)!.state).toBe("authorized");
    const after = f.signatures();
    expect((await f.service.call("view_act", { view: "stale", cut: stale.cut, action: "authorize" })).isError).toBe(true);
    expect(f.signatures()).toBe(after); expect(f.submitted).toHaveLength(1);
    const duplicate = await f.service.call("view_act", { view: "current", cut: current.cut, action: "authorize" });
    expect(duplicate).toEqual(acted); expect(f.signatures()).toBe(after); expect(f.submitted).toHaveLength(1);
    // Manual controls use the same native device item, fixed fields and
    // custody path. Related-record navigation itself never signs.
    f.actions(["grow.heat", "grow.climate"]);
    const device = async (screen: string, item: number, view: string) => {
      expect((await f.service.call(viewToolName(screen, true), { view, scope: session!.scope.at, items: { device: item } })).isError).toBe(false);
      const read = await f.service.call("view_read", { view });
      return read.structuredContent["display"] as Display;
    };
    const heatOn = await device("heater", 10, "heat-on");
    expect(heatOn.card?.actions.map(action => action.id)).toEqual(["set-heater:0", "set-heater:1"]);
    const manualOn = await f.service.call("view_act", { view: "heat-on", cut: heatOn.cut, action: "set-heater:1" });
    expect(manualOn.structuredContent["result"]).toMatchObject({ structuredContent: { answer: "accepted" } });
    expect(f.submitted[1]!.intent).toMatchObject({ kind: "set-heater", on: 10, fields: { target: "on", level: 100 } });
    expect(session.scope.state.item(10)!.values).toMatchObject({ target: "on", reported: null });
    const heatOff = await device("heater", 10, "heat-off");
    const manualOff = await f.service.call("view_act", { view: "heat-off", cut: heatOff.cut, action: "set-heater:0" });
    expect(manualOff.structuredContent["result"]).toMatchObject({ structuredContent: { answer: "accepted" } });
    const vent = await device("vent", 3, "vent-close");
    const closed = await f.service.call("view_act", { view: "vent-close", cut: vent.cut, action: "set-vent:0" });
    expect(closed.structuredContent["result"]).toMatchObject({ structuredContent: { answer: "accepted" } });
    expect(f.submitted[3]!.intent).toMatchObject({ kind: "set-vent", on: 3, fields: { target: "closed", level: 0 } });
    expect(session.scope.state.item(3)!.values).toMatchObject({ target: "closed" });
    expect((await device("vent", 8, "vent-error")).card?.actions).toEqual([]);
    expect(f.submitted).toHaveLength(4);
    const replay = await session.scope.replay();
    expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
  } finally { session?.close(); await rm(root, { recursive: true, force: true }); }
});
