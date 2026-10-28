/** Actual routing; namespace/body traps are stand-ins, with no storage claim. */
import { expect, test } from "vitest";
import { mcpRoute } from "../src/worker.ts";

test("hosted MCP opt-in and valid additions precede namespace addressing and body reads", async () => {
  const namespace = { idFromName: () => { expect.fail("MCP opt-in must precede namespace addressing"); }, idFromString: () => { expect.fail("MCP opt-in must precede namespace addressing"); }, get: () => { expect.fail("MCP opt-in must precede namespace allocation"); } };
  for (const settings of [{}, { MCP_ENABLED: "false" }, { MCP_ENABLED: "true", MCP_TOOL_ADDITIONS: '["typo"]' }, { MCP_ENABLED: "true", MCP_TOOL_ADDITIONS: '["create","create"]' }, { MCP_ENABLED: "true", MCP_TOOL_ADDITIONS: "[" }]) for (const path of ["/mcp", "/mcp/agents", `/mcp/agents/${"a".repeat(64)}/bearer`]) {
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
