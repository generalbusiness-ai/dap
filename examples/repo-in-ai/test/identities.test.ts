import { mkdtempSync, readFileSync, realpathSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { canonicalize, newIncarnation, scopeIdOf, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { memoryStore } from "../../../packages/cli/src/store.ts";
import type { PendingInvitationIssue, Store } from "../../../packages/cli/src/store.ts";
import { storedSigner } from "../../../packages/cli/src/store-signer.ts";
import { IdentityRefusal, initializeOwner, retainedInvitationRequests } from "../identities.ts";

// Local custody only. No native, HTTP or provider judgment runs in this file.
const operation = "11111111-1111-4111-8111-111111111111";
async function chain(length: number) {
  const store = memoryStore(), names: string[] = [];
  let previous: Pick<PendingInvitationIssue, "request" | "digest"> | undefined;
  for (let n = 0; n < length; n++) {
    const request = `i-${String(n).padStart(30, "0")}`;
    const raw = canonicalize({ operation, ...(previous ? { previous } : {}) });
    await store.keepPrivate(request, utf8(raw));
    previous = { request, digest: textDigest(raw) };
    names.push(request);
  }
  return { store, names, pointer: { operation, ...previous! } };
}

test("a retained invitation chain preserves engine order and refuses a changed or missing ancestor, another operation and overflow", async () => {
  const original = await chain(16);
  expect(await retainedInvitationRequests(original.store, original.pointer)).toEqual(original.names);
  const root = original.names[0]!;
  const changed: Store = { ...original.store, private: async name => name === root ? utf8(canonicalize({ operation, changed: true })) : original.store.private(name) };
  await expect(retainedInvitationRequests(changed, original.pointer)).rejects.toMatchObject({ reason: "private-original-digest" });
  const missing: Store = { ...original.store, private: async name => name === root ? null : original.store.private(name) };
  await expect(retainedInvitationRequests(missing, original.pointer)).rejects.toMatchObject({ reason: "private-original-missing" });
  await expect(retainedInvitationRequests(original.store, { ...original.pointer, operation: "another" })).rejects.toMatchObject({ reason: "invitation-operation-changed" });
  const overflow = await chain(17);
  await expect(retainedInvitationRequests(overflow.store, overflow.pointer)).rejects.toMatchObject({ reason: "invitation-chain-bound" });
});

test("owner continuation restores configuration only with the exact retained inputs and original signer", async () => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "artroom-s1-owner-")));
  try {
    const register = {
      kind: "register" as const,
      scope: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@21", creator: null, cause: textDigest("TEST existing register"), ordinal: 0 }),
      inc: newIncarnation(new Uint8Array(16).fill(1)),
    };
    const input = { service: "https://identity.test", register, handle: "@owner" };
    const fresh = await initializeOwner(home, input, "new");
    const original = (await storedSigner(fresh.store, "operator"))!.key;
    const keyPath = join(home, "keys", "operator.key"), keyBytes = readFileSync(keyPath);
    const configPath = join(home, "config.json");
    unlinkSync(configPath);
    await expect(initializeOwner(home, input, "check")).rejects.toMatchObject({ reason: "owner-config-not-published" });
    expect(await fresh.store.config()).toBeNull();
    await expect(initializeOwner(home, { ...input, handle: "@different" }, "continue")).rejects.toMatchObject({ reason: "owner-input-changed" });
    expect(await fresh.store.config()).toBeNull();
    const resumed = await initializeOwner(home, input, "continue");
    expect((await storedSigner(resumed.store, "operator"))!.key).toBe(original);
    expect(readFileSync(keyPath)).toEqual(keyBytes);
    expect((await resumed.store.config())?.handle).toBe(input.handle);
    unlinkSync(keyPath);
    await expect(initializeOwner(home, input, "continue")).rejects.toMatchObject({ reason: "original-owner-key-missing" });
    expect(await storedSigner(resumed.store, "operator")).toBeNull();
    await expect(initializeOwner(home, input, "new")).rejects.toBeInstanceOf(IdentityRefusal);
  } finally { rmSync(home, { recursive: true, force: true }); }
});
