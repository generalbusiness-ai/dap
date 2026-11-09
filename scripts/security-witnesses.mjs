import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const documentPath = "docs/security/threat-model.md";
const required = ["grant", "sealed-operation", "session-membership", "verified-genesis", "credential-custody"];

export function readSecurityWitnesses(document) {
  const blocks = [...document.matchAll(/^```dap-security-witnesses\n([\s\S]*?)^```/gm)];
  if (blocks.length !== 1) throw new Error("The threat model needs one witness inventory.");
  const rows = JSON.parse(blocks[0][1]);
  if (!Array.isArray(rows) || !rows.length) throw new Error("The witness inventory is empty.");
  const identities = new Set();
  for (const row of rows) {
    if (!row || Object.keys(row).sort().join() !== "invariant,name,path"
      || !required.includes(row.invariant) || typeof row.name !== "string" || !row.name
      || typeof row.path !== "string" || !/^(?:packages|apps)\/[A-Za-z0-9._/-]+\.test\.(?:ts|mjs)$/.test(row.path)
      || row.path.split("/").some(part => part === "." || part === ".." || !part)) {
      throw new Error("Invalid security witness row.");
    }
    const identity = JSON.stringify([row.invariant, row.path, row.name]);
    if (identities.has(identity)) throw new Error("Duplicate security witness row.");
    identities.add(identity);
  }
  for (const invariant of required) {
    if (!rows.some(row => row.invariant === invariant)) throw new Error(`Missing security invariant: ${invariant}.`);
  }
  return rows;
}

export function checkSecurityWitnesses(root, { document, overrides = new Map() } = {}) {
  const tracked = new Set(execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0"));
  const rows = readSecurityWitnesses(document ?? readFileSync(resolve(root, documentPath), "utf8"));
  const parsed = new Map();
  for (const row of rows) {
    if (!tracked.has(row.path)) throw new Error(`Untracked security witness: ${row.path}.`);
    if (!parsed.has(row.path)) {
      const source = ts.createSourceFile(row.path, overrides.get(row.path) ?? readFileSync(resolve(root, row.path), "utf8"), ts.ScriptTarget.Latest, true);
      if (source.parseDiagnostics.length) throw new Error(`Cannot parse security witness: ${row.path}.`);
      const names = [];
      const visit = node => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
          && ["test", "it"].includes(node.expression.text)
          && node.arguments.length >= 2 && ts.isStringLiteralLike(node.arguments[0])
          && (ts.isArrowFunction(node.arguments.at(-1)) || ts.isFunctionExpression(node.arguments.at(-1)))) {
          names.push(node.arguments[0].text);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
      parsed.set(row.path, names);
    }
    const matches = parsed.get(row.path).filter(name => name === row.name).length;
    if (matches !== 1) throw new Error(`Missing or ambiguous security witness: ${row.path} :: ${row.name}.`);
  }
  return { witnesses: rows.length, invariants: required.length, files: parsed.size };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(checkSecurityWitnesses(fileURLToPath(new URL("../", import.meta.url)))));
}
