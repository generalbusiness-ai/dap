import { expect, test } from "vitest";
import { configuredMcpResources, hostedMcpResources, isMcpResource, mcpUnauthorized, resourceChallenge, resourceMetadataUrl } from "../src/oauth-resource.ts";
import { claudeCardDomain } from "../src/views/remote-origins.ts";

test("resource identity keeps each host's complete query, including an empty query", () => {
  const bare = "https://example.com/mcp", empty = bare + "?", host = bare + "?host=chatgpt&room=a%2Fb";
  expect(configuredMcpResources(JSON.stringify([bare, empty, host]))).toEqual([bare, empty, host]);
  expect(resourceMetadataUrl(host)).toBe("https://example.com/.well-known/oauth-protected-resource/mcp?host=chatgpt&room=a%2Fb");
  expect(resourceMetadataUrl(empty)).toBe("https://example.com/.well-known/oauth-protected-resource/mcp?");
  expect(resourceChallenge(bare + "?q=\\")).toBe('Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource/mcp?q=\\\\", scope="mcp"');
  expect(resourceChallenge(host)).toBe('Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource/mcp?host=chatgpt&room=a%2Fb", scope="mcp"');
  expect(resourceChallenge(host, true)).toContain(', error="invalid_token"');
  expect(hostedMcpResources({}, "https://example.com")).toEqual([bare]);
  expect(hostedMcpResources({}, "http://127.0.0.1:8787")).toEqual([]);
  const cards = JSON.stringify([{ host: "claude", url: host, domain: claudeCardDomain(host) }]);
  expect(hostedMcpResources({ MCP_CARD_ORIGINS: cards }, "https://example.com")).toBeNull();
  expect(hostedMcpResources({ MCP_CARD_ORIGINS: cards, MCP_RESOURCE_URLS: JSON.stringify([host]) }, "https://example.com")).toEqual([host]);
});

test("the challenge distinguishes absent credentials from an invalid supplied token", () => {
  const url = "https://example.com/mcp?host=chatgpt";
  const missing = mcpUnauthorized(new Request(url));
  expect(missing.status).toBe(401);
  expect(missing.headers.get("www-authenticate")).toBe(resourceChallenge(url));
  const invalid = mcpUnauthorized(new Request(url, { headers: { authorization: "Bearer invalid" } }));
  expect(invalid.headers.get("www-authenticate")).toBe(resourceChallenge(url, true));
  expect(mcpUnauthorized(new Request("http://127.0.0.1:8787/mcp")).headers.has("www-authenticate")).toBe(false);
});

test("a malformed or ambiguous resource setting admits no partial list", () => {
  const valid = "https://example.com/mcp";
  for (const resource of ["http://example.com/mcp", "https://user:secret@example.com/mcp", valid + "#", valid + "#fragment", valid + "/", "https://EXAMPLE.com/mcp", "https://example.com:443/mcp", "https://example.com/other", " " + valid, valid + "?q=" + "x".repeat(2048)]) {
    expect(isMcpResource(resource), resource.slice(0, 100)).toBe(false);
    expect(configuredMcpResources(JSON.stringify([valid, resource]))).toBeNull();
  }
  for (const setting of ["null", "{}", "[", JSON.stringify([valid, valid]), JSON.stringify(Array.from({ length: 9 }, (_, n) => valid + "?n=" + n)), JSON.stringify([valid, 3])]) expect(configuredMcpResources(setting)).toBeNull();
  expect(configuredMcpResources(undefined)).toBeUndefined();
});
