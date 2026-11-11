// Check all six authored definitions against retained canonical JSON and pins.
// Run with: node --import tsx scripts/check-definition-pins.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { compile } from "@generalbusiness/dap-define";
import { lendingSource } from "../examples/lending/definition.ts";
import { countingCommitmentsSource } from "../apps/counter/commitments.ts";
import { roomSource } from "../examples/grow/authoring/room.ts";
import { siteSource } from "../examples/grow/authoring/site.ts";
import { changeSource } from "../apps/room/lanes/authoring/change.ts";
import { issueSource } from "../apps/room/lanes/authoring/issue.ts";

const root = new URL("../", import.meta.url);
const args = process.argv.slice(2);
const groups = { lending: ["lending"], counter: ["counter"], grow: ["grow-room", "grow-site"], lanes: ["issue", "change"] };
const write = args[0] === "--write";
const checkGroup = args[0] === "--check";
if (args.length && (args.length !== 2 || (!write && !checkGroup) || !Object.hasOwn(groups, args[1]))) {
  throw new Error("Use check-definition-pins.mjs [--write|--check lending|counter|grow|lanes]");
}
const selected = args.length ? groups[args[1]] : null;
// Room compiles first. Site consumes that exact parent digest.
const room = compile(roomSource);
const declarations = [
  {
    name: "lending", built: compile(lendingSource),
    json: "examples/lending/definition.json", pin: "examples/lending/pin.ts",
    symbol: "LENDING_DEFINITION",
    header: "/** Canonical-byte digest of definition.ts; definition.test.ts checks it against the shared implementation. */",
  },
  {
    name: "counter", built: compile(countingCommitmentsSource),
    json: "apps/counter/commitments.json", pin: "apps/counter/commitments-pin.ts",
    symbol: "COUNTING_COMMITMENTS_DEFINITION",
    header: "/** Authored canonical-byte digest; validation and source acceptance are still owed. */",
  },
  { name: "grow-room", built: room, json: "examples/grow/definitions/room.json" },
  { name: "grow-site", built: compile(siteSource(room.digest)), json: "examples/grow/definitions/site.json" },
  { name: "issue", built: compile(issueSource), json: "apps/room/lanes/definitions/issue.json", lane: "issue" },
  { name: "change", built: compile(changeSource), json: "apps/room/lanes/definitions/change.json", lane: "change" },
];
for (const row of declarations.filter(row => !selected || selected.includes(row.name))) {
  const { definition, digest } = row.built;
  const outputs = [[row.json, await format(canonicalize(definition), { parser: "json" })]];
  if (row.pin) outputs.push([row.pin, `${row.header}\nexport const ${row.symbol} = "${digest}" as const;\n`]);
  if (!write && row.lane) {
    const pins = readFileSync(new URL("apps/room/lanes/src/digests.ts", root), "utf8");
    const table = /export const DIGESTS = \{([\s\S]*?)\n\}/.exec(pins)?.[1];
    if (!table?.includes(`  ${row.lane}: "${digest}",`)) throw new Error(`${row.lane} differs from its retained lane pin`);
  }
  for (const [path, expected] of outputs) {
    if (write) writeFileSync(new URL(path, root), expected);
    else if (readFileSync(new URL(path, root), "utf8") !== expected) {
      throw new Error(`${path} differs from its authored declaration; inspect the change before regenerating`);
    }
  }
  console.log(`${row.name}: ${digest}`);
}
