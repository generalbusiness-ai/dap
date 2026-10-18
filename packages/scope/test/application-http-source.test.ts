/** SmartHttpSource and real package/admission/local R2, with an explicit
 * scripted upload-pack HTTP peer. Portable buildPack emits actual Git packs;
 * no remote repository/provider or native installation is exercised here. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { objectId } from "@generalbusiness/artroom-git";
import { buildPack, type RawGitObject } from "@generalbusiness/artroom-git/http";
import { applicationHttpSource } from "../src/applications/http-source.ts";
import { resolveAndStoreApplication } from "../src/applications/resolve.ts";
import { applicationResolverFixture as fixture } from "./support/application-fixture.ts";
const utf8 = new TextEncoder();
const packet = (line: string) => { const bytes = utf8.encode(line); return concat(utf8.encode((bytes.length + 4).toString(16).padStart(4, "0")), bytes); };
const concat = (...parts: Uint8Array[]) => { const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { result.set(p, at); at += p.length; } return result; };

test("the host resolves only four exact isolated objects with no credentials or closure fallback", async () => {
  const f = await fixture("sha1"), wants: string[] = []; let ads = 0;
  try {
    const open = applicationHttpSource(async request => {
      expect(request.url.startsWith("https://git.example/packages.git/")).toBe(true);
      expect(request.headers.get("authorization")).toBeNull(); expect(request.headers.get("cookie")).toBeNull(); expect(request.redirect).toBe("manual");
      if (request.method === "GET") {
        ads++;
        expect(request.url).toBe("https://git.example/packages.git/info/refs?service=git-upload-pack");
        return new Response(concat(packet("# service=git-upload-pack\n"), utf8.encode("0000"), packet(`${f.commit} HEAD\0shallow filter allow-reachable-sha1-in-want object-format=sha1\n`), utf8.encode("0000")), { headers: { "content-type": "application/x-git-upload-pack-advertisement" } });
      }
      expect(request.method).toBe("POST"); expect(request.url).toBe("https://git.example/packages.git/git-upload-pack");
      const body = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(await request.arrayBuffer()), wanted = /want ([0-9a-f]{40}) shallow filter\n/.exec(body)![1]!;
      expect(body).toContain("deepen 1\n"); expect(body).toContain("filter tree:0\n"); expect(body).not.toContain("have "); expect(body).not.toContain("ofs-delta");
      wants.push(wanted); const object = f.objects.get(wanted)!;
      const pack = await buildPack([{ id: objectId(wanted, "fixture"), type: object.type as RawGitObject["type"], data: object.data! }], { maxBytes: 4 * 1024 * 1024 });
      return new Response(concat(...(object.type === "commit" ? [packet(`shallow ${wanted}\n`)] : []), utf8.encode("0000"), packet("NAK\n"), pack), { headers: { "content-type": "application/x-git-upload-pack-result" } });
    });
    expect(await resolveAndStoreApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, open, f.store)).toEqual(f.packet);
    expect(ads).toBe(4); expect(wants[0]).toBe(f.commit); expect(new Set(wants).size).toBe(4); expect(wants.every(id => f.objects.has(id))).toBe(true);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); }
});

test("an unsupported isolated peer or redirect refuses without another transport or stored bytes", async () => {
  const f = await fixture("sha1");
  try {
    for (const redirect of [false, true]) {
      let calls = 0;
      const open = applicationHttpSource(async () => {
        calls++;
        return redirect ? new Response(null, { status: 302, headers: { location: "https://elsewhere.test/repo.git" } })
          : new Response(concat(packet("# service=git-upload-pack\n"), utf8.encode("0000"), packet(`${f.commit} HEAD\0ofs-delta\n`), utf8.encode("0000")), { headers: { "content-type": "application/x-git-upload-pack-advertisement" } });
      });
      await expect(resolveAndStoreApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, open, f.store)).rejects.toThrow();
      expect(calls).toBe(1); expect(await env.APPLICATION_CONTENT.head(f.key)).toBeNull();
    }
  } finally { await env.APPLICATION_CONTENT.delete(f.key); }
});
