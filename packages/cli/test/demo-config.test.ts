/** Source config boundary; no Wrangler invocation or deployment proof. */
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { expect, test } from "vitest";
import type { PlatformDefinition } from "@generalbusiness/dap-contract";
import { BASE_COHORT, COMMONS_COHORT } from "@generalbusiness/dap-platform";
import { permitsNewPlatformScope, readPlatformCreationPolicy } from "../../scope/src/creation-versions.ts";
import { readInstalledRegisters } from "../../scope/src/register-setting.ts";
import { artifactsConfiguration } from "../../scope/src/artifacts-wiring.ts";
import { demoCreationConfig } from "../../scope/src/demo-creation.ts";
import { DEMO_RELEASE, DEMO_PUBLISHER } from "../../../examples/grow/demo-release.ts";
const read = (name: string) => JSON.parse(readFileSync(new URL(`../../../apps/room/${name}`, import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""));

// Each deployed Worker owns its migration history, including its tag scheme.
// New migrations may append; existing steps must retain all their fields.
const deployedMigrations = [
  ["wrangler.artroom-scope.jsonc", [
    { tag: "v1", new_sqlite_classes: ["DeployedScope"] },
    { tag: "v2", new_sqlite_classes: ["McpRegistry", "McpAgent"] },
    { tag: "v3", new_sqlite_classes: ["ScopeIndex"] },
  ]],
  ["wrangler.grow.jsonc", [
    { tag: "v1", new_sqlite_classes: ["DeployedScope"] },
    { tag: "v2", new_sqlite_classes: ["McpRegistry", "McpAgent"] },
    { tag: "v3-scope-index", new_sqlite_classes: ["ScopeIndex"] },
  ]],
  ["wrangler.lending.jsonc", [
    { tag: "v1", new_sqlite_classes: ["DeployedScope"] },
    { tag: "v2-scope-index", new_sqlite_classes: ["ScopeIndex"] },
  ]],
  ["wrangler.demo.jsonc", [
    { tag: "v1", new_sqlite_classes: ["DeployedScope", "ScopeIndex", "McpRegistry", "McpAgent"] },
  ]],
] as const;
const retainsMigrationPrefix = (current: unknown, pinned: readonly unknown[]): boolean =>
  Array.isArray(current) && isDeepStrictEqual(current.slice(0, pinned.length), pinned);

test("deployed room migrations retain their original content and order while new steps may append", () => {
  for (const [file, pinned] of deployedMigrations) {
    const current = read(file).migrations;
    expect(retainsMigrationPrefix(current, pinned), file).toBe(true);
    // The appended class is a test specimen, not a deployed class.
    expect(retainsMigrationPrefix([...current, { tag: "test-next", new_sqlite_classes: ["TestOnlyNextClass"] }], pinned), file).toBe(true);
    expect(retainsMigrationPrefix(current.slice(1), pinned), `${file}: removed step`).toBe(false);
    expect(retainsMigrationPrefix([{ ...current[0], tag: "rewritten" }, ...current.slice(1)], pinned), `${file}: rewritten step`).toBe(false);
    if (current.length > 1) expect(retainsMigrationPrefix([...current].reverse(), pinned), `${file}: reordered steps`).toBe(false);
  }
});

test("dap-demo has private namespaces, enforced index and the Grow serving bounds without open parentless creation", () => {
  const demo = read("wrangler.demo.jsonc"), grow = read("wrangler.grow.jsonc");
  // Each checked-in Worker policy names its exact additional family. The
  // creation parser still unions these allowances with its newest default.
  const roomPolicies = [
    ["wrangler.demo.jsonc", "dap-demo", "worker.ts", "enforce", ["platform:register@28", "platform:directory@27", "platform:membership@14", "platform:rules@15", "platform:destination@21", "platform:register@17", "platform:directory@16", "platform:membership@8", "platform:rules@10", "platform:destination@12", "platform:inbox@1"]],
    ["wrangler.commons.jsonc", "dap-commons", "worker.commons.ts", "enforce", ["platform:register@23", "platform:directory@22", "platform:membership@9", "platform:rules@14", "platform:destination@16", "platform:inbox@1", "platform:commons@1"]],
    ["wrangler.grow.jsonc", "dap-grow", "worker.grow.ts", "enforce", ["platform:register@28", "platform:directory@27", "platform:membership@14", "platform:rules@15", "platform:destination@21", "platform:register@17", "platform:directory@16", "platform:membership@8", "platform:rules@10", "platform:destination@12", "platform:inbox@1"]],
    ["wrangler.lending.jsonc", "dap-lending", "worker.ts", "enforce", ["platform:register@28", "platform:directory@27", "platform:membership@14", "platform:rules@15", "platform:destination@21", "platform:register@5", "platform:directory@5", "platform:membership@4", "platform:rules@3", "platform:destination@2", "platform:inbox@1"]],
    ["wrangler.artroom-scope.jsonc", "artroom-scope", "worker.ts", "enforce", null],
    ["wrangler.jsonc", "dap-self-host", "worker.ts", "enforce", null],
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
  expect(JSON.parse(grow.vars.APPLICATION_TRUST)).toEqual([{ release: DEMO_RELEASE, publisher: DEMO_PUBLISHER, host: "github.com" }]);
  expect(grow.r2_buckets).toEqual([{ binding: "APPLICATION_CONTENT", bucket_name: "artroom-application-content" }]);
  expect(JSON.parse(demo.vars.APPLICATION_TRUST)).toEqual([]);
  expect(demo).not.toHaveProperty("r2_buckets");
  expect(demo.artifacts).toEqual([{ binding: "ARTIFACTS", namespace: "dap-demo", remote: true }]);
  expect(demo.vars.ARTIFACTS_NAMESPACE).toBe("dap-demo");
  const artifacts = artifactsConfiguration(demo.vars.ARTIFACTS_CONFIG);
  expect(artifacts).not.toBeNull();
  expect(artifacts).toEqual({ registerScope: demo.vars.REGISTER_SCOPE, namespace: "dap-demo", host: "6e953d231f1c9aadffbf59537a82e13a.artifacts.cloudflare.net", maxBytes: 10485760, credentialIdentity: "adapter-attempt" });
  for (const field of ["SERVING_CREATION_KEY_PER_HOUR", "SERVING_CREATION_ADDRESS_PER_HOUR", "SERVING_READ_KEY_PER_MINUTE", "SERVING_READ_ADDRESS_PER_MINUTE"]) expect(demo.vars[field]).toBe(grow.vars[field]);
  for (const field of ["ALLOW_OPEN_CREATION", "DEPLOYMENT", "SESSION_SECRET"]) expect(demo.vars).not.toHaveProperty(field);

});

// Each Worker owns its current identity. A register rotation must not require
// copied IDs or a test change to enable its file-owned Start configuration.
test("hosted register settings and optional Start metadata agree within each Worker", () => {
  for (const name of ["demo", "grow", "lending"]) {
    const config = read(`wrangler.${name}.jsonc`), vars = config.vars;
    const roots = readInstalledRegisters(vars), artifacts = artifactsConfiguration(vars.ARTIFACTS_CONFIG);
    expect(roots.kind, name).toBe("pinned");
    expect(artifacts?.registerScope, name).toBe(vars.REGISTER_SCOPE);
    expect(artifacts?.namespace, name).toBe(vars.ARTIFACTS_NAMESPACE ?? config.artifacts[0].namespace);
    if (roots.kind === "pinned") {
      expect(roots.scope, name).toBe(vars.REGISTER_SCOPE);
      expect(roots.scopes, name).toContain(vars.REGISTER_SCOPE);
      expect(new Set(roots.scopes).size, name).toBe(roots.scopes.length);
    }
    if (vars.DEMO_START_CONFIG !== undefined) {
      const metadata = JSON.parse(vars.DEMO_START_CONFIG);
      // Source cannot read the Worker's secret DEPLOYMENT binding. The helper
      // checks it against the operator's explicit argument before writing.
      const start = demoCreationConfig(vars.DEMO_START_CONFIG, metadata.deployment, vars);
      expect(start, name).not.toBeNull();
      expect(start?.current.register.scope, name).toBe(vars.REGISTER_SCOPE);
      if (vars.DEPLOYMENT !== undefined) expect(start?.current.deployment, name).toBe(vars.DEPLOYMENT);
    }
  }
});

test("the self-host template has no project resources and the retired Worker retains its own deployment history", () => {
  const template = read("wrangler.jsonc"), retired = read("wrangler.artroom-scope.jsonc");
  expect([template.name, template.main, template.vars.SCOPE_INDEX_MODE]).toEqual(["dap-self-host", "worker.ts", "enforce"]);
  expect(template.vars.ARTIFACTS_NAMESPACE).toBe("dap-self-host");
  expect(template.artifacts).toEqual([{ binding: "ARTIFACTS", namespace: "dap-self-host", remote: true }]);
  expect(template.durable_objects).toEqual(retired.durable_objects);
  expect(template.migrations).toEqual(retired.migrations);
  for (const field of ["r2_buckets", "analytics_engine_datasets"]) expect(template).not.toHaveProperty(field);
  for (const config of [template, retired]) {
    for (const field of ["DEMO_START_CONFIG", "DEPLOYMENT", "SESSION_SECRET", "GITHUB_APP_PRIVATE_KEY", "GITHUB_CREATION_TOKEN", "GITHUB_READ_TOKEN"]) expect(config.vars).not.toHaveProperty(field);
  }
  expect([retired.name, retired.main, retired.vars.SCOPE_INDEX_MODE]).toEqual(["artroom-scope", "worker.ts", "enforce"]);
  expect(retired.r2_buckets).toEqual([{ binding: "APPLICATION_CONTENT", bucket_name: "artroom-application-content" }]);
  const packageJson = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
  expect(packageJson.scripts["deploy:scope"]).toBe("npx -y wrangler@4.147.0 deploy --keep-vars --config apps/room/wrangler.self-host.jsonc");
});

test("dap-commons declares its exact namespace and unplanned register configuration", () => {
  const commons = read("wrangler.commons.jsonc"), grow = read("wrangler.grow.jsonc");
  expect([commons.name, commons.main, commons.vars.SCOPE_INDEX_MODE]).toEqual(["dap-commons", "worker.commons.ts", "enforce"]);
  expect([commons.vars.DEPLOYMENT, commons.vars.PUBLIC_ORIGIN]).toEqual(["dap-commons", "https://dap-commons.inguz.workers.dev"]);
  expect(commons.durable_objects.bindings).toEqual([
    { name: "SCOPES", class_name: "DeployedScope" }, { name: "SCOPE_INDEX", class_name: "ScopeIndex" },
    { name: "REGISTRIES", class_name: "McpRegistry" }, { name: "AGENTS", class_name: "McpAgent" },
  ]);
  expect(commons.migrations).toEqual([{ tag: "v1", new_sqlite_classes: ["DeployedScope", "ScopeIndex", "McpRegistry", "McpAgent"] }]);
  expect(commons.artifacts).toEqual([{ binding: "ARTIFACTS", namespace: "dap-commons", remote: true }]);
  expect(commons.vars.ARTIFACTS_NAMESPACE).toBe("dap-commons");
  expect(commons.vars.REGISTER_SCOPE).toBe("unplanned");
  expect(JSON.parse(commons.vars.ARTIFACTS_CONFIG)).toEqual({ registerScope: "unplanned", namespace: "dap-commons",
    host: "6e953d231f1c9aadffbf59537a82e13a.artifacts.cloudflare.net", maxBytes: 10485760, credentialIdentity: "adapter-attempt" });
  // This source metadata does not enable the Demo parser for Register 23.
  expect(JSON.parse(commons.vars.DEMO_START_CONFIG)).toEqual({ v: 3, origin: "https://dap-commons.inguz.workers.dev",
    deployment: "dap-commons", register: "unplanned", definition: "platform:register@23" });
  expect(JSON.parse(commons.vars.APPLICATION_SCREEN_HOSTS)).toEqual([]);
  expect(JSON.parse(commons.vars.APPLICATION_TRUST)).toEqual([]);
  expect(commons.analytics_engine_datasets).toEqual([{ binding: "METRICS", dataset: "artroom_metrics_v1" }]);
  expect(commons).not.toHaveProperty("r2_buckets");
  for (const field of ["ALLOW_OPEN_CREATION", "SESSION_SECRET", "MCP_ENABLED", "MCP_TOOL_ADDITIONS"]) expect(commons.vars).not.toHaveProperty(field);
  for (const field of ["SERVING_CREATION_KEY_PER_HOUR", "SERVING_CREATION_ADDRESS_PER_HOUR", "SERVING_READ_KEY_PER_MINUTE", "SERVING_READ_ADDRESS_PER_MINUTE"]) expect(commons.vars[field]).toBe(grow.vars[field]);
});

// Ruling 96676b22, point 2: the commons file stays unchanged, and its policy admits base through the defaults.
test("the commons Worker's creation policy admits the base family and keeps every Commons answer", () => {
  const commons = read("wrangler.commons.jsonc"), policy = readPlatformCreationPolicy({ PLATFORM_CREATION_PINS: commons.vars.PLATFORM_CREATION_PINS });
  expect(JSON.parse(commons.vars.PLATFORM_CREATION_PINS)).toEqual(Object.values(COMMONS_COHORT));
  for (const pin of Object.values(BASE_COHORT)) expect(permitsNewPlatformScope(policy, pin), pin).toBe(true);
  for (const pin of Object.values(COMMONS_COHORT)) expect(permitsNewPlatformScope(policy, pin), pin).toBe(true);
  expect(JSON.parse(commons.vars.DEMO_START_CONFIG).definition).toBe(COMMONS_COHORT.register);
  expect(permitsNewPlatformScope(policy, "platform:register@2" as PlatformDefinition)).toBe(false);
});
