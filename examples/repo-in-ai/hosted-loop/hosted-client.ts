/** The pinned MCP client over one Worker's /mcp. It keeps the service origin and the bearer, and nothing else. */
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { stop } from "./words.ts";
import type { ListedTool, McpPort } from "./hosted-session.ts";

export type AgentFetch = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** The agent's only road out: POST, GET and DELETE of `<service>/mcp`. Any other address is a bypass read, and it stops the phase. */
export function agentFetch(service: string, fetcher: AgentFetch = globalThis.fetch): AgentFetch {
  const allowed = service + "/mcp";
  return async (url, init) => {
    const given = url instanceof Request ? url.url : String(url);
    if (given !== allowed) return stop("bypass-read");
    return fetcher(given, { ...init, redirect: "error" });
  };
}

/** A new session: a new client, a new `initialize` and a new session ID under the 2025-11-25 revision. */
export async function openHosted(service: string, bearer: string, fetcher: AgentFetch = globalThis.fetch): Promise<McpPort> {
  const client = new Client({ name: "dap-hosted-loop", version: "1" });
  const transport = new StreamableHTTPClientTransport(new URL(service + "/mcp"), { requestInit: { headers: { authorization: `Bearer ${bearer}` } }, fetch: agentFetch(service, fetcher) } as never);
  await client.connect(transport as never);
  return {
    listTools: async cursor => {
      const listed = await client.listTools(cursor === undefined ? {} : { cursor });
      return { tools: listed.tools as unknown as ListedTool[], ...(listed.nextCursor ? { nextCursor: listed.nextCursor } : {}) };
    },
    getPrompt: async (name, args) => (await client.getPrompt({ name, arguments: args })) as never,
    callTool: async (name, args) => (await client.callTool({ name, arguments: args })) as never,
    sessionId: () => (transport as unknown as { sessionId?: string }).sessionId ?? null,
    // The server's retained session ends with the client's DELETE, so a later phase opens a session that this one did not leave open.
    close: async () => { await (transport as unknown as { terminateSession?: () => Promise<void> }).terminateSession?.().catch(() => {}); await client.close(); },
  };
}
