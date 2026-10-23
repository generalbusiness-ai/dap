/** Real Git corruption fixtures. Entries/selections and the foreign source
 * are synthetic; this witnesses the clone reader, not export admission. */
import { afterAll, expect, test } from "vitest";
import type { Entry } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, parseStrict, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { archiveSource, verifyArchive } from "../src/index.ts";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { buildJournalPass } from "../../git/src/journal-v2-layout.ts";
import { readJournalRepositoryArchive } from "../../git/src/journal-reader.ts";
import { journalKeyName } from "../../git/src/journal-selection.ts";
import { journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath, readJournalV2Path } from "../../git/src/journal-v2-path.ts";
import { archiveObjectSource, archiveRepository, selectedInput, syntheticJournal, writeArchiveObjects } from "../../git/test/support/journal.ts";
import { cleanup, git } from "../../git/test/support/repo.ts";

afterAll(cleanup);
// Invariant: the shared path parser binds the numeric pairs and every
// segment to the named pass before a writer can register the path.
test("shared pass paths reject misplaced pairs and noncanonical names", () => {
  const path = "journal/v2/passes/00/00/00/00/37/000000003700/000000003701.jsonl";
  expect(readJournalV2Path(path)).toEqual({ kind: "segment", pass: 3700, first: 3701 });
  for (const malformed of [path.replace("/37/", "/38/"), path.replace("/passes/00/", "/passes/0/"),
    path.replace("3701.jsonl", "3699.jsonl"), path.replace("3701.jsonl", "3701.json"),
    path.replace("000000003700/", "00000000370/"), path.replace("/passes/", "/segments/")]) {
    expect(readJournalV2Path(malformed), malformed).toBeNull();
  }
});

test("v2 refuses gaps, overlaps, unlisted retained files, invalid pass references, missing source basis, wrong directories, overflow and broken chains", async () => {
  const fixture = syntheticJournal(3), foreign = syntheticJournal(1, 2, 2), copied = foreign.bodies[0]!;
  const content = digestBytes(utf8(copied)), copyKey = { kind: "entry" as const, digest: content };
  fixture.retained.set(journalKeyName(copyKey), copied);
  for (let seq = 0; seq < fixture.bodies.length; seq++) {
    const entry = parseStrict(fixture.bodies[seq]!) as Entry;
    entry.prev = seq === 0 ? null : fixture.description.entries[seq - 1]!.hash;
    if (seq === 1) entry.uses = [{ fact: { at: foreign.at, seq: 0, hash: foreign.description.entries[0]!.hash }, content }];
    const bytes = canonicalize(entry), hash = entryHash(entry);
    fixture.bodies[seq] = bytes; fixture.description.entries[seq] = { seq, hash, bytes: utf8(bytes).length };
  }
  const directory = archiveRepository("sha1");
  let previous: { commit: string; through: { seq: number; hash: ReturnType<typeof entryHash> } } | null = null;
  for (const [first, last] of [[0, 0], [1, 2]] as const) {
    const origin = { at: { at: fixture.at, seq: first, hash: fixture.description.entries[first]!.hash }, input: first === 0 ? "genesis" : "outcome" };
    const object = fixture.description.objects[first]!;
    const objects = [{ ...object, pass: first, consumers: [{ mode: "required", origin, consumer: "rule-input", purpose: "replay-required", key: object.key }] },
      ...(first === 1 ? [{ key: fixture.description.objects[0]!.key, pass: 0, bytes: fixture.description.objects[0]!.bytes,
        consumers: [{ mode: "required", origin, consumer: "rule-input", purpose: "replay-required", key: fixture.description.objects[0]!.key }] },
      { key: copyKey, pass: first, bytes: utf8(copied).length, foreign: { fact: { at: foreign.at, seq: 0, hash: foreign.description.entries[0]!.hash }, pin: "platform:register@1" },
        consumers: [{ mode: "required", origin, consumer: "foreign-use", purpose: "replay-required", key: copyKey }] }] : [])];
    const entries = fixture.description.entries.slice(first, last + 1), budget = new ArchiveBudget({}, () => 0);
    budget.spend({ entries: entries.length, attempts: objects.length });
    const built = await buildJournalPass({ format: "sha1", parent: previous ? { id: previous.commit, source: archiveObjectSource(directory) } : null,
      input: selectedInput(fixture), budget, selection: canonicalize({ format: "artroom-local-inventory-2", at: fixture.at,
        after: previous?.through ?? null, through: { seq: last, hash: entries.at(-1)!.hash }, entries, objects, omittedTexts: [], ancestryUnwalked: [],
        replay: "unchecked", retention: "observed-local", cost: budget.admitted(),
        ...(first === 1 ? { foreignSources: [{ at: foreign.at, pin: "platform:register@1" }] } : {}),
      }) });
    expect(built.ok, JSON.stringify(built)).toBe(true); if (!built.ok) return;
    writeArchiveObjects(directory, built.archive.objects); previous = { commit: built.archive.commit, through: built.archive.manifest.through };
  }
  const original = previous!.commit, objects = archiveObjectSource(directory);
  const read = (commit: string) => verifyArchive(archiveSource({ open: (scope, work) => readJournalRepositoryArchive({
    format: async () => "sha1", resolve: async () => commit, object: (id, limit) => objects.object(id, limit),
  }, scope, work) }), { mode: "integrity", scope: fixture.at.scope });
  const good = await read(original);
  expect(good.kind === "verification" ? good.verification.report.result : good).toBe("consistent");
  const file = (path: string) => git(directory, ["show", `${original}:${path}`]);
  const pass0 = JSON.parse(file(journalV2PassPath(0))), pass1 = JSON.parse(file(journalV2PassPath(1)));
  const change = (edits: readonly (readonly [string, string | null])[]): string => {
    function alter(tree: string | null, changes: readonly { parts: readonly string[]; bytes: string | null }[]): string | null {
      const rows = new Map((tree ? git(directory, ["ls-tree", tree]).split("\n").filter(Boolean) : []).map(line => [line.split("\t")[1]!, line]));
      const groups = new Map<string, { parts: readonly string[]; bytes: string | null }[]>();
      for (const item of changes) {
        const name = item.parts[0]!, group = groups.get(name) ?? [];
        group.push({ parts: item.parts.slice(1), bytes: item.bytes }); groups.set(name, group);
      }
      for (const [name, group] of groups) {
        if (group[0]!.parts.length === 0) {
          const bytes = group[0]!.bytes;
          if (bytes === null) rows.delete(name);
          else rows.set(name, `100644 blob ${git(directory, ["hash-object", "-w", "--stdin"], bytes)}\t${name}`);
        } else {
          const old = rows.get(name)?.split("\t")[0]!.split(" ")[2] ?? null;
          const child = alter(old, group);
          if (child === null) rows.delete(name); else rows.set(name, `040000 tree ${child}\t${name}`);
        }
      }
      return rows.size ? git(directory, ["mktree"], [...rows.values()].join("\n") + "\n") : null;
    }
    const root = git(directory, ["rev-parse", `${original}^{tree}`]);
    const tree = alter(root, edits.map(([path, bytes]) => ({ parts: path.split("/"), bytes })));
    expect(tree).not.toBeNull();
    const raw = git(directory, ["cat-file", "commit", original]) + "\n";
    return git(directory, ["hash-object", "-w", "-t", "commit", "--stdin"], raw.replace(/^tree [0-9a-f]+\n/, `tree ${tree}\n`));
  };
  const cases: { label: string; edits: readonly (readonly [string, string | null])[] }[] = [];
  const gap = structuredClone(pass1); gap.entries[0] = 2;
  cases.push({ label: "gap", edits: [[journalV2PassPath(1), null], [journalV2PassPath(2), canonicalize(gap)]] });
  const overlap = structuredClone(pass0); overlap.entries[1] = 1; overlap.through = { seq: 1, hash: fixture.description.entries[1]!.hash };
  cases.push({ label: "overlap", edits: [[journalV2PassPath(0), canonicalize(overlap)]] });
  cases.push({ label: "unlisted retained file", edits: [[journalV2RetainedPath(1, { kind: "rule", digest: digestBytes(utf8("{}")) }), "{}"]] });
  const future = structuredClone(pass0); future.retained[0].pass = 1;
  cases.push({ label: "future retained pass", edits: [[journalV2PassPath(0), canonicalize(future)]] });
  const wrong = structuredClone(pass1); wrong.retained.find((key: { pass: number }) => key.pass === 0).pass = 1;
  cases.push({ label: "retained file absent from named pass", edits: [[journalV2PassPath(1), canonicalize(wrong)]] });
  const noBasis = structuredClone(pass1); delete noBasis.foreignSources;
  cases.push({ label: "copy without its pass basis", edits: [[journalV2PassPath(1), canonicalize(noBasis)]] });
  const segment = journalV2SegmentPath(1);
  cases.push({ label: "wrong pair directories", edits: [[segment, null], [segment.replace("/00/00/00/00/00/", "/00/00/00/00/01/"), file(segment)]] });
  cases.push({ label: "numeric directory is not two digits", edits: [[segment, null], [segment.replace("/passes/00/", "/passes/0/"), file(segment)]] });
  cases.push({ label: "unknown name in pass directory", edits: [[segment.replace(/[^/]+$/, "unexpected.json"), "{}"]] });
  cases.push({ label: "segment stored in a different pass", edits: [[segment, null], [journalV2SegmentPath(0, 1), file(segment)]] });
  cases.push({ label: "segment first is outside its pass interval", edits: [[segment, null], [journalV2SegmentPath(1, 3), file(segment)]] });
  const high = JSON.parse(file("journal/v2/head.json")); high.through = 1_000_000_000_000;
  cases.push({ label: "position overflow", edits: [["journal/v2/head.json", canonicalize(high)]] });
  cases.push({ label: "malformed entry JSON is a mismatch", edits: [[segment, '{"v":']] });
  const broken = [1, 2].map(seq => parseStrict(fixture.bodies[seq]!) as Entry);
  broken[0]!.prev = textDigest("TEST wrong previous pass hash"); broken[1]!.prev = entryHash(broken[0]!);
  const lastHash = entryHash(broken[1]!), brokenPass = structuredClone(pass1), brokenHead = JSON.parse(file("journal/v2/head.json"));
  brokenPass.through.hash = lastHash; brokenHead.hash = lastHash;
  cases.push({ label: "broken chain between passes", edits: [[segment, broken.map(canonicalize).join("\n")], [journalV2PassPath(1), canonicalize(brokenPass)], ["journal/v2/head.json", canonicalize(brokenHead)]] });
  for (const variant of cases) {
    const result = await read(change(variant.edits));
    expect(result.kind, variant.label).toBe("archive-failure");
    if (result.kind === "archive-failure") expect(["mismatch", "refused"], variant.label).toContain(result.result);
    expect(result, variant.label).not.toHaveProperty("verification");
  }
}, 30_000);
