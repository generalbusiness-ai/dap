// One coherent reproduction and closure/rewrite witness; no compiler/SDK loading.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PLAN, PUBLIC_TESTING_INPUTS, nameOf, copyFileVerified, outputClosure, productionInputs, publishManifest, references, rewriteDeclarationRefs } from "./public-release-lib.mjs";
import { browserRuntimeEdge } from "./check-public-release.mjs";

const root = new URL("../", import.meta.url);
test("SDK module references preserve genuine imports and rewrite declarations without treating capability data as modules", () => {
  // Workspace names are already the public names; no publication alias is needed.
  for (const dir of ["contract", "derive", "lanes", "page", "platform", "cli", "bytes", "client", "replay", "scope", "git", "checkers"]) {
    const workspace = dir === "lanes" || dir === "page" ? `apps/room/${dir}` : `packages/${dir}`;
    const manifest = JSON.parse(readFileSync(new URL(`${workspace}/package.json`, root), "utf8"));
    assert.equal(manifest.name, `@generalbusiness/dap-${dir}`);
  }
  assert.deepEqual(PLAN.packages.map(spec => nameOf(spec.dir)), ["@generalbusiness/dap-contract", "@generalbusiness/dap-bytes", "@generalbusiness/dap-client", "@generalbusiness/dap-derive", "@generalbusiness/dap-platform", "@generalbusiness/dap-replay"]);
  // Small manifest fixture isolates naming from the separate compatibility obligation.
  const namingSpec = { dir: "bytes", exports: { ".": "src/index" }, dependencies: {} };
  const namingInput = { name: "@generalbusiness/dap-bytes", type: "module", license: "Apache-2.0", exports: { ".": "./src/index.ts" } };
  assert.equal(publishManifest(namingSpec, namingInput, "0.1.0-dev.2").name, "@generalbusiness/dap-bytes");
  assert.throws(() => publishManifest(namingSpec, { ...namingInput, name: "@generalbusiness/artroom-bytes" }, "0.1.0-dev.2"), /unsupported-source-manifest/);
  const capability = readFileSync(new URL("packages/contract/src/capability.ts", root), "utf8");
  assert.deepEqual(references(capability), []); // Actual three quoted 'from' rows.
  const source = [
    `import "./side.ts";`,
    `import type { Value, from as named }`,
    `  from "./types.ts";`,
    `import * as bytes from "@generalbusiness/dap-bytes";`,
    `export type * from './public.ts';`,
    `export { Value } from "./reexport.ts";`,
    `type Nested = import("./nested.ts").Value;`,
    `const later = import("./later.ts");`,
    `const data = ["export", "from", "import('./not-a-module.ts')"];`,
    `type Data = { from: "from './unchanged.ts'" };`,
    `const template = \`from './template-data.ts'\`;`,
    `const pattern = /from "regex-data.ts"/;`,
    `// export * from "./comment.ts";`,
  ].join("\n");
  const expected = ["./side.ts", "./types.ts", "@generalbusiness/dap-bytes", "./public.ts", "./reexport.ts", "./nested.ts", "./later.ts"];
  assert.deepEqual(references(source), expected);
  assert.throws(() => references(`const computed = import(name);`), /unsupported-module-syntax/);
  const dir = mkdtempSync(join(tmpdir(), "artroom-sdk-module-witness-"));
  try {
    mkdirSync(join(dir, "dist"));
    const file = join(dir, "dist", "fixture.d.ts");
    writeFileSync(file, source);
    const changes = rewriteDeclarationRefs(dir);
    assert.equal(changes.length, 1);
    const rewritten = readFileSync(file, "utf8");
    // The producer now copies exact source bytes instead of rewriting package names.
    const input = new URL("packages/bytes/src/index.ts", root), copied = join(dir, "input.ts");
    copyFileVerified(input, copied);
    assert.deepEqual(readFileSync(copied), readFileSync(input));
    assert.deepEqual(references(readFileSync(copied, "utf8")), references(readFileSync(input, "utf8")));
    assert.deepEqual(references(rewritten), expected.map(value => value.startsWith(".") ? value.slice(0, -3) + ".js" : value));
    for (const line of source.split("\n").slice(8)) assert.ok(rewritten.includes(line));
    assert.deepEqual(rewriteDeclarationRefs(dir), []);
    const replay = PLAN.packages.find(spec => spec.dir === "replay");
    assert.deepEqual(productionInputs(replay, ["packages/replay/src/index.ts", "packages/replay/src/bin.ts", "packages/replay/src/git.ts"]), { names: ["packages/replay/src/index.ts"], omitted: ["packages/replay/src/bin.ts", "packages/replay/src/git.ts"] });
    assert.throws(() => productionInputs({ ...replay, excludedInputs: ["src/index.ts"] }, ["packages/replay/src/index.ts", "packages/replay/src/bin.ts"]), /source-input-exclusions/);
    const stage = join(dir, "production"); mkdirSync(join(stage, "dist/src"), { recursive: true });
    writeFileSync(join(stage, "package.json"), JSON.stringify({ name: "@generalbusiness/dap-replay", version: "0.1.0-dev.2", type: "module", exports: { ".": { types: "./dist/src/index.d.ts", default: "./dist/src/index.js" } } }));
    writeFileSync(join(stage, "dist/src/index.js"), "export {};\n"); writeFileSync(join(stage, "dist/src/index.d.ts"), "export {};\n");
    assert.equal(outputClosure(stage, replay, "0.1.0-dev.2").length, 3);
    for (const name of ["bin.js", "bin.d.ts", "git.js", "git.d.ts"]) {
      const file = join(stage, "dist/src", name);
      writeFileSync(file, "export {};\n");
      assert.throws(() => outputClosure(stage, replay, "0.1.0-dev.2"), /excluded-output/);
      rmSync(file);
    }
    for (const ref of ["node:fs", "@generalbusiness/dap-git/journal-reader"]) {
      for (const body of [`import '${ref}';`, `export * from '${ref}';`, `const load = () => import('${ref}');`]) {
        writeFileSync(join(stage, "dist/src/index.js"), body);
        assert.throws(() => outputClosure(stage, replay, "0.1.0-dev.2"), /bare-output-closure/);
      }
      writeFileSync(join(stage, "dist/src/index.js"), "export {};\n");
      writeFileSync(join(stage, "dist/src/index.d.ts"), `import type { X } from '${ref}';`);
      assert.throws(() => outputClosure(stage, replay, "0.1.0-dev.2"), /bare-output-closure/);
      writeFileSync(join(stage, "dist/src/index.d.ts"), "export {};\n");
    }
    const jsonataInput = "/owned/node_modules/jsonata/jsonata.js";
    const synthetic = { path: "<runtime>", kind: "import-statement", external: true };
    assert.equal(browserRuntimeEdge(jsonataInput, synthetic, jsonataInput), true);
    assert.equal(browserRuntimeEdge(jsonataInput, { ...synthetic, path: "https://foreign.invalid/runtime.js" }, jsonataInput), false);
    assert.equal(browserRuntimeEdge("/owned/another.js", synthetic, jsonataInput), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// This existing compatibility obligation can fail independently of lexical/copy checks.
// Preserve actual workspace manifests and expected compatibility; do not project a plan.
test("SDK published manifests match the actual supported workspace manifests", () => {
  // The six-package amendment omits only the known source-only boundaries.
  const platform = PLAN.packages.find(spec => spec.dir === "platform");
  const replay = PLAN.packages.find(spec => spec.dir === "replay");
  const platformManifest = JSON.parse(readFileSync(new URL("packages/platform/package.json", root), "utf8"));
  const published = publishManifest(platform, platformManifest, "0.1.0-dev.2");
  assert.equal(published.name, "@generalbusiness/dap-platform");
  assert.deepEqual(published.repository, { type: "git", url: "git+https://github.com/generalbusiness-ai/dap.git", directory: "packages/platform" });
  assert.equal(published.homepage, "https://dap.generalbusiness.ai/");
  assert.deepEqual(Object.keys(published.exports), [".", "./membership-actions"]);
  assert.deepEqual(published.exports["./membership-actions"], { types: "./dist/src/membership-actions.d.ts", default: "./dist/src/membership-actions.js" });
  assert.deepEqual(published.dependencies, { "@generalbusiness/dap-bytes": "0.1.0-dev.2", "@generalbusiness/dap-contract": "0.1.0-dev.2", "@generalbusiness/dap-derive": "0.1.0-dev.2" });
  const bytes = PLAN.packages.find(spec => spec.dir === "bytes");
  const bytesManifest = JSON.parse(readFileSync(new URL("packages/bytes/package.json", root), "utf8"));
  const publicBytes = publishManifest(bytes, bytesManifest, "0.1.0-dev.2");
  assert.equal(bytesManifest.name, "@generalbusiness/dap-bytes");
  assert.equal(publicBytes.name, "@generalbusiness/dap-bytes");
  assert.equal(publicBytes.dependencies["@noble/curves"], "2.4.0");
  assert.throws(() => publishManifest(platform, { ...platformManifest, name: "@generalbusiness/artroom-platform" }, "0.1.0-dev.2"), /unsupported-source-manifest/);
  assert.throws(() => publishManifest(platform, { ...platformManifest, exports: { ...platformManifest.exports, "./private": "./src/private.ts" } }, "0.1.0-dev.2"), /unsupported-source-manifest/);
  const replayManifest = JSON.parse(readFileSync(new URL("packages/replay/package.json", root), "utf8"));
  const publicReplay = publishManifest(replay, replayManifest, "0.1.0-dev.2");
  assert.deepEqual(Object.keys(publicReplay.exports), ["."]);
  assert.equal(publicReplay.dependencies["@generalbusiness/dap-git"], undefined);
  assert.equal(publicReplay.devDependencies, undefined);
  assert.throws(() => publishManifest({ ...replay, excludedSourceExports: { ...replay.excludedSourceExports, "./extra": "./src/extra.ts" } }, replayManifest, "0.1.0-dev.2"), /source-export-exclusions/);
  assert.throws(() => publishManifest(replay, { ...replayManifest, dependencies: { ...replayManifest.dependencies, "@generalbusiness/dap-git": replayManifest.version } }, "0.1.0-dev.2"), /unsupported-source-dependencies/);
});

// Exercise the release output boundary without loading fixtures or compiling an SDK.
test("SDK testing closure includes only the shared fixture and its two raw dependencies", () => {
  assert.deepEqual(PUBLIC_TESTING_INPUTS, [
    "packages/derive/test/fixtures.ts",
    "packages/derive/test/definition-corpus/fixture-data.ts",
    "packages/derive/test/definition-corpus/fixture-identities.ts",
  ]);
  // Keep the real fixture's reachable relative modules tied to the finite contract.
  const fixture = new URL("packages/derive/test/fixtures.ts", root);
  assert.deepEqual([...new Set(references(readFileSync(fixture, "utf8")).filter(ref => ref.startsWith(".")).map(ref => new URL(ref, fixture).href))].sort(), [
    new URL("packages/derive/src/index.ts", root).href,
    new URL("packages/derive/test/definition-corpus/fixture-data.ts", root).href,
    new URL("packages/derive/test/definition-corpus/fixture-identities.ts", root).href,
  ].sort());
  const spec = PLAN.packages.find(spec => spec.dir === "derive");
  const stage = mkdtempSync(join(tmpdir(), "artroom-sdk-testing-closure-"));
  try {
    mkdirSync(join(stage, "dist/src"), { recursive: true });
    mkdirSync(join(stage, "dist/test/definition-corpus"), { recursive: true });
    writeFileSync(join(stage, "package.json"), JSON.stringify({
      name: "@generalbusiness/dap-derive", version: "0.1.0-dev.2", type: "module",
      exports: {
        ".": { types: "./dist/src/index.d.ts", default: "./dist/src/index.js" },
        "./rule": { types: "./dist/src/rule.d.ts", default: "./dist/src/rule.js" },
        "./testing": { types: "./dist/test/fixtures.d.ts", default: "./dist/test/fixtures.js" },
      },
    }));
    for (const extension of ["js", "d.ts"]) {
      for (const name of ["index", "rule"]) writeFileSync(join(stage, `dist/src/${name}.${extension}`), "export {};\n");
      writeFileSync(join(stage, `dist/test/fixtures.${extension}`), [
        'export * from "../src/index.js";',
        'export * from "./definition-corpus/fixture-data.js";',
        'export * from "./definition-corpus/fixture-identities.js";',
      ].join("\n"));
      for (const name of ["fixture-data", "fixture-identities"]) {
        writeFileSync(join(stage, `dist/test/definition-corpus/${name}.${extension}`), "export {};\n");
      }
    }
    const expected = [
      "dist/test/fixtures.js", "dist/test/fixtures.d.ts",
      "dist/test/definition-corpus/fixture-data.js", "dist/test/definition-corpus/fixture-data.d.ts",
      "dist/test/definition-corpus/fixture-identities.js", "dist/test/definition-corpus/fixture-identities.d.ts",
    ].sort();
    assert.deepEqual(outputClosure(stage, spec, "0.1.0-dev.2").filter(row => row.path.startsWith("dist/test/")).map(row => row.path).sort(), expected);
    for (const name of ["fixture-data", "fixture-identities"]) {
      for (const extension of ["js", "d.ts"]) {
        const file = join(stage, `dist/test/definition-corpus/${name}.${extension}`);
        const bytes = readFileSync(file);
        rmSync(file);
        assert.throws(() => outputClosure(stage, spec, "0.1.0-dev.2"), /relative-output-closure/);
        writeFileSync(file, bytes);
      }
    }
    writeFileSync(join(stage, "dist/test/definition-corpus/index.js"), "export {};\n");
    assert.throws(() => outputClosure(stage, spec, "0.1.0-dev.2"), /unplanned-testing-output/);
  } finally { rmSync(stage, { recursive: true, force: true }); }
});
