import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** An empty range still runs tests. A rename exposes both old and new paths. */
export function gateTestDecision(changedPaths) {
  if (!Array.isArray(changedPaths) || changedPaths.some(path => typeof path !== "string" || !path)) {
    throw Error("The gate needs the complete changed-path list.");
  }
  return { skip: changedPaths.length > 0 && changedPaths.every(path => path.startsWith("notes/")) };
}

/** BASE is the gate's merge base with origin/main, not the previous commit. */
export function gateTestSelection({ cwd = process.cwd(), base, head = "HEAD" }) {
  if (!base || !head) throw Error("The gate needs a base and head; fetch origin/main first.");
  const git = args => execFileSync("git", args, { cwd, maxBuffer: 64 * 1024 * 1024 });
  const decode = bytes => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const commit = ref => decode(git(["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`])).trim();
  const start = commit(base), tip = commit(head);
  git(["merge-base", "--is-ancestor", start, tip]);
  const names = decode(git(["diff", "--no-ext-diff", "--no-renames", "--name-only", "-z", start, tip]));
  const changedPaths = names ? names.split("\0") : [];
  if (changedPaths.length && changedPaths.pop() !== "") throw Error("Incomplete Git changed-path output.");
  return { ...gateTestDecision(changedPaths), base: start, head: tip, changedPaths };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4) throw Error("Usage: gate-test-selection.mjs BASE HEAD");
    console.log(gateTestSelection({ base: process.argv[2], head: process.argv[3] }).skip ? "notes-only" : "full");
  } catch (error) {
    console.error(`test selection: ${error.message}`);
    process.exitCode = 2;
  }
}
