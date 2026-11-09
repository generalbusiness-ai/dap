// Write readable source JSON without changing the declared canonical pin.
import { writeFileSync } from "node:fs";
import { format } from "prettier";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { counting } from "../definition.ts";
import { COUNTING_DEFINITION } from "../pin.ts";

const digest = definitionDigest(counting);
if (digest !== COUNTING_DEFINITION) throw new Error("The Counting digest changed; review a new definition before updating its pin");
writeFileSync(new URL("../definition.json", import.meta.url), await format(canonicalize(counting), { parser: "json" }));
process.stdout.write(`${digest}\n`);
