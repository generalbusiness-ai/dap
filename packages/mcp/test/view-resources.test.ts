import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { LEGACY, MODERN, McpService, ViewResources, Wire, memoryStore, newSession, type PresentationPackage } from "../src/index.ts";
import { sandboxDomain } from "../src/views/hosts.ts";
import { PRESENTATION } from "../src/views/generated.ts";
import { MODULE, viewModule } from "../scripts/views.mjs";
import { StandIn, SERVICE } from "./support/standin.ts";
import { fixedSigner } from "./fixtures.ts";

// Invariant: each wire serves the actual single-file package bytes with its policy; corrupt bytes are never served.
test("both MCP revisions serve package-checked resources and preserve declared policy", async () => {
  const fixture: PresentationPackage = { domain: "policy-fixture", resources: [{ uri: "ui://fixture/card", name: "fixture", description: "A policy fixture", text: "<!doctype html><p>fixture</p>", digest: digestBytes(utf8("<!doctype html><p>fixture</p>")), ui: { csp: { connectDomains: ["https://data.example"], resourceDomains: ["https://assets.example"], frameDomains: ["https://frames.example"], baseUriDomains: ["https://base.example"] }, permissions: { camera: {} }, prefersBorder: false } }] };
  const signer = fixedSigner(11);
  for (const version of [LEGACY, MODERN]) {
    const service = new McpService({ service: "https://scopes.test", signer, custody: memoryStore(), config: { read: async () => ({ service: "https://scopes.test" }), addRoot: async () => {} }, presentation: fixture });
    const wire = new Wire(service), session = newSession(null);
    const meta = version === MODERN ? { _meta: { "io.modelcontextprotocol/protocolVersion": MODERN, "io.modelcontextprotocol/clientCapabilities": {} } } : {};
    const rpc = (method: string, params = {}) => wire.handle({ jsonrpc: "2.0", id: 1, method, params: { ...params, ...meta } }, version === LEGACY ? session : null, () => {});
    if (version === LEGACY) {
      await rpc("initialize", { protocolVersion: LEGACY, capabilities: {}, clientInfo: { name: "resource-fixture", version: "1" } });
      await wire.handle({ jsonrpc: "2.0", method: "notifications/initialized" }, session, () => {});
    }
    const listing = await rpc("resources/list");
    expect(listing?.error, version).toBeUndefined();
    const listed = listing!.result as { resources: Record<string, unknown>[] };
    expect(listed.resources).toHaveLength(1);
    const read = (await rpc("resources/read", { uri: fixture.resources[0]!.uri }))!.result as { contents: { text: string; mimeType: string; _meta: unknown }[] };
    expect(read.contents[0]).toEqual({ uri: "ui://fixture/card", mimeType: "text/html;profile=mcp-app", text: fixture.resources[0]!.text, _meta: { ui: { ...fixture.resources[0]!.ui, domain: "policy-fixture.inguz.space" } } });
    expect(listed.resources[0]!["_meta"]).toEqual(read.contents[0]!._meta);
    wire.endLegacy(session);
    wire.closeAll();
  }
  const immutable = new ViewResources(fixture);
  fixture.resources[0]!.text += " changed";
  expect(immutable.read("ui://fixture/card").contents[0]!.text).not.toContain("changed");
  expect(() => new ViewResources(fixture).read("ui://fixture/card")).toThrow("package digest");
  const domain = sandboxDomain(undefined, immutable.generation);
  expect(domain).toMatch(/^[a-z2-7]{52}\.inguz\.space$/);
  expect(() => sandboxDomain("invalid.example", immutable.generation)).toThrow("DNS label");
});

// Invariant: every byte served by the production resources is rebuilt from the current browser inputs.
test("the four production resources are fresh self-contained HTML", async () => {
  expect(await readFile(MODULE, "utf8")).toBe(await viewModule());
  const resources = new ViewResources(PRESENTATION);
  expect(resources.list().resources.map((resource) => resource.uri)).toEqual(["ui://dap/needs-you", "ui://dap/work", "ui://dap/decision", "ui://dap/change"]);
  for (const resource of resources.list().resources) {
    const html = resources.read(resource.uri).contents[0]!.text;
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).not.toMatch(/<(script|link)[^>]+(?:src|href)=/i);
    expect(resource._meta.ui.csp).toEqual({});
  }
});

// Invariant: capability negotiation changes the listed surface and cursor profile, not native authority or private data.
test("both revisions provide text fallback and bind paging to the host's UI capability", async () => {
  const signer = fixedSigner(12);
  const standIn = new StandIn(signer.key); // Scripted inventory, not a native authority witness.
  const service = new McpService({ service: SERVICE, signer, fetch: standIn.fetch, config: { read: async () => standIn.config(), addRoot: async () => {} }, custody: memoryStore(), listPageBytes: 4096, views: { read: async () => ({ status: "empty", position: 0, count: 0, fallback: "Nothing needs you." }) } });
  const capable = { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } };
  for (const version of [LEGACY, MODERN]) for (const ui of [false, true]) {
    const wire = new Wire(service), session = newSession(null), capabilities = ui ? capable : {};
    const rpc = (method: string, params: Record<string, unknown> = {}) => wire.handle({ jsonrpc: "2.0", id: 1, method, params: { ...params, ...(version === MODERN ? { _meta: { "io.modelcontextprotocol/protocolVersion": MODERN, "io.modelcontextprotocol/clientCapabilities": capabilities } } : {}) } }, version === LEGACY ? session : null, () => {});
    try {
      if (version === LEGACY) {
        await rpc("initialize", { protocolVersion: LEGACY, capabilities, clientInfo: { name: "profile-fixture", version: "1" } });
        await wire.handle({ jsonrpc: "2.0", method: "notifications/initialized" }, session, () => {});
      }
      const tools: { name: string; _meta?: { ui?: { resourceUri?: string } } }[] = [];
      let cursor: string | undefined;
      do {
        const answer = await rpc("tools/list", cursor ? { cursor } : {});
        expect(answer?.error).toBeUndefined();
        const page = answer!.result as { tools: typeof tools; nextCursor?: string };
        tools.push(...page.tools); cursor = page.nextCursor;
      } while (cursor);
      expect(tools.some((tool) => tool.name === "view_read")).toBe(ui);
      expect(tools.some((tool) => tool.name === "view_act")).toBe(ui);
      const opening = tools.find((tool) => tool.name === "view_needs_you")!;
      expect(opening._meta?.ui?.resourceUri).toBe(ui ? "ui://dap/needs-you" : undefined);
      const fallback = (await rpc("tools/call", { name: "view_needs_you", arguments: { view: `${version}-${ui}` } }))!.result as { content: { text: string }[] };
      expect(fallback.content[0]!.text).toContain("0 items");
      if (version === LEGACY) expect(session.listed).toBe((await service.snapshot()).generation);
    } finally { wire.endLegacy(session); wire.closeAll(); }
  }
  const first = await service.page(undefined, true);
  expect(first.nextCursor).toBeTruthy();
  await expect(service.page(first.nextCursor, false)).rejects.toThrow("list changed");
});
