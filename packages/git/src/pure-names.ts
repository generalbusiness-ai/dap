/** Pure Git object/ref validation and shared refusal identity. No URL or host API. */

/** Every reason this package refuses by. A reason is a fixed word, safe to record and to show. */
export type GitReason =
  // names
  | "bad-object-id" | "unsupported-object-format" | "bad-ref-name" | "bad-remote" | "credential-in-url"
  // objects, as read
  | "missing-object" | "wrong-type" | "wrong-size" | "hash-mismatch" | "malformed-commit" | "repeated-header" | "malformed-tree" | "unknown-mode" | "gitlink"
  | "too-large" | "unreadable"
  // what a push sends
  | "same-commit" | "tree-mismatch" | "parent-mismatch" | "incomplete" | "not-a-branch"
  // the files of a snapshot
  | "bad-path" | "path-conflict";

/**
 * A refusal by this package. `what` is a fixed word of the caller's own, such
 * as "parent" or "the base": it says which argument or object was refused.
 * Neither member is ever the refused value, a program's output or a host's
 * text.
 */
export class GitRefusal extends Error {
  readonly reason: GitReason;
  readonly what: string;
  constructor(reason: GitReason, what: string) {
    super(`${reason}: ${what}`);
    this.name = "GitRefusal";
    this.reason = reason;
    this.what = what;
  }
}

/** Construct the shared unreadable result; callers throw or reject it. */
export const unreadableGit = (what: string): GitRefusal => new GitRefusal("unreadable", what);

/**
 * A Git object ID in the SHA-1 object format: 40 lower-case hex characters.
 * No adopted text names the hash function of the canonical repository (I3
 * deltas, entry EG1). The staged ref's name and the ancestry record hold a
 * commit ID as text, and the earlier code and every recorded fact are SHA-1.
 * So this package reads SHA-1 repositories only.
 */
export type ObjectId = string;

/** The value that a ref update states for "no such ref". It is never the ID of an object. */
export const ZERO_ID: ObjectId = "0000000000000000000000000000000000000000";

const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export const isObjectId = (value: unknown): value is ObjectId => typeof value === "string" && SHA1.test(value) && value !== ZERO_ID;

/**
 * `value` as an object ID, or a refusal. Upper-case hex is refused: Git
 * writes lower case, and an ID in an entry is compared as text. An ID of 64
 * hex characters is a SHA-256 object ID: `unsupported-object-format`. The
 * zero ID names no object.
 */
export function objectId(value: unknown, what: string): ObjectId {
  if (isObjectId(value)) return value;
  throw new GitRefusal(typeof value === "string" && SHA256.test(value) ? "unsupported-object-format" : "bad-object-id", what);
}

/** The longest ref name taken, in characters. A stated constant of this package: Git sets none, and no adopted text does (I3 deltas, entry EG3). */
export const MAX_REF_NAME = 255;

const REF_CHARS = /^[A-Za-z0-9._\/-]+$/;

/**
 * `value` as a full ref name, or `bad-ref-name`. The rules are those of
 * `git check-ref-format`, and narrower where that costs nothing:
 *
 * - it begins `refs/` and has a further component, so it never begins with
 *   `-` and is never one level;
 * - only ASCII letters, digits, `.`, `_`, `-` and `/`. That excludes what Git
 *   excludes: a control character, a space, `~`, `^`, `:`, `?`, `*`, `[`,
 *   `\` and the sequence `@{`. It also excludes every other character, which
 *   Git allows and no ref of the design uses;
 * - no `..`, no `//`, no leading or trailing `/`, no trailing `.`;
 * - no component begins with `.` or ends with `.lock`;
 * - no component begins with `-`. Git allows that below `refs/` and refuses
 *   it for a branch name. Here it is refused everywhere.
 */
export function refName(value: unknown, what: string): string {
  const bad = () => new GitRefusal("bad-ref-name", what);
  if (typeof value !== "string" || value.length > MAX_REF_NAME || !value.startsWith("refs/") || !REF_CHARS.test(value)) throw bad();
  if (value.includes("..") || value.endsWith(".")) throw bad();
  const parts = value.split("/");
  if (parts.length < 3) throw bad();
  for (const part of parts) if (part === "" || part.startsWith(".") || part.startsWith("-") || part.endsWith(".lock")) throw bad();
  return value;
}

/** `value` as a branch's full ref name, `refs/heads/...`, or a refusal. */
export function branchRef(value: unknown, what: string): string {
  const ref = refName(value, what);
  if (!ref.startsWith("refs/heads/")) throw new GitRefusal("not-a-branch", what);
  return ref;
}
