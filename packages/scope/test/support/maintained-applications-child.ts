/** Fixed Node capture of three complete maintained packages. Public TEST key;
 * no operator config, network, checkout writes or package installation. */
import { rm } from "node:fs/promises";
import { prepareGrowCheck } from "../../../../examples/grow/prepare-check.ts";
import { fileURLToPath } from "node:url";
import { b64url } from "@generalbusiness/artroom-bytes";
import { prepareApplicationDirectory } from "../../../cli/src/application-files.ts";
import type { MaintainedApplicationInputs } from "./maintained-applications.ts";
import { fixedSigner } from "../fixtures.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const signer = fixedSigner(254);
const counter = await prepareApplicationDirectory(root, signer, { config: "apps/counter/dap.application.json" });
const lending = await prepareApplicationDirectory(root, signer, { config: "examples/lending/dap.application.json" });
const growRoot = await prepareGrowCheck();
let grow;
try { grow = await prepareApplicationDirectory(growRoot, signer); }
finally { await rm(growRoot, { recursive: true, force: true }); }
process.stdout.write(JSON.stringify({
  counter: { bytes: b64url(counter.packet.bytes), release: counter.packet.ids.release },
  grow: { bytes: b64url(grow.packet.bytes), release: grow.packet.ids.release },
  lending: { bytes: b64url(lending.packet.bytes), release: lending.packet.ids.release },
} satisfies MaintainedApplicationInputs));
