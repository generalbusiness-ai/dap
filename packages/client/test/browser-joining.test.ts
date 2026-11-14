/** Actual device signatures and HTTP codec/receipt checks. Backend entries,
 * session answers, the join slot and locks are SCRIPTED, not native enrollment.
 * Custody is the real `Custody` over `memoryStore`, a STAND-IN for the browser store. */
import { expect, test } from "vitest";
import type { Entry, Receipt, ScopeKind, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, entryHash, intentDigest, keyIdOfSecret, scopeIdOf, textDigest, utf8, verifyInvitationProof, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { browserJoining, generateBrowserDeviceKey, memoryStore, readBrowserInvitation, RETIRED_REQUEST, storedWebCryptoSigner, type BrowserJoinStore, type BrowserKeptJoin, type CustodyRecord, type Fetch, type InvitationLink } from "../src/index.ts";
const origin = "https://browser.test", start = Date.parse("2026-10-18T12:00:00Z"), seed = new Uint8Array(32).fill(66);
type Version = "platform:membership@4" | "platform:membership@6" | "platform:membership@7" | "platform:membership@8";
const reference = (kind: ScopeKind): ScopeRef => ({ scope: scopeIdOf({ v: 1, kind, definition: textDigest("TEST browser joining " + kind), creator: null, cause: textDigest("TEST browser joining address"), ordinal: 0 }), genesis: textDigest("TEST genesis 2") });
function invitation(definition: Version): InvitationLink {
  return { v: 1, service: origin, repository: { directory: reference("directory"), membership: reference("membership"), rules: reference("rules").scope, destination: reference("destination").scope },
    invitation: 1, secret: definition !== "platform:membership@4" ? b64url(seed) : "PUBLIC TEST legacy invitation", handle: "@browser", definition };
}
const linkText = (link: InvitationLink) => "artroom-invite:" + b64url(utf8(JSON.stringify(link)));
async function fixture(definition: Version = "platform:membership@6") {
  const device = await generateBrowserDeviceKey(), signer = storedWebCryptoSigner(device.publicKey, device.pair.privateKey), link = invitation(definition);
  const offered = readBrowserInvitation(linkText(link), { origin, membershipDefinition: definition });
  if (!offered.ok) throw new Error("The TEST invitation was refused");
  let held: unknown = null, now = start, failSave = false, lose = true, found = false, wrongSession = false, wrongReceipt = false;
  let written: Entry | null = null, receipt: Receipt | null = null;
  const posts: SignedIntent[] = [], settles: SignedIntent[] = [], calls: string[] = [];
  const store: BrowserJoinStore = { load: async () => structuredClone(held), save: async value => { held = structuredClone(value); calls.push("save slot"); }, clear: async outcome => { held = null; calls.push("clear " + outcome); } };
  const memory = memoryStore();
  // A failing custody write: the browser store's IndexedDB did not commit.
  const custody = { ...memory, write: async (...args: Parameters<typeof memory.write>) => { if (failSave) throw new Error("SCRIPTED storage failure"); calls.push("keep"); return memory.write(...args); } };
  const reply = (value: unknown, status = 200) => ({ status, body: new Response(JSON.stringify(value)).body });
  const fetch: Fetch = async (url, init) => {
    const path = new URL(url).pathname;
    const body = init?.body ? JSON.parse(init.body) : null;
    if (path.endsWith("/acts")) {
      posts.push(structuredClone(body.signed)); calls.push("post");
      const entry: Entry = { v: 1, genesis: offered.seat.membership.genesis, seq: 1, prev: textDigest("SCRIPTED previous entry"), time: new Date(start).toISOString().replace(".000Z", "Z"), clamped: false, epoch: 0,
        input: { type: "act", signed: body.signed, authority: [], presented: {} }, uses: [], prepared: [], effects: [], sends: [] };
      written = entry;
      receipt = { fact: { at: offered.seat.membership, seq: 1, hash: entryHash(entry) }, definition, intent: intentDigest(body.signed.intent), effects: [], sends: [], epoch: 0 };
      if (lose) throw new Error("SCRIPTED lost reply");
      return reply({ answer: "accepted", receipt });
    }
    if (path.endsWith("/settle")) {
      calls.push("settle"); settles.push(structuredClone(body.signed ?? body));
      return found && receipt ? reply({ ok: true, at: { seq: 1, hash: receipt.fact.hash }, complete: true, value: wrongReceipt ? { ...receipt, definition: "platform:membership@5" } : receipt }) : reply({ ok: false, reason: "not-found" }, 404);
    }
    if (path.endsWith("/sessions")) {
      calls.push("session");
      return reply({ ok: true, token: "PUBLIC TEST session", session: { v: 1, membership: offered.seat.membership, key: signer.key, member: wrongSession ? "@other" : "@browser", reads: ["entry"], ends: body.request.notAfter } });
    }
    if (path.endsWith("/entries/1") && written && receipt) {
      calls.push("entry");
      return reply({ ok: true, at: { seq: 1, hash: receipt.fact.hash }, complete: true, value: { entry: written, hash: receipt.fact.hash } });
    }
    throw new Error("Unexpected SCRIPTED route");
  };
  const context = { current: true }, fetcher = { call: fetch };
  const open = () => browserJoining(signer, { origin, membershipDefinition: definition, lock: { run: work => work() }, store, custody, now: () => now, current: () => context.current, fetch: (url, init) => fetcher.call(url, init) });
  const record = (): CustodyRecord | null => { const texts = [...memory.records.values()]; return texts.length === 1 ? JSON.parse(texts[0]!) as CustodyRecord : null; };
  return { api: open(), reload: open, link, seat: offered.seat, posts, settles, calls, key: signer.key, signer, custody, context, fetcher, store, record, records: () => memory.records.size,
    kept: () => structuredClone(held) as BrowserKeptJoin | null, setHeld: (value: unknown) => { held = structuredClone(value); },
    clock: (time: number) => { now = time; }, saving: (fails: boolean) => { failSave = fails; },
    replies: (values: { lose?: boolean; found?: boolean; wrongSession?: boolean; wrongReceipt?: boolean }) => { lose = values.lose ?? lose; found = values.found ?? found; wrongSession = values.wrongSession ?? wrongSession; wrongReceipt = values.wrongReceipt ?? wrongReceipt; } };
}

const gate = () => {
  let release!: () => void;
  const wait = new Promise<void>((done) => { release = done; });
  return { wait, release };
};

// ScopeHandle's legitimate diagnostic fallback remains available only while the request context owns the read.
test("a join proof starts its fallback GET only while the context remains current", async () => {
  for (const expires of [false, true]) {
    const f = await fixture(), entered = gate(), held = gate(), fetch = f.fetcher.call;
    f.replies({ lose: false });
    let entries = 0;
    f.fetcher.call = async (url, init) => {
      if (new URL(url).pathname.endsWith("/entries/1")) {
        entries++;
        if (entries === 1) {
          entered.release(); await held.wait;
          return { status: 503, body: new Response(JSON.stringify({ ok: false, reason: "unavailable" })).body };
        }
      }
      return fetch(url, init);
    };
    const pending = f.api.join(f.link, f.seat);
    const outcome = expires ? expect(pending).rejects.toThrow("no longer current") : expect(pending).resolves.toMatchObject({ status: "joined" });
    await entered.wait;
    const original = f.kept();
    f.context.current = !expires; held.release(); await outcome;
    expect([entries, f.posts.length, f.record()!.phase, f.kept(), f.calls.filter(call => call.startsWith("clear"))]).toEqual(
      expires ? [1, 1, "unknown", original, []] : [2, 1, "accepted", null, ["clear joined"]]);
  }
});

test("a kept browser join recovers by reads and checks its original receipt, member and exact recorded signature", async () => {
  for (const version of ["platform:membership@4", "platform:membership@6", "platform:membership@7", "platform:membership@8"] as const) {
    const f = await fixture(version);
    expect(await f.api.join(f.link, f.seat)).toMatchObject({ status: "unknown" });
    // The slot names the key before anything is signed; custody keeps the envelope before it is sent.
    expect(f.posts).toHaveLength(1); expect(f.calls.slice(0, 4)).toEqual(["save slot", "keep", "keep", "post"]);
    const held = f.kept()!; expect(f.record()!.phase).toBe("unknown"); expect(verifySignedIntent(f.posts[0]!)).toBe(true);
    expect(f.posts[0]!.intent.idempotencyKey).toBe(held.key); expect(canonicalize(f.record()!.envelope.signed)).toBe(canonicalize(f.posts[0]));
    if (version !== "platform:membership@4") {
      expect(Object.hasOwn(f.posts[0]!.intent.fields, "secret")).toBe(false);
      expect(verifyInvitationProof(keyIdOfSecret(seed), f.posts[0]!.intent.fields["proof"], f.seat.membership, 1, f.key)).toBe(true);
    } else expect(f.posts[0]!.intent.fields["secret"]).toBe(f.link.secret);
    expect(await f.api.check()).toMatchObject({ status: "unknown" }); expect(f.posts).toHaveLength(1); expect(f.kept()).toEqual(held);
    f.replies({ found: true, wrongReceipt: true });
    expect(await f.api.check()).toMatchObject({ status: "unknown" }); expect(f.kept()).toEqual(held);
    f.replies({ wrongReceipt: false, wrongSession: true });
    expect(await f.api.check()).toMatchObject({ status: "unknown" }); expect(f.kept()).toEqual(held);
    f.replies({ wrongSession: false });
    // A reload: a new page over the same slot and custody settles the same envelope with a read, and signs nothing.
    expect(await f.reload().check()).toEqual({ status: "joined", seat: f.seat }); expect(f.kept()).toBeNull(); expect(f.posts).toHaveLength(1);
    expect(f.settles.map(signed => canonicalize(signed))).toContain(canonicalize(f.posts[0])); expect(f.records()).toBe(1);
    expect(f.record()!.phase).toBe("accepted"); expect(f.calls.slice(-3)).toEqual(["entry", "keep", "clear joined"]);
  }
});

test("Continue submits only the original unexpired browser join and a failed durable save sends nothing", async () => {
  const f = await fixture(); await f.api.join(f.link, f.seat);
  const original = canonicalize(f.posts[0]), held = f.kept()!;
  // Custody writes `sent` before it sends; a write that fails sends nothing.
  f.saving(true);
  expect(await f.api.continueOriginal()).toMatchObject({ status: "unknown" }); expect(f.posts).toHaveLength(1); expect(f.kept()).toEqual(held);
  f.saving(false); f.replies({ lose: false });
  expect(await f.api.continueOriginal()).toEqual({ status: "joined", seat: f.seat }); expect(f.posts).toHaveLength(2); expect(canonicalize(f.posts[1])).toBe(original);
  const expired = await fixture(); await expired.api.join(expired.link, expired.seat); const pending = expired.kept()!;
  expired.clock(Date.parse(expired.record()!.envelope.signed.intent.notAfter));
  // The first send went and lost its reply. Past the deadline, this press sends nothing and cannot call the join unsent.
  expect(await expired.api.continueOriginal()).toMatchObject({ status: "unknown", reason: "The original join's deadline has passed. This press sent nothing, and an earlier send of this join has no known outcome. Check it; do not use the invitation again." }); expect(expired.posts).toHaveLength(1); expect(expired.kept()).toEqual(pending);
});

test("browser invitation context mismatches and malformed kept joins cannot be signed, dispatched or cleared", async () => {
  const f = await fixture();
  for (const link of [{ ...f.link, service: "https://other.test" }, { ...f.link, service: origin + "/other" }, { ...f.link, definition: "platform:membership@5" }]) {
    expect(readBrowserInvitation(linkText(link), { origin, membershipDefinition: "platform:membership@6" }).ok).toBe(false);
    expect(await f.api.join(link, f.seat)).toMatchObject({ status: "nothing-sent" });
  }
  expect(await f.api.join(f.link, { ...f.seat, membership: { ...f.seat.membership, genesis: textDigest("TEST genesis 9") } })).toMatchObject({ status: "nothing-sent" });
  expect(f.posts).toHaveLength(0); expect(f.kept()).toBeNull();
  const pending = f.api.join(f.link, f.seat);
  f.link.invitation = 2; f.seat.handle = "@changed";
  await pending;
  expect(f.posts[0]!.intent.fields["invitation"]).toBe(1); expect(f.kept()!.seat.handle).toBe("@browser"); expect(f.records()).toBe(1);
  const held = f.kept()!, malformed = { ...held, seat: { ...held.seat, origin: "https://other.test" } };
  f.setHeld(malformed);
  expect(await f.api.check()).toMatchObject({ status: "unknown" }); expect(await f.api.continueOriginal()).toMatchObject({ status: "unknown" }); expect(f.posts).toHaveLength(1); expect(f.kept()).toEqual(malformed);
});

test("a join slot from before the cutover is removed, the person is told the room retired, and nothing is signed or sent", async () => {
  const f = await fixture();
  const retired = { v: 1, seat: f.seat, kept: { v: 1, kind: "join", envelope: { signed: {}, grants: [], beside: {} }, phase: "unknown" } };
  for (const press of [() => f.api.check(), () => f.api.continueOriginal(), () => f.api.join(f.link, f.seat)]) {
    f.setHeld(retired);
    expect(await press()).toEqual({ status: "retired", reason: RETIRED_REQUEST });
    expect(f.kept()).toBeNull(); expect(f.calls.at(-1)).toBe("clear retired");
  }
  f.setHeld(retired);
  expect(await f.api.pending()).toBeNull(); expect(await f.api.retired()).toBe(RETIRED_REQUEST); expect(f.kept()).toBeNull(); expect(await f.api.retired()).toBeNull();
  expect(f.posts).toHaveLength(0); expect(f.records()).toBe(0);
  // With the old slot gone, the invitation signs one join.
  await f.api.join(f.link, f.seat); expect(f.posts).toHaveLength(1);
});

test("a slot whose join was never signed clears on Check and says that nothing was sent", async () => {
  const f = await fixture();
  f.setHeld({ v: 2, seat: f.seat, key: "TEST-unsigned-key" });
  expect(await f.api.check()).toMatchObject({ status: "nothing-sent" }); expect(f.kept()).toBeNull(); expect(f.posts).toHaveLength(0);
});

// Invariant: storage failure cannot prove that a saved join slot was never signed.
test("an unreadable custody find keeps the join slot through join recovery and Check", async () => {
  const f = await fixture();
  let signs = 0;
  const sign = f.signer.sign;
  f.signer.sign = async (bytes) => { signs++; return sign(bytes); };
  f.custody.read = async () => { throw new Error("SCRIPTED unreadable custody"); };
  expect(await f.api.join(f.link, f.seat)).toMatchObject({ status: "unknown" });
  const original = f.kept();
  expect(original).not.toBeNull();
  expect(await f.api.check()).toMatchObject({ status: "unknown" });
  expect([f.kept(), signs, f.posts.length, f.calls.filter((call) => call.startsWith("clear"))]).toEqual([original, 0, 0, []]);
});

// Invariant: invalidating a join after one port begins prevents the next signer, session, proof, and slot clear.
test("a join whose context ends during its act or session keeps the original without later authentication or proof", async () => {
  for (const stage of ["act", "session-sign", "session", "entry"] as const) {
    const f = await fixture(), entered = gate(), held = gate();
    f.replies({ lose: false });
    let signs = 0;
    const sign = f.signer.sign;
    f.signer.sign = async (bytes) => {
      signs++;
      if (stage === "session-sign" && signs === 2) { entered.release(); await held.wait; }
      return sign(bytes);
    };
    const fetch = f.fetcher.call;
    f.fetcher.call = async (url, init) => {
      const path = new URL(url).pathname;
      if (stage === "act" && path.endsWith("/acts") || stage === "session" && path.endsWith("/sessions") || stage === "entry" && path.endsWith("/entries/1")) {
        entered.release(); await held.wait;
      }
      return fetch(url, init);
    };
    const pending = f.api.join(f.link, f.seat), rejected = expect(pending).rejects.toThrow("no longer current");
    await entered.wait;
    const original = f.kept();
    f.context.current = false;
    held.release();
    await rejected;
    expect([f.kept(), f.posts.length, f.record()!.phase, f.calls.filter((call) => call.startsWith("clear"))]).toEqual([original, 1, "unknown", []]);
    expect(signs).toBe(stage === "act" ? 1 : 2);
    expect(f.calls.filter((call) => call === "session").length).toBe(stage === "session" || stage === "entry" ? 1 : 0);
    expect(f.calls.filter((call) => call === "entry").length).toBe(stage === "entry" ? 1 : 0);
  }
});

// Invariant: a context that ends during unsigned recovery never clears its saved join pointer.
test("a join context that ends during the recovery read retains its slot", async () => {
  const f = await fixture(), entered = gate(), held = gate(), read = f.custody.read;
  let reads = 0;
  f.custody.read = async (id) => {
    reads++;
    if (reads === 2) { entered.release(); await held.wait; }
    return read(id);
  };
  f.saving(true);
  const pending = f.api.join(f.link, f.seat), rejected = expect(pending).rejects.toThrow("no longer current");
  await entered.wait;
  const original = f.kept();
  f.context.current = false;
  held.release();
  await rejected;
  expect([f.kept(), f.posts.length, f.calls.filter((call) => call.startsWith("clear"))]).toEqual([original, 0, []]);
});

// A host may await a verified-seat handoff before removing the pointer. It must retain the supplied current capability.
test("an awaited host handoff keeps the join pointer when its clearing capability expires", async () => {
  const f = await fixture(), entered = gate(), held = gate(), clear = f.store.clear;
  f.replies({ lose: false });
  f.store.clear = async (outcome, current) => {
    entered.release(); await held.wait;
    if (!current?.()) throw new Error("This join context is no longer current.");
    await clear(outcome, current);
  };
  const pending = f.api.join(f.link, f.seat), rejected = expect(pending).rejects.toThrow("no longer current");
  await entered.wait;
  const original = f.kept();
  f.context.current = false; held.release(); await rejected;
  expect([f.kept(), f.record()!.phase, f.posts.length, f.calls.filter(call => call.startsWith("clear"))]).toEqual([original, "accepted", 1, []]);
});
