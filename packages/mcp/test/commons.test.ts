/** Scripted HTTP reads and acceptance expose MCP discovery, shaping and
 * custody. These tests prove no native membership or Commons judgment. */
import { expect, test, vi } from "vitest";
import { b64url, factRefOf, textDigest, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { packApplication } from "@generalbusiness/dap-client";
import { COMMONS_COHORT, TRUSTED_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { packApplication2 } from "@generalbusiness/dap-platform/application-v2";
import { applicationCounterPacket2 } from "../../scope/test/fixtures.ts";
import { McpService, memoryStore } from "../src/index.ts";
import { fixedSigner } from "./fixtures.ts";
import { StandIn, SERVICE } from "./support/standin.ts";
import { packageDeclaration } from "../../client/test/definition-corpus-data.ts";

// Only the public Git blob boundary is scripted. Package parsing, release
// signatures, MCP dispatch, signed envelopes and custody remain real.
const git = vi.hoisted(() => ({ bytes: new Uint8Array() as Uint8Array, reads: 0 }));
vi.mock("@generalbusiness/dap-git/application", async original => ({
  ...await original<typeof import("@generalbusiness/dap-git/application")>(),
  readApplicationGitBlob: async () => { git.reads++; return git.bytes; },
}));

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
  git.bytes = packet.bytes; git.reads = 0;
  peer.scopes.get(peer.directory.scope)!.definition = TRUSTED_APPLICATION_COHORT.directory;
  peer.scopes.get(peer.rules.scope)!.definition = TRUSTED_APPLICATION_COHORT.rules;
  const signed: string[] = [];
  const service = new McpService({ service: SERVICE, signer: { key: signer.key, sign: async bytes => { signed.push(new TextDecoder().decode(bytes)); return signer.sign(bytes); } }, fetch: peer.fetch, now,
    config: { read: async () => peer.config(), addRoot: async () => {} }, custody: memoryStore(),
    applicationTrust: JSON.stringify([{ release: packet.ids.release, publisher: signer.key, host: "packages.test" }]) });
  const args = { uri: `git+https://packages.test/apps.git/@${"c".repeat(40)}/application.dap.json`, release: packet.ids.release, roles: [], values: {}, idempotencyKey: "required-commons" };
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
  git.bytes = packet.bytes; git.reads = 0;
  peer.scopes.get(peer.directory.scope)!.definition = COMMONS_COHORT.directory;
  peer.scopes.get(peer.rules.scope)!.definition = COMMONS_COHORT.rules;
  peer.scopes.get(peer.membership.scope)!.definition = COMMONS_COHORT.membership;
  const signed: string[] = [], custody = memoryStore();
  const service = new McpService({ service: SERVICE, signer: { key: signer.key, sign: async bytes => { signed.push(new TextDecoder().decode(bytes)); return signer.sign(bytes); } }, fetch: peer.fetch, now,
    config: { read: async () => peer.config(), addRoot: async () => {} }, custody,
    applicationTrust: JSON.stringify([{ release: packet.ids.release, publisher: signer.key, host: "packages.test" }]) });
  const owner = { membership: peer.membership, member: "@agent" };
  const args = { uri: `git+https://packages.test/apps.git/@${"c".repeat(40)}/application.dap.json`, release: packet.ids.release, roles: [], values: {}, idempotencyKey: "commons-device" };
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
