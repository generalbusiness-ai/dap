/** Fixed Node capture of two complete maintained packages. Public TEST key;
 * no operator config, network, checkout writes or package installation. */
import { fileURLToPath } from "node:url";
import { b64url } from "@generalbusiness/artroom-bytes";
import { secretSigner } from "@generalbusiness/artroom-client";
import { prepareApplicationDirectory } from "../../../cli/src/application-files.ts";
import type { MaintainedApplicationInputs } from "./maintained-applications.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const signer = secretSigner(new Uint8Array(32).fill(254));
const counter = await prepareApplicationDirectory(root, signer, { config: "apps/counter/dap.application.json" });
const lending = await prepareApplicationDirectory(root, signer, { config: "examples/lending/dap.application.json" });
process.stdout.write(JSON.stringify({
  counter: { bytes: b64url(counter.packet.bytes), release: counter.packet.ids.release },
  lending: { bytes: b64url(lending.packet.bytes), release: lending.packet.ids.release },
} satisfies MaintainedApplicationInputs));
