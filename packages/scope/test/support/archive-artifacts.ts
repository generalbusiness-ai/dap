/** Scripted Artifacts service and HTTP peer for the production archive ports.
 * Actual token adapter, Git framing/pack/closure and driver run unchanged.
 * This peer grants no production authority and reaches no real service. */
import { expect } from "vitest";
import { utf8 } from "@generalbusiness/artroom-bytes";
import { Reader, type GitSource } from "@generalbusiness/artroom-git";
import { buildPack } from "@generalbusiness/artroom-git/http";
import { decodePack } from "@generalbusiness/artroom-git/http-read";
import type { JournalObject } from "@generalbusiness/artroom-git/journal";
import type { DestinationRepository } from "../../src/destination-host.ts";
import type { ArtifactsNamespace } from "../../src/artifacts-host.ts";
import { scriptedArchiveV2Pack } from "./archive-v2-pack.ts";

const pkt = (line: string) => `${(utf8(line).length + 4).toString(16).padStart(4, "0")}${line}`;
export class ArchiveArtifactsPeer {
  readonly data = new Map<string, JournalObject>();
  readonly refs = new Map<string, string>();
  readonly minted: { scope: string; ttl: number }[] = [];
  readonly revoked: string[] = [];
  readonly posts: Uint8Array[] = [];
  readonly sends: string[] = [];
  failBeforeAccept = false;
  constructor(readonly repository: DestinationRepository, readonly now: () => number) {}
  get remote() { return `https://service.invalid/git/${this.repository.namespace}/${this.repository.name}.git`; }
  readonly source: GitSource = {
    object: async (id, maximum) => { const object = this.data.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null; },
    ref: async name => this.refs.get(name) ?? null,
    refs: async (prefix, limit) => [...this.refs].filter(([ref]) => ref.startsWith(prefix)).slice(0, limit).map(([ref, target]) => ({ ref, target })),
  };
  readonly binding: ArtifactsNamespace = {
    get: async name => {
      expect(name).toBe(this.repository.name);
      return { info: async () => ({ remote: this.remote }),
        createToken: async (scope, ttl) => { this.minted.push({ scope, ttl }); return { scope, plaintext: `TEST-${scope}-${this.minted.length}`, expiresAt: new Date(this.now() + ttl * 1000).toISOString() }; },
        revokeToken: async token => { this.revoked.push(token); return true; },
      };
    },
    create: async () => { throw new Error("Archive never creates a repository"); },
    delete: async () => { throw new Error("Archive never deletes a repository"); },
  };
  readonly fetch = async (request: Request): Promise<Response> => {
    expect(request.url.startsWith(this.remote + "/")).toBe(true);
    const response = (body: string | Uint8Array, media: string) => new Response(body, { headers: { "content-type": `application/x-git-${media}` } });
    if (request.method === "GET") {
      const receive = request.url.endsWith("service=git-receive-pack"), service = receive ? "receive-pack" : "upload-pack";
      if (!receive && request.headers.get("git-protocol") === "version=2") {
        expect(request.url).toBe(this.remote + "/info/refs?service=git-upload-pack");
        return response(`${pkt("version 2\n")}${pkt("fetch=shallow filter\n")}0000`, "upload-pack-advertisement");
      }
      const caps = receive ? "report-status" : "shallow filter allow-reachable-sha1-in-want";
      const rows = [...this.refs].map(([ref, id], n) => pkt(`${id} ${ref}${n === 0 ? `\0${caps}` : ""}\n`)).join("");
      return response(`${pkt(`# service=git-${service}\n`)}0000${rows || pkt(`${"0".repeat(40)} capabilities^{}\0${caps}\n`)}0000`, `${service}-advertisement`);
    }
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (request.url.endsWith("/git-upload-pack")) {
      const wanted = /want ([0-9a-f]{40})/.exec(new TextDecoder().decode(bytes))?.[1], object = wanted ? this.data.get(wanted) : null;
      if (!object) return expect.fail("The actual adapter must name one held object");
      if (request.headers.get("git-protocol") === "version=2") {
        expect(request.method).toBe("POST");
        expect(new TextDecoder().decode(bytes)).toBe(`${pkt("command=fetch\n")}0001${pkt(`want ${wanted}\n`)}${pkt("deepen 1\n")}${pkt("filter blob:none\n")}${pkt("no-progress\n")}${pkt("done\n")}0000`);
        // Model blob:none, not a one-object shortcut: keep the wanted
        // object and its trees, but no parent commits or unrequested blobs.
        const reader = new Reader(this.source), objects = new Map([[object.id, object]]);
        const trees = object.type === "commit" ? [(await reader.commit(object.id)).tree] : object.type === "tree" ? [object.id] : [];
        const visited = new Set<string>();
        for (const id of trees) {
          if (visited.has(id)) continue;
          visited.add(id);
          const tree = this.data.get(id);
          if (!tree || tree.type !== "tree") return expect.fail("The held commit/tree needs every descendant tree");
          objects.set(id, tree);
          for (const entry of await reader.tree(id)) if (entry.kind === "tree") trees.push(entry.id);
        }
        const pack = await buildPack([...objects.values()], { maxBytes: 8 * 1024 * 1024 });
        const framed = scriptedArchiveV2Pack(pack);
        if (object.type !== "commit") return response(framed, "upload-pack-result");
        const shallow = utf8(`${pkt("shallow-info\n")}${pkt(`shallow ${wanted}\n`)}0001`);
        const body = new Uint8Array(shallow.length + framed.length); body.set(shallow); body.set(framed, shallow.length);
        return response(body, "upload-pack-result");
      }
      const pack = await buildPack([object], { maxBytes: 8 * 1024 * 1024 });
      const prefix = utf8("0000" + pkt("NAK\n"));
      const body = new Uint8Array(prefix.length + pack.length); body.set(prefix); body.set(pack, prefix.length);
      return response(body, "upload-pack-result");
    }
    expect(request.url).toBe(this.remote + "/git-receive-pack");
    const size = Number.parseInt(new TextDecoder().decode(bytes.subarray(0, 4)), 16);
    const match = /^([0-9a-f]{40}) ([0-9a-f]{40}) (.+)$/.exec(new TextDecoder().decode(bytes.subarray(4, size)).split("\0")[0]!.trim());
    if (!match) return expect.fail("The actual adapter sends one canonical ref command");
    expect(match[1]).toBe(this.refs.get(match[3]!) ?? "0".repeat(40));
    const objects = await decodePack(bytes.subarray(size + 4), { maxBytes: 8 * 1024 * 1024 });
    this.posts.push(new Uint8Array(bytes));
    if (this.failBeforeAccept) { this.failBeforeAccept = false; throw new Error("TEST lost connection before acceptance"); }
    for (const object of objects) this.data.set(object.id, { id: object.id, type: object.type as JournalObject["type"], data: new Uint8Array(object.data) });
    expect((await new Reader(this.source).closure(match[2]!)).complete).toBe(true);
    this.refs.set(match[3]!, match[2]!); this.sends.push(match[2]!);
    return response(`${pkt("unpack ok\n")}${pkt(`ok ${match[3]}\n`)}0000`, "receive-pack-result");
  };
}
