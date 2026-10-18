/** Actual adapter/send code; all identity, token and HTTP replies are explicit
 * fixture stand-ins. No real credential is minted and no network is used. */
import { expect, test } from "vitest";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { isScopeRef, timeOf, utf8 } from "@generalbusiness/artroom-bytes";
import { snapshotCommit } from "@generalbusiness/artroom-git";
import { buildPack } from "@generalbusiness/artroom-git/http";
import { journalRef } from "@generalbusiness/artroom-git/journal";
import { GitHubProvider } from "../src/github-host.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import type { FixtureArchivePorts } from "../src/archive-host.ts";
import type { ArchiveSend } from "../src/archive-driver.ts";

const at: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "destination" };
const other: ScopeRef = { ...at, scope: `sc_${"b".repeat(51)}a` };
const pkt = (text: string) => `${(utf8(text).length + 4).toString(16).padStart(4, "0")}${text}`;
const reply = (text: string, media: string) => new Response(text, { headers: { "content-type": `application/x-git-${media}` } });
function latch() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { release, promise }; }
function fixture(host: "github" | "artifacts") {
  const repository = host === "github" ? { host: "github.com", namespace: "demo", name: "repo", id: "71" } : { host: "artifacts", namespace: "demo", name: "repo", id: "repo" };
  const remote = host === "github" ? "https://github.com/demo/repo.git" : "https://service.invalid/git/demo/repo.git";
  let now = Date.parse("2026-10-18T00:00:00Z"), pointer: string | null = null, revoked = 0;
  let blocked: ReturnType<typeof latch> | null = null;
  const started = latch(), posts: Uint8Array[] = [], calls: string[] = [];
  const archive = snapshotCommit([], "fixture archive boundary\n");
  const fetch = async (request: Request): Promise<Response> => {
    calls.push(request.url);
    if (new URL(request.url).hostname === "api.github.com") {
      expect(request.url).toBe("https://api.github.com/repos/demo/repo");
      return Response.json({ id: 71, name: "repo", owner: { id: 17, login: "demo", type: "Organization" }, private: false, full_name: "demo/repo", html_url: "https://github.com/demo/repo", clone_url: remote });
    }
    if (request.method === "POST") {
      if (request.url === `${remote}/git-upload-pack`) {
        const pack = await buildPack(archive.objects, { maxBytes: 64 * 1024 });
        const prefix = utf8(pkt("NAK\n")), body = new Uint8Array(prefix.length + pack.length); body.set(prefix); body.set(pack, prefix.length);
        return new Response(body, { headers: { "content-type": "application/x-git-upload-pack-result" } });
      }
      expect(request.url).toBe(`${remote}/git-receive-pack`);
      posts.push(new Uint8Array(await request.arrayBuffer())); pointer = archive.commit;
      return reply(`${pkt("unpack ok\n")}${pkt(`ok ${journalRef(at.scope)}\n`)}0000`, "receive-pack-result");
    }
    if (request.url.endsWith("service=git-receive-pack")) {
      started.release(); await blocked?.promise;
      return reply(`${pkt("# service=git-receive-pack\n")}0000${pkt(`${"0".repeat(40)} capabilities^{}\0report-status\n`)}0000`, "receive-pack-advertisement");
    }
    expect(request.url).toBe(`${remote}/info/refs?service=git-upload-pack`);
    const line = pointer ? `${pointer} ${journalRef(at.scope)}\0ofs-delta\n` : `${"0".repeat(40)} capabilities^{}\0ofs-delta\n`;
    return reply(`${pkt("# service=git-upload-pack\n")}0000${pkt(line)}0000`, "upload-pack-advertisement");
  };
  const ports: FixtureArchivePorts = {
    fixture: "archive-ports", clock: () => timeOf(now), tokens: {
      fixture: "archive-tokens", read: async () => "fixture-read",
      mint: async () => ({ id: "fixture-handle", plaintext: "fixture-write", ends: timeOf(now + 60_000) }),
      revoke: async () => { revoked++; },
    },
  };
  const provider = host === "github" ? new GitHubProvider({
    host: repository.host, namespace: "demo", maxBytes: 64 * 1024,
    app: { issuer: "fixture", privateKey: "-----BEGIN PRIVATE KEY-----\nAA==\n-----END PRIVATE KEY-----\n", installationId: 99, account: { id: 17, login: "demo", type: "Organization" }, fetch },
    readCredential: async () => { throw new Error("ledger read port must not run"); }, credentialHandle: async () => { throw new Error("ledger mint must not run"); },
  }).fixtureArchive(ports) : new ArtifactsProvider({
    host: repository.host, namespace: "demo", service: "service.invalid", maxBytes: 64 * 1024, fetch,
    binding: { get: async () => ({ info: async () => ({ remote }), createToken: async () => { throw new Error("real mint must not run"); }, revokeToken: async () => { throw new Error("ledger revoke must not run"); } }), create: async () => { throw new Error("no create"); }, delete: async () => { throw new Error("no delete"); } },
    credentialHandle: async () => { throw new Error("ledger custody must not run"); },
  }).fixtureArchive(ports);
  const request = async (): Promise<ArchiveSend> => {
    const credential = await provider.mintArchive(repository, at, () => true);
    if (!credential) throw new Error("fixture credential missing");
    return { repository: { ...repository }, at: { ...at }, ref: journalRef(at.scope), old: null, commit: archive.commit, objects: archive.objects.map(object => ({ ...object, data: new Uint8Array(object.data) })), credential, allowed: () => true };
  };
  return { provider, repository, archive, posts, calls, started, request, publish: () => { pointer = archive.commit; }, block: () => { blocked = latch(); return blocked; }, expire: () => { now += 60_000; }, revoked: () => revoked };
}

// Actual adapters reject wrong native scope/repository/ref and forged or
// revoked identity before any HTTP discovery, including a valid token object.
test.each(["github", "artifacts"] as const)("%s archive credential cannot escape its native journal ref", async host => {
  expect(isScopeRef(at)).toBe(true); expect(isScopeRef(other)).toBe(true);
  const f = fixture(host), request = await f.request();
  const attempts: ArchiveSend[] = [
    { ...request, ref: "refs/heads/main" }, { ...request, ref: `${request.ref}/child` },
    { ...request, at: other, ref: journalRef(other.scope) },
    { ...request, at: { ...at, inc: `in_${"b".repeat(25)}a` } },
    { ...request, repository: { ...request.repository, id: "72" } },
    { ...request, credential: { ...request.credential } },
  ];
  for (const attempt of attempts) await expect(f.provider.sendArchive(attempt)).rejects.toThrow();
  expect(f.calls).toEqual([]); expect(f.posts).toEqual([]);
  await f.provider.revokeArchive(request.credential);
  await expect(f.provider.sendArchive(request)).rejects.toThrow();
  expect(f.revoked()).toBe(1); expect(f.calls).toEqual([]);
});

// A positive send proves the real path remains reachable. Object/ref mutation
// while discovery awaits cannot change the owned bytes or bound command.
test.each(["github", "artifacts"] as const)("%s archive send owns its command and bytes before discovery awaits", async host => {
  const f = fixture(host), request = await f.request(), blocked = f.block();
  const running = f.provider.sendArchive(request); await f.started.promise;
  Object.assign(request, { ref: "refs/heads/main", repository: { ...request.repository, name: "other" } });
  Object.assign(request.at, other);
  for (const object of request.objects) object.data.fill(0);
  blocked.release();
  expect(await running).toEqual({ send: "accepted" }); expect(f.posts).toHaveLength(1);
  const command = new TextDecoder().decode(f.posts[0]);
  expect(command).toContain(journalRef(at.scope)); expect(command).not.toContain("refs/heads/main");
});

// These changes happen after the initial check, while actual smart-HTTP
// discovery awaits. Only its final beforeSend check can prevent the POST.
test.each(["github", "artifacts"] as const)("%s rechecks expiry, revocation and the pass fence after awaits", async host => {
  for (const change of ["expire", "revoke", "fence"] as const) {
    const f = fixture(host), request = await f.request(), blocked = f.block(); let allowed = true;
    const running = f.provider.sendArchive({ ...request, allowed: () => allowed }); await f.started.promise;
    if (change === "expire") f.expire();
    if (change === "revoke") await f.provider.revokeArchive(request.credential);
    if (change === "fence") allowed = false;
    blocked.release();
    const result = await running.then(value => value, () => "unavailable");
    expect(f.posts).toEqual([]); expect(result).toEqual({ send: "not-sent" });
  }
});

// Real pack decode/closure and transport allowance, with scripted HTTP.
// Over-count packs and wire replies fail before an unbounded collection.
test.each(["github", "artifacts"] as const)("%s parent reads cap decoded objects and bytes in the actual transport", async host => {
  const f = fixture(host); f.publish();
  const actual = await f.provider.objects(f.repository, f.archive.commit, { bytes: 64 * 1024, objects: 2 }, () => true);
  expect(actual).toHaveLength(2); expect(actual.map(object => object.id).sort()).toEqual(f.archive.objects.map(object => object.id).sort());
  await expect(f.provider.objects(f.repository, f.archive.commit, { bytes: 64 * 1024, objects: 1 }, () => true)).rejects.toThrow();
  await expect(f.provider.objects(f.repository, f.archive.commit, { bytes: 32, objects: 2 }, () => true)).rejects.toThrow();
  expect(f.posts).toEqual([]);
});
