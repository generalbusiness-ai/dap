/** Real local R2 and strict host admission, not a provider deployment or a
 * native install. Package, signature and native schema checks are real. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, keyIdOfSecret, sign } from "@generalbusiness/artroom-bytes";
import { packApplication2, readApplicationProjection } from "@generalbusiness/artroom-bytes/application-v2";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { readTrustedApplication } from "../src/applications/admission.ts";
import { ApplicationContentStore, applicationReleaseKey } from "../src/applications/content.ts";
const secret = new Uint8Array(32).fill(67), signer = { key: keyIdOfSecret(secret), sign: (bytes: Uint8Array) => sign(secret, bytes) };
async function packet(when: string) {
  const id = definitionDigest(countingCommitments);
  return packApplication2({ name: "test.declared-host", version: "1", semantic: {
    v: 2, entry: id, definitions: [{ id, bytes: canonicalize(countingCommitments) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], roles: {}, predecessor: null,
    projections: { board: readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: {
      board: { item: "board", read: "one", states: ["finished", "open", "paused"], limit: 1, fields: {
        lastNumber: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      } },
    } }) },
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, resources: {}, views: {
    board: { kind: "card", projection: "board", item: "board", title: "state", summary: null, actor: null, facts: ["lastNumber"], revision: "revision",
      acts: [{ act: "pause", label: "Pause", needs: "counting.control", when }], context: "Board {id} v{revision}", fallback: "Board {id}: {state}",
      waiting: {}, refresh: 2000, display: "inline", back: null },
  } } }, signer);
}

// Invariant: v2 receives the same exact trust, native support and immutable
// private storage checks as v1; unsupported when syntax is refused first.
test("trusted v2 declarations round-trip through local R2 while unsupported expressions never write", async () => {
  const valid = await packet("state = 'open'"), unsupported = await packet("$now()");
  const trust = [valid, unsupported].map(packet => ({ release: packet.ids.release, publisher: signer.key }));
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
