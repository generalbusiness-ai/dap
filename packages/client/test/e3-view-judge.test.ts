import { expect, test } from "vitest";
import { timeOf } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { scopeReplica } from "../src/replica.ts";
import { viewCut } from "../src/view-cut.ts";
import { viewJudge } from "../src/view-judge.ts";
import { actVersion } from "../src/act-version.ts";
import { Feed } from "./replica-support.ts";
import { c4Runtime } from "./support/c4-runtime.ts";

// A held view judges against its checked session, clock and recorded cut, with no read or signature.
test("a captured native view judges the same release after the live head moves", async () => {
  const runtime = await c4Runtime(true), feed = new Feed();
  const replica = scopeReplica(runtime.handle, { observe: feed.observe });
  try {
    feed.emit({ status: "streaming" }); await replica.read();
    const donate = await runtime.handle.intent(runtime.signer, "donate", { on: null, expected: { library: runtime.store.item(0)!.revision },
      fields: { name: "A tool", description: "description", page: "shelf/tool.md", content: "content" } },
      { now: runtime.now(), idempotencyKey: "e3-donate", lifetimeSeconds: 60 });
    const donation = await runtime.handle.submit(donate.signed, [], donate.beside);
    if (donation.answer !== "accepted") return expect.fail("donation accepted");
    const opened = donation.receipt.effects.find(effect => effect.effect === "open");
    if (!opened || opened.effect !== "open") return expect.fail("donation opened tool");
    await replica.read();
    const checked = validateDefinition(runtime.handle.definition, PROPOSED_BOUNDS);
    if (!checked.ok) return expect.fail("definition validated");
    const beforeReserve = viewCut(replica, checked.definition);
    if (!beforeReserve) return expect.fail("current donation cut");
    const source = { key: "e3-donate", version: actVersion({ kind: "donate", on: null,
      expected: { library: runtime.store.item(0)!.revision }, fields: { name: "A tool", description: "description", page: "shelf/tool.md", content: "content" } }) };
    const fromSource = viewJudge(runtime.handle, checked.definition, beforeReserve, runtime.signer.key, runtime.member, timeOf(runtime.now()),
      { is: "ready", session: runtime.session, requestedAt: timeOf(runtime.now() - 1500) },
      [{ source, opened: opened.item, revisions: { [opened.item]: runtime.store.item(opened.item)!.revision } }]);
    expect(fromSource.judge("e3-symbolic-reserve", { kind: "reserve", on: null, expected: {},
      fields: { tool: { output: source }, day: "2026-11-15", until: timeOf(runtime.now() + 3_600_000) } })).toMatchObject({ is: "admitted" });
    expect(fromSource.judge("e3-wrong-source", { kind: "reserve", on: null, expected: {},
      fields: { tool: { output: { ...source, version: `sha256:${"0".repeat(64)}` } }, day: "2026-11-15", until: timeOf(runtime.now() + 3_600_000) } })).toMatchObject({ is: "unavailable", lacks: ["source"] });
    const reserve = await runtime.handle.intent(runtime.signer, "reserve", { on: null, expected: {},
      fields: { tool: opened.item, day: "2026-11-15", until: timeOf(runtime.now() + 3_600_000) } },
      { now: runtime.now(), idempotencyKey: "e3-reserve", lifetimeSeconds: 60 });
    const reserved = await runtime.handle.submit(reserve.signed, [], reserve.beside);
    if (reserved.answer !== "accepted") return expect.fail("reservation accepted");
    const item = reserved.receipt.effects.find(effect => effect.effect === "open");
    if (!item || item.effect !== "open") return expect.fail("reservation opened");
    await replica.read();
    const cut = viewCut(replica, checked.definition);
    if (!cut) return expect.fail("current cut");
    const reading = timeOf(runtime.now());
    const made = viewJudge(runtime.handle, checked.definition, cut, runtime.signer.key, runtime.member, reading,
      { is: "ready", session: runtime.session, requestedAt: timeOf(runtime.now() - 1500) });
    const act = { kind: "release" as const, on: item.item, fields: {}, expected: { on: runtime.store.item(item.item)!.revision } };
    const before = { ...runtime.counts }, first = made.judge("e3-release", act);
    expect(first).toMatchObject({ is: "admitted", context: { authority: { authorityAge: 1500 } } });
    expect(runtime.counts).toEqual(before);
    const real = await runtime.handle.intent(runtime.signer, "release", act, { now: runtime.now(), idempotencyKey: "e3-real-release", lifetimeSeconds: 60 });
    const submitted = await runtime.handle.submit(real.signed, [], real.beside);
    expect(submitted.answer).toBe("accepted");
    await replica.read();
    const repeated = made.judge("e3-release", act);
    if (first.is !== "admitted" || repeated.is !== "admitted") return expect.fail("both cuts admit");
    expect({ ...repeated, after: null }).toEqual({ ...first, after: null });
    expect(repeated.after.row(item.item)).toEqual(first.after.row(item.item));
    const latest = viewCut(replica, checked.definition);
    if (!latest) return expect.fail("current release cut");
    const releaseSource = { key: "e3-real-release", version: actVersion(act) };
    const afterChange = viewJudge(runtime.handle, checked.definition, latest, runtime.signer.key, runtime.member, reading,
      { is: "ready", session: runtime.session, requestedAt: timeOf(runtime.now() - 1500) },
      [{ source: releaseSource, opened: null, revisions: { [item.item]: runtime.store.item(item.item)!.revision } }]);
    expect(afterChange.judge("e3-repeat-release", { ...act, expected: { on: { after: releaseSource } } }))
      .toMatchObject({ is: "refused" });
  } finally { replica.close(); runtime.close(); }
});
