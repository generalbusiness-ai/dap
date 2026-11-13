/** A retired custody store reaches the caller as a named refusal. The client
 * custody test covers the store itself; this case covers the MCP answer. */
import { mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { fileStore } from "@generalbusiness/dap-client/node";
import { McpService } from "../src/index.ts";
import { fixedSigner } from "./fixtures.ts";

test("a call on a retired custody store answers store-retired and reads no record", async () => {
  const old = mkdtempSync(join(tmpdir(), "mcp-format1-"));
  mkdirSync(join(old, "records"));
  const names = readdirSync(old).sort();
  let callbacks = 0;
  const retired = fileStore(old);
  const config = { read: async () => { await retired.read("0".repeat(64)); return { service: "TEST-service" }; }, addRoot: async () => { callbacks++; } };
  const service = new McpService({ service: "TEST-service", signer: fixedSigner(7), custody: retired, config,
    fetch: async () => { callbacks++; throw new Error("TEST no network after store retirement"); } });
  const named = await service.call("TEST-store-format", {});
  expect(named.isError).toBe(true);
  expect(named.structuredContent).toMatchObject({ error: "store-retired", reason: "retired", message: expect.stringContaining("retired room format") });
  expect(callbacks).toBe(0);
  expect(readdirSync(old).sort()).toEqual(names);
});
