#!/usr/bin/env node
/** Rename npm workspace references without changing protocol or recorded data. */
import { readFileSync, writeFileSync, lstatSync, realpathSync, openSync, fstatSync, closeSync, readSync, constants } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { moduleSpecifierSpans } from "./public-release-modules.mjs";

export const WORKSPACE_RENAMES = Object.freeze(Object.fromEntries(
  ["bytes", "checkers", "client", "git", "package-graph", "replay", "scope"].map(name =>
    [`@generalbusiness/artroom-${name}`, `@generalbusiness/dap-${name}`]),
));
const ROOT = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const PUBLICATION = new Set(["scripts/public-release.mjs", "scripts/check-public-release.mjs", "scripts/public-release-lib.mjs", "scripts/public-release-modules.mjs", "scripts/public-release-modules.test.mjs", "scripts/public-release.json", "docs/public-sdk-release.md"]);
// Reviewed ordered publication replacements; never overwrite a whole source file.
const PUBLICATION_REPLACEMENTS = [
  {
    "path": "scripts/public-release-lib.mjs",
    "before": "const DAP_PACKAGES = new Set([\"contract\", \"derive\", \"lanes\", \"page\", \"platform\", \"cli\"]);\nexport const sourceNameOf = (dir) => `@generalbusiness/${DAP_PACKAGES.has(dir) ? \"dap\" : \"artroom\"}-${dir}`;\nexport const nameOf = (dir) => `@generalbusiness/dap-${dir}`;\nconst publishedDependency = (name) => {\n  const spec = PLAN.packages.find(spec => name === sourceNameOf(spec.dir));\n  return spec ? nameOf(spec.dir) : name;\n};\nconst publishedDependencies = (spec) => Object.fromEntries(Object.entries(spec.dependencies).map(([name, pin]) => [publishedDependency(name), pin]));\n/** Only module literals change in copied SDK inputs; protocol and ordinary strings remain exact. */\nexport function rewritePublishedRefs(text) {\n  let rewritten = text;\n  for (const span of moduleSpecifierSpans(text).reverse()) {\n    const parts = span.value.split(\"/\");\n    const dependency = parts.slice(0, span.value.startsWith(\"@\") ? 2 : 1).join(\"/\");\n    const mapped = publishedDependency(dependency);\n    if (mapped === dependency) continue;\n    const value = mapped + span.value.slice(dependency.length);\n    let encoded = JSON.stringify(value).slice(1, -1).replace(/'/g, span.quote === \"'\" ? \"\\\\'\" : \"'\");\n    if (span.quote === \"`\") encoded = encoded.replace(/`/g, \"\\\\`\").replace(/\\$\\{/g, \"\\\\${\");\n    rewritten = rewritten.slice(0, span.start) + encoded + rewritten.slice(span.end);\n  }\n  return rewritten;\n}\nexport const digest = ",
    "after": "export const nameOf = (dir) => `@generalbusiness/dap-${dir}`;\nexport const digest = "
  },
  {
    "path": "scripts/public-release-lib.mjs",
    "before": "  if (JSON.stringify(keys.sort()) !== JSON.stringify([...Object.keys(spec.exports), ...Object.keys(excluded)].sort()) || source.name !== sourceNameOf(spec.dir) || source.type !== \"module\" || source.license !== \"Apache-2.0\") refusal(\"unsupported-source-manifest\");\n",
    "after": "  if (JSON.stringify(keys.sort()) !== JSON.stringify([...Object.keys(spec.exports), ...Object.keys(excluded)].sort()) || source.name !== nameOf(spec.dir) || source.type !== \"module\" || source.license !== \"Apache-2.0\") refusal(\"unsupported-source-manifest\");\n"
  },
  {
    "path": "scripts/public-release-lib.mjs",
    "before": "  if (spec.dir === \"replay\" && source.devDependencies?.[\"@generalbusiness/artroom-git\"] !== source.version) refusal(\"source-git-development-pin\");\n",
    "after": "  if (spec.dir === \"replay\" && source.devDependencies?.[\"@generalbusiness/dap-git\"] !== source.version) refusal(\"source-git-development-pin\");\n"
  },
  {
    "path": "scripts/public-release-lib.mjs",
    "before": "    ...(Object.keys(spec.dependencies).length ? { dependencies: Object.fromEntries(Object.entries(publishedDependencies(spec)).map(([name, pin]) => [name, pin === \"coordinated\" ? selected : pin])) } : {}),\n",
    "after": "    ...(Object.keys(spec.dependencies).length ? { dependencies: Object.fromEntries(Object.entries(spec.dependencies).map(([name, pin]) => [name, pin === \"coordinated\" ? selected : pin])) } : {}),\n"
  },
  {
    "path": "scripts/public-release-lib.mjs",
    "before": "        if (!(packageName in publishedDependencies(spec)) || /^(?:node:|cloudflare:)/.test(ref) || ref.includes(\"/testing\")) refusal(\"bare-output-closure\");\n",
    "after": "        if (!(packageName in spec.dependencies) || /^(?:node:|cloudflare:)/.test(ref) || ref.includes(\"/testing\")) refusal(\"bare-output-closure\");\n"
  },
  {
    "path": "scripts/public-release.mjs",
    "before": "import { ROOT, PLAN, PUBLIC_TESTING_INPUTS, args, childEnv, compilerTool, compile, contained, copiedDependency, copyFileVerified, digest, json, outputClosure, productionInputs, publishManifest, references, refusal, rewriteDeclarationRefs, rewritePublishedRefs, sourceIdentity, version, writeJson } from \"./public-release-lib.mjs\";\n",
    "after": "import { ROOT, PLAN, PUBLIC_TESTING_INPUTS, args, childEnv, compilerTool, compile, contained, copiedDependency, copyFileVerified, digest, json, outputClosure, productionInputs, publishManifest, references, refusal, rewriteDeclarationRefs, sourceIdentity, version, writeJson } from \"./public-release-lib.mjs\";\n"
  },
  {
    "path": "scripts/check-public-release.mjs",
    "before": "import { PLAN, ROOT, PUBLIC_TESTING_INPUTS, args, childEnv, compile, compilerTool, contained, digest, inventory, json, nameOf, outputClosure, productionInputs, publishManifest, references, rewritePublishedRefs, refusal, sourceIdentity, writeJson } from \"./public-release-lib.mjs\";\n",
    "after": "import { PLAN, ROOT, PUBLIC_TESTING_INPUTS, args, childEnv, compile, compilerTool, contained, digest, inventory, json, nameOf, outputClosure, productionInputs, publishManifest, references, refusal, sourceIdentity, writeJson } from \"./public-release-lib.mjs\";\n"
  },
  {
    "path": "scripts/public-release.mjs",
    "before": "      writeFileSync(copied, rewritePublishedRefs(readFileSync(original, \"utf8\")), { flag: \"wx\" });\n",
    "after": "      copyFileVerified(original, copied);\n"
  },
  {
    "path": "scripts/public-release.mjs",
    "before": "    if (readFileSync(join(output, \"inputs\", dir, ...parts), \"utf8\") !== rewritePublishedRefs(readFileSync(input.copy, \"utf8\"))) refusal(\"renamed-input-changed\");\n",
    "after": "    if (!readFileSync(join(output, \"inputs\", dir, ...parts)).equals(readFileSync(input.copy))) refusal(\"renamed-input-changed\");\n"
  },
  {
    "path": "scripts/check-public-release.mjs",
    "before": "      if (readFileSync(compiledInput, \"utf8\") !== rewritePublishedRefs(readFileSync(input.copy, \"utf8\"))) refusal(\"renamed-input-integrity\");\n",
    "after": "      if (!readFileSync(compiledInput).equals(readFileSync(input.copy))) refusal(\"renamed-input-integrity\");\n"
  },
  {
    "path": "scripts/public-release.json",
    "before": "    { \"dir\": \"client\", \"exports\": { \".\": \"src/index\" }, \"dependencies\": { \"@generalbusiness/artroom-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\" } },\n",
    "after": "    { \"dir\": \"client\", \"exports\": { \".\": \"src/index\", \"./application\": \"src/application\" }, \"dependencies\": { \"@generalbusiness/dap-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\" } },\n"
  },
  {
    "path": "scripts/public-release.json",
    "before": "    { \"dir\": \"derive\", \"exports\": { \".\": \"src/index\", \"./rule\": \"src/rule/index\", \"./testing\": \"test/fixtures\" }, \"dependencies\": { \"@generalbusiness/artroom-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\", \"jsonata\": \"2.2.2\" } },\n",
    "after": "    { \"dir\": \"derive\", \"exports\": { \".\": \"src/index\", \"./rule\": \"src/rule/index\", \"./testing\": \"test/fixtures\" }, \"dependencies\": { \"@generalbusiness/dap-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\", \"jsonata\": \"2.2.2\", \"@generalbusiness/dap-package-graph\": \"coordinated\" } },\n"
  },
  {
    "path": "scripts/public-release.json",
    "before": "    { \"dir\": \"platform\", \"exports\": { \".\": \"src/index\", \"./membership-actions\": \"src/membership-actions\" }, \"excludedSourceExports\": { \"./testing\": \"./test/support.ts\" }, \"dependencies\": { \"@generalbusiness/artroom-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\", \"@generalbusiness/dap-derive\": \"coordinated\" } },\n",
    "after": "    { \"dir\": \"platform\", \"exports\": { \".\": \"src/index\", \"./membership-actions\": \"src/membership-actions\" }, \"excludedSourceExports\": { \"./testing\": \"./test/support.ts\", \"./application-install\": \"./src/application-install.ts\" }, \"dependencies\": { \"@generalbusiness/dap-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\", \"@generalbusiness/dap-derive\": \"coordinated\" } },\n"
  },
  {
    "path": "scripts/public-release.json",
    "before": "    { \"dir\": \"replay\", \"exports\": { \".\": \"src/index\" }, \"excludedSourceExports\": { \"./git\": \"./src/git.ts\" }, \"excludedInputs\": [\"src/bin.ts\", \"src/git.ts\"], \"dependencies\": { \"@generalbusiness/artroom-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\", \"@generalbusiness/dap-derive\": \"coordinated\" } }\n",
    "after": "    { \"dir\": \"replay\", \"exports\": { \".\": \"src/index\" }, \"excludedSourceExports\": { \"./git\": \"./src/git.ts\" }, \"excludedInputs\": [\"src/bin.ts\", \"src/git.ts\"], \"dependencies\": { \"@generalbusiness/dap-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\", \"@generalbusiness/dap-derive\": \"coordinated\" }, \"excludedSourceDependencies\": { \"@generalbusiness/dap-platform\": \"coordinated\" } }\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "import { PLAN, PUBLIC_TESTING_INPUTS, nameOf, sourceNameOf, rewritePublishedRefs, outputClosure, productionInputs, publishManifest, references, rewriteDeclarationRefs } from \"./public-release-lib.mjs\";\n",
    "after": "import { PLAN, PUBLIC_TESTING_INPUTS, nameOf, copyFileVerified, outputClosure, productionInputs, publishManifest, references, rewriteDeclarationRefs } from \"./public-release-lib.mjs\";\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "  assert.deepEqual([\"contract\", \"derive\", \"lanes\", \"page\", \"platform\", \"cli\", \"bytes\", \"client\", \"replay\", \"scope\", \"git\", \"checkers\"].map(sourceNameOf), [\"@generalbusiness/dap-contract\", \"@generalbusiness/dap-derive\", \"@generalbusiness/dap-lanes\", \"@generalbusiness/dap-page\", \"@generalbusiness/dap-platform\", \"@generalbusiness/dap-cli\", \"@generalbusiness/artroom-bytes\", \"@generalbusiness/artroom-client\", \"@generalbusiness/artroom-replay\", \"@generalbusiness/artroom-scope\", \"@generalbusiness/artroom-git\", \"@generalbusiness/artroom-checkers\"]);\n",
    "after": "  // Workspace names are already the public names; no publication alias is needed.\n  for (const dir of [\"contract\", \"package-graph\", \"derive\", \"lanes\", \"page\", \"platform\", \"cli\", \"bytes\", \"client\", \"replay\", \"scope\", \"git\", \"checkers\"]) {\n    const workspace = dir === \"lanes\" || dir === \"page\" ? `apps/room/${dir}` : `packages/${dir}`;\n    const manifest = JSON.parse(readFileSync(new URL(`${workspace}/package.json`, root), \"utf8\"));\n    assert.equal(manifest.name, `@generalbusiness/dap-${dir}`);\n  }\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "    `import * as bytes from \"@generalbusiness/artroom-bytes\";`,\n",
    "after": "    `import * as bytes from \"@generalbusiness/dap-bytes\";`,\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "  const expected = [\"./side.ts\", \"./types.ts\", \"@generalbusiness/artroom-bytes\", \"./public.ts\", \"./reexport.ts\", \"./nested.ts\", \"./later.ts\"];\n",
    "after": "  const expected = [\"./side.ts\", \"./types.ts\", \"@generalbusiness/dap-bytes\", \"./public.ts\", \"./reexport.ts\", \"./nested.ts\", \"./later.ts\"];\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "    const publicSource = rewritePublishedRefs(source);\n    assert.deepEqual(references(publicSource), expected.map(value => value === \"@generalbusiness/artroom-bytes\" ? \"@generalbusiness/dap-bytes\" : value));\n    assert.equal(rewritePublishedRefs(publicSource), publicSource);\n    assert.equal(rewritePublishedRefs(`import type { Fetch } from '@generalbusiness/artroom-client'; export * from '@generalbusiness/artroom-replay'; const data = \"@generalbusiness/artroom-bytes\";`), `import type { Fetch } from '@generalbusiness/dap-client'; export * from '@generalbusiness/dap-replay'; const data = \"@generalbusiness/artroom-bytes\";`);\n",
    "after": "    // The producer now copies exact source bytes instead of rewriting package names.\n    const input = new URL(\"packages/bytes/src/index.ts\", root), copied = join(dir, \"input.ts\");\n    copyFileVerified(input, copied);\n    assert.deepEqual(readFileSync(copied), readFileSync(input));\n    assert.deepEqual(references(readFileSync(copied, \"utf8\")), references(readFileSync(input, \"utf8\")));\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "    // The six-package amendment omits only the known source-only boundaries.\n    const platform = PLAN.packages.find(spec => spec.dir === \"platform\");\n    const replay = PLAN.packages.find(spec => spec.dir === \"replay\");\n    const platformManifest = JSON.parse(readFileSync(new URL(\"packages/platform/package.json\", root), \"utf8\"));\n    const published = publishManifest(platform, platformManifest, \"0.1.0-dev.2\");\n    assert.equal(published.name, \"@generalbusiness/dap-platform\");\n    assert.deepEqual(published.repository, { type: \"git\", url: \"git+https://github.com/generalbusiness-ai/dap.git\", directory: \"packages/platform\" });\n    assert.equal(published.homepage, \"https://dap.generalbusiness.ai/\");\n    assert.deepEqual(Object.keys(published.exports), [\".\", \"./membership-actions\"]);\n    assert.deepEqual(published.exports[\"./membership-actions\"], { types: \"./dist/src/membership-actions.d.ts\", default: \"./dist/src/membership-actions.js\" });\n    assert.deepEqual(published.dependencies, { \"@generalbusiness/dap-bytes\": \"0.1.0-dev.2\", \"@generalbusiness/dap-contract\": \"0.1.0-dev.2\", \"@generalbusiness/dap-derive\": \"0.1.0-dev.2\" });\n    const bytes = PLAN.packages.find(spec => spec.dir === \"bytes\");\n    const bytesManifest = JSON.parse(readFileSync(new URL(\"packages/bytes/package.json\", root), \"utf8\"));\n    const publicBytes = publishManifest(bytes, bytesManifest, \"0.1.0-dev.2\");\n    assert.equal(bytesManifest.name, \"@generalbusiness/artroom-bytes\");\n    assert.equal(publicBytes.name, \"@generalbusiness/dap-bytes\");\n    assert.equal(publicBytes.dependencies[\"@noble/curves\"], \"2.4.0\");\n    assert.throws(() => publishManifest(platform, { ...platformManifest, name: \"@generalbusiness/artroom-platform\" }, \"0.1.0-dev.2\"), /unsupported-source-manifest/);\n    assert.throws(() => publishManifest(platform, { ...platformManifest, exports: { ...platformManifest.exports, \"./private\": \"./src/private.ts\" } }, \"0.1.0-dev.2\"), /unsupported-source-manifest/);\n    const replayManifest = JSON.parse(readFileSync(new URL(\"packages/replay/package.json\", root), \"utf8\"));\n    const publicReplay = publishManifest(replay, replayManifest, \"0.1.0-dev.2\");\n    assert.deepEqual(Object.keys(publicReplay.exports), [\".\"]);\n    assert.equal(publicReplay.dependencies[\"@generalbusiness/artroom-git\"], undefined);\n    assert.equal(publicReplay.devDependencies, undefined);\n    assert.throws(() => publishManifest({ ...replay, excludedSourceExports: { ...replay.excludedSourceExports, \"./extra\": \"./src/extra.ts\" } }, replayManifest, \"0.1.0-dev.2\"), /source-export-exclusions/);\n    assert.throws(() => publishManifest(replay, { ...replayManifest, dependencies: { ...replayManifest.dependencies, \"@generalbusiness/artroom-git\": replayManifest.version } }, \"0.1.0-dev.2\"), /unsupported-source-dependencies/);\n    assert.deepEqual(productionInputs(replay, [\"packages/replay/src/index.ts\", \"packages/replay/src/bin.ts\", \"packages/replay/src/git.ts\"]), { names: [\"packages/replay/src/index.ts\"], omitted: [\"packages/replay/src/bin.ts\", \"packages/replay/src/git.ts\"] });\n    assert.throws(() => productionInputs({ ...replay, excludedInputs: [\"src/index.ts\"] }, [\"packages/replay/src/index.ts\", \"packages/replay/src/bin.ts\"]), /source-input-exclusions/);\n",
    "after": "    const replay = PLAN.packages.find(spec => spec.dir === \"replay\");\n    assert.deepEqual(productionInputs(replay, [\"packages/replay/src/index.ts\", \"packages/replay/src/bin.ts\", \"packages/replay/src/git.ts\"]), { names: [\"packages/replay/src/index.ts\"], omitted: [\"packages/replay/src/bin.ts\", \"packages/replay/src/git.ts\"] });\n    assert.throws(() => productionInputs({ ...replay, excludedInputs: [\"src/index.ts\"] }, [\"packages/replay/src/index.ts\", \"packages/replay/src/bin.ts\"]), /source-input-exclusions/);\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "\n// Exercise the release output boundary without loading fixtures or compiling an SDK.\n",
    "after": "\n// This existing compatibility obligation can fail independently of lexical/copy checks.\n// Preserve actual workspace manifests and expected compatibility; do not project a plan.\ntest(\"SDK published manifests match the actual supported workspace manifests\", () => {\n  // The seven-package plan preserves the actual public closure.\n  for (const spec of PLAN.packages) {\n    const manifest = JSON.parse(readFileSync(new URL(`packages/${spec.dir}/package.json`, root), \"utf8\"));\n    const published = publishManifest(spec, manifest, \"0.1.0-dev.2\");\n    assert.equal(published.name, nameOf(spec.dir));\n    assert.deepEqual(Object.keys(published.exports), Object.keys(spec.exports));\n    assert.deepEqual(published.dependencies ?? {}, Object.fromEntries(Object.entries(spec.dependencies).map(([name, pin]) => [name, pin === \"coordinated\" ? \"0.1.0-dev.2\" : pin])));\n    assert.throws(() => publishManifest(spec, { ...manifest, exports: { ...manifest.exports, \"./unknown\": \"./src/unknown.ts\" } }, \"0.1.0-dev.2\"), /unsupported-source-manifest/);\n    assert.throws(() => publishManifest(spec, { ...manifest, dependencies: { ...manifest.dependencies, \"unexpected-dependency\": \"1.0.0\" } }, \"0.1.0-dev.2\"), /unsupported-source-dependencies/);\n  }\n  const platform = PLAN.packages.find(spec => spec.dir === \"platform\");\n  const replay = PLAN.packages.find(spec => spec.dir === \"replay\");\n  const platformManifest = JSON.parse(readFileSync(new URL(\"packages/platform/package.json\", root), \"utf8\"));\n  const published = publishManifest(platform, platformManifest, \"0.1.0-dev.2\");\n  assert.equal(published.name, \"@generalbusiness/dap-platform\");\n  assert.deepEqual(published.repository, { type: \"git\", url: \"git+https://github.com/generalbusiness-ai/dap.git\", directory: \"packages/platform\" });\n  assert.equal(published.homepage, \"https://dap.generalbusiness.ai/\");\n  assert.deepEqual(Object.keys(published.exports), [\".\", \"./membership-actions\"]);\n  assert.equal(published.exports[\"./application-install\"], undefined);\n  assert.deepEqual(platform.excludedSourceExports, { \"./testing\": \"./test/support.ts\", \"./application-install\": \"./src/application-install.ts\" });\n  assert.throws(() => publishManifest({ ...platform, excludedSourceExports: { \"./testing\": \"./test/support.ts\" } }, platformManifest, \"0.1.0-dev.2\"), /source-export-exclusions/);\n  assert.throws(() => publishManifest(platform, { ...platformManifest, exports: { ...platformManifest.exports, \"./application-install\": \"./src/index.ts\" } }, \"0.1.0-dev.2\"), /unsupported-source-export/);\n  assert.deepEqual(published.exports[\"./membership-actions\"], { types: \"./dist/src/membership-actions.d.ts\", default: \"./dist/src/membership-actions.js\" });\n  assert.deepEqual(published.dependencies, { \"@generalbusiness/dap-bytes\": \"0.1.0-dev.2\", \"@generalbusiness/dap-contract\": \"0.1.0-dev.2\", \"@generalbusiness/dap-derive\": \"0.1.0-dev.2\" });\n  const bytes = PLAN.packages.find(spec => spec.dir === \"bytes\");\n  const bytesManifest = JSON.parse(readFileSync(new URL(\"packages/bytes/package.json\", root), \"utf8\"));\n  const publicBytes = publishManifest(bytes, bytesManifest, \"0.1.0-dev.2\");\n  assert.equal(bytesManifest.name, \"@generalbusiness/dap-bytes\");\n  assert.equal(publicBytes.name, \"@generalbusiness/dap-bytes\");\n  assert.equal(publicBytes.dependencies[\"@noble/curves\"], \"2.4.0\");\n  assert.deepEqual(Object.keys(publicBytes.exports), [\".\", \"./web\", \"./application\", \"./application-v2\"]);\n  assert.equal(publicBytes.dependencies[\"@generalbusiness/dap-package-graph\"], \"0.1.0-dev.2\");\n  assert.deepEqual(publicBytes.exports[\"./application-v2\"], { types: \"./dist/src/application-v2.d.ts\", default: \"./dist/src/application-v2.js\" });\n  assert.throws(() => publishManifest(bytes, { ...bytesManifest, exports: { ...bytesManifest.exports, \"./application-v2\": \"./src/index.ts\" } }, \"0.1.0-dev.2\"), /unsupported-source-export/);\n  assert.throws(() => publishManifest(bytes, { ...bytesManifest, dependencies: { ...bytesManifest.dependencies, \"@generalbusiness/dap-package-graph\": \"0.1.0-wrong\" } }, \"0.1.0-dev.2\"), /dependency-pin/);\n  const graph = PLAN.packages.find(spec => spec.dir === \"package-graph\");\n  const graphManifest = JSON.parse(readFileSync(new URL(\"packages/package-graph/package.json\", root), \"utf8\"));\n  assert.deepEqual(publishManifest(graph, graphManifest, \"0.1.0-dev.2\").dependencies, { \"@generalbusiness/dap-contract\": \"0.1.0-dev.2\" });\n  const client = PLAN.packages.find(spec => spec.dir === \"client\");\n  const clientManifest = JSON.parse(readFileSync(new URL(\"packages/client/package.json\", root), \"utf8\"));\n  assert.deepEqual(Object.keys(publishManifest(client, clientManifest, \"0.1.0-dev.2\").exports), [\".\", \"./application\"]);\n  assert.deepEqual(PLAN.packages.find(spec => spec.dir === \"derive\").dependencies[\"@generalbusiness/dap-package-graph\"], \"coordinated\");\n  assert.throws(() => publishManifest(platform, { ...platformManifest, name: \"@generalbusiness/artroom-platform\" }, \"0.1.0-dev.2\"), /unsupported-source-manifest/);\n  assert.throws(() => publishManifest(platform, { ...platformManifest, exports: { ...platformManifest.exports, \"./private\": \"./src/private.ts\" } }, \"0.1.0-dev.2\"), /unsupported-source-manifest/);\n  const replayManifest = JSON.parse(readFileSync(new URL(\"packages/replay/package.json\", root), \"utf8\"));\n  const publicReplay = publishManifest(replay, replayManifest, \"0.1.0-dev.2\");\n  assert.deepEqual(Object.keys(publicReplay.exports), [\".\"]);\n  assert.equal(publicReplay.dependencies[\"@generalbusiness/dap-git\"], undefined);\n  assert.equal(publicReplay.dependencies[\"@generalbusiness/dap-platform\"], undefined);\n  assert.deepEqual(replay.excludedSourceDependencies, { \"@generalbusiness/dap-platform\": \"coordinated\" });\n  assert.throws(() => publishManifest({ ...replay, excludedSourceDependencies: {} }, replayManifest, \"0.1.0-dev.2\"), /source-dependency-exclusions/);\n  assert.throws(() => publishManifest({ ...replay, excludedSourceDependencies: { ...replay.excludedSourceDependencies, unknown: \"coordinated\" } }, replayManifest, \"0.1.0-dev.2\"), /source-dependency-exclusions/);\n  assert.throws(() => publishManifest(replay, { ...replayManifest, dependencies: { ...replayManifest.dependencies, \"@generalbusiness/dap-platform\": \"0.1.0-wrong\" } }, \"0.1.0-dev.2\"), /source-only-dependency-pin/);\n  assert.equal(publicReplay.devDependencies, undefined);\n  assert.throws(() => publishManifest({ ...replay, excludedSourceExports: { ...replay.excludedSourceExports, \"./extra\": \"./src/extra.ts\" } }, replayManifest, \"0.1.0-dev.2\"), /source-export-exclusions/);\n  assert.throws(() => publishManifest(replay, { ...replayManifest, dependencies: { ...replayManifest.dependencies, \"@generalbusiness/dap-git\": replayManifest.version } }, \"0.1.0-dev.2\"), /unsupported-source-dependencies/);\n});\n\n// Exercise the release output boundary without loading fixtures or compiling an SDK.\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "    for (const ref of [\"node:fs\", \"@generalbusiness/artroom-git/journal-reader\"]) {\n",
    "after": "    for (const ref of [\"node:fs\", \"@generalbusiness/dap-git/journal-reader\", \"@generalbusiness/dap-platform\"]) {\n"
  },
  {
    "path": "docs/public-sdk-release.md",
    "before": "The command is `dap`. `artroom` remains an alias. The contract, derive,\nlanes, page, platform, and cli workspaces use `@generalbusiness/dap-*`\nnames. Inside this repository, scope, git, checkers, bytes, client, and\nreplay still use `@generalbusiness/artroom-*` workspace names, with public\nSDK names mapped at publication. The `artroom-replay` command,\n`ARTROOM_HOME`, `refs/artroom/`, and Worker names are unchanged.\n\nThe producer keeps an exact original\ncopy of each tracked SDK input, then changes only genuine module literals\nin its separate compiler inputs to the distribution names. Ordinary strings,\nprotocol names, package directories and source workspace versions remain\nunchanged. Staged manifests use the six distribution names and coordinated\ndependencies at the selected version, plus the dap repository and homepage.\nThe checker verifies both the original copies and the exact module rewrites.\n",
    "after": "The command is `dap`. `artroom` remains an alias. All workspace package names\nuse `@generalbusiness/dap-*`, including bytes, client and replay. The existing\nsix SDK names are unchanged; package-graph is the seventh name. The `artroom-replay` command,\n`ARTROOM_HOME`, `refs/artroom/`, protocol names and Worker names are unchanged.\n\nThe producer keeps exact original and compiler-input copies of each tracked\nSDK input. Package names need no publication mapping. Staged manifests use\nthe seven planned names and coordinated dependencies at the selected version,\nplus the dap repository and homepage. The checker verifies both copies\nagainst the original bytes. The public export and dependency allowlists\nare exact and reject unknown additions. The release plan includes the existing\nbytes `./application` and `./application-v2` and client `./application` source\nexports in the public map. Bytes and derive depend on the coordinated\npackage-graph stage; package-graph depends on contract. Every coordinated\nsource dependency must equal its source package version before it is mapped\nto the selected release version. The source-only install exclusion does not establish fresh\nproducer or consumer acceptance.\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "  assert.deepEqual(PLAN.packages.map(spec => nameOf(spec.dir)), [\"@generalbusiness/dap-contract\", \"@generalbusiness/dap-bytes\", \"@generalbusiness/dap-client\", \"@generalbusiness/dap-derive\", \"@generalbusiness/dap-platform\", \"@generalbusiness/dap-replay\"]);\n",
    "after": "  assert.deepEqual(PLAN.packages.map(spec => nameOf(spec.dir)), [\"@generalbusiness/dap-contract\", \"@generalbusiness/dap-package-graph\", \"@generalbusiness/dap-bytes\", \"@generalbusiness/dap-client\", \"@generalbusiness/dap-derive\", \"@generalbusiness/dap-platform\", \"@generalbusiness/dap-replay\"]);\n  // Small manifest fixture isolates naming from the separate compatibility obligation.\n  const namingSpec = { dir: \"bytes\", exports: { \".\": \"src/index\" }, dependencies: {} };\n  const namingInput = { name: \"@generalbusiness/dap-bytes\", type: \"module\", license: \"Apache-2.0\", exports: { \".\": \"./src/index.ts\" } };\n  assert.equal(publishManifest(namingSpec, namingInput, \"0.1.0-dev.2\").name, \"@generalbusiness/dap-bytes\");\n  assert.throws(() => publishManifest(namingSpec, { ...namingInput, name: \"@generalbusiness/artroom-bytes\" }, \"0.1.0-dev.2\"), /unsupported-source-manifest/);\n"
  },
  {
    "path": "scripts/public-release-lib.mjs",
    "before": "  if (JSON.stringify(excluded) !== JSON.stringify(spec.dir === \"platform\" ? { \"./testing\": \"./test/support.ts\" } : spec.dir === \"replay\" ? { \"./git\": \"./src/git.ts\" } : {})) refusal(\"source-export-exclusions\");\n",
    "after": "  if (JSON.stringify(excluded) !== JSON.stringify(spec.dir === \"platform\" ? { \"./testing\": \"./test/support.ts\", \"./application-install\": \"./src/application-install.ts\" } : spec.dir === \"replay\" ? { \"./git\": \"./src/git.ts\" } : {})) refusal(\"source-export-exclusions\");\n"
  },
  {
    "path": "docs/public-sdk-release.md",
    "before": "Platform publishes only its production root. The source manifest's exact\n`./testing` export is accounted for but excluded; an extra source export still\nrefuses. Replay publishes its existing portable library and pure command\n",
    "after": "Platform publishes its production root and `./membership-actions`.\nThe source-only exports `./testing` (`./test/support.ts`) and\n`./application-install` (`./src/application-install.ts`) are accounted for\nand excluded from the published export map. The install rules stay internal\nto the hosting Worker. This exclusion does not omit their production code\nfrom the compiled platform closure. An unknown source export or a changed\nexcluded path still refuses. Replay publishes its existing portable library and pure command\n"
  },
  {
    "path": "docs/public-sdk-release.md",
    "before": "# Produce the public SDK\n\nThis is the active six-package producer boundary. It builds and inspects\nJavaScript and declarations for contract, bytes, client, derive, platform and replay. It does\nnot publish, install application packages, configure accounts or deploy a\nservice. The earlier release guide is historical and inactive.\n\nThe six-package amendment is request `fecf7160fd4a8c4b9219d7713a11036ff48db85e`,\n",
    "after": "# Produce the public SDK\n\nThis is the active seven-package producer boundary: contract, package-graph,\nbytes, client, derive, platform and replay. Planner approved this seven-package\npolicy. The updated producer and checker\nhave not run at this source delivery. No new staged release, public package\nor consumer acceptance is claimed. The tools build and inspect JavaScript\nand declarations; they do not publish, install application packages,\nconfigure accounts or deploy a service. Recorded six-package outcomes below\nremain historical evidence.\n\nThe six-package amendment is request `fecf7160fd4a8c4b9219d7713a11036ff48db85e`,\n"
  },
  {
    "path": "docs/public-sdk-release.md",
    "before": "```\n\nThe six published SDK packages, in build order, are\n`@generalbusiness/dap-contract`, `@generalbusiness/dap-bytes`,\n`@generalbusiness/dap-client`, `@generalbusiness/dap-derive`,\n`@generalbusiness/dap-platform`, and `@generalbusiness/dap-replay`, all at\n",
    "after": "```\n\nThe seven SDK packages, in build order, are\n`@generalbusiness/dap-contract`, `@generalbusiness/dap-package-graph`,\n`@generalbusiness/dap-bytes`,\n`@generalbusiness/dap-client`, `@generalbusiness/dap-derive`,\n`@generalbusiness/dap-platform`, and `@generalbusiness/dap-replay`, all at\n"
  },
  {
    "path": "docs/public-sdk-release.md",
    "before": "checked again before the release manifest is sealed.\n\nBuild order is contract, bytes, client, derive, platform, replay. TypeScript 7.0.2 emits ES2022\nESM plus declarations without maps. Relative JavaScript extensions are\nrewritten by the compiler. Relative declaration module specifiers are\n",
    "after": "checked again before the release manifest is sealed.\n\nBuild order is contract, package-graph, bytes, client, derive, platform, replay. TypeScript 7.0.2 emits ES2022\nESM plus declarations without maps. Relative JavaScript extensions are\nrewritten by the compiler. Relative declaration module specifiers are\n"
  },
  {
    "path": "docs/public-sdk-release.md",
    "before": "excluded path still refuses. Replay publishes its existing portable library and pure command\nfunction. Its Node process wrapper `src/bin.ts` is copied only into an\nexcluded evidence directory, hashed, and omitted from compiler ancestry and\npublic output. This release supplies no `artroom-replay` executable. The checker\ncompares the complete included source inventory and that one exclusion. Both\npackages depend on the coordinated contract, bytes and derive stages. Their\ninput compilation uses the opt-in bytes/web declaration, as client and derive\ndo; it does not inject default consumer globals or broad Node/DOM types.\n",
    "after": "excluded path still refuses. Replay publishes its existing portable library and pure command\nfunction. Its Node process wrapper `src/bin.ts` is copied only into an\nexcluded evidence directory together with `src/git.ts`, hashed, and omitted\nfrom compiler ancestry and public output. This release supplies no `artroom-replay` executable. The checker\ncompares the complete included source inventory and both exact exclusions.\nReplay alone has a source-only platform dependency, used by its excluded Node\nwrapper. Its exact source-version pin is checked and that dependency is omitted\nfrom the published Replay manifest. Any unknown dependency, changed pin,\nextra export or changed exclusion refuses. Both packages depend on the\ncoordinated contract, bytes and derive stages. Their\ninput compilation uses the opt-in bytes/web declaration, as client and derive\ndo; it does not inject default consumer globals or broad Node/DOM types.\n"
  },
  {
    "path": "docs/public-sdk-release.md",
    "before": "operator controls the HTTPS URL, version, bindings, migration and real\nmembership/definition/read provisioning. GitHub App authority does not\nestablish npm publishing rights. Publishing six packages is not atomic;\ncomplete the set and verify all public versions/integrities before calling\nit an available coordinated release.\n",
    "after": "operator controls the HTTPS URL, version, bindings, migration and real\nmembership/definition/read provisioning. GitHub App authority does not\nestablish npm publishing rights. Publishing the seven packages is not atomic;\ncomplete the set and verify all public versions/integrities before calling\nit an available coordinated release.\n"
  },
  {
    "path": "docs/public-sdk-release.md",
    "before": "not established by packaging. This producer adds no CORS, grant, hosting,\nonboarding or universal durable-outbox protocol.\n\n## Module-reference repair\n",
    "after": "not established by packaging. This producer adds no CORS, grant, hosting,\nonboarding or universal durable-outbox protocol.\n\n## Seven-package closure checks\n\nThe actual-manifest witness remains positive for every planned package. It\nchecks the graph contract dependency, bytes application subpaths, client\napplication subpath, coordinated graph dependencies and Replay's exact\nsource-only platform omission. Unknown exports or dependencies and changed\nexcluded paths or pins still refuse. Only Replay bin/git inputs and outputs\nare excluded; bytes v2 source remains in the production closure.\n\nThe producer already compiles packages in plan order and admits only completed\npredecessor stages. Its generic loop needs no alternate resolver or source\nalias. The checker adds package-graph to its finite input set and requires it\nin the real compiled browser closure. Its compiled journey exercises graph\nfield inclusion in both directions and resolves the bytes application codecs\nand client compatibility export. NodeNext and Bundler type contexts use the\nsame public subpaths. These updated witnesses are unrun at this source delivery.\n\n## Module-reference repair\n"
  },
  {
    "path": "scripts/check-public-release.mjs",
    "before": "  for (const input of release.producerInputs) if (digest(readFileSync(join(ROOT, input.path))) !== input.sha256) refusal(\"producer-input-integrity\");\n  for (const input of release.inputs) {\n    if ((!/^(?:LICENSE|NOTICE|packages\\/(?:contract|bytes|client|derive|platform|replay)\\/(?:src\\/[^\\n]+\\.ts|package\\.json|README\\.md))$/.test(input.path) && !PUBLIC_TESTING_INPUTS.includes(input.path)) || /^packages\\/replay\\/src\\/(?:bin|git)\\.ts$/.test(input.path) || !contained(output, realpathSync(input.copy))) refusal(\"input-path\");\n    if (digest(readFileSync(join(ROOT, input.path))) !== input.sha256 || digest(readFileSync(input.copy)) !== input.sha256) refusal(\"input-integrity\");\n    if (/\\.ts$/.test(input.path)) {\n",
    "after": "  for (const input of release.producerInputs) if (digest(readFileSync(join(ROOT, input.path))) !== input.sha256) refusal(\"producer-input-integrity\");\n  for (const input of release.inputs) {\n    if ((!/^(?:LICENSE|NOTICE|packages\\/(?:contract|package-graph|bytes|client|derive|platform|replay)\\/(?:src\\/[^\\n]+\\.ts|package\\.json|README\\.md))$/.test(input.path) && !PUBLIC_TESTING_INPUTS.includes(input.path)) || /^packages\\/replay\\/src\\/(?:bin|git)\\.ts$/.test(input.path) || !contained(output, realpathSync(input.copy))) refusal(\"input-path\");\n    if (digest(readFileSync(join(ROOT, input.path))) !== input.sha256 || digest(readFileSync(input.copy)) !== input.sha256) refusal(\"input-integrity\");\n    if (/\\.ts$/.test(input.path)) {\n"
  },
  {
    "path": "scripts/check-public-release.mjs",
    "before": "import { replayCapture } from './replay-journey.mjs';\nimport { PROPOSED_BOUNDS } from '@generalbusiness/dap-contract';\nimport { canonicalBytes, keyIdOfSecret, sign, verify, verifySignedIntent } from '@generalbusiness/dap-bytes';\nimport { secretSigner, signedIntent, shapeDeclaredAct } from '@generalbusiness/dap-client';\n",
    "after": "import { replayCapture } from './replay-journey.mjs';\nimport { PROPOSED_BOUNDS } from '@generalbusiness/dap-contract';\nimport { fieldAssignable } from '@generalbusiness/dap-package-graph';\nimport { readApplicationPackage } from '@generalbusiness/dap-bytes/application';\nimport { readApplicationPackage2 } from '@generalbusiness/dap-bytes/application-v2';\nimport { readApplicationPackage as readClientApplicationPackage } from '@generalbusiness/dap-client/application';\nimport { canonicalBytes, keyIdOfSecret, sign, verify, verifySignedIntent } from '@generalbusiness/dap-bytes';\nimport { secretSigner, signedIntent, shapeDeclaredAct } from '@generalbusiness/dap-client';\n"
  },
  {
    "path": "scripts/check-public-release.mjs",
    "before": "const secret = new Uint8Array(32).fill(9), message = canonicalBytes({ b:2, a:1 });\nassert.equal(verify(keyIdOfSecret(secret), sign(secret,message),message),true);\nassert.equal(validateDefinition(small,PROPOSED_BOUNDS,RULE_PROFILES).ok,true);\nconst originalSmall = canonicalBytes(small);\n",
    "after": "const secret = new Uint8Array(32).fill(9), message = canonicalBytes({ b:2, a:1 });\nassert.equal(verify(keyIdOfSecret(secret), sign(secret,message),message),true);\nassert.equal(fieldAssignable({type:'int',min:1,max:2},{type:'int',min:0,max:3}),true);\nassert.equal(fieldAssignable({type:'int',min:0,max:3},{type:'int',min:1,max:2}),false);\nassert.equal(readClientApplicationPackage,readApplicationPackage);\nassert.equal(typeof readApplicationPackage2,'function');\nassert.equal(validateDefinition(small,PROPOSED_BOUNDS,RULE_PROFILES).ok,true);\nconst originalSmall = canonicalBytes(small);\n"
  },
  {
    "path": "scripts/check-public-release.mjs",
    "before": "  const typed = `import type { DeclaredDefinition, Intent } from '@generalbusiness/dap-contract';\nimport { canonicalBytes } from '@generalbusiness/dap-bytes';\nimport { secretSigner, signedIntent, type Signer } from '@generalbusiness/dap-client';\nimport { validateDefinition, type ValidDefinition } from '@generalbusiness/dap-derive';\n",
    "after": "  const typed = `import type { DeclaredDefinition, Intent } from '@generalbusiness/dap-contract';\nimport { canonicalBytes } from '@generalbusiness/dap-bytes';\nimport { fieldAssignable } from '@generalbusiness/dap-package-graph';\nimport { readApplicationPackage } from '@generalbusiness/dap-bytes/application';\nimport { readApplicationPackage2 } from '@generalbusiness/dap-bytes/application-v2';\nimport { readApplicationPackage as readClientApplicationPackage } from '@generalbusiness/dap-client/application';\nimport { secretSigner, signedIntent, type Signer } from '@generalbusiness/dap-client';\nimport { validateDefinition, type ValidDefinition } from '@generalbusiness/dap-derive';\n"
  },
  {
    "path": "scripts/check-public-release.mjs",
    "before": "const replayResult: Promise<Verification> = replay(httpSource('https://example.invalid'),replayOptions);\nvoid replayResult;\n`;\n  const use = join(consumer, \"use.ts\"); writeFileSync(use, typed, { flag: \"wx\" });\n",
    "after": "const replayResult: Promise<Verification> = replay(httpSource('https://example.invalid'),replayOptions);\nvoid replayResult;\nfieldAssignable({type:'int',min:1,max:2},{type:'int',min:0,max:3});\nconst sameApplicationCodec: typeof readApplicationPackage = readClientApplicationPackage;\nvoid sameApplicationCodec; void readApplicationPackage2;\n`;\n  const use = join(consumer, \"use.ts\"); writeFileSync(use, typed, { flag: \"wx\" });\n"
  },
  {
    "path": "scripts/check-public-release.mjs",
    "before": "  if (!browserInputs.length || browserInputs.length > 10000 || browserOutputs.length !== 1 || realpathSync(join(consumer,browserOutputs[0][0])) !== browserFile || realpathSync(join(consumer,browserOutputs[0][1].entryPoint)) !== replayFile || browserOutputs[0][1].imports.some(ref=>ref.external)) refusal(\"browser-inventory\");\n  const browserProof = browserInputs.map(path => {const supplied = realpathSync(join(consumer,path)); if (supplied !== replayFile && !contained(join(output,\"packages\"),supplied) && !release.dependencies.some(dep=>contained(join(output,\"node_modules\",dep.name),supplied))) refusal(\"browser-source-ancestry\"); return {path:supplied,sha256:digest(readFileSync(supplied))};});\n  for (const dir of [\"replay\",\"platform\",\"derive\",\"bytes\"]) if (!browserProof.some(input=>contained(join(output,\"packages\",dir),input.path))) refusal(\"browser-missing-package\");\n  const jsonataInput = realpathSync(join(output,\"node_modules/jsonata/jsonata.js\"));\n  if (Object.entries(meta.inputs).some(([name,input])=>input.imports.some(ref=>ref.external && !browserRuntimeEdge(realpathSync(join(consumer,name)),ref,jsonataInput))) || references(readFileSync(browserFile,\"utf8\")).length) refusal(\"browser-external-module\");\n",
    "after": "  if (!browserInputs.length || browserInputs.length > 10000 || browserOutputs.length !== 1 || realpathSync(join(consumer,browserOutputs[0][0])) !== browserFile || realpathSync(join(consumer,browserOutputs[0][1].entryPoint)) !== replayFile || browserOutputs[0][1].imports.some(ref=>ref.external)) refusal(\"browser-inventory\");\n  const browserProof = browserInputs.map(path => {const supplied = realpathSync(join(consumer,path)); if (supplied !== replayFile && !contained(join(output,\"packages\"),supplied) && !release.dependencies.some(dep=>contained(join(output,\"node_modules\",dep.name),supplied))) refusal(\"browser-source-ancestry\"); return {path:supplied,sha256:digest(readFileSync(supplied))};});\n  for (const dir of [\"replay\",\"platform\",\"derive\",\"bytes\",\"package-graph\"]) if (!browserProof.some(input=>contained(join(output,\"packages\",dir),input.path))) refusal(\"browser-missing-package\");\n  const jsonataInput = realpathSync(join(output,\"node_modules/jsonata/jsonata.js\"));\n  if (Object.entries(meta.inputs).some(([name,input])=>input.imports.some(ref=>ref.external && !browserRuntimeEdge(realpathSync(join(consumer,name)),ref,jsonataInput))) || references(readFileSync(browserFile,\"utf8\")).length) refusal(\"browser-external-module\");\n"
  },
  {
    "path": "scripts/public-release-lib.mjs",
    "before": "// Six portable SDK packages only. No package loading or external service calls here.\nimport { createHash } from \"node:crypto\";\nimport { moduleSpecifierSpans } from \"./public-release-modules.mjs\";\n",
    "after": "// Seven portable SDK packages only. No package loading or external service calls here.\nimport { createHash } from \"node:crypto\";\nimport { moduleSpecifierSpans } from \"./public-release-modules.mjs\";\n"
  },
  {
    "path": "scripts/public-release-lib.mjs",
    "before": "  const excluded = spec.excludedSourceExports ?? {};\n  if (JSON.stringify(excluded) !== JSON.stringify(spec.dir === \"platform\" ? { \"./testing\": \"./test/support.ts\", \"./application-install\": \"./src/application-install.ts\" } : spec.dir === \"replay\" ? { \"./git\": \"./src/git.ts\" } : {})) refusal(\"source-export-exclusions\");\n  const keys = Object.keys(source.exports ?? {});\n  if (JSON.stringify(keys.sort()) !== JSON.stringify([...Object.keys(spec.exports), ...Object.keys(excluded)].sort()) || source.name !== nameOf(spec.dir) || source.type !== \"module\" || source.license !== \"Apache-2.0\") refusal(\"unsupported-source-manifest\");\n",
    "after": "  const excluded = spec.excludedSourceExports ?? {};\n  if (JSON.stringify(excluded) !== JSON.stringify(spec.dir === \"platform\" ? { \"./testing\": \"./test/support.ts\", \"./application-install\": \"./src/application-install.ts\" } : spec.dir === \"replay\" ? { \"./git\": \"./src/git.ts\" } : {})) refusal(\"source-export-exclusions\");\n  const excludedDependencies = spec.excludedSourceDependencies ?? {};\n  if (JSON.stringify(excludedDependencies) !== JSON.stringify(spec.dir === \"replay\" ? { \"@generalbusiness/dap-platform\": \"coordinated\" } : {})) refusal(\"source-dependency-exclusions\");\n  for (const name of Object.keys(excludedDependencies)) if (source.dependencies?.[name] !== source.version) refusal(\"source-only-dependency-pin\");\n  const keys = Object.keys(source.exports ?? {});\n  if (JSON.stringify(keys.sort()) !== JSON.stringify([...Object.keys(spec.exports), ...Object.keys(excluded)].sort()) || source.name !== nameOf(spec.dir) || source.type !== \"module\" || source.license !== \"Apache-2.0\") refusal(\"unsupported-source-manifest\");\n"
  },
  {
    "path": "scripts/public-release-lib.mjs",
    "before": "    if (path.endsWith(\".d.ts\") ? JSON.stringify(old) !== JSON.stringify({ types: `./${path}` }) : old !== `./${path}.ts`) refusal(\"unsupported-source-export\");\n  }\n  if (JSON.stringify(Object.keys(source.dependencies ?? {}).sort()) !== JSON.stringify(Object.keys(spec.dependencies).sort())) refusal(\"unsupported-source-dependencies\");\n  for (const [name, pin] of Object.entries(spec.dependencies)) if (pin !== \"coordinated\" && source.dependencies[name] !== pin) refusal(\"dependency-pin\");\n  return {\n    name: nameOf(spec.dir), version: version(selected), description: source.description, license: source.license,\n",
    "after": "    if (path.endsWith(\".d.ts\") ? JSON.stringify(old) !== JSON.stringify({ types: `./${path}` }) : old !== `./${path}.ts`) refusal(\"unsupported-source-export\");\n  }\n  if (JSON.stringify(Object.keys(source.dependencies ?? {}).sort()) !== JSON.stringify([...Object.keys(spec.dependencies), ...Object.keys(excludedDependencies)].sort())) refusal(\"unsupported-source-dependencies\");\n  for (const [name, pin] of Object.entries(spec.dependencies)) if (source.dependencies[name] !== (pin === \"coordinated\" ? source.version : pin)) refusal(\"dependency-pin\");\n  return {\n    name: nameOf(spec.dir), version: version(selected), description: source.description, license: source.license,\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "    for (const line of source.split(\"\\n\").slice(8)) assert.ok(rewritten.includes(line));\n    assert.deepEqual(rewriteDeclarationRefs(dir), []);\n    const replay = PLAN.packages.find(spec => spec.dir === \"replay\");\n    assert.deepEqual(productionInputs(replay, [\"packages/replay/src/index.ts\", \"packages/replay/src/bin.ts\", \"packages/replay/src/git.ts\"]), { names: [\"packages/replay/src/index.ts\"], omitted: [\"packages/replay/src/bin.ts\", \"packages/replay/src/git.ts\"] });\n",
    "after": "    for (const line of source.split(\"\\n\").slice(8)) assert.ok(rewritten.includes(line));\n    assert.deepEqual(rewriteDeclarationRefs(dir), []);\n    const bytesSpec = PLAN.packages.find(spec => spec.dir === \"bytes\");\n    const applicationInputs = [\"packages/bytes/src/index.ts\", \"packages/bytes/src/application.ts\", \"packages/bytes/src/application-v2.ts\", \"packages/bytes/src/application-package-v2.ts\"];\n    assert.deepEqual(productionInputs(bytesSpec, applicationInputs), { names: applicationInputs, omitted: [] });\n    assert.throws(() => productionInputs({ ...bytesSpec, excludedInputs: [\"src/application-v2.ts\"] }, applicationInputs), /source-input-exclusions/);\n    const replay = PLAN.packages.find(spec => spec.dir === \"replay\");\n    assert.deepEqual(productionInputs(replay, [\"packages/replay/src/index.ts\", \"packages/replay/src/bin.ts\", \"packages/replay/src/git.ts\"]), { names: [\"packages/replay/src/index.ts\"], omitted: [\"packages/replay/src/bin.ts\", \"packages/replay/src/git.ts\"] });\n"
  },
  {
    "path": "scripts/public-release-modules.test.mjs",
    "before": "      writeFileSync(join(stage, \"dist/src/index.d.ts\"), \"export {};\\n\");\n    }\n    const jsonataInput = \"/owned/node_modules/jsonata/jsonata.js\";\n    const synthetic = { path: \"<runtime>\", kind: \"import-statement\", external: true };\n",
    "after": "      writeFileSync(join(stage, \"dist/src/index.d.ts\"), \"export {};\\n\");\n    }\n    // All planned bytes subpaths must exist, and their graph dependency must\n    // remain admitted by the output closure.\n    const applicationStage = join(dir, \"application-production\");\n    mkdirSync(join(applicationStage, \"dist/src\"), { recursive: true });\n    const bytesManifest = JSON.parse(readFileSync(new URL(\"packages/bytes/package.json\", root), \"utf8\"));\n    writeFileSync(join(applicationStage, \"package.json\"), JSON.stringify(publishManifest(bytesSpec, bytesManifest, \"0.1.0-dev.2\")));\n    for (const name of [\"index\", \"application\", \"application-v2\"]) {\n      for (const extension of [\"js\", \"d.ts\"]) writeFileSync(join(applicationStage, `dist/src/${name}.${extension}`), name === \"application-v2\" ? \"export { fieldAssignable } from '@generalbusiness/dap-package-graph';\\n\" : \"export {};\\n\");\n    }\n    writeFileSync(join(applicationStage, \"dist/src/web.d.ts\"), \"export {};\\n\");\n    assert.equal(outputClosure(applicationStage, bytesSpec, \"0.1.0-dev.2\").length, 8);\n    const withoutGraph = { ...bytesSpec, dependencies: Object.fromEntries(Object.entries(bytesSpec.dependencies).filter(([name]) => name !== \"@generalbusiness/dap-package-graph\")) };\n    assert.throws(() => outputClosure(applicationStage, withoutGraph, \"0.1.0-dev.2\"), /bare-output-closure/);\n    rmSync(join(applicationStage, \"dist/src/application-v2.js\"));\n    assert.throws(() => outputClosure(applicationStage, bytesSpec, \"0.1.0-dev.2\"), /missing-export/);\n    const jsonataInput = \"/owned/node_modules/jsonata/jsonata.js\";\n    const synthetic = { path: \"<runtime>\", kind: \"import-statement\", external: true };\n"
  },
  {
    "path": "scripts/public-release.json",
    "before": "  \"packages\": [\n    { \"dir\": \"contract\", \"exports\": { \".\": \"src/index\" }, \"dependencies\": {} },\n    { \"dir\": \"bytes\", \"exports\": { \".\": \"src/index\", \"./web\": \"src/web.d.ts\" }, \"dependencies\": { \"@generalbusiness/dap-contract\": \"coordinated\", \"@noble/curves\": \"2.4.0\", \"@noble/hashes\": \"2.4.0\" } },\n    { \"dir\": \"client\", \"exports\": { \".\": \"src/index\", \"./application\": \"src/application\" }, \"dependencies\": { \"@generalbusiness/dap-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\" } },\n    { \"dir\": \"derive\", \"exports\": { \".\": \"src/index\", \"./rule\": \"src/rule/index\", \"./testing\": \"test/fixtures\" }, \"dependencies\": { \"@generalbusiness/dap-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\", \"jsonata\": \"2.2.2\", \"@generalbusiness/dap-package-graph\": \"coordinated\" } },\n",
    "after": "  \"packages\": [\n    { \"dir\": \"contract\", \"exports\": { \".\": \"src/index\" }, \"dependencies\": {} },\n    { \"dir\": \"package-graph\", \"exports\": { \".\": \"src/index\" }, \"dependencies\": { \"@generalbusiness/dap-contract\": \"coordinated\" } },\n    { \"dir\": \"bytes\", \"exports\": { \".\": \"src/index\", \"./web\": \"src/web.d.ts\", \"./application\": \"src/application\", \"./application-v2\": \"src/application-v2\" }, \"dependencies\": { \"@generalbusiness/dap-contract\": \"coordinated\", \"@noble/curves\": \"2.4.0\", \"@noble/hashes\": \"2.4.0\", \"@generalbusiness/dap-package-graph\": \"coordinated\" } },\n    { \"dir\": \"client\", \"exports\": { \".\": \"src/index\", \"./application\": \"src/application\" }, \"dependencies\": { \"@generalbusiness/dap-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\" } },\n    { \"dir\": \"derive\", \"exports\": { \".\": \"src/index\", \"./rule\": \"src/rule/index\", \"./testing\": \"test/fixtures\" }, \"dependencies\": { \"@generalbusiness/dap-bytes\": \"coordinated\", \"@generalbusiness/dap-contract\": \"coordinated\", \"jsonata\": \"2.2.2\", \"@generalbusiness/dap-package-graph\": \"coordinated\" } },\n"
  }
];
// Exactly one newly authored publication document accompanies this amendment.
// This is not a general new-file or digest-value exception.
const PUBLICATION_ADDITIONS = Object.freeze({
  "packages/package-graph/README.md": Object.freeze({ bytes: 819, sha256: "61720a00350d6ef4d2a4191d8ca9c979308c22964895814648f2ef8bafb8609b" }),
});
const SELF = new Set(["scripts/rename-workspaces.mjs", "scripts/workspace-rename-preservation.json"]);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const quote = value => JSON.stringify(value).slice(1, -1);
const rename = value => {
  for (const [old, next] of Object.entries(WORKSPACE_RENAMES)) {
    if (value === old || value.startsWith(`${old}/`)) return next + value.slice(old.length);
  }
  return value;
};
const exactTokens = text => Object.keys(WORKSPACE_RENAMES).filter(name => text.includes(name));
const historical = path => path.startsWith("notes/") || path.startsWith("spikes/");
const packageConfig = path => /(?:^|\/)(?:package(?:-lock)?\.json|tsconfig[^/]*\.json)$/.test(path);
const code = path => /\.(?:[cm]?[jt]sx?)$/.test(path);
const currentDoc = path => path.endsWith(".md") && !historical(path);
const normalize = edits => {
  const sorted = edits.sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) if (sorted[i - 1].end > sorted[i].start) throw Error("Overlapping rename spans.");
  return sorted;
};
function apply(text, edits) {
  let result = text;
  for (const edit of [...edits].reverse()) result = result.slice(0, edit.start) + edit.value + result.slice(edit.end);
  return result;
}
function projection(text, edits, after = false) {
  let result = "", prior = 0, shift = 0;
  for (const edit of edits) {
    const start = edit.start + (after ? shift : 0), end = after ? start + edit.value.length : edit.end;
    result += text.slice(prior, start) + "\0WORKSPACE_MODULE\0"; prior = end;
    shift += edit.value.length - (edit.end - edit.start);
  }
  return result + text.slice(prior);
}
function jsonEdits(text) {
  const edits = [];
  // Only package manifests/lockfiles and compiler configuration use this path.
  for (const match of text.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
    const value = JSON.parse(match[0]);
    let changed = value;
    for (const [old, next] of Object.entries(WORKSPACE_RENAMES)) {
      changed = changed.replaceAll(old, (match, at) => /[A-Za-z0-9_-]/.test(changed[at + match.length] ?? "") ? match : next);
    }
    if (changed !== value) edits.push({ start: match.index, end: match.index + match[0].length, value: JSON.stringify(changed), kind: "package-config" });
  }
  return edits;
}
function moduleEdits(text) {
  const parsed = text.startsWith("#!") ? text.replace(/^[^\n]*/, line => " ".repeat(line.length)) : text;
  return moduleSpecifierSpans(parsed).flatMap(span => {
    const changed = rename(span.value);
    if (changed === span.value) return [];
    let encoded = quote(changed).replace(/'/g, span.quote === "'" ? "\\'" : "'");
    if (span.quote === "`") encoded = encoded.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
    return [{ start: span.start, end: span.end, value: encoded, kind: "module" }];
  });
}
function docEdits(text) {
  const edits = [];
  for (const [old, next] of Object.entries(WORKSPACE_RENAMES)) {
    let start = 0;
    while ((start = text.indexOf(old, start)) !== -1) {
      const following = text[start + old.length];
      if (!following || !/[A-Za-z0-9_-]/.test(following)) edits.push({ start, end: start + old.length, value: next, kind: "current-doc" });
      start += old.length;
    }
  }
  return edits;
}
// These are executable test bindings or generated module source, never journal data.
const IDENTIFIER_SOURCE = new Set([
  "apps/room/lanes/test/rehearsal-stops.test.ts",
  "apps/room/page/test/claim-ui.test.ts", "apps/room/page/test/correction-main.test.ts",
  "apps/room/page/test/sending.test.ts", "apps/room/page/test/start-ui.test.ts",
  "packages/cli/src/application-new.ts", "packages/cli/test/application-pack.test.ts",
  "scripts/active-source.test.mjs",
]);
const HEADER_SOURCE = new Set([
  "packages/platform/test/support-creation.ts", "packages/scope/test/archive-installed.test.ts",
  "packages/scope/test/github-creation.test.ts", "packages/scope/test/hosts.ts", "scripts/demo-captures.ts",
]);
function anchoredEdits(text, before, after, kind) {
  const edits = [];
  let at = 0;
  while ((at = text.indexOf(before, at)) !== -1) {
    edits.push({ start: at, end: at + before.length, value: after, kind });
    at += before.length;
  }
  return edits;
}
function sourceEdits(path, text) {
  let edits;
  try { edits = moduleEdits(text); }
  catch (error) {
    if (!HEADER_SOURCE.has(path)) throw error;
    // These known parser-limited files keep every package import in their header.
    const boundary = text.search(/^(?:export (?:const|class|function|interface)|const |function )/m);
    if (boundary < 0) throw error;
    edits = moduleEdits(text.slice(0, boundary));
  }
  if (IDENTIFIER_SOURCE.has(path)) {
    for (const match of text.matchAll(/["'](@generalbusiness\/artroom-[a-z-]+(?:\/[^"'\n]*)?)["']/g)) {
      if (rename(match[1]) === match[1]) continue;
      const prefix = text.slice(Math.max(0, match.index - 500), match.index + 1);
      const line = text.slice(text.lastIndexOf("\n", match.index) + 1, text.indexOf("\n", match.index));
      const binding = /vi\.(?:mock|doMock|doUnmock)\(\s*["']$/.test(prefix)
        || /vi\.importActual(?:<[^;\n]*>)?\(\s*["']$/.test(prefix)
        || line.includes("vi.doUnmock(");
      const generatedImport = path === "packages/cli/test/application-pack.test.ts" && (/from\s+["']$/.test(prefix) || /\.not\.toContain\(["']$/.test(prefix));
      if (path !== "scripts/active-source.test.mjs" && !binding && !generatedImport) continue;
      const start = match.index + 1, end = start + match[1].length;
      if (!edits.some(edit => edit.start <= start && edit.end >= end)) edits.push({ start, end, value: rename(match[1]), kind: "executable-module-binding" });
    }
    // The application generator's static module import is inside a template literal.
    if (path === "packages/cli/src/application-new.ts") for (const [old, next] of Object.entries(WORKSPACE_RENAMES)) for (const edit of anchoredEdits(text, `from "${old}"`, `from "${next}"`, "generated-module-import")) {
      if (!edits.some(prior => prior.start < edit.end && prior.end > edit.start)) edits.push(edit);
    }
  }
  if (["packages/checkers/src/index.ts", "packages/git/src/index.ts"].includes(path)) {
    const firstCommentEnd = text.indexOf("*/") + 2;
    edits.push(...docEdits(text.slice(0, firstCommentEnd)).map(edit => ({ ...edit, kind: "workspace-documentation" })));
  }
  if (path === "packages/cli/src/application-browser.ts") {
    edits.push(...anchoredEdits(text, "/^@generalbusiness\\/artroom-client(?:\\/.*)?$/", "/^@generalbusiness\\/dap-client(?:\\/.*)?$/", "package-policy"));
  }
  if (path === "scripts/active-source.test.mjs") {
    for (const [before, after] of [
      ["(?:artroom-bytes|dap-(?:contract|derive))", "dap-(?:bytes|contract|derive)"],
      ["@generalbusiness\\/artroom-git", "@generalbusiness\\/dap-git"],
      ["(artroom-(bytes|client)|dap-(contract|platform|derive))", "dap-(bytes|client|contract|platform|derive)"],
      ["/artroom-git/.test", "/dap-git/.test"],
    ]) edits.push(...anchoredEdits(text, before, after, "package-policy"));
  }
  return edits;
}
function publicationReplacement(text, row) {
  const afterCount = text.split(row.after).length - 1;
  const beforeCount = text.split(row.before).length - 1;
  if (afterCount === 1) {
    const at = text.indexOf(row.after), end = at + row.after.length;
    let oldAt = -1;
    while ((oldAt = text.indexOf(row.before, oldAt + 1)) !== -1) {
      if (oldAt < at || oldAt + row.before.length > end) throw Error(`Ambiguous publication replacement: ${row.path}`);
    }
    return text;
  }
  if (afterCount !== 0 || beforeCount !== 1) throw Error(`Ambiguous publication replacement: ${row.path}`);
  return text.replace(row.before, () => row.after);
}
function checkPublicationAnchors() {
  // One ordinary replacement and one insertion that retains old text internally.
  // The complete real-file replay below checks every reviewed actual anchor.
  for (const index of [0, 20]) {
    const row = PUBLICATION_REPLACEMENTS[index];
    if (publicationReplacement(row.after, row) !== row.after) throw Error("Publication anchor idempotence failed.");
    let refused = false;
    try { publicationReplacement(row.after + "\n" + row.before, row); }
    catch (error) { if (error.message !== `Ambiguous publication replacement: ${row.path}`) throw error; refused = true; }
    if (!refused) throw Error("A conflicting publication anchor was accepted.");
  }
}
function publicationText(path, text) {
  let next = text;
  const steps = [];
  for (const row of PUBLICATION_REPLACEMENTS.filter(row => row.path === path)) {
    const before = hash(next), changed = publicationReplacement(next, row);
    if (changed === next) continue;
    next = changed;
    steps.push({ before, after: hash(next) });
  }
  return { next, steps };
}
function publicationAdditionRows(rows) {
  const expected = Object.entries(PUBLICATION_ADDITIONS).map(([path, value]) => ({ path, ...value, digests: [] }));
  if (!sameJson(rows, expected)) throw Error("Added publication source set differs.");
  return expected;
}
function publicationAdditionBytes(row, current) {
  if (current.stat.nlink !== 1 || current.bytes.length !== row.bytes || hash(current.bytes) !== row.sha256
    || !sameJson(literalDigests(current.bytes.toString("utf8")), row.digests)) throw Error(`Added publication source differs: ${row.path}`);
}
function publicationAdditionControls(rows, guards) {
  // These use the actual fixed validators and owned bytes, with no filesystem
  // mutation or extra reads. The real positive was admitted immediately above.
  const refuse = (action, message, name) => {
    try { action(); }
    catch (error) { if (error.message === message) return; throw error; }
    throw Error(`Added publication ${name} control was accepted.`);
  };
  refuse(() => publicationAdditionRows([]), "Added publication source set differs.", "missing-record");
  refuse(() => publicationAdditionRows(rows.map(row => ({ ...row, path: "packages/package-graph/OTHER.md" }))),
    "Added publication source set differs.", "path");
  const changed = Buffer.from(guards[0].bytes); changed[0] ^= 1;
  refuse(() => publicationAdditionBytes(rows[0], { stat: guards[0].stat, bytes: changed }),
    `Added publication source differs: ${rows[0].path}`, "hash");
  return 3;
}
function publicationAdditions(baseline) {
  if (baseline.addedPublicationSources === undefined) {
    // Older inventories remain usable only before the exact new document exists.
    for (const path of Object.keys(PUBLICATION_ADDITIONS)) {
      try { lstatSync(resolve(ROOT, path)); }
      catch (error) { if (error.code === "ENOENT") continue; throw error; }
      throw Error("Added publication source needs its preservation record.");
    }
    return { rows: [], guards: [], controls: 0 };
  }
  const rows = publicationAdditionRows(baseline.addedPublicationSources), guards = [];
  for (const row of rows) {
    if (execFileSync("git", ["ls-tree", "--name-only", baseline.basis, "--", row.path], { cwd: ROOT, encoding: "utf8" }).trim()) {
      throw Error(`Added publication source already exists at the accepted basis: ${row.path}`);
    }
    const current = read(row.path);
    publicationAdditionBytes(row, current);
    guards.push(current);
  }
  return { rows, guards, controls: publicationAdditionControls(rows, guards) };
}
function literalDigests(text) {
  return [...text.matchAll(/\b(?:sha(?:1|256):)?[a-f0-9]{40,64}\b/g)].map(match => match[0]);
}
function protectedLeaf(path) {
  return /(?:^|\/)definitions\/[^/]+\.json$/.test(path)
    || ["apps/counter/definition.json", "apps/counter/commitments.json", "examples/lending/definition.json", "examples/grow/demo/application.dap.json", "apps/room/page/test/fixtures/custody-before-k3.json", "packages/platform/src/native-declarations.generated.ts"].includes(path)
    || /(?:^|\/)(?:pin|commitments-pin|digests|digests3)\.ts$/.test(path)
    || /\/test\/fixtures\/.*\.(?:json|bin|pack|idx)$/.test(path);
}
function read(path) {
  const full = resolve(ROOT, path), stat = lstatSync(full);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error(`Rename input is not a regular file: ${path}`);
  return { full, stat, bytes: readFileSync(full) };
}
// This is the sole digest-value exception. Map names, ordered owner keys and all
// surrounding bytes remain fixed; this list is not a general source-seal policy.
const SOURCE_SEAL_FILE = "scripts/security-entry-points.test.mjs";
const SOURCE_SEAL_INVENTORY = "scripts/workspace-rename-preservation.json";
const SOURCE_SEAL_TOOL = "scripts/security-entry-points.mjs";
const SOURCE_SEAL_MAPS = Object.freeze({
  "seals": Object.freeze([
    "apps/room/worker.ts",
    "apps/room/fetch.ts",
    "apps/room/demo-creation.ts",
    "apps/room/page/route.ts",
    "apps/room/brand/route.ts",
    "packages/scope/src/worker.ts",
    "packages/scope/src/scope-index.ts",
    "packages/scope/src/creation-admission.ts",
    "packages/scope/src/creation-lineage.ts",
    "packages/scope/src/creation-declaration.ts",
    "packages/scope/src/namespace.ts",
    "packages/scope/src/health.ts",
    "packages/scope/src/site/route.ts",
    "packages/scope/src/applications/route.ts",
    "packages/scope/src/item-query-wire.ts",
    "packages/scope/src/applications/projection-wire.ts",
    "packages/scope/src/object.ts",
    "packages/scope/src/core.ts",
    "packages/derive/src/genesis.ts",
    "packages/derive/src/judge.ts",
    "packages/scope/src/sessions.ts",
    "packages/scope/src/reads.ts",
    "packages/scope/src/signed-reads.ts",
    "packages/scope/src/limits.ts",
    "packages/scope/src/serving-limits.ts",
    "packages/scope/src/serving-admission.ts",
    "packages/bytes/src/records.ts",
    "packages/scope/src/session-preparation.ts",
    "packages/scope/src/item-queries.ts",
    "packages/scope/src/applications/projection.ts",
    "packages/scope/src/destination-host.ts",
    "packages/mcp/src/hosted.ts",
    "packages/mcp/src/http.ts",
    "examples/grow/simulator-worker.ts",
    "examples/grow/simulator-host.ts"
  ]),
  "pendingArchiveSeals": Object.freeze([
    "packages/scope/src/archive-target.ts",
    "packages/scope/src/archive-source-window.ts",
    "packages/scope/src/archive-publication.ts",
    "packages/scope/src/archive-build.ts",
    "packages/scope/src/archive-driver.ts",
    "packages/scope/src/archive-row.ts",
    "packages/scope/src/floor-writer.ts",
    "packages/scope/src/object.ts",
    "apps/room/worker.grow.ts",
    "apps/room/archive-policy.ts",
    "apps/room/archive.ts",
    "packages/scope/src/archive-host-item.ts",
    "packages/scope/src/archive-host.ts",
    "packages/scope/src/artifacts-host.ts",
    "packages/scope/src/artifacts-wiring.ts"
  ]),
  "pendingR8Seals": Object.freeze([
    "packages/cli/src/commands.ts",
    "apps/sandbox/worker.ts",
    "packages/client/src/application-gateway.ts",
    "packages/client/src/application-route.ts",
    "packages/scope/src/applications/bindings.ts"
  ])
});
const SOURCE_SEAL_OWNERS = [...new Set(Object.values(SOURCE_SEAL_MAPS).flat())];
const sha256 = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const jsonText = value => JSON.stringify(value, null, 2) + "\n";
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function sealKeys(value, keys, what) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || !sameJson(Object.keys(value).sort(), [...keys].sort())) throw Error(`Invalid source-seal ${what}.`);
}
function sealIdentity(stat) {
  return [stat.dev, stat.ino, stat.mode, stat.nlink, stat.size, stat.mtimeMs, stat.ctimeMs];
}
function sealRead(full, maximum = 1024 * 1024) {
  const before = lstatSync(full);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1
    || before.size > maximum || realpathSync(full) !== full) throw Error("Invalid source-seal input file.");
  const fd = openSync(full, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd), buffer = Buffer.alloc(before.size + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(fd, buffer, length, buffer.length - length, null);
      if (!count) break;
      length += count;
    }
    const bytes = buffer.subarray(0, length), after = fstatSync(fd), leaf = lstatSync(full);
    if (!sameJson(sealIdentity(before), sealIdentity(opened))
      || !sameJson(sealIdentity(opened), sealIdentity(after))
      || !sameJson(sealIdentity(after), sealIdentity(leaf)) || bytes.length !== before.size) {
      throw Error("A source-seal input changed during reading.");
    }
    return { full, stat: after, bytes };
  } finally { closeSync(fd); }
}
function sealInventory(optional = false) {
  const full = resolve(ROOT, SOURCE_SEAL_INVENTORY);
  // Only initial absence is optional. Once observed, an inventory that vanishes
  // during the guarded read must fail rather than bypass adopted metadata.
  try { lstatSync(full); }
  catch (error) {
    if (optional && error.code === "ENOENT") return undefined;
    throw error;
  }
  return sealRead(full);
}
function sealBaseline(inventory) {
  if (!inventory) return undefined;
  const baseline = JSON.parse(sealText(inventory.bytes));
  if (!baseline || typeof baseline !== "object" || Array.isArray(baseline)
    || baseline.format !== "dap-workspace-rename-preservation-1" || typeof baseline.basis !== "string" || !/^[a-f0-9]{40}$/.test(baseline.basis)
    || !Array.isArray(baseline.protectedLeaves) || !Array.isArray(baseline.transformedSources)
    || (baseline.publicationSources !== undefined && !Array.isArray(baseline.publicationSources))) {
    throw Error("Invalid preservation inventory.");
  }
  return baseline;
}
function sealText(bytes) {
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes)) throw Error("Invalid source-seal UTF-8.");
  return text;
}
function sealOriginal(basis, path) {
  return execFileSync("git", ["show", `${basis}:${path}`], { cwd: ROOT, maxBuffer: 4 * 1024 * 1024 });
}
function sealSlots(text) {
  if (Buffer.byteLength(text) > 128 * 1024) throw Error("Source-seal map file is too large.");
  const slots = [];
  for (const [map, owners] of Object.entries(SOURCE_SEAL_MAPS)) {
    const headers = [...text.matchAll(new RegExp(`^const ${map} = \\{\\n`, "gm"))];
    if (headers.length !== 1) throw Error(`Source-seal map header differs: ${map}`);
    const start = headers[0].index + headers[0][0].length;
    const endMatch = /^\};$/gm;
    endMatch.lastIndex = start;
    const end = endMatch.exec(text)?.index;
    if (end === undefined) throw Error(`Source-seal map terminator differs: ${map}`);
    const rows = [];
    for (const line of text.slice(start, end).matchAll(/[^\n]*\n/g)) {
      if (/^[ \t]*(?:\/\/[^\n]*)?\n$/.test(line[0])) continue;
      const row = /^[ \t]*"([^"\n]+)": "([a-f0-9]{64})",?[ \t]*(?:\/\/[^\n]*)?\n$/.exec(line[0]);
      if (!row) throw Error(`Source-seal map syntax differs: ${map}`);
      const valueStartUtf16 = start + line.index + row[0].indexOf(`"${row[1]}": "`) + row[1].length + 5;
      rows.push({ map, owner: row[1], value: row[2], valueStartUtf16, valueEndUtf16: valueStartUtf16 + 64 });
    }
    if (!sameJson(rows.map(row => row.owner), owners)) throw Error(`Source-seal map keys differ: ${map}`);
    slots.push(...rows);
  }
  if (slots.length !== 55 || SOURCE_SEAL_OWNERS.length !== 54
    || slots.some((row, index) => index > 0 && row.valueStartUtf16 < slots[index - 1].valueEndUtf16)) {
    throw Error("Invalid finite source-seal manifest or map order.");
  }
  return slots;
}
function sealProjection(text, slots) {
  let next = text;
  for (const row of [...slots].sort((a, b) => b.valueStartUtf16 - a.valueStartUtf16)) {
    next = next.slice(0, row.valueStartUtf16) + "\0SOURCE_SEAL_VALUE\0" + next.slice(row.valueEndUtf16);
  }
  return next;
}
function sealFileState(record, text, requireAdopted = false) {
  const slots = sealSlots(text); // Resolve exact map/key bindings before checking whole-file counters.
  if (!sameJson(slots.map(({ map, owner, valueStartUtf16, valueEndUtf16 }) => ({ map, owner, valueStartUtf16, valueEndUtf16 })),
    record.entries.map(({ map, owner, valueStartUtf16, valueEndUtf16 }) => ({ map, owner, valueStartUtf16, valueEndUtf16 })))) {
    throw Error("Source-seal value ranges differ.");
  }
  if (hash(sealProjection(text, slots)) !== record.outsideValueProjectionSha256) throw Error("Source-seal outside-value bytes differ.");
  const digest = hash(text);
  if (digest === record.afterSha256) return "adopted";
  if (!requireAdopted && digest === record.beforeSha256) return "old";
  throw Error("Source-seal file is neither exact old nor exact adopted state.");
}
function sealKeyControl(record, text) {
  // One in-memory negative beside the real positive. Values/output/owner proofs
  // stay unchanged. No candidate mutation or deliberately invalid parser run.
  const mutant = text.replace('"apps/room/worker.ts"', '"apps/room/workers.ts"');
  try { sealFileState(record, mutant); }
  catch (error) {
    if (error.message === "Source-seal map keys differ: seals") return;
    throw error;
  }
  throw Error("Source-seal owner-key control was accepted.");
}
const SOURCE_SEAL_REFRESH_OWNERS = ["apps/room/demo-creation.ts", "packages/cli/src/commands.ts"];
function sealRefresh(refresh, parserHash) {
  sealKeys(refresh, ["owners", "parser"], "refresh");
  if (!Array.isArray(refresh.owners) || !sameJson(refresh.owners.map(row => row.path), SOURCE_SEAL_REFRESH_OWNERS)) {
    throw Error("Source-seal refresh owners differ.");
  }
  const parser = refresh.parser;
  sealKeys(parser, ["maintainedToolSourceSha256", "rootRunReference", "outputPath", "outputBytes", "outputSha256", "outputText"], "refresh parser provenance");
  if (parser.maintainedToolSourceSha256 !== parserHash || typeof parser.rootRunReference !== "string"
    || parser.rootRunReference.length < 1 || parser.rootRunReference.length > 512
    || typeof parser.outputPath !== "string" || parser.outputPath.length < 1 || parser.outputPath.length > 4096
    || typeof parser.outputText !== "string" || Buffer.byteLength(parser.outputText) > 4096
    || !Number.isSafeInteger(parser.outputBytes) || parser.outputBytes !== Buffer.byteLength(parser.outputText)
    || !sha256(parser.outputSha256) || hash(parser.outputText) !== parser.outputSha256) throw Error("Invalid source-seal refresh output binding.");
  const output = JSON.parse(parser.outputText);
  if (!Array.isArray(output) || output.length !== 2) throw Error("Invalid source-seal refresh result count.");
  for (let index = 0; index < 2; index++) {
    const owner = refresh.owners[index], result = output[index];
    sealKeys(owner, ["path", "beforeSourceSha256", "afterSourceSha256"], "refresh owner");
    sealKeys(result, ["path", "sourceSeal"], "refresh parser result");
    if (result.path !== owner.path || !sha256(result.sourceSeal)
      || !sha256(owner.beforeSourceSha256) || !sha256(owner.afterSourceSha256)) throw Error("Source-seal refresh owner/output differs.");
  }
  return output;
}
function sealRefreshControl(refresh, parserHash) {
  const mutant = { ...refresh, owners: refresh.owners.map((row, index) => index === 0 ? { ...row, path: "apps/room/worker.ts" } : row) };
  try { sealRefresh(mutant, parserHash); }
  catch (error) { if (error.message === "Source-seal refresh owners differ.") return; throw error; }
  throw Error("Source-seal unlisted-owner refresh was accepted.");
}
function sealRecord(record, baseline) {
  sealKeys(record, ["format", "basis", "file", "beforeSha256", "afterSha256", "outsideValueProjectionSha256", "maps", "entries", "owners", "parser", ...(Object.hasOwn(record, "refresh") ? ["refresh"] : [])], "record");
  if (record.format !== "dap-workspace-source-seals-1" || !/^[a-f0-9]{40}$/.test(record.basis)
    || record.basis !== baseline.basis || record.file !== SOURCE_SEAL_FILE
    || ![record.beforeSha256, record.afterSha256, record.outsideValueProjectionSha256].every(sha256)
    || !sameJson(record.maps, SOURCE_SEAL_MAPS) || !Array.isArray(record.entries) || record.entries.length !== 55
    || !Array.isArray(record.owners) || record.owners.length !== 54) throw Error("Invalid finite source-seal record.");
  const originalBytes = sealOriginal(record.basis, SOURCE_SEAL_FILE), original = sealText(originalBytes), slots = sealSlots(original);
  if (hash(originalBytes) !== record.beforeSha256) throw Error("Source-seal accepted-base file differs.");
  for (let index = 0; index < slots.length; index++) {
    const row = record.entries[index], slot = slots[index];
    sealKeys(row, ["map", "owner", "beforeValue", "afterValue", "valueStartUtf16", "valueEndUtf16"], "entry");
    if (row.map !== slot.map || row.owner !== slot.owner || row.beforeValue !== slot.value || !sha256(row.afterValue)
      || row.valueStartUtf16 !== slot.valueStartUtf16 || row.valueEndUtf16 !== slot.valueEndUtf16) throw Error("Source-seal entry binding differs.");
  }
  const next = apply(original, record.entries.map(row => ({ start: row.valueStartUtf16, end: row.valueEndUtf16, value: row.afterValue })));
  const oldProjection = sealProjection(original, slots), nextProjection = sealProjection(next, sealSlots(next));
  if (hash(next) !== record.afterSha256 || hash(oldProjection) !== record.outsideValueProjectionSha256
    || oldProjection !== nextProjection || !sameJson(literalDigests(oldProjection), literalDigests(nextProjection))) {
    throw Error("Source-seal value-only replay differs.");
  }
  sealKeys(record.parser, ["maintainedToolSourceSha256", "rootRunReference", "outputPath", "outputBytes", "outputSha256", "outputText"], "parser provenance");
  const parser = record.parser;
  if (!sha256(parser.maintainedToolSourceSha256) || typeof parser.rootRunReference !== "string"
    || parser.rootRunReference.length < 1 || parser.rootRunReference.length > 512
    || typeof parser.outputPath !== "string" || parser.outputPath.length < 1 || parser.outputPath.length > 4096
    || typeof parser.outputText !== "string" || Buffer.byteLength(parser.outputText) > 32 * 1024
    || !Number.isSafeInteger(parser.outputBytes) || parser.outputBytes !== Buffer.byteLength(parser.outputText)
    || !sha256(parser.outputSha256) || hash(parser.outputText) !== parser.outputSha256) throw Error("Invalid source-seal parser output binding.");
  // Paths/references in provenance are inert DATA. The owning runner authenticates
  // execution and dependencies; this script follows only its fixed tool/owner list.
  const output = JSON.parse(parser.outputText);
  if (!Array.isArray(output) || output.length !== 54) throw Error("Invalid source-seal parser result count.");
  const refreshed = Object.hasOwn(record, "refresh") ? sealRefresh(record.refresh, parser.maintainedToolSourceSha256) : undefined;
  if (refreshed) sealRefreshControl(record.refresh, parser.maintainedToolSourceSha256);
  const guards = [sealRead(resolve(ROOT, SOURCE_SEAL_TOOL))];
  if (hash(guards[0].bytes) !== parser.maintainedToolSourceSha256
    || hash(sealOriginal(record.basis, SOURCE_SEAL_TOOL)) !== parser.maintainedToolSourceSha256) {
    throw Error("Source-seal maintained tool differs.");
  }
  for (let index = 0; index < SOURCE_SEAL_OWNERS.length; index++) {
    const path = SOURCE_SEAL_OWNERS[index], owner = record.owners[index], historicalResult = output[index];
    const refreshIndex = SOURCE_SEAL_REFRESH_OWNERS.indexOf(path);
    const result = refreshed && refreshIndex !== -1 ? refreshed[refreshIndex] : historicalResult;
    sealKeys(historicalResult, ["path", "sourceSeal"], "historical parser result");
    if (historicalResult.path !== path || !sha256(historicalResult.sourceSeal)) throw Error("Source-seal historical output order or value differs.");
    if (refreshed && refreshIndex !== -1) {
      const refreshedOwner = record.refresh.owners[refreshIndex];
      if (refreshedOwner.beforeSourceSha256 !== owner.beforeSourceSha256 || refreshedOwner.afterSourceSha256 !== owner.afterSourceSha256) {
        throw Error("Source-seal refresh Source binding differs.");
      }
    }
    sealKeys(owner, ["path", "beforeSourceSha256", "afterSourceSha256", "actualSourceSeal"], "owner");
    sealKeys(result, ["path", "sourceSeal"], "parser result");
    if (owner.path !== path || result.path !== path || !sha256(owner.beforeSourceSha256)
      || !sha256(owner.afterSourceSha256) || !sha256(owner.actualSourceSeal)
      || result.sourceSeal !== owner.actualSourceSeal) throw Error("Source-seal owner/output order or value differs.");
    const inventoryRows = [...baseline.transformedSources, ...(baseline.publicationSources ?? [])].filter(row => row.path === path);
    if (inventoryRows.length > 1 || (inventoryRows.length === 1
      && (inventoryRows[0].before !== owner.beforeSourceSha256 || inventoryRows[0].after !== owner.afterSourceSha256))
      || (inventoryRows.length === 0 && owner.beforeSourceSha256 !== owner.afterSourceSha256)) {
      throw Error(`Source-seal owner differs from the recorded rename: ${path}`);
    }
    const source = sealRead(resolve(ROOT, path), 4 * 1024 * 1024);
    guards.push(source);
    if (hash(sealOriginal(record.basis, path)) !== owner.beforeSourceSha256 || hash(source.bytes) !== owner.afterSourceSha256) {
      throw Error(`Source-seal owner bytes differ: ${path}`);
    }
    for (const row of record.entries.filter(row => row.owner === path)) {
      if (row.afterValue !== owner.actualSourceSeal
        || (owner.beforeSourceSha256 === owner.afterSourceSha256 && row.beforeValue !== row.afterValue)) {
        throw Error(`Source-seal owner alias or unchanged-source value differs: ${path}`);
      }
    }
  }
  sealKeyControl(record, next);
  return { record, next, guards };
}
function sealMetadata(baseline, args) {
  const pathArgs = args.filter(arg => arg.startsWith("--source-seal-metadata="));
  const hashArgs = args.filter(arg => arg.startsWith("--source-seal-sha256="));
  if (pathArgs.length > 1 || hashArgs.length > 1 || pathArgs.length !== hashArgs.length) throw Error("Supply one source-seal metadata path and SHA-256 together.");
  let wrapper = baseline.sourceSealMetadata, external;
  if ((wrapper || pathArgs.length) && [...baseline.protectedLeaves, ...baseline.transformedSources, ...(baseline.publicationSources ?? [])].some(row => row.path === SOURCE_SEAL_FILE)) {
    throw Error("Source-seal metadata file has a conflicting preservation class.");
  }
  if (pathArgs.length) {
    const pin = hashArgs[0].slice("--source-seal-sha256=".length);
    if (!sha256(pin)) throw Error("Invalid source-seal record SHA-256.");
    external = sealRead(resolve(pathArgs[0].slice("--source-seal-metadata=".length)));
    if (hash(external.bytes) !== pin) throw Error("Source-seal record SHA-256 differs.");
    const text = sealText(external.bytes), record = JSON.parse(text);
    if (jsonText(record) !== text) throw Error("Source-seal record must use the recorded JSON layout.");
    const supplied = { sha256: pin, record };
    if (wrapper !== undefined && !sameJson(wrapper, supplied)) throw Error("A different source-seal record is already adopted.");
    wrapper = supplied;
  }
  if (wrapper === undefined) return undefined;
  sealKeys(wrapper, ["sha256", "record"], "inventory binding");
  if (!sha256(wrapper.sha256) || hash(jsonText(wrapper.record)) !== wrapper.sha256) throw Error("Source-seal inventory record digest differs.");
  const verified = sealRecord(wrapper.record, baseline), current = sealRead(resolve(ROOT, SOURCE_SEAL_FILE));
  const state = sealFileState(verified.record, sealText(current.bytes));
  if (baseline.sourceSealMetadata && state !== "adopted") throw Error("Adopted source-seal inventory requires the exact adopted file.");
  return { ...verified, wrapper, current, state, guards: [...verified.guards, current, ...(external ? [external] : [])] };
}
function sealRecheck(guards) {
  for (const old of guards) {
    const now = sealRead(old.full, Math.max(old.bytes.length, 1));
    if (!sameJson(sealIdentity(old.stat), sealIdentity(now.stat)) || !old.bytes.equals(now.bytes)) throw Error("A source-seal input changed before writing.");
  }
}

function main() {
  const args = process.argv.slice(2), write = args.includes("--write"), mechanicalOnly = args.includes("--mechanical-only");
  if (args.includes("--check-preservation")) {
    if (args.length !== 1) throw Error("Use --check-preservation alone.");
    checkPublicationAnchors();
    const inventory = sealInventory(), baseline = sealBaseline(inventory);
    const additions = publicationAdditions(baseline);
    const metadata = sealMetadata(baseline, []);
    if (metadata) sealFileState(metadata.record, sealText(metadata.current.bytes), true);
    const allowed = new Set([...baseline.transformedSources.map(row => row.path), ...(baseline.publicationSources ?? []).map(row => row.path), ...additions.rows.map(row => row.path), ...SELF, "docs/workspace-rename.md"]);
    if (metadata) allowed.add(SOURCE_SEAL_FILE);
    const changed = execFileSync("git", ["diff", "--name-only", "-z", baseline.basis], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
    for (const path of changed) if (!allowed.has(path)) throw Error(`Unclassified changed source: ${path}`);
    for (const row of [...baseline.protectedLeaves, ...baseline.transformedSources, ...(baseline.publicationSources ?? [])]) {
      const current = read(row.path).bytes;
      if (hash(current) !== (row.after ?? row.sha256)) throw Error(`Preservation mismatch: ${row.path}`);
      if (JSON.stringify(literalDigests(current.toString("utf8"))) !== JSON.stringify(row.digests)) throw Error(`Literal digest mismatch: ${row.path}`);
      if (row.after) {
        const original = execFileSync("git", ["show", `${baseline.basis}:${row.path}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
        if (row.publication) {
          if (hash(original) !== row.before || hash(publicationText(row.path, original).next) !== row.after) throw Error(`Publication replay mismatch: ${row.path}`);
          continue;
        }
        let edits;
        try { edits = normalize(packageConfig(row.path) ? jsonEdits(original) : currentDoc(row.path) ? docEdits(original) : sourceEdits(row.path, original)); } catch (error) { throw Error(`${row.path}: ${error.message}`); }
        if (hash(original) !== row.before || hash(apply(original, edits)) !== row.after) throw Error(`Rename replay mismatch: ${row.path}`);
      }
    }
    sealRecheck(additions.guards);
    if (metadata) sealRecheck([...metadata.guards, inventory]);
    process.stdout.write(JSON.stringify({ addedPublicationSources: additions.rows.length, addedPublicationControls: additions.controls, sourceSealMetadata: !!metadata, sourceSealKeyControls: metadata ? 1 : 0, protectedLeaves: baseline.protectedLeaves.length, transformedSources: baseline.transformedSources.length, publicationSources: (baseline.publicationSources ?? []).length, publicationAnchorControls: 2, preserved: true }) + "\n");
    return;
  }
  const reportArg = args.find(arg => arg.startsWith("--report="));
  if (args.some(arg => !["--write", "--mechanical-only"].includes(arg)
    && !["--report=", "--source-seal-metadata=", "--source-seal-sha256="].some(prefix => arg.startsWith(prefix)))) {
    throw Error("Use --write, --mechanical-only, --report=PATH and the paired source-seal metadata options only.");
  }
  const adopting = args.some(arg => arg.startsWith("--source-seal-metadata=") || arg.startsWith("--source-seal-sha256="));
  const inventory = sealInventory(!adopting), baseline = sealBaseline(inventory);
  const additions = baseline ? publicationAdditions(baseline) : { rows: [], guards: [], controls: 0 };
  const metadata = baseline ? sealMetadata(baseline, args) : undefined;
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
  const result = { format: "dap-workspace-rename-1", write, head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(), changes: [], publication: [], preserved: [], unresolved: [], excluded: [] };
  const pending = [];
  for (const path of tracked) {
    if (SELF.has(path) || (metadata && path === SOURCE_SEAL_FILE)) continue;
    const { full, stat, bytes } = read(path), text = bytes.toString("utf8");
    if (protectedLeaf(path)) result.preserved.push({ path, bytes: bytes.length, sha256: hash(bytes), digests: literalDigests(text) });
    if (!exactTokens(text).length) continue;
    if (historical(path) || PUBLICATION.has(path)) { result.excluded.push({ path, reason: historical(path) ? "historical-record" : mechanicalOnly ? "publication-not-selected" : "publication-context-transform" }); continue; }
    let edits = [];
    if (protectedLeaf(path)) { result.excluded.push({ path, reason: "recorded-byte-leaf" }); continue; }
    if (packageConfig(path)) edits = jsonEdits(text);
    else if (currentDoc(path)) edits = docEdits(text);
    else if (code(path)) {
      try { edits = sourceEdits(path, text); }
      catch (error) { result.unresolved.push({ path, reason: "module-parser", message: error.message }); continue; }
    }
    edits = normalize(edits);
    const next = apply(text, edits);
    if (JSON.stringify(literalDigests(text)) !== JSON.stringify(literalDigests(next))) throw Error(`A digest witness changed: ${path}`);
    const beforeProjection = hash(projection(text, edits)), afterProjection = hash(projection(next, edits, true));
    if (beforeProjection !== afterProjection) throw Error(`Non-reference bytes changed: ${path}`);
    if (edits.length) {
      result.changes.push({ path, before: hash(bytes), after: hash(next), spans: edits.map(({ start, end, kind, value }) => ({ start, end, kind, replacement: value })), dataProjection: beforeProjection, digests: literalDigests(text) });
      pending.push({ full, stat, before: bytes, next });
    }
    if (exactTokens(next).length) result.unresolved.push({ path, reason: "non-module-package-reference", names: exactTokens(next) });
  }
  if (!mechanicalOnly) for (const path of new Set(PUBLICATION_REPLACEMENTS.map(row => row.path))) {
    const { full, stat, bytes } = read(path);
    const text = bytes.toString("utf8"), { next, steps } = publicationText(path, text);
    if (next === text) continue;
    if (JSON.stringify(literalDigests(text)) !== JSON.stringify(literalDigests(next))) throw Error(`A publication digest witness changed: ${path}`);
    result.publication.push({ path, before: hash(bytes), after: hash(next), steps, digests: literalDigests(text), publication: true });
    pending.push({ full, stat, before: bytes, next });
  }
  if (metadata) {
    const boundSources = new Set(metadata.guards.map(row => row.full));
    if (pending.some(row => boundSources.has(row.full))) throw Error("A planned rename would change source-seal inputs.");
    result.sourceSealMetadata = metadata.wrapper;
    if (metadata.state === "old") pending.push({ ...metadata.current, before: metadata.current.bytes, next: metadata.next });
    if (!baseline.sourceSealMetadata) {
      if (jsonText(baseline) !== sealText(inventory.bytes)) throw Error("Preservation inventory JSON layout differs.");
      pending.push({ ...inventory, before: inventory.bytes,
        next: jsonText({ ...baseline, sourceSealMetadata: metadata.wrapper }) });
    }
  }
  if (result.unresolved.length) throw Error("Unclassified package references remain; no Source was written.");
  if (reportArg) {
    try { lstatSync(resolve(reportArg.slice("--report=".length))); throw Error("Rename report already exists."); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  // Validate every source before the first write. Never follow a replacement leaf.
  if (write) sealRecheck(additions.guards);
  if (write && metadata) sealRecheck([...metadata.guards, inventory]);
  if (write) for (const row of pending) {
    const now = lstatSync(row.full);
    if (!now.isFile() || now.ino !== row.stat.ino || now.dev !== row.stat.dev || now.mode !== row.stat.mode || !readFileSync(row.full).equals(row.before)) throw Error("A rename input changed during preparation.");
  }
  if (write) for (const row of pending) writeFileSync(row.full, row.next);
  if (reportArg) writeFileSync(resolve(reportArg.slice("--report=".length)), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  process.stdout.write(JSON.stringify({ changed: result.changes.length, publicationChanged: result.publication.length, addedPublicationSources: additions.rows.length, addedPublicationControls: additions.controls, sourceSealMetadata: !!metadata, sourceSealKeyControls: metadata ? 1 : 0, protectedLeaves: result.preserved.length, unresolved: result.unresolved.length, write }) + "\n");
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
