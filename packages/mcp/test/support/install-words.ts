/**
 * What `install_application` and `application_installation` return to MCP for each refusal and outcome of the client's install
 * request and installation read. Each case calls a real `McpService` over the stand-in room of `install-room.ts`. The cases use
 * only the service's public calls, so the same module runs against any MCP revision with that call surface.
 */
import { TransportError } from "@generalbusiness/dap-client";
import { McpService, memoryStore } from "../../src/index.ts";
import type { ServerPort as McpServerPort } from "../../src/service.ts";
import { fixedSigner } from "../fixtures.ts";
import { installRoom, type InstallRoom } from "./install-room.ts";

type Said = { isError: boolean | undefined; structuredContent: Record<string, unknown> };
const head = { seq: 41, hash: `sha256:${"c".repeat(64)}` } as const;
const other = `sha256:${"0".repeat(64)}`;
const json = (body: unknown) => ({ status: 200, body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(JSON.stringify(body))); c.close(); } }) as never });

async function service(change: (room: InstallRoom, port: McpServerPort) => McpServerPort | void = () => {}): Promise<{ room: InstallRoom; mcp: McpService }> {
  const signer = fixedSigner(31), room = await installRoom(signer.key);
  const port: McpServerPort = { service: room.stand.config().service, signer, custody: memoryStore(), now: () => Date.parse("2099-01-01T00:00:00Z"), fetch: room.fetch,
    config: { read: async () => room.stand.config(), addRoot: async () => { throw Error("must not grant a root"); } },
    applicationTrust: room.trust, applicationFetch: room.applicationFetch };
  return { room, mcp: new McpService(change(room, port) ?? port) };
}

const said = async (mcp: McpService, tool: string, args: Record<string, unknown>): Promise<Said> => {
  const result = await mcp.call(tool, args);
  return { isError: result.isError, structuredContent: result.structuredContent };
};
const install = (room: InstallRoom, change: Record<string, unknown> = {}) => ({ uri: room.uri, release: room.release, roles: [], values: {}, idempotencyKey: "words", ...change });

/** Each case's name and the exact result MCP returns. */
export async function installWords(): Promise<Record<string, Said>> {
  const words: Record<string, Said> = {};
  const run = async (name: string, change: Parameters<typeof service>[0], call: (room: InstallRoom, mcp: McpService) => Promise<Said>) => {
    const { room, mcp } = await service(change);
    words[name] = await call(room, mcp);
  };
  await run("key", undefined, (room, mcp) => said(mcp, "install_application", install(room, { idempotencyKey: "" })));
  await run("unconfigured", (_room, port) => ({ ...port, config: { ...port.config, read: async () => ({ service: port.service }) } }), (room, mcp) => said(mcp, "install_application", install(room)));
  await run("room-siblings", (room, port) => ({ ...port, config: { ...port.config, read: async () => ({ ...room.stand.config(), repository: { ...room.stand.config().repository!, rules: room.destination.scope } }) } }),
    (room, mcp) => said(mcp, "install_application", install(room)));
  await run("rules-sibling", room => { room.stand.scopes.get(room.rules.scope)!.definition = "platform:rules@2"; }, (room, mcp) => said(mcp, "install_application", install(room)));
  await run("read", (room, port) => ({ ...port, fetch: async (url, init) => new URL(url).pathname === `/v1/scopes/${room.directory.scope}` ? json({ ok: false, reason: "forbidden" }) : room.fetch(url, init) }),
    (room, mcp) => said(mcp, "install_application", install(room)));
  await run("installation", undefined, (room, mcp) => said(mcp, "install_application", install(room, { uri: "https://git.example/packages.git" })));
  await run("trust", (_room, port) => ({ ...port, applicationTrust: "[]" }), (room, mcp) => said(mcp, "install_application", install(room)));
  await run("unavailable", (_room, port) => ({ ...port, applicationFetch: async () => new Response(null, { status: 404 }) }), (room, mcp) => said(mcp, "install_application", install(room)));
  await run("sha256", undefined, (room, mcp) => said(mcp, "install_application", install(room, { uri: room.uri.replace(/@[0-9a-f]{40}\//, `@${"a".repeat(64)}/`) })));
  await run("package", (room, port) => ({ ...port, applicationTrust: JSON.stringify([{ ...JSON.parse(room.trust)[0], release: other }]) }), (room, mcp) => said(mcp, "install_application", install(room, { release: other })));
  await run("unknown-tool", (_room, port) => ({ ...port, mode: "add", tools: ["membership"] }), (room, mcp) => said(mcp, "install_application", install(room)));
  await run("lost", (room, port) => ({ ...port, fetch: async (url, init) => { if (init?.method === "POST" && url.endsWith("/acts")) throw new TransportError("scripted lost install reply"); return room.fetch(url, init); } }),
    (room, mcp) => said(mcp, "install_application", install(room)));
  await run("refused", room => { room.stand.answers.set("install-application", () => ({ answer: "refused", reason: "guard-failed", judgedAt: head })); }, (room, mcp) => said(mcp, "install_application", install(room)));
  await run("receipt", room => {
    room.stand.answers.set("install-application", signed => {
      const rules = room.stand.scopes.get(room.rules.scope)!, sealed = room.stand.append(rules, { type: "act", signed, authority: [], presented: {} } as never);
      return { answer: "accepted", receipt: { ...room.stand.receipt(rules, sealed), intent: other } } as never;
    });
  }, (room, mcp) => said(mcp, "install_application", install(room)));
  await run("accepted", undefined, async (room, mcp) => {
    const accepted = await said(mcp, "install_application", install(room));
    words["installation"] = await said(mcp, "application_installation", { item: accepted.structuredContent["item"] });
    words["repeat"] = await said(mcp, "install_application", install(room));
    return accepted;
  });
  await run("item", undefined, (_room, mcp) => said(mcp, "application_installation", { item: "x" }));
  await run("installation-unavailable", undefined, (_room, mcp) => said(mcp, "application_installation", { item: 999 }));
  await run("installation-read", (room, port) => ({ ...port, fetch: async (url, init) => new URL(url).pathname.endsWith("/query-items") ? json({ ok: false, reason: "forbidden" }) : room.fetch(url, init) }),
    (_room, mcp) => said(mcp, "application_installation", { item: 1 }));
  await run("installation-unconfigured", (_room, port) => ({ ...port, config: { ...port.config, read: async () => ({ service: port.service }) } }), (_room, mcp) => said(mcp, "application_installation", { item: 1 }));
  return words;
}
