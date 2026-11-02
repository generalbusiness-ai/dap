import { expect, test } from "vitest";
import type { Fetch } from "@generalbusiness/dap-client";
import { actsOn, openRoom, placeOf, sessionKey, type Room } from "../src/data.ts";
import { RoomOpening, roomContext } from "../src/shell.ts";
import { demo } from "./support/demo.ts";

// Invariant: concurrent callers keep the last complete identity while sharing one pending roster read; completed or failed reads publish standing atomically.
// Real membership, HTTP, sessions and Page data functions. The transport gate controls order; it supplies no roster or authority.
test("a pending roster refresh keeps the complete identity, and a failed refresh clears standing before offering acts", async () => {
  const d = await demo();
  try {
    const session = d.as(await d.secretOf(d.rita)), membershipPath = `/v1/scopes/${d.M.name}`;
    const native = session.fetch!;
    let mode: "normal" | "hold" | "fail" = "normal", reads = 0;
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => { enter = resolve; });
    const released = new Promise<void>(resolve => { release = resolve; });
    const fetch: Fetch = async (url, init) => {
      if (new URL(url).pathname === membershipPath) {
        reads++;
        if (mode === "hold") { mode = "normal"; enter(); await released; }
        if (mode === "fail") throw Error("TEST roster read unavailable");
      }
      return native(url, init);
    };
    const place = placeOf(JSON.stringify(d.config))!;
    const opening = new RoomOpening<Room>(room => !!room.me?.handle && room.key === sessionKey(room.session));
    const context = roomContext(session.service, place, sessionKey(session));
    const open = () => opening.get(context, () => openRoom({ ...session, fetch }, place));
    const room = await d.wait(open);
    const identified = room.me;
    expect(identified?.handle).toBe("@rita");
    await d.wait(async () => {
      reads = 0; mode = "hold";
      const first = actsOn(room, d.D.name);
      try {
        await entered;
        expect(room.me, "ANOTHER DRAW still sees the complete verified identity while the roster read waits").toEqual(identified);
        const second = actsOn(room, d.D.name);
        await Promise.resolve();
        expect(reads, "CONCURRENT CALLERS use the same complete roster read").toBe(1);
        release();
        const [one, two] = await Promise.all([first, second]);
        expect(one).toEqual(two);
        expect(one.acts.map(act => act.kind)).toContain("open-issue");
        expect(room.me).toEqual(identified);
      } finally { release(); await first.catch(() => {}); }
    });
    mode = "fail";
    await expect(d.wait(() => actsOn(room, d.D.name))).rejects.toThrow();
    expect(room.me, "A FAILED READ cannot keep the prior standing").toBeNull();
    mode = "normal";
    const reopened = await d.wait(async () => {
      const first = open(), concurrent = open();
      expect(concurrent, "RECOVERY shares the pending fresh open").toBe(first);
      return first;
    });
    expect(reopened, "THE NEXT DRAW cannot reuse the room whose standing failed").not.toBe(room);
    expect(reopened.me, "THE NEXT DRAW authenticates the actual roster again").toEqual(identified);
    expect((await d.wait(() => actsOn(reopened, d.D.name))).acts.map(act => act.kind)).toContain("open-issue");
    expect((await d.wait(() => actsOn(room, d.D.name))).acts.map(act => act.kind), "RECOVERY reads the actual roster again").toContain("open-issue");
    expect(room.me).toEqual(identified);
    // A new completed roster still changes permissions; retaining identity during a read grants no act.
    expect((await d.run(d.rita, "act", "set-actions", "--on", "membership", "--target", "0", "--set", "role=admin", "--set", "actions=[]")).code).toBe(0);
    const changed = await d.wait(() => actsOn(room, d.D.name));
    expect(changed.acts.map(act => act.kind)).not.toContain("open-issue");
    expect(room.me?.actions).toEqual([]);
  } finally { d.done(); }
});
