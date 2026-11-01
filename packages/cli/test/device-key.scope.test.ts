/**
 * `dap invite --device` and `dap join` with its `artroom-device-key:` link (request c74280a4). A person with a room on one device
 * makes a link, and a new key of the same member works in a second config directory.
 *
 * The commands run over the Worker's real routes on real scopes of the namespace PLATFORM, with the real read sessions under a
 * TEST SECRET. The Git host and the scheduler are STAND-INs, as in agent-key.scope.test.ts. A memoryStore stands for each device's
 * config directory, and a scripted loss stands for a lost reply. A real wrangler and `dap` process run in the note's scene.
 */
import { describe, expect, test } from "vitest";
import type { Digest, Item, OperationId, Seed } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, keyIdOfSecret, scopeIdOf, unb64url, utf8 } from "@generalbusiness/dap-bytes";
import { DEVICE_KEY_LINK, deviceKeyInvitationOf, secretSigner, type Fetch } from "@generalbusiness/dap-client";
import { repositoryName } from "@generalbusiness/dap-platform";
import { beginSessionFixture } from "../../scope/test/session-settings.ts";
import { Platform, routed } from "../../scope/test/repository.ts";
import { outsideOf } from "../../scope/test/outside.ts";
import { dispatchFixture, effectFixture, nativeFixtureLifetime } from "../../scope/test/support/native-fixture-lifetime.ts";
import { issueDeviceKey, joinRoom, openRoom } from "../../../apps/room/page/src/data.ts";
import { command, memoryStore, type Context, type Outcome } from "../src/index.ts";

const SERVICE = "https://scopes.test";
const reader = "a test reader";

function fixture(lifetime: ReturnType<typeof nativeFixtureLifetime>) {
  const node = lifetime.platform, watched: Platform[] = [];
  let posted: string[] = [], loseReplyOf: string | null = null;
  const inboxesOf = async (M: Platform): Promise<Platform[]> => (await M.entries()).flatMap(entry => entry.sends.flatMap(send => "creator" in send.to && (send.to as Seed).kind === "inbox" ? [node(scopeIdOf(send.to as Seed))] : []));
  const settle = async (): Promise<void> => { for (const M of watched.filter(scope => scope.name !== registerName)) await dispatchFixture([M, ...(await inboxesOf(M))], lifetime.wait); };
  let registerName = "";
  // STAND-IN for the scheduler: the host's answer that the test writes, and the alarms of what a command waits on.
  const pause = async (waiting: readonly string[]) => {
    lifetime.active();
    const register = node(registerName as never);
    for (const claim of (await register.summary()).value.items.filter((item: Item) => item.type === "claim")) outsideOf(register.name).answer(`${claim.id}:0` as OperationId, 1, { result: "confirmed", evidence: { basis: "own-answer", body: { name: repositoryName(claim.values["seed"] as Digest, 1), id: `repo-${claim.id}` } } });
    await effectFixture([register], lifetime.wait);
    await dispatchFixture([register, ...waiting.filter(scope => scope !== registerName).map(scope => node(scope as never))], lifetime.wait);
  };
  const fetch = (async (url: string, init?: RequestInit) => {
    const acted = new URL(url).pathname.endsWith("/acts") ? (JSON.parse(String(init?.body)) as { signed: { intent: { kind: string } } }).signed.intent.kind : null;
    if (acted) posted.push(acted);
    const response = await lifetime.wait(() => routed(url, init));
    if (acted) await settle();
    if (acted && acted === loseReplyOf) { loseReplyOf = null; await response.body?.cancel(); throw new Error("scripted lost reply"); }
    return response;
  }) as unknown as Fetch;
  const device = (): Context => ({ store: memoryStore(), fetch, now: lifetime.now, pause, trustedCreationService: { service: SERVICE, fetch } });
  const run = (who: Context, ...argv: string[]): Promise<Outcome> => lifetime.wait(() => command(who, argv));
  const ok = async (who: Context, ...argv: string[]): Promise<Outcome> => { const done = await run(who, ...argv); expect(done.code, done.lines.join("\n")).toBe(0); return done; };
  const room = async (founder: Context, handle: string) => {
    await ok(founder, "install", SERVICE, "--host", "github.com", "--namespace", "devices", "--cohort", "archive-device-application");
    const R = node((await founder.store.config())!.register!.scope);
    registerName = R.name;
    lifetime.wire(R.name, () => {
      const host = outsideOf(R.name);
      return { outside: { accepts: () => { lifetime.active(); return host.accepts(); }, send: request => lifetime.wait(() => host.send(request)), late: deliver => { lifetime.active(); host.late(deliver); } } };
    });
    await R.restart();
    await ok(founder, "create", "device room", "--handle", handle);
    lifetime.unWire(R.name);
    const repository = (await founder.store.config())!.repository!;
    const M = node(repository.membership.scope);
    watched.push(M);
    return { repository, M };
  };
  return { device, run, ok, room, fetch, now: lifetime.now, wait: lifetime.wait, posted: () => posted, clearPosted: () => { posted = []; }, loseReplyOf: (kind: string) => { loseReplyOf = kind; } };
}
const linkIn = (done: Outcome, prefix: string): string => done.lines.flatMap(line => { const at = line.indexOf(prefix); return at < 0 ? [] : [line.slice(at)]; })[0]!;
const keysOf = async (M: Platform, member: number): Promise<Item[]> => (await M.summary()).value.items.filter((item: Item) => item.type === "key" && item.refs["member"] === member);
const memberOf = async (M: Platform, handle: string): Promise<Item> => (await M.summary()).value.items.find((item: Item) => item.type === "member" && item.values["handle"] === handle)!;
const relabel = (link: string, change: Record<string, unknown>): string => DEVICE_KEY_LINK + b64url(utf8(canonicalize({ ...JSON.parse(new TextDecoder().decode(unb64url(link.slice(DEVICE_KEY_LINK.length))!)), ...change })));

describe("a second device of one member, by dap invite --device and dap join", () => {
  const scene = async (work: (given: ReturnType<typeof fixture>) => Promise<void>) => {
    const lifetime = nativeFixtureLifetime(beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader }));
    try { await work(fixture(lifetime)); } finally { lifetime.release(); }
  };

  test("a founder on the command line makes a device link, and the second config directory acts as the same member under its own key", () => scene(async ({ device, run, ok, room }) => {
    const first = device(), second = device();
    const { repository, M } = await room(first, "@rita");
    const firstKey = keyIdOfSecret((await first.store.secret((await first.store.config())!.key))!);
    const made = await ok(first, "invite", "@rita", "--device");
    const link = linkIn(made, DEVICE_KEY_LINK), parsed = deviceKeyInvitationOf(link)!;
    expect(parsed).toMatchObject({ kind: "device-key", service: SERVICE, handle: "@rita", definition: (await M.summary()).value.definition });

    const joined = await ok(second, "join", link);
    const config = (await second.store.config())!;
    const secondKey = keyIdOfSecret((await second.store.secret(config.key))!);
    expect(secondKey).not.toBe(firstKey);
    expect(joined.lines.join("\n")).toContain(secondKey);
    // The room's references and the inbox are the first device's, read and verified here, and the pending enrolment has gone.
    expect([config.service, config.repository, config.handle, config.join]).toEqual([SERVICE, repository, "@rita", undefined]);
    const member = await memberOf(M, "@rita");
    expect((await keysOf(M, member.id)).filter(key => key.state === "active").map(key => [key.values["id"], key.values["kind"]]).sort()).toEqual([[firstKey, "device"], [secondKey, "device"]].sort());
    // No output, public configuration or journal entry holds the invitation's private credential.
    for (const text of [joined.lines.join("\n"), JSON.stringify(config), JSON.stringify(await M.entries())]) expect(text).not.toContain(parsed.secret);

    // The commands work there: reads, the member's own inbox and an act under the second key.
    expect((await ok(second, "acts", "membership")).lines[0]).toContain("@rita (admin)");
    await ok(second, "log", "inbox");
    await ok(second, "status");
    const invited = await ok(second, "invite", "@una", "--role", "member", "--keep");
    expect((await M.entries()).at(-1)!.input).toMatchObject({ type: "act", signed: { intent: { kind: "invite-member", actor: secondKey } } });
    expect(linkIn(invited, "artroom-invite:")).toBeTruthy();

    // The same link again changes nothing, and a device link never lands in a config directory that holds a room.
    const before = (await M.summary()).at;
    expect(await run(second, "join", link)).toMatchObject({ code: 2, lines: [`This config directory has a repository already: directory ${repository.directory.scope}.`] });
    expect((await M.summary()).at).toEqual(before);
    const withRole = await run(first, "invite", "@rita", "--device", "--role", "admin");
    expect([withRole.code, withRole.lines[0]]).toEqual([2, "invite --device takes a member's handle and --hours only: a device key keeps the member's role."]);
  }), 60_000);

  test("a joined member gets a device link from an admin, and the new key finds the inbox that the member's join created; the member's own role cannot sign the invitation", () => scene(async ({ device, run, ok, room, posted, clearPosted }) => {
    const admin = device(), una = device(), unaSecond = device();
    const { M } = await room(admin, "@rita");
    await ok(una, "join", linkIn(await ok(admin, "invite", "@una", "--role", "member"), "artroom-invite:"));
    const unaConfig = (await una.store.config())!;
    clearPosted();
    const refused = await run(una, "invite", "@una", "--device");
    expect([refused.code, refused.lines[0]]).toEqual([1, "Your role member does not hold membership.invite, so nothing was signed. Ask an admin of this room to run: dap invite @una --device."]);
    expect(await run(admin, "invite", "@nobody", "--device")).toMatchObject({ code: 1, lines: ["@nobody is no active member of this room. Nothing was signed."] });
    expect(posted()).toEqual([]);

    await ok(unaSecond, "join", linkIn(await ok(admin, "invite", "@una", "--device"), DEVICE_KEY_LINK));
    const config = (await unaSecond.store.config())!;
    expect(config.repository).toEqual(unaConfig.repository);
    expect(config.handle).toBe("@una");
    expect((await keysOf(M, (await memberOf(M, "@una")).id)).filter(key => key.state === "active")).toHaveLength(2);
    expect((await ok(unaSecond, "acts", "membership")).lines[0]).toContain("@una (member)");
  }), 60_000);

  test("a link that the page makes joins on the command line, and a link that the command line makes joins on the page: the page's own data functions, with no browser", () => scene(async ({ device, ok, room, fetch, now, wait }) => {
    const first = device(), second = device();
    const { repository, M } = await room(first, "@rita");
    const secret = (await first.store.secret((await first.store.config())!.key))!;
    const page = await wait(() => openRoom({ service: SERVICE, signer: secretSigner(secret), fetch, now }, { directory: repository.directory.scope, membership: repository.membership }));
    const issued = await wait(() => issueDeviceKey(page, "@rita"));
    if (!("link" in issued)) return expect.fail(issued.refused);
    await ok(second, "join", issued.link);
    expect((await second.store.config())!.repository).toEqual(repository);
    const browser = crypto.getRandomValues(new Uint8Array(32));
    const madeHere = linkIn(await ok(first, "invite", "@rita", "--device"), DEVICE_KEY_LINK);
    const joined = await wait(() => joinRoom({ service: SERVICE, signer: secretSigner(browser), fetch, now }, madeHere));
    expect(joined.answer.answer).toBe("accepted");
    expect((await keysOf(M, (await memberOf(M, "@rita")).id)).filter(key => key.state === "active")).toHaveLength(3);
  }), 60_000);

  test("a lost reply keeps the exact enrolment: --check settles it and sends nothing, and a person link cannot replace it", () => scene(async ({ device, run, ok, room, posted, clearPosted, loseReplyOf }) => {
    const first = device(), second = device();
    const { M } = await room(first, "@rita");
    const link = linkIn(await ok(first, "invite", "@rita", "--device"), DEVICE_KEY_LINK);
    clearPosted();
    loseReplyOf("enrol");
    expect((await run(second, "join", link)).code).toBe(1);
    const pending = (await second.store.config())!;
    expect([pending.join?.kind, pending.repository, posted()]).toEqual(["device-enrol", undefined, ["enrol"]]);
    expect(JSON.stringify(pending)).not.toContain(deviceKeyInvitationOf(link)!.secret);
    const person = linkIn(await ok(first, "invite", "@una", "--role", "member"), "artroom-invite:");
    expect(await run(second, "join", person)).toMatchObject({ code: 1, lines: ["An original device enrollment is retained; a person invitation cannot replace it."] });
    clearPosted();
    await ok(second, "join", link, "--check");
    expect(posted()).toEqual([]);
    expect((await second.store.config())!.join).toBeUndefined();
    expect((await keysOf(M, (await memberOf(M, "@rita")).id)).filter(key => key.state === "active")).toHaveLength(2);
  }), 60_000);

  test("a link older than the roster is refused and retained, another enrolment leaves a link valid, and a link that names another member gives no usable connection", () => scene(async ({ device, run, ok, room, posted, clearPosted }) => {
    const first = device(), second = device(), third = device(), fourth = device();
    const { M } = await room(first, "@rita");
    const older = linkIn(await ok(first, "invite", "@rita", "--device"), DEVICE_KEY_LINK);
    const other = linkIn(await ok(first, "invite", "@rita", "--device"), DEVICE_KEY_LINK);
    await ok(second, "join", other);
    const active = async () => (await keysOf(M, (await memberOf(M, "@rita")).id)).filter(key => key.state === "active").length;
    expect(await active()).toBe(2);

    // A change of a role's actions moves the roster's revision, which the older link holds as its expected revision.
    const roster = (await M.summary()).value.items.find((item: Item) => item.type === "roster")!;
    await ok(first, "act", "set-actions", "--on", "membership", "--target", String(roster.id), "--set", "role=member", "--set", `actions=${JSON.stringify(roster.values["memberActions"])}`);
    const stale = await run(third, "join", older);
    expect(stale.code).toBe(1);
    expect(stale.lines[0]).toMatch(/^Device enrollment refused: revision-moved\. The exact original remains retained\. Make a new device link, and run dap join with it in an empty config directory\.$/);
    const refused = (await third.store.config())!;
    expect([refused.repository, refused.join?.refused?.answer]).toEqual([undefined, "refused"]);
    clearPosted();
    expect((await run(third, "join", older)).lines[0]).toMatch(/^The original device enrollment was refused: /);
    expect(posted()).toEqual([]);
    expect(await active()).toBe(2);

    // Another member's join moves neither revision. The room accepts this invitation's key for @rita, and the receiver reads that
    // the member is not the one the link names.
    const fresh = linkIn(await ok(first, "invite", "@rita", "--device"), DEVICE_KEY_LINK);
    await ok(device(), "join", linkIn(await ok(first, "invite", "@wes", "--role", "member"), "artroom-invite:"));
    const relabelled = await run(fourth, "join", relabel(fresh, { handle: "@wes" }));
    expect([relabelled.code, relabelled.lines[0]]).toEqual([1, "The original device enrollment is unavailable or unverified. Nothing was replaced. If an answer was lost, run the same command with --check."]);
    const unusable = (await fourth.store.config())!;
    expect([unusable.repository, unusable.handle, unusable.join?.accepted !== undefined]).toEqual([undefined, undefined, true]);
  }), 60_000);
});
