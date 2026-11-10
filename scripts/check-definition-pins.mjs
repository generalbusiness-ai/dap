// Check authored declarations against retained canonical JSON and pin source.
// Run with: node --import tsx scripts/check-definition-pins.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { compile } from "@generalbusiness/dap-define";
import { lendingSource } from "../examples/lending/definition.ts";
import { countingCommitmentsSource } from "../apps/counter/commitments.ts";

const root = new URL("../", import.meta.url);
const declarations = [
  {
    name: "lending", source: lendingSource,
    json: "examples/lending/definition.json", pin: "examples/lending/pin.ts",
    symbol: "LENDING_DEFINITION",
    header: "/** Canonical-byte digest of definition.ts; definition.test.ts checks it against the shared implementation. */",
  },
  {
    name: "counter", source: countingCommitmentsSource,
    json: "apps/counter/commitments.json", pin: "apps/counter/commitments-pin.ts",
    symbol: "COUNTING_COMMITMENTS_DEFINITION",
    header: "/** Authored canonical-byte digest; validation and source acceptance are still owed. */",
  },
];
const args = process.argv.slice(2);
const write = args.length === 2 && args[0] === "--write";
if (args.length && (!write || !declarations.some(row => row.name === args[1]))) {
  throw new Error("Use check-definition-pins.mjs [--write lending|counter]");
}
for (const row of declarations.filter(row => !write || row.name === args[1])) {
  const { definition, digest } = compile(row.source);
  const json = await format(canonicalize(definition), { parser: "json" });
  const pin = `${row.header}\nexport const ${row.symbol} = "${digest}" as const;\n`;
  if (write) {
    writeFileSync(new URL(row.json, root), json);
    writeFileSync(new URL(row.pin, root), pin);
  } else {
    for (const [path, expected] of [[row.json, json], [row.pin, pin]]) {
      if (readFileSync(new URL(path, root), "utf8") !== expected) {
        throw new Error(`${path} differs from its authored declaration; inspect the change before regenerating`);
      }
    }
  }
  console.log(`${row.name}: ${digest}`);
}
