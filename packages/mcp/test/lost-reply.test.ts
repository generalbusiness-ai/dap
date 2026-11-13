import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, test } from "vitest";
import { b64url } from "@generalbusiness/dap-bytes";
import { secretSigner } from "@generalbusiness/dap-client";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { StandIn } from "./support/standin.ts";

// Real: the `dap mcp` process, its file custody under ARTROOM_HOME, SIGKILL by PID, the MCP client over stdio and loopback HTTP.
// STAND-IN: the scope service (test/support/standin.ts), so this proves custody and the wire, and no native judgment. The stand-in
// records the act, then holds the HTTP reply open until the process dies, so the kill falls after the send and before the reply.
const CLI = fileURLToPath(new URL("../../cli/bin/dap.js", import.meta.url));
const secret = new Uint8Array(32).fill(66);
let standIn: StandIn, server: Server, service: string, home: string;
let holding = true, arrived: () => void = () => {};
const posted: string[] = [];
const copyThenAct: string[] = [];

beforeAll(async () => {
  standIn = new StandIn(secretSigner(secret).key);
  server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk;
    const answer = await standIn.fetch(`http://scopes${req.url}`, { method: req.method ?? "GET", ...(body ? { body } : {}) });
    if (req.method === "POST" && req.url?.endsWith("/originals")) copyThenAct.push("POST originals");
    if (req.method === "POST" && req.url?.endsWith("/acts")) {
      copyThenAct.push("POST acts");
      posted.push(req.url);
      if (holding) { arrived(); req.socket.once("close", () => res.destroy()); return; }
    }
    res.writeHead(answer.status, { "content-type": "application/json" });
    const reader = (answer.body as unknown as ReadableStream<Uint8Array>).getReader();
    for (let read = await reader.read(); !read.done; read = await reader.read()) res.write(read.value);
    res.end();
  });
  service = await new Promise<string>(resolve => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as { port: number }).port}`)));
  home = mkdtempSync(join(tmpdir(), "mcp-lost-reply-"));
  mkdirSync(join(home, "keys"), { recursive: true });
  writeFileSync(join(home, "keys", "device.key"), `${b64url(secret)}\n`, { mode: 0o600 });
  writeFileSync(join(home, "config.json"), JSON.stringify({ v: 2, key: "device", ...standIn.config(), service }));
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  rmSync(home, { recursive: true, force: true });
});

const start = async () => {
  const client = new Client({ name: "lost-reply", version: "1" });
  client.onerror = () => {};
  const transport = new StdioClientTransport({ command: process.execPath, args: [CLI, "mcp", "--generic"], env: { ...process.env, ARTROOM_HOME: home } as Record<string, string>, stderr: "ignore" });
  await client.connect(transport);
  return { client, transport };
};

test("witness 3: with dap mcp killed after sending and before the reply, settle after a restart reports the outcome and nothing is sent twice", async () => {
  const key = "lost-reply-1";
  const first = await start();
  const sent = new Promise<void>(resolve => { arrived = resolve; });
  let answered = false;
  const pending = first.client.callTool({ name: "act", arguments: { target: "membership", kind: "set-role", digest: "platform:membership@2", on: 1, fields: { role: "member" }, idempotencyKey: key } })
    .then(() => { answered = true; }, () => {});
  await sent;
  expect(answered).toBe(false);
  // bin/dap.js waits on one child, which holds the server and its custody. Kill exactly that PID, and then its launcher exits.
  const launcher = first.transport.pid!;
  const server = execFileSync("pgrep", ["-P", String(launcher)], { encoding: "utf8" }).trim().split("\n").map(Number);
  expect(server).toHaveLength(1);
  process.kill(server[0]!, "SIGKILL");
  await first.transport.close();
  await pending;
  expect(answered).toBe(false);

  const kinds = () => [...standIn.scopes.values()].flatMap(scope => scope.entries).flatMap(sealed => sealed.entry.input.type === "act" && sealed.entry.input.signed.intent.idempotencyKey === key ? [sealed.entry.seq] : []);
  const recorded = kinds();
  expect(recorded).toHaveLength(1);
  expect(posted).toHaveLength(1);
  // A person's `dap mcp` keeps the copy before it sends. The stand-in's copy route runs no rule.
  expect(copyThenAct).toEqual(["POST originals", "POST acts"]);

  holding = false;
  const second = await start();
  try {
    const settled = (await second.client.callTool({ name: "settle", arguments: { target: "membership", idempotencyKey: key } })).structuredContent as { answer: string; phase: string; fact?: { seq: number } };
    expect([settled.answer, settled.phase, settled.fact?.seq]).toEqual(["accepted", "accepted", recorded[0]]);
    expect(posted).toHaveLength(1);
    // The same act under the same key returns the kept outcome, and sends nothing.
    const repeated = (await second.client.callTool({ name: "act", arguments: { target: "membership", kind: "set-role", digest: "platform:membership@2", on: 1, fields: { role: "member" }, idempotencyKey: key } })).structuredContent as { answer: string; fact: { seq: number } };
    expect([repeated.answer, repeated.fact.seq]).toEqual(["accepted", recorded[0]]);
    expect(posted).toHaveLength(1);
    expect(kinds()).toEqual(recorded);
    // `dap mcp` wires the Git read of `diff`. The stand-in's remote is unreachable, so the read fails after it spends the credential.
    const token = (await second.client.callTool({ name: "act", arguments: { target: "destination", kind: "read-token", digest: "platform:destination@3", on: 0, fields: { hours: 1 }, idempotencyKey: "lost-reply-token" } })).structuredContent as { answer: string; fact: { seq: number } };
    expect(token.answer).toBe("accepted");
    const diff = await second.client.callTool({ name: "diff", arguments: { entry: token.fact.seq, base: "a".repeat(40), integration: "b".repeat(40) } });
    expect(diff.isError).toBe(true);
    const said = diff.structuredContent as { error: string; message: string };
    expect([said.error, said.message.includes("The one-time credential is spent."), said.message.includes("no Git reader")]).toEqual(["diff", true, false]);
  } finally { await second.client.close(); }
}, 60_000);
