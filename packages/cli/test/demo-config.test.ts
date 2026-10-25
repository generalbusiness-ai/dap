/** Source config boundary; no Wrangler invocation or deployment proof. */
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
const read = (name: string) => JSON.parse(readFileSync(new URL(`../../../apps/room/${name}`, import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""));
test("dap-demo has private namespaces, enforced index and the Grow serving bounds without open parentless creation", () => {
  const demo = read("wrangler.demo.jsonc"), grow = read("wrangler.grow.jsonc");
  // PD-8 records each deployed Worker's exact additional family. The
  // creation parser still unions these allowances with its newest default.
  const roomPolicies = [
    ["wrangler.demo.jsonc", "dap-demo", "worker.ts", "enforce", ["platform:register@17", "platform:directory@16", "platform:membership@8", "platform:rules@10", "platform:destination@12", "platform:inbox@1"]],
    ["wrangler.grow.jsonc", "dap-grow", "worker.grow.ts", "enforce", ["platform:register@17", "platform:directory@16", "platform:membership@8", "platform:rules@10", "platform:destination@12", "platform:inbox@1"]],
    ["wrangler.lending.jsonc", "dap-lending", "worker.ts", "enforce", ["platform:register@5", "platform:directory@5", "platform:membership@4", "platform:rules@3", "platform:destination@2", "platform:inbox@1"]],
    ["wrangler.jsonc", "artroom-scope", "worker.ts", "register", null],
  ] as const;
  for (const [file, name, main, mode, pins] of roomPolicies) {
    const config = read(file);
    expect([config.name, config.main, config.vars.SCOPE_INDEX_MODE], file).toEqual([name, main, mode]);
    if (pins === null) expect(config.vars, file).not.toHaveProperty("PLATFORM_CREATION_PINS");
    else expect(JSON.parse(config.vars.PLATFORM_CREATION_PINS), file).toEqual(pins);
  }
  expect([demo.name, demo.main, demo.vars.SCOPE_INDEX_MODE]).toEqual(["dap-demo", "worker.ts", "enforce"]);
  expect(demo.durable_objects.bindings.map((row: { name: string }) => row.name).sort()).toEqual(["AGENTS", "REGISTRIES", "SCOPES", "SCOPE_INDEX"]);
  expect(demo.durable_objects.bindings.every((row: object) => !Object.hasOwn(row, "script_name"))).toBe(true);
  expect(demo.migrations.flatMap((row: { new_sqlite_classes: string[] }) => row.new_sqlite_classes).sort()).toEqual(["DeployedScope", "McpAgent", "McpRegistry", "ScopeIndex"]);
  expect(demo.artifacts).toEqual([{ binding: "ARTIFACTS", namespace: "dap-demo", remote: true }]);
  expect(demo.vars.ARTIFACTS_NAMESPACE).toBe("dap-demo");
  expect(JSON.parse(demo.vars.ARTIFACTS_CONFIG)).toEqual({ registerScope: "sc_b5q435os6lggypatelcltqzvul4kqxzdaaxpmybvwumsmxwj2djq", namespace: "dap-demo", host: "6e953d231f1c9aadffbf59537a82e13a.artifacts.cloudflare.net", maxBytes: 10485760, credentialIdentity: "adapter-attempt" });
  const start = JSON.parse(demo.vars.DEMO_START_CONFIG);
  expect(start).toEqual({ v: 3, origin: "https://dap-demo.inguz.workers.dev", deployment: "dap-demo", register: { inc: "in_rjfrmifznpi65vm6y2kbc36xpi", kind: "register", scope: "sc_b5q435os6lggypatelcltqzvul4kqxzdaaxpmybvwumsmxwj2djq" }, definition: "platform:register@17" });
  expect(start.register.scope).toBe(JSON.parse(demo.vars.ARTIFACTS_CONFIG).registerScope);
  for (const field of ["SERVING_CREATION_KEY_PER_HOUR", "SERVING_CREATION_ADDRESS_PER_HOUR", "SERVING_READ_KEY_PER_MINUTE", "SERVING_READ_ADDRESS_PER_MINUTE"]) expect(demo.vars[field]).toBe(grow.vars[field]);
  for (const field of ["ALLOW_OPEN_CREATION", "DEPLOYMENT", "SESSION_SECRET"]) expect(demo.vars).not.toHaveProperty(field);
});
