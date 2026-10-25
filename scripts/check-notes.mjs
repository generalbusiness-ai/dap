/** Warn about new implementation-note and evidence paths without changing Git. */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const prefix = "notes/implementation/";
const evidence = prefix + "evidence/";
const maximumBytes = 40_960;
const decoder = new TextDecoder("utf-8", { fatal: true });
const git = (cwd, args) => execFileSync("git", ["--literal-pathspecs", ...args], { cwd, maxBuffer: 64 * 1024 * 1024 });
const commit = (cwd, ref) => {
  if (!ref) throw Error("A commit base or head is missing; fetch origin/main before the gate.");
  return decoder.decode(git(cwd, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`])).trim();
};

/** Inspect the committed base-to-head file changes, never working-tree bytes.
 * Rename detection is off: a newly named evidence path is an addition.
 * An unchanged historical file and a deleted file produce no warning. */
export function checkNotes({ cwd = process.cwd(), base, head = "HEAD" }) {
  const start = commit(cwd, base), tip = commit(cwd, head);
  git(cwd, ["merge-base", "--is-ancestor", start, tip]);
  const bytes = git(cwd, ["diff", "--no-ext-diff", "--no-renames", "--name-status", "-z", "--diff-filter=AMT", start, tip, "--", prefix]);
  const fields = decoder.decode(bytes).split("\0");
  if (fields.pop() !== "") throw Error("Incomplete Git changed-path output.");
  if (fields.length % 2 !== 0) throw Error("Invalid Git changed-path output.");
  const warnings = [];
  for (let i = 0; i < fields.length; i += 2) {
    const status = fields[i], path = fields[i + 1];
    if (!["A", "M", "T"].includes(status) || !path.startsWith(prefix)) throw Error("Unexpected Git changed path.");
    const size = Number(decoder.decode(git(cwd, ["cat-file", "-s", `${tip}:${path}`])).trim());
    if (!Number.isSafeInteger(size) || size < 0) throw Error("Invalid Git object size.");
    if (size > maximumBytes) warnings.push({ rule: "large-note", path, bytes: size });
    if (status === "A" && path.startsWith(evidence) && !path.endsWith(".manifest.json")) {
      warnings.push({ rule: "non-manifest-evidence", path });
    }
  }
  return { warnings };
}

function main(args) {
  if (args.length !== 2) throw Error("Usage: check-notes.mjs BASE HEAD");
  const report = checkNotes({ base: args[0], head: args[1] });
  for (const warning of report.warnings) {
    // JSON quoting keeps a path containing a line break on one warning line.
    const path = JSON.stringify(warning.path);
    console.log(warning.rule === "large-note"
      ? `warning: notes: ${path} is ${warning.bytes} bytes (limit ${maximumBytes})`
      : `warning: notes: new evidence path ${path} does not end in .manifest.json`);
  }
  console.log(`notes: ${report.warnings.length} warnings`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`notes: ${error.message}`); process.exitCode = 2; }
}
