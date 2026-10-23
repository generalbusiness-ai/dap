/** Actual device signatures and HTTP codec/receipt checks. Backend entries,
 * session answers, storage and locks are SCRIPTED, not native enrollment. */
import { expect, test } from "vitest";
import type { Entry, Receipt, ScopeKind, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, entryHash, intentDigest, keyIdOfSecret, newIncarnation, scopeIdOf, textDigest, utf8, verifyInvitationProof, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { browserJoining, generateBrowserDeviceKey, readBrowserInvitation, storedWebCryptoSigner, type BrowserJoinStore, type BrowserKeptJoin, type Fetch, type InvitationLink } from "../src/index.ts";
const origin = "https://browser.test", start = Date.parse("2026-10-18T12:00:00Z"), seed = new Uint8Array(32).fill(66);
type Version = "platform:membership@4" | "platform:membership@6" | "platform:membership@7" | "platform:membership@8";
const reference = (kind: ScopeKind): ScopeRef => ({ scope: scopeIdOf({ v: 1, kind, definition: textDigest("TEST browser joining " + kind), creator: null, cause: textDigest("TEST browser joining address"), ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(2)), kind });
function invitation(definition: Version): InvitationLink {
  return { v: 1, service: origin, repository: { directory: reference("directory"), membership: reference("membership"), rules: reference("rules").scope, destination: reference("destination").scope },
    invitation: 1, secret: definition !== "platform:membership@4" ? b64url(seed) : "PUBLIC TEST legacy invitation", handle: "@browser", definition };
}
const linkText = (link: InvitationLink) => "artroom-invite:" + b64url(utf8(JSON.stringify(link)));
async function fixture(definition: Version = "platform:membership@6") {
  const device = await generateBrowserDeviceKey(), signer = storedWebCryptoSigner(device.publicKey, device.pair.privateKey), link = invitation(definition);
  const offered = readBrowserInvitation(linkText(link), { origin, membershipDefinition: definition });
  if (!offered.ok) throw new Error("The TEST invitation was refused");
  let held: BrowserKeptJoin | null = null, now = start, failSave = false, lose = true, found = false, wrongSession = false, wrongReceipt = false;
  let written: Entry | null = null, receipt: Receipt | null = null;
  const posts: SignedIntent[] = [], calls: string[] = [];
  const store: BrowserJoinStore = { load: async () => structuredClone(held), save: async value => { if (failSave) throw new Error("SCRIPTED storage failure"); held = structuredClone(value); calls.push("save " + value.kept.phase); }, clear: async () => { held = null; calls.push("clear"); } };
  const reply = (value: unknown, status = 200) => ({ status, body: new Response(JSON.stringify(value)).body });
  const fetch: Fetch = async (url, init) => {
    const path = new URL(url).pathname;
    const body = init?.body ? JSON.parse(init.body) : null;
    if (path.endsWith("/acts")) {
      posts.push(structuredClone(body.signed)); calls.push("post");
      written = { v: 1, at: offered.seat.membership, seq: 1, prev: textDigest("SCRIPTED previous entry"), time: new Date(start).toISOString().replace(".000Z", "Z"), clamped: false, epoch: 0,
        input: { type: "act", signed: body.signed, authority: [], presented: {} }, uses: [], prepared: [], effects: [], sends: [] };
      receipt = { fact: { at: written.at, seq: 1, hash: entryHash(written) }, definition, intent: intentDigest(body.signed.intent), effects: [], sends: [], epoch: 0 };
      if (lose) throw new Error("SCRIPTED lost reply");
      return reply({ answer: "accepted", receipt });
    }
    if (path.endsWith("/settle")) {
      calls.push("settle");
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
  const api = browserJoining(signer, { origin, membershipDefinition: definition, lock: { run: work => work() }, store, now: () => now, fetch });
  return { api, link, seat: offered.seat, posts, calls, key: signer.key, store,
    kept: () => structuredClone(held), setHeld: (value: BrowserKeptJoin) => { held = structuredClone(value); },
    clock: (time: number) => { now = time; }, saving: (fails: boolean) => { failSave = fails; },
    replies: (values: { lose?: boolean; found?: boolean; wrongSession?: boolean; wrongReceipt?: boolean }) => { lose = values.lose ?? lose; found = values.found ?? found; wrongSession = values.wrongSession ?? wrongSession; wrongReceipt = values.wrongReceipt ?? wrongReceipt; } };
}

test("a kept browser join recovers by reads and checks its original receipt, member and exact recorded signature", async () => {
  for (const version of ["platform:membership@4", "platform:membership@6", "platform:membership@7", "platform:membership@8"] as const) {
    const f = await fixture(version);
    expect(await f.api.join(f.link, f.seat)).toMatchObject({ status: "unknown" });
    expect(f.posts).toHaveLength(1); expect(f.calls.slice(0, 3)).toEqual(["save prepared", "save inflight", "post"]);
    const held = f.kept()!; expect(held.kept.phase).toBe("unknown"); expect(verifySignedIntent(f.posts[0]!)).toBe(true);
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
    expect(await f.api.check()).toEqual({ status: "joined", seat: f.seat }); expect(f.kept()).toBeNull(); expect(f.posts).toHaveLength(1);
    expect(f.calls.slice(-3)).toEqual(["entry", "save recorded", "clear"]);
  }
});

test("Continue submits only the original unexpired browser join and a failed durable save sends nothing", async () => {
  const f = await fixture(); await f.api.join(f.link, f.seat);
  const original = canonicalize(f.posts[0]), held = f.kept()!;
  f.saving(true);
  expect(await f.api.continueOriginal()).toMatchObject({ status: "unknown" }); expect(f.posts).toHaveLength(1); expect(f.kept()).toEqual(held);
  f.saving(false); f.replies({ lose: false });
  expect(await f.api.continueOriginal()).toEqual({ status: "joined", seat: f.seat }); expect(f.posts).toHaveLength(2); expect(canonicalize(f.posts[1])).toBe(original);
  const expired = await fixture(); await expired.api.join(expired.link, expired.seat); const pending = expired.kept()!;
  expired.clock(Date.parse(pending.kept.envelope.signed.intent.notAfter));
  expect(await expired.api.continueOriginal()).toMatchObject({ status: "unknown" }); expect(expired.posts).toHaveLength(1); expect(expired.kept()).toEqual(pending);
});

test("browser invitation context mismatches and malformed kept joins cannot be signed, dispatched or cleared", async () => {
  const f = await fixture();
  for (const link of [{ ...f.link, service: "https://other.test" }, { ...f.link, service: origin + "/other" }, { ...f.link, definition: "platform:membership@5" }]) {
    expect(readBrowserInvitation(linkText(link), { origin, membershipDefinition: "platform:membership@6" }).ok).toBe(false);
    expect(await f.api.join(link, f.seat)).toMatchObject({ status: "nothing-sent" });
  }
  expect(await f.api.join(f.link, { ...f.seat, membership: { ...f.seat.membership, inc: newIncarnation(new Uint8Array(16).fill(9)) } })).toMatchObject({ status: "nothing-sent" });
  expect(f.posts).toHaveLength(0); expect(f.kept()).toBeNull();
  const pending = f.api.join(f.link, f.seat);
  f.link.invitation = 2; f.seat.handle = "@changed";
  await pending;
  expect(f.posts[0]!.intent.fields["invitation"]).toBe(1); expect(f.kept()!.seat.handle).toBe("@browser");
  const held = f.kept()!, malformed = { ...held, seat: { ...held.seat, origin: "https://other.test" } };
  f.setHeld(malformed);
  expect(await f.api.check()).toMatchObject({ status: "unknown" }); expect(await f.api.continueOriginal()).toMatchObject({ status: "unknown" }); expect(f.posts).toHaveLength(1); expect(f.kept()).toEqual(malformed);
});
