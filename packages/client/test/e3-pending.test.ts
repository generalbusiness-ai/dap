import { expect, test } from "vitest";
import { timeOf } from "@generalbusiness/dap-bytes";
import { declaredHandle } from "../src/declared.ts";
import { ScopeHandle } from "../src/handle.ts";
import { httpTransport, type Fetch } from "../src/http.ts";
import { memoryStore } from "../src/custody.ts";
import { memoryDrafts } from "../src/draft-store.ts";
import { clientIdle, scopeClient } from "../src/scope-client.ts";
import { Feed } from "./replica-support.ts";
import { c4Runtime } from "./support/c4-runtime.ts";

// A pending source is a content identity, and only the checked matching entry can record it.
test("a copied pending ref resolves after its matching native entry records", async () => {
  const runtime = await c4Runtime(true), feed = new Feed(), store = memoryStore(), drafts = memoryDrafts();
  let release!: () => void, entered!: () => void, armed = false, tick = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const fetch: Fetch = async (url, init) => {
    if (armed && init?.method === "POST" && new URL(url).pathname.endsWith("/acts")) { armed = false; entered(); await gate; }
    return runtime.fetch(url, init);
  };
  const checked = await declaredHandle(new ScopeHandle(httpTransport(runtime.service, { fetch }), runtime.at.scope, runtime.session.reader()), runtime.handle.definition);
  if (!checked.ok) return expect.fail("checked handle");
  const requestedAt = timeOf(runtime.now() - 1000);
  const client = scopeClient(checked.handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store, drafts, observe: feed.observe,
    clock: runtime.clock, exploration: runtime.readInputs,
    viewAuthority: { read: async () => ({ is: "ready", session: runtime.session, requestedAt }), current: () => true, observe: () => () => {} },
    ticks: notify => { tick = notify; return () => {}; } });
  let sending: Promise<unknown> | undefined;
  try {
    feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
    const donation = await runtime.handle.intent(runtime.signer, "donate", { on: null, expected: { library: runtime.store.item(0)!.revision },
      fields: { name: "Tool", description: "A tool", page: "shelf/e3-tool.md", content: "content" } },
      { now: runtime.now(), idempotencyKey: "e3-pending-donate", lifetimeSeconds: 60 });
    const accepted = await runtime.handle.submit(donation.signed, [], donation.beside);
    if (accepted.answer !== "accepted") return expect.fail("donation accepted");
    const opened = accepted.receipt.effects.find(effect => effect.effect === "open");
    if (!opened || opened.effect !== "open") return expect.fail("tool opened");
    await client.read(); await clientIdle(client);
    const tool = client.view.projectedRow({ item: opened.item });
    if (!tool?.ref) return expect.fail("recorded tool ref");
    const slot = client.slot("reserve", { fields: { tool: tool.ref } });
    const edited = await client.edit(slot, { day: "2026-11-15", until: timeOf(runtime.now() + 3_600_000) });
    if (!edited.ok) return expect.fail("draft created");
    await clientIdle(client);
    let seen!: () => void;
    const published = new Promise<void>(resolve => { seen = resolve; });
    const unsubscribe = client.subscribe(view => { if (view.projectedRow({ key: edited.value })?.pending) seen(); });
    armed = true; sending = client.submit(slot);
    const reached = await Promise.race([started.then(() => "sent"), sending.then(result => `ended:${JSON.stringify(result)}`)]);
    if (reached !== "sent") return expect.fail(reached);
    await published; unsubscribe();
    const row = client.view.projectedRow({ key: edited.value });
    if (!row?.ref || typeof row.ref.name === "number") return expect.fail("pending symbolic ref");
    const pendingView = client.view;
    const copied = structuredClone(row.ref);
    if (typeof copied.name === "number") return expect.fail("symbolic copy");
    expect(row.recorded).toBeNull();
    expect(client.view.explore("e3-pending-release", { kind: "release", on: copied.name, fields: {}, expected: { on: copied.seen } }))
      .toMatchObject({ is: "admitted" });
    // Preserve a literal old v1 custody row in a separate store. Its upgraded
    // signing has no authorization provenance, even though the pending row remains visible.
    const legacyStore = memoryStore(), legacyDrafts = memoryDrafts(), legacyFeed = new Feed();
    const stored = [...store.records.entries()].find(([, value]) => JSON.parse(value).identity.key === edited.value);
    if (!stored) return expect.fail("pending custody row");
    const parsed = JSON.parse(stored[1]) as Record<string, unknown>;
    const { signings: _signings, ...legacyFields } = parsed;
    legacyStore.records.set(stored[0], JSON.stringify({ ...legacyFields, v: 1 }));
    const legacy = scopeClient(checked.handle, { signer: runtime.signer,
      member: { service: runtime.service, ...runtime.member, principal: null }, store: legacyStore, drafts: legacyDrafts,
      observe: legacyFeed.observe, clock: runtime.clock, exploration: runtime.readInputs,
      viewAuthority: { read: async () => ({ is: "ready", session: runtime.session, requestedAt }), current: () => true, observe: () => () => {} } });
    try {
      legacyFeed.emit({ status: "current", snapshot: { scope: runtime.at, definition: checked.handle.digest, at: client.view.head!, value: null } });
      await legacy.read(); await clientIdle(legacy);
      const oldRow = legacy.view.projectedRow({ key: edited.value });
      const numericRow = legacy.view.row({ key: edited.value });
      expect(oldRow).toMatchObject({ pending: { key: edited.value }, ref: null, recorded: null });
      if (!oldRow || !numericRow) return expect.fail("legacy pending row remains visible");
      expect(legacy.view.explore("legacy-use", { kind: "release", on: numericRow!.id, fields: {} }))
        .toMatchObject({ is: "unavailable", lacks: ["legacy-custody"] });
    } finally { legacy.close(); }
    const noAuthorityFeed = new Feed();
    const noAuthority = scopeClient(checked.handle, { signer: runtime.signer,
      member: { service: runtime.service, ...runtime.member, principal: null }, store: legacyStore, drafts: legacyDrafts,
      observe: noAuthorityFeed.observe, clock: runtime.clock, exploration: runtime.readInputs });
    try {
      noAuthorityFeed.emit({ status: "current", snapshot: { scope: runtime.at, definition: checked.handle.digest, at: client.view.head!, value: null } });
      await noAuthority.read(); await clientIdle(noAuthority);
      const oldRow = noAuthority.view.projectedRow({ key: edited.value });
      const numericRow = noAuthority.view.row({ key: edited.value });
      if (!oldRow) return expect.fail("legacy row without view authority remains visible");
      expect(noAuthority.view.explore("legacy-without-authority", { kind: "release", on: numericRow!.id, fields: {} }))
        .toMatchObject({ is: "unavailable", lacks: ["legacy-custody"] });
    } finally { noAuthority.close(); }
    release(); await sending; await client.read(); await clientIdle(client);
    expect(pendingView.explore("e3-held-pending", { kind: "release", on: copied.name, fields: {}, expected: { on: copied.seen } }))
      .toMatchObject({ is: "admitted" });
    const recorded = client.view.projectedRow({ key: edited.value });
    if (!recorded) return expect.fail("recorded row");
    expect(recorded.recorded).not.toBeNull();
    const act = { kind: "release" as const, on: copied.name, fields: {}, expected: { on: copied.seen } };
    const resolved = client.view.explore("e3-after-recording", act);
    expect(resolved.is, resolved.is === "unavailable" ? resolved.lacks.join(",") : resolved.is).toBe("admitted");
    expect(client.view.offers(copied, () => "e3-offer").some(offer => offer.template.act.kind === "release")).toBe(true);
    const old = { ...copied.name.output, version: `sha256:${"0".repeat(64)}` as const };
    expect(client.view.explore("e3-wrong-version", { ...act, on: { output: old } })).toMatchObject({ is: "unavailable", lacks: ["source"] });
    const custody = [...store.records.entries()].find(([, value]) => JSON.parse(value).identity.key === edited.value);
    if (!custody) return expect.fail("recorded custody row");
    store.records.delete(custody[0]); tick(); await clientIdle(client);
    expect(client.view.explore("e3-after-custody-removal", act)).toMatchObject({ is: "admitted" });
    const held = client.view;
    const authorization = (await store.authorizations.read(runtime.signer.key, runtime.at)).find(value => value.key === edited.value);
    if (!authorization) return expect.fail("retained authorization");
    const prior = authorization.versions.at(-1)!.act;
    await client.retainAuthorizations([{ key: edited.value, act: { ...prior, fields: { ...prior.fields, day: "2026-11-16" } } }]);
    await clientIdle(client);
    expect(client.view.explore("e3-after-replacement", act)).toMatchObject({ is: "unavailable", lacks: ["source"] });
    expect(held.explore("e3-held-before-replacement", act)).toMatchObject({ is: "admitted" });
  } finally { release(); await sending?.catch(() => {}); client.close(); runtime.close(); }
});

// A signed source is not an applied projection when its required foreign input is unavailable.
test("a proven but unprojectable pending act has no checked ref or offers", async () => {
  const runtime = await c4Runtime(true), feed = new Feed(), store = memoryStore(), drafts = memoryDrafts();
  let release!: () => void, entered!: () => void, armed = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const fetch: Fetch = async (url, init) => {
    if (armed && init?.method === "POST" && new URL(url).pathname.endsWith("/acts")) { armed = false; entered(); await gate; }
    return runtime.fetch(url, init);
  };
  const checked = await declaredHandle(new ScopeHandle(httpTransport(runtime.service, { fetch }), runtime.at.scope, runtime.session.reader()), runtime.handle.definition);
  if (!checked.ok) return expect.fail("checked handle");
  const requestedAt = timeOf(runtime.now() - 1000);
  const client = scopeClient(checked.handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store, drafts, observe: feed.observe,
    clock: runtime.clock, exploration: runtime.readInputs,
    viewAuthority: { read: async () => ({ is: "ready", session: runtime.session, requestedAt }), current: () => true, observe: () => () => {} } });
  let sending: Promise<unknown> | undefined;
  try {
    feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
    const library = client.view.projectedRow({ item: 0 });
    if (!library?.ref) return expect.fail("recorded library");
    const slot = client.slot("donate", {});
    const edited = await client.edit(slot, { name: "A tool", description: "A tool", page: "shelf/unavailable.md", content: "content" });
    if (!edited.ok) return expect.fail("donation draft");
    await clientIdle(client);
    let seen!: () => void;
    const published = new Promise<void>(resolve => { seen = resolve; });
    const unsubscribe = client.subscribe(view => { if (view.requests.some(entry => entry.key === edited.value && "status" in entry && entry.status === "pending")) seen(); });
    armed = true; sending = client.submit(slot);
    const reached = await Promise.race([started.then(() => "sent"), sending.then(result => `ended:${JSON.stringify(result)}`)]);
    if (reached !== "sent") return expect.fail(reached);
    await published; unsubscribe();
    expect(client.view.row({ key: edited.value })).toBeNull();
    expect(client.view.projectedRow({ key: edited.value })).toMatchObject({ unavailable: "source", pending: { key: edited.value } });
    expect(client.view.explore("other-act", { kind: "release", on: 0, fields: {} }))
      .toMatchObject({ is: "unavailable", lacks: ["source"] });
    expect(client.view.offers(library.ref, () => "offer")).toEqual([]);
  } finally { release(); await sending?.catch(() => {}); client.close(); runtime.close(); }
});
