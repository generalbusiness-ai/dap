import { afterAll, expect, test, vi } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { otherLane } from "@generalbusiness/dap-derive/testing";
import { Host } from "./support/host.ts";
import { bare, cleanup, commitText, git, put, setRef } from "./support/repo.ts";

// Only native publication and admission are stand-ins. The Site handler,
// GitHub reader, upload-pack parser and local Git HTTP backend are real.
const state = vi.hoisted(() => ({ room: null as unknown, publication: null as unknown, proof: null as unknown }));
vi.mock("../../scope/src/site/host.ts", async importOriginal => ({
  ...await importOriginal<Record<string, unknown>>(),
  roomOf: async () => state.room,
  publicationOf: async () => state.publication,
  publishedCommitOf: async () => ({ ok: true, proof: state.proof }),
}));
vi.mock("../../scope/src/serving-admission.ts", async importOriginal => ({
  ...await importOriginal<Record<string, unknown>>(),
  admitServing: async () => "admitted",
}));


afterAll(cleanup);

test("anonymous Site serves a real Git revision with over 4096 history objects", async () => {
  const remote = bare();
  git(remote, ["config", "uploadpack.allowFilter", "true"]);
  git(remote, ["config", "uploadpack.allowReachableSHA1InWant", "true"]);
  const blob = put(remote, "blob", "# Long history\n");
  const tree = put(remote, "tree", Buffer.concat([Buffer.from("100644 README.md\0"), Buffer.from(blob, "hex")]));
  const first = put(remote, "commit", commitText(tree, [], "root"));
  const commits = Array.from({ length: 4097 }, (_, n) => {
    const message = `history ${n}`;
    return `commit refs/heads/main\nmark :${n + 1}\ncommitter Test <test@artroom.invalid> 1700000000 +0000\ndata ${message.length}\n${message}\nfrom ${n === 0 ? first : `:${n}`}\n\n`;
  }).join("");
  git(remote, ["fast-import", "--quiet"], commits);
  const head = git(remote, ["rev-parse", "refs/heads/main"]);
  expect(Number(git(remote, ["rev-list", "--count", head]))).toBe(4098);
  const receiptFile = '{"fixture":true}';
  const receiptBlob = put(remote, "blob", receiptFile);
  const receiptTree = put(remote, "tree", Buffer.concat([Buffer.from("100644 receipt.json\0"), Buffer.from(receiptBlob, "hex")]));
  const receiptCommit = put(remote, "commit", commitText(receiptTree, [], "receipt"));
  const receiptRef = "refs/artroom/receipts/fixture";
  setRef(remote, receiptRef, receiptCommit);
  const account = { id: 17, login: "site-owner", type: "Organization" };
  const repository = { host: "github.com", namespace: account.login, name: "demo", id: "71" };
  state.room = { register: otherLane.scope, repository, branch: "main" };
  state.publication = { refs: [{ ref: "refs/heads/main", target: head }] };
  state.proof = { commit: head, receipt: { ref: receiptRef, commit: receiptCommit, tree: receiptTree, blob: receiptBlob, file: receiptFile } };
  const privateKey = "-----BEGIN PRIVATE KEY-----\nYQ==\n-----END PRIVATE KEY-----\n";
  const settings = { SCOPES: {} as never, GITHUB_APP_PRIVATE_KEY: privateKey, GITHUB_APP_CONFIG: canonicalize({ issuer: "fixture", installationId: 1, registerScope: otherLane.scope, account, maxBytes: 1024 * 1024, privateRepositories: false, publicReads: true, credentialIdentity: "adapter-attempt" }) };
  const host = new Host(remote, "fixture");
  let posts = 0;
  const send = async (request: Request) => {
    const url = new URL(request.url);
    if (url.origin === "https://api.github.com") return new Response(JSON.stringify({ id: 71, name: "demo", owner: account, private: false, full_name: "site-owner/demo", html_url: "https://github.com/site-owner/demo", clone_url: "https://github.com/site-owner/demo.git" }), { headers: { "content-type": "application/json" } });
    expect(url.origin).toBe("https://github.com");
    const path = url.pathname.replace("/site-owner/demo.git", "/repo.git") + url.search;
    const headers = new Headers(request.headers); headers.set("authorization", "Bearer fixture");
    if (request.method === "POST") posts++;
    return host.upstream(new Request(`http://127.0.0.1${path}`, { method: request.method, headers, ...(request.method === "POST" ? { body: await request.arrayBuffer() } : {}) }));
  };
  const { site } = await vi.importActual<{ site: (request: Request, env: typeof settings, fetch: typeof send) => Promise<Response> }>("../../scope/src/site/route.ts");
  const response = await site(new Request(`https://scopes.test/site/${otherLane.scope}/HEAD/README.md`), settings, send);
  expect([response.status, await response.clone().text()]).toEqual([200, expect.any(String)]);
  expect(await response.text()).toContain("Long history");
  expect(posts).toBeGreaterThan(0);
});
