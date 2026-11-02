import { expect, test } from "vitest";
import { claudeCardDomain, remoteCardDomain, remoteCardOrigins } from "../src/views/remote-origins.ts";
import { CAPABILITIES_META, MODERN, PROTOCOL_META, McpHttp, McpService, Wire, memoryStore } from "../src/index.ts";
import { fixedSigner } from "./fixtures.ts";
import { digestBytes, utf8 } from "@generalbusiness/dap-bytes";

// Invariant: only exact configured connector URLs select remote presentation
// origins, with each vendor's format and Claude's literal URL hash.
test("remote card origins bind exact URLs and reject a partial or ambiguous policy", () => {
  const url = "https://example.com/mcp";
  const claude = { host: "claude", url, domain: "c3d80a4ed901ee05b21755a88273b4a4.claudemcpcontent.com" };
  const chatgpt = { host: "chatgpt", url: url + "?host=chatgpt", domain: "https://dap-plugin.example.com" };
  expect(claudeCardDomain(url)).toBe(claude.domain);
  expect(claudeCardDomain(url + "/")).not.toBe(claude.domain);
  const origins = remoteCardOrigins(JSON.stringify([claude, chatgpt]));
  expect(origins).toEqual([claude, chatgpt]);
  expect(remoteCardDomain(origins!, url)).toBe(claude.domain);
  expect(remoteCardDomain(origins!, chatgpt.url)).toBe(chatgpt.domain);
  expect(remoteCardDomain(origins!, url + "?host=claude")).toBeUndefined();
  expect(remoteCardOrigins(undefined)).toEqual([]);
  for (const value of [
    [claude, { ...chatgpt, url }], [claude, { ...claude, url: url + "?another" }],
    [{ ...claude, domain: "https://" + claude.domain }],
    [{ ...claude, url: url + "?changed" }],
    [{ ...chatgpt, domain: chatgpt.domain + "/path" }],
    [{ ...chatgpt, url: "https://user:secret@example.com/mcp" }],
    [{ ...chatgpt, url: url + "#fragment" }], [{ ...chatgpt, extra: true }],
  ]) expect(remoteCardOrigins(JSON.stringify(value)), JSON.stringify(value)).toBeNull();
  expect(remoteCardOrigins('{"host":"claude","host":"chatgpt"}')).toBeNull();
});

// Boundary stand-in: real HTTP/wire/resource code, no native room or provider.
test("concurrent remote hosts keep their own origins while stdio and unknown URLs declare none", async () => {
  const claudeUrl = "https://example.com/mcp?host=claude", chatgptUrl = "https://example.com/mcp?host=chatgpt";
  const origins = remoteCardOrigins(JSON.stringify([
    { host: "claude", url: claudeUrl, domain: claudeCardDomain(claudeUrl) },
    { host: "chatgpt", url: chatgptUrl, domain: "https://dap-plugin.example.com" },
  ]))!;
  const service = new McpService({ service: "https://example.com", signer: fixedSigner(67), custody: memoryStore(),
    config: { read: async () => { throw Error("Static resources read no native inventory."); }, addRoot: async () => {} },
    applicationReads: { revision: digestBytes(utf8("remote-resource-fixture")), tools: [] } });
  const wire = new Wire(service), http = new McpHttp({ wire, bodyBytes: 4096, authorized: () => true, mintSession: () => "unused",
    resourceDomain: request => remoteCardDomain(origins, request.url) });
  const params = { uri: "ui://dap/needs-you", _meta: { [PROTOCOL_META]: MODERN, [CAPABILITIES_META]: { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } } } };
  const message = { jsonrpc: "2.0" as const, id: 1, method: "resources/read", params };
  const read = async (url: string) => {
    const response = await http.handle(new Request(url, { method: "POST", headers: { "content-type": "application/json", "mcp-protocol-version": MODERN, "mcp-method": "resources/read" }, body: JSON.stringify(message) }));
    expect(response.status).toBe(200);
    return await response.json() as { result: { contents: { text: string; _meta: { ui: { domain?: string; csp: unknown } } }[] } };
  };
  try {
    const [claude, chatgpt, unknown] = await Promise.all([read(claudeUrl), read(chatgptUrl), read("https://example.com/mcp")]);
    expect(claude.result.contents[0]!._meta.ui.domain).toBe(claudeCardDomain(claudeUrl));
    expect(chatgpt.result.contents[0]!._meta.ui.domain).toBe("https://dap-plugin.example.com");
    expect(unknown.result.contents[0]!._meta.ui.domain).toBeUndefined();
    const stdio = (await wire.handle(message, null, () => {}))!.result as typeof claude.result;
    expect(stdio.contents[0]!._meta.ui.domain).toBeUndefined();
    expect(stdio.contents[0]!.text).toBe(claude.result.contents[0]!.text);
    expect(stdio.contents[0]!._meta.ui.csp).toEqual(claude.result.contents[0]!._meta.ui.csp);
  } finally { await http.closeAll(); wire.closeAll(); }
});
