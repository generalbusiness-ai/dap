import { expect, test } from "vitest";
import { memoryStore } from "../src/custody.ts";
import { memoryDrafts } from "../src/draft-store.ts";
import { clientIdle, scopeClient } from "../src/scope-client.ts";
import { requestScene } from "./request-support.ts";

// A host tick publishes a new cut and close ends the subscription.
test("optional ticks publish and unsubscribe on close", async () => {
  const scene = requestScene(), store = memoryStore(), drafts = memoryDrafts();
  let notify = () => {}, stopped = 0;
  const client = scopeClient(scene.handle, { signer: scene.signer,
    member: { service: "https://requests.test", ...scene.actor.member, principal: scene.actor.principal },
    store, drafts, observe: scene.feed.observe, clock: scene.clock,
    ticks: wake => { notify = wake; return () => { stopped++; }; } });
  try {
    scene.feed.current(scene.scope); await client.read(); await clientIdle(client);
    const before = client.view;
    notify(); await clientIdle(client);
    expect(client.view).not.toBe(before);
    client.close();
    expect(stopped).toBe(1);
    const closed = client.view;
    notify(); await clientIdle(client);
    expect(client.view).toBe(closed);
  } finally { client.close(); }
});

// A late authority reply cannot publish after close.
test("close discards an in-flight authority candidate", async () => {
  const scene = requestScene(), store = memoryStore(), drafts = memoryDrafts();
  let release!: () => void, entered!: () => void, stopped = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const client = scopeClient(scene.handle, { signer: scene.signer,
    member: { service: "https://requests.test", ...scene.actor.member, principal: scene.actor.principal },
    store, drafts, observe: scene.feed.observe, clock: scene.clock,
    viewAuthority: { read: async () => { entered(); await gate; return { is: "unavailable", lacks: ["source"] }; },
      current: () => true, observe: () => () => { stopped++; } } });
  try {
    scene.feed.current(scene.scope);
    const reading = client.read();
    await started;
    client.close();
    const closed = client.view;
    release(); await reading; await clientIdle(client);
    expect(stopped).toBe(1);
    expect(client.view).toBe(closed);
    expect(client.view.state.is).toBe("stopped");
  } finally { release(); client.close(); }
});
