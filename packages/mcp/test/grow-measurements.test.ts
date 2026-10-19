/** Scripted typed-text consumer, real declared tool, custody and Core/SQLite
 * probe. Install, membership, sessions and standing lookup remain stand-ins;
 * this is not an actual LLM invocation, provider or device witness. */
import { expect, test } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { secretSigner } from "@generalbusiness/artroom-client";
import { prepareGrowCheck } from "../../../examples/grow/prepare-check.ts";
import { prepareApplicationDirectory } from "../../cli/src/application-files.ts";
import { openOwnedGrowScenario } from "./support/grow-owned-session.ts";
import { growOperator } from "./support/grow-operator.ts";
import { viewInputToolName, viewToolName } from "../src/views/names.ts";
import type { Display } from "../src/views/types.ts";

test("typed measurement fields produce one native probe and advance the oldest bench", async () => {
  const root = await prepareGrowCheck();
  let session: Awaited<ReturnType<typeof openOwnedGrowScenario>> | undefined;
  try {
    const { packet } = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)));
    const input = JSON.parse(await readFile(new URL("./support/grow-owned-fault-scenario.json", import.meta.url), "utf8")) as { time: string; steps: { act?: { kind: string } }[] };
    input.time = "2026-10-16T12:00:00Z";
    input.steps = input.steps.slice(0, input.steps.findIndex(step => step.act?.kind === "probe"));
    session = await openOwnedGrowScenario(packet, input);
    const f = growOperator(packet, session, "grow.tend");
    // Startup includes the native Site summary and its returned result.
    expect(session.scope.state.scope()!.head.seq).toBe(123);
    expect((await f.nativeAct("day", "probe", 45, { moisture: 25, ec: 2000, ph: 580, note: "baseline" }, { on: 45 })).answer).toBe("accepted");
    await f.advance("2026-10-17T12:00:00Z");
    for (let id = 22; id <= 121; id++) if (id !== 45) {
      expect((await f.nativeAct("day", "probe", id, { moisture: 40 }, { on: id })).answer).toBe("accepted");
    }
    await f.advance("2026-10-17T23:59:00Z");
    const open = async (view: string) => {
      const opening = await f.service.call(viewToolName("benches", true), { view, scope: session!.scope.at });
      expect(opening.isError, JSON.stringify(opening)).toBe(false);
      expect(JSON.stringify(opening)).not.toMatch(/sources|baseline|2000/);
      const read = await f.service.call("view_read", { view });
      expect(read.isError, JSON.stringify(read)).toBe(false);
      return read.structuredContent["display"] as Display;
    };
    const card = await open("measure");
    expect(card.card?.identity.item).toBe("45"); expect(card.card?.title).toBe("C4");
    expect(card.count).toBe(100);
    // The text and consumer output are literal fixture data, not host parsing.
    const text = "C4 moisture 31, EC 2.1, pH 5.9, leaf edge curl";
    const values = { moisture: 31, ec: 2.1, ph: 5.9, note: "leaf edge curl" };
    expect(text).toContain("EC 2.1");
    const call = { view: "measure", item: "45", revision: card.card!.identity.revision, request: "morning-c4", values };
    const tool = viewInputToolName("benches", "probe");
    f.actions([]); const signatures = f.signatures();
    expect((await f.service.call(tool, { ...call, request: "lost-standing" })).structuredContent).toMatchObject({ reason: "stale" });
    expect(f.signatures()).toBe(signatures);
    f.actions(["grow.tend"]);
    await f.advance("2026-10-18T12:00:00Z");
    expect((await f.service.call(tool, { ...call, request: "stale-revision" })).structuredContent).toMatchObject({ reason: "stale" });
    expect(f.signatures()).toBe(signatures);
    const current = await open("current");
    expect(current.card?.identity.revision).toBe("3");
    const accepted = await f.service.call(tool, { ...call, view: "current", revision: current.card!.identity.revision });
    expect(accepted.isError, JSON.stringify(accepted)).toBe(false);
    expect(f.signatures()).toBe(signatures + 1); expect(f.submitted).toHaveLength(1);
    expect(f.submitted[0]!.intent).toMatchObject({ to: session.scope.at, kind: "probe", on: 45,
      expected: { on: 3 }, fields: { moisture: 31, ec: 2100, ph: 590, note: "leaf edge curl" } });
    expect(session.scope.state.item(45)!.values).toMatchObject({ moisture: 31, ec: 2100, ph: 590, note: "leaf edge curl", height: null, insects: null, probeTime: "2026-10-18T12:00:00Z" });
    expect(accepted.structuredContent).toMatchObject({ identity: { item: "22" } });
    expect(accepted.structuredContent["receipt"]).toContain("accepted (entry 225)");
    // Same-scope refs remain local entry positions. Explicit journal rows
    // separately carry full entry facts under their captured scope and hash.
    for (const name of ["moistureAt", "ecAt", "phAt", "noteAt", "lastProbe"]) expect(session.scope.state.item(45)!.refs[name]).toBe(225);
    expect(session.scope.state.item(45)!.refs["heightAt"]).toBeNull(); expect(session.scope.state.item(45)!.refs["insectsAt"]).toBeNull();
    expect(JSON.stringify(accepted)).not.toMatch(/sources|leaf edge curl|2100/);
    expect(await f.service.call(tool, { ...call, view: "current", revision: current.card!.identity.revision })).toEqual(accepted);
    expect((await f.service.call(tool, { ...call, request: "replaced-view" })).structuredContent).toMatchObject({ reason: "superseded" });
    expect(f.signatures()).toBe(signatures + 1); expect(f.submitted).toHaveLength(1);
    const replay = await session.scope.replay(); expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
  } finally { session?.close(); await rm(root, { recursive: true, force: true }); }
});
