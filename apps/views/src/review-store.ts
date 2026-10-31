/** Local review state. A successful write is not a native receipt. */
import { closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { isAbsolute, join, parse, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { canonicalize, isDigest, isMemberRef, isScopeRef, utf8 } from "@generalbusiness/dap-bytes";
import type { LocalReviewCapture } from "@generalbusiness/dap-mcp";
import type { Point } from "./reads.ts";
import { same } from "./reads.ts";

const BYTES = 32768, HEADS = 64;
type Mark = Pick<LocalReviewCapture, "service" | "directory" | "viewer" | "key"> & Point;
interface State { version: 1; marks: Mark[] }
export class ReviewStoreError extends Error { constructor(readonly reason: "unsafe-path" | "invalid" | "busy" | "full" | "rollback" | "conflict") { super(reason); } }
const bad = (reason: ReviewStoreError["reason"]): never => { throw new ReviewStoreError(reason); };
const owner = (path: string, directory: boolean): void => {
  const info = lstatSync(path);
  if (info.isSymbolicLink() || (directory ? !info.isDirectory() : !info.isFile() || info.nlink !== 1)
    || info.uid !== process.getuid?.() || (info.mode & 0o077) !== 0) bad("unsafe-path");
};
function safeHome(home: string): void {
  if (!isAbsolute(home) || realpathSync(home) !== home) bad("unsafe-path");
  let at = parse(home).root;
  for (const part of home.slice(at.length).split(sep)) { at = join(at, part); if (lstatSync(at).isSymbolicLink() || !lstatSync(at).isDirectory()) bad("unsafe-path"); }
  owner(home, true);
}
const binding = (mark: Pick<Mark, "service" | "directory" | "viewer" | "key">) => canonicalize([mark.service, mark.directory, mark.viewer, mark.key]);
const identity = (mark: Mark) => canonicalize([binding(mark), mark.scope]);
function valid(mark: unknown): mark is Mark {
  if (!mark || typeof mark !== "object") return false;
  const m = mark as Partial<Mark>;
  return typeof m.service === "string" && m.service.length <= 2048 && typeof m.key === "string" && m.key.length <= 128
    && isScopeRef(m.directory) && isMemberRef(m.viewer) && isScopeRef(m.scope) && !!m.head
    && Number.isSafeInteger(m.head.seq) && m.head.seq >= 0 && isDigest(m.head.hash);
}

export class ReviewStore {
  readonly #directory: string;
  readonly #path: string;
  constructor(readonly home: string, readonly options: { flush?: (fd: number) => void } = {}) { this.#directory = join(home, "private"); this.#path = join(this.#directory, "reviewed-heads.json"); }
  #location(create = false): void {
    safeHome(this.home);
    if (!existsSync(this.#directory)) { if (!create) return; mkdirSync(this.#directory, { mode: 0o700 }); }
    owner(this.#directory, true);
  }
  #read(): State {
    this.#location();
    let fd: number;
    try { fd = openSync(this.#path, constants.O_RDONLY | constants.O_NOFOLLOW); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, marks: [] }; throw error; }
    try {
      owner(this.#path, false);
      const actual = fstatSync(fd);
      if (!actual.isFile() || actual.nlink !== 1 || actual.uid !== process.getuid?.() || (actual.mode & 0o077) !== 0 || actual.size > BYTES) bad("unsafe-path");
      const bytes = Buffer.alloc(BYTES + 1); let length = 0, count: number;
      while (length < bytes.length && (count = readSync(fd, bytes, length, bytes.length - length, null)) > 0) length += count;
      if (length > BYTES) bad("invalid");
      const parsed: unknown = JSON.parse(bytes.subarray(0, length).toString("utf8"));
      const state = parsed as State;
      if (!state || state.version !== 1 || !Array.isArray(state.marks) || state.marks.length > HEADS || state.marks.some(mark => !valid(mark))
        || new Set(state.marks.map(identity)).size !== state.marks.length) bad("invalid");
      return state;
    } finally { closeSync(fd); }
  }
  read(bindingOf: Pick<LocalReviewCapture, "service" | "directory" | "viewer" | "key">): Point[] {
    return this.#read().marks.filter(mark => binding(mark) === binding(bindingOf)).map(({ scope, head }) => ({ scope, head }));
  }
  async mark(capture: LocalReviewCapture, admit: () => void | Promise<void>): Promise<"marked" | "already"> {
    if (capture.heads.length === 0 || capture.heads.length > 8 || !capture.heads.every(point => valid({ ...capture, ...point }))
      || new Set(capture.heads.map(point => point.scope.scope)).size !== capture.heads.length) bad("invalid");
    this.#location(true);
    const lock = join(this.#directory, "reviewed-heads.lock"); let fd: number;
    try { fd = openSync(lock, "wx", 0o600); } catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") bad("busy"); throw error; }
    let temporary: string | null = null;
    try {
      writeFileSync(fd, "local-review-writer\n"); fsyncSync(fd);
      const state = this.#read(); let changed = false;
      for (const point of capture.heads) {
        const next: Mark = { service: capture.service, directory: capture.directory, viewer: capture.viewer, key: capture.key, ...point };
        const index = state.marks.findIndex(mark => identity(mark) === identity(next)), old = state.marks[index];
        if (old) {
          if (point.head.seq < old.head.seq) bad("rollback");
          if (point.head.seq === old.head.seq) { if (!same(point.head, old.head)) bad("conflict"); continue; }
          state.marks[index] = next;
        } else { if (state.marks.length >= HEADS) bad("full"); state.marks.push(next); }
        changed = true;
      }
      const bytes = utf8(canonicalize(state)); if (bytes.length > BYTES) bad("full");
      await admit();
      if (!changed) return "already";
      temporary = join(this.#directory, `reviewed-heads-${randomUUID()}.tmp`);
      const writer = openSync(temporary, "wx", 0o600);
      try { writeFileSync(writer, bytes); (this.options.flush ?? fsyncSync)(writer); } finally { closeSync(writer); }
      // No awaited work follows the admission check and precedes publication.
      renameSync(temporary, this.#path); temporary = null;
      const directory = openSync(this.#directory, "r"); try { fsyncSync(directory); } finally { closeSync(directory); }
      if (!same(this.#read(), state)) bad("invalid");
      return "marked";
    } finally { closeSync(fd); if (temporary !== null) unlinkSync(temporary); unlinkSync(lock); }
  }
}
