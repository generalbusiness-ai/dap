import { expect, test } from "vitest";
import { timeOf } from "@generalbusiness/dap-bytes";
import { memoryStore } from "../src/custody.ts";
import { memoryDrafts } from "../src/draft-store.ts";
import { clientIdle, clientReplica, scopeClient } from "../src/scope-client.ts";
import { explore } from "../src/scope.ts";
import { Session } from "../src/session.ts";
import { Feed } from "./replica-support.ts";
import { c4Runtime } from "./support/c4-runtime.ts";

// Invariant 12: one published cut keeps its context; replacement and ticks make a new judgment.
test("fresh and held views agree with E1 at their checked cut and clock", async () => {
  const runtime = await c4Runtime(true), feed = new Feed(), store = memoryStore(), drafts = memoryDrafts();
  let now = runtime.now(), current = true, changed = () => {}, tick = () => {}, gate: Promise<void> | null = null, entered = () => {};
  let session = runtime.session;
  let timerId = 0;
  const timers = new Map<number, { run: () => void; delay: number }>();
  const clock = { now: () => now, set: (run: () => void, delay: number) => { const id = timerId++; timers.set(id, { run, delay }); return id; },
    clear: (id: unknown) => { timers.delete(id as number); } };
  const requestedAt = timeOf(now - 1500);
  const client = scopeClient(runtime.handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store, drafts, observe: feed.observe,
    clock, exploration: runtime.readInputs,
    viewAuthority: { read: async () => { if (gate) { entered(); await gate; } return { is: "ready", session, requestedAt }; }, current: () => current,
      observe: notify => { changed = notify; return () => {}; } }, ticks: notify => { tick = notify; return () => {}; } });
  try {
    feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
    const donate = await runtime.handle.intent(runtime.signer, "donate", { on: null, expected: { library: runtime.store.item(0)!.revision },
      fields: { name: "A tool", description: "description", page: "shelf/tool.md", content: "content" } },
      { now, idempotencyKey: "e3-view-donate", lifetimeSeconds: 60 });
    const donation = await runtime.handle.submit(donate.signed, [], donate.beside);
    if (donation.answer !== "accepted") return expect.fail("donation accepted");
    const opened = donation.receipt.effects.find(effect => effect.effect === "open");
    if (!opened || opened.effect !== "open") return expect.fail("donation opened");
    const dueAt = now + 60_000;
    const reserve = await runtime.handle.intent(runtime.signer, "reserve", { on: null, expected: {},
      fields: { tool: opened.item, day: "2026-11-15", until: timeOf(dueAt) } },
      { now, idempotencyKey: "e3-view-reserve", lifetimeSeconds: 60 });
    const reserved = await runtime.handle.submit(reserve.signed, [], reserve.beside);
    if (reserved.answer !== "accepted") return expect.fail("reservation accepted");
    const item = reserved.receipt.effects.find(effect => effect.effect === "open");
    if (!item || item.effect !== "open") return expect.fail("reservation opened");
    await client.read(); await clientIdle(client);
    const held = client.view, row = held.projectedRow({ item: item.item });
    expect(row?.ref).toEqual({ name: item.item, seen: runtime.store.item(item.item)!.revision, assumes: [] });
    expect(row?.recorded).toEqual(runtime.store.item(item.item));
    const act = { kind: "release" as const, on: item.item, fields: {}, expected: { on: runtime.store.item(item.item)!.revision } };
    const counts = { ...runtime.counts }, actual = held.explore("e3-view-release", act);
    expect(runtime.counts).toEqual(counts);
    const fresh = await explore(clientReplica(client), "e3-view-release", act, { session: runtime.session, requestedAt }, () => timeOf(now));
    if (actual.is !== "admitted" || fresh.is !== "admitted") return expect.fail(`expected admitted: ${actual.is}, ${fresh.is}`);
    expect({ ...actual, after: null }).toEqual({ ...fresh, after: null });
    expect(actual.after.row(item.item)).toEqual(fresh.after.row(item.item));
    expect(held.offers(row!.ref!, () => "offer-key").some(offer => offer.template.act.kind === "release")).toBe(true);
    const slot = client.slot("release", { on: row!.ref! });
    expect((await client.edit(slot, {})).ok).toBe(true);
    await clientIdle(client);
    expect(client.view).not.toBe(held);
    const afterEdit = client.view.explore("e3-view-release", act);
    if (afterEdit.is !== "admitted") return expect.fail("edit retains the admitted recorded judgment");
    expect({ ...afterEdit, after: null }).toEqual({ ...fresh, after: null });
    expect((await client.discard(slot)).ok).toBe(true);
    await clientIdle(client);
    const standing = runtime.session.standing;
    if (!standing) return expect.fail("checked standing");
    session = new Session(runtime.session.reader().slice("Session ".length), runtime.session.claims, { ...standing, role: "forged" });
    changed(); await clientIdle(client);
    expect(client.view.explore("e3-view-release", act)).toMatchObject({ is: "unavailable", lacks: ["authority-unavailable"] });
    session = runtime.session;
    const role = standing.role;
    Reflect.set(standing, "role", "mutated"); changed(); await clientIdle(client);
    expect(client.view.explore("e3-view-release", act)).toMatchObject({ is: "unavailable", lacks: ["authority-unavailable"] });
    expect(held.explore("e3-view-release", act).is).toBe("admitted");
    Reflect.set(standing, "role", role); changed(); await clientIdle(client);
    for (const advance of [100, 200, 300]) {
      now += advance; tick(); await clientIdle(client);
      const generated = client.view.explore("e3-view-release", act);
      const expected = await explore(clientReplica(client), "e3-view-release", act, { session: runtime.session, requestedAt }, () => timeOf(now));
      if (generated.is !== "admitted" || expected.is !== "admitted") return expect.fail("generated cut admits");
      expect({ ...generated, after: null }).toEqual({ ...expected, after: null });
    }
    let releaseTick!: () => void, enteredTick!: () => void;
    gate = new Promise<void>(resolve => { releaseTick = resolve; });
    const tickRead = new Promise<void>(resolve => { enteredTick = resolve; }); entered = enteredTick;
    changed(); await tickRead;
    now++; tick(); releaseTick(); gate = null; await clientIdle(client);
    const afterTickRace = client.view.explore("e3-view-release", act);
    if (afterTickRace.is !== "admitted") return expect.fail("current tick cut admits");
    expect(afterTickRace.context.clock).toBe(timeOf(now));
    const dueWake = [...timers.values()].find(timer => timer.delay === dueAt - now);
    expect(dueWake).toBeDefined();
    now = dueAt + 1; dueWake!.run(); await clientIdle(client);
    const due = client.view.explore("e3-view-release", act);
    const freshDue = await explore(clientReplica(client), "e3-view-release", act, { session: runtime.session, requestedAt }, () => timeOf(now));
    expect(due).toMatchObject({ is: "unavailable", lacks: ["due"] });
    expect(due).toEqual(freshDue);
    expect(held.explore("e3-view-release", act).is).toBe("admitted");
    let release!: () => void, ready!: () => void;
    gate = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { ready = resolve; }); entered = ready;
    changed(); await started;
    current = false; changed(); release(); gate = null; await clientIdle(client);
    expect(client.view.explore("e3-view-release", act)).toMatchObject({ is: "unavailable", lacks: ["authority-unavailable"] });
    expect(held.explore("e3-view-release", act).is).toBe("admitted");
    current = true; now -= 2000; tick(); await clientIdle(client);
    expect(client.view.explore("e3-view-release", act)).toMatchObject({ is: "unavailable", context: { clock: null } });
    client.close();
    expect(client.view.explore("e3-view-release", act)).toMatchObject({ is: "unavailable", lacks: ["source"] });
    expect(held.explore("e3-view-release", act).is).toBe("admitted");
  } finally { client.close(); runtime.close(); }
});

// An invalid initial host clock gives no fabricated timestamp or authority.
test("an invalid initial clock yields unavailable with a null clock", async () => {
  const runtime = await c4Runtime(true), feed = new Feed();
  const client = scopeClient(runtime.handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store: memoryStore(), drafts: memoryDrafts(), observe: feed.observe,
    clock: { ...runtime.clock, now: () => Number.NaN }, exploration: runtime.readInputs,
    viewAuthority: { read: async () => ({ is: "ready", session: runtime.session, requestedAt: timeOf(runtime.now()) }), current: () => true, observe: () => () => {} } });
  try {
    feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
    expect(client.view.explore("invalid-clock", { kind: "release", on: 0, fields: {} }))
      .toMatchObject({ is: "unavailable", context: { clock: null }, lacks: ["authority-unavailable"] });
  } finally { client.close(); runtime.close(); }
});
