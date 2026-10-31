/** Scripted HTTP reads and acceptance expose MCP discovery, shaping and
 * custody. These tests prove no native membership or Commons judgment. */
import { expect, test } from "vitest";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { b64url, factRefOf, textDigest, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { packApplication } from "@generalbusiness/dap-client";
import { COMMONS_COHORT, TRUSTED_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { packApplication2 } from "@generalbusiness/dap-platform/application-v2";
import { applicationCounterPacket2 } from "../../scope/test/fixtures.ts";
import { McpService, memoryStore } from "../src/index.ts";
import { fixedSigner } from "./fixtures.ts";
import { StandIn, SERVICE } from "./support/standin.ts";
import { packageDeclaration } from "../../client/test/definition-corpus-data.ts";

// Scripted public smart-HTTP replies carry independently framed SHA-1
// objects and zlib packs. The maintained reader decodes and verifies them;
// package parsing, release signatures, MCP dispatch and custody stay real.
function packagePeer(bytes: Uint8Array) {
  const objects = new Map<string, { kind: number; data: Buffer }>();
  const add = (type: string, kind: number, data: Uint8Array) => {
    const id = createHash("sha1").update(`${type} ${data.length}\0`).update(data).digest("hex");
    objects.set(id, { kind, data: Buffer.from(data) }); return id;
  };
  const blob = add("blob", 3, bytes);
  const tree = add("tree", 2, Buffer.concat([Buffer.from("100644 application.dap.json\0"), Buffer.from(blob, "hex")]));
  const commit = add("commit", 1, Buffer.from(`tree ${tree}\nauthor TEST <test@example.invalid> 0 +0000\ncommitter TEST <test@example.invalid> 0 +0000\n\nTEST package\n`));
  const pkt = (text: string) => { const body = Buffer.from(text); return Buffer.concat([Buffer.from((body.length + 4).toString(16).padStart(4, "0")), body]); };
  let reads = 0;
  return { uri: `git+https://packages.test/apps.git/@${commit}/application.dap.json`, get reads() { return reads; },
    fetch: async (request: Request): Promise<Response> => {
      expect(request.headers.get("authorization")).toBeNull();
      expect(request.headers.get("cookie")).toBeNull();
      expect(request.redirect).toBe("manual");
      if (request.method === "GET") {
        expect(request.url).toBe("https://packages.test/apps.git/info/refs?service=git-upload-pack");
        return new Response(Buffer.concat([pkt("# service=git-upload-pack\n"), Buffer.from("0000"), pkt(`${commit} HEAD\0shallow filter allow-reachable-sha1-in-want object-format=sha1\n`), Buffer.from("0000")]), { headers: { "content-type": "application/x-git-upload-pack-advertisement" } });
      }
      expect(request.method).toBe("POST"); expect(request.url).toBe("https://packages.test/apps.git/git-upload-pack");
      const body = await request.text(), wanted = /want ([0-9a-f]{40}) shallow filter\n/.exec(body)?.[1];
      expect(body).toContain("deepen 1\n"); expect(body).toContain("filter tree:0\n"); expect(body).not.toContain("have ");
      expect(wanted).toBeDefined(); const object = objects.get(wanted!)!; expect(object).toBeDefined();
      const header = Buffer.alloc(12); header.write("PACK"); header.writeUInt32BE(2, 4); header.writeUInt32BE(1, 8);
      let size = Math.floor(object.data.length / 16);
      const objectHeader = [(object.kind << 4) | (object.data.length & 15) | (size ? 128 : 0)];
      while (size) { const part = size & 127; size = Math.floor(size / 128); objectHeader.push(part | (size ? 128 : 0)); }
      const content = Buffer.concat([header, Buffer.from(objectHeader), deflateSync(object.data)]);
      const pack = Buffer.concat([content, createHash("sha1").update(content).digest()]);
      if (wanted === blob) reads++;
      return new Response(Buffer.concat([...(wanted === commit ? [pkt(`shallow ${commit}\n`)] : []), Buffer.from("0000"), pkt("NAK\n"), pack]), { headers: { "content-type": "application/x-git-upload-pack-result" } });
    },
  };
}

const now = () => Date.parse("2099-01-01T00:00:00Z");
function fixture(withCommons = true) {
  const signer = fixedSigner(87), peer = new StandIn(signer.key, "member", ["commons.write", "application.install"]);
  const commons = withCommons ? peer.add("commons", "platform:commons@1") : null;
  if (commons) {
    const row = peer.scopes.get(peer.directory.scope)!.items[0]!;
    peer.scopes.get(peer.directory.scope)!.items[0] = { ...row, refs: { ...row.refs, commons } };
  }
  const store = memoryStore();
  const service = new McpService({ service: SERVICE, signer, fetch: peer.fetch, now,
    config: { read: async () => peer.config(), addRoot: async () => {} }, custody: store });
  return { signer, peer, commons, store, service };
}

test("Commons discovery binds one ordinary note tool and preserves opaque references without dereferencing", async () => {
  const { peer, commons, service } = fixture();
  const snapshot = await service.snapshot();
  const tool = snapshot.tools.find(tool => tool.name === "commons.note")!;
  expect(tool).toBeDefined();
  expect((tool.inputSchema["required"] as string[])).not.toContain("target");
  const about = [{ document: textDigest("unread document"), fragment: "page=3" },
    { entry: factRefOf(peer.scopes.get(peer.rules.scope)!.entries[0]!.entry), fragment: "row=7" }];
  const text = "A member's statement.", args = { fields: { text, media: "text/plain", about }, idempotencyKey: "note" };
  expect((await service.call("commons.note", args)).structuredContent["answer"]).toBe("accepted");
  expect((await service.call("commons.note", args)).structuredContent["retained"]).toBe(true);
  const entries = peer.scopes.get(commons!.scope)!.entries;
  expect(entries).toHaveLength(2);
  const input = entries[1]!.entry.input;
  expect(input.type).toBe("act");
  if (input.type !== "act") return;
  expect(verifySignedIntent(input.signed)).toBe(true);
  expect(input.signed.intent.fields).toEqual({ text: textDigest(text), media: "text/plain", about });
  const room = (await service.call("room", {})).structuredContent;
  expect((room["scopes"] as Record<string, unknown>)["commons"]).toBeDefined();
  const before = peer.requests.length;
  const malformed = await service.call("commons.note", { ...args, idempotencyKey: "bad-reference", fields: { ...args.fields, about: [{ ...about[0], entry: about[1]!.entry }] } });
  expect(malformed.structuredContent["error"]).toBe("shape");
  expect(peer.requests.slice(before).some(request => request.endsWith("/acts"))).toBe(false);
  expect((await fixture(false).service.snapshot()).tools.some(tool => tool.name === "commons.note")).toBe(false);
});

test("Commons reads retain note identity and expose unavailable attribution and bounded text previews", async () => {
  const { peer, commons, service, signer } = fixture();
  const text = "x".repeat(65536), document = textDigest("another room's document");
  const about = [{ document, fragment: "page=3" }, ...Array.from({ length: 63 }, (_, i) => ({ document: textDigest(String(i)), fragment: "p".repeat(512) }))];
  expect((await service.call("commons.note", { fields: { text, media: "text/plain", about }, idempotencyKey: "long-note" })).structuredContent["answer"]).toBe("accepted");
  peer.scopes.get(commons!.scope)!.retained.set(`text ${textDigest(text)}`, text);
  const before = peer.requests.length;
  const answer = await service.call("commons", {}), value = answer.structuredContent;
  expect(answer.isError).toBe(false);
  const notes = value["notes"] as { text: string; author: unknown; key: string; textComplete: boolean; aboutComplete: boolean; about: unknown[] }[];
  expect(notes).toHaveLength(1);
  expect(notes[0]).toMatchObject({ key: signer.key, author: null, textComplete: false, aboutComplete: false });
  expect(notes[0]!.about[0]).toEqual({ document, fragment: "page=3" });
  expect(utf8(notes[0]!.text).length).toBeLessThanOrEqual(1024);
  expect(value["complete"]).toBe(false);
  expect(value["unreadable"]).toContain("The native author of entry 1 is unavailable.");
  expect(utf8(JSON.stringify(answer)).length).toBeLessThanOrEqual(65536);
  expect(peer.requests.slice(before).some(request => request.includes(document))).toBe(false);
});

test("a package requiring Commons stops with host commons-missing before any install signature or POST", async () => {
  const { peer, signer } = fixture(false), declaration = packageDeclaration("commons-consumer");
  const packet = await packApplication({ name: "test.commons", version: "1", semantic: {
    v: 1, entry: declaration.id, definitions: [declaration], host: { execution: "recorded-do", profiles: ["restricted@1"], requires: ["commons"] },
    projections: {}, capabilities: [], roles: { member: ["app.edit"], admin: ["app.found", "app.edit"] }, predecessor: null,
  }, presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: b64url(utf8("<p>Commons consumer</p>")) }], descriptions: {} } }, signer);
  const git = packagePeer(packet.bytes);
  peer.scopes.get(peer.directory.scope)!.definition = TRUSTED_APPLICATION_COHORT.directory;
  peer.scopes.get(peer.rules.scope)!.definition = TRUSTED_APPLICATION_COHORT.rules;
  const signed: string[] = [];
  const service = new McpService({ service: SERVICE, signer: { key: signer.key, sign: async bytes => { signed.push(new TextDecoder().decode(bytes)); return signer.sign(bytes); } }, fetch: peer.fetch, now,
    config: { read: async () => peer.config(), addRoot: async () => {} }, custody: memoryStore(),
    applicationFetch: git.fetch, applicationTrust: JSON.stringify([{ release: packet.ids.release, publisher: signer.key, host: "packages.test" }]) });
  const args = { uri: git.uri, release: packet.ids.release, roles: [], values: {}, idempotencyKey: "required-commons" };
  const refused = await service.call("install_application", args);
  expect(refused.structuredContent["error"]).toBe("commons-missing");
  expect(refused.structuredContent["next"]).toContain("not a recorded native refusal");
  expect(signed.some(bytes => bytes.includes('"kind":"install-application"'))).toBe(false);
  expect(peer.requests.some(request => request.endsWith("/acts"))).toBe(false);
  // The same real packet and install path reaches signing once its required
  // endpoint exists. This scripts acceptance, not native package admission.
  const commons = peer.add("commons", "platform:commons@1");
  const row = peer.scopes.get(peer.directory.scope)!.items[0]!;
  peer.scopes.get(peer.directory.scope)!.items[0] = { ...row, refs: { ...row.refs, commons } };
  expect((await service.call("install_application", args)).structuredContent["answer"]).toBe("accepted");
  expect(signed.some(bytes => bytes.includes('"kind":"install-application"'))).toBe(true);
  expect(git.reads).toBe(2);
});


// The new family keeps the maintained v2/device install envelope and exact
// chosen owner. Native Rules admission remains the platform owner's witness.
test("Commons cohort installation uses the declared device proof and exact Membership9 sibling", async () => {
  const { peer, signer } = fixture(), base = await applicationCounterPacket2();
  const { creates: _creates, ...semantic } = base.package.semantic;
  const { semantic: _semantic, ...presentation } = base.package.presentation;
  const packet = await packApplication2({ name: "test.commons-device", version: "1", semantic: {
    ...semantic, host: { ...semantic.host, requires: ["commons"] },
  }, presentation }, signer);
  const git = packagePeer(packet.bytes);
  peer.scopes.get(peer.directory.scope)!.definition = COMMONS_COHORT.directory;
  peer.scopes.get(peer.rules.scope)!.definition = COMMONS_COHORT.rules;
  peer.scopes.get(peer.membership.scope)!.definition = COMMONS_COHORT.membership;
  const signed: string[] = [], custody = memoryStore();
  const service = new McpService({ service: SERVICE, signer: { key: signer.key, sign: async bytes => { signed.push(new TextDecoder().decode(bytes)); return signer.sign(bytes); } }, fetch: peer.fetch, now,
    config: { read: async () => peer.config(), addRoot: async () => {} }, custody,
    applicationFetch: git.fetch, applicationTrust: JSON.stringify([{ release: packet.ids.release, publisher: signer.key, host: "packages.test" }]) });
  const owner = { membership: peer.membership, member: "@agent" };
  const args = { uri: git.uri, release: packet.ids.release, roles: [], values: {}, idempotencyKey: "commons-device" };
  expect((await service.call("install_application", args)).structuredContent["error"]).toBe("shape");
  expect(git.reads).toBe(0);
  expect((await service.call("install_application", { ...args, owner })).structuredContent["answer"]).toBe("accepted");
  const input = peer.scopes.get(peer.rules.scope)!.entries.at(-1)!.entry.input;
  expect(input.type).toBe("act");
  if (input.type !== "act") return;
  expect(input.signed.intent.fields["owner"]).toEqual(owner);
  expect(verifySignedIntent(input.signed)).toBe(true);
  expect(git.reads).toBe(1);
  const posts = peer.requests.filter(request => request.endsWith("/acts")).length;
  peer.scopes.get(peer.membership.scope)!.definition = "platform:membership@8";
  expect((await service.call("install_application", { ...args, owner, idempotencyKey: "wrong-membership" })).structuredContent["error"]).toBe("target");
  expect(peer.requests.filter(request => request.endsWith("/acts"))).toHaveLength(posts);
  expect(git.reads).toBe(1);
});
