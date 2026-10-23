/** Public TEST package and in-memory Git-object transport, not a remote. */
import { env } from "cloudflare:test";
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, hex } from "@generalbusiness/dap-bytes";
import { packApplication, type ApplicationReleaseUri } from "@generalbusiness/dap-client";
import type { AnyPackedApplication } from "@generalbusiness/dap-bytes/application-v2";
import type { ApplicationGitObject } from "@generalbusiness/dap-git";
import { countingCommitments } from "../../../../apps/counter/commitments.ts";
import { readApplicationTrust } from "../../src/applications/admission.ts";
import { ApplicationContentStore, applicationReleaseKey } from "../../src/applications/content.ts";
import type { OpenApplicationSource } from "../../src/applications/resolve.ts";
import { applicationTrust, fixedSigner } from "../fixtures-core.ts";
const signer = fixedSigner(64), utf8 = new TextEncoder();
export async function applicationResolverFixture(format: "sha1" | "sha256", bytes?: Uint8Array, roles: Readonly<Record<string, readonly string[]>> = {}, declared: DeclaredDefinition = countingCommitments, provided?: AnyPackedApplication, requireArchive = false) {
  const definition = definitionDigest(declared), packet = provided ?? await packApplication({ name: "test.example.resolve", version: format, semantic: { v: 1, entry: definition,
    definitions: [{ id: definition, bytes: canonicalize(declared) }], host: { execution: "recorded-do", profiles: ["restricted@1"], ...(requireArchive ? { requires: ["archive"] as const } : {}) }, roles, projections: {}, capabilities: [], predecessor: null },
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
  const trust = readApplicationTrust(applicationTrust(packet, packet.package.release.manifest.publisher)), opened: ApplicationReleaseUri[] = []; let closed = 0;
  const open: OpenApplicationSource = async address => {
    opened.push(address);
    return { source: { object: async (id, most) => { const value = objects.get(id); return value ? { ...value, data: value.size <= most ? value.data : null } : null; } }, close: async () => { closed++; } };
  };
  return { packet, uri, commit, objects, trust, open, opened, closed: () => closed, key: applicationReleaseKey(packet.ids.release), store: new ApplicationContentStore(env.APPLICATION_CONTENT, trust, PROPOSED_BOUNDS) };
}
