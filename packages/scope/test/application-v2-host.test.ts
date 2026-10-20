/** Real local R2 and strict host admission, not a provider deployment or a
 * native install. Package, signature and native schema checks are real. */
import { env } from "cloudflare:test";
import { applicationCounterPacket2 } from "./fixtures-native.ts";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { readTrustedApplication } from "../src/applications/admission.ts";
import { ApplicationContentStore, applicationReleaseKey } from "../src/applications/content.ts";
// Invariant: v2 receives the same exact trust, native support and immutable
// private storage checks as v1; unsupported when syntax is refused first.
test("trusted v2 declarations round-trip through local R2 while unsupported expressions never write", async () => {
  const valid = await applicationCounterPacket2("state = 'open'"), unsupported = await applicationCounterPacket2("$now()");
  const trust = [valid, unsupported].map(packet => ({ release: packet.ids.release, publisher: packet.package.release.manifest.publisher }));
  expect(readTrustedApplication(valid.bytes, valid.ids.release, trust, PROPOSED_BOUNDS)).toEqual(valid);
  expect(() => readTrustedApplication(unsupported.bytes, unsupported.ids.release, trust, PROPOSED_BOUNDS)).toThrow("application-unsupported-host");
  let writes = 0;
  const bucket = { get: env.APPLICATION_CONTENT.get.bind(env.APPLICATION_CONTENT), put: async (key: string, bytes: Uint8Array, options: R2PutOptions) => {
    writes++; return env.APPLICATION_CONTENT.put(key, bytes, options);
  } } as Pick<R2Bucket, "get" | "put">;
  const store = new ApplicationContentStore(bucket, trust, PROPOSED_BOUNDS);
  try {
    await expect(store.put(unsupported.bytes, unsupported.ids.release)).rejects.toThrow("application-unsupported-host");
    expect(writes).toBe(0); expect(await env.APPLICATION_CONTENT.head(applicationReleaseKey(unsupported.ids.release))).toBeNull();
    expect(await store.put(valid.bytes, valid.ids.release)).toEqual(valid);
    expect(await new ApplicationContentStore(env.APPLICATION_CONTENT, trust, PROPOSED_BOUNDS).get(valid.ids.release)).toEqual(valid);
    expect(writes).toBe(1);
  } finally {
    await env.APPLICATION_CONTENT.delete(applicationReleaseKey(valid.ids.release));
    await env.APPLICATION_CONTENT.delete(applicationReleaseKey(unsupported.ids.release));
  }
});
