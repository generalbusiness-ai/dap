/** Plain host decisions and actual smart-HTTP send code. The Artifacts
 * binding, clock and HTTP replies are scripted; no remote service runs. */
import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { expect, test } from "vitest";
import { utf8 } from "@generalbusiness/dap-bytes";
import { snapshotCommit } from "@generalbusiness/dap-git";
import { journalRef } from "@generalbusiness/dap-git/journal";
import { admitArchivePin } from "@generalbusiness/dap-git/archive-policy";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { growArchivePolicies, GROW_ARCHIVE_DEFINITIONS } from "../../archive-policy.ts";
import { growArchiveConfiguration } from "../../archive.ts";
import { ArtifactsProvider } from "../../../../packages/scope/src/artifacts-host.ts";

test("Grow export requires its exact deployed signed release and never admits private source journals", () => {
  const text = readFileSync(new NodeURL("../../../../examples/grow/demo/application.dap.json", import.meta.url), "utf8"), policies = growArchivePolicies(text);
  for (const pin of GROW_ARCHIVE_DEFINITIONS) expect(policies.has(pin)).toBe(true);
  for (const pin of ["platform:directory@16", "platform:rules@10", "platform:destination@12"] as const) expect(policies.has(pin)).toBe(true);
  // Register/Membership coverage describes allowed retained copies only.
  // A trusted table cannot override the independent root admission gate.
  for (const pin of ["platform:register@17", "platform:membership@8"] as const) expect(admitArchivePin(pin, new Set(GROW_ARCHIVE_DEFINITIONS)).ok).toBe(false);
  const changed = JSON.parse(text); changed.release.sig = "A".repeat(86);
  expect(() => growArchivePolicies(JSON.stringify(changed))).toThrow();
  const source = readFileSync(new NodeURL("../../wrangler.grow.jsonc", import.meta.url), "utf8");
  const config = JSON.parse(source.replace(/^\s*\/\/.*$/gm, ""));
  expect(growArchiveConfiguration(config.vars)).toMatchObject({ directory: "sc_ryghgistvpshbaznxlbleop5zqruy2kmogy4jeigr7j3yqlewceq", namespace: "artroom-demo" });
  expect(growArchiveConfiguration({ ...config.vars, GROW_ARCHIVE_CONFIG: JSON.stringify({ ...JSON.parse(config.vars.GROW_ARCHIVE_CONFIG), secret: "not-admitted" }) })).toBeNull();
});

test("Artifacts archive mints one service-expiring pass token and the actual send guard rejects another ref and revoked reuse", async () => {
  const repository = { host: "artifacts", namespace: "demo", name: "repo", id: "repo" }, remote = "https://service.invalid/git/demo/repo.git";
  const at: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };
  const expires = "2026-10-21T00:07:00Z", now = "2026-10-21T00:00:00Z", tokens: unknown[] = [], revoked: string[] = [], posts: string[] = [];
  const pkt = (text: string) => `${(utf8(text).length + 4).toString(16).padStart(4, "0")}${text}`;
  const reply = (text: string, kind: string) => new Response(text, { headers: { "content-type": `application/x-git-${kind}` } });
  let pointer: string | null = null;
  const archive = snapshotCommit([], "TEST archive adapter transport\n");
  const provider = new ArtifactsProvider({ host: repository.host, namespace: repository.namespace, service: "service.invalid", maxBytes: 65536,
    credentialHandle: async () => { throw new Error("No fabricated ledger custody"); },
    binding: { get: async () => ({ info: async () => ({ remote }), createToken: async (scope, ttl) => { tokens.push({ scope, ttl }); return { scope, plaintext: `${scope}-token`, expiresAt: expires }; }, revokeToken: async token => { revoked.push(token); return true; } }),
      create: async () => { throw new Error("No repository creation"); }, delete: async () => { throw new Error("No repository deletion"); } },
    fetch: async request => {
      if (request.method === "POST") {
        posts.push(request.headers.get("authorization")!); pointer = archive.commit;
        return reply(`${pkt("unpack ok\n")}${pkt(`ok ${journalRef(at.scope)}\n`)}0000`, "receive-pack-result");
      }
      const receive = request.url.endsWith("service=git-receive-pack"), service = receive ? "receive-pack" : "upload-pack";
      const ref = pointer ? `${pointer} ${journalRef(at.scope)}` : `${"0".repeat(40)} capabilities^{}`;
      return reply(`${pkt(`# service=git-${service}\n`)}0000${pkt(`${ref}\0${receive ? "report-status" : "ofs-delta"}\n`)}0000`, `${service}-advertisement`);
    },
  }).archive(() => now);
  const credential = await provider.mintArchive(repository, at, () => true);
  expect(credential?.ends).toBe(expires); // never infer now + requested TTL
  expect(tokens).toEqual([{ scope: "write", ttl: 900 }]);
  if (!credential) return expect.fail("The service minted a valid fixture credential");
  const send = { repository, at, ref: journalRef(at.scope), old: null, commit: archive.commit, objects: archive.objects, credential, allowed: () => true };
  await expect(provider.sendArchive({ ...send, ref: "refs/heads/main" })).rejects.toThrow();
  expect(posts).toEqual([]);
  await provider.sendArchive(send);
  expect(posts).toEqual(["Bearer write-token"]);
  await provider.revokeArchive(credential);
  expect(revoked).toEqual(["write-token"]);
  await expect(provider.sendArchive(send)).rejects.toThrow();
  expect(posts).toHaveLength(1);
  expect(tokens.filter(token => (token as { scope: string }).scope === "write")).toHaveLength(1);
});
