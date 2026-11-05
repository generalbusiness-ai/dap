/** Real Native births, pending operations, membership and credential custody.
 * Artifacts binding and GitHub HTTP are scripted providers. No live host runs. */
import { expect, test } from "vitest";
import type { Intent, ScopeId, Seed } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, intentDigest, isSeed, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { requestSession, sessionRequest, type Fetch } from "@generalbusiness/dap-client";
import { REGISTER } from "@generalbusiness/dap-platform";
import { type ArtifactsBindings } from "../src/artifacts-wiring.ts";
import type { ArtifactsNamespace } from "../src/artifacts-host.ts";
import { type GitHubBindings } from "../src/github-wiring.ts";
import { outsideOf } from "../src/worker.ts";
import { installedRegisterScopes, hostRegisterScopes } from "../src/installed-registers.ts";
import { reader } from "./fixtures-native.ts";
import { rita, routed, sam } from "./repository.ts";
import { soon } from "./net.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { driveFixture, effectFixture, nativeFixtureLifetime } from "./support/native-fixture-lifetime.ts";

const ACCOUNT = { id: 17, login: "test-host-roots", type: "Organization" } as const;
const HOST = "host-roots.invalid", NAMESPACE = ACCOUNT.login;

for (const host of ["artifacts", "github.com"] as const) {
  test(`${host}: retained root settles its pending creation and mints a readable token after switching; unlisted roots stay pending`, async () => {
    const owner = beginSessionFixture({ secret: null, sessions: false, inspector: null });
    const life = nativeFixtureLifetime(owner, { required: false });
    try {
      const calls = { creates: [] as string[], mints: [] as unknown[] };
      const credentialReads: { answered: boolean; now: string; custody: unknown[] }[] = [];
      let name = "", enabled = false;
      const repository = () => ({ id: 71, name, owner: ACCOUNT, private: true, full_name: `${NAMESPACE}/${name}`,
        html_url: `https://github.com/${NAMESPACE}/${name}`, clone_url: `https://github.com/${NAMESPACE}/${name}.git` });
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
      const fetch = async (request: Request): Promise<Response> => {
        const url = new URL(request.url);
        if (request.method === "POST" && url.pathname === `/orgs/${NAMESPACE}/repos`) {
          expect(request.headers.get("authorization")).toBe("Bearer test_creation");
          name = (await request.json() as { name: string }).name;
          calls.creates.push(name); return json(repository(), 201);
        }
        if (request.method === "POST" && url.pathname === "/app/installations/99/access_tokens") {
          const mint = await request.json(); calls.mints.push(mint);
          expect(mint).toEqual({ repository_ids: [71], permissions: { contents: "read" } });
          return json({ token: "test_read_plaintext", expires_at: soon(3600), repository_selection: "selected",
            permissions: { contents: "read", metadata: "read" }, repositories: [repository()] }, 201);
        }
        throw Error("Unexpected scripted GitHub request");
      };
      const ns: ArtifactsNamespace = {
        create: async requested => { calls.creates.push(requested); name = requested;
          return { name, remote: `https://${HOST}/git/${NAMESPACE}/${name}.git`, token: "test_creation_plaintext" }; },
        get: async requested => ({
          createToken: async (scope, ttl) => { calls.mints.push({ scope, ttl });
            return { id: "test-read", plaintext: "test_read_plaintext", scope, expiresAt: soon(ttl) }; },
          revokeToken: async () => true,
          info: async () => ({ name: requested, remote: `https://${HOST}/git/${NAMESPACE}/${requested}.git` }),
        }),
        delete: async () => true,
      };
      let privateKey = "";
      if (host === "github.com") {
        // Fresh public TEST fixture material, never a configured private App key.
        const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]) as CryptoKeyPair;
        const bytes = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keys.privateKey) as ArrayBuffer);
        privateKey = `-----BEGIN PRIVATE KEY-----\n${btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""))}\n-----END PRIVATE KEY-----\n`;
      }
      const env: ArtifactsBindings & GitHubBindings = {};
      const configure = (current: ScopeId, roots?: readonly ScopeId[]) => {
        env.REGISTER_SCOPE = current;
        if (roots === undefined) delete env.INSTALLED_REGISTER_SCOPES;
        else env.INSTALLED_REGISTER_SCOPES = canonicalize(roots);
        if (host === "artifacts") Object.assign(env, { ARTIFACTS: ns, ARTIFACTS_NAMESPACE: NAMESPACE,
          ARTIFACTS_CONFIG: canonicalize({ registerScope: current, namespace: NAMESPACE, host: HOST, maxBytes: 1048576, credentialIdentity: "adapter-attempt" }) });
        else Object.assign(env, { GITHUB_APP_PRIVATE_KEY: privateKey, GITHUB_CREATION_TOKEN: "test_creation", GITHUB_READ_TOKEN: "test_independent_read",
          GITHUB_APP_CONFIG: canonicalize({ registerScope: current, issuer: "test", installationId: 99, account: ACCOUNT,
            maxBytes: 1048576, privateRepositories: true, publicReads: false, credentialIdentity: "adapter-attempt" }) });
      };
      const install = async () => {
        const intent: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {},
          fields: { host, namespace: NAMESPACE, policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
        const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: REGISTER, creator: null, cause: intentDigest(intent), ordinal: 0 }));
        life.outside(R.name, (given, sql) => {
          const port = outsideOf(given, sql, env, fetch);
          return { ...port, accepts: (owner, kind) => enabled && port.accepts(owner, kind) };
        });
        expect(await life.wait(() => R.stub.create(signIntent(intent, rita.secret), REGISTER))).toMatchObject({ answer: "accepted" });
        return R;
      };
      const old = await install(); configure(old.name);
      const found = await life.wait(() => old.act(rita, "found", { expected: { register: 1 },
        fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } }));
      expect(found.answer).toBe("accepted");
      await effectFixture([old], life.wait);
      expect(calls.creates).toEqual([]);
      const current = await install(), unlisted = await install();
      configure(current.name, [old.name, current.name]); enabled = true;
      // The existing adapter sees the setting change without restarting.
      await effectFixture([old], life.wait);
      expect(calls.creates).toHaveLength(1);
      const entries = await life.wait(() => old.entries());
      expect(entries.some(entry => entry.input.type === "outcome" && entry.input.result === "confirmed")).toBe(true);
      const birth = entries.flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.kind === "directory");
      if (!birth || !isSeed(birth.to)) throw Error("No genuine directory birth");
      const directory = life.platform(scopeIdOf(birth.to));
      await driveFixture([old, directory], life.wait);
      const seeds = (await life.wait(() => directory.entries()))[0]!.sends.map(send => send.to).filter(isSeed) as Seed[];
      const children = seeds.map(seed => life.platform(scopeIdOf(seed)));
      const membership = children[seeds.findIndex(seed => seed.kind === "membership")]!;
      const destination = children[seeds.findIndex(seed => seed.kind === "destination")]!;
      await driveFixture([old, directory, ...children], life.wait);
      const seat = await life.wait(() => membership.did(rita, "seat", { expected: { roster: 1 } }));
      await life.wait(async () => membership.did(rita, "first-key", { fields: { member: seat }, expected: await membership.expected({ roster: 0, member: seat }) }));
      life.outside(destination.name, (given, sql) => {
        const port = outsideOf(given, sql, env, fetch);
        return { ...port, accepts: (owner, kind) => kind === "mint-read" && port.accepts(owner, kind),
          credential: (handle, key) => {
            const custody = sql.exec("SELECT state, ends, plaintext IS NOT NULL AS held FROM private_credential WHERE id = ?", handle).toArray();
            const answer = port.credential?.(handle, key) ?? null;
            credentialReads.push({ answered: answer !== null, now: given.clock.read(), custody });
            return answer;
          } };
      });
      await life.wait(() => destination.restart());
      const accepted = await life.wait(async () => destination.act(rita, "read-token", { on: 0,
        expected: await destination.expected({ on: 0 }), fields: { hours: 1 } }));
      expect(accepted.answer).toBe("accepted");
      await effectFixture([destination], life.wait);
      expect(calls.mints).toEqual([host === "artifacts" ? { scope: "read", ttl: 3600 } : { repository_ids: [71], permissions: { contents: "read" } }]);
      const journal = await life.wait(() => destination.entries());
      const outcome = journal.find(entry => entry.input.type === "outcome" && entry.input.kind === "mint-read");
      if (outcome?.input.type !== "outcome") throw Error("No sealed token outcome");
      const handle = (outcome.input.evidence.body as { token: string }).token;
      expect(canonicalize(journal)).not.toContain("test_read_plaintext");
      owner.configure({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader });
      const at = await life.wait(() => membership.at());
      const transport: Fetch = (url, init) => life.wait(() => routed(url, init));
      const session = await requestSession("https://scopes.test", membership.name,
        sessionRequest(at, rita.secret, soon(60), b64url(crypto.getRandomValues(new Uint8Array(16)))), { fetch: transport });
      if (!session.ok) throw Error(`Session refused: ${session.reason}`);
      const credential = () => life.wait(() => routed(`https://scopes.test/v1/scopes/${destination.name}/credential/${encodeURIComponent(handle)}`,
        { headers: { authorization: session.session.reader() } }));
      // Removing a root closes an already-cached adapter and preserves custody.
      env.INSTALLED_REGISTER_SCOPES = canonicalize([current.name]);
      expect((await credential()).status).toBe(403);
      // The real session reached the adapter, so this refusal tests root policy.
      expect(credentialReads).toHaveLength(1);
      expect(credentialReads[0]!.answered).toBe(false);
      env.INSTALLED_REGISTER_SCOPES = canonicalize([old.name, current.name]);
      const read = await credential();
      expect(read.status, JSON.stringify({ response: read.status === 200 ? "ok" : await read.clone().json(), credentialReads })).toBe(200);
      expect(await read.json()).toMatchObject({ value: { token: "test_read_plaintext" } });
      expect((await credential()).status).toBe(403);
      owner.configure({ secret: null, sessions: false, inspector: null });
      expect((await life.wait(() => unlisted.act(rita, "found", { expected: { register: 1 },
        fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } }))).answer).toBe("accepted");
      await effectFixture([unlisted], life.wait);
      expect(calls.creates).toHaveLength(1);
      expect((await life.wait(() => unlisted.entries())).some(entry => entry.input.type === "outcome")).toBe(false);
    } finally { life.release(); }
  });
}

test("installed root policy rejects malformed, ambiguous, oversized and current-root mismatched lists", () => {
  const root = ("sc_" + "a".repeat(52)) as ScopeId, other = ("sc_" + "b".repeat(51) + "a") as ScopeId;
  expect(installedRegisterScopes(root, undefined)).toEqual([root]);
  expect(hostRegisterScopes(root, { REGISTER_SCOPE: other })).toEqual([root]); // historical no-list behavior
  expect(installedRegisterScopes(root, canonicalize([other, root]))).toEqual([other, root]);
  for (const raw of [null, [], "null", "[]", canonicalize([other]), canonicalize([root, root]), canonicalize([root, "invalid"]), " ".repeat(4097), canonicalize(Array.from({ length: 33 }, (_, n) => "sc_" + "abcdefghijklmnopqrstuvwxyz234567"[Math.floor(n / 32)] + "abcdefghijklmnopqrstuvwxyz234567"[n % 32] + "a".repeat(50)))]) {
    expect(installedRegisterScopes(root, raw)).toBeNull();
  }
  expect(hostRegisterScopes(root, { REGISTER_SCOPE: other, INSTALLED_REGISTER_SCOPES: canonicalize([root, other]) })).toBeNull();
});
