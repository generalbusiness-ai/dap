/**
 * The names that reach a Git command, a Git host or a URL: object IDs, ref
 * names and remotes. Each is checked here before it is used anywhere else in
 * this package. A value that fails is refused by a named reason, and the
 * refusal never holds the value: a value may be another party's text, or a
 * URL that carries a credential (authority note, section 5.3).
 *
 * The review of the earlier code is `notes/reviews/2026-10-05-i3-git-review.md`. It
 * says, check by check, what each function here refuses and why.
 */

export { GitRefusal, MAX_REF_NAME, ZERO_ID, branchRef, isObjectId, objectId, refName, unreadableGit } from "./pure-names.ts";
export type { GitReason, ObjectId } from "./pure-names.ts";
import { GitRefusal } from "./pure-names.ts";

/**
 * Which remotes a caller may name. `https` is the production value: a Git
 * host over HTTPS and nothing else. `local` also takes an absolute path and
 * a plain-HTTP URL of the loopback address: a repository on this machine,
 * for the runner's checkout and for tests. No production entry of a
 * publisher passes `local`.
 */
export type Transport = "https" | "local";

/**
 * `value` as a remote, or a refusal. A remote is never a bare word, a
 * relative path or a transport helper (`ext::...`), so Git cannot read it as
 * an option or run a program for it. A URL has no user, no password, no
 * query and no fragment: no credential is in a URL (section 5.3), and a URL
 * with a user or a password is refused `credential-in-url`.
 */
export function remoteUrl(value: unknown, transport: Transport, what = "remote"): string {
  const bad = () => new GitRefusal("bad-remote", what);
  // No control character, space or backslash, in a path or in a URL: none is needed, and each has a meaning to some program on the way.
  if (typeof value !== "string" || value.length === 0 || value.length > 2048 || /[\u0000- \u007f\\]/.test(value)) throw bad();
  if (value.startsWith("/")) {
    if (transport !== "local" || value.includes("//") || value.split("/").some((part) => part === ".." || part === ".")) throw bad();
    return value;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw bad();
  }
  if (url.username !== "" || url.password !== "") throw new GitRefusal("credential-in-url", what);
  const loopback = transport === "local" && url.protocol === "http:" && url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !loopback) || url.search !== "" || url.hash !== "" || value.includes("?") || value.includes("#") || value.includes("@")) throw bad();
  // The text is used as it was given, so it must be the URL's own form: no `..` that a parser folds away, and no helper prefix.
  if (url.href !== value && url.href !== `${value}/`) throw bad();
  return value;
}
