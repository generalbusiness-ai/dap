import { afterAll, beforeAll, expect, test } from "vitest";
import { DIFF_BOUNDS, boundedDiff, type DiffBounds } from "../src/diff.ts";
import { GitRefusal, repositorySource, type GitSource } from "../src/index.ts";
import { bare, blob, cleanup, commit, git, program, put, tree } from "./support/repo.ts";

afterAll(cleanup);

// Real local Git objects, read by object ID. Real `git apply` is the oracle for the text. A local repository is not a host.
let dir: string;
let source: GitSource;
let f: Record<"base" | "next" | "many" | "large" | "binary" | "long", string>;
const lines = (count: number, word = "line") => Array.from({ length: count }, (_, n) => `${word} ${n}\n`).join("");
beforeAll(() => {
  dir = bare();
  source = repositorySource(program(), dir);
  const kept = blob(dir, lines(40)), gone = blob(dir, "gone\n"), inner = blob(dir, "inner\n");
  const sub = tree(dir, [`100644 blob ${inner}\tinner`]);
  const base = commit(dir, tree(dir, [`040000 tree ${sub}\tdir`, `100644 blob ${gone}\tgone`, `100644 blob ${kept}\tkept`]), []);
  const edited = blob(dir, lines(40).replace("line 20\n", "line twenty\n")), added = blob(dir, "added, with no last newline"), innerNext = blob(dir, "inner next\n");
  const subNext = tree(dir, [`100644 blob ${innerNext}\tinner`, `100644 blob ${added}\tnew`]);
  const next = commit(dir, tree(dir, [`040000 tree ${subNext}\tdir`, `100644 blob ${edited}\tkept`]), [base]);
  const many = commit(dir, tree(dir, Array.from({ length: 6 }, (_, n) => `100644 blob ${blob(dir, `file ${n}\n`)}\tfile-${n}`)), []);
  const long = commit(dir, tree(dir, [`100644 blob ${blob(dir, lines(4000, "a long line of the change"))}\tkept`]), [base]);
  const large = commit(dir, tree(dir, [`100644 blob ${blob(dir, lines(30000))}\tkept`]), [base]);
  const binary = commit(dir, tree(dir, [`100644 blob ${put(dir, "blob", new Uint8Array([1, 0, 2]))}\tkept`]), [base]);
  f = { base, next, many, large, binary, long };
});

/** The tree that `git apply` makes from the diff's text on top of the base commit, in an index of its own. */
const applied = (base: string, patch: string): string => {
  git(dir, ["read-tree", base]);
  git(dir, ["apply", "--cached", "-p1", "--whitespace=nowarn", "-"], patch);
  return git(dir, ["write-tree"]);
};

test("the text of a bounded diff applies with git to the exact tree of the integration commit", async () => {
  const answer = await boundedDiff(source, f.base, f.next);
  expect(answer).toMatchObject({ base: f.base, integration: f.next, files: 4, truncated: false });
  expect(answer.text).not.toContain("truncated");
  expect(answer.text).toContain("--- a/gone\n+++ /dev/null\n");
  expect(answer.text).toContain("--- /dev/null\n+++ b/dir/new\n");
  expect(answer.text).toContain("\\ No newline at end of file\n");
  expect(answer.text).toContain("-line 20\n+line twenty\n");
  expect(applied(f.base, answer.text)).toBe(git(dir, ["rev-parse", `${f.next}^{tree}`]));
});

test("over a bound the answer says truncated and keeps what it read; a binary file is no truncation", async () => {
  const over = async (head: string, bounds: Partial<DiffBounds>) => boundedDiff(source, f.base, head, { ...DIFF_BOUNDS, ...bounds });
  const files = await over(f.many, { files: 2 });
  expect([files.truncated, files.files, files.text.split("\n").at(-2)]).toEqual([true, 2, "truncated: the answer reached its bound of 2 files. This diff does not show the whole change."]);
  const text = await boundedDiff(source, f.base, f.long);
  expect([text.truncated, text.text.endsWith("This diff does not show the whole change.\n")]).toEqual([true, true]);
  expect(text.text).toContain("truncated: the text reached its bound of 40960 bytes");
  expect(new TextEncoder().encode(JSON.stringify(text.text)).length).toBeLessThanOrEqual(DIFF_BOUNDS.textBytes);
  const large = await over(f.large, { blobBytes: 2048 });
  expect([large.truncated, large.text]).toEqual([true, expect.stringContaining("omitted: the file kept is too large to read\n")]);
  expect(large.text).toContain("truncated: the file kept is over its bound of 2048 bytes");
  const objects = await over(f.next, { objects: 2 });
  expect([objects.truncated, objects.text]).toEqual([true, "truncated: the read reached its bound of 2 objects. This diff does not show the whole change.\n"]);
  let clock = 0;
  const late = await boundedDiff(source, f.base, f.next, DIFF_BOUNDS, () => (clock += DIFF_BOUNDS.milliseconds));
  expect([late.truncated, late.text]).toEqual([true, expect.stringContaining("truncated: the read reached its bound of 20000 ms")]);
  const binary = await boundedDiff(source, f.base, f.binary);
  expect([binary.truncated, binary.text]).toEqual([false, expect.stringContaining("Binary files a/kept and b/kept differ\n")]);
});

test("a read over the transport's bound says truncated; a missing object is a refusal and no invented change", async () => {
  const tooLarge: GitSource = { ...source, object: async () => { throw new GitRefusal("too-large", "upload response"); } };
  const pack = await boundedDiff(tooLarge, f.base, f.next);
  expect([pack.truncated, pack.files, pack.text]).toEqual([true, 0, "truncated: the base commit or the pack that holds it is over the read bound. This diff does not show the whole change.\n"]);
  const absent: GitSource = { ...source, object: async (id, limit) => id === f.next ? null : source.object(id, limit) };
  await expect(boundedDiff(absent, f.base, f.next)).rejects.toMatchObject({ reason: "missing-object" });
  await expect(boundedDiff(source, "not an id", f.next)).rejects.toBeInstanceOf(GitRefusal);
});

/** A commit whose tree holds one file under a name of exact bytes. */
const named = (name: Uint8Array, content: string): string => commit(dir, put(dir, "tree", Buffer.concat([Buffer.from("100644 "), name, Buffer.from([0]), Buffer.from(blob(dir, content), "hex")])), [f.base]);
const utf8Name = (name: string): Uint8Array => new TextEncoder().encode(name);
const jsonBytes = (text: string): number => new TextEncoder().encode(JSON.stringify(text)).length;

test("a long path stays inside the text bound, with its closing line, and the answer says truncated", async () => {
  for (const size of [60_000, 90_000]) {
    const answer = await boundedDiff(source, f.base, named(utf8Name("n".repeat(size)), "text\n"));
    expect(jsonBytes(answer.text)).toBeLessThanOrEqual(DIFF_BOUNDS.textBytes);
    expect(answer.truncated).toBe(true);
    expect(answer.text).toContain(`... (${size} bytes)`);
    expect(answer.text).toContain("truncated: a path of");
  }
  // The bound that names the path repeats only its start, in the worst case for JSON: every character escapes.
  const escapes = new Uint8Array(60_000).fill(0x01);
  const over = await boundedDiff(source, f.base, named(escapes, lines(4000)), { ...DIFF_BOUNDS, blobBytes: 2048 });
  expect(over.text).toContain("omitted: the file \\x01");
  expect(jsonBytes(over.text)).toBeLessThanOrEqual(DIFF_BOUNDS.textBytes);
  // A path under the line bound, in which every character escapes, and a bound that names it: the closing line repeats only its start.
  const named1000 = await boundedDiff(source, f.base, named(new Uint8Array(1000).fill(0x01), lines(4000)), { ...DIFF_BOUNDS, blobBytes: 2048, textBytes: 8192 });
  expect(named1000.text).toContain("truncated: the file \\x01");
  expect(jsonBytes(named1000.text)).toBeLessThanOrEqual(8192);
  // Text and closing line together meet a small bound as well.
  const small = await boundedDiff(source, f.base, named(utf8Name("n".repeat(60_000)), lines(4000)), { ...DIFF_BOUNDS, textBytes: 8192 });
  expect(jsonBytes(small.text)).toBeLessThanOrEqual(8192);
  expect(small.text.endsWith("This diff does not show the whole change.\n")).toBe(true);
});

test("an entry name of half a megabyte truncates and does not throw", async () => {
  // A throw here reads as "the host gave no readable answer" to the caller, so a thrown error is the failure this case names.
  const read = (name: Uint8Array) => boundedDiff(source, f.base, named(name, "text\n")).catch((error: unknown) => ({ threw: String(error), truncated: false, files: 0, text: "" }));
  const valid = await read(utf8Name("n".repeat(500_000)));
  expect([valid.truncated, valid.files, "threw" in valid]).toEqual([true, 4, false]);
  const notUtf8 = await read(new Uint8Array(500_000).fill(0xfe));
  expect(notUtf8.truncated).toBe(true);
  expect(notUtf8.text).toContain("\\xfe\\xfe");
});

test("a shown path escapes controls, bidi characters and the backslash, so no name reads as another; file text stays exact", async () => {
  const line = async (name: Uint8Array): Promise<string> => (await boundedDiff(source, f.base, named(name, "text\n"))).text.split("\n").find(text => text.startsWith("+++ b/"))!.slice("+++ b/".length);
  // A real newline, and the four characters that its escape is made of.
  const real = await line(utf8Name("a\nb")), literal = await line(utf8Name("a\\x0ab"));
  expect([real, literal]).toEqual(["a\\x0ab", "a\\x5cx0ab"]);
  expect(await line(utf8Name("a\u009bb"))).toBe("a\\u009bb");
  expect(await line(utf8Name("a\u202eb\u2066c\u200fd\u061ce\u2028f"))).toBe("a\\u202eb\\u2066c\\u200fd\\u061ce\\u2028f");
  expect(await line(utf8Name("a\u001bb\u007fc"))).toBe("a\\x1bb\\x7fc");
  // One byte that is not UTF-8 shows the whole name byte by byte, and its backslash escapes too.
  expect(await line(new Uint8Array([0x61, 0x5c, 0x9b]))).toBe("a\\x5c\\x9b");
  // Ordinary non-ASCII names stay readable.
  expect(await line(utf8Name("caf\u00e9/\u6587".replace("/", "-")))).toBe("caf\u00e9-\u6587");
  // File text keeps these characters, because the patch must reproduce the file.
  const text = await boundedDiff(source, f.base, named(utf8Name("plain"), "esc \u001b[31m cr\r bidi \u202e\n"));
  expect(text.text).toContain("+esc \u001b[31m cr\r bidi \u202e\n");
});
