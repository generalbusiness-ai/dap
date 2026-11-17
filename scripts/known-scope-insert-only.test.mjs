/** AR-8: the ScopeIndex adapter caches positive has() answers per isolate
 * (packages/scope/src/scope-index.ts). That is safe only while known_scope
 * rows are insert-only. This check fails when any source deletes, updates,
 * replaces or drops known_scope rows. AR-9 adds two guards that SQL text
 * does not show: storage deletes in the ScopeIndex class, and a wrangler
 * migration that deletes, renames or transfers the ScopeIndex class. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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

const INDEX_SOURCE = "packages/scope/src/worker.ts";
const INDEX_CLASS = "ScopeIndex";

/** AR-9: the ScopeIndex class body, from its declaration to the first
 * closing brace in column one. Null when the class is missing. */
export function indexClassBody(text) {
  const start = text.search(/^export class ScopeIndex extends\b/m);
  if (start < 0) return null;
  const end = text.slice(start).search(/^\}/m);
  return end < 0 ? null : text.slice(start, start + end + 1);
}

/** AR-9: true when the text deletes Durable Object storage keys or all
 * storage. deleteAlarm() is not a delete of stored rows. */
export function deletesStorage(text) {
  return /\bstorage\s*\.\s*(?:deleteAll|delete)\s*\(/.test(text);
}

/** AR-9: wrangler configuration text without comments or trailing commas. */
export function parseWranglerJsonc(text) {
  let out = "",
    inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === "\\") out += text[++i] ?? "";
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2);
      if (i < 0) throw Error("unclosed comment");
      i++;
    } else out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

/** AR-9: each migration step, at the top level or under any env, that
 * deletes, renames or transfers away the ScopeIndex class. */
export function indexMigrationRemovals(config) {
  const found = [];
  const steps = [];
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value === null || typeof value !== "object") return;
    for (const [key, inner] of Object.entries(value)) {
      if (key === "migrations" && Array.isArray(inner)) steps.push(...inner);
      walk(inner);
    }
  };
  walk(config);
  for (const step of steps) {
    if (step === null || typeof step !== "object") continue;
    if ((step.deleted_classes ?? []).includes(INDEX_CLASS))
      found.push(`${step.tag}: deleted_classes`);
    for (const form of ["renamed_classes", "transferred_classes"])
      if ((step[form] ?? []).some((row) => row?.from === INDEX_CLASS))
        found.push(`${step.tag}: ${form}`);
  }
  return found;
}

test("AR-9: the storage matcher names deleteAll and delete, and not deleteAlarm", () => {
  for (const text of [
    "await this.ctx.storage.deleteAll();",
    "this.ctx.storage.delete(key)",
    "storage . delete ( keys )",
  ])
    assert.equal(deletesStorage(text), true, text);
  for (const text of [
    "await this.ctx.storage.deleteAlarm();",
    "this.ctx.storage.sql.exec(query)",
    "storage.deleted",
  ])
    assert.equal(deletesStorage(text), false, text);
});

test("AR-9: the ScopeIndex class deletes no storage", async () => {
  const body = indexClassBody(await readFile(join(ROOT, INDEX_SOURCE), "utf8"));
  assert.ok(body, `${INDEX_SOURCE} declares no ${INDEX_CLASS} class`);
  assert.match(
    body,
    /this\.ctx\.storage\.sql/,
    "the class body ends before its storage use",
  );
  assert.equal(
    deletesStorage(body),
    false,
    "a ScopeIndex storage delete must also clear the AR-8 has() cache in scope-index.ts",
  );
  const red = body.replace(
    /\n\}$/,
    "\n  async wipe() { await this.ctx.storage.deleteAll(); }\n}",
  );
  assert.equal(
    deletesStorage(indexClassBody(red)),
    true,
    "a deleteAll() added to the class is found",
  );
});

test("AR-9: the migration matcher names deleted, renamed and transferred ScopeIndex classes", () => {
  const config = parseWranglerJsonc(`{
    // comment with "quotes" and a /* marker
    "migrations": [
      { "tag": "v1", "new_sqlite_classes": ["ScopeIndex"] },
      { "tag": "v2", "deleted_classes": ["ScopeIndex"] }, /* block */
    ],
    "env": { "x": { "migrations": [
      { "tag": "v3", "renamed_classes": [{ "from": "ScopeIndex", "to": "Index2" }] },
      { "tag": "v4", "transferred_classes": [{ "from": "ScopeIndex", "from_script": "a", "to": "B" }] },
      { "tag": "v5", "deleted_classes": ["Other"], "renamed_classes": [{ "from": "Other", "to": "ScopeIndex" }] },
    ] } },
    "url": "https://example.com/a//b",
  }`);
  assert.deepEqual(indexMigrationRemovals(config), [
    "v2: deleted_classes",
    "v3: renamed_classes",
    "v4: transferred_classes",
  ]);
});

test("AR-9: no tracked wrangler configuration deletes, renames or transfers ScopeIndex", async () => {
  const files = execFileSync(
    "git",
    [
      "ls-files",
      "--",
      "*wrangler*.json",
      "*wrangler*.jsonc",
      "*wrangler*.toml",
    ],
    { cwd: ROOT, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
  assert.ok(
    files.some((file) => file === "apps/room/wrangler.grow.jsonc"),
    "the tracked wrangler list is empty or moved",
  );
  const found = [];
  for (const file of files) {
    assert.ok(
      !file.endsWith(".toml"),
      `${file}: a TOML wrangler configuration needs a parser in this check`,
    );
    const text = await readFile(join(ROOT, file), "utf8");
    for (const row of indexMigrationRemovals(parseWranglerJsonc(text)))
      found.push(`${file} ${row}`);
  }
  assert.deepEqual(
    found,
    [],
    "a ScopeIndex class removal empties the index while isolates keep AR-8 has() answers",
  );
});
