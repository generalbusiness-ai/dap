/**
 * A STAND-IN trusted-application room and Git host for install tests in Node. The room is `StandIn` with the trusted-application
 * cohort's exact pins, its repository row, and a roster that grants `application.install`. It adds what `StandIn` does not route: an installation row for each accepted install
 * act, and the bounded item query over those rows. The Git host answers smart HTTP with one-object packs of one ordinary
 * version 1 package, as `scope/test/support/application-http-peer.ts` does. Nothing here judges an install.
 */
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import type { Item, ItemQueryRead, KeyId, ScopeId, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, itemQueryArgument, itemQueryDigest, readItemQueryParameter } from "@generalbusiness/dap-bytes";
import { packApplication, secretSigner, type Fetch } from "@generalbusiness/dap-client";
import { TRUSTED_APPLICATION_COHORT as C } from "@generalbusiness/dap-platform";
import { countingCommitments } from "../../../../apps/counter/commitments.ts";
import { StandIn } from "./standin.ts";

const utf8 = new TextEncoder();
export const GIT_HOST = "https://git.example/";

export const row = (id: number, type: string, state: string, values: Record<string, unknown> = {}, refs: Record<string, unknown> = {}): Item =>
  ({ id, type, state, revision: 0, opened: null, parties: {}, refs, values, attributed: [] }) as unknown as Item;

const packetLine = (line: string) => { const bytes = utf8.encode(line); return Buffer.concat([utf8.encode((bytes.length + 4).toString(16).padStart(4, "0")), bytes]); };

/** A version 2 pack of one undeltified object, with its SHA-1 trailer. */
function packOf(type: string, data: Uint8Array): Uint8Array {
  const code = { commit: 1, tree: 2, blob: 3 }[type]!, header: number[] = [];
  let size = data.length, byte = (code << 4) | (size & 0x0f);
  for (size = Math.floor(size / 16); size > 0; size = Math.floor(size / 128)) { header.push(byte | 0x80); byte = size & 0x7f; }
  header.push(byte);
  const counts = Buffer.alloc(8); counts.writeUInt32BE(2, 0); counts.writeUInt32BE(1, 4);
  const pack = Buffer.concat([utf8.encode("PACK"), counts, Uint8Array.from(header), deflateSync(data)]);
  return Buffer.concat([pack, createHash("sha1").update(pack).digest()]);
}

export interface GitAnswer { status: number; headers: Record<string, string>; body: Uint8Array }

export interface InstallRoom {
  stand: StandIn;
  directory: ScopeRef; membership: ScopeRef; rules: ScopeRef; destination: ScopeRef;
  /** The configured room, as MCP and the command line record it. */
  repository: { directory: ScopeRef; membership: ScopeRef; rules: ScopeId; destination: ScopeId };
  uri: string; release: string; trust: string;
  /** The scope routes: `StandIn`, an installation row per accepted install act, and the bounded item query. */
  fetch: Fetch;
  /** The Git host, by path below `https://git.example/`. */
  git: (method: string, path: string, sent: Uint8Array) => GitAnswer;
  /** The Git host as a `Request` port. */
  applicationFetch: (request: Request) => Promise<Response>;
  /** The objects the Git host sent. */
  wants: string[];
}

export async function installRoom(key: KeyId): Promise<InstallRoom> {
  // One ordinary version 1 package in an in-memory Git repository: a blob, two trees and a commit, with SHA-1 object IDs.
  const declared = countingCommitments, definition = definitionDigest(declared);
  const packet = await packApplication({ name: "test.example.nf4", version: "1", semantic: { v: 1, entry: definition,
    definitions: [{ id: definition, bytes: canonicalize(declared) }], host: { execution: "recorded-do", profiles: ["restricted@1"] }, roles: {}, projections: {}, capabilities: [], predecessor: null },
    presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {} } }, secretSigner(new Uint8Array(32).fill(64)));
  const objects = new Map<string, { type: string; data: Uint8Array }>(), wants: string[] = [];
  const add = (type: string, data: Uint8Array) => {
    const id = createHash("sha1").update(utf8.encode(`${type} ${data.length}\0`)).update(data).digest("hex");
    objects.set(id, { type, data }); return id;
  };
  const entry = (mode: string, name: string, id: string) => Buffer.concat([utf8.encode(`${mode} ${name}\0`), Buffer.from(id, "hex")]);
  const blob = add("blob", packet.bytes), nested = add("tree", entry("100644", "application.dap.json", blob)), tree = add("tree", entry("40000", "packages", nested));
  const commit = add("commit", utf8.encode(`tree ${tree}\nauthor TEST <test@example.invalid> 0 +0000\ncommitter TEST <test@example.invalid> 0 +0000\n\nTEST release\n`));
  const uri = `git+https://git.example/packages.git/@${commit}/packages/application.dap.json`, release = packet.ids.release;
  const trust = JSON.stringify([{ release, publisher: packet.package.release.manifest.publisher, host: "git.example" }]);

  const git = (method: string, path: string, sent: Uint8Array): GitAnswer => {
    if (method === "GET" && path === "packages.git/info/refs?service=git-upload-pack") return { status: 200, headers: { "content-type": "application/x-git-upload-pack-advertisement" },
      body: Buffer.concat([packetLine("# service=git-upload-pack\n"), utf8.encode("0000"), packetLine(`${commit} HEAD\0shallow filter allow-reachable-sha1-in-want object-format=sha1\n`), utf8.encode("0000")]) };
    const wanted = method === "POST" && path === "packages.git/git-upload-pack" ? /want ([0-9a-f]{40}) shallow filter\n/.exec(new TextDecoder().decode(sent))?.[1] : undefined;
    const object = wanted === undefined ? undefined : objects.get(wanted);
    if (!wanted || !object) return { status: 404, headers: {}, body: new Uint8Array() };
    wants.push(wanted);
    return { status: 200, headers: { "content-type": "application/x-git-upload-pack-result" },
      body: Buffer.concat([...(object.type === "commit" ? [packetLine(`shallow ${wanted}\n`)] : []), utf8.encode("0000"), packetLine("NAK\n"), packOf(object.type, object.data)]) };
  };
  const applicationFetch = async (request: Request): Promise<Response> => {
    if (!request.url.startsWith(GIT_HOST) || request.headers.has("authorization") || request.headers.has("cookie")) return new Response(null, { status: 403 });
    const answer = git(request.method, request.url.slice(GIT_HOST.length), new Uint8Array(await request.arrayBuffer()));
    return new Response(answer.body.length ? answer.body : null, { status: answer.status, headers: answer.headers });
  };

  // A trusted-application room: the stand-in's four scopes under the cohort's exact Directory, Membership, Rules and Destination pins.
  const stand = new StandIn(key, "admin", ["application.install"]);
  for (const [scope, pin] of [[stand.membership, C.membership], [stand.rules, C.rules], [stand.destination, C.destination], [stand.directory, C.directory]] as const) stand.scopes.get(scope.scope)!.definition = pin;
  const { membership, rules, destination, directory } = stand;
  const reply = (body: string) => ({ status: 200, body: new ReadableStream({ start(c) { c.enqueue(utf8.encode(body)); c.close(); } }) as never });

  const fetch: Fetch = async (url, init) => {
    const u = new URL(url);
    const queried = /^\/v1\/scopes\/([^/]+)\/query-items$/.exec(u.pathname);
    if (queried) {
      const query = readItemQueryParameter(u.searchParams.get("q"))!, scope = stand.scopes.get(query.scope.scope)!;
      const items = scope.items.filter(item => item.type === query.type && query.states.includes(item.state) && (query.ids === null || query.ids.includes(item.id)));
      const read: ItemQueryRead = { ok: true, at: stand.head(scope), complete: true, value: { v: 1, scope: scope.ref, query: itemQueryDigest(query)!, argument: itemQueryArgument(query)!, items } };
      return reply(canonicalize(read as never)); // The client admits only a canonical reply.
    }
    const answer = await stand.fetch(url, init);
    // The native rules scope records each accepted install as an installation row whose ID is the act's seq. Here it stays pending.
    if (init?.method === "POST" && u.pathname === `/v1/scopes/${rules.scope}/acts` && typeof init.body === "string") {
      const signed = (JSON.parse(init.body) as { signed: SignedIntent }).signed, scope = stand.scopes.get(rules.scope)!;
      const act = scope.entries.find(sealed => sealed.entry.input.type === "act" && canonicalize(sealed.entry.input.signed) === canonicalize(signed));
      if (act && !scope.items.some(item => item.id === act.entry.seq)) scope.items.push(row(act.entry.seq, "installation", "pending", { phase: "fetch", uri, release }));
    }
    return answer;
  };
  return { stand, directory, membership, rules, destination, repository: { directory, membership, rules: rules.scope, destination: destination.scope },
    uri, release, trust, fetch, git, applicationFetch, wants };
}
