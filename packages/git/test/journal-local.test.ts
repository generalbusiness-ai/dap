import { afterAll, expect, test } from "vitest";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { buildJournalArchive } from "../src/journal-layout.ts";
import { localJournalRepository } from "../src/journal-local.ts";
import { readJournalArchive, type JournalReadBudget } from "../src/journal-reader.ts";
import { journalRef } from "../src/journal-path.ts";
import { archiveRepository, described, selectedInput, syntheticJournal, writeArchiveObjects } from "./support/journal.ts";
import { cleanup, git, scratch } from "./support/repo.ts";

afterAll(cleanup);
function budget(milliseconds = 30_000): JournalReadBudget {
  const until = Date.now() + milliseconds, native = new ArchiveBudget(); let bytes = 0;
  return Object.assign(native, {
    bytes: (size: number) => { bytes += size; if (bytes > 16 * 1024 * 1024) native.stop("limit"); },
    scope: () => native.spend({ nodes: 1 }), remainingMilliseconds: () => until - Date.now(),
  });
}
function program(dir: string, code: string): string {
  const path = join(dir, "fixture-git.mjs"); writeFileSync(path, `#!/usr/bin/env node\n${code}\n`, { mode: 0o755 }); return path;
}

test.each(["sha1", "sha256"] as const)("the actual local %s port reads objects and refs with the A1 reader", async format => {
  const selected = syntheticJournal(3), dir = archiveRepository(format);
  const built = await buildJournalArchive({ format, ...described(selected), input: selectedInput(selected), parent: null });
  if (!built.ok) throw new Error(JSON.stringify(built));
  writeArchiveObjects(dir, built.archive.objects); git(dir, ["update-ref", journalRef(selected.at.scope), built.archive.commit]);
  const repository = localJournalRepository(dir), allowance = budget();
  const result = await readJournalArchive(repository, selected.at.scope, allowance);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (result.ok) expect(result.archive.entries.map(entry => entry.bytes)).toEqual(selected.bodies);
  expect(await repository.resolve(journalRef(syntheticJournal(1, 8, 8).at.scope), allowance)).toBeNull();
  const object = built.archive.objects.find(object => object.type === "blob" && object.data.length > 1)!;
  expect(await repository.object(object.id, 1, allowance)).toMatchObject({ size: object.data.length, data: null });
  const empty = git(dir, ["hash-object", "-w", "--stdin"], "");
  expect(await repository.object(empty, 0, allowance)).toMatchObject({ type: "blob", size: 0, data: new Uint8Array() });
});

test.skipIf(process.platform === "win32")("the process sees only explicit hardening/environment and fixed validated arguments", async () => {
  const dir = scratch(), capture = join(dir, "process.json");
  const executable = program(dir, `import {writeFileSync} from 'node:fs';writeFileSync(${JSON.stringify(capture)},JSON.stringify({args:process.argv.slice(2),keys:Object.keys(process.env).sort(),cwd:process.cwd()}));process.stdout.write('sha1\\n');`);
  const repository = localJournalRepository(dir, { program: executable });
  expect(await repository.format(budget())).toBe("sha1");
  const recorded = readFileSync(capture, "utf8"), data = JSON.parse(recorded);
  expect(data.cwd).toBe(realpathSync(dir));
  expect(data.args.slice(-2)).toEqual(["rev-parse", "--show-object-format"]);
  for (const value of ["--no-pager", "core.hooksPath=/dev/null", "core.fsmonitor=false", "credential.helper=", "http.followRedirects=false", "protocol.https.allow=never"]) expect(data.args).toContain(value);
  const keys = ["PATH", "GIT_CONFIG_NOSYSTEM", "GIT_CONFIG_GLOBAL", "GIT_ATTR_NOSYSTEM", "GIT_NO_REPLACE_OBJECTS", "GIT_NO_LAZY_FETCH", "GIT_TERMINAL_PROMPT", "GIT_ASKPASS", "GIT_PAGER", "GIT_OPTIONAL_LOCKS", "HOME", "LC_ALL"];
  // This Mac adds its runtime text-encoding key to the observed child.
  // Keep an exact platform-specific set, not an exemption for arbitrary inherited keys.
  if (process.platform === "darwin") keys.push("__CF_USER_TEXT_ENCODING");
  expect(data.keys).toEqual(keys.sort());
  await expect(repository.resolve("refs/heads/main", budget())).rejects.toMatchObject({ reason: "bad-ref-name" });
  await expect(repository.object("../../not-an-object", 1, budget())).rejects.toMatchObject({ reason: "object-id" });
  expect(readFileSync(capture, "utf8")).toBe(recorded);
});

test.skipIf(process.platform === "win32")("metadata overflow is bounded and a deadline returns only after its owned child exits", async () => {
  const noisy = scratch(), noise = program(noisy, "process.stdout.write('x'.repeat(65536));");
  await expect(localJournalRepository(noisy, { program: noise }).format(budget())).rejects.toMatchObject({ reason: "limit" });
  const dir = scratch(), pidFile = join(dir, "pid");
  // One Node child, no descendants. Its own late exit bounds cleanup if
  // the port's deadline regresses; exit 44 cannot satisfy timeout below.
  const slow = program(dir, `import {writeFileSync} from 'node:fs';writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setTimeout(()=>process.exit(44),10000);setInterval(()=>{},100);`);
  await expect(localJournalRepository(dir, { program: slow }).format(budget(1500))).rejects.toMatchObject({ reason: "timeout" });
  expect(existsSync(pidFile)).toBe(true);
  const pid = Number(readFileSync(pidFile, "utf8"));
  expect(Number.isSafeInteger(pid) && pid > 0).toBe(true);
  expect(() => process.kill(pid, 0)).toThrow();
});
