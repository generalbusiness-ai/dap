/** Render reviewed nonsecret settings; never plan, install, sign, or deploy. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isScopeId, isScopeRef } from "@generalbusiness/dap-bytes";
import { FAILED_CLAIM_COHORT } from "@generalbusiness/dap-platform";
import { readInstalledRegisters } from "../../../packages/scope/src/register-setting.ts";
import { artifactsConfiguration } from "../../../packages/scope/src/artifacts-wiring.ts";
import { demoCreationConfig } from "../../../packages/scope/src/demo-creation.ts";
import { readPlatformCreationPolicy } from "../../../packages/scope/src/creation-versions.ts";

const directory = fileURLToPath(new URL("./", import.meta.url));
const root = resolve(directory, "../../..");
const readJson = async name => JSON.parse(await readFile(resolve(directory, name), "utf8"));
export const packet = await readJson("packet.json");
const baseBytes = await readFile(resolve(root, packet.baseConfig));
assert.equal(createHash("sha256").update(baseBytes).digest("hex"), packet.baseConfigSha256, "review the changed base Wrangler configuration before rendering");
export const baseConfig = JSON.parse(baseBytes.toString("utf8").split("\n").filter(line => !line.trimStart().startsWith("//")).join("\n"));

/** Production parsers establish syntax; the reviewed operator record supplies required historical roots. */
export function validateConfig(config, stage, scope, inc) {
  assert.ok(stage === "install" || stage === "offer" || stage === "rollback", "unknown stage");
  assert.ok(isScopeId(scope) && !packet.requiredInstalledRegisters.includes(scope), "a new canonical planned register is required");
  const vars = config.vars;
  const selected = readInstalledRegisters(vars);
  assert.equal(selected.kind, "pinned", "production register parser refused the configuration");
  const current = stage === "rollback" ? baseConfig.vars.REGISTER_SCOPE : scope;
  assert.equal(selected.scope, current);
  for (const old of packet.requiredInstalledRegisters) assert.ok(selected.scopes.includes(old), `missing retained operator root ${old}`);
  assert.deepEqual(selected.scopes, [...packet.requiredInstalledRegisters, scope]);
  const artifacts = artifactsConfiguration(vars.ARTIFACTS_CONFIG);
  assert.ok(artifacts, "production Artifacts parser refused the configuration");
  assert.equal(artifacts.registerScope, current);
  assert.equal(artifacts.namespace, packet.namespace);
  assert.deepEqual({ ...artifacts, registerScope: baseConfig.vars.REGISTER_SCOPE }, artifactsConfiguration(baseConfig.vars.ARTIFACTS_CONFIG));
  const policy = readPlatformCreationPolicy(vars);
  assert.ok(policy && Object.values(FAILED_CLAIM_COHORT).every(pin => policy.pins.includes(pin)), "production creation parser must admit every new cohort pin");
  const offer = demoCreationConfig(vars.DEMO_START_CONFIG, packet.deployment, vars);
  if (stage === "install") {
    assert.equal(vars.DEMO_START_CONFIG, baseConfig.vars.DEMO_START_CONFIG);
    assert.equal(offer, null, "the old offer must close while its root differs from the host setting");
  } else if (stage === "offer") {
    assert.ok(isScopeRef({ kind: "register", scope, inc }), "the actual installed reference is required");
    assert.ok(offer, "production Page offer parser refused the configuration");
    assert.deepEqual(offer.current.register, { kind: "register", scope, inc });
    assert.equal(offer.current.definition, packet.newDefinition);
    assert.equal(offer.current.origin, packet.origin);
  } else {
    assert.equal(vars.DEMO_START_CONFIG, baseConfig.vars.DEMO_START_CONFIG);
    assert.ok(offer, "production parser must restore the exact old Page offer");
    assert.deepEqual(offer.current.register, JSON.parse(baseConfig.vars.DEMO_START_CONFIG).register);
  }
  const changed = [...new Set([...Object.keys(vars), ...Object.keys(baseConfig.vars)])].filter(key => vars[key] !== baseConfig.vars[key]).sort();
  assert.deepEqual(changed, stage === "rollback" ? ["INSTALLED_REGISTER_SCOPES"] : ["ARTIFACTS_CONFIG", "INSTALLED_REGISTER_SCOPES", "REGISTER_SCOPE", ...(stage === "offer" ? ["DEMO_START_CONFIG"] : [])].sort());
  assert.ok(config.main === baseConfig.main || config.main === resolve(root, "apps/room", baseConfig.main), "entrypoint must use the reviewed source");
  const normalized = { ...config, main: baseConfig.main, vars: baseConfig.vars };
  assert.deepEqual(normalized, baseConfig, "non-variable Wrangler settings changed");
  return { stage, register: selected.scope, installedRegisters: selected.scopes, definition: stage === "rollback" ? JSON.parse(baseConfig.vars.DEMO_START_CONFIG).definition : packet.newDefinition,
    pageOffer: stage === "install" ? "closed during installation" : "configured; installed Native state still needs checking",
    creationPins: policy.pins, qualification: "Parser and retained-root checks only; no Native birth, live provider, or acceptance claim." };
}

export async function renderConfig(stage, scope, inc) {
  assert.ok(stage === "install" || stage === "offer" || stage === "rollback", "unknown stage");
  const template = await readFile(resolve(directory, stage + "-vars.template.json"), "utf8");
  assert.ok(isScopeId(scope), "invalid planned register scope");
  if (stage === "offer") assert.ok(isScopeRef({ kind: "register", scope, inc }), "invalid installed register incarnation");
  const filled = template.replaceAll("PLANNED_FAILED_CLAIM_REGISTER_SCOPE", scope)
    .replaceAll("INSTALLED_FAILED_CLAIM_REGISTER_INC", stage === "offer" ? inc : "");
  const config = structuredClone(baseConfig);
  Object.assign(config.vars, JSON.parse(filled));
  // A private --config file lives outside apps/room. Keep its entrypoint bound to this reviewed source.
  config.main = resolve(root, "apps/room", baseConfig.main);
  const result = validateConfig(config, stage, scope, inc);
  return { config, result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = new Map();
  assert.equal(args.length % 2, 0, "arguments must be named pairs");
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(["--stage", "--scope", "--inc", "--out"].includes(args[i]) && !options.has(args[i]), "unknown or repeated argument");
    options.set(args[i], args[i + 1]);
  }
  assert.ok(options.has("--stage") && options.has("--scope") && options.has("--out"));
  assert.equal(options.has("--inc"), options.get("--stage") === "offer");
  const { config, result } = await renderConfig(options.get("--stage"), options.get("--scope"), options.get("--inc"));
  await writeFile(options.get("--out"), JSON.stringify(config, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ ...result, out: resolve(options.get("--out")), sourceEntrypoint: config.main }));
}
