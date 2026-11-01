/**
 * Bounded reads at exact commits: a diff between two commits, an interdiff between two versions of one change, and one file at
 * one commit. Each reads objects by ID through a `GitSource`, so a host computes nothing and no process runs. Each changed text
 * file gets one hunk: the span between its common first and last lines, with three lines of context. The hunk is correct but
 * can be larger than the smallest edit script.
 *
 * Each answer's text starts by naming the exact commits it read. Over a bound, the answer stops, sets `truncated`, says
 * "truncated" in its text and says what it left out. A missing or corrupt object is a `GitRefusal`: the answer never shows a
 * change it did not read.
 *
 * A repository's author chooses every name and line here. A path appears as one unambiguous line: see `shownPath`. File text
 * stays exact, because `git apply` must reproduce the file, so a line keeps its ESC, CR and bidi characters. Read file text as
 * data. The card shows it as text and never as markup.
 */
import { b64url } from "@generalbusiness/dap-bytes";
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
  /** What a truncated answer left out, in words. Null when it left out nothing. */
  leftOut: string | null;
  /** The first paths the answer reached, each with the commit that holds its file. */
  paths: readonly ReachedPath[];
}
/** One path of an answer. `path` is the name's exact bytes in base64url. `shown` is safe to display. `commit` holds the file. */
export interface ReachedPath { path: string; shown: string; commit: ObjectId }
const CONTEXT = 3;
/** The bytes of a path that a line shows. A longer path shows its start and its length, and the answer says `truncated`. */
const PATH_BYTES = 1024;
/** The characters of a shown path that a statement of a bound repeats. */
const BRIEF_PATH = 128;
/** Room kept for the closing line: its words and two brief paths, at the most JSON bytes per character. */
const CLOSING_BYTES = 2048;
/** The paths an answer lists beside its text. */
const PATHS = 32;
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

/** The lines of one file's patch. `key` is the patch without line numbers, or null where two patches cannot be compared. */
interface Patch { head: string[]; body: string[]; key: string[] | null }

abstract class Walk {
  protected readonly reader: Reader;
  readonly #bounds: DiffBounds;
  readonly #ends: number;
  readonly #now: () => number;
  readonly #reserved: number;
  /** Where the next lines go. An interdiff points this at one section at a time. */
  protected sink: string[] = [];
  readonly #lines = this.sink;
  #size = 0;
  #objects = 0;
  #read = 0;
  files = 0;
  /** The first bound met. */
  why: string | null = null;
  /** True once a bound ends the whole walk, apart from one omitted file or tree. */
  stopped = false;
  /** The last path the walk reached, and how much of its patch a stop left out: all of it, or a count of lines. */
  #last: string | null = null;
  #cut: "whole" | number | null = null;
  /** For a path with two patches: the patch under way, and the whole patch a stop would still leave out. */
  #pair: { patch: string; next: string | null } | null = null;
  #omitted = 0;
  /** Where an omitted line goes when it belongs to none of the sections of `sink`. */
  protected omissions: string[] | null = null;
  readonly paths: ReachedPath[] = [];
  constructor(reader: Reader, bounds: DiffBounds, now: () => number, reserved = 0) {
    this.reader = reader; this.#bounds = bounds; this.#now = now; this.#reserved = reserved; this.#ends = now() + bounds.milliseconds;
  }
  get text(): string { return this.#lines.join(""); }
  protected stop(why: string): void { this.why ??= why; this.stopped = true; }
  /** Add lines all or none, keeping room for the closing line, so the whole text stays inside its bound. */
  protected emit(...lines: string[]): boolean {
    const size = lines.reduce((sum, line) => sum + bytesOf(line), 0);
    if (this.#size + size > this.#bounds.textBytes - CLOSING_BYTES - this.#reserved) { this.stop(`the text reached its bound of ${this.#bounds.textBytes} bytes`); return false; }
    this.sink.push(...lines); this.#size += size;
    return true;
  }
  #admit(): boolean {
    if (this.stopped) return false;
    if (this.#objects >= this.#bounds.objects) { this.stop(`the read reached its bound of ${this.#bounds.objects} objects`); return false; }
    if (this.#read >= this.#bounds.totalBytes) { this.stop(`the read reached its bound of ${this.#bounds.totalBytes} bytes`); return false; }
    if (this.#now() >= this.#ends) { this.stop(`the read reached its bound of ${this.#bounds.milliseconds} ms`); return false; }
    this.#objects++;
    return true;
  }
  #omit(line: string): void {
    this.#omitted++;
    const sink = this.sink;
    this.sink = this.omissions ?? sink;
    this.emit(line);
    this.sink = sink;
  }
  /** One tree's entries, or null when a bound omits it. */
  protected async entries(id: ObjectId | null, shown: string): Promise<TreeEntry[] | null> {
    if (id === null) return [];
    if (!this.#admit()) return null;
    try {
      const data = await this.reader.object(id, "tree");
      this.#read += data.length;
      return parseTree(data);
    } catch (error) {
      if (!(error instanceof GitRefusal) || error.reason !== "too-large") throw error;
      this.why ??= `the tree ${brief(shown) || "at the root"} is over its bound`;
      this.#omit(`omitted: the tree ${shown || "at the root"} is too large to read\n`);
      return null;
    }
  }
  /** One file's bytes, or null when a bound omits it. */
  async #blob(id: ObjectId | null, shown: string): Promise<Uint8Array | null> {
    if (id === null) return new Uint8Array();
    if (!this.#admit()) return null;
    try {
      const data = await this.reader.blob(id);
      this.#read += data.length;
      return data;
    } catch (error) {
      if (!(error instanceof GitRefusal) || error.reason !== "too-large") throw error;
      this.why ??= `the file ${brief(shown)} is over its bound of ${this.#bounds.blobBytes} bytes`;
      this.#omit(`omitted: the file ${shown} is too large to read\n`);
      return null;
    }
  }
  /** One file's patch from `before` to `after`, or null when a bound omits it. Each side is a non-tree entry, or absent. */
  protected async patch(shown: string, before: TreeEntry | null, after: TreeEntry | null): Promise<Patch | null> {
    if (before?.kind === "tree" || after?.kind === "tree") return { head: [`directory on one side: ${shown}\n`], body: [], key: null };
    if (before?.kind === "gitlink" || after?.kind === "gitlink") return { head: [`submodule ${shown}: ${before?.id ?? "none"} to ${after?.id ?? "none"}\n`], body: [], key: null };
    const modes = before && after && before.mode !== after.mode ? [`old mode ${before.mode}\n`, `new mode ${after.mode}\n`] : [];
    const a = before ? `a/${shown}` : "/dev/null", b = after ? `b/${shown}` : "/dev/null";
    if (before?.id === after?.id) return { head: modes.length ? [`mode change ${shown}\n`, ...modes] : [], body: [], key: modes };
    const [old, next] = [await this.#blob(before?.id ?? null, shown), await this.#blob(after?.id ?? null, shown)];
    if (old === null || next === null) return null;
    const [oldText, nextText] = [textOf(old), textOf(next)];
    if (oldText === null || nextText === null) return { head: [...modes, `Binary files ${a} and ${b} differ\n`], body: [], key: null };
    const from = linesOf(oldText), to = linesOf(nextText);
    let start = 0;
    while (start < from.length && start < to.length && from[start] === to[start]) start++;
    let tail = 0;
    while (tail < from.length - start && tail < to.length - start && from[from.length - 1 - tail] === to[to.length - 1 - tail]) tail++;
    const first = Math.max(0, start - CONTEXT), keep = Math.min(tail, CONTEXT);
    const oldLines = from.slice(first, from.length - tail + keep), newLines = to.slice(first, to.length - tail + keep);
    const range = (at: number, count: number) => `${count === 0 ? at : at + 1},${count}`;
    const closed = (mark: string, line: string) => line.endsWith("\n") ? [`${mark}${line}`] : [`${mark}${line}\n`, "\\ No newline at end of file\n"];
    const body = [
      ...from.slice(first, start).flatMap(line => closed(" ", line)),
      ...from.slice(start, from.length - tail).flatMap(line => closed("-", line)),
      ...to.slice(start, to.length - tail).flatMap(line => closed("+", line)),
      ...from.slice(from.length - tail, from.length - tail + keep).flatMap(line => closed(" ", line)),
    ];
    return { head: [...modes, `--- ${a}\n`, `+++ ${b}\n`, `@@ -${range(first, oldLines.length)} +${range(first, newLines.length)} @@\n`], body, key: [...modes, a, b, ...body] };
  }
  /** Emit a patch's lines after its head. On a stop, the walk knows how many of them stayed out. */
  protected emitBody(patch: Patch): boolean {
    for (const [at, line] of patch.body.entries()) if (!this.emit(line)) { this.#cut = patch.body.length - at; return false; }
    this.#cut = null;
    return true;
  }
  /** Count one changed path against the bound and name it. Null when the bound ends the walk here. */
  protected reach(path: Uint8Array): string | null {
    if (this.files >= this.#bounds.files) { this.stop(`the answer reached its bound of ${this.#bounds.files} files`); return null; }
    this.files++;
    const shown = shownPath(path);
    if (path.length > PATH_BYTES) this.why ??= `a path of ${path.length} bytes shows only its first ${PATH_BYTES}`;
    this.#last = shown; this.#cut = "whole"; this.#pair = null;
    return shown;
  }
  /** List a path beside the text, for a reader who wants its file. */
  protected list(path: Uint8Array, shown: string, commit: ObjectId): void {
    if (this.paths.length < PATHS) this.paths.push({ path: b64url(path), shown, commit });
  }
  /** The path the walk reached needs nothing more. */
  protected reached(): void { this.#cut = null; this.#pair = null; }
  /** Name the patch under way, and the patch still to come after it. */
  protected onPatch(patch: string, next: string | null): void { this.#pair = { patch, next }; }
  /** One changed path. Each side is a non-tree entry, or absent. */
  protected abstract file(path: Uint8Array, before: TreeEntry | null, after: TreeEntry | null): Promise<void>;
  async #side(path: Uint8Array, entry: TreeEntry, added: boolean, depth: number): Promise<void> {
    if (entry.kind === "tree") return this.tree(added ? null : entry.id, added ? entry.id : null, path, depth + 1);
    return this.file(path, added ? null : entry, added ? entry : null);
  }
  async tree(before: ObjectId | null, after: ObjectId | null, prefix: Uint8Array, depth: number): Promise<void> {
    if (before === after) return;
    const shown = shownPath(prefix);
    if (depth > this.#bounds.depth) { this.stop(`the walk reached its bound of ${this.#bounds.depth} directories deep`); return; }
    const olds = await this.entries(before, shown); if (olds === null) return;
    const news = await this.entries(after, shown); if (news === null) return;
    const older = new Map(olds.map(entry => [nameKey(entry.name), entry])), newer = new Map(news.map(entry => [nameKey(entry.name), entry]));
    for (const key of [...new Set([...older.keys(), ...newer.keys()])].sort()) {
      if (this.stopped) return;
      const a = older.get(key) ?? null, b = newer.get(key) ?? null;
      const path = joined(prefix, (a ?? b)!.name);
      if (a?.id === b?.id && a?.mode === b?.mode) continue;
      if (a?.kind === "tree" && b?.kind === "tree") await this.tree(a.id, b.id, path, depth + 1);
      else if (a && b && (a.kind === "tree" || b.kind === "tree")) { await this.#side(path, a, false, depth); await this.#side(path, b, true, depth); }
      else if (a && b) await this.file(path, a, b);
      else await this.#side(path, (a ?? b)!, a === null, depth);
    }
  }
  /** The tree of one commit, or null when a bound stops the read. */
  async root(id: ObjectId, name: string): Promise<ObjectId | null> {
    if (!this.#admit()) return null;
    try { return (await this.reader.commit(id, name)).tree; }
    catch (error) {
      if (!(error instanceof GitRefusal) || error.reason !== "too-large") throw error;
      this.stop(`the ${name} commit or the pack that holds it is over the read bound`);
      return null;
    }
  }
  /** What the answer left out, in words, or null. A reader needs this as much as the word "truncated". */
  get leftOut(): string | null {
    if (this.why === null) return null;
    const parts: string[] = [];
    if (this.stopped) {
      if (this.#last === null) parts.push("every changed path, because the read stopped before it reached one");
      else if (this.#cut === "whole") parts.push(`the file ${brief(this.#last)} and every path after it`);
      else if (typeof this.#cut === "number") parts.push(`the last ${this.#cut} lines of ${this.#pair?.patch ?? "the patch"} of ${brief(this.#last)}${this.#pair?.next ? `, ${this.#pair.next} of that file,` : ""} and every path after it`);
      else if (this.#pair?.next) parts.push(`${this.#pair.next} of ${brief(this.#last)} and every path after it`);
      else parts.push(`every path after ${brief(this.#last)}`);
    }
    if (this.#omitted) parts.push(`${this.#omitted} ${this.#omitted === 1 ? "file or tree" : "files or trees"} too large to read, each on an omitted line`);
    if (!parts.length) parts.push("the rest of each long path");
    return parts.join(", and ");
  }
}

class DiffWalk extends Walk {
  readonly #base: ObjectId;
  readonly #integration: ObjectId;
  constructor(reader: Reader, bounds: DiffBounds, now: () => number, reserved: number, base: ObjectId, integration: ObjectId) { super(reader, bounds, now, reserved); this.#base = base; this.#integration = integration; }
  protected override async file(path: Uint8Array, before: TreeEntry | null, after: TreeEntry | null): Promise<void> {
    const shown = this.reach(path);
    if (shown === null) return;
    this.list(path, shown, after ? this.#integration : this.#base);
    const patch = await this.patch(shown, before, after);
    if (patch === null) { if (!this.stopped) this.reached(); return; }
    if (this.emit(...patch.head)) this.emitBody(patch);
  }
}

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

/** The change from `base` to `integration`, as text, inside `bounds`. `now` is the clock for the time bound. */
export async function boundedDiff(source: GitSource, baseId: string, integrationId: string, bounds: DiffBounds = DIFF_BOUNDS, now: () => number = Date.now): Promise<BoundedDiff> {
  const base = objectId(baseId, "base"), integration = objectId(integrationId, "integration");
  const header = `Diff between two exact commits.\nBase: ${base}\nIntegration: ${integration}\n\n`;
  const walk = new DiffWalk(new Reader(source, { ...READ_BOUNDS, treeBytes: bounds.treeBytes, blobBytes: bounds.blobBytes }), bounds, now, bytesOf(header) + bytesOf(NO_DIFFERENCE), base, integration);
  const before = await walk.root(base, "base"), after = before === null ? null : await walk.root(integration, "integration");
  if (before !== null && after !== null) await walk.tree(before, after, new Uint8Array(), 0);
  const truncated = walk.why !== null, leftOut = walk.leftOut;
  const closing = truncated ? `truncated: ${walk.why}. Left out: ${leftOut}. This diff does not show the whole change.\n` : walk.files === 0 ? NO_DIFFERENCE : "";
  return { base, integration, files: walk.files, text: header + walk.text + closing, truncated, leftOut, paths: walk.paths };
}

const NO_DIFFERENCE = "No difference: the two commits hold the same files.\n";

export interface VersionPoints { base: string; integration: string }
export interface BoundedInterdiff {
  from: { base: ObjectId; integration: ObjectId };
  to: { base: ObjectId; integration: ObjectId };
  /** True when the two versions name different bases. */
  rebased: boolean;
  /** Changed paths the answer reached. */
  files: number;
  /** Of those, how many fall in each class. Each class is one statement about who changed the path. */
  edited: number;
  mixed: number;
  carried: number;
  baseOnly: number;
  text: string;
  truncated: boolean;
  leftOut: string | null;
  paths: readonly ReachedPath[];
}
const sameEntry = (a: TreeEntry | null, b: TreeEntry | null): boolean => a?.id === b?.id && a?.mode === b?.mode;
const sameKey = (a: readonly string[] | null, b: readonly string[] | null): boolean => a !== null && b !== null && a.length === b.length && a.every((line, n) => line === b[n]);

/**
 * The walk of an interdiff. It compares the two integrations, and it reads a path in the two bases only when the versions name
 * different bases. Each path then falls in one of four classes, by what the four commits hold at that path:
 *
 * - `edited`: the bases agree, so only the change can explain a difference. The text shows the patch between the two integrations.
 * - `baseOnly`: neither version changes the path against its own base. The text names the path and shows no lines.
 * - `carried`: both versions make the same patch against their own bases, apart from line numbers. The text names the path.
 * - `mixed`: the bases differ and the patches differ, so a difference can come from either side. The text shows both patches and says so.
 */
class InterdiffWalk extends Walk {
  readonly #from: { base: ObjectId; integration: ObjectId };
  readonly #to: { base: ObjectId; integration: ObjectId };
  readonly #fromLabel: string;
  readonly #toLabel: string;
  #bases: { from: ObjectId; to: ObjectId } | null = null;
  readonly #trees = new Map<ObjectId, Map<string, TreeEntry> | null>();
  readonly edited: string[] = this.sink;
  readonly mixed: string[] = [];
  readonly carried: string[] = [];
  readonly baseOnly: string[] = [];
  readonly notRead: string[] = [];
  counts = { edited: 0, mixed: 0, carried: 0, baseOnly: 0 };
  constructor(reader: Reader, bounds: DiffBounds, now: () => number, reserved: number, from: { base: ObjectId; integration: ObjectId }, to: { base: ObjectId; integration: ObjectId }, labels: { from: string; to: string }) {
    super(reader, bounds, now, reserved); this.#from = from; this.#to = to; this.#fromLabel = labels.from; this.#toLabel = labels.to;
  }
  setBases(from: ObjectId, to: ObjectId): void { this.#bases = { from, to }; this.omissions = this.notRead; }
  /** The entry at a path in a tree, null when the path is absent, or undefined when a bound stopped the read. */
  async #at(root: ObjectId, path: Uint8Array): Promise<TreeEntry | null | undefined> {
    let tree: ObjectId | null = root;
    let entry: TreeEntry | null = null, at = 0;
    while (at <= path.length) {
      let end = path.indexOf(0x2f, at);
      if (end < 0) end = path.length;
      const name = nameKey(path.subarray(at, end));
      if (tree === null) return null;
      let listed: Map<string, TreeEntry> | null | undefined = this.#trees.get(tree);
      if (listed === undefined) {
        const read: TreeEntry[] | null = await this.entries(tree, shownPath(path.subarray(0, at)));
        listed = read === null ? null : new Map(read.map(item => [nameKey(item.name), item]));
        this.#trees.set(tree, listed);
      }
      if (listed === null) return undefined;
      entry = listed.get(name) ?? null;
      if (entry === null) return null;
      tree = entry.kind === "tree" ? entry.id : null;
      at = end + 1;
    }
    return entry;
  }
  protected override async file(path: Uint8Array, before: TreeEntry | null, after: TreeEntry | null): Promise<void> {
    const shown = this.reach(path);
    if (shown === null) return;
    const holder = after ? this.#to.integration : this.#from.integration;
    const bases = this.#bases;
    const first = bases ? await this.#at(bases.from, path) : null, second = bases ? await this.#at(bases.to, path) : null;
    if (first === undefined || second === undefined) return;
    if (!bases || sameEntry(first, second)) {
      this.sink = this.edited;
      this.list(path, shown, holder);
      const patch = await this.patch(shown, before, after);
      if (patch === null) { if (!this.stopped) this.reached(); return; }
      if (this.emit(...patch.head)) { this.counts.edited++; this.emitBody(patch); }
      return;
    }
    if (sameEntry(before, first) && sameEntry(after, second)) {
      this.sink = this.baseOnly;
      if (this.emit(`${shown}\n`)) { this.counts.baseOnly++; this.reached(); }
      return;
    }
    this.sink = this.mixed;
    this.list(path, shown, holder);
    const older = await this.patch(shown, first, before), newer = older === null ? null : await this.patch(shown, second, after);
    if (older === null || newer === null) { if (!this.stopped) this.reached(); return; }
    if (sameKey(older.key, newer.key)) {
      this.sink = this.carried;
      if (this.emit(`${shown}\n`)) { this.counts.carried++; this.reached(); }
      return;
    }
    this.counts.mixed++;
    const label = (who: string, commit: ObjectId, base: ObjectId) => `${who}'s patch of ${shown}, from base ${base} to integration ${commit}:\n`;
    const firstName = `${this.#fromLabel}'s patch`, secondName = `${this.#toLabel}'s patch`;
    if (!this.emit(label(this.#fromLabel, this.#from.integration, this.#from.base))) return;
    if (!this.#patchOrWords(older, this.#fromLabel, firstName, secondName)) return;
    this.reached(); this.onPatch(secondName, secondName);
    if (!this.emit(label(this.#toLabel, this.#to.integration, this.#to.base))) return;
    if (this.#patchOrWords(newer, this.#toLabel, secondName, null)) this.reached();
  }
  #patchOrWords(patch: Patch, who: string, name: string, next: string | null): boolean {
    if (!patch.head.length) return this.emit(`${who} does not change this file.\n`);
    if (!this.emit(...patch.head)) return false;
    this.onPatch(name, next);
    return this.emitBody(patch);
  }
}
/** Room kept for the summary and the headings of an interdiff's sections. */
const SECTIONS_BYTES = 2048;

/**
 * What changed from one version of a change to another. Each version is a base and an integration.
 *
 * When both versions name one base, the answer is the diff between the two integrations. When a version names a new base, the
 * answer compares each changed path across all four commits, and puts it in one class of `InterdiffWalk`. It never attributes a
 * line by a guess: a path that the four commits cannot separate stays in the "cannot separate" section, with both patches.
 */
export async function boundedInterdiff(source: GitSource, from: VersionPoints, to: VersionPoints, labels: { from: string; to: string } = { from: "From", to: "To" }, bounds: DiffBounds = DIFF_BOUNDS, now: () => number = Date.now): Promise<BoundedInterdiff> {
  const a = { base: objectId(from.base, "base"), integration: objectId(from.integration, "integration") };
  const b = { base: objectId(to.base, "base"), integration: objectId(to.integration, "integration") };
  const rebased = a.base !== b.base;
  const head = `Interdiff between two versions of one change.\n${labels.from}: base ${a.base}, integration ${a.integration}\n${labels.to}: base ${b.base}, integration ${b.integration}\n`;
  const method = rebased
    ? `${labels.to} names a new base. So this interdiff compares each changed path across all four commits. Files that only the new base changed are named and not shown.\n`
    : `Both versions name one base, so every line below comes from the change. This interdiff compares the two integrations.\n`;
  const walk = new InterdiffWalk(new Reader(source, { ...READ_BOUNDS, treeBytes: bounds.treeBytes, blobBytes: bounds.blobBytes }), bounds, now, bytesOf(head) + bytesOf(method) + SECTIONS_BYTES, a, b, labels);
  // The newest commit first: its pack is likeliest to hold the others.
  const newer = await walk.root(b.integration, "version's integration");
  const older = newer === null ? null : await walk.root(a.integration, "earlier version's integration");
  const secondBase = older === null ? null : await walk.root(b.base, "version's base");
  const firstBase = secondBase === null ? null : rebased ? await walk.root(a.base, "earlier version's base") : secondBase;
  if (newer !== null && older !== null && secondBase !== null && firstBase !== null) {
    if (rebased) walk.setBases(firstBase, secondBase);
    await walk.tree(older, newer, new Uint8Array(), 0);
  }
  const { edited, mixed, carried, baseOnly } = walk.counts;
  const truncated = walk.why !== null, leftOut = walk.leftOut;
  const summary = rebased ? [
    `Edited by ${labels.to}, shown below: ${plural(edited, "file")}.`,
    `Cannot separate from the new base, shown below: ${plural(mixed, "file")}.`,
    `The same edit as ${labels.from} on the new base, named below: ${plural(carried, "file")}.`,
    `Changed only by the new base, named below: ${plural(baseOnly, "file")}.`,
    ...(!truncated && edited + mixed === 0 ? [`${labels.to} makes no edit of its own: every difference comes from the new base or repeats ${labels.from}'s edit.`] : []),
  ].join("\n") + "\n" : !truncated && walk.files === 0 ? "No difference: the two integrations hold the same files.\n" : "";
  const section = (title: string, lines: readonly string[]) => lines.length ? `\n${title}\n${lines.join("")}` : "";
  const body = rebased ? [
    section(`Edited by ${labels.to}. The new base did not change these files:`, walk.edited),
    section(`Cannot separate. The new base and this change both touch these files, and the two versions' patches differ. A difference between the two patches can come from the new base or from ${labels.to}. Read both patches:`, walk.mixed),
    section(`The same edit as ${labels.from} on the new base. These files show no lines:`, walk.carried),
    section("Changed only by the new base. These files show no lines:", walk.baseOnly),
    section("Not read. A bound kept these out of every group:", walk.notRead),
  ].join("") : walk.edited.length ? `\n${walk.edited.join("")}` : "";
  const closing = truncated ? `truncated: ${walk.why}. Left out: ${leftOut}. This interdiff does not show the whole change.\n` : "";
  return { from: a, to: b, rebased, files: walk.files, edited, mixed, carried, baseOnly, text: head + method + summary + body + closing, truncated, leftOut, paths: walk.paths };
}

export interface BoundedFile {
  commit: ObjectId;
  /** The path, safe to display. */
  path: string;
  /** What the commit holds at the path. */
  kind: "text" | "binary" | "absent" | "directory" | "submodule" | "omitted";
  /** The blob or tree, when the commit holds one. */
  object: ObjectId | null;
  /** Lines of a text file, and how many the answer shows. */
  lines: number;
  shown: number;
  text: string;
  truncated: boolean;
  leftOut: string | null;
}

/** One file at one exact commit. The text keeps the file's lines exact, so read it as data. */
export async function boundedFile(source: GitSource, commitId: string, path: Uint8Array, bounds: DiffBounds = DIFF_BOUNDS, now: () => number = Date.now): Promise<BoundedFile> {
  const commit = objectId(commitId, "commit"), shown = shownPath(path);
  const reader = new Reader(source, { ...READ_BOUNDS, treeBytes: bounds.treeBytes, blobBytes: bounds.blobBytes });
  const ends = now() + bounds.milliseconds;
  const answer = (kind: BoundedFile["kind"], object: ObjectId | null, words: string, lines = 0, kept = 0, why: string | null = null, leftOut: string | null = null): BoundedFile => ({
    commit, path: shown, kind, object, lines, shown: kept, truncated: why !== null, leftOut,
    text: `File at an exact commit.\nCommit: ${commit}\nPath: ${shown}\n${object ? `Object: ${object}\n` : ""}${words}${why ? `truncated: ${why}. Left out: ${leftOut}. This view does not show the whole file.\n` : ""}`,
  });
  const over = (why: string, left: string) => answer("omitted", null, "", 0, 0, why, left);
  let tree: ObjectId;
  try { tree = (await reader.commit(commit, "file's")).tree; }
  catch (error) {
    if (!(error instanceof GitRefusal) || error.reason !== "too-large") throw error;
    return over("the commit or the pack that holds it is over the read bound", "the whole file");
  }
  const names: Uint8Array[] = [];
  for (let at = 0; at <= path.length;) { let end = path.indexOf(0x2f, at); if (end < 0) end = path.length; names.push(path.subarray(at, end)); at = end + 1; }
  let entry: TreeEntry | null = null, objects = 1;
  for (const [depth, name] of names.entries()) {
    if (depth > 0 && entry?.kind !== "tree") return answer("absent", null, "This commit holds no file at this path.\n");
    if (objects++ >= bounds.objects || now() >= ends || depth > bounds.depth) return over("the read reached its bound before it reached the path", "the whole file");
    let listed: TreeEntry[];
    try { listed = parseTree(await reader.object(entry?.id ?? tree, "tree")); }
    catch (error) {
      if (!(error instanceof GitRefusal) || error.reason !== "too-large") throw error;
      return over("a tree on the path is over its bound", "the whole file");
    }
    entry = listed.find(item => nameKey(item.name) === nameKey(name)) ?? null;
    if (entry === null) return answer("absent", null, "This commit holds no file at this path.\n");
  }
  if (entry === null) return answer("absent", null, "This commit holds no file at this path.\n");
  if (entry.kind === "tree") return answer("directory", entry.id, "This path is a directory at this commit.\n");
  if (entry.kind === "gitlink") return answer("submodule", entry.id, "This path is a submodule at this commit.\n");
  let data: Uint8Array;
  try { data = await reader.blob(entry.id); }
  catch (error) {
    if (!(error instanceof GitRefusal) || error.reason !== "too-large") throw error;
    return { ...over(`the file is over its bound of ${bounds.blobBytes} bytes`, "the whole file"), object: entry.id };
  }
  const text = textOf(data);
  if (text === null) return answer("binary", entry.id, `This file holds binary data: ${data.length} bytes. It shows no lines.\n`);
  const all = linesOf(text), head = `Lines: ${all.length}, ${data.length} bytes.\n\n`;
  const room = bounds.textBytes - CLOSING_BYTES - bytesOf(head) - bytesOf(`File at an exact commit.\nCommit: ${commit}\nPath: ${shown}\nObject: ${entry.id}\n`);
  let used = 0, kept = 0;
  for (const line of all) { const size = bytesOf(line); if (used + size > room) break; used += size; kept++; }
  const lines = all.slice(0, kept).join("");
  const ended = kept > 0 && !lines.endsWith("\n") ? "\n" : "";
  if (kept === all.length) return answer("text", entry.id, head + lines + ended, all.length, kept);
  return answer("text", entry.id, head + lines + ended, all.length, kept, `the text reached its bound of ${bounds.textBytes} bytes`, kept === 0 ? `all ${all.length} lines` : `lines ${kept + 1} to ${all.length} of ${all.length}`);
}

/** One pack of a commit's closure. A larger repository answers "truncated". */
const DIFF_PACK_BYTES = 32 * 1024 * 1024;
const DIFF_READ_MS = 15_000;
/** One source for one one-time read credential, over smart HTTP. The credential goes only to `remote`, in the header of the host's form. */
function credentialSource(remote: string, credential: string, fetch?: (request: Request) => Promise<Response>): SmartHttpSource {
  const authorization = new URL(remote).hostname === "github.com" ? `Basic ${btoa(`x-access-token:${credential}`)}` : `Bearer ${credential}`;
  return new SmartHttpSource({ remote, authorization, maxBytes: DIFF_PACK_BYTES, bounds: READ_BOUNDS, timeoutMs: DIFF_READ_MS, ...(fetch ? { fetch } : {}) });
}
/** A refusal names the reason and keeps none of the host's text. */
async function unavailableOr<T>(read: () => Promise<T>): Promise<T | { unavailable: string }> {
  try { return await read(); }
  catch (error) { return { unavailable: error instanceof GitRefusal ? `${error.reason}: ${error.what}` : "the host gave no readable answer" }; }
}
/** One diff with a one-time read credential. The credential never goes into the answer. */
export function diffWithCredential(read: { remote: string; credential: string; base: string; integration: string }, fetch?: (request: Request) => Promise<Response>): Promise<BoundedDiff | { unavailable: string }> {
  return unavailableOr(() => boundedDiff(credentialSource(read.remote, read.credential, fetch), read.base, read.integration));
}
/** One interdiff with a one-time read credential. The credential never goes into the answer. */
export function interdiffWithCredential(read: { remote: string; credential: string; from: VersionPoints; to: VersionPoints; labels: { from: string; to: string } }, fetch?: (request: Request) => Promise<Response>): Promise<BoundedInterdiff | { unavailable: string }> {
  return unavailableOr(() => boundedInterdiff(credentialSource(read.remote, read.credential, fetch), read.from, read.to, read.labels));
}
/** One file at one commit with a one-time read credential. The credential never goes into the answer. */
export function fileWithCredential(read: { remote: string; credential: string; commit: string; path: Uint8Array }, fetch?: (request: Request) => Promise<Response>): Promise<BoundedFile | { unavailable: string }> {
  return unavailableOr(() => boundedFile(credentialSource(read.remote, read.credential, fetch), read.commit, read.path));
}
