import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { checkCitations, excerptHash, REFERENCES } from "./check-section-citations.mjs";

const references = () => new Map([
  [REFERENCES.contract, "# Scope contract\n## 6. Entries\n### 6.1 First\n### 6.2 Next\n### 6.3 Last\n### 17.2a Reserved\n"],
  [REFERENCES.authority, "# Authority note\n## 3. Authority\n### 3.12 Windows\n## 6. Publish\n### 6.9 Another writer\n"],
]);

// Invariant: a citation uses its explicit document, including wrapped names,
// section lists, ranges, suffixes and exact paths. Matching another note's
// section number can never repair a missing section in the named note.
test("named citations bind their own headings and ambiguous references stay listed", () => {
  const files = references();
  files.set("packages/example.ts", `/** Scope\n * contract, sections 6.1 to 6.3 and 17.2a; authority note, section 3.12. */
    // section 6.9 has no document: both notes were named in the introduction.
    /** authority note, section 6.1 */
    /** Plan 031, section 3.12 */
    /** Authority note, sections 3.12, row W6, and 6.9. */
    /** Scope contract, sections 6.1 to 99.2. */`);
  files.set("packages/canonical.ts", "/** Scope contract, section 6.1. */\n\n/** RFC 8785 section 3.2.2.2 makes one an error. */\n");
  files.set("docs/example.md", "The reference is `notes/2026-10-04-scope-and-replay-contract.md`, section 6.2.\n\nSection 3.12 alone has no owner.\n");
  const result = checkCitations(files);
  assert.equal(result.ok, false);
  assert.deepEqual(result.resolved.map(row => [row.document, row.sections]), [
    [REFERENCES.contract, ["6.1", "6.2", "6.3", "17.2a"]],
    [REFERENCES.authority, ["3.12"]],
    [REFERENCES.authority, ["3.12", "6.9"]],
    [REFERENCES.contract, ["6.1"]],
    [REFERENCES.contract, ["6.2"]],
  ]);
  assert.deepEqual(result.broken.map(row => [row.document, row.missing]), [[REFERENCES.authority, ["6.1"]], [REFERENCES.contract, ["99.2"]]]);
  assert.equal(result.ambiguous.length, 4);
  assert.ok(result.ambiguous.some(row => row.file === "packages/example.ts" && row.line === 3));
});

// Invariant: source strings, regular expressions, raw template text, JSX
// text and Markdown examples are not comments or prose citations. A real
// comment inside a template expression still counts.
test("syntax extraction ignores example strings while retaining real comments", () => {
  const files = references();
  files.set("packages/example.tsx", [
    'const s = "// scope contract, section 999";',
    'const r = /\\/\\/ scope contract, section 999/;',
    'const t = `/* authority note, section 999 */ ${1 /* scope contract, section 6.1 */}`;',
    'const view = <div>scope contract, section 999</div>;',
    '// authority note, section 3.12',
  ].join("\n"));
  files.set("docs/example.md", "```ts\n// scope contract, section 999\n```\n\nScope contract, section 6.2.\n");
  files.set("config/example.jsonc", '{"text":"// scope contract, section 999"}\n// scope contract, section 6.3\n');
  const result = checkCitations(files);
  assert.equal(result.ok, true);
  assert.deepEqual(result.resolved.map(row => [row.file, row.line, row.sections]), [
    ["packages/example.tsx", 3, ["6.1"]], ["packages/example.tsx", 5, ["3.12"]], ["docs/example.md", 5, ["6.2"]], ["config/example.jsonc", 2, ["6.3"]],
  ]);
  assert.deepEqual(result.ambiguous, []);
});

// Invariant: dated documents remain inputs, and a nearby path or mention of
// another document cannot silently supply an unqualified citation's owner.
test("historical notes are inventoried without guessing from nearby document names", () => {
  const files = references();
  files.set("notes/dated-design.md", "The authority note describes an observation.\n\nIts section 6.9 is discussed elsewhere.\n\nScope contract, section 6.9.\n");
  files.set("packages/example.ts", "/** Authority note's rules configure these ports. */\n\n/** One reading (section 6.1). */\n");
  const result = checkCitations(files);
  assert.equal(result.ok, false);
  assert.deepEqual(result.broken.map(row => [row.file, row.document, row.missing]), [["notes/dated-design.md", REFERENCES.contract, ["6.9"]]]);
  assert.equal(result.ambiguous.length, 2);
  assert.equal(result.resolved.length, 0);
});

// Invariant: an exact listed finding remains visible, and cannot admit a
// changed, duplicated or stale citation. A list never broadens a document's
// accepted section numbers or exempts another historical file.
test("exact known findings stay unresolved and changed, duplicate or stale rows fail", () => {
  const files = references(), excerpt = "Scope contract, section 6.9.";
  files.set("notes/dated-design.md", excerpt + "\n");
  const findings = [{ file: "notes/dated-design.md", target: REFERENCES.contract, missingSections: ["6.9"], excerpt,
    excerptSha256: excerptHash(excerpt), expectedOccurrences: 1, disposition: "Planner-owned mixed reference; prose unchanged." }];
  const exact = checkCitations(files, findings);
  assert.equal(exact.ok, true); assert.equal(exact.known.length, 1); assert.equal(exact.known[0].status, "known-unresolved");
  assert.equal(exact.resolved.length, 0); assert.equal(exact.broken.length, 0);
  files.set("notes/dated-design.md", excerpt + "\n" + excerpt + "\n");
  const duplicate = checkCitations(files, findings); assert.equal(duplicate.ok, false); assert.match(duplicate.listingErrors[0].reason, /found 2/);
  files.set("notes/dated-design.md", excerpt.replace("6.9", "6.8"));
  const changed = checkCitations(files, findings); assert.equal(changed.ok, false); assert.equal(changed.broken.length, 1);
  files.set("notes/dated-design.md", "Scope contract, section 6.1.\n");
  const stale = checkCitations(files, findings); assert.equal(stale.ok, false); assert.match(stale.listingErrors[0].reason, /found 0/);
});

test("the real command fails when only a named citation is changed to a missing section", () => {
  const root = mkdtempSync(join(tmpdir(), "section-citations-control-"));
  try {
    const files = references();
    files.set("packages/example.ts", "/** Scope contract, section 6.1. */\n");
    for (const [file, source] of files) {
      const path = join(root, file); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, source);
    }
    mkdirSync(join(root, "scripts")); writeFileSync(join(root, "scripts/section-citation-findings.json"), "[]\n");
    execFileSync("git", ["init", "--quiet", root]);
    execFileSync("git", ["add", "."], { cwd: root });
    const script = new URL("./check-section-citations.mjs", import.meta.url).href;
    const command = `import { main } from ${JSON.stringify(script)}; process.exitCode = main([], ${JSON.stringify(root)});`;
    const run = () => spawnSync(process.execPath, ["--input-type=module", "-e", command], { encoding: "utf8" });
    const before = run(); assert.equal(before.status, 0, before.stderr); assert.match(before.stdout, /1 resolved, 0 unresolved, 0 broken/);
    writeFileSync(join(root, "packages/example.ts"), "/** Scope contract, section 6.9. */\n");
    const broken = run(); assert.equal(broken.status, 1, broken.stderr);
    assert.match(broken.stdout, /BROKEN packages\/example\.ts:1: section 6\.9 -> notes\/2026-10-04-scope-and-replay-contract\.md; missing 6\.9/);
    assert.match(broken.stdout, /0 resolved, 0 unresolved, 1 broken/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
