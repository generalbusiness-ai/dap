/** Actual local R2 binding, public TEST packages; no provider or install.
 * Invariant: admitted exact release bytes are create-once, checked after a
 * race/restart/lost reply, and never replaced or read beyond their allowance. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { packApplication } from "@generalbusiness/dap-client";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { APPLICATION_HOST_PACKAGE_BYTES, readApplicationTrust } from "../src/applications/admission.ts";
import { ApplicationContentStore, applicationReleaseKey } from "../src/applications/content.ts";
import { applicationTrust, fixedSigner } from "./fixtures-native.ts";
const signer = fixedSigner(63);
async function fixture(version: string) {
  const definition = definitionDigest(countingCommitments);
  const packet = await packApplication({ name: "test.example.content", version, semantic: { v: 1, entry: definition, definitions: [{ id: definition, bytes: canonicalize(countingCommitments) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], roles: {}, projections: {}, predecessor: null },
    presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {} } }, signer);
  const trust = readApplicationTrust(applicationTrust(packet, signer.key));
  return { packet, trust, key: applicationReleaseKey(packet.ids.release), store: new ApplicationContentStore(env.APPLICATION_CONTENT, trust, PROPOSED_BOUNDS) };
}

test("a racing create-once write preserves one exact release across independent store instances", async () => {
  const f = await fixture("race");
  let misses = 0, ready = () => {};
  const bothMissed = new Promise<void>(resolve => { ready = resolve; }), outcomes: boolean[] = [];
  // Only the scheduling gate is scripted; gets and conditional puts use R2.
  const bucket: Pick<R2Bucket, "get" | "put"> = {
    get: async key => { const got = await env.APPLICATION_CONTENT.get(key); if (!got && misses < 2) { if (++misses === 2) ready(); await bothMissed; } return got; },
    put: async (key, value, options) => { const got = await env.APPLICATION_CONTENT.put(key, value, options); outcomes.push(got !== null); return got; },
  } as Pick<R2Bucket, "get" | "put">;
  try {
    const a = new ApplicationContentStore(bucket, f.trust, PROPOSED_BOUNDS), b = new ApplicationContentStore(bucket, f.trust, PROPOSED_BOUNDS);
    expect(await Promise.all([a.put(f.packet.bytes, f.packet.ids.release), b.put(f.packet.bytes, f.packet.ids.release)])).toEqual([f.packet, f.packet]);
    expect(outcomes.sort()).toEqual([false, true]);
    const first = await env.APPLICATION_CONTENT.head(f.key);
    expect(await f.store.get(f.packet.ids.release)).toEqual(f.packet);
    expect(await f.store.put(f.packet.bytes, f.packet.ids.release)).toEqual(f.packet);
    expect((await env.APPLICATION_CONTENT.head(f.key))!.version).toBe(first!.version);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); }
});

test("a lost successful write reply remains unknown and readback recovers without replacing bytes", async () => {
  const f = await fixture("lost-reply"); let writes = 0;
  const bucket = { get: env.APPLICATION_CONTENT.get.bind(env.APPLICATION_CONTENT), put: async (key: string, value: Uint8Array, options: R2PutOptions) => {
    writes++; await env.APPLICATION_CONTENT.put(key, value, options); throw Error("TEST lost reply after the actual local R2 write");
  } } as Pick<R2Bucket, "get" | "put">;
  try {
    await expect(new ApplicationContentStore(bucket, f.trust, PROPOSED_BOUNDS).put(f.packet.bytes, f.packet.ids.release)).rejects.toThrow("application-content-unavailable");
    const first = await env.APPLICATION_CONTENT.head(f.key);
    expect(await f.store.get(f.packet.ids.release)).toEqual(f.packet);
    expect(await new ApplicationContentStore(bucket, f.trust, PROPOSED_BOUNDS).put(f.packet.bytes, f.packet.ids.release)).toEqual(f.packet);
    expect(writes).toBe(1); expect((await env.APPLICATION_CONTENT.head(f.key))!.version).toBe(first!.version);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); }
});

test("untrusted writes leave no object; corrupt stored bytes are refused without repair", async () => {
  const f = await fixture("refusal");
  try {
    await expect(new ApplicationContentStore(env.APPLICATION_CONTENT, [], PROPOSED_BOUNDS).put(f.packet.bytes, f.packet.ids.release)).rejects.toThrow("application-untrusted-release");
    expect(await env.APPLICATION_CONTENT.head(f.key)).toBeNull();
    await env.APPLICATION_CONTENT.put(f.key, "TEST corrupt object"); const before = await env.APPLICATION_CONTENT.head(f.key);
    await expect(f.store.get(f.packet.ids.release)).rejects.toThrow();
    await expect(f.store.put(f.packet.bytes, f.packet.ids.release)).rejects.toThrow();
    expect((await env.APPLICATION_CONTENT.head(f.key))!.version).toBe(before!.version);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); }
});

test("oversized stored metadata cancels its body before any read", async () => {
  const f = await fixture("oversized"); let read = false, cancelled = false;
  // Explicit metadata/body stand-in for the pre-read boundary, not provider R2.
  const object = { size: APPLICATION_HOST_PACKAGE_BYTES + 1, body: { cancel: async () => { cancelled = true; }, getReader: () => { read = true; throw Error("must not read"); } } } as unknown as R2ObjectBody;
  const bucket = { get: async () => object, put: async () => { throw Error("must not write"); } } as unknown as Pick<R2Bucket, "get" | "put">;
  await expect(new ApplicationContentStore(bucket, f.trust, PROPOSED_BOUNDS).get(f.packet.ids.release)).rejects.toThrow("application-content-too-large");
  expect(read).toBe(false); expect(cancelled).toBe(true);
});
