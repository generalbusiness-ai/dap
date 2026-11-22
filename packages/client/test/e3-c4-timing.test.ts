import { expect, test } from "vitest";
import { memoryStore } from "../src/custody.ts";
import { memoryDrafts } from "../src/draft-store.ts";
import { clientIdle, request, scopeClient } from "../src/scope-client.ts";
import { requestScene } from "./request-support.ts";

// Existing C4 callers do not opt in to the new view authority reader.
test("a nonempty C4 publication adds no authorization read", async () => {
  const scene = requestScene(), store = memoryStore();
  const client = scopeClient(scene.handle, { signer: scene.signer,
    member: { service: "https://requests.test", ...scene.actor.member, principal: scene.actor.principal },
    store, drafts: memoryDrafts(), observe: scene.feed.observe, clock: scene.clock });
  try {
    scene.feed.current(scene.scope); await client.read(); await clientIdle(client);
    let reads = 0;
    const read = store.authorizations.read.bind(store.authorizations);
    store.authorizations.read = async (...args) => { reads++; return read(...args); };
    await client.read(); await clientIdle(client);
    const baseline = reads; reads = 0;
    scene.mode("unavailable");
    await request(client, "pending-c4", "offer", { fields: { intent: 0 } });
    await clientIdle(client);
    reads = 0;
    await client.read(); await clientIdle(client);
    const row = client.view.row({ key: "pending-c4" });
    expect(row?.pending).toEqual({ key: "pending-c4" });
    expect(row && Object.hasOwn(row, "ref")).toBe(false);
    expect(client.view.projectedRow({ key: "pending-c4" })).toMatchObject({ unavailable: "source" });
    expect(client.view.offers({ name: 0, seen: scene.scope.item(0).revision, assumes: [] }, () => "offer")).toEqual([]);
    expect(reads).toBe(baseline);
  } finally { client.close(); }
});
