/** Bound the messages introduced by a branch without changing Git history. */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const letters = /^\p{L}$/u;
const hex = /^[A-Fa-f0-9]$/;
const digit = /^[0-9]$/;

/** Find adjacent words and hashes within maximal Unicode-letter/ASCII-digit tokens.
 * A token that is entirely hexadecimal is a bare hash, never a glued word.
 * Array scans keep the work linear even for a long body token. */
function gluedTokens(line) {
  const found = [];
  for (const [token] of line.matchAll(/[\p{L}0-9]+/gu)) {
    if (/^[A-Fa-f0-9]+$/.test(token)) continue;
    const points = [...token];
    const rightHex = Array(points.length + 1).fill(0);
    const rightLetters = Array(points.length + 1).fill(0);
    const nextDigit = Array(points.length + 1).fill(points.length);
    for (let i = points.length - 1; i >= 0; i--) {
      rightHex[i] = hex.test(points[i]) ? rightHex[i + 1] + 1 : 0;
      rightLetters[i] = letters.test(points[i]) ? rightLetters[i + 1] + 1 : 0;
      nextDigit[i] = digit.test(points[i]) ? i : nextDigit[i + 1];
    }
    let leftHex = 0, leftLetters = 0, lastDigit = -1;
    for (let i = 0; i < points.length; i++) {
      const prefix = leftLetters >= 3 && rightHex[i] >= 7 && nextDigit[i] < i + rightHex[i];
      const suffix = leftHex >= 7 && lastDigit >= i - leftHex && rightLetters[i] >= 3;
      if (prefix || suffix) { found.push(token); break; }
      leftHex = hex.test(points[i]) ? leftHex + 1 : 0;
      leftLetters = letters.test(points[i]) ? leftLetters + 1 : 0;
      if (digit.test(points[i])) lastDigit = i;
    }
  }
  return found;
}

/** Only a final, blank-separated block of Name: value lines is exempt.
 * A continuation or prose line makes that suffix ordinary body text. */
function checkedLines(message) {
  const lines = message.split(/\r?\n/);
  while (lines.length > 1 && lines.at(-1).trim() === "") lines.pop();
  let end = lines.length;
  const blank = lines.findLastIndex(line => line.trim() === "");
  if (blank >= 1 && blank < lines.length - 1
    && lines.slice(blank + 1).every(line => /^[A-Za-z][A-Za-z0-9-]*:[ \t]*.*$/.test(line))) end = blank;
  return { lines, checked: lines.slice(0, end) };
}

export function checkMessage(message, { subjectOnly = false } = {}) {
  const { lines, checked } = checkedLines(message);
  const issues = [];
  const length = [...lines[0]].length;
  if (length > 100) issues.push({ line: 1, rule: "subject-length", length });
  if (!subjectOnly && lines.length > 1 && lines[1].trim() !== "") {
    issues.push({ line: 2, rule: "body-separator" });
  }
  for (const [index, line] of (subjectOnly ? lines.slice(0, 1) : checked).entries()) {
    for (const token of gluedTokens(line)) issues.push({ line: index + 1, rule: "glued-hash", token });
  }
  return issues;
}

const git = (cwd, args, options = {}) => execFileSync("git", args, { cwd, ...options });
const commitId = (cwd, ref) => {
  if (!ref) throw Error("A commit base or head is missing; fetch origin/main before the gate.");
  return git(cwd, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], { encoding: "utf8" }).trim();
};

/** Read exact commit bodies with size framing, not message delimiters.
 * Include merge commits and side history. No commit or ref is written. */
export function readMessages({ cwd = process.cwd(), base, head = "HEAD", since }) {
  const tip = commitId(cwd, head);
  const args = ["rev-list", "--reverse"];
  if (since !== undefined) {
    if (base !== undefined || !since) throw Error("Choose a range or a subject-audit date.");
    args.push(`--since-as-filter=${since}`, tip);
  } else {
    const start = commitId(cwd, base);
    git(cwd, ["merge-base", "--is-ancestor", start, tip]);
    args.push(`${start}..${tip}`);
  }
  const ids = git(cwd, args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  if (!ids.length) return [];
  const bytes = git(cwd, ["cat-file", "--batch"], { input: ids.join("\n") + "\n", maxBuffer: 64 * 1024 * 1024 });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const result = [];
  let offset = 0;
  for (const id of ids) {
    const newline = bytes.indexOf(10, offset);
    if (newline < 0) throw Error("Incomplete Git object header.");
    const header = bytes.subarray(offset, newline).toString("ascii").split(" ");
    const size = Number(header[2]);
    if (header[0] !== id || header[1] !== "commit" || !Number.isSafeInteger(size) || size < 0) throw Error("Invalid Git commit frame.");
    const start = newline + 1, end = start + size;
    if (end >= bytes.length || bytes[end] !== 10) throw Error("Incomplete Git commit frame.");
    const body = bytes.subarray(start, end), separator = body.indexOf("\n\n");
    if (separator < 0) throw Error("Commit has no message separator.");
    result.push({ id, message: decoder.decode(body.subarray(separator + 2)) });
    offset = end + 1;
  }
  if (offset !== bytes.length) throw Error("Unexpected Git object output.");
  return result;
}

export function checkHistory(options) {
  const commits = readMessages(options);
  const subjectOnly = options.since !== undefined;
  return { checked: commits.length, subjectOnly, flagged: commits.flatMap(({ id, message }) => {
    const issues = checkMessage(message, { subjectOnly });
    return issues.length ? [{ id, subject: message.split(/\r?\n/, 1)[0], issues }] : [];
  }) };
}

function main(args) {
  const audit = args[0] === "--subjects-since";
  if (audit ? args.length !== 3 : args.length !== 2) throw Error("Usage: check-commit-messages.mjs BASE HEAD | --subjects-since DATE HEAD");
  const report = checkHistory(audit ? { since: args[1], head: args[2] } : { base: args[0], head: args[1] });
  if (audit) console.log(JSON.stringify(report, null, 2));
  else {
    for (const row of report.flagged) {
      for (const issue of row.issues) console.error(`${row.id} line ${issue.line}: ${issue.rule}${issue.length === undefined ? "" : ` (${issue.length} characters)`}${issue.token === undefined ? "" : `: ${issue.token}`}`);
    }
    console.log(`commit-messages: ${report.checked} checked, ${report.flagged.length} flagged`);
  }
  process.exitCode = report.flagged.length ? 1 : 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`commit-messages: ${error.message}`); process.exitCode = 2; }
}
