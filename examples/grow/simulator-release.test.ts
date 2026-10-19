/** Real package codec/signature with a public TEST publisher and temporary
 * maintained fixture inputs. This is not the final demo release or trust. */
import { readFile, rm } from "node:fs/promises";
import { expect, test } from "vitest";
import { b64url, canonicalBytes, keyIdOfSecret } from "@generalbusiness/artroom-bytes";
import { packApplication2 } from "@generalbusiness/artroom-bytes/application-v2";
import { secretSigner } from "@generalbusiness/artroom-client";
import { prepareApplicationDirectory } from "../../packages/cli/src/application-files.ts";
import { prepareGrowCheck } from "./prepare-check.ts";
import { simulatorRelease } from "./simulator-release.ts";

test("the consumer takes cadence only from the exact signed release and publisher, and refuses an invalid signed schedule", async () => {
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
      ventFault: { fromMinute: 10, untilMinute: 35 }, fanFault: { fromMinute: 20, untilMinute: 40 }, autonomousRecovery: {"fromMinute": 35, "description": "At minute 35 the simulated vent vane frees and the room returns to band; the fan trip resets at minute 40. Cross-draft and a working fan reduce the fault heat load. A person cutting the heater can shorten the fault. The climate agent closes the incident and records whether a heater command occurred."} });
    expect(() => simulatorRelease(packet.bytes, packet.ids.release, keyIdOfSecret(new Uint8Array(32).fill(253)))).toThrow("publisher");
    expect(() => simulatorRelease(packet.bytes, `sha256:${"0".repeat(64)}`, publisher)).toThrow();
    const invalid = await pack(canonicalBytes({ ...JSON.parse(new TextDecoder().decode(source)), cadenceMinutes: 0 }));
    expect(() => simulatorRelease(invalid.bytes, invalid.ids.release, publisher)).toThrow("schedule");
  } finally { await rm(root, { recursive: true, force: true }); secret.fill(0); }
});
