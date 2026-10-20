/** Portable verification of the demo's signed cadence asset. This is no
 * host trust configuration and performs no install, read or mutation. */
import type { Digest, KeyId } from "@generalbusiness/dap-contract";
import { parseStrictBytes, unb64url } from "@generalbusiness/artroom-bytes";
import { readApplicationPackage2 } from "@generalbusiness/artroom-bytes/application-v2";
import { simulatorSchedule } from "./simulator.ts";

export function simulatorRelease(bytes: Uint8Array, expectedRelease: Digest, expectedPublisher: KeyId) {
  const packet = readApplicationPackage2(bytes, expectedRelease);
  if (packet.package.release.manifest.publisher !== expectedPublisher) throw new Error("unexpected simulator package publisher");
  const asset = packet.package.presentation.assets.find(asset => asset.path === "simulator.json");
  if (!asset || asset.mediaType !== "application/json" || asset.bytes.length > 1368) throw new Error("missing or oversized signed simulator schedule");
  const body = unb64url(asset.bytes);
  if (body === null || body.length > 1024) throw new Error("oversized signed simulator schedule");
  return { packet, schedule: simulatorSchedule(parseStrictBytes(body)) };
}
