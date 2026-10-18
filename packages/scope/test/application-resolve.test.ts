/** Real signatures/native admission/private local R2, with an explicit
 * in-memory Git-object transport stand-in. The Git reader's real repository
 * witnesses live in packages/git/test/application-blob.test.ts. No HTTP Git
 * server, provider, native install or host format-support claim here. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, hex } from "@generalbusiness/artroom-bytes";
import { packApplication, secretSigner, type ApplicationReleaseUri } from "@generalbusiness/artroom-client";
import type { ApplicationGitObject } from "@generalbusiness/artroom-git";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { readApplicationTrust } from "../src/applications/admission.ts";
import { ApplicationContentStore, applicationReleaseKey } from "../src/applications/content.ts";
import { resolveAndStoreApplication, resolveTrustedApplication, type OpenApplicationSource } from "../src/applications/resolve.ts";
const signer = secretSigner(new Uint8Array(32).fill(64)), utf8 = new TextEncoder();
async function fixture(format: "sha1" | "sha256", bytes?: Uint8Array) {
  const definition = definitionDigest(countingCommitments), packet = await packApplication({ name: "test.example.resolve", version: format, semantic: { v: 1, entry: definition,
    definitions: [{ id: definition, bytes: canonicalize(countingCommitments) }], host: { execution: "recorded-do", profiles: ["restricted@1"] }, roles: {}, projections: {}, capabilities: [], predecessor: null },
    presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {} } }, signer);
  const objects = new Map<string, ApplicationGitObject>();
  const add = async (type: string, data: Uint8Array) => {
    const header = utf8.encode(`${type} ${data.length}\0`), framed = new Uint8Array(header.length + data.length); framed.set(header); framed.set(data, header.length);
    const id = hex(new Uint8Array(await crypto.subtle.digest(format === "sha1" ? "SHA-1" : "SHA-256", framed)));
    objects.set(id, { type, size: data.length, data }); return id;
  };
  const entry = (mode: string, name: string, id: string) => {
    const header = utf8.encode(`${mode} ${name}\0`), hash = Uint8Array.from(id.match(/../g)!, byte => parseInt(byte, 16)), data = new Uint8Array(header.length + hash.length); data.set(header); data.set(hash, header.length); return data;
  };
  const blob = await add("blob", bytes ?? packet.bytes), nested = await add("tree", entry("100644", "application.dap.json", blob)), tree = await add("tree", entry("40000", "packages", nested));
  const commit = await add("commit", utf8.encode(`tree ${tree}\nauthor TEST <test@example.invalid> 0 +0000\ncommitter TEST <test@example.invalid> 0 +0000\n\nTEST release\n`));
  const uri = `git+https://git.example/packages.git/@${commit}/packages/application.dap.json`;
  const trust = readApplicationTrust(JSON.stringify([{ release: packet.ids.release, publisher: signer.key }])), opened: ApplicationReleaseUri[] = []; let closed = 0;
  const open: OpenApplicationSource = async address => {
    opened.push(address);
    return { source: { object: async (id, most) => { const value = objects.get(id); return value ? { ...value, data: value.size <= most ? value.data : null } : null; } }, close: async () => { closed++; } };
  };
  return { packet, uri, commit, trust, open, opened, closed: () => closed, key: applicationReleaseKey(packet.ids.release), store: new ApplicationContentStore(env.APPLICATION_CONTENT, trust, PROPOSED_BOUNDS) };
}

// Invariant: immutable URI resolution and trust precede any private store write;
// existing cached bytes cannot substitute for checking the requested Git URI.
test("resolved trusted bytes enter private storage only after the exact address was checked and closed", async () => {
  for (const format of ["sha1", "sha256"] as const) {
    const f = await fixture(format);
    try {
      expect(await resolveAndStoreApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, f.open, f.store)).toEqual(f.packet);
      expect(f.opened).toHaveLength(1); expect(f.opened[0]).toMatchObject({ remote: "https://git.example/packages.git", commit: f.commit, objectFormat: format, segments: ["packages", "application.dap.json"] }); expect(f.closed()).toBe(1);
      const first = await env.APPLICATION_CONTENT.head(f.key);
      await expect(resolveAndStoreApplication(f.uri.replace(f.commit, "f".repeat(f.commit.length)), f.packet.ids.release, f.trust, PROPOSED_BOUNDS, f.open, f.store)).rejects.toMatchObject({ reason: "absent" });
      expect(f.opened).toHaveLength(2); expect(f.closed()).toBe(2);
      expect((await env.APPLICATION_CONTENT.head(f.key))!.version).toBe(first!.version);
    } finally { await env.APPLICATION_CONTENT.delete(f.key); }
  }
});

test("untrusted, malformed and unavailable resolution never falls back or writes a package", async () => {
  const f = await fixture("sha1", utf8.encode("TEST wrong immutable Git file"));
  try {
    await expect(resolveTrustedApplication(f.uri, f.packet.ids.release, [], PROPOSED_BOUNDS, f.open)).rejects.toThrow("application-untrusted-release"); expect(f.opened).toEqual([]);
    await expect(resolveTrustedApplication(f.uri + "?credential=TEST", f.packet.ids.release, f.trust, PROPOSED_BOUNDS, f.open)).rejects.toThrow("application-uri-invalid"); expect(f.opened).toEqual([]);
    await expect(resolveAndStoreApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, f.open, f.store)).rejects.toThrow();
    expect(f.closed()).toBe(1); expect(await env.APPLICATION_CONTENT.head(f.key)).toBeNull();
    let calls = 0;
    await expect(resolveTrustedApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, async () => { calls++; throw Error("TEST raw transport failure"); })).rejects.toThrow("application-release-unavailable"); expect(calls).toBe(1);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); }
});
