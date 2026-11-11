// Static import closure of the deployed room Worker, by regex over import statements.
// Usage: node graph.mjs <repo root>
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";

const root = resolve(process.argv[2]);
const pkgs = new Map();
for (const dir of ["bytes", "checkers", "cli", "client", "contract", "define", "derive", "git", "mcp", "package-graph", "platform", "replay", "scope"]) {
  const file = join(root, "packages", dir, "package.json");
  if (!existsSync(file)) continue;
  const json = JSON.parse(readFileSync(file, "utf8"));
  pkgs.set(json.name, { dir: join(root, "packages", dir), exports: json.exports ?? {} });
}
const IMPORT = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/g;
const DYNAMIC = /import\(\s*["']([^"']+)["']\s*\)/g;

function target(from, spec) {
  if (spec.startsWith(".")) {
    const base = resolve(dirname(from), spec);
    for (const candidate of [base, base + ".ts", join(base, "index.ts")]) if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    return null;
  }
  for (const [name, pkg] of pkgs) {
    if (spec !== name && !spec.startsWith(name + "/")) continue;
    const sub = spec === name ? "." : "." + spec.slice(name.length);
    const entry = pkg.exports[sub];
    const path = typeof entry === "string" ? entry : entry?.default ?? entry?.import ?? null;
    return path ? join(pkg.dir, path) : null;
  }
  return null; // external or node builtin
}
const cache = new Map();
function importsOf(file) {
  if (cache.has(file)) return cache.get(file);
  const out = new Set();
  if (file.endsWith(".ts") || file.endsWith(".mjs") || file.endsWith(".js")) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(IMPORT)) {
      if (match[1]) continue; // `import type`: erased
      const to = target(file, match[2]);
      if (to) out.add(to);
    }
    for (const match of text.matchAll(DYNAMIC)) { const to = target(file, match[1]); if (to) out.add(to); }
  }
  cache.set(file, out);
  return out;
}
function closure(entries, without = new Set()) {
  const seen = new Set();
  const stack = entries.filter(file => !without.has(file));
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file) || without.has(file)) continue;
    seen.add(file);
    for (const next of importsOf(file)) stack.push(next);
  }
  return seen;
}
const lines = file => file.endsWith(".ts") ? readFileSync(file, "utf8").split("\n").length : 0;
const sum = files => [...files].reduce((n, file) => n + lines(file), 0);
const rel = file => relative(root, file);

const entry = join(root, "apps/room/fetch.ts");
const all = closure([entry]);
console.log(`deployed closure: ${all.size} modules, ${sum(all)} lines (entry ${rel(entry)})`);
const by = new Map();
for (const file of all) { const key = rel(file).split("/").slice(0, 2).join("/"); by.set(key, (by.get(key) ?? 0) + lines(file)); }
for (const [key, n] of [...by].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(7)}  ${key}`);

// Dominated sets: modules that leave the closure when a set of gate modules is removed.
function behind(label, gates) {
  const cut = new Set(gates.map(g => join(root, g)));
  for (const g of cut) if (!all.has(g)) console.log(`  (note: ${rel(g)} is not in the closure)`);
  const rest = closure([entry], cut);
  const gone = [...all].filter(file => !rest.has(file));
  console.log(`behind ${label}: ${gone.length} modules, ${sum(gone)} lines`);
  return gone;
}
const arg = process.argv.slice(3);
if (arg[0] === "behind") behind(arg[1], arg.slice(2));
if (arg[0] === "from") { const set = closure(arg.slice(1).map(a => join(root, a))); console.log(`closure from ${arg.slice(1).join(", ")}: ${set.size} modules, ${sum(set)} lines`); const b = new Map(); for (const file of set) { const key = rel(file).split("/").slice(0, 3).join("/"); b.set(key, (b.get(key) ?? 0) + lines(file)); } for (const [key, n] of [...b].sort((x, y) => y[1] - x[1]).slice(0, 14)) console.log(`  ${String(n).padStart(7)}  ${key}`); }
if (arg[0] === "importers") { const want = join(root, arg[1]); for (const file of all) if (importsOf(file).has(want)) console.log("  " + rel(file)); }
if (arg[0] === "behinddir") { const cut = [...all].filter(file => arg.slice(2).some(p => rel(file).startsWith(p))); const rest = closure([entry], new Set(cut)); const gone = [...all].filter(file => !rest.has(file)); console.log(`behind ${arg[1]}: ${gone.length} modules, ${sum(gone)} lines (${(100 * sum(gone) / sum(all)).toFixed(1)}% of the closure)`); }
