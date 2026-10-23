import { expect, test } from "vitest";
import { keyIdOfSecret, verify } from "@generalbusiness/dap-bytes";
import { memoryStore, type Store } from "../src/store.ts";
import { install, planInstall, installPlanned, type Context } from "../src/commands.ts";
import { secretSigner } from "@generalbusiness/dap-client";
import { canonicalize, intentDigest, newIncarnation, textDigest } from "@generalbusiness/dap-bytes";
import type { Receipt, SignedIntent } from "@generalbusiness/dap-contract";
import { newStoredSigner, storedSigner } from "../src/store-signer.ts";

test("filesystem-style stores retain their existing named key and signing behavior", async () => {
  const store = memoryStore(), seed = new Uint8Array(32).fill(9);
  await store.keep("device", seed);
  const signer = await storedSigner(store, "device"), bytes = new Uint8Array([1, 2, 3]);
  expect(signer?.key).toBe(keyIdOfSecret(seed));
  expect(verify(signer!.key, await signer!.sign(bytes), bytes)).toBe(true);
  expect((await newStoredSigner(store, "device")).key).toBe(signer!.key);
  expect((await newStoredSigner(store, "recovery")).key).toBe(keyIdOfSecret((await store.secret("recovery"))!));
});

test("a missing capability-store signer never falls back to its raw-seed methods", async () => {
  const store = memoryStore(); let reads = 0;
  store.signer = async () => null;
  store.secret = async () => { reads++; throw new Error("must not read private bytes"); };
  expect(await storedSigner(store, "browser")).toBeNull();
  await expect(newStoredSigner(store, "browser")).rejects.toThrow("cannot create");
  expect(reads).toBe(0);
});

test("get-or-create returns the retained capability and does not replace a pending identity", async () => {
  const store = memoryStore(), seed = new Uint8Array(32).fill(11);
  const { secretSigner } = await import("@generalbusiness/dap-client");
  const original = secretSigner(seed); let retained = false, creates = 0;
  store.signer = async () => retained ? original : null;
  store.newSigner = async () => { creates++; retained = true; return original; };
  expect((await newStoredSigner(store, "browser")).key).toBe(original.key);
  expect((await newStoredSigner(store, "browser")).key).toBe(original.key);
  expect(creates).toBe(1);
});

/** Actual exported command paths and codecs; memory custody and the service
 * acknowledgement are stand-ins, not native install/host acceptance. */
test("operator installation and planned replay refuse a missing hook signer despite an available legacy seed", async () => {
  const service = "https://signer-install.test", store = memoryStore();
  await store.keep("operator", new Uint8Array(32).fill(21));
  const now = () => Date.parse("2026-10-09T12:00:00Z");
  expect((await planInstall({ store, now }, service, { cohort: "trusted-application" })).code).toBe(0);
  const retained = canonicalize(await store.config());
  let reads = 0, writes = 0, submits = 0;
  const originalSecret = store.secret;
  store.secret = async name => { reads++; return originalSecret(name); };
  store.keep = async () => { writes++; throw new Error("must not create a raw key"); };
  store.signer = async () => null;
  const fetch: NonNullable<Context["fetch"]> = async () => { submits++; throw new Error("must not submit"); };
  const ctx: Context = { store, now, fetch, trustedCreationService: { service, fetch } };
  expect((await installPlanned(ctx, { cohort: "trusted-application" })).code).toBe(1);
  expect(canonicalize(await store.config())).toBe(retained);
  const fresh: Store = { ...store, config: async () => null };
  expect((await install({ ...ctx, store: fresh }, service)).code).toBe(1);
  expect([reads, writes, submits]).toEqual([0, 0, 0]);
});

test("an existing hook operator supplies the exact planned identity and replays the saved envelope without raw-key access", async () => {
  const service = "https://signer-install.test", store = memoryStore();
  await store.keep("operator", new Uint8Array(32).fill(22)); // Deliberately different legacy key.
  const operator = secretSigner(new Uint8Array(32).fill(23));
  let reads = 0, writes = 0, signs = 0;
  store.signer = async name => name === "operator" ? { key: operator.key, sign: bytes => { signs++; return operator.sign(bytes); } } : null;
  store.secret = async () => { reads++; throw new Error("must not export a raw key"); };
  store.keep = async () => { writes++; throw new Error("must not replace the operator"); };
  const now = () => Date.parse("2026-10-09T12:00:00Z");
  expect((await planInstall({ store, now }, service, { cohort: "trusted-application" })).code).toBe(0);
  const original = (await store.config())!.plan!, signed = canonicalize(original.founding), signatures = signs;
  expect(original.founding.intent.actor).toBe(operator.key);
  const bodies: string[] = [];
  const fetch: NonNullable<Context["fetch"]> = async (_url, init) => {
    const request = JSON.parse(String(init?.body)) as { creation: SignedIntent; definition: typeof original.definition };
    bodies.push(canonicalize(request.creation));
    expect((await store.config())!.plan!.attempted).toMatch(/^sha256:/);
    const receipt: Receipt = {
      fact: { at: { kind: "register", scope: original.register, inc: newIncarnation(new Uint8Array(16).fill(8)) }, seq: 0, hash: textDigest("TEST acknowledged register") },
      definition: request.definition, intent: intentDigest(request.creation.intent), effects: [], sends: [], epoch: 0,
    };
    return Response.json({ answer: "accepted", receipt });
  };
  expect((await installPlanned({ store, now, fetch, trustedCreationService: { service, fetch } }, { cohort: "trusted-application" })).code).toBe(0);
  expect(bodies).toEqual([signed]);
  expect(canonicalize((await store.config())!.plan!.founding)).toBe(signed);
  expect([reads, writes, signs]).toEqual([0, 0, signatures]);
});
