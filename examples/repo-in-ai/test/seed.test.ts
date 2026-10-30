import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import type { FactRef, ScopeId } from "@generalbusiness/dap-contract";
import { utf8 } from "@generalbusiness/dap-bytes";
import { Reader, snapshotFiles } from "@generalbusiness/dap-git";
import { initialCommitObjects, readmeText, type DestinationCommit } from "@generalbusiness/dap-platform";
import { SEED_LIMITS, SeedRefusal, compareSeedFiles, seedTree, type SeedFile } from "../seed.ts";

// Scripted founding facts and an in-memory Git object store. The builders
// and parsers are real; this is no native room, fresh clone or provider proof.
const scope = `sc_${"g".repeat(51)}a` as ScopeId;
const claim: FactRef = { at: { kind: "register", scope: `sc_${"r".repeat(51)}a`, inc: `in_${"r".repeat(25)}a` }, seq: 7, hash: `sha256:${"1".repeat(64)}` };
const readme = { name: "repo-in-ai-1", handle: "@owner", directory: `sc_${"d".repeat(51)}a` as ScopeId };
const initial = () => initialCommitObjects("sha1", scope, "2026-10-30T12:00:00Z", claim, readme);
const file = (path: string, content = "text\n", mode = "100644"): SeedFile => ({ path, mode, bytes: utf8(content) });
const names = ["app.mjs", "index.html", "model.mjs", "storage.mjs", "styles.css", "test/tasks.test.mjs"];
const sources = (): SeedFile[] => names.map(path => ({ path, mode: "100644", bytes: readFileSync(new URL(`../task-list/${path}`, import.meta.url)) }));

test("the seed preserves generator README bytes and every task-list blob, and full comparison detects missing, extra, changed and mode-changed files", async () => {
  const source = sources(), founding = initial(), seed = seedTree(founding, source);
  const objects = new Map([...founding.objects, ...seed.objects].map(object => [object.id, object]));
  const reader = new Reader({
    async object(id, limit) { const object = objects.get(id); return object ? { type: object.kind, size: object.body.length, data: object.body.length <= limit ? object.body : null } : null; },
    async ref() { return null; },
    async refs() { return []; },
  });
  const paths = await snapshotFiles(reader, seed.tree, () => true);
  const actual: SeedFile[] = [];
  for (const path of paths) actual.push({ path: path.path, mode: path.mode, bytes: await reader.blob(path.id) });
  const expected = [file("README.md", readmeText(readme)), ...source.map(row => ({ ...row, path: `task-list/${row.path}` }))];
  expect(actual.map(row => row.path).sort()).toEqual(expected.map(row => row.path).sort());
  for (const row of expected) expect(actual.find(found => found.path === row.path)).toEqual(row);
  expect(seed.expected).toEqual([...expected].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  expect(compareSeedFiles(seed.expected, [...actual].reverse())).toEqual({ matches: true, missing: [], extra: [], different: [] });
  const replace = (path: string, next: SeedFile) => actual.map(row => row.path === path ? next : row);
  expect(compareSeedFiles(seed.expected, actual.filter(row => row.path !== "README.md"))).toMatchObject({ matches: false, missing: ["README.md"] });
  expect(compareSeedFiles(seed.expected, replace("README.md", file("README.md", "another room\n")))).toMatchObject({ matches: false, different: ["README.md"] });
  expect(compareSeedFiles(seed.expected, replace("task-list/app.mjs", file("task-list/app.mjs", "changed\n")))).toMatchObject({ matches: false, different: ["task-list/app.mjs"] });
  expect(compareSeedFiles(seed.expected, replace("task-list/app.mjs", { ...actual.find(row => row.path === "task-list/app.mjs")!, mode: "100755" }))).toMatchObject({ matches: false, different: ["task-list/app.mjs"] });
  expect(compareSeedFiles(seed.expected, [...actual, file("unrelated.txt")])).toMatchObject({ matches: false, extra: ["unrelated.txt"] });
});

test("seed construction refuses unsafe or duplicate paths, links, non-text, oversized inputs and a different founding closure without partial output", () => {
  const attempt = (files: readonly SeedFile[], founding: DestinationCommit = initial()) => () => seedTree(founding, files);
  const invalid = [
    [file("../escape")], [file("/absolute")], [file("a/.git/config")], [file("a\\b")], [file("a//b")],
    [file("same"), file("same")], [file("folder"), file("folder/file")], [file("link", "target", "120000")],
    [{ path: "binary", mode: "100644", bytes: new Uint8Array([0xff]) }], [file("nul", "a\0b")],
    [file("large", "x".repeat(SEED_LIMITS.fileBytes + 1))], Array.from({ length: SEED_LIMITS.files + 1 }, (_, n) => file(`f${n}`)),
  ];
  for (const files of invalid) expect(attempt(files)).toThrow(SeedRefusal);
  expect(attempt([])).toThrow(SeedRefusal);
  const empty = initialCommitObjects("sha1", scope, "2026-10-30T12:00:00Z", claim);
  const sha256 = initialCommitObjects("sha256", scope, "2026-10-30T12:00:00Z", claim, readme);
  const corrupt = initial();
  const damaged: DestinationCommit = { ...corrupt, objects: corrupt.objects.map((object, n) => n === 0 ? { ...object, body: utf8("changed without its Git ID") } : object) };
  for (const founding of [empty, sha256, damaged]) expect(attempt([file("ok")], founding)).toThrow(SeedRefusal);
  const boundary = Array.from({ length: SEED_LIMITS.files }, (_, n) => file(`file-${n}`, n === 0 ? "x".repeat(SEED_LIMITS.fileBytes) : "ok\n"));
  const seed = seedTree(initial(), boundary);
  expect(seed.expected).toHaveLength(SEED_LIMITS.files + 1);
  expect(seed.expected.find(row => row.path === "task-list/file-0")!.bytes.length).toBe(SEED_LIMITS.fileBytes);
  expect(compareSeedFiles(seed.expected, seed.expected).matches).toBe(true);
});
