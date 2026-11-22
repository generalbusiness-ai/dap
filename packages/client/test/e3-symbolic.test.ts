import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { created, keys, valid } from "@generalbusiness/dap-derive/testing";
import { actExplore } from "../src/act-explore.ts";
import { clientNotes as notes } from "./definition-corpus-data.ts";

// A real E1 projection exposes a self reference as a Source, not a numeric alias.
test("an opened self reference is a symbolic projected value", () => {
  const declaration = { ...notes, items: { note: { ...notes.items.note,
    refs: { me: { fixed: false, required: false, to: { type: "item", of: "note" } } } } },
    acts: { ...notes.acts, add: { ...notes.acts.start, grant: "write", effects: [{ ref: { slot: "me", from: "self" } }] } } } as const satisfies DeclaredDefinition;
  const definition = valid(validateDefinition(declaration, PROPOSED_BOUNDS));
  const ledger = created(definition, {}, "e3-self-ref");
  const result = actExplore<typeof declaration, "add">(definition, ledger.state, { key: "self-open", act: { kind: "add", on: null, fields: {} },
    context: { ...ledger.context(), actor: keys.rita.key, scope: ledger.at, evidence: [], owners: null } });
  if (result.is !== "admitted" || !result.opens) return expect.fail("the self-referencing opening admits");
  const row = result.after.row(result.opens);
  expect(row?.refs["me"]).toEqual({ output: result.source });
  expect(row?.recorded).toBeNull();
});

// This fixture installs its declaration and obtains both sessions through the native issuer.
test("public projectedRows preserves a pending self-reference at the checked cut", async () => {
  const { c4SymbolicRuntime } = await import("./support/c4-runtime.ts");
  const { memoryStore } = await import("../src/custody.ts");
  const { memoryDrafts } = await import("../src/draft-store.ts");
  const { clientIdle, request, scopeClient } = await import("../src/scope-client.ts");
  const { declaredHandle } = await import("../src/declared.ts");
  const { ScopeHandle } = await import("../src/handle.ts");
  const { httpTransport } = await import("../src/http.ts");
  const { requestSession, signerSessionRequest } = await import("../src/session.ts");
  const { timeOf } = await import("@generalbusiness/dap-bytes");
  const { Feed } = await import("./replica-support.ts");
  const runtime = await c4SymbolicRuntime(true), store = memoryStore(), feed = new Feed(), otherFeed = new Feed();
  let release!: () => void, entered!: () => void, armed = false;
  const gate = new Promise<void>(resolve => { release = resolve; }), sent = new Promise<void>(resolve => { entered = resolve; });
  const fetch: typeof runtime.fetch = async (url, init) => {
    if (armed && init?.method === "POST" && new URL(url).pathname.endsWith("/acts")) { armed = false; entered(); await gate; }
    return runtime.fetch(url, init);
  };
  const asked = await signerSessionRequest(runtime.membership, runtime.signer, timeOf(runtime.now() + 60_000), "e3-symbolic-no-standing");
  const noStanding = await requestSession(runtime.service, runtime.membership.scope, asked, { fetch: runtime.fetch });
  if (!noStanding.ok) { runtime.close(); return expect.fail("native session without standing"); }
  expect(noStanding.session.standing).toBeNull();
  const handle = await declaredHandle(new ScopeHandle(httpTransport(runtime.service, { fetch }), runtime.at.scope, runtime.session.reader()), runtime.handle.definition);
  const otherHandle = await declaredHandle(new ScopeHandle(httpTransport(runtime.service, { fetch: runtime.fetch }), runtime.at.scope, noStanding.session.reader()), runtime.handle.definition);
  if (!handle.ok || !otherHandle.ok) { runtime.close(); return expect.fail("both checked scope handles"); }
  const requestedAt = timeOf(runtime.now() - 1000), member = { service: runtime.service, ...runtime.member, principal: null };
  const client = scopeClient(handle.handle, { signer: runtime.signer, member, store, drafts: memoryDrafts(), observe: feed.observe, clock: runtime.clock,
    exploration: runtime.readInputs, viewAuthority: { read: async () => ({ is: "ready", session: runtime.session, requestedAt }), current: () => true, observe: () => () => {} } });
  const without = scopeClient(otherHandle.handle, { signer: runtime.signer, member, store, drafts: memoryDrafts(), observe: otherFeed.observe, clock: runtime.clock,
    viewAuthority: { read: async () => ({ is: "ready", session: noStanding.session, requestedAt }), current: () => true, observe: () => () => {} } });
  let pending: Promise<unknown> | undefined;
  try {
    const targetIntent = await runtime.handle.intent(runtime.signer, "make-target", { on: null, fields: { n: 1 }, expected: {} },
      { now: runtime.now(), idempotencyKey: "e3-self-target", lifetimeSeconds: 60 });
    const targetAnswer = await runtime.handle.submit(targetIntent.signed, [], targetIntent.beside);
    if (targetAnswer.answer !== "accepted") return expect.fail("target creation accepted");
    const opened = targetAnswer.receipt.effects.find(effect => effect.effect === "open");
    if (!opened || opened.effect !== "open") return expect.fail("target opened");
    feed.emit({ status: "streaming" }); otherFeed.emit({ status: "streaming" });
    await client.read(); await without.read(); await clientIdle(client); await clientIdle(without);
    const act = { kind: "make-self" as const, on: null, fields: { target: opened.item, until: timeOf(runtime.now() + 30_000) } };
    expect(without.view.explore("no-standing-before", act)).toMatchObject({ is: "unavailable", lacks: ["authority-unavailable"] });
    let published!: () => void;
    const visible = new Promise<void>(resolve => { published = resolve; });
    const stop = client.subscribe(view => { if (view.projectedRow({ key: "e3-self-open" })?.pending) published(); });
    armed = true;
    pending = request(client, "e3-self-open", "make-self", { on: null, fields: { target: opened.item, until: timeOf(runtime.now() + 30_000) } });
    await sent; await visible; stop(); await without.read(); await clientIdle(without);
    const rows = client.view.projectedRows("connector"), row = rows.find(value => value.pending?.key === "e3-self-open");
    if (!row || row.unavailable || !row.ref || typeof row.ref.name === "number") return expect.fail("checked pending symbolic row");
    expect(row.refs.self).toEqual(row.ref.name);
    expect(row.recorded).toBeNull();
    const numeric = client.view.row({ key: "e3-self-open" });
    expect(typeof numeric?.refs["self"]).toBe("number");
    expect(without.view.head).toEqual(client.view.head);
    const unproved = without.view.projectedRow({ key: "e3-self-open" });
    expect(unproved).toMatchObject({ unavailable: "source" });
    expect(unproved && Object.hasOwn(unproved, "ref")).toBe(false);
    expect(without.view.offers(row.ref, () => "unproved-offer")).toEqual([]);
    expect(typeof without.view.row({ key: "e3-self-open" })?.refs["self"]).toBe("number");
    expect(without.view.explore("no-standing-after", act)).toMatchObject({ is: "unavailable", lacks: ["source"] });
  } finally { release(); await pending?.catch(() => {}); client.close(); without.close(); runtime.close(); }
});
