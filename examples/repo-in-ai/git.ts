/** Local source and Git plumbing only. Setup owns clone, tokens and sends. */
import { execFile } from "node:child_process";
import { closeSync, constants, fstatSync, lstatSync, openSync, opendirSync, readSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { GitProgram, Reader, idOf, isObjectId, repositorySource, snapshotFiles, type Exec, type ExecResult } from "@generalbusiness/dap-git";
import type { DestinationObject } from "@generalbusiness/dap-platform";
import { SEED_LIMITS, compareSeedFiles, taskListFiles, type SeedComparison, type SeedFile, type SeedTree } from "./seed.ts";

export const TASK_LIST_PATHS = ["app.mjs", "index.html", "model.mjs", "storage.mjs", "styles.css", "test/tasks.test.mjs"] as const;
export const SEED_GIT_LIMITS = { commandMilliseconds: 8_000, operationMilliseconds: 30_000, commands: 256, streamBytes: 128 * 1024, bytes: 16 * 1024 * 1024, objects: 256 } as const;
export interface SeedGitOptions { readonly exec?: Exec }
export interface SeedCandidate extends SeedTree { readonly commit: string }
export class SeedGitFailure extends Error {
  constructor(readonly reason: "path" | "source" | "limit" | "git" | "head" | "objects" | "candidate") { super(`Repo-in-ai local Git refused: ${reason}`); }
}
const require = (value: unknown, reason: SeedGitFailure["reason"]): void => { if (!value) throw new SeedGitFailure(reason); };
const utf8 = new TextEncoder();
const strict = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function localDirectory(path: string): string {
  try {
    require(isAbsolute(path) && resolve(path) === path && !/[\u0000-\u001f\u007f]/.test(path), "path");
    for (let at = path;; at = dirname(at)) {
      const st = lstatSync(at); require(st.isDirectory() && !st.isSymbolicLink(), "path");
      if (at === dirname(at)) break;
    }
    return path;
  } catch { throw new SeedGitFailure("path"); }
}

function names(path: string, limit: number): string[] {
  const dir = opendirSync(path), found: string[] = [];
  try {
    for (;;) { const entry = dir.readSync(); if (entry === null) break; require(found.length < limit, "source"); found.push(entry.name); }
  } finally { dir.closeSync(); }
  return found.sort();
}

/** Read the six committed example source paths. Never follow a source link
 * or accept an unlisted file; the shared pure validator checks their text. */
export function loadTaskList(root: string): readonly SeedFile[] {
  try {
    localDirectory(root); localDirectory(join(root, "test"));
    require(JSON.stringify(names(root, 6)) === JSON.stringify(["app.mjs", "index.html", "model.mjs", "storage.mjs", "styles.css", "test"]), "source");
    require(JSON.stringify(names(join(root, "test"), 1)) === JSON.stringify(["tasks.test.mjs"]), "source");
    const files: SeedFile[] = [];
    for (const path of TASK_LIST_PATHS) {
      const full = join(root, path), before = lstatSync(full);
      require(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && (before.mode & 0o111) === 0 && before.size <= SEED_LIMITS.fileBytes, "source");
      const fd = openSync(full, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const opened = fstatSync(fd);
        require(opened.isFile() && opened.dev === before.dev && opened.ino === before.ino && opened.size === before.size && opened.mode === before.mode, "source");
        const bytes = new Uint8Array(opened.size + 1); let total = 0;
        while (total < bytes.length) { const got = readSync(fd, bytes, total, bytes.length - total, total); if (got === 0) break; total += got; }
        const after = fstatSync(fd), named = lstatSync(full);
        require(total === opened.size && after.size === opened.size && after.mtimeMs === opened.mtimeMs && after.ctimeMs === opened.ctimeMs
          && after.mode === opened.mode && named.dev === opened.dev && named.ino === opened.ino && !named.isSymbolicLink(), "source");
        files.push({ path, mode: "100644", bytes: bytes.slice(0, total) });
      } finally { closeSync(fd); }
    }
    localDirectory(root); localDirectory(join(root, "test"));
    return taskListFiles(files);
  } catch (error) { if (error instanceof SeedGitFailure) throw error; throw new SeedGitFailure("source"); }
}

// GitProgram owns maintained config/transport hardening. Its generic Node
// Exec allows 1 GiB; this adapter instead caps each local stream at 128 KiB.
const boundedExec: Exec = (argv, options) => new Promise((resolve, reject) => {
  const child = execFile(argv[0]!, [...argv.slice(1)], { env: { ...options.env, PATH: process.env["PATH"] ?? "/usr/bin:/bin" },
    timeout: options.timeoutMs, killSignal: "SIGKILL", maxBuffer: SEED_GIT_LIMITS.streamBytes, encoding: "buffer" }, (error, stdout, stderr) => {
    if (error?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") { reject(new SeedGitFailure("limit")); return; }
    resolve({ code: error === null ? 0 : typeof error.code === "number" ? error.code : -1, stdout: new Uint8Array(stdout), stderr: new Uint8Array(stderr), timedOut: error?.killed === true });
  });
  child.stdin?.on("error", () => undefined); child.stdin?.end(options.stdin === undefined ? undefined : Buffer.from(options.stdin));
});

function localGit(options: SeedGitOptions): GitProgram {
  const started = performance.now(); let commands = 0, bytes = 0;
  const exec: Exec = async (argv, settings) => {
    const remaining = Math.floor(SEED_GIT_LIMITS.operationMilliseconds - (performance.now() - started));
    require(remaining > 0 && ++commands <= SEED_GIT_LIMITS.commands, "limit");
    bytes += settings.stdin?.length ?? 0; require(bytes <= SEED_GIT_LIMITS.bytes, "limit");
    let result: ExecResult;
    try { result = await (options.exec ?? boundedExec)(argv, { ...settings, timeoutMs: Math.min(settings.timeoutMs, remaining) }); }
    catch (error) { if (error instanceof SeedGitFailure) throw error; throw new SeedGitFailure("git"); }
    bytes += result.stdout.length + result.stderr.length;
    require(result.stdout.length <= SEED_GIT_LIMITS.streamBytes && result.stderr.length <= SEED_GIT_LIMITS.streamBytes && bytes <= SEED_GIT_LIMITS.bytes
      && performance.now() - started <= SEED_GIT_LIMITS.operationMilliseconds, "limit");
    return result;
  };
  return new GitProgram({ exec, timeoutMs: SEED_GIT_LIMITS.commandMilliseconds, env: {
    GIT_AUTHOR_NAME: "Repo-in-ai seed", GIT_AUTHOR_EMAIL: "seed@artroom.invalid", GIT_AUTHOR_DATE: "2000-01-01T00:00:00Z",
    GIT_COMMITTER_NAME: "Repo-in-ai seed", GIT_COMMITTER_EMAIL: "seed@artroom.invalid", GIT_COMMITTER_DATE: "2000-01-01T00:00:00Z",
    GIT_OPTIONAL_LOCKS: "0",
  } });
}

const at = (directory: string): string[] => ["-c", "commit.gpgsign=false", "-c", "protocol.https.allow=never", "-c", "protocol.allow=never", "-C", directory];
const bounds = { commitBytes: 65536, treeBytes: 131072, blobBytes: SEED_LIMITS.fileBytes, parents: 2, closureObjects: 256, refs: 4 };

/** Write local loose objects and one candidate commit. No ref, index,
 * working file or remote changes. A refusal may leave loose objects. */
export async function buildSeedCandidate(directory: string, seed: SeedTree, options: SeedGitOptions = {}): Promise<SeedCandidate> {
  localDirectory(directory); require(isObjectId(seed.base) && isObjectId(seed.tree) && seed.objects.length <= SEED_GIT_LIMITS.objects, "objects");
  const objects = seed.objects.map(object => ({ ...object, body: object.body.slice() }));
  for (const object of objects) require(["blob", "tree"].includes(object.kind) && object.body.length <= SEED_GIT_LIMITS.streamBytes && idOf(object.kind, object.body) === object.id, "objects");
  const git = localGit(options), reader = new Reader(repositorySource(git, directory), bounds);
  await reader.commit(seed.base);
  for (const object of objects) {
    const result = await git.ok("seed-object", [...at(directory), "hash-object", "-w", "-t", object.kind, "--stdin"], object.body);
    require(result === `${object.id}\n`, "objects");
  }
  const result = await git.ok("seed-commit", [...at(directory), "commit-tree", seed.tree, "-p", seed.base], utf8.encode("Seed repo-in-ai task list.\n"));
  require(/^[a-f0-9]{40}\n$/.test(result), "candidate"); const commit = result.slice(0, -1);
  const actual = await reader.commit(commit);
  require(actual.tree === seed.tree && actual.parents.length === 1 && actual.parents[0] === seed.base, "candidate");
  const made: DestinationObject = { kind: "commit", id: commit, body: await reader.object(commit, "commit") };
  return { base: seed.base, tree: seed.tree, commit, objects: [...objects, made], expected: seed.expected.map(file => ({ ...file, bytes: file.bytes.slice() })) };
}

/** Read every immutable Git blob at the explicit fresh clone HEAD. The
 * caller owns clone freshness; dirty working files are not Git blob bytes. */
export async function collectCloneFiles(directory: string, commit: string, options: SeedGitOptions = {}): Promise<readonly SeedFile[]> {
  localDirectory(directory); localDirectory(join(directory, ".git")); require(isObjectId(commit), "head");
  const git = localGit(options), args = at(directory);
  const head = () => git.ok("clone-head", [...args, "rev-parse", "--verify", "--end-of-options", "HEAD^{commit}"]);
  require(await head() === `${commit}\n`, "head");
  const reader = new Reader(repositorySource(git, directory), bounds), point = await reader.commit(commit);
  const listed = await snapshotFiles(reader, point.tree, () => true, { files: SEED_LIMITS.files + 1, trees: 128, pathBytes: SEED_LIMITS.pathBytes, depth: 16 });
  const files: SeedFile[] = [];
  for (const file of listed) files.push({ path: file.path, mode: file.mode, bytes: await reader.blob(file.id) });
  require(await head() === `${commit}\n`, "head");
  return files;
}

export async function compareClone(directory: string, commit: string, expected: readonly SeedFile[], options: SeedGitOptions = {}): Promise<SeedComparison> {
  return compareSeedFiles(expected, await collectCloneFiles(directory, commit, options));
}
