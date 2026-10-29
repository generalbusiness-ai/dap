// One coherent reproduction and closure/rewrite witness; no compiler/SDK loading.
import assert from "node:assert/strict";
import { chmodSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PLAN, PUBLIC_GIT_INPUTS, PUBLIC_TESTING_INPUTS, nameOf, copyFileVerified, copySkillAssets, digest, outputClosure, productionInputs, publishManifest, references, rewriteDeclarationRefs, skillAssetsOf, verifySkillArchive } from "./public-release-lib.mjs";
import { browserRuntimeEdge } from "./check-public-release.mjs";

const root = new URL("../", import.meta.url);
test("the platform skill carries committed bytes and modes into its external stage and actual archive", () => {
  // A disposable local Git repository and a code-free stage exercise only
  // the asset boundary. No SDK compilation, package installation or publication.
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "dap-skill-carrier-")));
  const source = join(directory, "source"), stage = join(directory, "package"), archive = join(directory, "skill.tgz");
  const spec = { dir: "platform", skillAssets: ["skills/dap-application"], exports: {}, dependencies: {} };
  const git = (...args) => execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "-c", "user.name=Asset fixture", "-c", "user.email=fixture@example.invalid", ...args], { cwd: source, stdio: "pipe", timeout: 10_000 });
  const skill = "skills/dap-application/SKILL.md", script = "skills/dap-application/assets/check.sh";
  const original = "# Local fixture\n", executable = "# Never executed\n";
  const pack = () => execFileSync("/usr/bin/tar", ["-czf", archive, "-C", directory, "package/skills"], { timeout: 10_000 });
  try {
    mkdirSync(join(source, "skills/dap-application/assets"), { recursive: true }); mkdirSync(stage);
    writeFileSync(join(source, skill), original); chmodSync(join(source, skill), 0o644);
    writeFileSync(join(source, script), executable); chmodSync(join(source, script), 0o755);
    git("init", "--quiet"); git("add", "."); git("commit", "--quiet", "--no-gpg-sign", "-m", "Record fixture assets");
    let assets;
    const mask = process.umask(0o077);
    try { assets = copySkillAssets(source, stage, spec); } finally { process.umask(mask); }
    assert.equal(readFileSync(join(stage, skill), "utf8"), original);
    assert.equal(lstatSync(join(stage, skill)).mode & 0o777, 0o644);
    assert.equal(lstatSync(join(stage, script)).mode & 0o777, 0o755);
    writeFileSync(join(stage, "package.json"), JSON.stringify({ name: "@generalbusiness/dap-platform", version: "0.1.0-dev.2", type: "module", exports: {} }));
    assert.equal(outputClosure(stage, spec, "0.1.0-dev.2", assets).length, 3);
    pack(); verifySkillArchive(archive, assets);
    chmodSync(join(stage, skill), 0o600); pack();
    assert.throws(() => verifySkillArchive(archive, assets), /skill-archive-mode/);
    assert.throws(() => outputClosure(stage, spec, "0.1.0-dev.2", assets), /skill-output-mismatch/);
    chmodSync(join(stage, skill), 0o644); writeFileSync(join(stage, skill), "Changed archive bytes\n"); pack();
    assert.throws(() => verifySkillArchive(archive, assets), /skill-archive-content/);
    rmSync(join(stage, skill)); symlinkSync("assets/check.sh", join(stage, skill)); pack();
    assert.throws(() => verifySkillArchive(archive, assets), /skill-archive-mode/);
    writeFileSync(join(source, skill), "Changed source\n");
    assert.throws(() => skillAssetsOf(source, spec), /skill-asset-changed/); writeFileSync(join(source, skill), original);
    chmodSync(join(source, skill), 0o600); assert.throws(() => skillAssetsOf(source, spec), /skill-asset-changed/); chmodSync(join(source, skill), 0o644);
    const extra = join(source, "skills/dap-application/untracked.json"); writeFileSync(extra, "{}\n");
    assert.throws(() => skillAssetsOf(source, spec), /skill-asset-set/); rmSync(extra);
    symlinkSync("assets/check.sh", extra); assert.throws(() => skillAssetsOf(source, spec), /nonregular-skill-asset/); rmSync(extra);
    rmSync(join(source, skill)); assert.throws(() => skillAssetsOf(source, spec), /skill-asset-set/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("SDK module references preserve genuine imports and rewrite declarations without treating capability data as modules", () => {
  // Workspace names are already the public names; no publication alias is needed.
  for (const dir of ["contract", "package-graph", "derive", "lanes", "page", "platform", "cli", "bytes", "client", "replay", "scope", "git", "checkers"]) {
    const workspace = dir === "lanes" || dir === "page" ? `apps/room/${dir}` : `packages/${dir}`;
    const manifest = JSON.parse(readFileSync(new URL(`${workspace}/package.json`, root), "utf8"));
    assert.equal(manifest.name, `@generalbusiness/dap-${dir}`);
  }
  assert.deepEqual(PLAN.packages.map(spec => nameOf(spec.dir)), ["@generalbusiness/dap-contract", "@generalbusiness/dap-bytes", "@generalbusiness/dap-derive", "@generalbusiness/dap-package-graph", "@generalbusiness/dap-git", "@generalbusiness/dap-platform", "@generalbusiness/dap-client", "@generalbusiness/dap-replay"]);
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
    const platformSpec = PLAN.packages.find(spec => spec.dir === "platform");
    const applicationInputs = ["packages/platform/src/index.ts", "packages/platform/src/application-codec/application.ts", "packages/platform/src/application-codec/application-v2.ts", "packages/platform/src/application-codec/application-package-v2.ts"];
    assert.deepEqual(productionInputs(platformSpec, applicationInputs), { names: applicationInputs, omitted: [] });
    assert.throws(() => productionInputs({ ...platformSpec, excludedInputs: ["src/application-codec/application-v2.ts"] }, applicationInputs), /source-input-exclusions/);
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
    for (const ref of ["node:fs", "@generalbusiness/dap-git/journal-reader", "@generalbusiness/dap-platform"]) {
      for (const body of [`import '${ref}';`, `export * from '${ref}';`, `const load = () => import('${ref}');`]) {
        writeFileSync(join(stage, "dist/src/index.js"), body);
        assert.throws(() => outputClosure(stage, replay, "0.1.0-dev.2"), /bare-output-closure/);
      }
      writeFileSync(join(stage, "dist/src/index.js"), "export {};\n");
      writeFileSync(join(stage, "dist/src/index.d.ts"), `import type { X } from '${ref}';`);
      assert.throws(() => outputClosure(stage, replay, "0.1.0-dev.2"), /bare-output-closure/);
      writeFileSync(join(stage, "dist/src/index.d.ts"), "export {};\n");
    }
    // All planned platform subpaths must exist, and their graph dependency must
    // remain admitted by the output closure.
    const applicationStage = join(dir, "application-production");
    mkdirSync(join(applicationStage, "dist/src"), { recursive: true });
    const platformManifest = JSON.parse(readFileSync(new URL("packages/platform/package.json", root), "utf8"));
    writeFileSync(join(applicationStage, "package.json"), JSON.stringify(publishManifest(platformSpec, platformManifest, "0.1.0-dev.2")));
    // A made-up skill isolates code-export closure; the separate asset witness
    // above checks actual committed bytes, modes, copying and archive content.
    const skillPath = "skills/dap-application/SKILL.md", skillBytes = "# Made-up authoring fixture\n";
    mkdirSync(join(applicationStage, "skills/dap-application"), { recursive: true });
    writeFileSync(join(applicationStage, skillPath), skillBytes); chmodSync(join(applicationStage, skillPath), 0o644);
    const skillFiles = [{ path: skillPath, bytes: Buffer.byteLength(skillBytes), mode: 0o644, sha256: digest(skillBytes) }];
    const skillAssets = { files: skillFiles, sha256: digest(JSON.stringify(skillFiles)) };
    for (const name of Object.values(platformSpec.exports).map(path => path.slice("src/".length))) {
      mkdirSync(join(applicationStage, "dist/src", name, ".."), { recursive: true });
      for (const extension of ["js", "d.ts"]) writeFileSync(join(applicationStage, `dist/src/${name}.${extension}`), name.endsWith("application-v2") ? "export { fieldAssignable } from '@generalbusiness/dap-package-graph';\n" : "export {};\n");
    }
    assert.equal(outputClosure(applicationStage, platformSpec, "0.1.0-dev.2", skillAssets).length, 2 + Object.keys(platformSpec.exports).length * 2);
    const withoutGraph = { ...platformSpec, dependencies: Object.fromEntries(Object.entries(platformSpec.dependencies).filter(([name]) => name !== "@generalbusiness/dap-package-graph")) };
    assert.throws(() => outputClosure(applicationStage, withoutGraph, "0.1.0-dev.2", skillAssets), /bare-output-closure/);
    rmSync(join(applicationStage, "dist/src/application-codec/application-v2.js"));
    assert.throws(() => outputClosure(applicationStage, platformSpec, "0.1.0-dev.2", skillAssets), /missing-export/);
    const jsonataInput = "/owned/node_modules/jsonata/jsonata.js";
    const synthetic = { path: "<runtime>", kind: "import-statement", external: true };
    assert.equal(browserRuntimeEdge(jsonataInput, synthetic, jsonataInput), true);
    assert.equal(browserRuntimeEdge(jsonataInput, { ...synthetic, path: "https://foreign.invalid/runtime.js" }, jsonataInput), false);
    assert.equal(browserRuntimeEdge("/owned/another.js", synthetic, jsonataInput), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("Git publishes only two subpaths and their pure five-module closure", () => {
  const spec = PLAN.packages.find(spec => spec.dir === "git");
  const source = JSON.parse(readFileSync(new URL("packages/git/package.json", root), "utf8"));
  const manifest = publishManifest(spec, source, "0.1.0-dev.2");
  assert.deepEqual(Object.keys(manifest.exports), ["./tree-proof", "./checkout-types"]);
  assert.equal(manifest.exports["."], undefined);
  assert.deepEqual(manifest.dependencies, { "@generalbusiness/dap-bytes": "0.1.0-dev.2", "@generalbusiness/dap-contract": "0.1.0-dev.2", "@noble/hashes": "2.4.0" });
  assert.throws(() => publishManifest({ ...spec, exports: { ...spec.exports, ".": "src/index" } }, source, "0.1.0-dev.2"), /git-public-exports/);
  assert.throws(() => publishManifest({ ...spec, excludedSourceExports: {} }, source, "0.1.0-dev.2"), /source-export-exclusions/);
  const tracked = execFileSync("git", ["ls-files", "-z", "packages/git/src"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const selected = productionInputs(spec, tracked);
  assert.deepEqual(selected.names, [
    "packages/git/src/ascii.ts",
    "packages/git/src/checkout-types.ts",
    "packages/git/src/pure-names.ts",
    "packages/git/src/reader.ts",
    "packages/git/src/tree-proof.ts",
  ]);
  assert.ok(selected.omitted.includes("packages/git/src/node.ts"));
  assert.ok(selected.omitted.includes("packages/git/src/gateway.ts"));
  assert.equal(selected.names.length + selected.omitted.length, tracked.length);
  assert.throws(() => productionInputs({ ...spec, includedInputs: [...spec.includedInputs, "src/node.ts"] }, tracked), /source-input-inclusions/);
  assert.throws(() => productionInputs(spec, tracked.filter(path => !path.endsWith("/ascii.ts"))), /missing-included-source/);
  for (const name of selected.names) {
    const file = new URL(name, root);
    for (const ref of references(readFileSync(file, "utf8"))) {
      if (ref.startsWith(".")) assert.ok(selected.names.some(path => new URL(path, root).href === new URL(ref, file).href), `${name}: ${ref}`);
      else assert.ok(["@generalbusiness/dap-bytes", "@noble/hashes/legacy.js"].includes(ref), `${name}: ${ref}`);
    }
  }
  // Scripted emitted modules isolate archive scope and declaration guards;
  // only a later actual compiler/pack run can establish a usable archive.
  const stage = mkdtempSync(join(tmpdir(), "artroom-sdk-git-closure-"));
  try {
    mkdirSync(join(stage, "dist/src"), { recursive: true });
    writeFileSync(join(stage, "package.json"), JSON.stringify(manifest));
    for (const path of PUBLIC_GIT_INPUTS) for (const extension of ["js", "d.ts"]) {
      writeFileSync(join(stage, `dist/${path.replace(/\.ts$/, `.${extension}`)}`), "export {};\n");
    }
    assert.equal(outputClosure(stage, spec, "0.1.0-dev.2").length, 11);
    for (const extension of ["js", "d.ts"]) {
      const file = join(stage, `dist/src/gateway.${extension}`);
      writeFileSync(file, "export {};\n");
      assert.throws(() => outputClosure(stage, spec, "0.1.0-dev.2"), /excluded-output/);
      rmSync(file);
    }
    for (const extension of ["js", "d.ts"]) {
      const file = join(stage, `dist/src/tree-proof.${extension}`);
      writeFileSync(file, 'export * from "./gateway.js";\n');
      assert.throws(() => outputClosure(stage, spec, "0.1.0-dev.2"), /relative-output-closure/);
      writeFileSync(file, 'import "node:fs";\n');
      assert.throws(() => outputClosure(stage, spec, "0.1.0-dev.2"), /bare-output-closure/);
      writeFileSync(file, "export {};\n");
    }
  } finally { rmSync(stage, { recursive: true, force: true }); }
});

// This existing compatibility obligation can fail independently of lexical/copy checks.
// Preserve actual workspace manifests and expected compatibility; do not project a plan.
test("SDK published manifests match the actual supported workspace manifests", () => {
  // The eight-package plan preserves the actual public closure.
  for (const spec of PLAN.packages) {
    const manifest = JSON.parse(readFileSync(new URL(`packages/${spec.dir}/package.json`, root), "utf8"));
    const published = publishManifest(spec, manifest, "0.1.0-dev.2");
    assert.equal(published.name, nameOf(spec.dir));
    assert.deepEqual(Object.keys(published.exports), Object.keys(spec.exports));
    assert.deepEqual(published.dependencies ?? {}, Object.fromEntries(Object.entries(spec.dependencies).map(([name, pin]) => [name, pin === "coordinated" ? "0.1.0-dev.2" : pin])));
    assert.throws(() => publishManifest(spec, { ...manifest, exports: { ...manifest.exports, "./unknown": "./src/unknown.ts" } }, "0.1.0-dev.2"), /unsupported-source-manifest/);
    assert.throws(() => publishManifest(spec, { ...manifest, dependencies: { ...manifest.dependencies, "unexpected-dependency": "1.0.0" } }, "0.1.0-dev.2"), /unsupported-source-dependencies/);
  }
  const platform = PLAN.packages.find(spec => spec.dir === "platform");
  const replay = PLAN.packages.find(spec => spec.dir === "replay");
  const platformManifest = JSON.parse(readFileSync(new URL("packages/platform/package.json", root), "utf8"));
  const published = publishManifest(platform, platformManifest, "0.1.0-dev.2");
  assert.equal(published.name, "@generalbusiness/dap-platform");
  assert.deepEqual(published.repository, { type: "git", url: "git+https://github.com/generalbusiness-ai/dap.git", directory: "packages/platform" });
  assert.equal(published.homepage, "https://dap.generalbusiness.ai/");
  assert.deepEqual(Object.keys(published.exports), [".", "./membership-actions", "./application", "./application-v2", "./package-validation"]);
  assert.equal(published.exports["./application-install"], undefined);
  assert.deepEqual(published.files, ["dist", "skills", "README.md", "LICENSE", "NOTICE"]);
  assert.deepEqual(platform.excludedSourceExports, { "./testing": "./test/support.ts", "./application-install": "./src/application-install.ts" });
  assert.throws(() => publishManifest({ ...platform, excludedSourceExports: { "./testing": "./test/support.ts" } }, platformManifest, "0.1.0-dev.2"), /source-export-exclusions/);
  assert.throws(() => publishManifest(platform, { ...platformManifest, exports: { ...platformManifest.exports, "./application-install": "./src/index.ts" } }, "0.1.0-dev.2"), /unsupported-source-export/);
  assert.deepEqual(published.exports["./membership-actions"], { types: "./dist/src/membership-actions.d.ts", default: "./dist/src/membership-actions.js" });
  assert.deepEqual(published.exports["./package-validation"], { types: "./dist/src/validate-package.d.ts", default: "./dist/src/validate-package.js" });
  assert.throws(() => publishManifest(platform, { ...platformManifest, exports: { ...platformManifest.exports, "./package-validation": "./src/index.ts" } }, "0.1.0-dev.2"), /unsupported-source-export/);
  assert.deepEqual(published.dependencies, { "@generalbusiness/dap-bytes": "0.1.0-dev.2", "@generalbusiness/dap-contract": "0.1.0-dev.2", "@generalbusiness/dap-derive": "0.1.0-dev.2", "@generalbusiness/dap-package-graph": "0.1.0-dev.2", "@generalbusiness/dap-git": "0.1.0-dev.2" });
  const bytes = PLAN.packages.find(spec => spec.dir === "bytes");
  const bytesManifest = JSON.parse(readFileSync(new URL("packages/bytes/package.json", root), "utf8"));
  const publicBytes = publishManifest(bytes, bytesManifest, "0.1.0-dev.2");
  assert.equal(bytesManifest.name, "@generalbusiness/dap-bytes");
  assert.equal(publicBytes.name, "@generalbusiness/dap-bytes");
  assert.equal(publicBytes.dependencies["@noble/curves"], "2.4.0");
  assert.deepEqual(Object.keys(publicBytes.exports), [".", "./web"]);
  assert.equal(publicBytes.dependencies["@generalbusiness/dap-package-graph"], undefined);
  assert.deepEqual(published.exports["./application-v2"], { types: "./dist/src/application-codec/application-v2.d.ts", default: "./dist/src/application-codec/application-v2.js" });
  assert.throws(() => publishManifest(platform, { ...platformManifest, exports: { ...platformManifest.exports, "./application-v2": "./src/index.ts" } }, "0.1.0-dev.2"), /unsupported-source-export/);
  assert.throws(() => publishManifest(platform, { ...platformManifest, dependencies: { ...platformManifest.dependencies, "@generalbusiness/dap-package-graph": "0.1.0-wrong" } }, "0.1.0-dev.2"), /dependency-pin/);
  const graph = PLAN.packages.find(spec => spec.dir === "package-graph");
  const graphManifest = JSON.parse(readFileSync(new URL("packages/package-graph/package.json", root), "utf8"));
  assert.deepEqual(publishManifest(graph, graphManifest, "0.1.0-dev.2").dependencies, { "@generalbusiness/dap-contract": "0.1.0-dev.2", "@generalbusiness/dap-derive": "0.1.0-dev.2" });
  const client = PLAN.packages.find(spec => spec.dir === "client");
  const clientManifest = JSON.parse(readFileSync(new URL("packages/client/package.json", root), "utf8"));
  assert.deepEqual(Object.keys(publishManifest(client, clientManifest, "0.1.0-dev.2").exports), [".", "./application"]);
  assert.equal(publishManifest(client, clientManifest, "0.1.0-dev.2").dependencies["@generalbusiness/dap-platform"], "0.1.0-dev.2");
  const derive = PLAN.packages.find(spec => spec.dir === "derive");
  const deriveManifest = JSON.parse(readFileSync(new URL("packages/derive/package.json", root), "utf8"));
  const publicDerive = publishManifest(derive, deriveManifest, "0.1.0-dev.2");
  assert.equal(publicDerive.dependencies["@generalbusiness/dap-package-graph"], undefined);
  assert.deepEqual(publicDerive.exports["./field-types"], { types: "./dist/src/field-types.d.ts", default: "./dist/src/field-types.js" });
  assert.throws(() => publishManifest(derive, { ...deriveManifest, exports: { ...deriveManifest.exports, "./field-types": "./src/index.ts" } }, "0.1.0-dev.2"), /unsupported-source-export/);
  assert.throws(() => publishManifest(platform, { ...platformManifest, name: "@generalbusiness/artroom-platform" }, "0.1.0-dev.2"), /unsupported-source-manifest/);
  assert.throws(() => publishManifest(platform, { ...platformManifest, exports: { ...platformManifest.exports, "./private": "./src/private.ts" } }, "0.1.0-dev.2"), /unsupported-source-manifest/);
  const replayManifest = JSON.parse(readFileSync(new URL("packages/replay/package.json", root), "utf8"));
  const publicReplay = publishManifest(replay, replayManifest, "0.1.0-dev.2");
  assert.deepEqual(Object.keys(publicReplay.exports), ["."]);
  assert.equal(publicReplay.dependencies["@generalbusiness/dap-git"], undefined);
  assert.equal(publicReplay.dependencies["@generalbusiness/dap-platform"], undefined);
  assert.deepEqual(replay.excludedSourceDependencies, { "@generalbusiness/dap-platform": "coordinated" });
  assert.throws(() => publishManifest({ ...replay, excludedSourceDependencies: {} }, replayManifest, "0.1.0-dev.2"), /source-dependency-exclusions/);
  assert.throws(() => publishManifest({ ...replay, excludedSourceDependencies: { ...replay.excludedSourceDependencies, unknown: "coordinated" } }, replayManifest, "0.1.0-dev.2"), /source-dependency-exclusions/);
  assert.throws(() => publishManifest(replay, { ...replayManifest, dependencies: { ...replayManifest.dependencies, "@generalbusiness/dap-platform": "0.1.0-wrong" } }, "0.1.0-dev.2"), /source-only-dependency-pin/);
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
