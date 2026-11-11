/** Source-only Node composition, excluded from the public portable package. */
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { mkdtemp, open, realpath, rmdir } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CitationSource } from "./citation.ts";
import type { ScopeId, FactRef } from "@generalbusiness/dap-contract";
import { isDigest, isFactRef, isScopeId, parseStrict, textDigest } from "@generalbusiness/dap-bytes";
import { journalId, readJournalRepositoryArchive } from "@generalbusiness/dap-git/journal-reader";
import { localJournalRepository, type JournalLocalOptions } from "@generalbusiness/dap-git/journal-local";
import { archiveSource, type ArchiveReadWork, type ArchiveSource, type ArchiveSourceOptions, type ArchiveTextPort } from "./archive.ts";

export interface GitSourceOptions extends ArchiveSourceOptions { readonly local?: JournalLocalOptions }
export function gitSource(directory: string, options: GitSourceOptions = {}): ArchiveSource {
  const repository = localJournalRepository(directory, options.local);
  return archiveSource({
    open: (scope, work) => readJournalRepositoryArchive(repository, scope, work),
    async floorReceipt(scope, commit, work) {
      const format = await repository.format(work);
      try { journalId(format, commit); } catch { return { ok: false, reason: "floor-commit-mismatch" }; }
      const object = await repository.object(commit, 0, work);
      if (!object) return { ok: false, reason: "floor-commit-missing" };
      if (object.type !== "commit") return { ok: false, reason: "floor-commit-mismatch" };
      // The existing complete reader checks object IDs, grammar and head.json
      // against this exact immutable commit, under the original read budget.
      const read = await readJournalRepositoryArchive({
        format: async () => format, resolve: async () => commit,
        object: (id, most, budget) => repository.object(id, most, budget),
      }, scope, work);
      if (!read.ok) return { ok: false, reason: read.result === "mismatch" || read.result === "refused" ? "floor-commit-mismatch" : read.result };
      return { ok: true, scope: read.archive.scope, through: read.archive.head };
    },
    settle: () => repository.settle?.() ?? Promise.resolve(),
  }, options);
}

export class ArchiveFileFailure extends Error {
  readonly reason: "not-found" | "too-large" | "refused" | "unavailable";
  constructor(reason: "not-found" | "too-large" | "refused" | "unavailable") { super(`archive caller file: ${reason}`); this.reason = reason; }
}
const RECEIPT_BYTES = 64 * 1024;
const decode = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
/** No allocation before a regular descriptor's size is checked. Fixed caller
 * paths only; archive tree paths are not arguments to this function. */
async function fileBytes(path: string, most: number, work?: ArchiveReadWork): Promise<Uint8Array> {
  let file: FileHandle | undefined;
  try {
    work?.check();
    if (!Number.isSafeInteger(most) || most < 0 || most > 8 * 1024 * 1024) throw new ArchiveFileFailure("too-large");
    file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    work?.check();
    const before = await file.stat({ bigint: true });
    if (!before.isFile()) throw new ArchiveFileFailure("refused");
    if (before.size > BigInt(most)) throw new ArchiveFileFailure("too-large");
    const size = Number(before.size);
    work?.bytes(size + 1); work?.spend({ calls: 1, inputWork: (size + 1) * 4 });
    const bytes = new Uint8Array(size + 1); let length = 0;
    while (length < bytes.length) {
      work?.check();
      const got = await file.read(bytes, length, bytes.length - length, length);
      work?.check(); if (got.bytesRead === 0) break; length += got.bytesRead;
    }
    const after = await file.stat({ bigint: true }); work?.check();
    if (length !== size || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) throw new ArchiveFileFailure("unavailable");
    return bytes.subarray(0, length);
  } catch (error) {
    if (error instanceof ArchiveFileFailure || error && typeof error === "object" && "reason" in error) throw error;
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    throw new ArchiveFileFailure(code === "ENOENT" ? "not-found" : code === "ELOOP" ? "refused" : "unavailable");
  } finally { await file?.close(); }
}

/** Detached text filenames are <64 lowercase digest hex digits>.txt inside
 * this explicitly selected directory. No archive-supplied name is opened. */
export function archiveTexts(directory: string): ArchiveTextPort {
  const pending = new Set<Promise<unknown>>();
  let root: Promise<string> | undefined;
  return {
    async read(digest, most, work) {
      if (!isDigest(digest)) return { ok: false, reason: "refused" };
      const operation = (async () => {
        try {
          work.check(); root ??= realpath(directory);
          const selected = await root; work.check();
          const bytes = await fileBytes(join(selected, `${digest.slice(7)}.txt`), most, work);
          let text: string;
          try { text = decode.decode(bytes); } catch { return { ok: false as const, reason: "unavailable" }; }
          if (textDigest(text) !== digest) return { ok: false as const, reason: "digest-mismatch" };
          return { ok: true as const, text };
        } catch (error) {
          if (error instanceof ArchiveFileFailure) return { ok: false as const, reason: error.reason };
          throw error;
        }
      })();
      pending.add(operation);
      try { return await operation; } finally { pending.delete(operation); }
    },
    async settle() { await Promise.allSettled([...pending]); },
  };
}

/** A bounded caller-selected receipt is a position pin, not a signature or
 * an authorization claim. Only its native fact is used for membership. */
export async function readArchiveReceipt(path: string): Promise<{ readonly fact: FactRef }> {
  let value: unknown;
  try { value = parseStrict(decode.decode(await fileBytes(path, RECEIPT_BYTES))); }
  catch (error) { if (error instanceof ArchiveFileFailure) throw error; throw new ArchiveFileFailure("refused"); }
  if (!value || typeof value !== "object" || !("fact" in value) || !isFactRef(value.fact)) throw new ArchiveFileFailure("refused");
  return { fact: { ...value.fact, at: { ...value.fact.at } } };
}

interface CitationBytes { readonly event: Uint8Array | null; readonly predecessors: ReadonlyMap<string, Uint8Array> }
function citationEncoding(value: unknown): Uint8Array {
  if (!value || typeof value !== "object" || !("encoding" in value) || !("bytes" in value) || typeof value.bytes !== "string") throw new TypeError("Citation source bytes are required");
  if (value.encoding === "utf-8") {
    const bytes = new TextEncoder().encode(value.bytes);
    if (decode.decode(bytes) !== value.bytes) throw new TypeError("Citation UTF-8 is not representable");
    return bytes;
  }
  if (value.encoding !== "base64" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.bytes)) throw new TypeError("Citation base64 must use padded standard spelling");
  const bytes = Buffer.from(value.bytes, "base64");
  if (bytes.toString("base64") !== value.bytes) throw new TypeError("Noncanonical citation base64");
  return new Uint8Array(bytes);
}

/** A fixed caller file uses section 7's event/source fields, never a trusted anchor. */
export function citationFileSource(path: string): CitationSource {
  let loaded: Promise<CitationBytes> | undefined;
  const load = (): Promise<CitationBytes> => loaded ??= (async () => {
    const value: unknown = parseStrict(decode.decode(await fileBytes(path, 8 * 1024 * 1024)));
    if (!value || typeof value !== "object" || !("event" in value) || !("source" in value) || !Array.isArray(value.source) || value.source.length > 10_000) throw new TypeError("Citation source needs event and source");
    const predecessors = new Map<string, Uint8Array>();
    for (const row of value.source) {
      if (!row || typeof row !== "object" || typeof row.digest !== "string" || predecessors.has(row.digest)) throw new TypeError("Duplicate or malformed source digest claim");
      predecessors.set(row.digest, citationEncoding(row));
    }
    return { event: value.event === null ? null : citationEncoding(value.event), predecessors };
  })();
  return {
    async event() { const bytes = (await load()).event; return bytes === null ? null : new Uint8Array(bytes); },
    async predecessor(_format, digest) { const bytes = (await load()).predecessors.get(digest); return bytes === undefined ? null : new Uint8Array(bytes); },
  };
}

export interface CitationGitOptions { readonly program?: string }
const CITATION_GIT_BYTES = 8 * 1024 * 1024;
/** Fixed read/hash commands only. Git receives no inherited config, credentials or replacement graph. */
function citationGitRun(directory: string, args: readonly string[], most: number, options: CitationGitOptions, input?: Uint8Array): Promise<Uint8Array> {
  const env = { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: "/nonexistent", LC_ALL: "C", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_ATTR_NOSYSTEM: "1", GIT_NO_REPLACE_OBJECTS: "1", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "/bin/false", GIT_OPTIONAL_LOCKS: "0", GIT_CEILING_DIRECTORIES: directory };
  return new Promise((resolve, reject) => {
    const child = execFile(options.program ?? "git", ["--no-pager", "-c", "protocol.allow=never", "-c", "core.fsmonitor=false", "-c", "advice.graftFileDeprecated=false", ...args], {
      cwd: directory, env, encoding: "buffer", maxBuffer: most, timeout: 10_000, killSignal: "SIGKILL", windowsHide: true,
    }, (error, stdout) => error || stdout.length > most ? reject(new Error("Citation Git bytes unavailable")) : resolve(new Uint8Array(stdout)));
    child.stdin?.on("error", () => undefined);
    child.stdin?.end(input === undefined ? undefined : Buffer.from(input));
  });
}

/** Git itself hashes raw commit content. No Bytes.sha1 or object-store claim decides this digest. */
export async function citationGitHash(content: Uint8Array, options: CitationGitOptions = {}): Promise<string | null> {
  if (content.length > CITATION_GIT_BYTES) return null;
  // A fresh empty directory avoids inheriting a SHA-256 repository's format.
  // hash-object has no -w; it writes neither objects nor a repository here.
  const directory = await mkdtemp(join(tmpdir(), "artroom-citation-sha1-"));
  try {
    const result = decode.decode(await citationGitRun(directory, ["hash-object", "--literally", "-t", "commit", "--stdin"], 128, options, content));
    return result.length === 41 && result[40] === "\n" && !/[^0-9a-f]/.test(result.slice(0, 40)) ? result.slice(0, 40) : null;
  } catch { return null; }
  finally { await rmdir(directory); }
}

/** Read raw stored commits, never rev-list or a replaced/grafted parent graph. */
export function citationGitSource(directory: string, options: CitationGitOptions = {}): CitationSource {
  let format: Promise<string> | undefined;
  const object = async (token: string, id: string): Promise<Uint8Array | null> => {
    if (token !== "git" && token !== "git256" || id.length !== (token === "git" ? 40 : 64) || /[^0-9a-f]/.test(id)) return null;
    const selected = await (format ??= citationGitRun(directory, ["rev-parse", "--show-object-format"], 128, options).then(bytes => decode.decode(bytes)));
    if (selected !== (token === "git" ? "sha1\n" : "sha256\n")) return null;
    const metadata = decode.decode(await citationGitRun(directory, ["cat-file", "--batch-check"], 256, options, new TextEncoder().encode(id + "\n")));
    const match = /^([0-9a-f]+) commit (0|[1-9][0-9]*)\n$/.exec(metadata), size = match ? Number(match[2]) : NaN;
    if (!match || match[1] !== id || !Number.isSafeInteger(size) || size < 0 || size > CITATION_GIT_BYTES) return null;
    const bytes = await citationGitRun(directory, ["cat-file", "commit", id], Math.max(size, 1), options);
    return bytes.length === size ? bytes : null;
  };
  return { event: citation => object(citation.format, citation.event), predecessor: object };
}


export interface CloneAudit {
  readonly journals: readonly { readonly scope: ScopeId; readonly commit: string }[];
  readonly secretCheck: { readonly result: "no-recognized-secret"; readonly objects: number; readonly bytes: number; readonly qualification: string };
}
const SECRET_QUALIFICATION = "Finite recognizers only: PEM private keys, GitHub access tokens, and encoded private-key/secret/seed JSON fields. This is not proof that arbitrary secrets are absent. No matching body is printed.";
const recognizedSecret = (bytes: Uint8Array): boolean => {
  const text = Buffer.from(bytes).toString("latin1");
  return /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/.test(text)
    || /(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})/.test(text)
    || /"(?:privateKey|private_key|secretKey|secret|seed)"\s*:\s*"(?:[a-fA-F0-9]{64,128}|[A-Za-z0-9_-]{43,88})"/.test(text);
};

/** Offline fixed plumbing only. No shell, credential environment, fetch,
 * checkout or user-supplied recognizer. Scan the reachable archive closure,
 * including older passes, and disclose the exact finite recognition scope. */
export async function auditClone(directory: string): Promise<CloneAudit> {
  const until = Date.now() + 30_000, maximum = 8 * 1024 * 1024;
  const env = { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: "/nonexistent", LC_ALL: "C", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_NO_REPLACE_OBJECTS: "1", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "/bin/false", GIT_OPTIONAL_LOCKS: "0" };
  const run = (args: readonly string[], input?: string): Promise<Buffer> => new Promise((resolve, reject) => {
    const remaining = until - Date.now();
    if (remaining <= 0) return reject(new Error("clone audit timeout"));
    const child = execFile("git", ["--no-pager", "-c", "protocol.allow=never", "-c", "core.fsmonitor=false", ...args],
      { cwd: directory, env, encoding: "buffer", maxBuffer: maximum, timeout: Math.min(10_000, remaining), killSignal: "SIGKILL" },
      (error, stdout) => error ? reject(new Error("clone audit Git read failed or exceeded its bound")) : resolve(stdout));
    child.stdin?.on("error", () => undefined);
    child.stdin?.end(input);
  });
  const raw = (await run(["for-each-ref", "--count=65", "--format=%(refname) %(objectname)", "refs/artroom/journal/"])).toString("ascii").trim();
  const journals = raw ? raw.split("\n").map(row => {
    const match = /^refs\/artroom\/journal\/(sc_[a-z2-7]{52}) ([a-f0-9]{40}|[a-f0-9]{64})$/.exec(row);
    if (!match || !isScopeId(match[1])) throw new Error("clone audit journal ref refused");
    return { scope: match[1], commit: match[2]! };
  }) : [];
  if (!journals.length || journals.length > 64 || new Set(journals.map(row => row.scope)).size !== journals.length) throw new Error("clone audit journal count refused");
  const lines = (await run(["rev-list", "--objects", "--no-object-names", "--stdin"], journals.map(row => row.commit).join("\n") + "\n")).toString("ascii").trim().split("\n");
  if (lines.length > 100_000 || lines.some(id => !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(id))) throw new Error("clone audit object count refused");
  const ids = [...new Set(lines)];
  const metadata = (await run(["cat-file", "--batch-check"], ids.join("\n") + "\n")).toString("ascii").trim().split("\n");
  if (metadata.length !== ids.length) throw new Error("clone audit metadata refused");
  let total = 0;
  const objects = metadata.map((row, index) => {
    const match = /^([a-f0-9]+) (blob|tree|commit|tag) (0|[1-9][0-9]*)$/.exec(row), size = match ? Number(match[3]) : NaN;
    if (!match || match[1] !== ids[index] || !Number.isSafeInteger(size) || size < 0 || size > maximum - 1024) throw new Error("clone audit object size refused");
    total += size;
    if (total > 256 * 1024 * 1024) throw new Error("clone audit total bytes refused");
    return { id: ids[index]!, type: match[2]!, size };
  });
  // Complete metadata bounds precede every payload read. Small batches keep
  // collector memory bounded independently of total closure size.
  for (let start = 0; start < objects.length;) {
    const batch: typeof objects = []; let bytes = 0;
    while (start < objects.length && batch.length < 128 && bytes + objects[start]!.size + 128 <= maximum) {
      const object = objects[start++]!; batch.push(object); bytes += object.size + 128;
    }
    if (!batch.length) throw new Error("clone audit batch refused");
    const payload = await run(["cat-file", "--batch"], batch.map(row => row.id).join("\n") + "\n");
    let offset = 0;
    for (const object of batch) {
      const end = payload.indexOf(10, offset), header = `${object.id} ${object.type} ${object.size}`;
      if (end < 0 || payload.subarray(offset, end).toString("ascii") !== header || payload[end + object.size + 1] !== 10) throw new Error("clone audit payload refused");
      const body = payload.subarray(end + 1, end + 1 + object.size);
      if (recognizedSecret(body)) throw new Error(`clone audit recognized a possible secret in object ${object.id}; body withheld`);
      offset = end + object.size + 2;
    }
    if (offset !== payload.length) throw new Error("clone audit payload suffix refused");
  }
  return { journals, secretCheck: { result: "no-recognized-secret", objects: objects.length, bytes: total, qualification: SECRET_QUALIFICATION } };
}
