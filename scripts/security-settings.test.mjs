import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkSettings, environmentReads, readSettingsDocument, renderSettingsLookup, sandboxSettingKeys } from "./security-settings.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const options = { environmentTypes: new Set(["Env"]), forwarding: new Map([["accept", new Set([0])]]) };

test("setting reads follow immutable lexical aliases and refuse unsupported escapes", () => {
  const reads = environmentReads(`
    function run(env: Env = {}) {
      const owned = env;
      const { SECRET: secret } = owned;
      void owned?.BINDING; void env["TEXT"];
      Object.hasOwn(env, "PLATFORM_CREATION_PINS");
      Object.hasOwn(owned, "PLATFORM_CREATION_PINS");
      accept({ ...env, BINDING: secret });
      { const env = { ignored: true }; void env.IGNORED; }
    }
  `, "specimen.ts", options);
  assert.deepEqual([...new Set(reads.map(r => r.name))].sort(), ["BINDING", "PLATFORM_CREATION_PINS", "SECRET", "TEXT"]);
  assert.equal(reads.filter(row => row.name === "PLATFORM_CREATION_PINS").length, 2,
    "Own-property tests record the exact key for both the Env root and its immutable alias");
  for (const body of [
    'Object.hasOwn(env, key);', 'Object["hasOwn"](env, "PLATFORM_CREATION_PINS");',
    'other.hasOwn(env, "PLATFORM_CREATION_PINS");', 'Object.hasOwn(env, "notCanonical");',
    'const Object = { hasOwn() { return true; } }; Object.hasOwn(env, "PLATFORM_CREATION_PINS");',
    'try {} catch (Object) { Object.hasOwn(env, "PLATFORM_CREATION_PINS"); }',
    'if (false) { var Object; } Object.hasOwn(env, "PLATFORM_CREATION_PINS");',
    'Object.hasOwn = custom; Object.hasOwn(env, "PLATFORM_CREATION_PINS");',
    'Object.defineProperty(Object, "hasOwn", { value: custom }); Object.hasOwn(env, "PLATFORM_CREATION_PINS");',
    'globalThis.Object.hasOwn = custom; Object.hasOwn(env, "PLATFORM_CREATION_PINS");',
    'globalThis.Object = custom; Object.hasOwn(env, "PLATFORM_CREATION_PINS");',
    'const holder = { Object }; holder.Object.hasOwn = value => value.SECURITY_SETTINGS_UNDOCUMENTED; Object.hasOwn(env, "PLATFORM_CREATION_PINS");',
    'const holder = [Object]; holder[0].hasOwn = custom; Object.hasOwn(env, "PLATFORM_CREATION_PINS");',
    'let holder; holder = Object; holder.hasOwn = custom; Object.hasOwn(env, "PLATFORM_CREATION_PINS");',
    'function holder() { return Object; } holder().hasOwn = custom; Object.hasOwn(env, "PLATFORM_CREATION_PINS");',
    'Object.hasOwn({ ...env, COPY: env.SECURITY_SETTINGS_UNDOCUMENTED }, "PLATFORM_CREATION_PINS");',
  ]) assert.throws(() => environmentReads(`function run(env: Env) { ${body} }`, "has-own.ts", options), /unsupported setting syntax/);
  assert.throws(() => environmentReads('import Object from "./custom.ts"; function run(env: Env) { Object.hasOwn(env, "PLATFORM_CREATION_PINS"); }', "has-own.ts", options), /unsupported setting syntax/);
  assert.throws(() => environmentReads('function run(env: Env, Object: unknown) { Object.hasOwn(env, "PLATFORM_CREATION_PINS"); }', "has-own.ts", options), /unsupported setting syntax/);
  for (const body of ["let copy = env;", "unknown(env);", "void env[key];", "return env;", "const {...rest} = env;"]) {
    assert.throws(() => environmentReads(`function run(env: Env) { ${body} }`, "specimen.ts", options), /unsupported setting syntax/);
  }
  for (const body of ["const alias = env || {}; void alias.NEW_SETTING;", "other.accept(env);", "const accept = value => value; accept(env);", "function accept(value) {} accept(env);"]) {
    assert.throws(() => environmentReads(`function run(env: Env) { ${body} }`, "specimen.ts", options), /unsupported setting syntax/);
  }
  const second = { ...options, forwarding: new Map([["accept", new Set([1])]]) };
  assert.throws(() => environmentReads("function run(env: Env) { accept(env, {} as Env); }", "position.ts", second), /argument 0/);
  assert.deepEqual(environmentReads("function run(env: Env) { accept({}, env); }", "position.ts", second), []);
  assert.throws(() => environmentReads("function run(env: Env) { accept(...env); }", "position.ts", options), /environment argument spread/);
  assert.throws(() => environmentReads("function run(env: Env) { accept(env, ...others); }", "position.ts", options), /spread arguments/);
  const platform = 'import { DurableObject } from "cloudflare:workers"; class Worker extends DurableObject { constructor(ctx: unknown, env: Env) { super(ctx, env); } }';
  assert.deepEqual(environmentReads(platform, "platform.ts", options), []);
  assert.throws(() => environmentReads(platform.replace("super(ctx, env)", "super(env, ctx)"), "platform.ts", options), /argument 0/);
  const shadowedPlatform = 'import { DurableObject } from "cloudflare:workers"; function nested() { class DurableObject { constructor(a: unknown, b: unknown) { return (b as any).NEW_SETTING; } } class Worker extends DurableObject { constructor(ctx: unknown, env: Env) { super(ctx, env); } } }';
  assert.throws(() => environmentReads(shadowedPlatform, "platform.ts", options), /super\/expression.*argument 1/);
  const nested = "function outer() { function accept(value: unknown, settings: Env) { return settings.TEXT; } function invoke(env: Env) { accept({}, env); } }";
  assert.deepEqual(environmentReads(nested, "nested.ts", options).map(row => row.name), ["TEXT"]);
  assert.throws(() => environmentReads(nested.replace("accept({}, env)", "accept(env, {})"), "nested.ts", options), /argument 0/);
  assert.throws(() => environmentReads(nested.replace("function invoke", "accept = (a, b) => b.NEW_SETTING; function invoke"), "nested.ts", options), /callable identity reassignment/);
  assert.throws(() => environmentReads(nested.replace("function invoke", "[accept] = replacements; function invoke"), "nested.ts", options), /callable identity reassignment/);
  const loop = environmentReads("function run(env: Env) { for (const env of []) {} return env.NEW_SETTING; }", "specimen.ts", options);
  assert.deepEqual(loop.map(row => row.name), ["NEW_SETTING"]);
});

test("the real Worker source inventory rejects an undocumented setting read", () => {
  const page = source("docs/security/settings.md");
  const lookup = [...page.matchAll(/<!-- dap-settings-lookup:start -->\n([\s\S]*?)\n<!-- dap-settings-lookup:end -->/g)];
  assert.equal(lookup.length, 1, "one generated setting lookup is required");
  assert.equal(lookup[0][1], renderSettingsLookup(readSettingsDocument(page)));
  const original = checkSettings(root);
  assert.ok(original.settings > 0);
  // The local project has its own permanent name. A literal re-export does
  // not collapse its physical entry into the deployed room's identity.
  const celld = "apps/room/celld/worker.ts";
  const deployments = readSettingsDocument(page).deployments;
  assert.deepEqual(deployments.find(row => row.config === "apps/room/celld/wrangler.json"), {
    name: "dap-celld-local", config: "apps/room/celld/wrangler.json", entry: celld, kind: "worker",
  });
  assert.equal(original.deployments, deployments.length, "the real JSON configuration participates in coverage");
  assert.deepEqual(deployments.find(row => row.config === "apps/room/wrangler.commons.jsonc"), {
    name: "dap-commons", config: "apps/room/wrangler.commons.jsonc", entry: "apps/room/worker.commons.ts", kind: "worker",
  });
  const conflicting = readSettingsDocument(page);
  conflicting.deployments.find(row => row.config === "apps/room/celld/wrangler.json").name = "artroom-scope";
  const conflictingDocument = page.replace(/```dap-settings-inventory\s*\n[\s\S]*?\n```/, `\`\`\`dap-settings-inventory\n${JSON.stringify(conflicting)}\n\`\`\``);
  const localConfig = "apps/room/celld/wrangler.json";
  const conflictingConfig = source(localConfig).replace('"name": "dap-celld-local"', '"name": "artroom-scope"');
  assert.throws(() => checkSettings(root, { overrides: new Map([[localConfig, conflictingConfig]]), document: conflictingDocument }), /artroom-scope: conflicting entries/,
    "two distinct physical entries cannot share one permanent Worker name, even through the production re-export shim");
  const shim = source(celld);
  for (const target of ["../untracked-settings-entry.ts", "../../../../outside-settings-entry.ts"]) {
    const changed = `export * from ${JSON.stringify(target)};\nexport { default } from ${JSON.stringify(target)};\n`;
    assert.throws(() => checkSettings(root, { overrides: new Map([[celld, changed]]) }), /Untracked or escaping Worker source/,
      "only tracked, contained imports belong to a deployment closure");
  }

  const file = "packages/scope/src/health.ts";
  const inherited = source(file) + "\ninterface D3InheritedEnvironment extends HealthEnvironment {}\nfunction inheritedRead(env: D3InheritedEnvironment) { return env.SECURITY_SETTINGS_UNDOCUMENTED; }\n";
  assert.throws(() => checkSettings(root, { overrides: new Map([[file, inherited]]) }), /undocumented setting read SECURITY_SETTINGS_UNDOCUMENTED/);
  const object = "packages/scope/src/object.ts";
  for (const changedAdapter of [source(object).replace("return this.env as MetricEnvironment;", "return (this.env as MetricEnvironment);"), source(object).replace("operationContext(this.metricEnvironment()", "untrackedConsumer(this.metricEnvironment()")]) {
    assert.throws(() => checkSettings(root, { overrides: new Map([[object, changedAdapter]]) }), /metric environment adapter or its sole typed consumer changed/);
  }
  const changed = source(file) + "\nfunction undocumentedSettingWitness(env: HealthEnvironment) { return env.SECURITY_SETTINGS_UNDOCUMENTED; }\n";
  assert.throws(() => checkSettings(root, { overrides: new Map([[file, changed]]) }), /health\.ts:.*undocumented setting read SECURITY_SETTINGS_UNDOCUMENTED/);
  const inventory = readSettingsDocument(page);
  inventory.settings.push({ ...inventory.settings.find(row => row.name === "DEPLOYMENT"), name: "SECURITY_SETTINGS_UNDOCUMENTED", readers: [file] });
  const documented = page.replace(/```dap-settings-inventory\s*\n[\s\S]*?\n```/, `\`\`\`dap-settings-inventory\n${JSON.stringify(inventory)}\n\`\`\``);
  assert.ok(checkSettings(root, { overrides: new Map([[file, changed]]), document: documented }).settings > original.settings);
  const config = "apps/room/wrangler.jsonc";
  assert.throws(() => checkSettings(root, { overrides: new Map([[config, source(config).replace('"binding": "ARTIFACTS"', '"binding": "UNDOCUMENTED_ARTIFACTS"')]]) }), /undocumented configured binding\/setting UNDOCUMENTED_ARTIFACTS/);
  // ApplicationBindings is imported only as a type by its real reader.
  assert.ok(original.reads.some(row => row.file === "packages/scope/src/applications/wiring.ts" && row.name === "APPLICATION_CONTENT"));
  const wrongPosition = source(file) + "\nfunction acceptPosition(value: unknown, settings: HealthEnvironment) { return (value as any).NEW_SETTING; }\nfunction callPosition(env: HealthEnvironment) { acceptPosition(env, {} as HealthEnvironment); }\n";
  assert.throws(() => checkSettings(root, { overrides: new Map([[file, wrongPosition]]) }), /acceptPosition argument 0/);
  const rightPosition = wrongPosition.replace("acceptPosition(env, {} as HealthEnvironment)", "acceptPosition({}, env)");
  assert.equal(checkSettings(root, { overrides: new Map([[file, rightPosition]]) }).settings, original.settings);
});

test("sandbox computed bindings retain their checked finite domain and simulator settings stay separate", () => {
  const file = "apps/sandbox/worker.ts", original = source(file);
  assert.deepEqual(sandboxSettingKeys(original), ["GROW", "LENDING", "ROOM"]);
  assert.throws(() => sandboxSettingKeys(original.replace('"ROOM", "GROW", "LENDING"', '"ROOM", "GROW", "LENDING", "OTHER"')), /sandbox finite domain changed/);
  assert.throws(() => sandboxSettingKeys(original.replace("env[mapping.service]", "env[unchecked]")), /unrecognized sandbox selector/);
  assert.throws(() => sandboxSettingKeys(original.replace('!["ROOM", "GROW", "LENDING"].includes', 'false && !["ROOM", "GROW", "LENDING"].includes')), /sandbox checked construction changed/);
  const inventory = checkSettings(root);
  const simulator = inventory.reads.filter(r => r.deployment === "dap-grow-simulator");
  assert.deepEqual([...new Set(simulator.map(r => r.name))].sort(), ["GROW_BINDING", "GROW_CLIMATE_SECRET", "GROW_SENSORS_SECRET"]);
  assert.ok(!simulator.some(r => r.file === file));
});
