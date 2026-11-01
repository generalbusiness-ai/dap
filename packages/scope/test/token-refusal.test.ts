import { runInDurableObject } from "cloudflare:test";
import { describe, expect, onTestFinished, test } from "vitest";
import type { Intent, KeyId, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, intentDigest, scopeIdOf, seedDigest, signIntent, textDigest } from "@generalbusiness/dap-bytes";
import { invitationIssueFields, invitationRedemptionFields, requestSession, sessionRequest, type Fetch } from "@generalbusiness/dap-client";
import { keys } from "@generalbusiness/dap-derive/testing";
import { DIRECTORY, REGISTER, repositoryName } from "@generalbusiness/dap-platform";
import type { ArtifactsNamespace } from "../src/artifacts-host.ts";
import { artifactsOutside } from "../src/artifacts-wiring.ts";
import type { Outside } from "../src/index.ts";
import { net } from "../src/testing.ts";
import { reader } from "./fixtures-native.ts";
import { soon } from "./net.ts";
import { outsideOf, wired } from "./outside.ts";
import { Platform, rita, routed, sam, settle, una, vic } from "./repository.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { platformOutside } from "./worker.ts";

const { paul } = keys;
const SERVICE = "https://scopes.test";
const NAMESPACE = "artroom-demo";
const HOST = "service.invalid";

/** STAND-IN: the binding of Cloudflare Artifacts, scripted. Each read token has a new plaintext and the lifetime asked. No repository or token exists. */
function binding() {
  const minted: string[] = [];
  const revoked: string[] = [];
  const ns: ArtifactsNamespace = {
    get: async (name) => ({
      createToken: async (scope, ttl) => {
        minted.push(`read-plaintext-${minted.length + 1}`);
        return { id: `tok-${minted.length}`, plaintext: minted.at(-1)!, scope, expiresAt: soon(ttl) };
      },
      revokeToken: async (token) => { revoked.push(token); return true; },
      info: async () => ({ name, remote: `https://${HOST}/git/${NAMESPACE}/${name}.git` }),
    }),
    create: async () => { throw new Error("no creation in this test"); },
    delete: async () => false,
  };
  return { minted, revoked, ns };
}

const onlyMintRead = (port: Outside): Outside => ({ ...port, accepts: (owner, kind) => kind === "mint-read" && port.accepts(owner, kind), send: (request) => (request.kind === "mint-read" ? port.send(request) : Promise.resolve(null)) });

/** A room on Artifacts: a real register, directory, membership and destination, with rita as admin and una as a member. */
async function room(service: ReturnType<typeof binding>) {
  const install: Intent = { v: 1, to: null, actor: paul.key, kind: "install", on: null, expected: {}, fields: { host: "artifacts", namespace: NAMESPACE, policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
  const R = new Platform(scopeIdOf({ v: 1, kind: "register", definition: REGISTER, creator: null, cause: intentDigest(install), ordinal: 0 }));
  const host = outsideOf(R.name);
  wired.set(R.name, () => ({ outside: host }));
  expect((await R.stub.create(signIntent(install, paul.secret), REGISTER)).answer).toBe("accepted");
  const matched = await R.intent(rita, "found", { expected: await R.expected({ register: 0 }), fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } });
  const seed: Seed = { v: 1, kind: "directory", definition: DIRECTORY, creator: await R.at(), cause: intentDigest(matched.intent), ordinal: 0 };
  const D = new Platform(scopeIdOf(seed));
  const name = repositoryName(seedDigest(seed), 1);
  host.answer("1:0", 1, { result: "confirmed", evidence: { basis: "own-answer", body: { name, id: name } } });
  expect((await R.stub.submit(matched, [])).answer).toBe("accepted");
  while ((await (R.stub as unknown as { effect(): Promise<number> }).effect()) > 0) { /* each pass may make the next one due */ }
  await settle(R, D);
  const sent = (await D.entries())[0]!.sends;
  const [M, , G] = [1, 2, 3].map((n) => new Platform(scopeIdOf(sent.find((send) => send.n === n)!.to as Seed))) as [Platform, Platform, Platform];
  await settle(R, D, M, G);
  wired.delete(R.name);

  const seat = await M.did(rita, "seat", { expected: { roster: 1 } });
  await M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) });
  const secret = "the secret of una's invitation, of 32 bytes or more";
  const invitation = await M.did(rita, "invite-member", { fields: { handle: "@una", role: "member", inviteHash: textDigest(secret), inviteEnds: soon(3600) } });
  const unasKey = await M.did(una, "join", { fields: { invitation, secret } });
  await settle(M);

  platformOutside.set(G.name, (given, sql) => onlyMintRead(artifactsOutside(given, sql, { ARTIFACTS_CONFIG: canonicalize({ registerScope: R.name, namespace: NAMESPACE, host: HOST, maxBytes: 1024 * 1024, credentialIdentity: "adapter-attempt" }), ARTIFACTS: service.ns })));
  await G.restart();
  return { M, D, G, unasKey, name };
}

/** Whether the destination's journal holds an applied `compromised` delivery that names this key. */
const noticeOf = async (G: Platform, key: KeyId): Promise<boolean> => (await G.entries()).some(({ input }) => input.type === "delivery" && "decision" in input && input.decision === "applied" && input.message.class === "request" && input.message.type === "tell" && (input.message.body as { message?: string; fields?: { key?: string } }).message === "compromised" && (input.message.body as { fields: { key?: string } }).fields.key === key);

// Invariant: once a `compromised` notice reaches the destination, the key that it names gets no new read token and takes no
// token out of custody. A key that the notice did not name, also of the same member, keeps both. A token already read and
// the time before the notice arrives stay open, and this test holds both as statements of what is not closed.
//
// | Part | Is |
// |---|---|
// | The register, the directory, membership and the destination | Real scopes of the namespace `PLATFORM`: the deployed class, the production authority and the platform package's own data and rules. |
// | The notice | Real: `revoke-key` at membership, its `tell` to the directory, and the directory's `tell` to the destination. |
// | The register's Git host | A STAND-IN: `OutsideDouble` answers the one creation request. |
// | The destination's Git host | The real `artifacts-wiring.ts` port and `ArtifactsProvider`, over a STAND-IN binding that the test scripts. Only `mint-read` is let through to it. |
// | The readers | The real read sessions and routes, under a TEST SECRET. The test's own reads go past them as `reader`. |
// | The clock | The scripted clock of the namespace. No test waits on the wall clock. |
describe("a read token after a compromised notice, on real scopes. The Git hosts are STAND-INs", () => {
  test("after the notice arrives, the named key gets unauthorized at read-token and forbidden at the credential route, also after a restart and for a mint in flight; another key of the same member and another member keep both; before the notice, and for a retired key, both stay open; a token already read is not revoked", async () => {
    const owner = beginSessionFixture({ secret: null, sessions: false, inspector: null });
    onTestFinished(owner.close);
    net.hold = net.deaf = null;
    const service = binding();
    const { M, D, G, unasKey, name } = await room(service);
    const fetch = ((url: string, init?: RequestInit) => routed(url, init)) as unknown as Fetch;
    owner.configure({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader });
    try {
      const membership: ScopeRef = await M.at();
      const unaMember = (await M.item(unasKey)).refs["member"] as number;
      const drive = async () => { while ((await (G.stub as unknown as { effect(): Promise<number> }).effect()) > 0) { /* each pass may make the next one due */ } };
      const sessionOf = async (who: typeof una): Promise<string> => {
        owner.active();
        const answer = await requestSession(SERVICE, membership.scope, sessionRequest(membership, who.secret, soon(60), b64url(crypto.getRandomValues(new Uint8Array(16)))), { fetch });
        if (!answer.ok) throw new Error(`no session: ${answer.reason}`);
        return answer.session.reader();
      };
      const act = async (who: typeof una, hours: number) => { owner.active(); return G.act(who, "read-token", { on: 0, expected: await G.expected({ on: 0 }), fields: { hours } }); };
      const handleOf = async (seq: number): Promise<string> => {
        const outcome = (await G.entries()).find((entry) => entry.input.type === "outcome" && entry.input.operation === `${seq}:0`)!;
        return (outcome.input as unknown as { evidence: { body: { token: string } } }).evidence.body.token;
      };
      const minted = async (who: typeof una, hours: number): Promise<string> => {
        const answer = await act(who, hours);
        expect(answer.answer, JSON.stringify(answer)).toBe("accepted");
        if (answer.answer !== "accepted") throw new Error("unreachable after the assertion");
        await drive();
        return handleOf(answer.receipt.fact.seq);
      };
      const credential = (handle: string, session: string) => owner.required(() => routed(`${SERVICE}/v1/scopes/${G.name}/credential/${encodeURIComponent(handle)}`, { headers: { authorization: session } }));
      const plaintextOf = (handle: string) => runInDurableObject(G.object, (_instance, state: DurableObjectState) => state.storage.sql.exec("SELECT plaintext FROM private_credential WHERE id = ?", handle).toArray()[0]?.["plaintext"]);

      // A second device key of una, which the notice below does not name, and which keeps a session of its own.
      const pin = (await M.summary()).value.definition;
      const invitation = await M.did(rita, "invite-key", { fields: { member: unaMember, kind: "device", ...invitationIssueFields(pin, b64url(new Uint8Array(32).fill(9))), inviteEnds: soon(3600) }, expected: await M.expected({ member: unaMember }) });
      await M.did(vic, "enrol", { on: 0, fields: invitationRedemptionFields(pin, membership, invitation, vic.key, b64url(new Uint8Array(32).fill(9))), expected: await M.expected({ on: 0, member: unaMember }) });
      await settle(M);

      // Before the revocation: the key's session reads one token, one stays unread, and one more act waits for its mint.
      const held = await sessionOf(una);
      const already = await minted(una, 24);
      expect((await credential(already, held)).status).toBe(200);
      const unread = await minted(una, 24);
      const inFlight = await act(una, 24);
      if (inFlight.answer !== "accepted") throw new Error("read-token was not accepted");
      const [ritas, vics] = [await sessionOf(rita), await sessionOf(vic)];

      // The revocation, with the notice held back on its way. Nothing is closed at the destination yet, and that time stays open.
      net.hold = (envelope) => envelope.message.class === "request" && envelope.message.type === "tell" && (envelope.message.body as { message?: string }).message === "compromised";
      await M.did(rita, "revoke-key", { on: unasKey, expected: await M.expected({ on: unasKey, roster: 0, member: unaMember }), fields: { as: "compromised" } });
      await settle(M, D, G);
      expect(await noticeOf(G, una.key)).toBe(false);
      net.clock.now = soon(100);
      const beforeNotice = await minted(una, 24);
      expect((await credential(beforeNotice, held)).status).toBe(200);

      // The notice arrives, through membership and the directory.
      net.hold = null;
      await settle(M, D, G);
      expect(await noticeOf(G, una.key)).toBe(true);
      const mintsAtNotice = service.minted.length;
      // Custody keeps one row, with the key and no secret.
      expect(await runInDurableObject(G.object, (_instance, state: DurableObjectState) => state.storage.sql.exec("SELECT key FROM private_named_key").toArray())).toEqual([{ key: una.key }]);

      // Refusal 1, while the destination still holds an observation of the key that shows it active: `read-token` writes nothing.
      // One second passes because a held observation serves only a reading later than the entry that last used it.
      net.clock.now = soon(1);
      const head = (await G.summary()).at;
      expect(await act(una, 24)).toMatchObject({ answer: "refused", reason: "unauthorized" });
      expect((await G.summary()).at).toEqual(head);
      expect(service.minted.length).toBe(mintsAtNotice);

      // Refusal 2: the session still lives, and it takes neither the token minted before the notice nor the one whose mint lands after it.
      expect((await credential(unread, held)).status).toBe(403);
      await drive();
      const lateHandle = await handleOf(inFlight.receipt.fact.seq);
      expect((await credential(lateHandle, held)).status).toBe(403);
      // A refused read spends nothing: the plaintext stays in custody, for the real expiry to drop.
      expect(await plaintextOf(unread)).toEqual(expect.any(String));

      // Another key of the same member, and another member's key, keep both.
      const vicsToken = await minted(vic, 1);
      const vicsRead = await credential(vicsToken, vics);
      expect(vicsRead.status).toBe(200);
      expect(((await vicsRead.json()) as { value: { remote: string } }).value.remote).toBe(`https://${HOST}/git/${NAMESPACE}/${name}.git`);
      const ritasToken = await minted(rita, 1);
      expect((await credential(ritasToken, ritas)).status).toBe(200);
      // The named key's own token does not reach another key's session, as before.
      expect((await credential(unread, vics)).status).toBe(403);

      // A restart keeps the refusal: the session still lives, and the destination holds no observation in memory.
      await G.restart();
      expect((await credential(unread, held)).status).toBe(403);
      expect(await act(una, 24)).toMatchObject({ answer: "refused", reason: "unauthorized" });

      // What stays open. The token already read stays with its reader, and the host revoked nothing.
      expect(service.revoked).toEqual([]);

      // A key revoked as `retired` gets no notice, so neither refusal applies to it while its session and observation last.
      const retiredSession = await sessionOf(vic);
      await minted(vic, 1);
      await M.did(rita, "revoke-key", { on: invitation, expected: await M.expected({ on: invitation, roster: 0, member: unaMember }), fields: { as: "retired" } });
      await settle(M, D, G);
      expect(await noticeOf(G, vic.key)).toBe(false);
      // One second passes for the same reason as above: the held observation of the key then still serves.
      net.clock.now = soon(1);
      const retiredToken = await minted(vic, 1);
      expect((await credential(retiredToken, retiredSession)).status).toBe(200);
    } finally {
      owner.close();
      platformOutside.delete(G.name);
    }
  });
});
