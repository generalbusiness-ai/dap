/** Refuse local implementations of helpers exported by bytes. Uses the
 * TypeScript parser already locked with Vite/Vitest; executes no source. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "rolldown/parseAst";

const parse = (source, file) => parseAst(source, { lang: file.endsWith(".tsx") ? "tsx" : "ts" }, file);
const sourceOf = (file, specifier) => specifier.startsWith(".") ? resolve(dirname(file), specifier) : createRequire(file).resolve(specifier);
const declaredNames = node => node?.type === "FunctionDeclaration" || node?.type === "ClassDeclaration"
  ? node.id ? [node.id.name] : []
  : node?.type === "VariableDeclaration" ? node.declarations.filter(d => d.id.type === "Identifier").map(d => d.id.name) : [];

/** Follow the actual runtime exports, including barrel and named re-exports.
 * Type-only names cannot own a runtime helper. Paths identify its one home. */
export function bytesExports(entry, read = file => readFileSync(file, "utf8")) {
  const active = new Set(), cached = new Map();
  function visit(file) {
    if (cached.has(file)) return cached.get(file);
    if (active.has(file)) throw Error(`Cyclic bytes re-export: ${file}`);
    active.add(file);
    const owners = new Map();
    for (const node of parse(read(file), file).body) {
      if (node.type === "ExportAllDeclaration" && node.exportKind !== "type") {
        for (const [name, owner] of visit(sourceOf(file, node.source.value))) owners.set(name, owner);
      }
      if (node.type !== "ExportNamedDeclaration" || node.exportKind === "type") continue;
      for (const name of declaredNames(node.declaration)) owners.set(name, file);
      for (const specifier of node.specifiers ?? []) {
        if (specifier.exportKind === "type") continue;
        const original = specifier.local.name ?? specifier.local.value;
        const owner = node.source ? visit(sourceOf(file, node.source.value)).get(original) : file;
        if (!owner) throw Error(`Unresolved bytes re-export: ${file} ${original}`);
        owners.set(specifier.exported.name ?? specifier.exported.value, owner);
      }
    }
    active.delete(file); cached.set(file, owners); return owners;
  }
  return visit(resolve(entry));
}

function callable(expression) {
  while (["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "ParenthesizedExpression"].includes(expression?.type)) expression = expression.expression;
  return ["ArrowFunctionExpression", "FunctionExpression"].includes(expression?.type);
}

/** Imports and re-export aliases reuse the existing implementation. A new
 * file-local function under an exported bytes name must use that home or
 * state its different meaning in a different name. */
export function helperRedefinitions(owners, sources) {
  const findings = [];
  for (const [file, source] of sources) {
    for (const statement of parse(source, file).body) {
      const node = ["ExportNamedDeclaration", "ExportDefaultDeclaration"].includes(statement.type) ? statement.declaration : statement;
      const names = node?.type === "FunctionDeclaration" && node.body ? declaredNames(node)
        : node?.type === "VariableDeclaration" ? node.declarations.filter(d => d.id.type === "Identifier" && callable(d.init)).map(d => d.id.name) : [];
      for (const name of names) if (owners.has(name) && resolve(file) !== owners.get(name)) findings.push({ file, name, owner: owners.get(name) });
    }
  }
  return findings;
}

export function checkSharedHelpers(root) {
  const names = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "packages/*/src/*.ts", "packages/*/src/*.tsx", "apps/**/*.ts", "apps/**/*.tsx", "examples/**/*.ts", "examples/**/*.tsx"], { cwd: root, encoding: "utf8" }).split("\0");
  const files = [...new Set(names)].filter(file => file && !file.includes("/test/") && !file.includes("/tests/") && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file) && !/\/(?:testing|test-support)\.ts$/.test(file));
  const packageRoot = resolve(root, "packages/bytes"), manifest = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
  const runtimeTargets = value => typeof value === "string" ? [value] : value && typeof value === "object"
    ? Object.entries(value).filter(([condition]) => condition !== "types").flatMap(([, target]) => runtimeTargets(target)) : [];
  const owners = new Map();
  for (const target of new Set(runtimeTargets(manifest.exports))) {
    for (const [name, owner] of bytesExports(resolve(packageRoot, target))) owners.set(name, owner);
  }
  const findings = helperRedefinitions(owners, files.map(file => [resolve(root, file), readFileSync(resolve(root, file), "utf8")]));
  for (const finding of findings) console.error(`${relative(root, finding.file)}: ${finding.name} is already owned by ${relative(root, finding.owner)}; import it or name the different meaning.`);
  return { files: files.length, exports: owners.size, findings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const result = checkSharedHelpers(root);
  if (result.findings.length) process.exitCode = 1;
  else console.log(`Shared helpers: ${result.files} source files checked against ${result.exports} bytes exports.`);
}
