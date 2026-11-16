/** Whole Client owner for the C4 draft operations. Real in-memory judge, custody and raw draft port; scripted transport and clocks. */
import { afterEach, expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { memoryStore } from "../src/custody.ts";
import { memoryDrafts } from "../src/draft-store.ts";
import { scopeClient, request, clientIdle } from "../src/scope-client.ts";
import { Feed } from "./replica-support.ts";
import { REQUEST_DESCRIPTOR, checkSigningAuthorizations, requestScene } from "./request-support.ts";

const audits: { scene: ReturnType<typeof requestScene>; store: ReturnType<typeof memoryStore> }[] = [];
afterEach(async () => { for (const audit of audits.splice(0)) await checkSigningAuthorizations(audit.scene, audit.store); });

function tab(s: ReturnType<typeof requestScene>, store: ReturnType<typeof memoryStore>, drafts: ReturnType<typeof memoryDrafts>, feed = s.feed) {
  const member = { service: "https://requests.test", membership: s.actor.member.membership, member: s.actor.member.member, principal: s.actor.principal };
  const client = scopeClient(s.handle, { descriptor: REQUEST_DESCRIPTOR, signer: s.signer, member, store, drafts,
    observe: feed.observe, clock: s.clock, lifetimeSeconds: 60 });
  return { client, slot: () => client.slot("remark", { on: { name: 0, seen: s.scope.item(0).revision, assumes: [] } }) };
}
function gate() {
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>(done => { entered = done; });
  const held = new Promise<void>(done => { release = done; });
  return { started, release, wait: () => { entered(); return held; } };
}

// Invariant (v4 occurrence control): a captured empty slot never overwrites another tab's newer editing draft.
test("a stale empty slot cannot replace another tab's newer draft", async () => {
  const s = requestScene(), store = memoryStore(), drafts = memoryDrafts(), second = new Feed();
  audits.push({ scene: s, store });
  const a = tab(s, store, drafts), b = tab(s, store, drafts, second);
  s.feed.current(s.scope); second.current(s.scope); await a.client.read(); await b.client.read();
  const hold = gate(), exclusive = store.exclusive.bind(store);
  let armed = true;
  // A captured its empty slot at the call; it waits before it can acquire the existing fence.
  store.exclusive = async work => { if (armed) { armed = false; await hold.wait(); } return exclusive(work); };
  let stale: ReturnType<typeof a.client.edit> | undefined;
  try {
    stale = a.client.edit(a.slot(), { text: "from the stale tab" });
    await hold.started;
    const newer = await b.client.edit(b.slot(), { text: "from the newer tab" });
    if (!newer.ok) throw new Error("the newer tab edits an empty slot");
    const written = canonicalize(await drafts.read(s.signer.key, s.handle.at));
    hold.release();
    expect(await stale).toEqual({ ok: false, stop: { stop: "taken" } });
    expect(canonicalize(await drafts.read(s.signer.key, s.handle.at))).toBe(written);
    // A fresh call that displays the newer key may patch that same row.
    await clientIdle(a.client);
    expect(a.client.view.drafts.get(a.slot())?.key).toBe(newer.value);
    expect(await a.client.edit(a.slot(), { text: "patched by the first tab" })).toEqual({ ok: true, value: newer.value });
    expect(await drafts.read(s.signer.key, s.handle.at)).toHaveLength(1);
  } finally {
    hold.release(); store.exclusive = exclusive; await stale?.catch(() => null);
    a.client.close(); b.client.close();
  }
});

// Invariant (v4): an old raw slot row that custody took is not a newer editor; one edit waits it and installs the new draft.
test("an edit after an old raw slot row became pending commits old waiting and new slot in one write", async () => {
  const s = requestScene(), store = memoryStore(), drafts = memoryDrafts();
  audits.push({ scene: s, store });
  const { client, slot } = tab(s, store, drafts);
  s.feed.current(s.scope); await client.read(); s.mode("unavailable");
  const first = await client.edit(slot(), { text: "old intention" });
  if (!first.ok) throw new Error("the first edit creates the draft");
  await request(client, first.value, "remark", { on: 0, fields: { text: "old intention" } });
  await clientIdle(client);
  expect(client.view.drafts.get(slot())).toBeUndefined();
  expect(client.view.requests.find(entry => entry.key === first.value)).toMatchObject({ is: "draft", status: "pending" });
  const write = drafts.write.bind(drafts);
  let writes = 0;
  drafts.write = async (owner, scope, entries) => { writes++; return write(owner, scope, entries); };
  try {
    const next = await client.edit(slot(), { text: "new intention" });
    if (!next.ok) throw new Error("a pending raw row is not a newer editing occupant");
    expect(next.value).not.toBe(first.value);
    expect(writes).toBe(1);
    const raw = await drafts.read(s.signer.key, s.handle.at);
    expect(raw.map(entry => [entry.key, entry.is === "draft" ? entry.placement : entry.is])).toEqual([[first.value, "waiting"], [next.value, "slot"]]);
    await clientIdle(client);
    expect(client.view.drafts.get(slot())?.key).toBe(next.value);
    expect(client.view.requests.find(entry => entry.key === first.value)).toMatchObject({ is: "draft", status: "pending" });
  } finally { client.close(); }
});
