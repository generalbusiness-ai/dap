#!/usr/bin/env node
// Check relative links and canonical repository links in tracked Markdown files.
//
// A link fails when its target file does not exist, or when it names a
// heading anchor that the target Markdown file does not have. Canonical
// GitHub blob/main links for this repository resolve against this checkout,
// so the skill's installed links stay checked without a network request.
// Other links with a scheme and absolute paths are not checked. Fenced code
// and inline code are not read.
//
// Skipped: node_modules, .git, and every test/ directory, whose Markdown
// files are fixtures. notes/ (with notes/plans/) and spikes/parked/ are history and keep
// their links as written; --history adds notes/plans/ and spikes/parked/ to the check.
//
// A heading's anchor keeps the text of its inline code, with the backticks
// removed, as GitHub's does: "Host `artifacts`" is #host-artifacts.
//
// Usage: node scripts/check-doc-links.mjs [--history] [root]
// Exits 0 when every link resolves, 1 otherwise.
//
// node scripts/check-doc-links.mjs --self-test checks the anchor rules on a
// small fixture in this file, reads no other file, and exits 0 when they hold.

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const history = args.includes("--history");
const selfTest = args.includes("--self-test");
const root = resolve(args.find((arg) => !arg.startsWith("--")) ?? new URL("..", import.meta.url).pathname);
const skipAnywhere = new Set(["node_modules", ".git", "test"]);
const canonicalRepository = "https://github.com/generalbusiness-ai/artroom/blob/main/";

function* markdown() {
	// NUL framing keeps spaces and newlines in tracked paths intact. Read the
	// working bytes so a tracked document's uncommitted edits are checked too.
	const tracked = execFileSync("git", ["-C", root, "ls-files", "--cached", "-z"], { encoding: "utf8" });
	for (const at of tracked.split("\0")) {
		if (!at.endsWith(".md")) continue;
		const parts = at.split("/");
		if (parts.some(part => skipAnywhere.has(part))) continue;
		if (parts[0] === "notes" && (!history || parts[1] !== "plans")) continue;
		if (!history && parts[0] === "spikes" && parts[1] === "parked") continue;
		yield join(root, at);
	}
}

// Blank the lines of fenced code blocks, keeping line count.
function outsideFences(text) {
	let fence = null;
	return text.split("\n").map((line) => {
		const open = line.match(/^\s*(`{3,}|~{3,})/);
		if (fence) {
			if (open && open[1][0] === fence[0] && open[1].length >= fence.length) fence = null;
			return "";
		}
		if (open) {
			fence = open[1];
			return "";
		}
		return line;
	});
}

// The lines where links are read: no fenced code and no inline code.
function prose(text) {
	return outsideFences(text).map((line) => line.replace(/(`+)[\s\S]*?\1/g, "")).join("\n");
}

// GitHub's heading anchors: inline code keeps its text without backticks,
// then lower case, punctuation removed, spaces to hyphens, and a repeated
// anchor numbered from -1.
function anchorsOfText(text) {
	const matched = new Set();
	const seen = new Map();
	for (const line of outsideFences(text)) {
		const heading = line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
		if (heading) {
			const base = heading[1]
				.replace(/(`+)([\s\S]*?)\1/g, "$2")
				.replace(/<[^>]*>/g, "")
				.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
				.toLowerCase()
				.replace(/[^\p{L}\p{N}\s_-]/gu, "")
				.replace(/\s/g, "-");
			const n = seen.get(base) ?? 0;
			seen.set(base, n + 1);
			matched.add(n === 0 ? base : `${base}-${n}`);
		}
		const html = line.replace(/(`+)[\s\S]*?\1/g, "");
		for (const anchor of html.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) matched.add(anchor[1]);
	}
	return matched;
}

const anchors = (path) => anchorsOfText(readFileSync(path, "utf8"));

if (selfTest) {
	const fixture = [
		"# Host `artifacts`",
		"## Notes",
		"## Notes",
		"## Notes",
		"```",
		"## Not a heading",
		"```",
		"## Use `dap verify --all`",
	].join("\n");
	const expected = ["host-artifacts", "notes", "notes-1", "notes-2", "use-dap-verify---all"];
	const actual = [...anchorsOfText(fixture)];
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	console.log(`self-test ${ok ? "passed" : "failed"}: ${actual.join(", ")}`);
	process.exit(ok ? 0 : 1);
}

const cache = new Map();
const anchorsOf = (path) => {
	if (!cache.has(path)) cache.set(path, anchors(path));
	return cache.get(path);
};

const failures = [];
let checked = 0;
for (const file of markdown()) {
	const lines = prose(readFileSync(file, "utf8")).split("\n");
	lines.forEach((line, index) => {
		const targets = [
			...[...line.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map((m) => m[1]),
			...[...line.matchAll(/^\s*\[[^\]]+\]:\s*<?(\S+?)>?(?:\s+"[^"]*")?\s*$/g)].map((m) => m[1]),
		];
		for (const target of targets) {
			const canonical = target.startsWith(canonicalRepository);
			if (!canonical && (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("/"))) continue;
			checked++;
			const [pathPart, anchor] = (canonical ? target.slice(canonicalRepository.length) : target).split("#", 2);
			const decoded = decodeURIComponent(pathPart);
			const where = `${relative(root, file)}:${index + 1}`;
			if (canonical && (!decoded || decoded.startsWith("/") || decoded.includes("\\") || decoded.includes("?") || decoded.split("/").includes(".."))) {
				failures.push(`${where}: invalid canonical repository path ${target}`);
				continue;
			}
			const path = decoded === "" ? file : resolve(canonical ? root : dirname(file), decoded);
			if (!existsSync(path)) {
				failures.push(`${where}: no file ${target}`);
				continue;
			}
			if (anchor && path.endsWith(".md") && !anchorsOf(path).has(decodeURIComponent(anchor))) {
				failures.push(`${where}: no heading #${anchor} in ${relative(root, path)}`);
			}
		}
	});
}

for (const failure of failures) console.log(failure);
console.log(`${checked} local links checked, ${failures.length} broken.`);
process.exitCode = failures.length === 0 ? 0 : 1;
