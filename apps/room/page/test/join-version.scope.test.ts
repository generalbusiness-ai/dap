/** Native SQLite membership and page HTTP/signing path. The fixture's Git
 * host, clock, setup inspector, in-memory page storage, lock and driven
 * scheduler are explicit stand-ins.
 * No deployed invitation or outside provider is used. */
import { expect, test } from "vitest";
import { b64url, canonicalize, isSeed, keyIdOfSecret, scopeIdOf, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, INVITATION_KEY_COHORT } from "@generalbusiness/dap-platform";
import { joinInvitation } from "../src/join-custody.ts";
import { memoryPageKeys } from "./private-key-fixture.ts";
import { sessionRoom } from "../../../../packages/scope/test/support/session-room.ts";
import { drainScheduledFixture, type nativeFixtureLifetime } from "../../../../packages/scope/test/support/native-fixture-lifetime.ts";
import { rita, routed, type Platform } from "../../../../packages/scope/test/repository.ts";

// Invariant: exact supported invitation pins use their native join fields;
// unknown versions refuse locally, before the page sends any request.
test.each([INVITATION_KEY_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT])("page joins a native $membership invitation with a proof and refuses unknown versions", async cohort => {
  let ownedLife: ReturnType<typeof nativeFixtureLifetime> | undefined, ownedMembership: Platform | undefined;
  try {
    const room = await sessionRoom(cohort.register, undefined, undefined, { finish: "external", capture: value => { ownedLife = value; } });
    const { life } = room, membership = room.children[0]!;
    ownedMembership = membership;
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const seat = await life.wait(() => membership.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => membership.did(rita, "first-key", { fields: { member: seat },
      expected: await membership.expected({ roster: 0, member: seat }) }));
    const invitation = await life.wait(() => membership.did(rita, "invite-member", { fields: {
      handle: "@page-visitor", role: "member", inviteKey: keyIdOfSecret(seed), inviteEnds: timeOf(life.now() + 60_000),
    } }));
    const secret = b64url(seed), service = "https://page-invitation.test", sent: unknown[] = [];
    const keys = memoryPageKeys(), signer = await keys.create(), kept = new Map<string, string>();
    // Real nonextractable WebCrypto key; only the fresh-key selection is a
    // stand-in, returning this independently captured, already persisted key.
    // Native workerd cannot validate imported keys through browser accessors;
    // this case does not claim legacy migration or IndexedDB durability.
    const storage = { getItem: (name: string) => kept.get(name) ?? null, setItem: (name: string, value: string) => { kept.set(name, value); } };
    const options = { keys: { ...keys, create: async () => signer }, now: life.now, lock: { run: <T>(work: () => Promise<T>) => work() },
      fetch: (url: string, init?: Parameters<typeof routed>[1]) => {
        if (new URL(url).pathname.endsWith("/acts")) sent.push(JSON.parse(init!.body as string));
        return routed(url, init);
      } };
    const link = { v: 1, service, repository: { directory: room.directory, membership: room.membership,
      rules: room.rules.scope, destination: (await life.wait(() => room.children[2]!.at())).scope },
      invitation, secret, handle: "@page-visitor", definition: cohort.membership };
    const encode = (value: unknown) => `artroom-invite:${b64url(utf8(canonicalize(value)))}`;
    await expect(joinInvitation(service, encode({ ...link, definition: "platform:membership@99" }), storage, options)).rejects.toThrow(
      "The invitation does not match this configured service, complete repository references and an explicit supported membership version.");
    expect(sent).toEqual([]);
    // Keep a local encoding refusal visible as an assertion in the original
    // regression run, instead of mistaking an ordinary throw for evidence.
    const joined = await life.wait(() => joinInvitation(service, encode(link), storage, options)).catch(error => ({ localRefusal: String(error) }));
    expect(joined, JSON.stringify(joined)).toMatchObject({ status: "verified", answer: { answer: "accepted" }, place: { membership: room.membership } });
    if (!("answer" in joined) || joined.answer?.answer !== "accepted") return;
    expect(sent).toHaveLength(1);
    const receipt = joined.answer.receipt;
    const history = await life.wait(() => membership.sealed());
    const last = history.find(row => row.entry.seq === receipt.fact.seq)!;
    expect(last.hash).toBe(receipt.fact.hash);
    expect(last.entry.input.type).toBe("act");
    if (last.entry.input.type === "act") {
      expect(last.entry.input.signed.intent.fields).toEqual({ invitation, proof: expect.any(String) });
      expect(last.entry.input.signed.intent.actor).toBe(signer.key);
    }
    expect(canonicalize(history)).not.toContain(secret);
    expect((await life.wait(() => membership.item(invitation))).state).toBe("active");
  } finally {
    const life = ownedLife, membership = ownedMembership;
    if (life) {
      if (!membership) throw new Error("Invitation setup incomplete; native fixture ownership retained.");
      // Seat and join create real Inboxes outside sessionRoom's initial five
      // handles. Discover their actual seeds before joining callbacks, while
      // the fixture still owns its settings. A failed join retains ownership.
      const history = await life.wait(() => membership.entries());
      if (history.length > 64) throw new Error("Invitation fixture history exceeded its cleanup bound.");
      const inboxes = new Set(history.flatMap(entry => entry.sends.flatMap(send =>
        isSeed(send.to) && send.to.kind === "inbox" ? [scopeIdOf(send.to)] : [])));
      if (inboxes.size > 2) throw new Error("Invitation fixture exceeded its two Inbox births.");
      const tracked = new Set(life.platforms().map(node => node.name));
      for (const name of inboxes) if (!tracked.has(name)) life.platform(name);
      await drainScheduledFixture(() => life.platforms(), life.wait);
      life.release();
    }
  }
});
