/** Real package codec/signature with a public TEST publisher and temporary
 * maintained fixture inputs. This is not the final demo release or trust. */
import { readFile, rm } from "node:fs/promises";
import { expect, test } from "vitest";
import { b64url, canonicalBytes, keyIdOfSecret } from "@generalbusiness/dap-bytes";
import { packApplication2 } from "@generalbusiness/dap-bytes/application-v2";
import { secretSigner } from "@generalbusiness/dap-client";
import { prepareApplicationDirectory } from "../../packages/cli/src/application-files.ts";
import { prepareGrowCheck } from "./prepare-check.ts";
import { simulatorRelease } from "./simulator-release.ts";
import { simulatorHost } from "./simulator-host.ts";
import { DEMO_PUBLISHER, DEMO_RELEASE } from "./demo-release.ts";

test("the consumer takes cadence only from the exact signed release and publisher, and refuses an invalid signed schedule", async () => {
  const committed = await readFile(new URL("./demo/application.dap.json", import.meta.url));
  const verified = simulatorRelease(new Uint8Array(committed), DEMO_RELEASE, DEMO_PUBLISHER);
  expect(verified.packet.package.release.manifest.name).toBe("ai.generalbusiness.grow-demo");
  expect(verified.schedule.cadenceMinutes).toBe(1);
  expect(simulatorHost(committed.toString("utf8"), DEMO_RELEASE, DEMO_PUBLISHER)).toMatchObject({ run: expect.any(Function), scheduled: expect.any(Function) });
  const root = await prepareGrowCheck(), secret = new Uint8Array(32).fill(254), signer = secretSigner(secret);
  try {
    const prepared = await prepareApplicationDirectory(root, signer), base = prepared.packet.package;
    if (base.v !== 2) throw Error("The maintained Grow fixture must be version2.");
    const { creates: _creates, ...semantic } = base.semantic;
    const { semantic: _semantic, ...presentation } = base.presentation;
    const source = new Uint8Array(await readFile(new URL("./demo/simulator.json", import.meta.url)));
    const pack = async (bytes: Uint8Array) => packApplication2({ name: "ai.generalbusiness.grow-schedule-test", version: "0.0.0",
      semantic, presentation: { ...presentation, assets: [...presentation.assets, { path: "simulator.json", mediaType: "application/json", bytes: b64url(bytes) }] } }, signer);
    const packet = await pack(source), publisher = keyIdOfSecret(secret);
    expect(simulatorRelease(packet.bytes, packet.ids.release, publisher).schedule).toEqual({ v: 1, cadenceMinutes: 1, periodMinutes: 60, faultZone: 2,
      ventFault: { fromMinute: 10, untilMinute: 35 }, fanFault: { fromMinute: 20, untilMinute: 40 }, autonomousRecovery: {"fromMinute": 35, "description": "At minute 35 the simulated vent vane frees; the fan trip resets at minute 40. A person cutting the heater can shorten the fault. Once the vent responds, the agent offers restoration for five minutes, then closes with the heater left as commanded. Without a heat cut it closes at recovery.", "restorationWindowMinutes": 5} });
    expect(() => simulatorRelease(packet.bytes, packet.ids.release, keyIdOfSecret(new Uint8Array(32).fill(253)))).toThrow("publisher");
    expect(() => simulatorRelease(packet.bytes, `sha256:${"0".repeat(64)}`, publisher)).toThrow();
    const invalid = await pack(canonicalBytes({ ...JSON.parse(new TextDecoder().decode(source)), cadenceMinutes: 0 }));
    expect(() => simulatorRelease(invalid.bytes, invalid.ids.release, publisher)).toThrow("schedule");
  } finally { await rm(root, { recursive: true, force: true }); secret.fill(0); }
});
