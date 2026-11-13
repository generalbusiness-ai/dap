/**
 * Witness (NF-4): the real `dap` command installs an application in a room and reads the installation, and no MCP module loads.
 *
 * Real: the `dap` launcher and its Node process, `main.ts`, the files under ARTROOM_HOME (key, configuration and request custody),
 * the client's install request and installation read, the public HTTPS Git reader, and every module the command loads.
 * STAND-IN: the room and the Git host of `../../mcp/test/support/install-room.ts`. A preload in the child process rewrites the package host's HTTPS URL to the test's loopback listener and records each
 * loaded module URL. The stand-in judges nothing, so this proves which modules the
 * command loads and what it sends and reads. The native judgment of an install is the scope stories' witness.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, test } from "vitest";
import { b64url } from "@generalbusiness/dap-bytes";
import { secretSigner } from "@generalbusiness/dap-client";
import { GIT_HOST, installRoom, type InstallRoom } from "../../mcp/test/support/install-room.ts";

const CLI = fileURLToPath(new URL("../bin/dap.js", import.meta.url));
const secret = new Uint8Array(32).fill(71);
let server: Server, service: string, home: string, scratch: string, room: InstallRoom;

async function body(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk as Uint8Array);
  return Buffer.concat(chunks);
}

beforeAll(async () => {
  room = await installRoom(secretSigner(secret).key);
  server = createServer(async (req, res) => {
    const bytes = await body(req), path = req.url ?? "/";
    if (path.startsWith("/__git/")) {
      expect(req.headers["authorization"]).toBeUndefined(); expect(req.headers["cookie"]).toBeUndefined();
      const answer = room.git(req.method ?? "GET", path.slice("/__git/".length), bytes);
      res.writeHead(answer.status, answer.headers); res.end(answer.body); return;
    }
    const reply = await room.fetch(`http://scopes${path}`, { method: req.method ?? "GET", ...(bytes.length ? { body: new TextDecoder().decode(bytes) } : {}) });
    res.writeHead(reply.status, { "content-type": "application/json" });
    const stream = reply.body as unknown as ReadableStream<Uint8Array> | null;
    if (stream) { const reader = stream.getReader(); for (let read = await reader.read(); !read.done; read = await reader.read()) res.write(read.value); }
    res.end();
  });
  service = await new Promise<string>(resolve => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as { port: number }).port}`)));

  scratch = mkdtempSync(join(tmpdir(), "cli-install-without-mcp-"));
  home = join(scratch, "home");
  mkdirSync(join(home, "keys"), { recursive: true });
  writeFileSync(join(home, "keys", "device.key"), `${b64url(secret)}\n`, { mode: 0o600 });
  writeFileSync(join(home, "config.json"), JSON.stringify({ v: 2, key: "device", service, repository: room.repository }));
  // The child's preload: record every module URL it loads, and send the package host's HTTPS requests to the loopback peer.
  writeFileSync(join(scratch, "preload.mjs"), `import { registerHooks } from "node:module";
import { appendFileSync } from "node:fs";
registerHooks({ load(url, context, next) { appendFileSync(process.env.TEST_MODULES, url + "\\n"); return next(url, context); } });
const original = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const request = new Request(input, init);
  if (!request.url.startsWith(${JSON.stringify(GIT_HOST)})) return original(input, init);
  // The reader checks that a reply comes from the URL it asked, so the reply leaves the loopback URL behind, as a proxy's would.
  return original(new Request(process.env.TEST_GIT + request.url.slice(${GIT_HOST.length}), request)).then(reply => new Response(reply.body, { status: reply.status, headers: reply.headers }));
};
`);
});

// The scratch directory stays in the system temporary directory, which the host clears.
afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
});

/** One real `dap` process. It runs asynchronously, so this process's listener answers it. */
async function dap(argv: readonly string[], modules: string, trust = room.trust) {
  writeFileSync(modules, "");
  const child = spawn(process.execPath, [CLI, ...argv], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env,
    ARTROOM_HOME: home, APPLICATION_TRUST: trust, TEST_MODULES: modules, TEST_GIT: `${service}/__git/`,
    NODE_OPTIONS: `${process.env["NODE_OPTIONS"] ?? ""} --import ${join(scratch, "preload.mjs")}`.trim() } });
  let out = "", err = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => { out += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => { err += chunk; });
  const code = await new Promise<number | null>(resolve => child.on("close", resolve));
  return { code, out: out.trim().split("\n"), err, modules: readFileSync(modules, "utf8").trim().split("\n") };
}

const mcpModule = (url: string) => /\/packages\/mcp\/|\/@generalbusiness\/dap-mcp\/|\/node_modules\/@modelcontextprotocol\//.test(url);

test("dap installs an application in a room and reads the installation, and loads no MCP module", { timeout: 120_000 }, async () => {
  const installed = await dap(["install", room.uri, "--release", room.release, "--request", "TEST-nf4-install"], join(scratch, "install-modules.txt"));
  expect(installed.code, installed.err).toBe(0);
  const item = room.stand.scopes.get(room.rules.scope)!.items.find(found => found.type === "installation")?.id;
  expect(item).toBeTypeOf("number");
  expect(installed.out).toEqual([`Install request recorded: item ${item}.`, `Read its result with: dap application ${item}`,
    "Acceptance records the request. Native fetch, admission, grants and creation may still be pending or refused."]);
  expect(room.wants.length).toBeGreaterThan(0);
  expect(room.stand.requests.filter(request => request === `POST /v1/scopes/${room.rules.scope}/acts`)).toHaveLength(1);
  // The request rests in the custody directory that `dap mcp` shares, accepted.
  const records = readdirSync(join(home, "private", "mcp-custody", "records"));
  expect(records).toHaveLength(1);
  expect(JSON.parse(readFileSync(join(home, "private", "mcp-custody", "records", records[0]!), "utf8"))).toMatchObject({ phase: "accepted" });

  const read = await dap(["application", String(item)], join(scratch, "read-modules.txt"));
  expect(read.code, read.err).toBe(0);
  expect(read.out).toEqual([`Application install ${item}: pending (fetch).`]);

  for (const run of [installed, read]) {
    // The recorder saw the command's own modules, including the client's install entry.
    expect(run.modules.some(url => url.endsWith("/packages/cli/src/main.ts"))).toBe(true);
    expect(run.modules.some(url => url.endsWith("/packages/client/src/install-request.ts"))).toBe(true);
    expect(run.modules.filter(mcpModule)).toEqual([]);
  }
});

// The command line writes its own short lines now. Each changed line is in notes/implementation/2026-11-12-nf4-cli-install.md.
test("dap refuses an untrusted release in its own words, and fetches, signs and sends nothing", { timeout: 60_000 }, async () => {
  const posts = room.stand.requests.filter(request => request.endsWith("/acts")).length, wanted = room.wants.length;
  const refused = await dap(["install", room.uri, "--release", room.release, "--request", "TEST-nf4-untrusted"], join(scratch, "untrusted-modules.txt"), "[]");
  expect([refused.code, refused.err.trimEnd()]).toEqual([1, "APPLICATION_TRUST does not list this release and Git host. This command fetched, signed and sent nothing."]);
  expect([room.stand.requests.filter(request => request.endsWith("/acts")).length, room.wants.length]).toEqual([posts, wanted]);
  expect(refused.modules.filter(mcpModule)).toEqual([]);
});
