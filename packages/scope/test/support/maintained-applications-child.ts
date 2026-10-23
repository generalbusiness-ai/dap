/** Fixed Node capture of three maintained TEST packages and the committed
 * signed Grow demo. No publisher custody, operator config, network, checkout
 * writes or package installation. */
import { readFile, rm } from "node:fs/promises";
import { prepareGrowCheck } from "../../../../examples/grow/prepare-check.ts";
import { DEMO_RELEASE, DEMO_PUBLISHER } from "../../../../examples/grow/demo-release.ts";
import { simulatorRelease } from "../../../../examples/grow/simulator-release.ts";
import { fileURLToPath } from "node:url";
import { b64url } from "@generalbusiness/dap-bytes";
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
// Capture exactly the committed packet that the scheduled Worker consumes.
// Native tests supply their own explicit local trust row and TEST agents.
const growDemo = simulatorRelease(new Uint8Array(await readFile(new URL("../../../../examples/grow/demo/application.dap.json", import.meta.url))), DEMO_RELEASE, DEMO_PUBLISHER);
process.stdout.write(JSON.stringify({
  counter: { bytes: b64url(counter.packet.bytes), release: counter.packet.ids.release },
  grow: { bytes: b64url(grow.packet.bytes), release: grow.packet.ids.release },
  growDemo: { bytes: b64url(growDemo.packet.bytes), release: growDemo.packet.ids.release },
  lending: { bytes: b64url(lending.packet.bytes), release: lending.packet.ids.release },
} satisfies MaintainedApplicationInputs));
