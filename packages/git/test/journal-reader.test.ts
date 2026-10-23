import { afterAll, expect, test } from "vitest";
import type { ScopeId } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { buildJournalArchive } from "../src/journal-layout.ts";
import type { JournalFormat } from "../src/journal-objects.ts";
import { readJournalArchive, type JournalReadBudget, type JournalReadRepository } from "../src/journal-reader.ts";
import { journalRef } from "../src/journal-path.ts";
import { archiveObjectSource, archiveRepository, described, rewriteArchiveFile, selectedInput, syntheticJournal, writeArchiveObjects } from "./support/journal.ts";
import { cleanup, git } from "./support/repo.ts";

afterAll(cleanup);
const formats: readonly JournalFormat[] = ["sha1", "sha256"];
function budget(maximum = 16 * 1024 * 1024): JournalReadBudget {
  const native = new ArchiveBudget(); let bytes = 0;
  return Object.assign(native, { bytes: (size: number) => { bytes += size; if (bytes > maximum) native.stop("limit"); }, scope: () => native.spend({ nodes: 1 }) });
}
async function fixture(format: JournalFormat) {
  // Synthetic selected inventory, real A1 encoders and real local Git.
  // This confers no privacy admission or native replay judgment.
  const selected = syntheticJournal(3), dir = archiveRepository(format);
  const built = await buildJournalArchive({ format, ...described(selected), input: selectedInput(selected), parent: null });
  if (!built.ok) throw new Error(JSON.stringify(built));
  writeArchiveObjects(dir, built.archive.objects);
  const ref = journalRef(selected.at.scope);
  git(dir, ["update-ref", ref, built.archive.commit]);
  const calls: { id: string; limit: number }[] = [], source = archiveObjectSource(dir, calls);
  const repository: JournalReadRepository = {
    format: async () => format,
    resolve: async name => name === ref ? git(dir, ["rev-parse", name]) : null,
    object: (id, limit) => source.object(id, limit),
  };
  return { selected, dir, ref, commit: built.archive.commit, repository, calls };
}

/** Mechanical corruption under journal/v1. Git does the object encoding;
 * no filename from an archive becomes a filesystem path. */
function alter(dir: string, commit: string, path: string, mode: string | null, object?: string): string {
  const root = git(dir, ["rev-parse", `${commit}^{tree}`]);
  function changed(tree: string, parts: readonly string[]): string {
    const rows = git(dir, ["ls-tree", tree]).split("\n");
    const previous = rows.find(row => row.split("\t")[1] === parts[0]);
    let next: string | null;
    if (parts.length > 1) {
      if (!previous) throw new Error("fixture directory absent");
      next = `040000 tree ${changed(previous.split(" ")[2]!.split("\t")[0]!, parts.slice(1))}\t${parts[0]}`;
    } else next = mode === null ? null : `${mode} ${mode === "160000" ? "commit" : "blob"} ${object}\t${parts[0]}`;
    const kept = rows.filter(row => row.split("\t")[1] !== parts[0]);
    if (next) kept.push(next);
    return git(dir, ["mktree"], kept.join("\n") + "\n");
  }
  const tree = changed(root, path.split("/"));
  const body = git(dir, ["cat-file", "commit", commit]) + "\n";
  return git(dir, ["hash-object", "-w", "-t", "commit", "--stdin"], body.replace(`tree ${root}\n`, `tree ${tree}\n`));
}

test.each(formats)("reads the canonical %s prefix and names structural corruption without a native report", async format => {
  const f = await fixture(format);
  const read = () => readJournalArchive(f.repository, f.selected.at.scope, budget());
  const good = await read(); expect(good.ok).toBe(true);
  if (!good.ok) return;
  expect(good.archive.entries.map(entry => entry.bytes)).toEqual(f.selected.bodies);
  expect(good.archive.head).toEqual(f.selected.description.through);
  expect(good.archive.name).toBe("platform:register");
  expect(Object.isFrozen(good.archive.entries[0])).toBe(true);
  const head = { v: 1, scope: f.selected.at, through: 2, hash: `sha256:${"0".repeat(64)}` };
  const changed = JSON.parse(f.selected.bodies[0]!); changed.epoch = 1;
  const corruptions = [
    rewriteArchiveFile(f.dir, f.commit, "journal/v1/segments/000000000000.jsonl", [canonicalize(changed), ...f.selected.bodies.slice(1)].join("\n")),
    rewriteArchiveFile(f.dir, f.commit, "journal/v1/segments/000000000000.jsonl", f.selected.bodies.slice(0, -1).join("\n")),
    rewriteArchiveFile(f.dir, f.commit, "journal/v1/head.json", canonicalize(head)),
    alter(f.dir, f.commit, "journal/v1/head.json", null),
  ];
  for (const commit of corruptions) {
    git(f.dir, ["update-ref", f.ref, commit]);
    const result = await read(); expect(result, JSON.stringify(result)).toMatchObject({ ok: false, result: "mismatch", location: { scope: f.selected.at.scope, commit } });
    expect(result).not.toHaveProperty("archive"); expect(result).not.toHaveProperty("report");
  }
  const blob = git(f.dir, ["hash-object", "-w", "--stdin"], "not a commit");
  git(f.dir, ["update-ref", f.ref, blob]);
  expect(await read()).toMatchObject({ ok: false, result: "mismatch" });
});

test.each(formats)("refuses unsafe %s tree forms before reading their targets", async format => {
  const f = await fixture(format), target = git(f.dir, ["hash-object", "-w", "--stdin"], "/outside-fixture/never-open-this-path");
  for (const mode of ["120000", "160000", "100755", "100644"]) {
    const commit = alter(f.dir, f.commit, "journal/v1/unplanned", mode, mode === "160000" ? f.commit : target);
    git(f.dir, ["update-ref", f.ref, commit]); f.calls.length = 0;
    expect(await readJournalArchive(f.repository, f.selected.at.scope, budget())).toMatchObject({ ok: false, result: "refused" });
    expect(f.calls.some(call => call.id === target)).toBe(false);
  }
});

test("absence, read failure, deadline and work limits retain their distinct meanings", async () => {
  const f = await fixture("sha1");
  expect(await readJournalArchive(f.repository, syntheticJournal(1, 4, 9).at.scope, budget())).toMatchObject({ ok: false, result: "not-found" });
  expect(await readJournalArchive(f.repository, f.selected.at.scope, budget(0))).toMatchObject({ ok: false, result: "limit" });
  const timedOut = budget(); timedOut.wait = async () => { throw { reason: "timeout" }; };
  expect(await readJournalArchive(f.repository, f.selected.at.scope, timedOut)).toMatchObject({ ok: false, result: "timeout" });
  expect(await readJournalArchive({ ...f.repository, object: async () => { throw new Error("unavailable"); } }, f.selected.at.scope, budget())).toMatchObject({ ok: false, result: "unavailable" });
  const result = await readJournalArchive({ ...f.repository, object: async () => { throw new Error("private provider failure body"); } }, f.selected.at.scope, budget());
  expect(result).toMatchObject({ ok: false, result: "unavailable" }); expect(JSON.stringify(result)).not.toContain("private provider");
  expect(await readJournalArchive(f.repository, "../not-a-scope" as ScopeId, budget())).toMatchObject({ ok: false, result: "refused" });
});
