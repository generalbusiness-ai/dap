/** Real native-judged birth and issued session; local transport and clock are fixtures. */
import { expect, test } from "vitest";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { scopeReplica } from "../src/replica.ts";
import { explore } from "../src/scope.ts";
import { Reads, ReadSessions } from "../src/reads.ts";
import { Session } from "../src/session.ts";
import { Feed } from "./replica-support.ts";
import { c4Runtime } from "./support/c4-runtime.ts";

test("E2 judges the checked standing and clock at one cut without a write", async () => {
  const runtime = await c4Runtime(true), feed = new Feed();
  let clock = runtime.now();
  let returned = runtime.session;
  let gate: Promise<void> | null = null;
  const replica = scopeReplica(runtime.handle, { observe: feed.observe, exploration: {
    actor: runtime.signer.key, member: runtime.member, clock: () => timeOf(clock),
    read: async () => { if (gate) await gate; return { is: "ready", session: returned }; },
  } });
  try {
    feed.emit({ status: "streaming" }); await replica.read();
    expect(replica.view.state).toEqual({ is: "current" });
    expect(runtime.session.standing).not.toBeNull();
    const donate = await runtime.handle.intent(runtime.signer, "donate", { on: null,
      expected: { library: runtime.store.item(0)!.revision }, fields: { name: "A tool", description: "description", page: "shelf/tool.md", content: "content" } },
      { now: clock, idempotencyKey: "e2-setup-donate", lifetimeSeconds: 60 });
    const donation = await runtime.handle.submit(donate.signed, [], donate.beside);
    if (donation.answer !== "accepted") throw new Error("setup donation refused");
    const opened = donation.receipt.effects.find(effect => effect.effect === "open");
    if (!opened || opened.effect !== "open") throw new Error("setup donation missing item");
    const reserve = await runtime.handle.intent(runtime.signer, "reserve", { on: null, expected: {},
      fields: { tool: opened.item, day: "2026-11-15", until: timeOf(clock + 3_600_000) } },
      { now: clock, idempotencyKey: "e2-setup-reserve", lifetimeSeconds: 60 });
    const reservation = await runtime.handle.submit(reserve.signed, [], reserve.beside);
    if (reservation.answer !== "accepted") throw new Error("setup reservation refused");
    const held = reservation.receipt.effects.find(effect => effect.effect === "open");
    if (!held || held.effect !== "open") throw new Error("setup reservation missing item");
    await replica.read();
    const act = { kind: "release" as const, on: held.item, fields: {}, expected: { on: runtime.store.item(held.item)!.revision } };
    const authority = { session: runtime.session, requestedAt: timeOf(clock - 1500) };
    const before = { counts: { ...runtime.counts }, state: canonicalize(runtime.store.all()) };
    const admitted = await explore(replica, "e2-donate", act, authority, () => timeOf(clock));
    if (admitted.is !== "admitted") throw new Error(JSON.stringify({is: admitted.is, lacks: admitted.is === "unavailable" ? admitted.lacks : []}));
    expect(admitted).toMatchObject({ is: "admitted", context: { authority: { authorityAge: 1500, standing: runtime.session.standing } }, changed: [held.item] });
    expect(runtime.counts).toEqual(before.counts);
    expect(canonicalize(runtime.store.all())).toBe(before.state);
    expect(JSON.stringify(admitted)).not.toContain(runtime.session.reader());
    const standing = runtime.session.standing!;
    const lacking = new Session(runtime.session.reader().slice(8), runtime.session.claims, { ...standing, actions: [] });
    returned = lacking;
    expect(await explore(replica, "e2-donate", act, { session: lacking, requestedAt: authority.requestedAt }, () => timeOf(clock)))
      .toMatchObject({ is: "refused", reason: "unauthorized" });
    const different = new Session(runtime.session.reader().slice(8), runtime.session.claims, runtime.session.standing);
    returned = different;
    expect(await explore(replica, "e2-donate", act, authority, () => timeOf(clock))).toMatchObject({ is: "unavailable", lacks: ["authority-unavailable"] });
    returned = runtime.session;
    clock -= 2000;
    expect(await explore(replica, "e2-donate", act, authority, () => timeOf(clock))).toMatchObject({ is: "unavailable", lacks: ["authority-unavailable"] });
    clock += 2000;
    let releaseRead!: () => void;
    gate = new Promise<void>(resolve => { releaseRead = resolve; });
    const pending = explore(replica, "e2-donate", act, authority, () => timeOf(clock));
    await replica.read(); releaseRead(); gate = null;
    expect(await pending).toMatchObject({ is: "unavailable", lacks: ["source"] });
    const signed = await runtime.handle.intent(runtime.signer, "release", act,
      { now: clock, idempotencyKey: "e2-real-release", lifetimeSeconds: 60 });
    const actual = await runtime.handle.submit(signed.signed, [], signed.beside);
    if (actual.answer !== "accepted") throw new Error("the real release was refused");
    expect(admitted.effects).toEqual(actual.receipt.effects);
    replica.close();
    expect(await explore(replica, "e2-donate", act, authority, () => timeOf(clock))).toMatchObject({ is: "unavailable", lacks: ["source"] });
  } finally { replica.close(); runtime.close(); }
});

// Two readers share a completed credential; its acquisition start never moves on a cache hit.
test("shared sessions retain the original start and forget invalidates its age", async () => {
  const runtime = await c4Runtime(), sessions = new ReadSessions();
  let now = runtime.now();
  const port = { service: runtime.service, fetch: runtime.fetch, signer: runtime.signer, now: () => now, sessions };
  const one = new Reads(port), two = new Reads(port), started = timeOf(now);
  try {
    const session = await one.session(runtime.membership);
    if (!session) throw new Error("fixture did not issue a session");
    now += 1200;
    expect(await two.session(runtime.membership)).toBe(session);
    expect(two.sessionRequestedAt(runtime.membership, session)).toBe(started);
    sessions.forget(runtime.membership.scope);
    expect(two.sessionRequestedAt(runtime.membership, session)).toBeNull();
  } finally { runtime.close(); }
});
