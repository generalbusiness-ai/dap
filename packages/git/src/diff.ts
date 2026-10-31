/**
 * A bounded diff between two exact commits. It reads objects by ID through a `GitSource`, so a host computes nothing and no
 * process runs. Each changed text file gets one hunk: the span between its common first and last lines, with three lines of
 * context. The hunk is correct but can be larger than the smallest edit script.
 *
 * Over a bound, the answer stops, sets `truncated` and says "truncated" in its text. A missing or corrupt object is a
 * `GitRefusal`: the answer never shows a change it did not read.
 *
 * A repository's author chooses every name and line here. A path appears as one unambiguous line: see `shownPath`. File text
 * stays exact, because `git apply` must reproduce the file, so a line keeps its ESC, CR and bidi characters. Read file text as
 * data. The card shows it as text and never as markup.
 */
import { GitRefusal, objectId, type ObjectId } from "./names.ts";
import { READ_BOUNDS, Reader, parseTree, type GitSource, type TreeEntry } from "./reader.ts";
import { SmartHttpSource } from "./http-read.ts";

export interface DiffBounds {
  /** Changed paths in one answer. */
  readonly files: number;
  /** Bytes of the text, counted as JSON escapes them, because the answer travels as JSON. */
  readonly textBytes: number;
  /** Bytes of one file that the diff reads. A larger file shows as one omitted line. */
  readonly blobBytes: number;
  /** Bytes of one tree. A larger tree shows as one omitted line. */
  readonly treeBytes: number;
  /** Objects read in one answer. */
  readonly objects: number;
  /** Bytes of objects read in one answer. */
  readonly totalBytes: number;
  /** Directory depth. */
  readonly depth: number;
  readonly milliseconds: number;
}
export const DIFF_BOUNDS: DiffBounds = Object.freeze({ files: 256, textBytes: 40 * 1024, blobBytes: 1024 * 1024, treeBytes: 1024 * 1024, objects: 1024, totalBytes: 16 * 1024 * 1024, depth: 64, milliseconds: 20_000 });
export interface BoundedDiff {
  base: ObjectId;
  integration: ObjectId;
  /** Changed paths the answer reached. With `truncated`, the change has at least this many. */
  files: number;
  text: string;
  truncated: boolean;
}
const CONTEXT = 3;
/** The bytes of a path that a line shows. A longer path shows its start and its length, and the answer says `truncated`. */
const PATH_BYTES = 1024;
/** The characters of a shown path that a statement of a bound repeats. */
const BRIEF_PATH = 128;
/** Room kept for the closing line: its words and one brief path, at the most JSON bytes per character. */
const CLOSING_BYTES = 1024;
const encoder = new TextEncoder();
const bytesOf = (line: string): number => encoder.encode(JSON.stringify(line)).length;
/** Keep each line's own ending, so a last line without a newline differs from the same line with one. */
const linesOf = (text: string): string[] => text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
const asByte = (c: string): string => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`;
const asUnit = (c: string): string => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`;
/** Bytes as one character each. It takes a name of any length, because it spreads a bounded slice at a time. */
const byteString = (bytes: Uint8Array): string => {
  let out = "";
  for (let at = 0; at < bytes.length; at += 8192) out += String.fromCharCode(...bytes.subarray(at, at + 8192));
  return out;
};
/**
 * A path's bytes as one line that a reader can trust. In UTF-8, a backslash and each C0 control or DEL appear as \xNN, and each
 * C1 control, bidi control or line separator appears as \uNNNN. A path that is not UTF-8 appears byte by byte, with each byte
 * over ASCII as \xNN. An escaped backslash means that no name can show as the escape of another name.
 */
function shownPath(path: Uint8Array): string {
  const kept = path.subarray(0, PATH_BYTES), over = path.length > PATH_BYTES;
  let text: string;
  // A cut can fall inside a character. In `stream` mode the decoder keeps those bytes back and does not call them invalid.
  // eslint-disable-next-line no-control-regex
  try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(kept, { stream: over }).replace(/[\u0000-\u001f\\\u007f]/g, asByte).replace(/[\u0080-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g, asUnit); }
  // eslint-disable-next-line no-control-regex
  catch { text = byteString(kept).replace(/[\u0000-\u001f\\\u007f-\u00ff]/g, asByte); }
  return over ? `${text}... (${path.length} bytes)` : text;
}
const brief = (shown: string): string => shown.length > BRIEF_PATH ? `${shown.slice(0, BRIEF_PATH)}...` : shown;
function textOf(data: Uint8Array): string | null {
  if (data.includes(0)) return null;
  try { return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(data); } catch { return null; }
}
const joined = (prefix: Uint8Array, name: Uint8Array): Uint8Array => {
  if (prefix.length === 0) return name;
  const out = new Uint8Array(prefix.length + 1 + name.length);
  out.set(prefix); out[prefix.length] = 0x2f; out.set(name, prefix.length + 1);
  return out;
};
const nameKey = byteString;

class Walk {
  readonly #reader: Reader;
  readonly #bounds: DiffBounds;
  readonly #ends: number;
  readonly #now: () => number;
  readonly #lines: string[] = [];
  #size = 0;
  #objects = 0;
  #read = 0;
  files = 0;
  /** The first bound met. */
  why: string | null = null;
  /** True once a bound ends the whole walk, apart from one omitted file or tree. */
  stopped = false;
  constructor(reader: Reader, bounds: DiffBounds, now: () => number) {
    this.#reader = reader; this.#bounds = bounds; this.#now = now; this.#ends = now() + bounds.milliseconds;
  }
  get text(): string { return this.#lines.join(""); }
  #stop(why: string): void { this.why ??= why; this.stopped = true; }
  /** Add lines all or none, keeping room for the closing line, so the whole text stays inside its bound. */
  #emit(...lines: string[]): boolean {
    const size = lines.reduce((sum, line) => sum + bytesOf(line), 0);
    if (this.#size + size > this.#bounds.textBytes - CLOSING_BYTES) { this.#stop(`the text reached its bound of ${this.#bounds.textBytes} bytes`); return false; }
    this.#lines.push(...lines); this.#size += size;
    return true;
  }
  #admit(): boolean {
    if (this.stopped) return false;
    if (this.#objects >= this.#bounds.objects) { this.#stop(`the read reached its bound of ${this.#bounds.objects} objects`); return false; }
    if (this.#read >= this.#bounds.totalBytes) { this.#stop(`the read reached its bound of ${this.#bounds.totalBytes} bytes`); return false; }
    if (this.#now() >= this.#ends) { this.#stop(`the read reached its bound of ${this.#bounds.milliseconds} ms`); return false; }
    this.#objects++;
    return true;
  }
  /** One tree's entries, or null when a bound omits it. */
  async #entries(id: ObjectId | null, shown: string): Promise<TreeEntry[] | null> {
    if (id === null) return [];
    if (!this.#admit()) return null;
    try {
      const data = await this.#reader.object(id, "tree");
      this.#read += data.length;
      return parseTree(data);
    } catch (error) {
      if (!(error instanceof GitRefusal) || error.reason !== "too-large") throw error;
      this.why ??= `the tree ${brief(shown) || "at the root"} is over its bound`;
      this.#emit(`omitted: the tree ${shown || "at the root"} is too large to read\n`);
      return null;
    }
  }
  /** One file's bytes, or null when a bound omits it. */
  async #blob(id: ObjectId | null, shown: string): Promise<Uint8Array | null> {
    if (id === null) return new Uint8Array();
    if (!this.#admit()) return null;
    try {
      const data = await this.#reader.blob(id);
      this.#read += data.length;
      return data;
    } catch (error) {
      if (!(error instanceof GitRefusal) || error.reason !== "too-large") throw error;
      this.why ??= `the file ${brief(shown)} is over its bound of ${this.#bounds.blobBytes} bytes`;
      this.#emit(`omitted: the file ${shown} is too large to read\n`);
      return null;
    }
  }
  /** One changed path. Each side is a non-tree entry, or absent. */
  async #file(path: Uint8Array, before: TreeEntry | null, after: TreeEntry | null): Promise<void> {
    if (this.files >= this.#bounds.files) { this.#stop(`the answer reached its bound of ${this.#bounds.files} files`); return; }
    this.files++;
    const shown = shownPath(path);
    if (path.length > PATH_BYTES) this.why ??= `a path of ${path.length} bytes shows only its first ${PATH_BYTES}`;
    if (before?.kind === "gitlink" || after?.kind === "gitlink") {
      this.#emit(`submodule ${shown}: ${before?.id ?? "none"} to ${after?.id ?? "none"}\n`);
      return;
    }
    const modes = before && after && before.mode !== after.mode ? [`old mode ${before.mode}\n`, `new mode ${after.mode}\n`] : [];
    const a = before ? `a/${shown}` : "/dev/null", b = after ? `b/${shown}` : "/dev/null";
    const head = [`--- ${a}\n`, `+++ ${b}\n`];
    if (before?.id === after?.id) { this.#emit(`mode change ${shown}\n`, ...modes); return; }
    const [old, next] = [await this.#blob(before?.id ?? null, shown), await this.#blob(after?.id ?? null, shown)];
    if (old === null || next === null) return;
    const [oldText, nextText] = [textOf(old), textOf(next)];
    if (oldText === null || nextText === null) { this.#emit(...modes, `Binary files ${a} and ${b} differ\n`); return; }
    const from = linesOf(oldText), to = linesOf(nextText);
    let start = 0;
    while (start < from.length && start < to.length && from[start] === to[start]) start++;
    let tail = 0;
    while (tail < from.length - start && tail < to.length - start && from[from.length - 1 - tail] === to[to.length - 1 - tail]) tail++;
    const first = Math.max(0, start - CONTEXT), keep = Math.min(tail, CONTEXT);
    const oldLines = from.slice(first, from.length - tail + keep), newLines = to.slice(first, to.length - tail + keep);
    const range = (at: number, count: number) => `${count === 0 ? at : at + 1},${count}`;
    if (!this.#emit(...modes, ...head, `@@ -${range(first, oldLines.length)} +${range(first, newLines.length)} @@\n`)) return;
    const closed = (mark: string, line: string) => line.endsWith("\n") ? [`${mark}${line}`] : [`${mark}${line}\n`, "\\ No newline at end of file\n"];
    const emitted = [
      ...from.slice(first, start).flatMap(line => closed(" ", line)),
      ...from.slice(start, from.length - tail).flatMap(line => closed("-", line)),
      ...to.slice(start, to.length - tail).flatMap(line => closed("+", line)),
      ...from.slice(from.length - tail, from.length - tail + keep).flatMap(line => closed(" ", line)),
    ];
    for (const line of emitted) if (!this.#emit(line)) return;
  }
  async #side(path: Uint8Array, entry: TreeEntry, added: boolean, depth: number): Promise<void> {
    if (entry.kind === "tree") return this.tree(added ? null : entry.id, added ? entry.id : null, path, depth + 1);
    return this.#file(path, added ? null : entry, added ? entry : null);
  }
  async tree(before: ObjectId | null, after: ObjectId | null, prefix: Uint8Array, depth: number): Promise<void> {
    if (before === after) return;
    const shown = shownPath(prefix);
    if (depth > this.#bounds.depth) { this.#stop(`the walk reached its bound of ${this.#bounds.depth} directories deep`); return; }
    const olds = await this.#entries(before, shown); if (olds === null) return;
    const news = await this.#entries(after, shown); if (news === null) return;
    const older = new Map(olds.map(entry => [nameKey(entry.name), entry])), newer = new Map(news.map(entry => [nameKey(entry.name), entry]));
    for (const key of [...new Set([...older.keys(), ...newer.keys()])].sort()) {
      if (this.stopped) return;
      const a = older.get(key) ?? null, b = newer.get(key) ?? null;
      const path = joined(prefix, (a ?? b)!.name);
      if (a?.id === b?.id && a?.mode === b?.mode) continue;
      if (a?.kind === "tree" && b?.kind === "tree") await this.tree(a.id, b.id, path, depth + 1);
      else if (a && b && (a.kind === "tree" || b.kind === "tree")) { await this.#side(path, a, false, depth); await this.#side(path, b, true, depth); }
      else if (a && b) await this.#file(path, a, b);
      else await this.#side(path, (a ?? b)!, a === null, depth);
    }
  }
  /** The tree of one commit, or null when a bound stops the read. */
  async root(id: ObjectId, name: string): Promise<ObjectId | null> {
    if (!this.#admit()) return null;
    try { return (await this.#reader.commit(id, name)).tree; }
    catch (error) {
      if (!(error instanceof GitRefusal) || error.reason !== "too-large") throw error;
      this.#stop(`the ${name} commit or the pack that holds it is over the read bound`);
      return null;
    }
  }
}

/** The change from `base` to `integration`, as text, inside `bounds`. `now` is the clock for the time bound. */
export async function boundedDiff(source: GitSource, baseId: string, integrationId: string, bounds: DiffBounds = DIFF_BOUNDS, now: () => number = Date.now): Promise<BoundedDiff> {
  const base = objectId(baseId, "base"), integration = objectId(integrationId, "integration");
  const walk = new Walk(new Reader(source, { ...READ_BOUNDS, treeBytes: bounds.treeBytes, blobBytes: bounds.blobBytes }), bounds, now);
  const before = await walk.root(base, "base"), after = before === null ? null : await walk.root(integration, "integration");
  if (before !== null && after !== null) await walk.tree(before, after, new Uint8Array(), 0);
  const truncated = walk.why !== null;
  const closing = truncated ? `truncated: ${walk.why}. This diff does not show the whole change.\n` : "";
  return { base, integration, files: walk.files, text: walk.text + closing, truncated };
}

/** One pack of a commit's closure. A larger repository answers "truncated". */
const DIFF_PACK_BYTES = 32 * 1024 * 1024;
const DIFF_READ_MS = 15_000;
/**
 * One diff with a one-time read credential, over smart HTTP. The credential goes only to `remote`, in the header of the host's
 * form, and never into the answer. A refusal names the reason and keeps none of the host's text.
 */
export async function diffWithCredential(read: { remote: string; credential: string; base: string; integration: string }, fetch?: (request: Request) => Promise<Response>): Promise<BoundedDiff | { unavailable: string }> {
  try {
    const authorization = new URL(read.remote).hostname === "github.com" ? `Basic ${btoa(`x-access-token:${read.credential}`)}` : `Bearer ${read.credential}`;
    const source = new SmartHttpSource({ remote: read.remote, authorization, maxBytes: DIFF_PACK_BYTES, bounds: READ_BOUNDS, timeoutMs: DIFF_READ_MS, ...(fetch ? { fetch } : {}) });
    return await boundedDiff(source, read.base, read.integration);
  } catch (error) {
    return { unavailable: error instanceof GitRefusal ? `${error.reason}: ${error.what}` : "the host gave no readable answer" };
  }
}
