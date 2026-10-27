/** Real Native creation, application installation, membership session issuance,
 * Rules authority, SQLite, Worker routes, and the command's actual read loop.
 * Git/package replies, the setup reader, clock, finite scheduler, and local
 * config/files are TEST fixtures. No remote provider or deployment runs. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, isSeed, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { invitationIssueFields, invitationRedemptionFields, secretSigner, signedApplicationInstall, type Fetch } from "@generalbusiness/dap-client";
import { TRUSTED_APPLICATION_COHORT as C } from "@generalbusiness/dap-platform";
import { outsideOf as hostOutside } from "../../scope/src/worker.ts";
import { applicationHttpPeer, applicationResolverFixture, applicationWorkerBindings, dispatchFixture, driveFixture, sessionRoom } from "../../scope/test/fixtures-native.ts";
import { soon } from "../../scope/test/net.ts";
import { rita, routed, una } from "../../scope/test/repository.ts";
import { scopeIndexApplicationsCommand } from "../src/scope-index-applications-command.ts";
import type { ApplicationListingError, InstalledApplicationRow } from "../src/scope-index-applications.ts";
import type { IndexFiles } from "../src/scope-index-command.ts";
import type { IndexManifest } from "../src/scope-index-manifest.ts";
import type { Context } from "../src/commands.ts";
import { memoryStore, type Config } from "../src/store.ts";

interface ListingReport {
  applications: InstalledApplicationRow[];
  errors: ApplicationListingError[];
  notApplicable: { scope: ScopeRef; status: "not-applicable" }[];
}

// Invariant: the genuine complete-room manifest needs only its Rules summary.
// An enrolled key that never signed Rules cannot read it through Signed
// authority, but its actual Membership-issued session lists the installed
// release without turning unrelated summary refusals into missing installs.
test("Native installed-release listing uses a real member session and skips non-Rules manifest scopes", async () => {
  const { life, R, D, children, membership, directory } = await sessionRoom(C.register);
  const [M, A, G] = children;
  if (!M || !A || !G) throw Error("The native repository must create all three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, { admin: ["counting.control"], member: ["counting.fulfill"] });
  const peer = applicationHttpPeer(f);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
  life.applicationTrust(() => bindings.APPLICATION_TRUST);
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    const ownerInbox = await life.wait(() => M.created(seat));
    await dispatchFixture([R, D, M, A, G, ownerInbox], life.wait);
    for (const node of [D, A]) {
      life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch));
      await life.wait(() => node.restart());
    }
    const rulesAt = await life.wait(() => A.at());
    const envelope = await life.wait(() => signedApplicationInstall(secretSigner(rita.secret), f.packet.bytes, {
      rules: rulesAt, uri: f.uri, release: f.packet.ids.release, roles: ["admin", "member"], values: { target: 7 },
    }, { now: life.now() }));
    const accepted = await life.wait(() => A.stub.submit(envelope.signed, [], envelope.beside));
    expect(accepted.answer).toBe("accepted");
    if (accepted.answer !== "accepted") throw Error("The native install must be recorded.");
    const job = accepted.receipt.fact.seq;
    await driveFixture([R, D, M, A, G, ownerInbox], life.wait);
    const creation = (await life.wait(() => D.entries())).flatMap(entry => entry.sends)
      .find(send => isSeed(send.to) && send.to.definition === f.packet.package.semantic.entry);
    if (!creation || !isSeed(creation.to)) throw Error("Native Directory must create the installed application.");
    const lane = life.platform(scopeIdOf(creation.to));
    await driveFixture([R, D, M, A, G, ownerInbox, lane], life.wait);
    const laneAt = await life.wait(() => lane.at());
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", refs: { scope: laneAt } });

    // B joins through real Membership and obtains its real Inbox. A alone
    // created the room and installed the package; B signs no Rules entry.
    const invitationSecret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const invitation = await life.wait(() => M.did(rita, "invite-member", { fields: {
      handle: "@listing-observer", role: "member", ...invitationIssueFields(C.membership, invitationSecret), inviteEnds: soon(60),
    } }));
    const joined = await life.wait(() => M.did(una, "join", { fields: invitationRedemptionFields(C.membership, membership, invitation, una.key, invitationSecret) }));
    const inbox = await life.wait(() => M.created(joined));
    await driveFixture([R, D, M, A, G, ownerInbox, lane, inbox], life.wait);
    const inboxAt = await life.wait(() => inbox.at());
    expect((await life.wait(() => A.entries())).some(entry => entry.input.type === "act" && entry.input.signed.intent.actor === una.key)).toBe(false);
    const scopes = await life.wait(() => Promise.all([R, D, M, A, G, ownerInbox, lane, inbox].map(async node => {
      const first = (await node.sealed())[0];
      if (!first || first.entry.input.type !== "genesis" || first.entry.input.decision !== "applied") throw Error("Manifest scopes need their actual applied native genesis.");
      return { at: first.entry.at, genesis: first.hash };
    })));
    expect(new Set(scopes.map(row => row.at.kind))).toEqual(new Set(["register", "directory", "membership", "rules", "destination", "inbox", "lane"]));
    const manifest: IndexManifest = { v: 1, service: "https://scopes.test", root: directory,
      scopes: scopes.sort((left, right) => left.at.scope < right.at.scope ? -1 : left.at.scope > right.at.scope ? 1 : 0) };
    const manifestBytes = utf8(canonicalize(manifest)), manifestPath = "/TEST-listing/manifest.json", outputPath = "/TEST-listing/releases.json";
    const custody = memoryStore(), key = "TEST-listing-observer";
    await custody.keep(key, una.secret);
    const config: Config = { v: 1, service: manifest.service, key, repository: { directory, membership, rules: A.name, destination: G.name, inbox: inbox.name } };
    let withMembership = false, published: Uint8Array | undefined, token: string | undefined;
    const calls: { method: string; scope: string; authority: "session-request" | "Session" | "Signed" }[] = [];
    const fetch: Fetch = async (url, init) => {
      const method = init?.method ?? "GET", path = new URL(url).pathname;
      const sessionRequest = path === `/v1/scopes/${M.name}/sessions`;
      const summaryScope = manifest.scopes.find(({ at }) => path === `/v1/scopes/${at.scope}`)?.at.scope;
      const authorization = init?.headers?.["authorization"] ?? "";
      expect(sessionRequest || summaryScope !== undefined).toBe(true);
      calls.push({ method, scope: sessionRequest ? M.name : summaryScope!,
        authority: sessionRequest ? "session-request" : authorization.startsWith("Session ") ? "Session" : "Signed" });
      // TEST runtime bridge only: Node fetch accepts redirect:error, but
      // Workerd's Request constructor accepts follow/manual. Manual never
      // follows, and the command still rejects redirect status responses.
      // Keep the actual method, body, authorization, and abort signal.
      const { redirect, credentials, ...workerdInit } = init as typeof init & { redirect?: string; credentials?: string };
      expect(redirect).toBe("error"); expect(credentials).toBe("omit");
      const response = await routed(url, { ...workerdInit, redirect: "manual" });
      if (sessionRequest) {
        const issued = await response.clone().json() as { ok: boolean; token?: string; session?: { membership: ScopeRef; key: string; reads: string[] } };
        expect(issued.ok).toBe(true);
        expect(issued.session).toMatchObject({ membership, key: una.key, reads: expect.arrayContaining(["summary"]) });
        token = issued.token;
      }
      // Fetch requires only the real status and body. Preserve the Response
      // where available; an unsupported Workerd redirected accessor supplies
      // no redirect-history claim and does not replace either native value.
      try { void response.redirected; return response; }
      catch { return { status: response.status, body: response.body }; }
    };
    const ctx: Context = { now: life.now, fetch, store: { ...custody, config: async () => withMembership ? config : {
      ...config, repository: { directory, rules: A.name, destination: G.name, inbox: inbox.name },
    } as Config } };
    const files: IndexFiles = {
      read: async path => { expect(path).toBe(manifestPath); return manifestBytes.slice(); },
      save: async (path, bytes) => { expect(path).toBe(outputPath); published = bytes.slice(); },
    };
    const run = () => life.owner.required(() => scopeIndexApplicationsCommand(ctx, ["applications", "--manifest", manifestPath, "--out", outputPath], files));
    const negative = await run();
    expect(negative.code).toBe(1);
    expect(calls).toEqual([{ method: "GET", scope: A.name, authority: "Signed" }]);
    if (!published) throw Error("The Signed refusal must retain its incomplete report.");
    const refused = JSON.parse(new TextDecoder().decode(published)) as ListingReport;
    expect(refused.applications).toEqual([]);
    expect(refused.errors).toEqual([{ scope: rulesAt, why: "forbidden" }]);
    const skipped = manifest.scopes.filter(({ at }) => at.kind !== "rules").map(({ at }) => ({ scope: at, status: "not-applicable" }));
    expect(refused.notApplicable).toEqual(skipped);
    const signedRequestCounts = { sessionRequests: calls.filter(call => call.method === "POST").length, summaryGets: calls.filter(call => call.method === "GET").length };

    withMembership = true; published = undefined; calls.length = 0;
    const positive = await run();
    expect(positive.code).toBe(0);
    expect(calls).toEqual([{ method: "POST", scope: M.name, authority: "session-request" }, { method: "GET", scope: A.name, authority: "Session" }]);
    if (!published) throw Error("The session must produce a complete release report.");
    const output = new TextDecoder().decode(published), admitted = JSON.parse(output) as ListingReport;
    expect(admitted.errors).toEqual([]);
    expect(admitted.notApplicable).toEqual(skipped);
    expect(admitted.applications).toEqual([{ scope: laneAt, installItem: { scope: rulesAt, item: job },
      release: f.packet.ids.release, publisher: f.packet.package.release.manifest.publisher, host: "git.example" }]);
    expect(inboxAt.kind).toBe("inbox");
    expect(typeof token === "string" && token.length > 0).toBe(true);
    expect(token !== undefined && (output + JSON.stringify(positive)).includes(token)).toBe(false);
    expect(output.includes(invitationSecret)).toBe(false);
    expect(output.includes(f.uri)).toBe(false);
    // The skipped Register is genuinely unreadable with this repository
    // session. This separate policy observation is outside the command loop.
    const registerReply = await life.owner.required(() => routed(`${manifest.service}/v1/scopes/${R.name}`, { headers: { authorization: `Session ${token}` } }));
    expect(await registerReply.json()).toEqual({ ok: false, reason: "forbidden" });
    console.info("TEST-native-listing-session-proof-v1", {
      qualification: "Real Native membership/session/Rules reads; TEST Git, clock, scheduler, setup reader and local files.",
      signed: { code: negative.code, ...signedRequestCounts, applications: refused.applications.length, errors: refused.errors.length },
      session: { code: positive.code, sessionRequests: calls.filter(call => call.method === "POST").length, summaryGets: calls.filter(call => call.method === "GET").length,
        applications: admitted.applications.length, errors: admitted.errors.length, notApplicable: admitted.notApplicable.length },
      registerSessionRefused: true, release: f.packet.ids.release,
    });
  } finally { life.release(); }
});
