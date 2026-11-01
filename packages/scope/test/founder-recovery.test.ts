/**
 * Invariant: under the separate-recovery cohort, no key is both a member's enrolled key and the room's recovery key.
 * `found` and `first-key` each refuse that key by the name `recovery-key`, as `join` and `enrol` do.
 *
 * Register, directory, membership and the rest are real scopes under the deployed class, with the production authority. STAND-INS: the Git
 * host is `OutsideDouble`, the clock is scripted, and the reads are the test readers. No deployment or creation policy is exercised.
 */
import { expect, test } from "vitest";
import type { Answer, Intent, KeyId, OperationId, PlatformDefinition, Seed, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, intentDigest, scopeIdOf, seedDigest, signIntent } from "@generalbusiness/dap-bytes";
import { ARCHIVE_DEVICE_PUBLICATION_COHORT as OLD, DIRECTORY_OF, SEPARATE_RECOVERY_COHORT as NEW, repositoryName } from "@generalbusiness/dap-platform";
import { invitationIssueFields, invitationRedemptionFields } from "@generalbusiness/dap-client";
import { dispatchFixture, effectFixture, nativeFixtureLifetime } from "./fixtures-native.ts";
import { soon } from "./net.ts";
import { outsideOf } from "./outside.ts";
import { rita, sam, una, vic } from "./repository.ts";
import { beginSessionFixture } from "./session-settings.ts";

type Life = ReturnType<typeof nativeFixtureLifetime>;
const fixture = (): Life => nativeFixtureLifetime(beginSessionFixture({ secret: null, sessions: false, inspector: null }), { required: false });
const refused = (answer: Answer, name: string): void => { expect(answer, JSON.stringify(answer)).toMatchObject({ answer: "refused", reason: "guard-failed", name }); };
const accepted = (answer: Answer): void => { expect(answer.answer, JSON.stringify(answer)).toBe("accepted"); };
const secret = (fill: number): string => b64url(new Uint8Array(32).fill(fill));

/** An installed register under that pin, and a signed `found` by rita that names this recovery key. */
async function foundOn(life: Life, pin: PlatformDefinition, recoveryKey: KeyId) {
  const install: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {}, fields: { host: "git.example", namespace: "founder-recovery", policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
  const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: pin, creator: null, cause: intentDigest(install), ordinal: 0 }));
  const host = outsideOf(R.name); life.wire(R.name, () => ({ outside: host }));
  expect(await life.wait(() => R.stub.create(signIntent(install, rita.secret), pin))).toMatchObject({ answer: "accepted" });
  const found: SignedIntent = await life.wait(() => R.intent(rita, "found", { expected: { register: 1 }, fields: { branch: "main", founderHandle: "@rita", recoveryKey } }));
  return { R, host, found };
}

/** A room created through the real register and directory: the `found` is accepted, and the children are created. Nobody is seated yet. */
async function roomOn(life: Life, pin: PlatformDefinition, recoveryKey: KeyId) {
  const { R, host, found } = await foundOn(life, pin, recoveryKey);
  const seed: Seed = { v: 1, kind: "directory", definition: DIRECTORY_OF[pin]!, creator: await life.wait(() => R.at()), cause: intentDigest(found.intent), ordinal: 0 };
  const D = life.platform(scopeIdOf(seed));
  host.answer("1:0" as OperationId, 1, { result: "confirmed", evidence: { basis: "own-answer", body: { name: repositoryName(seedDigest(seed), 1), id: "founder-recovery-repo" } } });
  accepted(await life.wait(() => R.stub.submit(found, [])));
  await effectFixture([R], life.wait); await dispatchFixture([R, D], life.wait);
  const sends = (await life.wait(() => D.entries()))[0]!.sends;
  const M = life.platform(scopeIdOf(sends.find(send => send.n === 1)!.to as Seed));
  await dispatchFixture([R, D, M], life.wait);
  const seat = await life.wait(async () => M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) }));
  return { R, D, M, seat };
}
type Room = Awaited<ReturnType<typeof roomOn>>;
const firstKey = ({ M, seat }: Room, life: Life): Promise<Answer> => life.wait(async () => M.act(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
const rotate = ({ M }: Room, life: Life, who: typeof sam, key: KeyId): Promise<Answer> => life.wait(async () => M.act(who, "rotate-recovery", { on: 0, expected: await M.expected({ on: 0 }), fields: { key } }));
const inviteMember = ({ M }: Room, life: Life, who: typeof sam, handle: string, pin: string, invite: string): Promise<Answer> =>
  life.wait(async () => M.act(who, "invite-member", { fields: { handle, role: "admin", ...invitationIssueFields(pin, invite), inviteEnds: soon(3600) } }));
/** A second device key of the seated member, invited by `who` and enrolled by `key`. */
async function enrol({ M, seat }: Room, life: Life, who: typeof sam, key: typeof una, pin: string): Promise<Answer> {
  const invitation = await life.wait(async () => M.did(who, "invite-key", { fields: { member: seat, kind: "device", ...invitationIssueFields(pin, secret(9)), inviteEnds: soon(3600) }, expected: await M.expected({ member: seat }) }));
  return life.wait(async () => M.act(key, "enrol", { on: 0, fields: invitationRedemptionFields(pin, await M.at(), invitation, key.key, secret(9)), expected: await M.expected({ on: 0, member: seat }) }));
}
const activeKey = async ({ M }: Room, life: Life, key: KeyId): Promise<boolean> => (await life.wait(() => M.summary())).value.items.some(item => item.type === "key" && item.state === "active" && item.values["id"] === key);

test("found under the separate-recovery register refuses a recovery key that is its signing key, by the name recovery-key, and records nothing", async () => {
  const life = fixture();
  try {
    const { R, found } = await foundOn(life, NEW.register, rita.key);
    const before = (await life.wait(() => R.entries())).length;
    refused(await life.wait(() => R.stub.submit(found, [])), "recovery-key");
    expect((await life.wait(() => R.entries())).length).toBe(before);
    expect((await life.wait(() => R.summary())).value.items.filter(item => item.type === "claim")).toEqual([]);
  } finally { life.release(); }
});

test("creation with separate keys makes a room on the new pins: the founder key is enrolled, the recovery key acts, and neither takes the other's place", async () => {
  const life = fixture();
  try {
    const room = await roomOn(life, NEW.register, sam.key);
    expect((await life.wait(() => room.D.summary())).value.definition).toBe(NEW.directory);
    expect((await life.wait(() => room.M.summary())).value.definition).toBe(NEW.membership);
    accepted(await firstKey(room, life));
    expect(await activeKey(room, life, rita.key)).toBe(true);
    accepted(await inviteMember(room, life, sam, "@guest", NEW.membership, secret(5)));
    refused(await rotate(room, life, sam, rita.key), "key-in-use");
    accepted(await enrol(room, life, rita, una, NEW.membership));
    accepted(await rotate(room, life, sam, vic.key));
    accepted(await inviteMember(room, life, vic, "@second", NEW.membership, secret(6)));
    expect(await life.wait(() => room.M.act(sam, "invite-member", { fields: { handle: "@third", role: "member", ...invitationIssueFields(NEW.membership, secret(7)), inviteEnds: soon(3600) } }))).toMatchObject({ answer: "refused", reason: "unauthorized" });
  } finally { life.release(); }
});

test("first-key refuses a founding key that the recovery key rotated to, by the name recovery-key; the key holds recovery alone, and the seated member can enrol another key", async () => {
  const life = fixture();
  try {
    const room = await roomOn(life, NEW.register, sam.key);
    // Between seat and first-key no key item holds the founding key, so key-in-use does not apply. This is the real route to this refusal.
    accepted(await rotate(room, life, sam, rita.key));
    refused(await firstKey(room, life), "recovery-key");
    expect(await activeKey(room, life, rita.key)).toBe(false);
    // The room is not stuck. The recovery key invites a separate key for the seated member, and that key enrols.
    accepted(await enrol(room, life, rita, una, NEW.membership));
    expect(await activeKey(room, life, una.key)).toBe(true);
  } finally { life.release(); }
});

test("a room already on the old pins keeps its shape: found and first-key with one key stay accepted, and the key keeps signing as recovery after its revocation", async () => {
  const life = fixture();
  try {
    const room = await roomOn(life, OLD.register, rita.key);
    expect((await life.wait(() => room.M.summary())).value.definition).toBe(OLD.membership);
    const answer = await firstKey(room, life);
    accepted(answer);
    if (answer.answer !== "accepted") return expect.fail("first-key was accepted above");
    const key = answer.receipt.fact.seq;
    accepted(await enrol(room, life, rita, una, OLD.membership));
    await life.wait(async () => room.M.did(una, "revoke-key", { on: key, expected: await room.M.expected({ on: key, roster: 0, member: room.seat }), fields: { as: "compromised" } }));
    expect(await activeKey(room, life, rita.key)).toBe(false);
    accepted(await inviteMember(room, life, rita, "@guest", OLD.membership, secret(5)));
    // Only a rotation ends it. That is the documented way out for a room in this shape.
    accepted(await rotate(room, life, rita, vic.key));
    expect(await life.wait(() => room.M.act(rita, "invite-member", { fields: { handle: "@third", role: "member", ...invitationIssueFields(OLD.membership, secret(7)), inviteEnds: soon(3600) } }))).toMatchObject({ answer: "refused", reason: "unauthorized" });
  } finally { life.release(); }
});
