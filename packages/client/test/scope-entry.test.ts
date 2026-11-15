/**
 * The root entry of the package does not import the `scope` entry, so a
 * page that uses only the root entry does not load the fold and the judges
 * (client note, section 11). The check follows each relative static import
 * from `src/index.ts`, and fails when it reaches a module of the `scope`
 * entry.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const src = join(dirname(fileURLToPath(import.meta.url)), "../src");
const SCOPE_MODULES = ["scope.ts", "replica.ts", "replica-own.ts", "replica-judged.ts"];

/** Each module that a module reaches by relative static imports and re-exports, with the module itself. */
function reached(entry: string): Set<string> {
  const seen = new Set<string>();
  const visit = (path: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(/(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s*["'](\.[^"']+)["']|(?:^|\n)\s*import\s*["'](\.[^"']+)["']/g)) {
      visit(join(dirname(path), match[1] ?? match[2]!));
    }
  };
  visit(join(src, entry));
  return seen;
}

test("the root entry reaches no module of the scope entry, and the scope entry reaches each of them", () => {
  const root = [...reached("index.ts")].map((path) => path.slice(src.length + 1));
  expect(root.length).toBeGreaterThan(20);
  expect(root.filter((path) => SCOPE_MODULES.includes(path))).toEqual([]);
  const scope = [...reached("scope.ts")].map((path) => path.slice(src.length + 1));
  expect(SCOPE_MODULES.every((path) => scope.includes(path))).toBe(true);
});
