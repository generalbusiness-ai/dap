// Structural fixtures prove dependency recognition/resolution, not native admission.
import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeKernel, approvedLibraries, compilerConfiguration, moduleEdges, productionSource } from "./check-kernel-boundary.mjs";

const table = `<!-- kernel-approved-libraries -->
| Package | Exact version |
|---|---|
| \`@noble/curves\` | \`2.4.0\` |
| \`@noble/hashes\` | \`2.4.0\` |
| \`jsonata\` | \`2.2.2\` |
<!-- /kernel-approved-libraries -->`;
function fixture(source = "export {};") {
  const version = "0.1.0-dev.1", dirs = ["contract", "bytes", "derive", "platform"];
  const manifests = new Map(dirs.map(dir => [dir, { name: `@generalbusiness/dap-${dir}`, version,
    exports: { ".": "./src/index.ts" }, dependencies: {} }]));
  manifests.get("derive").dependencies = { "@generalbusiness/dap-contract": version, "@generalbusiness/dap-bytes": version, jsonata: "2.2.2" };
  manifests.get("bytes").dependencies = { "@generalbusiness/dap-contract": version, "@noble/curves": "2.4.0", "@noble/hashes": "2.4.0" };
  return { files: new Map(dirs.map(dir => [`packages/${dir}/src/index.ts`, dir === "derive" ? source : "export {};"])),
    manifests, approved: approvedLibraries(table), configs: new Map(dirs.map(dir => [dir, { moduleResolution: "Bundler" }])), external: () => true };
}

test("kernel parser sees every production module edge and ignores ordinary data", () => {
  const target = "@generalbusiness/dap-platform/application";
  const edges = [
    `import { X } from '${target}';`, `import '${target}';`, `import type { X } from '${target}';`,
    `import { type X } from '${target}';`, `export * from '${target}';`, `export type { X } from '${target}';`,
    `export { X } /* between tokens */ from\n '${target}';`, `const load = () => import('${target}');`,
    `type X = import('${target}').X;`, `import X = require('${target}');`, `const X = require('${target}');`,
    `const X = module.require('${target}');`, `const X = require.resolve('${target}');`,
    `const X = module['require']('${target}');`, `const X = require['resolve']('${target}');`,
  ];
  for (const source of edges) {
    assert.deepEqual(moduleEdges(source, "fixture.ts"), [target], source);
    const result = analyzeKernel(fixture(source));
    assert.equal(result.findings.length, 1, source);
    assert.match(result.findings[0], /packages\/derive\/src\/index\.ts: forbidden workspace edge/, source);
  }
  for (const source of ["import(name);", "require(name);", "type X = import(name).X;"]) {
    assert.ok(analyzeKernel(fixture(source)).findings.some(line => /packages\/derive\/src\/index\.ts/.test(line)), source);
  }
  for (const source of ["module[name]('x');", "require[name]('x');", "const load = require; load('x');", "const load = module.require; load('x');", "const load = module['require']; load('x');", "const load = require.resolve; load('x');"]) {
    assert.throws(() => moduleEdges(source, "fixture.ts"), /nonliteral loader access|unsupported loader reference/, source);
  }
  for (const source of ["const m = module; m.require('x');", "const { require: load } = module; load('x');", "module.parent.require('x');", "module['parent']['require']('x');"]) {
    assert.throws(() => moduleEdges(source, "fixture.ts"), /unsupported module loader object reference/, source);
  }
  const inert = `// import '${target}';\nconst data = "export * from '${target}'"; const pattern = /import['\"]/; const keys = { module: "data", require: "data" };`;
  assert.deepEqual(moduleEdges(inert, "fixture.ts"), []);
  assert.deepEqual(analyzeKernel(fixture(`import type { X } from '@generalbusiness/dap-contract'; export * from '@generalbusiness/dap-bytes';`)).findings, []);
});

test("kernel resolution binds production homes, exact exports and documented manifest pins", () => {
  const controls = [
    ["relative platform", model => { model.files.set("packages/derive/src/index.ts", "export * from '../../platform/src/index.ts';"); }, /nonkernel production target/],
    ["transitive export", model => { model.files.set("packages/derive/src/index.ts", "export * from '@generalbusiness/dap-bytes';"); model.files.set("packages/bytes/src/index.ts", "export * from '../../platform/src/index.ts';"); }, /packages\/bytes\/src\/index\.ts:.*nonkernel production target/],
    ["test escape", model => { model.files.set("packages/derive/src/index.ts", "import '../test/outside.ts';"); model.files.set("packages/derive/test/outside.ts", "import '@generalbusiness/dap-platform';"); }, /nonkernel production target/],
    ["unknown export", model => { model.files.set("packages/derive/src/index.ts", "import '@generalbusiness/dap-bytes/unknown';"); }, /unknown workspace export/],
    ["test export", model => { model.manifests.get("bytes").exports["./testing"] = "./test/fixture.ts"; model.files.set("packages/bytes/test/fixture.ts", "export {};"); model.files.set("packages/derive/src/index.ts", "import '@generalbusiness/dap-bytes/testing';"); }, /nonproduction workspace export/],
    ["lookalike", model => { model.files.set("packages/derive/src/index.ts", "import '@generalbusiness/dap-bytes-other';"); }, /unapproved or undeclared external edge/],
    ["package alias", model => { model.files.set("packages/derive/src/index.ts", "import '#platform';"); }, /unresolved package alias/],
    ["compiler alias", model => { model.configs.set("derive", { paths: { "@generalbusiness/dap-bytes": ["../platform/src/index.ts"] } }); }, /compiler paths aliases/],
    ...["baseUrl", "rootDirs", "moduleSuffixes"].map(option => [option, model => { model.configs.get("derive")[option] = option === "baseUrl" ? "../platform/src" : ["../platform/src"]; }, new RegExp(`unsupported compiler resolver option ${option}`)]),
    ["nonexport mode", model => { model.configs.get("derive").moduleResolution = "Classic"; }, /unsupported compiler moduleResolution/],
    ["exports disabled", model => { model.configs.get("derive").resolvePackageJsonExports = false; }, /unsupported compiler resolvePackageJsonExports/],
    ["forbidden manifest", model => { model.manifests.get("derive").dependencies["@generalbusiness/dap-platform"] = "0.1.0-dev.1"; }, /forbidden workspace dependency/],
    ["unlisted external", model => { model.manifests.get("derive").dependencies.unapproved = "1.0.0"; }, /unapproved or unpinned external dependency/],
    ["unpinned external", model => { model.manifests.get("derive").dependencies.jsonata = "^2.2.2"; }, /unapproved or unpinned external dependency/],
    ["wrong pin", model => { model.manifests.get("bytes").dependencies["@noble/curves"] = "2.4.1"; }, /unapproved or unpinned external dependency/],
    ["removed approval", model => { model.approved.delete("jsonata"); }, /unapproved or unpinned external dependency jsonata/],
    ["unresolved external", model => { model.external = () => false; }, /unresolved or mismatched external dependency/],
  ];
  for (const [name, mutate, expected] of controls) {
    const model = fixture(); mutate(model);
    assert.ok(analyzeKernel(model).findings.some(line => expected.test(line)), name);
  }
  const accepted = fixture("import { x } from '../../bytes/src/index.ts'; import 'jsonata';");
  accepted.files.set("packages/derive/test/outside.ts", "import '@generalbusiness/dap-platform';");
  accepted.manifests.get("derive").devDependencies = { "@generalbusiness/dap-platform": "0.1.0-dev.1" };
  assert.deepEqual(analyzeKernel(accepted).findings, []); // Tests and tooling are outside the production rule.
  assert.equal(productionSource("packages/derive/test/outside.ts"), false);
  assert.equal(productionSource("packages/derive/src/fixture.test.ts"), false);
  assert.equal(productionSource("scripts/check-kernel-boundary.mjs"), false);
  assert.equal(compilerConfiguration('{"compilerOptions": { /* real config comments */ "rootDir": "../.." }}', "tsconfig.json").compilerOptions.rootDir, "../..");
  assert.throws(() => compilerConfiguration('{"compilerOptions": load()}', "tsconfig.json"), /Nonliteral compiler configuration/);
  assert.throws(() => approvedLibraries(table.replace("2.2.2", "^2.2.2")), /kernel-library-table/);
});
