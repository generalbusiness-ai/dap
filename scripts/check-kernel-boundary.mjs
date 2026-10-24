/** Production dependency boundary only. Parse Source; never load its modules. */
import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "rolldown/parseAst";

// The sole machine list of kernel workspaces. External approvals live in docs/kernel.md.
export const KERNEL = Object.freeze(["contract", "bytes", "derive"]);
const sourceExtension = /\.(?:[cm]?[jt]sx?|json)$/;
const codeExtension = /\.[cm]?[jt]sx?$/;
const ownRoot = file => /^packages\/([^/]+)\//.exec(file)?.[1];
const kernelPath = file => KERNEL.includes(ownRoot(file));
export const productionSource = file => /^packages\/[^/]+\/src\//.test(file) && codeExtension.test(file)
  && !/\/(?:tests?|__tests__)\//.test(file) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
const clean = path => typeof path === "string" && path.length > 0 && !path.includes("\\") && !path.includes("\0")
  && !path.startsWith("/") && posix.normalize(path) === path && path !== ".." && !path.startsWith("../");

/** One documented table; deleting approval while retaining a dependency refuses it. */
export function approvedLibraries(document) {
  const start = "<!-- kernel-approved-libraries -->", end = "<!-- /kernel-approved-libraries -->";
  if (document.split(start).length !== 2 || document.split(end).length !== 2) throw Error("kernel-library-table");
  const body = document.split(start)[1].split(end)[0].trim().split("\n").map(line => line.trim());
  if (body.shift() !== "| Package | Exact version |" || body.shift() !== "|---|---|") throw Error("kernel-library-table");
  const approved = new Map();
  for (const line of body) {
    const match = /^\| `([^`]+)` \| `([0-9]+\.[0-9]+\.[0-9]+)` \|$/.exec(line);
    if (!match || approved.has(match[1]) || !/^(?:@[a-z0-9-]+\/)?[a-z0-9-]+$/.test(match[1])) throw Error("kernel-library-table");
    approved.set(match[1], match[2]);
  }
  return approved;
}

/** Includes erased type edges. A computed module expression is an explicit refusal. */
export function moduleEdges(source, file) {
  const program = parseAst(source, { lang: file.endsWith("x") ? "tsx" : "ts" }, file), edges = [];
  const literal = node => {
    if (node?.type !== "Literal" || typeof node.value !== "string" || !node.value) throw Error(`${file}: nonliteral module target`);
    return node.value;
  };
  const add = node => edges.push(literal(node));
  const loaderMember = node => {
    if (node?.type !== "MemberExpression" || node.object.type !== "Identifier" || !["module", "require"].includes(node.object.name)) return false;
    if (node.computed && (node.property.type !== "Literal" || typeof node.property.value !== "string")) throw Error(`${file}: nonliteral loader access`);
    const name = node.computed ? node.property.value : node.property.name;
    return node.object.name === "module" && name === "require" || node.object.name === "require" && name === "resolve";
  };
  const loader = node => node?.type === "Identifier" && node.name === "require" || loaderMember(node);
  function walk(node, parent) {
    if (!node || typeof node !== "object") return;
    if (node.type === "MemberExpression" && loaderMember(node) && !(parent?.type === "CallExpression" && parent.callee === node)) throw Error(`${file}: unsupported loader reference`);
    if (node.type === "Identifier" && node.name === "module") {
      const loaderObject = parent?.type === "MemberExpression" && parent.object === node && loaderMember(parent);
      const propertyName = parent?.type === "MemberExpression" && !parent.computed && parent.property === node
        || parent?.type === "Property" && !parent.computed && parent.key === node;
      if (!loaderObject && !propertyName) throw Error(`${file}: unsupported module loader object reference`);
    }
    if (node.type === "Identifier" && node.name === "require") {
      const called = parent?.type === "CallExpression" && parent.callee === node;
      const member = parent?.type === "MemberExpression" && (parent.object === node && loaderMember(parent) || !parent.computed && parent.property === node);
      const key = parent?.type === "Property" && !parent.computed && parent.key === node;
      if (!called && !member && !key) throw Error(`${file}: unsupported loader reference`);
    }
    if (node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration" || node.type === "ExportNamedDeclaration") {
      if (node.source) add(node.source);
    } else if (node.type === "ImportExpression" || node.type === "TSImportType") add(node.source);
    else if (node.type === "TSImportEqualsDeclaration" && node.moduleReference.type === "TSExternalModuleReference") add(node.moduleReference.expression);
    else if (node.type === "CallExpression" && loader(node.callee)) {
      if (node.arguments.length !== 1) throw Error(`${file}: unsupported require arguments`);
      add(node.arguments[0]);
    }
    for (const [key, value] of Object.entries(node)) {
      if (["parent", "loc", "start", "end"].includes(key)) continue;
      if (Array.isArray(value)) for (const child of value) walk(child, node);
      else if (value && typeof value === "object") walk(value, node);
    }
  }
  walk(program); return edges;
}

/** Config files use JSON with comments. Read only literal data through the same parser. */
export function compilerConfiguration(source, file) {
  const program = parseAst(`const config = (${source});`, { lang: "ts" }, file);
  const data = node => {
    if (node?.type === "Literal" && (node.value === null || ["string", "number", "boolean"].includes(typeof node.value))) return node.value;
    if (node?.type === "ArrayExpression") return node.elements.map(data);
    if (node?.type !== "ObjectExpression") throw Error(`Nonliteral compiler configuration: ${file}`);
    const result = Object.create(null);
    for (const property of node.properties) {
      if (property.type !== "Property" || property.computed || property.kind !== "init" || property.method
        || property.key.type !== "Literal" || typeof property.key.value !== "string" || Object.hasOwn(result, property.key.value)) throw Error(`Unsupported compiler configuration: ${file}`);
      result[property.key.value] = data(property.value);
    }
    return result;
  };
  if (program.body.length !== 1 || program.body[0].type !== "VariableDeclaration" || program.body[0].declarations.length !== 1) throw Error(`Unsupported compiler configuration: ${file}`);
  return data(program.body[0].declarations[0].init);
}

function exportTargets(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object" || Array.isArray(value) || !Object.keys(value).length) throw Error("unsupported export target");
  return Object.values(value).flatMap(exportTargets);
}
const dependencyGroups = ["dependencies", "optionalDependencies", "peerDependencies"];
function dependencies(manifest) {
  const result = new Map();
  for (const group of dependencyGroups) for (const [name, version] of Object.entries(manifest[group] ?? {})) {
    if (result.has(name) && result.get(name) !== version) throw Error(`conflicting dependency pin: ${name}`);
    result.set(name, version);
  }
  return result;
}

/** Virtual inputs make parser/resolver witnesses cheap; production gathers actual files below. */
export function analyzeKernel({ files, manifests, approved, configs = new Map(), external = () => false }) {
  const findings = [], names = new Map([...manifests].map(([dir, manifest]) => [manifest.name, dir]));
  const fail = (file, why) => findings.push(`${file}: ${why}`);
  const productionTarget = target => clean(target) && files.has(target) && kernelPath(target)
    && (/\.json$/.test(target) ? /^packages\/[^/]+\/src\//.test(target) : productionSource(target));
  for (const dir of KERNEL) {
    const path = `packages/${dir}/package.json`, manifest = manifests.get(dir);
    if (!manifest || manifest.name !== `@generalbusiness/dap-${dir}`) { fail(path, "missing or wrong kernel manifest"); continue; }
    if (manifest.imports && Object.keys(manifest.imports).length) fail(path, "package imports aliases require explicit resolver support");
    const config = configs.get(dir) ?? {};
    if (config.paths && Object.keys(config.paths).length) fail(`packages/${dir}/tsconfig.json`, "compiler paths aliases require explicit resolver support");
    for (const option of ["baseUrl", "rootDirs", "moduleSuffixes"]) if (Object.hasOwn(config, option)) fail(`packages/${dir}/tsconfig.json`, `unsupported compiler resolver option ${option}`);
    if (typeof config.moduleResolution !== "string" || config.moduleResolution.toLowerCase() !== "bundler") fail(`packages/${dir}/tsconfig.json`, "unsupported compiler moduleResolution; expected Bundler");
    if (Object.hasOwn(config, "resolvePackageJsonExports") && config.resolvePackageJsonExports !== true) fail(`packages/${dir}/tsconfig.json`, "unsupported compiler resolvePackageJsonExports");
    let declared;
    try { declared = dependencies(manifest); } catch (error) { fail(path, error.message); continue; }
    for (const [name, version] of declared) {
      const target = names.get(name);
      if (target !== undefined) {
        if (!KERNEL.includes(target)) fail(path, `forbidden workspace dependency ${name}`);
        else if (version !== manifests.get(target).version) fail(path, `workspace dependency pin ${name}`);
      } else if (!approved.has(name) || version !== approved.get(name)) fail(path, `unapproved or unpinned external dependency ${name}`);
      else if (!external(name, path, version, false)) fail(path, `unresolved or mismatched external dependency ${name}`);
    }
    const sources = [...files].filter(([file]) => ownRoot(file) === dir && productionSource(file));
    if (!sources.length) fail(path, "no production sources");
    for (const [file, source] of sources) {
      let edges;
      try { edges = moduleEdges(source, file); } catch (error) { fail(file, error.message); continue; }
      for (const edge of edges) {
        try {
          if (edge.startsWith(".")) {
            const target = posix.normalize(posix.join(posix.dirname(file), edge));
            if (!productionTarget(target) || !sourceExtension.test(target)) throw Error(`unresolved or nonkernel production target ${edge}`);
            const owner = ownRoot(target);
            if (owner !== dir && declared.get(manifests.get(owner).name) !== manifests.get(owner).version) throw Error(`undeclared workspace edge ${edge}`);
          } else {
            if (edge.startsWith("#")) throw Error(`unresolved package alias ${edge}`);
            const parts = edge.split("/"), count = edge.startsWith("@") ? 2 : 1;
            if (parts.some(part => !part || part === "." || part === "..") || edge.includes("\\")) throw Error(`unsupported module target ${edge}`);
            const name = parts.slice(0, count).join("/"), owner = names.get(name);
            if (owner !== undefined) {
              if (!KERNEL.includes(owner)) throw Error(`forbidden workspace edge ${edge}`);
              const other = manifests.get(owner);
              if (owner !== dir && declared.get(name) !== other.version) throw Error(`undeclared workspace edge ${edge}`);
              const key = parts.length === count ? "." : "./" + parts.slice(count).join("/");
              const entry = other.exports?.[key];
              if (entry === undefined) throw Error(`unknown workspace export ${edge}`);
              for (const exported of exportTargets(entry)) {
                if (!exported.startsWith("./") || !productionTarget(posix.join(`packages/${owner}`, exported))) throw Error(`unresolved or nonproduction workspace export ${edge}`);
              }
            } else {
              if (!approved.has(name) || declared.get(name) !== approved.get(name)) throw Error(`unapproved or undeclared external edge ${edge}`);
              if (!external(edge, file, approved.get(name), true)) throw Error(`unresolved or mismatched external edge ${edge}`);
            }
          }
        } catch (error) { fail(file, error.message); }
      }
    }
  }
  return { files: [...files.keys()].filter(file => kernelPath(file) && productionSource(file)).length, findings };
}

export function checkKernelBoundary(root) {
  const names = [...new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean))];
  const read = file => {
    const physical = resolve(root, file);
    if (!lstatSync(physical).isFile() || realpathSync(physical) !== physical) throw Error(`Nonregular or aliased boundary input: ${file}`);
    return readFileSync(physical, "utf8");
  };
  const manifests = new Map(names.filter(file => /^packages\/[^/]+\/package\.json$/.test(file))
    .map(file => [ownRoot(file), JSON.parse(read(file))]));
  const approved = approvedLibraries(read("docs/kernel.md")), lock = JSON.parse(read("package-lock.json"));
  const files = new Map(names.filter(file => kernelPath(file) && productionSource(file)).map(file => [file, read(file)]));
  // JSON data may be imported, but never test/config material outside src.
  for (const file of names.filter(file => kernelPath(file) && /^packages\/[^/]+\/src\/.*\.json$/.test(file))) files.set(file, read(file));
  const configs = new Map();
  function options(file, seen = new Set()) {
    if (seen.has(file)) throw Error(`Cyclic compiler configuration: ${file}`);
    seen.add(file); const config = compilerConfiguration(read(file), file);
    if (config.extends && (typeof config.extends !== "string" || !config.extends.startsWith("."))) throw Error(`Unsupported compiler extends: ${file}`);
    return { ...(config.extends ? options(posix.normalize(posix.join(posix.dirname(file), config.extends)), seen) : {}), ...config.compilerOptions };
  }
  for (const dir of KERNEL) configs.set(dir, options(`packages/${dir}/tsconfig.json`));
  const external = (specifier, from, version, resolveEdge) => {
    try {
      const name = specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
      const packageRoot = realpathSync(resolve(root, "node_modules", name));
      const manifest = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
      if (manifest.name !== name || manifest.version !== version || lock.packages[`node_modules/${name}`]?.version !== version) return false;
      if (!resolveEdge) return true; // A valid package need not export its root.
      const resolved = realpathSync(createRequire(resolve(root, from)).resolve(specifier)), inside = relative(packageRoot, resolved);
      return inside !== ".." && !inside.startsWith("../") && !inside.startsWith("/") && lstatSync(resolved).isFile();
    } catch { return false; }
  };
  return analyzeKernel({ files, manifests, approved, configs, external });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."), result = checkKernelBoundary(root);
  for (const finding of result.findings) console.error(finding);
  console.log(`Kernel boundary: ${result.files} production sources, ${result.findings.length} refusals.`);
  if (result.findings.length) process.exitCode = 1;
}
