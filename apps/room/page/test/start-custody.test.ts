import { expect, test, vi } from "vitest";
import type { SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, intentDigest, keyIdOfSecret, newIncarnation, scopeIdOf, textDigest, verify } from "@generalbusiness/dap-bytes";
import { signedIntent, type CreationOffer } from "@generalbusiness/dap-client";
import type { Context, PendingClaim, Repository } from "@generalbusiness/dap-cli";

// Actual Page descriptor/journal, codec and offer validator over SCRIPTED CLI
// workflow/locks/storage. No native admission, browser custody or host proof.
const cli = vi.hoisted(() => ({ claim: vi.fn(), checkClaim: vi.fn() }));
vi.mock("@generalbusiness/dap-cli", async () => ({ ...await vi.importActual<typeof import("@generalbusiness/dap-cli")>("@generalbusiness/dap-cli"), ...cli }));
import { originalStart, startRoom as actualStartRoom, recoveryKeyOnce } from "../src/start-custody.ts";
import { memoryPageKeys } from "./private-key-fixture.ts";
const keys = memoryPageKeys();
const startRoom: typeof actualStartRoom = (origin, storage, options) => actualStartRoom(origin, storage, { ...options, keys });
import type { ClaimStorage } from "../src/claim.ts";
const origin = "https://start-custody.test";
const ref = (kind: "register" | "directory" | "membership") => ({ scope: scopeIdOf({ v: 1, kind, definition: kind === "register" ? "platform:register@17" : kind === "directory" ? "platform:directory@16" : "platform:membership@8", creator: null, cause: textDigest("SCRIPTED Start " + kind), ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(6)), kind });
const register = ref("register");
const offer: CreationOffer = { v: 2, origin, register, definition: "platform:register@17", at: { seq: 0, hash: textDigest("SCRIPTED register head") }, registerItem: { id: 0, revision: 1, state: "open", host: "artifacts", namespace: "SCRIPTED", policy: "open" } };
const locks = { request: async <T>(_name: string, run: () => Promise<T>) => run() };
const repository: Repository = { directory: ref("directory"), membership: ref("membership"), rules: ref("directory").scope, destination: ref("membership").scope };
function fixture() {
  const values = new Map<string, string>();
  const storage: ClaimStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  return { values, storage };
}

test("scripted retained register7 Start keeps its founder key before the CLI boundary; reload Check is read-only and Continue keeps the original envelope and key", async () => {
  cli.claim.mockReset(); cli.checkClaim.mockReset();
  // This descriptor is the exact legacy register7 format, retained before this upgrade.
  const register = { ...ref("register"), scope: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@7", creator: null, cause: textDigest("SCRIPTED legacy Start"), ordinal: 0 }) };
  const legacyOffer: CreationOffer = { ...offer, v: 1, register, definition: "platform:register@7", registerItem: { ...offer.registerItem, purpose: "demo-start" } };
  const f = fixture(), offerRead = vi.fn(async () => legacyOffer);
  f.values.set(`artroom-page-start:${origin}`, canonicalize({ v: 1, origin, secret: b64url(new Uint8Array(32).fill(61)), configured: { register, definition: "platform:register@7" }, label: "Personal intent", handle: "@founder" }));
  let original: SignedIntent | undefined, posts = 0, creator: string | undefined;
  cli.claim.mockImplementation(async (ctx: Context) => {
    const descriptorBytes = f.values.get(`artroom-page-start:${origin}`)!;
    expect(!!descriptorBytes, "founder-key readback precedes the workflow boundary").toBe(true);
    const descriptor = JSON.parse(descriptorBytes) as { publicKey: string; secret?: string };
    const signer = (await ctx.store.signer!("browser"))!;
    expect(signer.key).toBe(descriptor.publicKey); expect(descriptor.secret).toBeUndefined();
    const config = (await ctx.store.config())!;
    if (!config.claim) {
      creator = descriptor.publicKey;
      const recovery = await ctx.store.newSigner!("recovery");
      original = await signedIntent(signer, { to: register, kind: "found", fields: { branch: "main", founderHandle: "@founder", recoveryKey: recovery.key }, expected: { "0": 1 } }, { now: 0, idempotencyKey: "20000000-0000-4000-8000-000000000001" });
      const pending: PendingClaim = { register: register.scope, intent: intentDigest(original.intent), handle: "@founder", "found": { signed: original } };
      await ctx.store.save({ ...config, claim: pending });
    } else {
      expect(canonicalize(config.claim["found"]?.signed) === canonicalize(original)).toBe(true);
      expect(descriptor.publicKey === creator).toBe(true);
    }
    posts++;
    return { code: 1, lines: ["SCRIPTED lost original reply"] };
  });
  cli.checkClaim.mockImplementation(async (ctx: Context) => {
    const config = (await ctx.store.config())!;
    expect(canonicalize(config.claim?.["found"]?.signed) === canonicalize(original)).toBe(true);
    return { code: 1, lines: ["SCRIPTED original remains pending"] };
  });
  const first = await startRoom(origin, f.storage, { mode: "continue", label: "Ignored replacement", creationOffer: offerRead, locks });
  expect(first.pending).toBe(true); expect(posts).toBe(1);
  expect(first.configured).toEqual({ register, definition: "platform:register@7" });
  const status = originalStart(origin, f.storage)!;
  expect(status.key).toBe(keyIdOfSecret(new Uint8Array(32).fill(61)));
  expect(JSON.parse(f.values.get(`artroom-page-start:${origin}`)!).secret).toBeUndefined();
  expect(Object.keys(status).sort()).toEqual(["configured", "handle", "key", "label", "operation", "state"]);
  const bytesBefore = [...f.values.entries()];
  const reload: ClaimStorage = { getItem: key => f.values.get(key) ?? null, setItem: (key, value) => { f.values.set(key, value); } };
  const unavailableOffer = vi.fn(async (): Promise<CreationOffer> => { throw new Error("SCRIPTED offer unavailable on reload"); });
  await startRoom(origin, reload, { mode: "check", creationOffer: unavailableOffer, locks });
  expect(cli.checkClaim).toHaveBeenCalledTimes(1); expect(cli.claim).toHaveBeenCalledTimes(1);
  expect(posts).toBe(1); expect(JSON.stringify([...f.values.entries()]) === JSON.stringify(bytesBefore)).toBe(true);
  const continued = await startRoom(origin, reload, { mode: "continue", label: "Ignored replacement", creationOffer: unavailableOffer, locks });
  expect([continued.key, continued.operation, continued.label]).toEqual([status.key, status.operation, "Personal intent"]);
  expect(posts).toBe(2); expect(unavailableOffer).not.toHaveBeenCalled();
  await expect(startRoom(origin, reload, { mode: "new", label: "Another room", offer, creationOffer: offerRead, locks })).rejects.toThrow("already retained");
  expect(posts).toBe(2);
  // Losing the original journal cannot turn an attempted Start into a new
  // claim. The separate descriptor still carries its exact operation.
  const descriptorBeforeLoss = f.values.get(`artroom-page-start:${origin}`)!;
  expect((JSON.parse(descriptorBeforeLoss) as { operation: string }).operation).toBe(status.operation);
  for (const name of [...f.values.keys()]) if (name.startsWith("artroom-page-claim:")) f.values.delete(name);
  const uuid = vi.spyOn(crypto, "randomUUID"), randomness = vi.spyOn(crypto, "getRandomValues");
  try {
    expect(() => originalStart(origin, reload)).toThrow("private Start");
    await expect(startRoom(origin, reload, { mode: "continue", creationOffer: unavailableOffer, locks })).rejects.toThrow("private Start");
    await expect(startRoom(origin, reload, { mode: "check", locks })).rejects.toThrow("private Start");
    expect(cli.claim).toHaveBeenCalledTimes(2); expect(cli.checkClaim).toHaveBeenCalledTimes(1);
    expect(posts).toBe(2); expect(uuid).not.toHaveBeenCalled(); // Public-key derivation uses 16-byte scalar blinding in the pinned
    // curve implementation; a new creator seed would require 32 bytes.
    expect(randomness.mock.calls.some(([array]) => array?.byteLength === 32)).toBe(false);
    expect(f.values.get(`artroom-page-start:${origin}`) === descriptorBeforeLoss).toBe(true);
  } finally { uuid.mockRestore(); randomness.mockRestore(); }
});

test("scripted dropped, malformed or stale Start custody stops before the workflow; a retained key alone permits only explicit Continue", async () => {
  cli.claim.mockReset(); cli.checkClaim.mockReset();
  const legacyNew = fixture();
  await expect(startRoom(origin, legacyNew.storage, { mode: "new", label: "Room", offer: { ...offer, v: 1, definition: "platform:register@7", registerItem: { ...offer.registerItem, purpose: "demo-start" } }, locks })).rejects.toThrow("register17");
  await expect(startRoom(origin, legacyNew.storage, { mode: "new", label: "Room", offer: { ...offer, v: 1, definition: "platform:register@8", registerItem: { ...offer.registerItem, purpose: "demo-start" } }, locks })).rejects.toThrow("register17");
  expect(legacyNew.values.size).toBe(0); expect(cli.claim).not.toHaveBeenCalled();
  const mismatched = fixture();
  await expect(startRoom(origin, mismatched.storage, { mode: "new", label: "Room", offer, locks, creationOffer: async () => ({ ...offer, v: 1, definition: "platform:register@7", registerItem: { ...offer.registerItem, purpose: "demo-start" } }) })).rejects.toThrow("private Start");
  expect(originalStart(origin, mismatched.storage)?.configured.definition).toBe("platform:register@17");
  const mismatchedBytes = [...mismatched.values.entries()];
  await startRoom(origin, mismatched.storage, { mode: "check", locks });
  expect([...mismatched.values.entries()]).toEqual(mismatchedBytes); expect(cli.claim).not.toHaveBeenCalled();
  const dropped: ClaimStorage = { getItem: () => null, setItem: () => {} };
  await expect(startRoom(origin, dropped, { mode: "new", label: "Room", offer, locks })).rejects.toThrow("private Start");
  expect(cli.claim).not.toHaveBeenCalled();
  const malformed = fixture(); malformed.values.set(`artroom-page-start:${origin}`, "{broken");
  await expect(startRoom(origin, malformed.storage, { mode: "new", label: "Room", offer, locks })).rejects.toThrow("private Start");
  expect(malformed.values.get(`artroom-page-start:${origin}`)).toBe("{broken");
  const stale = fixture();
  await expect(startRoom(origin, stale.storage, { mode: "new", label: "Room", offer, locks, current: () => false })).rejects.toThrow("private Start");
  expect(stale.values.size).toBe(0); expect(cli.claim).not.toHaveBeenCalled();
  const prepared = fixture();
  const unavailableOffer = async (): Promise<CreationOffer> => { throw new Error("SCRIPTED no fresh offer"); };
  await expect(startRoom(origin, prepared.storage, { mode: "new", label: "Room", offer, locks, creationOffer: unavailableOffer })).rejects.toThrow("no fresh offer");
  const before = [...prepared.values.entries()];
  expect(originalStart(origin, prepared.storage)?.state).toBe("prepared");
  const checked = await startRoom(origin, prepared.storage, { mode: "check", locks });
  expect(checked.pending).toBe(true); expect(checked.outcome.lines.join(" ")).toContain("Continue explicitly");
  expect(cli.checkClaim).not.toHaveBeenCalled(); expect(cli.claim).not.toHaveBeenCalled();
  expect(JSON.stringify([...prepared.values.entries()]) === JSON.stringify(before)).toBe(true);
});

test("completed Start hands off the enrolled signer, preserves the separate recovery identity and refuses browser-key export", async () => {
  cli.claim.mockReset(); cli.checkClaim.mockReset();
  const f = fixture();
  cli.claim.mockImplementation(async (ctx: Context) => {
    const descriptor = JSON.parse(f.values.get(`artroom-page-start:${origin}`)!) as { configured: { definition: string }; publicKey: string };
    expect(descriptor.configured.definition).toBe("platform:register@17");
    const config = (await ctx.store.config())!;
    expect(config.register).toEqual(register);
    const recovery = await ctx.store.newSigner!("recovery"), signer = (await ctx.store.signer!("browser"))!;
    expect(recovery.key).not.toBe(signer.key);
    const signed = await signedIntent(signer, { to: register, kind: "found", fields: { recoveryKey: recovery.key } }, { now: 0, idempotencyKey: "20000000-0000-4000-8000-000000000002" });
    const pending: PendingClaim = { register: register.scope, intent: intentDigest(signed.intent), handle: "@founder", "found": { signed } };
    await ctx.store.save({ ...config, claim: pending });
    await ctx.store.save({ ...config, repository, handle: "@founder" });
    return { code: 0, lines: ["SCRIPTED complete"] };
  });
  const result = await startRoom(origin, f.storage, { mode: "new", label: "Room", offer, creationOffer: async () => offer, locks });
  expect(result.repository).toEqual(repository);
  const actual = JSON.parse(f.values.get(`artroom-page-start:${origin}`)!) as { publicKey: string; secret?: string };
  expect(result.signer?.key).toBe(actual.publicKey); expect(actual.secret).toBeUndefined();
  const message = new Uint8Array([1, 2, 3]);
  expect(verify(result.key, await result.signer!.sign(message), message)).toBe(true);
  const preserved = [...f.values.entries()];
  await expect(recoveryKeyOnce(origin, f.storage, { key: result.key, operation: result.operation }, { locks })).rejects.toThrow("nonextractable");
  expect(canonicalize([...f.values.entries()]) === canonicalize(preserved)).toBe(true);
});
