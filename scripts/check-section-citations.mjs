/** Check named section references without interpreting the rule they cite.
 * Unknown document names and unqualified references remain a review list. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "rolldown/parseAst";

export const REFERENCES = {
  contract: "notes/2026-10-04-scope-and-replay-contract.md",
  authority: "notes/2026-10-04-authority-effects-and-publication.md",
};
const number = String.raw`\d+(?:\.\d+)*[a-z]?`;
const section = new RegExp(String.raw`\bsections?\s+(${number})(?!\w|\.\d)`, "gi");
const continuation = new RegExp(String.raw`^\s*(,\s*(?:row\s+[A-Za-z][\w-]*\s*,\s*)?(?:(?:and|or)\s+)?|row\s+[A-Za-z][\w-]*\s*,\s*(?:(?:and|or)\s+)?|(?:and|or|to)\s+|[–−-]\s*|;\s*)(${number})(?!\w|\.\d)`, "i");
const javascript = /\.(?:[cm]?js|jsx|tsx?)$/;
const supported = /\.(?:[cm]?js|jsx|tsx?|jsonc|css|html|sh|md)$/;
const lineOf = (text, offset) => text.slice(0, offset).split("\n").length;
const blank = text => text.replace(/[^\r\n]/g, " ");
export const excerptHash = text => createHash("sha256").update(text).digest("hex");

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (["start", "end", "loc"].includes(key)) continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visit);
    else if (value && typeof value === "object") walk(value, visit);
  }
}

/** The parser identifies strings, regexes, JSX text, and template raw text.
 * Mask those spans before reading comments, preserving source line numbers.
 * Comments inside template expressions remain visible. No source executes. */
export function commentText(source, file) {
  let masked = source;
  if (javascript.test(file)) {
    const spans = [];
    walk(parseAst(source, { lang: /\.tsx$/.test(file) ? "tsx" : /\.jsx$/.test(file) ? "jsx" : "ts" }), node => {
      if (["Literal", "TemplateElement", "JSXText"].includes(node.type)) spans.push([node.start, node.end]);
    });
    for (const [start, end] of spans.sort((a, b) => b[0] - a[0])) masked = masked.slice(0, start) + blank(masked.slice(start, end)) + masked.slice(end);
  } else if (/\.(?:jsonc|css)$/.test(file)) {
    masked = source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, blank);
  }
  const comments = /\.html$/.test(file) ? /<!--[\s\S]*?-->/g
    : /\.sh$/.test(file) ? /^[ \t]*#.*$/gm : /\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g;
  let cursor = 0, result = "";
  for (const match of masked.matchAll(comments)) {
    result += blank(source.slice(cursor, match.index)) + source.slice(match.index, match.index + match[0].length);
    cursor = match.index + match[0].length;
  }
  return result + blank(source.slice(cursor));
}

function prose(source, file) {
  if (!file.endsWith(".md")) return commentText(source, file).replace(/^[ \t]*(?:\*|\/\/)[ \t]?/gm, match => " ".repeat(match.length));
  // Examples and fenced quotations are not prose citations. Preserve their
  // line numbers, and do not treat headings inside examples as sections.
  return source.replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm, blank);
}

export function sectionHeadings(source) {
  const result = new Map();
  for (const match of prose(source, "reference.md").matchAll(/^#{1,6}[ \t]+(\d+(?:\.\d+)*[a-z]?)(?:\.[ \t]+|[ \t]+|$)([^\n]*)$/gm)) {
    const key = match[1], rows = result.get(key) ?? [];
    rows.push({ line: lineOf(source, match.index), title: match[0].trim() });
    result.set(key, rows);
  }
  return result;
}

function documentNames(text, file, files) {
  const rows = [];
  for (const match of text.matchAll(/\bscope\s+contract\b|\bthe\s+contract(?=['’]s\s+(?:revision\s+\d+\s*,?\s*)?sections?\b)|\bauthority\s+note\b|\bauthority\s+revision\s+\d+\b|(?:\.\.\/|\.\/)?(?:[\w.-]+\/)+[\w.-]+\.md\b/gi)) {
    const value = match[0];
    const target = /^(?:scope|the)\s+contract$/i.test(value) ? REFERENCES.contract : /^authority\s+(?:note|revision\s+\d+)$/i.test(value) ? REFERENCES.authority
      : value.startsWith(".") ? posix.normalize(posix.join(posix.dirname(file), value)) : value;
    rows.push({ start: match.index, end: match.index + value.length, target, known: files.has(target) });
  }
  return rows;
}

function targetOf(text, offset, end, file, files, defaultDocument) {
  const separator = text.lastIndexOf("\n\n", offset);
  const paragraphEnd = text.indexOf("\n\n", end);
  const start = separator < 0 ? 0 : separator + 2, finish = paragraphEnd < 0 ? text.length : paragraphEnd;
  const paragraph = text.slice(start, finish), at = offset - start;
  const names = documentNames(paragraph, file, files);
  const before = names.filter(row => row.end <= at).at(-1);
  const after = names.find(row => row.start >= end - start);
  // A named document immediately after the number is also explicit: section
  // 3.3 of the authority note. An unrelated later paragraph supplies no owner.
  const following = after && /^\s+of\s+(?:the\s+)?$/i.test(paragraph.slice(end - start, after.start)) ? after : null;
  const prelude = before ? paragraph.slice(before.end, at) : "";
  const binding = /^(?:['’]s\s*\(?\s*)?[\s`,:]*(?:revision\s+\d+\s*,?\s*)?(?:\([a-f\d]{7,40}\)\s*,?\s*)?$/i;
  const bound = before && binding.test(prelude) ? before : null;
  const chosen = following ?? bound;
  const since = chosen ? paragraph.slice(chosen.end, at) : paragraph.slice(0, at);
  // A different unnamed plan, review, or note breaks inherited ownership.
  // The checker never chooses a document because its section number fits.
  const other = /\b(?:RFC\s+\d+|I[123]\s+(?:plan|deltas)|proof plan|plan\s+\d+|facts file|review|(?:the\s+)?(?:note|design)|lane forms)\b/i.test(since);
  if (other) return { reason: "another document is named without an exact path" };
  if (chosen) return chosen.known ? { target: chosen.target, nameStart: start + chosen.start } : { reason: "named document is not present: " + chosen.target };
  return defaultDocument ? { target: defaultDocument } : { reason: "no unambiguous document name" };
}

function range(first, last) {
  const a = first.split("."), b = last.split(".");
  if (a.length !== b.length || a.slice(0, -1).join(".") !== b.slice(0, -1).join(".") || !/^\d+$/.test(a.at(-1)) || !/^\d+$/.test(b.at(-1))) return null;
  const low = Number(a.at(-1)), high = Number(b.at(-1));
  if (high < low || high - low > 1000) return null;
  return Array.from({ length: high - low + 1 }, (_, n) => [...a.slice(0, -1), String(low + n)].join("."));
}

/** files contains the exact source texts. Test fixtures use this same path
 * as the CLI, including parser extraction and document/section resolution. */
export function checkCitations(files, findings = []) {
  for (const file of Object.values(REFERENCES)) if (!files.has(file)) throw Error("Missing normative reference: " + file);
  const headings = new Map([...files].filter(([file]) => file.endsWith(".md")).map(([file, text]) => [file, sectionHeadings(text)]));
  const resolved = [], ambiguous = [], broken = [];
  let scanned = 0;
  for (const [file, source] of files) {
    if (!supported.test(file)) continue;
    scanned++;
    const text = prose(source, file);
    const names = documentNames(text, file, files);
    // A file's introductory comment can declare its one reference. Several
    // named documents leave bare section numbers ambiguous. Markdown has no
    // implicit owner, including dated notes. Every supported file is scanned.
    const firstCommentEnd = text.indexOf("*/");
    const introductory = file.endsWith(".md") ? [] : names.filter(row => row.start < firstCommentEnd);
    const introductoryTargets = new Set(introductory.filter(row => row.known).map(row => row.target));
    const hasIntroductoryCitation = [...text.slice(0, firstCommentEnd).matchAll(section)].some(match => targetOf(text.slice(0, firstCommentEnd), match.index, match.index + match[0].length, file, files, null).target);
    const defaultDocument = introductoryTargets.size === 1 && introductory.every(row => row.known) && hasIntroductoryCitation ? [...introductoryTargets][0] : null;
    for (const match of text.matchAll(section)) {
      const numbers = [match[1]];
      let end = match.index + match[0].length, unsupportedRange = false;
      for (;;) {
        const next = continuation.exec(text.slice(end));
        if (!next) break;
        if (["to", "–", "−", "-"].includes(next[1].trim().toLowerCase())) {
          const expanded = range(numbers.at(-1), next[2]);
          if (expanded) numbers.push(...expanded.slice(1));
          else { unsupportedRange = true; numbers.push(next[2]); }
        } else numbers.push(next[2]);
        end += next[0].length;
      }
      const citation = { file, line: lineOf(source, match.index), citation: text.slice(match.index, end).replace(/\s+/g, " "), sections: numbers };
      const owner = targetOf(text, match.index, end, file, files, defaultDocument);
      if (!owner.target) ambiguous.push({ ...citation, reason: owner.reason });
      else {
        const missing = numbers.filter(key => !headings.get(owner.target)?.has(key));
        const duplicate = numbers.filter(key => (headings.get(owner.target)?.get(key)?.length ?? 0) > 1);
        if (missing.length) {
          const beginning = source.lastIndexOf("\n", owner.nameStart ?? match.index) + 1;
          const newline = source.indexOf("\n", end), excerpt = source.slice(beginning, newline < 0 ? source.length : newline);
          broken.push({ ...citation, document: owner.target, missing, excerpt, excerptSha256: excerptHash(excerpt) });
        }
        else if (unsupportedRange) ambiguous.push({ ...citation, document: owner.target, reason: "section range crosses numbering families; endpoints exist" });
        else if (duplicate.length) ambiguous.push({ ...citation, document: owner.target, reason: "duplicate section headings: " + duplicate.join(", ") });
        else resolved.push({ ...citation, document: owner.target });
      }
    }
  }
  const known = [], listingErrors = [], seen = new Set();
  for (const finding of findings) {
    const key = JSON.stringify([finding.file, finding.target, finding.missingSections, finding.excerptSha256]);
    if (seen.has(key) || finding.expectedOccurrences !== 1 || !finding.disposition || finding.excerptSha256 !== excerptHash(finding.excerpt ?? "")) {
      listingErrors.push({ file: finding.file, reason: "invalid or duplicate exact finding" }); continue;
    }
    seen.add(key);
    const matches = broken.filter(row => row.file === finding.file && row.document === finding.target
      && JSON.stringify(row.missing) === JSON.stringify(finding.missingSections) && row.excerptSha256 === finding.excerptSha256);
    if (matches.length !== 1) listingErrors.push({ file: finding.file, reason: `listed citation expected once, found ${matches.length}`, target: finding.target, excerptSha256: finding.excerptSha256 });
    else known.push({ ...matches[0], status: "known-unresolved", disposition: finding.disposition });
  }
  const unknown = broken.filter(row => !known.some(listed => listed.file === row.file && listed.line === row.line
    && listed.document === row.document && JSON.stringify(listed.missing) === JSON.stringify(row.missing) && listed.excerptSha256 === row.excerptSha256));
  for (const row of resolved) row.status = "resolved";
  for (const row of ambiguous) row.status = "ambiguous";
  for (const row of unknown) row.status = "broken";
  return { ok: unknown.length === 0 && listingErrors.length === 0, scanned, resolved, ambiguous, known, broken: unknown, listingErrors };
}

export function formatReport(report) {
  const rows = [`Section citations: ${report.resolved.length} resolved, ${report.ambiguous.length + report.known.length} unresolved, ${report.broken.length} broken; ${report.scanned} files; ${report.known.length} known unresolved; ${report.listingErrors.length} listing errors.`];
  for (const row of report.listingErrors) rows.push(`LISTING ERROR ${row.file}: ${row.reason}`);
  for (const row of report.known) rows.push(`KNOWN UNRESOLVED ${row.file}:${row.line}: ${row.citation} -> ${row.document}; missing ${row.missing.join(", ")}; ${row.disposition}`);
  for (const row of report.broken) rows.push(`BROKEN ${row.file}:${row.line}: ${row.citation} -> ${row.document}; missing ${row.missing.join(", ")}`);
  for (const row of report.ambiguous) rows.push(`UNRESOLVED ${row.file}:${row.line}: ${row.citation}; ${row.reason}`);
  rows.push("Heading existence does not establish that code follows the cited rule. Unresolved references need document-owner review.");
  return rows.join("\n") + "\n";
}

export function main(args = process.argv.slice(2), root = resolve(dirname(fileURLToPath(import.meta.url)), "..")) {
  if (args.length && (args.length !== 2 || args[0] !== "--report")) throw Error("Usage: check-section-citations.mjs [--report new-report.json]");
  const names = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(file => file && supported.test(file));
  const files = new Map([...new Set(names)].map(file => [file, readFileSync(resolve(root, file), "utf8")]));
  const findings = JSON.parse(readFileSync(resolve(root, "scripts/section-citation-findings.json"), "utf8"));
  const report = checkCitations(files, findings);
  if (args.length) writeFileSync(resolve(args[1]), JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  process.stdout.write(formatReport(report));
  return report.ok ? 0 : 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
