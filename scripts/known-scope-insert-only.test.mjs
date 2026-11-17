/** AR-8: the ScopeIndex adapter caches positive has() answers per isolate
 * (packages/scope/src/scope-index.ts). That is safe only while known_scope
 * rows are insert-only. This check fails when any source deletes, updates,
 * replaces or drops known_scope rows. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ROOTS = ["packages", "apps", "scripts", "examples"];
const SKIP = new Set([
  "node_modules",
  "dist",
  ".wrangler",
  "test",
  "tests",
  "fixtures",
]);

/** True when the text changes or removes known_scope rows. */
export function mutatesKnownScope(text) {
  return (
    /\b(?:DELETE\s+FROM|UPDATE|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|REPLACE\s+INTO|INSERT\s+OR\s+REPLACE\s+INTO|ALTER\s+TABLE)\s+["`]?known_scope\b/i.test(
      text,
    ) ||
    /\bknown_scope\b[^;\n]*\bON\s+CONFLICT\b[^;\n]*\bDO\s+UPDATE\b/i.test(text)
  );
}

async function* sources(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (
      /\.(?:ts|mts|mjs|js|sql)$/.test(entry.name) &&
      !/\.test\.[a-z]+$/.test(entry.name)
    )
      yield path;
  }
}

test("the matcher names each known_scope row change", () => {
  for (const text of [
    "DELETE FROM known_scope WHERE scope = ?",
    "update known_scope set kind = ?",
    "DROP TABLE IF EXISTS known_scope",
    "INSERT OR REPLACE INTO known_scope(scope) VALUES(?)",
    "INSERT INTO known_scope(scope) VALUES(?) ON CONFLICT(scope) DO UPDATE SET kind = excluded.kind",
  ])
    assert.equal(mutatesKnownScope(text), true, text);
  for (const text of [
    "INSERT INTO known_scope(scope,genesis,kind) VALUES(?,?,?) ON CONFLICT(scope) DO NOTHING",
    "SELECT genesis,kind FROM known_scope WHERE scope = ?",
    "CREATE TABLE IF NOT EXISTS known_scope (scope TEXT PRIMARY KEY)",
  ])
    assert.equal(mutatesKnownScope(text), false, text);
});

test("no source changes or removes known_scope rows", async () => {
  const found = [];
  for (const root of ROOTS)
    for await (const path of sources(join(ROOT, root)))
      if (mutatesKnownScope(await readFile(path, "utf8")))
        found.push(relative(ROOT, path));
  assert.deepEqual(
    found,
    [],
    "a known_scope delete or update path must also clear the AR-8 has() cache in scope-index.ts",
  );
});
