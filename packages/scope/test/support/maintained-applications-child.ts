/** Fixed Node capture of four maintained TEST packages, the source-built Grow
 * demo among them, and the immutable earlier Grow packet. No publisher custody, operator config, network, checkout
 * writes or package installation. */
import { readFile, rm } from "node:fs/promises";
import { prepareGrowCheck } from "../../../../examples/grow/prepare-check.ts";
import { prepareGrowDemo } from "../../../../examples/grow/prepare-demo.ts";
import { EARLIER_GROW_RELEASE, EARLIER_GROW_PUBLISHER } from "../../../../examples/grow/earlier-release.ts";
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
// The demo built from current source, in canonical spelling and signed by
// the TEST signer. Native tests install this; no test depends on a release
// signature that the planner has not yet made (ruling a7c8072a).
const growDemoRoot = await prepareGrowDemo();
let growDemoSource;
try { growDemoSource = await prepareApplicationDirectory(growDemoRoot, signer); }
finally { await rm(growDemoRoot, { recursive: true, force: true }); }
// Historical archive tests retain the earlier packet independently of the
// current release. They supply their own local trust row and TEST agents.
const earlierGrowDemo = simulatorRelease(new Uint8Array(await readFile(new URL("../../../../examples/grow/fixtures/earlier-application.dap.json", import.meta.url))), EARLIER_GROW_RELEASE, EARLIER_GROW_PUBLISHER);
process.stdout.write(JSON.stringify({
  counter: { bytes: b64url(counter.packet.bytes), release: counter.packet.ids.release },
  grow: { bytes: b64url(grow.packet.bytes), release: grow.packet.ids.release },
  earlierGrowDemo: { bytes: b64url(earlierGrowDemo.packet.bytes), release: earlierGrowDemo.packet.ids.release },
  growDemoSource: { bytes: b64url(growDemoSource.packet.bytes), release: growDemoSource.packet.ids.release },
  lending: { bytes: b64url(lending.packet.bytes), release: lending.packet.ids.release },
} satisfies MaintainedApplicationInputs));
