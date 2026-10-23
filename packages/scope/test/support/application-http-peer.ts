/** Scripted upload-pack peer emitting real one-object Git packs. No remote
 * repository, provider, credentials or network connection is involved. */
import { expect } from "vitest";
import { objectId } from "@generalbusiness/dap-git";
import { buildPack, type RawGitObject } from "@generalbusiness/dap-git/http";
import type { applicationResolverFixture } from "./application-fixture.ts";
const utf8 = new TextEncoder();
export const packetLine = (line: string) => { const bytes = utf8.encode(line); return concatBytes(utf8.encode((bytes.length + 4).toString(16).padStart(4, "0")), bytes); };
export const concatBytes = (...parts: Uint8Array[]) => { const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { result.set(p, at); at += p.length; } return result; };
export function applicationHttpPeer(f: Pick<Awaited<ReturnType<typeof applicationResolverFixture>>, "commit" | "objects">) {
  const wants: string[] = []; let ads = 0;
  const fetch = async (request: Request): Promise<Response> => {
    expect(request.url.startsWith("https://git.example/packages.git/")).toBe(true);
    expect(request.headers.get("authorization")).toBeNull(); expect(request.headers.get("cookie")).toBeNull(); expect(request.redirect).toBe("manual");
    if (request.method === "GET") {
      ads++;
      expect(request.url).toBe("https://git.example/packages.git/info/refs?service=git-upload-pack");
      return new Response(concatBytes(packetLine("# service=git-upload-pack\n"), utf8.encode("0000"), packetLine(`${f.commit} HEAD\0shallow filter allow-reachable-sha1-in-want object-format=sha1\n`), utf8.encode("0000")), { headers: { "content-type": "application/x-git-upload-pack-advertisement" } });
    }
    expect(request.method).toBe("POST"); expect(request.url).toBe("https://git.example/packages.git/git-upload-pack");
    const body = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(await request.arrayBuffer()), wanted = /want ([0-9a-f]{40}) shallow filter\n/.exec(body)![1]!;
    expect(body).toContain("deepen 1\n"); expect(body).toContain("filter tree:0\n"); expect(body).not.toContain("have "); expect(body).not.toContain("ofs-delta");
    wants.push(wanted); const object = f.objects.get(wanted)!;
    const pack = await buildPack([{ id: objectId(wanted, "fixture"), type: object.type as RawGitObject["type"], data: object.data! }], { maxBytes: 4 * 1024 * 1024 });
    return new Response(concatBytes(...(object.type === "commit" ? [packetLine(`shallow ${wanted}\n`)] : []), utf8.encode("0000"), packetLine("NAK\n"), pack), { headers: { "content-type": "application/x-git-upload-pack-result" } });
  };
  return { fetch, wants, ads: () => ads };
}
