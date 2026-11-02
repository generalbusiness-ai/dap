/** Actual routing; namespace/body traps are stand-ins, with no storage claim. */
import { expect, test } from "vitest";
import { mcpRoute } from "../src/worker.ts";

test("hosted MCP opt-in and valid additions precede namespace addressing and body reads", async () => {
  const namespace = { idFromName: () => { expect.fail("MCP opt-in must precede namespace addressing"); }, idFromString: () => { expect.fail("MCP opt-in must precede namespace addressing"); }, get: () => { expect.fail("MCP opt-in must precede namespace allocation"); } };
  for (const settings of [{}, { MCP_ENABLED: "false" }, { MCP_ENABLED: "true", MCP_TOOL_ADDITIONS: '["typo"]' }, { MCP_ENABLED: "true", MCP_TOOL_ADDITIONS: '["create","create"]' }, { MCP_ENABLED: "true", MCP_TOOL_ADDITIONS: "[" }, { MCP_ENABLED: "true", MCP_RESOURCE_URLS: '["http://room.test/mcp"]' }]) for (const path of ["/mcp", "/mcp/agents", `/mcp/agents/${"a".repeat(64)}/bearer`, "/.well-known/oauth-protected-resource/mcp"]) {
    const request = new Request(`https://room.test${path}`, { method: "POST", headers: { authorization: `Bearer ${"a".repeat(64)}.secret` }, body: "unread" });
    let bodyReads = 0;
    Object.defineProperty(request, "body", { get() { bodyReads++; expect.fail("MCP opt-in must precede body access"); } });
    const response = await mcpRoute(request, { ...settings, REGISTRIES: namespace, AGENTS: namespace } as unknown as Parameters<typeof mcpRoute>[1]);
    expect(response?.status).toBe(404);
    expect(bodyReads).toBe(0);
    expect(request.bodyUsed).toBe(false);
  }
  for (const bindings of [{}, { REGISTRIES: namespace }, { AGENTS: namespace }]) {
    const request = new Request("https://room.test/mcp/agents", { method: "POST", body: "unread" });
    expect((await mcpRoute(request, { MCP_ENABLED: "true", ...bindings } as unknown as Parameters<typeof mcpRoute>[1]))?.status).toBe(404);
    expect(request.bodyUsed).toBe(false);
  }
  const enabled = await mcpRoute(new Request("https://room.test/mcp"), { MCP_ENABLED: "true", REGISTRIES: namespace, AGENTS: namespace } as unknown as Parameters<typeof mcpRoute>[1]);
  expect(enabled?.status).toBe(401);
  const invalid = new Request("http://internal:8787/mcp/agents", { method: "POST", body: "unread" });
  Object.defineProperty(invalid, "body", { get() { expect.fail("Invalid public origin must precede body access"); } });
  const unavailable = await mcpRoute(invalid, { MCP_ENABLED: "true", PUBLIC_ORIGIN: "https://room.test/", REGISTRIES: namespace, AGENTS: namespace } as unknown as Parameters<typeof mcpRoute>[1]);
  expect([unavailable?.status, await unavailable!.json()]).toEqual([503, { error: "unavailable" }]);
  expect(invalid.bodyUsed).toBe(false);
});

test("protected-resource discovery and challenges bind the exact connector query without addressing an agent", async () => {
  const namespace = { idFromName: () => expect.fail("Discovery must not address a namespace"), idFromString: () => expect.fail("Missing authentication must not address an agent"), get: () => expect.fail("Discovery must not allocate an object") };
  const urls = ["https://room.test/mcp", "https://room.test/mcp?host=chatgpt&room=a%2Fb", "https://room.test/mcp?"];
  const settings = { MCP_ENABLED: "true", MCP_RESOURCE_URLS: JSON.stringify(urls), REGISTRIES: namespace, AGENTS: namespace } as unknown as Parameters<typeof mcpRoute>[1];
  for (const resource of urls) {
    const metadata = resource.replace("/mcp", "/.well-known/oauth-protected-resource/mcp");
    const response = await mcpRoute(new Request(metadata), settings);
    expect(response?.status).toBe(200);
    expect(await response!.json()).toEqual({ resource, authorization_servers: ["https://room.test"], scopes_supported: ["mcp"], bearer_methods_supported: ["header"] });
    for (const method of ["POST", "GET", "DELETE"]) {
      const request = new Request(resource, { method, ...(method === "POST" ? { body: "must stay unread" } : {}) });
      Object.defineProperty(request, "body", { get() { expect.fail("Challenge must precede body reads"); } });
      const challenge = await mcpRoute(request, settings);
      expect(challenge?.status).toBe(401);
      expect(challenge?.headers.get("www-authenticate")).toBe(`Bearer resource_metadata="${metadata}", scope="mcp"`);
      expect(request.bodyUsed).toBe(false);
    }
  }
  expect((await mcpRoute(new Request("https://room.test/.well-known/oauth-protected-resource/mcp?host=unknown"), settings))?.status).toBe(404);
  expect((await mcpRoute(new Request("https://room.test/.well-known/oauth-protected-resource/mcp", { method: "POST", body: "unread" }), settings))?.status).toBe(405);
  const local = await mcpRoute(new Request("http://127.0.0.1:8787/mcp"), { MCP_ENABLED: "true", REGISTRIES: namespace, AGENTS: namespace } as unknown as Parameters<typeof mcpRoute>[1]);
  expect(local?.status).toBe(401);
  expect(local?.headers.has("www-authenticate")).toBe(false);
  const proxied = { ...settings, PUBLIC_ORIGIN: "https://room.test" };
  const internal = new Request("http://internal:8787/.well-known/oauth-protected-resource/mcp?host=chatgpt&room=a%2Fb", { headers: { host: "untrusted.example", "x-forwarded-host": "untrusted.example" } });
  expect(await (await mcpRoute(internal, proxied))!.json()).toEqual({ resource: urls[1], authorization_servers: ["https://room.test"], scopes_supported: ["mcp"], bearer_methods_supported: ["header"] });
  const internalChallenge = await mcpRoute(new Request("http://internal:8787/mcp?host=chatgpt&room=a%2Fb"), proxied);
  expect(internalChallenge?.headers.get("www-authenticate")).toBe('Bearer resource_metadata="https://room.test/.well-known/oauth-protected-resource/mcp?host=chatgpt&room=a%2Fb", scope="mcp"');
});
