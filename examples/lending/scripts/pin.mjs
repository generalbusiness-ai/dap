// Run from the repository root: node --import tsx examples/lending/scripts/pin.mjs
// The story uses public TEST actors, not a release or operator signer.
import { writeFileSync } from "node:fs";
import { format } from "prettier";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { compile } from "@generalbusiness/dap-define";
import { lendingSource } from "../definition.ts";
import { lendingStory } from "../story.ts";

const root = new URL("../", import.meta.url);
const { definition, digest } = compile(lendingSource);
const scenario = await lendingStory();
const outputs = [
  ["definition.json", await format(canonicalize(definition), { parser: "json" })],
  ["pin.ts", `/** Canonical-byte digest of definition.ts; definition.test.ts checks it against the shared implementation. */\nexport const LENDING_DEFINITION = "${digest}" as const;\n`],
  ["scenarios/application.json", await format(JSON.stringify(scenario, null, 2), { parser: "json" })],
];

// Compile, judge and format every output before changing any retained file.
for (const [path, bytes] of outputs) writeFileSync(new URL(path, root), bytes);
process.stdout.write(`${digest}\n`);
