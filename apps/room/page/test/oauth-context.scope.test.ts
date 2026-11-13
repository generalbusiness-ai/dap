/** Native unpublished room, selected-room reads and retained OAuth consent.
 * WebCrypto is real and nonextractable. Its record store, browser settings,
 * lock, clock and dispatcher are TEST stand-ins, not IndexedDB proof. */
import { expect, test } from "vitest";
import { b64url, canonicalize, digestBytes, factRefOf, isScopeId, isSeed, scopeIdOf, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { env, runInDurableObject } from "cloudflare:test";
import { OWN_AGENT_COHORT } from "@generalbusiness/dap-platform";
import { encodeAgentKeyInvitation, invitationIssueFields } from "@generalbusiness/dap-client";
import { joinInvitation } from "../src/join-custody.ts";
import { selectedOAuthRoom, oauthControl, postOAuthControl, loadOAuthAuthorization } from "../src/oauth-context.ts";
import { consentOAuth, preparedOAuthInvitation } from "../src/oauth-custody.ts";
import { memoryPageKeys } from "./private-key-fixture.ts";
import { sessionRoom } from "../../../../packages/scope/test/support/session-room.ts";
import { drainScheduledFixture, driveFixture, type nativeFixtureLifetime } from "../../../../packages/scope/test/support/native-fixture-lifetime.ts";
import { rita, routed, type Platform } from "../../../../packages/scope/test/repository.ts";
import { hostedRegistries, hostedTest } from "../../../../packages/scope/test/worker.ts";
import worker from "../../worker.ts";

test("consent retains lost grants and reuses each controller's Native agent in the selected unpublished room", async () => {
  let ownedLife: ReturnType<typeof nativeFixtureLifetime> | undefined, ownedMembership: Platform | undefined;
  try {
    const room = await sessionRoom(OWN_AGENT_COHORT.register, undefined, { host: "none", namespace: "" }, { finish: "external", capture: life => { ownedLife = life; } });
    const { life } = room, M = room.children[0]!; ownedMembership = M;
    const track = (name: string) => {
      if (!isScopeId(name) || life.platforms().some(node => node.name === name)) return;
      if (life.platforms().length >= 16) throw Error("OAuth context fixture exceeded its scope bound");
      life.platform(name);
    };
    life.setHold(envelope => { if (isSeed(envelope.to)) track(scopeIdOf(envelope.to)); return false; });
    const pause = async (waiting: readonly string[] = []) => { for (const name of waiting) track(name); await driveFixture(life.platforms(), life.wait); };
    hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
    hostedTest.now = life.now; hostedTest.pause = pause;
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const invitation = await life.wait(() => M.did(rita, "invite-member", { fields: { handle: "@consent", role: "member", ...invitationIssueFields(OWN_AGENT_COHORT.membership, secret), inviteEnds: timeOf(life.now() + 3_600_000) } }));
    const origin = "https://consent.test", keys = memoryPageKeys(), signer = await keys.create(), values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const destination = await life.wait(() => room.children[2]!.at());
    const link = "artroom-invite:" + b64url(utf8(canonicalize({ v: 1, service: origin, repository: { directory: room.directory, membership: room.membership, rules: room.rules.scope, destination: destination.scope }, invitation, secret, handle: "@consent", definition: OWN_AGENT_COHORT.membership })));
    const joined = await life.wait(() => joinInvitation(origin, link, storage, { keys: { ...keys, create: async () => signer }, now: life.now, lock: { run: run => run() }, fetch: routed }));
    expect(joined).toMatchObject({ status: "verified", answer: { answer: "accepted" } });
    values.set("dap-page-settings-2", canonicalize({ publicKey: signer.key, place: { directory: room.directory.scope, membership: room.membership }, service: "https://obsolete.invalid" }));
    const requests: string[] = [], grantBodies: string[] = []; let loseGrant = true;
    const fetch = async (url: string, init?: Parameters<typeof routed>[1]) => {
      requests.push(url); const path = new URL(url).pathname;
      if (path.startsWith("/mcp/") || path.startsWith("/oauth/")) {
        const response = await worker.fetch(new Request(url, init), { ...env, REGISTRIES: hostedRegistries(env.REGISTRIES), SCOPES: env.PLATFORM, SCOPE_INDEX_MODE: "register", MCP_ENABLED: "true", OAUTH_DYNAMIC_REGISTRATION: "on" });
        if (path === "/mcp/agents/grant") {
          grantBodies.push(String(init?.body));
          if (loseGrant && response.status === 201) { loseGrant = false; await response.body?.cancel(); throw Error("TEST lost the completed first-grant reply"); }
        }
        return response;
      }
      const response = await routed(url, init);
      if (init?.method === "POST" && path.endsWith("/acts")) await pause();
      return response;
    };
    const contextOptions = { keys, now: life.now, fetch };
    const selection = await life.wait(() => selectedOAuthRoom(origin, storage, contextOptions));
    expect(selection.room).toMatchObject({ publication: "unpublished", membership: room.membership, key: signer.key, me: { handle: "@consent" } });
    expect(requests.length).toBeGreaterThan(0); expect(requests.every(url => new URL(url).origin === origin)).toBe(true);
    expect(selection.controller).toEqual({ membership: room.membership, member: "@consent" });
    const signed = await oauthControl(selection, "connections", null, '{"after":null}', crypto.randomUUID());
    expect(signed.request.actor).toBe(signer.key);
    const registered = await life.wait(() => fetch(origin + "/oauth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "TEST browser host", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] }) }));
    expect(registered.status).toBe(201); const client = await registered.json() as { client_id: string };
    const query = new URLSearchParams({ response_type: "code", client_id: client.client_id, redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", code_challenge_method: "S256", resource: origin + "/mcp", state: "TEST browser state" });
    const authorization = await life.wait(() => loadOAuthAuthorization(origin, query, fetch));
    const options = { locks: { request: <T>(_name: string, work: () => Promise<T>) => work() }, pause, handle: "@consent-agent" };
    const first = await life.wait(() => consentOAuth(selection, authorization, storage, { ...options, mode: "new" }));
    expect(first.state).toBe("unknown"); expect(grantBodies).toHaveLength(1);
    const restored = await life.wait(() => selectedOAuthRoom(origin, storage, contextOptions));
    await expect(life.wait(() => consentOAuth(restored, authorization, storage, { ...options, mode: "new" }))).rejects.toThrow("original connection is unfinished");
    const checked = await life.wait(() => consentOAuth(restored, authorization, storage, { ...options, mode: "check" }));
    expect(checked.state).toBe("unknown"); expect(grantBodies).toHaveLength(1);
    const continued = await life.wait(() => consentOAuth(restored, authorization, storage, { ...options, mode: "continue" }));
    expect(continued.state).toBe("done"); expect(continued.redirect).toBeUndefined();
    expect(grantBodies).toHaveLength(2); expect(grantBodies[1]).toBe(grantBodies[0]);
    const fresh = await life.wait(() => consentOAuth(restored, authorization, storage, { ...options, mode: "new" }));
    expect(fresh.state).toBe("done"); expect(fresh.redirect).toBeTypeOf("string");
    const callback = new URL(fresh.redirect!);
    expect(callback.searchParams.get("state")).toBe("TEST browser state"); expect(callback.searchParams.get("iss")).toBe(origin);
    const code = callback.searchParams.get("code")!; expect(code).toMatch(/^[0-9a-f]{64}\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/);
    expect([...values.values()].join("\n")).not.toContain(code);

    // The actual enrolled Agent mints once, then its final caller-side
    // Native role read waits while the original code is really redeemed.
    if (!fresh.agent) throw Error("The accepted consent must name its actual Agent");
    const relayAgent = fresh.agent, relayOp = crypto.randomUUID(), relayBody = canonicalize(authorization.binding);
    const relaySigned = await oauthControl(selection, "grant", relayAgent, relayBody, relayOp);
    const randomCandidates: string[] = [];
    hostedTest.issuerRandom = bytes => {
      if (randomCandidates.length >= 4) throw Error("The armed issuer random observation exceeded four candidates");
      randomCandidates.push(b64url(bytes));
    };
    let reachedFinal!: () => void, releaseFinal!: () => void;
    const atFinal = new Promise<void>(resolve => { reachedFinal = resolve; });
    const finalHold = new Promise<void>(resolve => { releaseFinal = resolve; });
    // Existing registered-client grant: initial authority, retention authority,
    // Issuer pre-read, Issuer disclosure read, then caller's final authority.
    hostedTest.roleReply = { agent: "@consent-agent", at: 5, calls: 0, entered: reachedFinal, waiting: finalHold };
    try {
      const pendingRelay = life.wait(() => postOAuthControl(selection, `/mcp/agents/${relayAgent}/grant`, relayBody, relaySigned));
      await atFinal;
      expect(hostedTest.roleReply.calls).toBe(5);
      const issuer = await runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(relayAgent)), (_instance, state) =>
        state.storage.sql.exec(`SELECT id, row, state FROM oauth_issuer WHERE op = ?`, relayOp).toArray());
      expect(issuer).toHaveLength(1);
      const id = String(issuer[0]!["id"]), details = JSON.parse(String(issuer[0]!["row"])) as { codeDigest: string; codeUsed: boolean };
      expect(details.codeUsed).toBe(false);
      const matching = randomCandidates.filter(candidate => digestBytes(utf8(candidate)) === details.codeDigest);
      expect(matching.length).toBe(1);
      const originalCode = `${relayAgent}.${id}.${matching[0]!}`;
      hostedTest.issuerRandom = null;
      // The held outer reply already owns finalHold. The token exchange must
      // read actual Native roles normally rather than wait on that same gate.
      hostedTest.roleReply = null;
      const tokenResponse = await life.wait(() => fetch(origin + "/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code: originalCode, client_id: client.client_id,
          redirect_uri: authorization.binding.redirect_uri, code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk", resource: authorization.binding.resource }).toString() }));
      expect(tokenResponse.status).toBe(200);
      const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string };
      expect(typeof tokens.access_token).toBe("string"); expect(typeof tokens.refresh_token).toBe("string");
      const consumed = await runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(relayAgent)), (_instance, state) => ({
        issuer: state.storage.sql.exec(`SELECT row, state FROM oauth_issuer WHERE id = ?`, id).toArray(),
        grant: state.storage.sql.exec(`SELECT row, state FROM oauth_grant WHERE id = ?`, id).toArray(),
      }));
      expect(JSON.parse(String(consumed.issuer[0]!["row"]))).toMatchObject({ codeUsed: true });
      expect(consumed.grant[0]!["state"]).toBe("active");
      releaseFinal();
      const withheld = await pendingRelay;
      expect([withheld.status, withheld.body["error"], withheld.body["rule"], withheld.body["grant"], withheld.body["codeShown"]]).toEqual([409, "op", "stale", id, true]);
      expect(Object.hasOwn(withheld.body, "code")).toBe(false);
      const historical = await life.wait(() => postOAuthControl(selection, `/mcp/agents/${relayAgent}/grant`, relayBody, relaySigned));
      expect([historical.body["grant"], historical.body["codeShown"]]).toEqual([id, true]);
      expect(Object.hasOwn(historical.body, "code")).toBe(false);
      expect(await runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(relayAgent)), (_instance, state) => ({
        issuer: state.storage.sql.exec(`SELECT row, state FROM oauth_issuer WHERE id = ?`, id).toArray(),
        grant: state.storage.sql.exec(`SELECT row, state FROM oauth_grant WHERE id = ?`, id).toArray(),
      }))).toEqual(consumed);
      expect([...values.values()].some(value => value.includes(originalCode))).toBe(false);
      expect([...values.values()].some(value => value.includes(tokens.access_token!))).toBe(false);
      expect([...values.values()].some(value => value.includes(tokens.refresh_token!))).toBe(false);
    } finally { releaseFinal(); hostedTest.roleReply = null; hostedTest.issuerRandom = null; randomCandidates.length = 0; }

    const history = await life.wait(() => M.entries());
    expect(history.filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "enrol")).toHaveLength(1);
    expect(history.filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "add-own-agent")).toHaveLength(1);

    // A second browser key joins as an admin. Workerd's key metadata differs
    // from browsers, so this witness uses the real generated-key path too.
    const adminValues = new Map<string, string>(), adminStorage = { getItem: (key: string) => adminValues.get(key) ?? null, setItem: (key: string, value: string) => { adminValues.set(key, value); } };
    const adminSigner = await keys.create(), adminSecret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const adminInvitation = await life.wait(() => M.did(rita, "invite-member", { fields: { handle: "@consent-admin", role: "admin", ...invitationIssueFields(OWN_AGENT_COHORT.membership, adminSecret), inviteEnds: timeOf(life.now() + 3_600_000) } }));
    const adminLink = "artroom-invite:" + b64url(utf8(canonicalize({ v: 1, service: origin, repository: { directory: room.directory, membership: room.membership, rules: room.rules.scope, destination: destination.scope }, invitation: adminInvitation, secret: adminSecret, handle: "@consent-admin", definition: OWN_AGENT_COHORT.membership })));
    const adminJoined = await life.wait(() => joinInvitation(origin, adminLink, adminStorage, { keys: { ...keys, create: async () => adminSigner }, now: life.now, lock: { run: run => run() }, fetch }));
    expect(adminJoined).toMatchObject({ status: "verified", answer: { answer: "accepted" } });
    adminValues.set("dap-page-settings-2", canonicalize({ publicKey: adminSigner.key, place: { directory: room.directory.scope, membership: room.membership } }));
    const adminSelection = await life.wait(() => selectedOAuthRoom(origin, adminStorage, contextOptions));
    const preparedMember = await life.wait(() => M.did(rita, "add-member", { fields: { handle: "@admin-connected", kind: "agent", controller: selection.controller } }));
    const preparedSecret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const preparedInvite = await life.wait(async () => M.did(rita, "invite-key", { fields: { member: preparedMember, kind: "agent", ...invitationIssueFields(OWN_AGENT_COHORT.membership, preparedSecret), inviteEnds: timeOf(life.now() + 3_600_000) }, expected: await M.expected({ member: preparedMember }) }));
    const preparedHistory = await life.wait(() => M.entries());
    const prepared = { v: 1 as const, kind: "agent-key" as const, service: origin, repository: { directory: room.directory, membership: room.membership, rules: room.rules.scope, destination: destination.scope }, definition: OWN_AGENT_COHORT.membership, handle: "@admin-connected", controller: selection.controller,
      member: factRefOf(preparedHistory.find(entry => entry.seq === preparedMember)!), invitation: factRefOf(preparedHistory.find(entry => entry.seq === preparedInvite)!), secret: preparedSecret,
      expected: { on: (await life.wait(() => M.item(0))).revision, member: (await life.wait(() => M.item(preparedMember))).revision } };
    const preparedLink = encodeAgentKeyInvitation(prepared);
    expect(preparedOAuthInvitation(adminSelection, preparedLink)).toMatchObject({ handle: "@admin-connected", controller: selection.controller });
    expect(() => preparedOAuthInvitation(selection, encodeAgentKeyInvitation({ ...prepared, controller: adminSelection.controller }))).toThrow("another controller");
    const secondRegistration = await life.wait(() => fetch(origin + "/oauth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "TEST admin browser host", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] }) }));
    expect(secondRegistration.status).toBe(201);
    const secondClient = await secondRegistration.json() as { client_id: string };
    const adminQuery = new URLSearchParams(query); adminQuery.set("client_id", secondClient.client_id); adminQuery.set("state", "TEST admin browser state");
    const adminAuthorization = await life.wait(() => loadOAuthAuthorization(origin, adminQuery, fetch));
    loseGrant = true;
    const adminOptions = { ...options, preparedLink };
    const adminUnknown = await life.wait(() => consentOAuth(adminSelection, adminAuthorization, adminStorage, { ...adminOptions, mode: "new" }));
    expect(adminUnknown).toMatchObject({ state: "unknown", handle: "@admin-connected", controller: selection.controller });
    const adminContinued = await life.wait(() => consentOAuth(adminSelection, adminAuthorization, adminStorage, { ...adminOptions, mode: "continue" }));
    expect(adminContinued.state).toBe("done"); expect(adminContinued.redirect).toBeUndefined();
    const adminFresh = await life.wait(() => consentOAuth(adminSelection, adminAuthorization, adminStorage, { ...adminOptions, mode: "new" }));
    expect(adminFresh).toMatchObject({ state: "done", handle: "@admin-connected", controller: selection.controller });
    expect(adminFresh.agent).toBe(adminContinued.agent); expect(adminFresh.redirect).toBeTypeOf("string");
    expect([...adminValues.values()].join("\n")).not.toContain(new URL(adminFresh.redirect!).searchParams.get("code"));
    expect((await life.wait(() => M.entries())).filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "enrol")).toHaveLength(2);
    const before = (await life.wait(() => M.entries())).filter(entry => entry.input.type === "act").length;
    values.set("dap-page-settings-2", canonicalize({ publicKey: signer.key, place: null }));
    await expect(oauthControl(selection, "grant", null, "{}", crypto.randomUUID())).rejects.toThrow("selected room or browser key changed");
    expect((await life.wait(() => M.entries())).filter(entry => entry.input.type === "act").length).toBe(before);
  } finally {
    hostedTest.now = null; hostedTest.clientRegistry = null; hostedTest.pause = null; hostedTest.roleReply = null; hostedTest.issuerRandom = null;
    const life = ownedLife, M = ownedMembership;
    if (life) {
      if (!M) throw Error("OAuth context setup retained Native ownership");
      const entries = await life.wait(() => M.entries());
      if (entries.length > 48) throw Error("OAuth context fixture exceeded its history bound");
      const inboxes = new Set(entries.flatMap(entry => entry.sends.flatMap(send => isSeed(send.to) && send.to.kind === "inbox" ? [scopeIdOf(send.to)] : [])));
      if (inboxes.size > 5) throw Error("OAuth context fixture exceeded its five inbox births");
      const tracked = new Set(life.platforms().map(node => node.name));
      for (const name of inboxes) if (!tracked.has(name)) life.platform(name);
      await drainScheduledFixture(() => life.platforms(), life.wait); life.release();
    }
  }
});
