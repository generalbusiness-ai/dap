/** Test-only wire oracle. Admitted UI shapes come from pinned upstream JSON
 * schemas, never dap's browser types or the scripted host's handlers. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { z } from "zod/v4";
import { CallToolRequestSchema, JSONRPCMessageSchema, JSONRPCNotificationSchema, JSONRPCRequestSchema } from "@modelcontextprotocol/core";

export type AppRevision = "2025-11-21" | "2026-01-26";
type Record_ = Record<string, unknown>;
const current = "2026-01-26";
const digests: Record<AppRevision, string> = {
  "2025-11-21": "0cf806f95572908e472a68baba92a5a5b351af2c28703bff40563b897f73bae9",
  "2026-01-26": "3823abdec2ab00069420812520c20f561428e1bf328c8f61189094f5160e33d9",
};
const record = (value: unknown): value is Record_ => typeof value === "object" && value !== null && !Array.isArray(value);
type Definition = { name: string; schema: Record_ };
const definitions = new Map<AppRevision, Map<string, Definition>>();
const validators = new Map<Definition, z.ZodType>();

function contracts(revision: AppRevision): Map<string, Definition> {
  const existing = definitions.get(revision);
  if (existing) return existing;
  const bytes = readFileSync(new NodeURL(`./mcp-apps-upstream/${revision}.schema.json`, import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), digests[revision], "Independent MCP contract: the unmodified upstream schema must match its pinned digest");
  const root = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes)) as { $defs: Record<string, Record_> };
  const methods = new Map<string, Definition>();
  for (const [name, schema] of Object.entries(root.$defs)) {
    const properties = schema["properties"];
    const method = record(properties) && properties["method"];
    const literal = record(method) && method["const"];
    if (typeof literal !== "string") continue;
    assert.equal(methods.has(literal), false, `Independent MCP contract: ambiguous upstream method ${literal}`);
    methods.set(literal, { name, schema });
  }
  definitions.set(revision, methods);
  return methods;
}

function validate(definition: Definition, value: unknown): void {
  let validator = validators.get(definition);
  if (!validator) {
    validator = z.fromJSONSchema(definition.schema);
    validators.set(definition, validator);
  }
  const result = validator.safeParse(value);
  assert.equal(result.success, true, `INDEPENDENT MCP CONTRACT ${definition.name}: ${result.success ? "" : JSON.stringify(result.error.issues)}`);
}

/** A newer optional request is not declared by the older contract. It can
 * appear in a legacy-host specimen only with an actual method-not-found reply;
 * that records a refused extension, not older-revision conformance. */
export function assertAppMessages(messages: readonly unknown[], revision: AppRevision, hostReplies: readonly unknown[] = []) {
  const methods = contracts(revision), counts: Record<string, number> = {}, refusedExtensions: string[] = [];
  for (const value of messages) {
    const envelope = JSONRPCMessageSchema.safeParse(value);
    assert.equal(envelope.success, true, "INDEPENDENT MCP CONTRACT: outbound JSON-RPC envelope");
    assert.ok(record(value));
    const method = value["method"];
    if (method === undefined) continue; // The core oracle already checked the response.
    assert.equal(typeof method, "string");
    const name = method as string;
    counts[name] = (counts[name] ?? 0) + 1;
    const params = Object.hasOwn(value, "params") ? { params: value["params"] } : {};
    if (name === "tools/call") {
      assert.equal(CallToolRequestSchema.safeParse({ method: name, ...params }).success, true, "INDEPENDENT MCP CONTRACT: MCP tools/call payload");
      assert.equal(JSONRPCRequestSchema.safeParse(value).success, true, "INDEPENDENT MCP CONTRACT: tools/call request identity");
      continue;
    }
    const offered = name === "ui/initialize" && record(value["params"]) ? value["params"]["protocolVersion"] : undefined;
    if (name === "ui/initialize") assert.ok(offered === current || offered === "2025-11-21", "INDEPENDENT MCP CONTRACT: the offered revision has a pinned schema");
    // The initial offer precedes the host's negotiated reply.
    let definition = offered === current || offered === "2025-11-21" ? contracts(offered).get(name) : methods.get(name);
    if (!definition && revision !== current) {
      definition = contracts(current).get(name);
      assert.ok(definition, `INDEPENDENT MCP CONTRACT: no pinned schema for ${name}`);
      const refusal = hostReplies.find(reply => record(reply) && reply["id"] === value["id"] && record(reply["error"]) && reply["error"]["code"] === -32601);
      assert.ok(refusal, `INDEPENDENT MCP CONTRACT: ${name} is outside ${revision}; require an observed method-not-found reply`);
      refusedExtensions.push(name);
    }
    assert.ok(definition, `INDEPENDENT MCP CONTRACT: no pinned schema for ${name}`);
    validate(definition, { method: name, ...params });
    const kind = definition.name.endsWith("Notification") ? JSONRPCNotificationSchema : JSONRPCRequestSchema;
    assert.equal(kind.safeParse(value).success, true, `INDEPENDENT MCP CONTRACT: ${definition.name} request/notification identity`);
    if (definition.name.endsWith("Notification")) assert.equal(Object.hasOwn(value, "id"), false, `INDEPENDENT MCP CONTRACT: ${name} must not request a reply`);
  }
  return { revision, counts, refusedExtensions };
}
