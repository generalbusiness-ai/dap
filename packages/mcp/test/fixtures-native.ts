/** Worker-only fixture entry. Native room ownership stays in its adapter. */
export { activityRecipe } from "./fixtures.ts";
import { expect } from "vitest";
import type { FactRef, PlatformDefinition, ScopeId } from "@generalbusiness/dap-contract";
import { keyIdOfSecret } from "@generalbusiness/dap-bytes";
export * from "./support/room.ts";
export * from "./support/story.ts";

// The common setup accepts the same explicit room and agent ports.
interface ApplicationRoom {
  wireRegister(register: ScopeId): Promise<void>;
  know(scope: ScopeId): void;
}
interface ApplicationAgent {
  key: string;
  config: { repository?: { destination: ScopeId } };
  ok(name: string, args?: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/** The common native room setup of the Counter and lending stories. The
 * caller supplies its explicit cohort; activation and role setup stay local. */
export async function claimApplicationRoom(room: ApplicationRoom, rita: ApplicationAgent, definition: PlatformDefinition): Promise<void> {
  const installed = await rita.ok("create", { definition, kind: "install", fields: { host: "artifacts", namespace: "artroom-demo", policy: "keys", "founders": [rita.key] }, idempotencyKey: "install" });
  const register = installed["scope"] as ScopeId;
  await room.wireRegister(register);
  const claimed = await rita.ok("room.create", { target: register, fields: { branch: "main", "founderHandle": "@rita", recoveryKey: keyIdOfSecret(crypto.getRandomValues(new Uint8Array(32))) }, idempotencyKey: "claim" });
  expect(claimed["answer"], JSON.stringify(claimed)).toBe("accepted");
  const w = await rita.ok("wait", { scope: register, entry: (claimed["fact"] as FactRef).seq });
  expect(w["timedOut"], JSON.stringify(w)).toBe(false);
  room.know(rita.config.repository!.destination);
  const seat = await rita.ok("room.seat", { idempotencyKey: "seat" });
  await rita.ok("room.first-key", { fields: { member: (seat["fact"] as FactRef).seq }, idempotencyKey: "first-key" });
}
