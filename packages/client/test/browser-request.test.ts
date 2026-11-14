/**
 * The requests of a browser page in `Custody` (NF-5). These cases carry the witnesses of the retired `Kept` protocol
 * (`advance`) onto the one custody. The scope is a STAND-IN: `post`, `settle` and `recorded` are scripted, and
 * `memoryStore` stands in for the browser store. The signatures are real.
 */
import { expect, test } from "vitest";
import type { Answer, Receipt } from "@generalbusiness/dap-contract";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { browserRequests, meaningOf, memoryStore, signedIntent, type BrowserRequestPorts, type Envelope } from "../src/index.ts";
import { T0, lane, receiptOf, signer } from "./support/custody.ts";

const who = { service: "https://scopes.test", membership: null, signer: signer.key, target: lane };
const notAfter = timeOf(T0 + 60_000);
function bench(fields: Record<string, unknown> = { name: "Sieve" }) {
  const store = memoryStore(), calls: string[] = [], posted: string[] = [];
  let builds = 0;
  const script: { post: (e: Envelope) => Promise<Answer>; settle: boolean; sound: boolean; current: boolean } = {
    post: async (e) => ({ answer: "accepted", receipt: receiptOf(e.signed, 3) }), settle: false, sound: true, current: true };
  const ports: BrowserRequestPorts = {
    current: () => script.current,
    post: (e) => { calls.push("post"); posted.push(canonicalize(e)); return script.post(e); },
    settle: async (e) => { calls.push("settle"); return script.settle ? receiptOf(e.signed, 3) : null; },
    recorded: async () => { calls.push("recorded"); return script.sound; },
  };
  const requests = browserRequests(store, who, ports, () => T0);
  const build = (key: string) => async () => { builds++; calls.push("sign");
    return { binding: { definition: "TEST", kind: "donate", declaration: null, pinned: "platform:inbox@1" as const }, envelope: { signed: await signedIntent(signer, { to: lane, kind: "donate", fields }, { idempotencyKey: key, now: T0 }), beside: {} } }; };
  const send = (key: string) => requests.send(key, meaningOf(fields), build(key), { notAfter });
  const again = (key: string) => requests.send(key, meaningOf(fields), async () => { throw new Error("must not sign"); }, { notAfter });
  return { store, requests, ports, build, script, calls, posted, send, again, builds: () => builds, phase: async (key: string) => (await requests.find(key))?.phase ?? null };
}

const gate = () => {
  let release!: () => void;
  const wait = new Promise<void>((done) => { release = done; });
  return { wait, release };
};

// Invariant: custody keeps the envelope before its one send, and each answer leaves the phase that is true.
test("a request is kept before its one send, and each answer leaves the phase that is true", async () => {
  const accepted = bench();
  expect(await accepted.send("k")).toEqual({ status: "recorded" });
  expect([accepted.calls, await accepted.phase("k")]).toEqual([["sign", "post", "recorded"], "accepted"]);

  const refused = bench();
  refused.script.post = async () => ({ answer: "refused", reason: "type-full", judgedAt: { seq: 1, hash: `sha256:${"b".repeat(64)}` } });
  expect(await refused.send("k")).toEqual({ status: "refused", reason: "type-full" });
  expect(await refused.phase("k")).toBe("refused");

  // An acceptance that the scope's record does not bear out is a lost reply: the record stays unresolved.
  const unsound = bench();
  unsound.script.sound = false;
  expect(await unsound.send("k")).toEqual({ status: "unknown" });
  expect(await unsound.phase("k")).toBe("unknown");

  for (const post of [async () => { throw new Error("the reply was lost"); }, async (): Promise<Answer> => ({ answer: "unavailable", reason: "TEST" } as Answer)]) {
    const lost = bench();
    lost.script.post = post;
    expect(await lost.send("k")).toEqual({ status: "unknown" });
    expect([await lost.phase("k"), lost.calls.filter((call) => call === "post")]).toEqual(["unknown", ["post"]]);
  }
});

// Invariant: Check reads and sends nothing; only a read settles a request that may have been sent.
test("Check settles a request that may have been sent with a read, and sends and signs nothing", async () => {
  const b = bench();
  b.script.post = async () => { throw new Error("lost"); };
  await b.send("k");
  b.calls.length = 0;
  expect(await b.requests.settle("k")).toEqual({ status: "unknown" });
  expect([b.calls, await b.phase("k")]).toEqual([["settle"], "unknown"]);
  b.script.settle = true;
  expect(await b.requests.settle("k")).toEqual({ status: "recorded" });
  expect([b.calls.slice(1), await b.phase("k"), b.builds(), b.posted.length]).toEqual([["settle", "recorded"], "accepted", 1, 1]);
  // A settlement the page cannot check settles nothing.
  const unsound = bench();
  unsound.script.post = async () => { throw new Error("lost"); };
  await unsound.send("k");
  Object.assign(unsound.script, { settle: true, sound: false });
  expect(await unsound.requests.settle("k")).toEqual({ status: "unknown" });
  expect(await unsound.phase("k")).toBe("unknown");
  // A final record gives its outcome with no read and no send.
  const done = bench();
  await done.send("k");
  done.calls.length = 0;
  expect([await done.again("k"), await done.requests.settle("k"), done.calls]).toEqual([{ status: "recorded" }, { status: "recorded" }, []]);
});

// Invariant: explicit Continue sends the exact kept envelope again, never a new signing; a failed custody write or an ended
// context stops it before anything leaves.
test("Continue sends the exact kept envelope after a loss, and a failed write or an ended context sends nothing", async () => {
  const b = bench();
  b.script.post = async () => { throw new Error("lost"); };
  await b.send("k");
  b.script.post = async (e) => ({ answer: "accepted", receipt: receiptOf(e.signed, 3) });
  expect(await b.again("k")).toEqual({ status: "recorded" });
  expect([b.posted.length, b.posted[1] === b.posted[0], b.builds()]).toEqual([2, true, 1]);

  const broken = bench();
  broken.script.post = async () => { throw new Error("lost"); };
  await broken.send("k");
  const write = broken.store.write;
  broken.store.write = async () => { throw new Error("TEST private transaction did not commit"); };
  await expect(broken.again("k")).rejects.toThrow();
  broken.store.write = write;
  broken.script.current = false;
  await expect(broken.again("k")).rejects.toThrow();
  expect([broken.posted.length, await broken.phase("k")]).toEqual([1, "unknown"]);
});

// Invariant: waiting for admission grants no authority to sign after the context ends.
test("a context that ends while admission waits never invokes the signer or sends", async () => {
  const b = bench(), entered = gate(), held = gate(), exclusive = b.store.exclusive;
  b.store.exclusive = async (work) => { entered.release(); await held.wait; return exclusive(work); };
  const sending = b.send("held admission");
  const rejected = expect(sending).rejects.toThrow("no longer current");
  await entered.wait;
  b.script.current = false;
  held.release();
  await rejected;
  expect([b.builds(), b.posted.length, await b.phase("held admission")]).toEqual([0, 0, null]);

  // A signature already invoked cannot be undone. Its returned value starts no new work.
  const started = bench(), signing = gate(), returned = gate();
  const pending = started.requests.send("held signature", meaningOf({ name: "Sieve" }), async () => {
    const built = await started.build("held signature")();
    signing.release(); await returned.wait; return built;
  }, { notAfter });
  const discarded = expect(pending).rejects.toThrow("no longer current");
  await signing.wait;
  started.script.current = false;
  returned.release();
  await discarded;
  expect([started.builds(), started.posted.length, await started.phase("held signature")]).toEqual([1, 0, null]);
});

// Invariant: a begun act retains uncertainty when its reply loses the context. No later proof or UI result follows.
test("a context that ends during POST or receipt verification keeps the original unresolved", async () => {
  for (const stage of ["post", "recorded"] as const) {
    const b = bench(), entered = gate(), held = gate();
    if (stage === "post") b.script.post = async (e) => { entered.release(); await held.wait; return { answer: "accepted", receipt: receiptOf(e.signed, 3) }; };
    else b.ports.recorded = async () => { b.calls.push("recorded"); entered.release(); await held.wait; return true; };
    const pending = b.send("original"), rejected = expect(pending).rejects.toThrow("no longer current");
    await entered.wait;
    const original = canonicalize((await b.requests.find("original"))!.envelope);
    b.script.current = false;
    held.release();
    await rejected;
    expect([b.builds(), b.posted, await b.phase("original"), b.calls.filter((call) => call === "recorded").length]).toEqual([1, [original], "unknown", stage === "post" ? 0 : 1]);
  }
});

// Invariant: a read that loses its context proves neither absence nor acceptance.
test("a context that ends during settlement cannot accept a receipt or close a signing", async () => {
  for (const found of [false, true]) {
    const b = bench();
    b.script.post = found ? async () => { throw new Error("lost"); }
      : async (): Promise<Answer> => ({ answer: "refused", reason: "expired", judgedAt: { seq: 1, hash: `sha256:${"b".repeat(64)}` } });
    await b.send("original");
    b.calls.length = 0;
    const entered = gate(), held = gate();
    b.ports.settle = async (envelope) => { b.calls.push("settle"); entered.release(); await held.wait; return found ? receiptOf(envelope.signed, 3) : null; };
    const pending = b.requests.settle("original"), rejected = expect(pending).rejects.toThrow("no longer current");
    await entered.wait;
    b.script.current = false;
    held.release();
    await rejected;
    const record = (await b.requests.find("original"))!;
    expect([b.calls, record.phase, record.signings[0]!.closed, b.builds(), b.posted.length]).toEqual([["settle"], found ? "unknown" : "refused", undefined, 1, 1]);
  }
});

// Invariant: signed text that a request carries survives a lost answer and a read-only recovery unchanged.
test("the exact signed page text survives a lost answer and read-only recovery", async () => {
  const fields = { name: "Sieve", description: "Fine mesh", page: "shelf/0102030405060708.md", content: "The exact signed text" };
  const b = bench(fields);
  b.script.post = async () => { throw new Error("reply lost"); };
  await b.send("k");
  await b.requests.settle("k");
  const record = (await b.requests.find("k"))!;
  expect([record.envelope.signed.intent.fields, b.posted, (await b.requests.unresolved()).map((r) => r.key)]).toEqual([fields, [canonicalize(record.envelope)], ["k"]]);
});

// Invariant (c288c917, the user path): a lost reply, then a reload, settles the same envelope and signs no second one.
test("after a lost reply a reloaded page finds the request by its target and settles the same envelope without signing", async () => {
  const b = bench();
  b.script.post = async () => { throw new Error("lost"); };
  await b.send("k");
  const reloaded = browserRequests(b.store, who, { current: () => true, post: async () => { throw new Error("must not send"); },
    settle: async (e) => { b.calls.push("read " + canonicalize(e)); return receiptOf(e.signed, 3) as Receipt; }, recorded: async () => true }, () => T0 + 5_000);
  const [found] = await reloaded.unresolved();
  expect(found!.key).toBe("k");
  expect(await reloaded.settle(found!.key)).toEqual({ status: "recorded" });
  expect([b.calls.at(-1), b.builds()]).toEqual(["read " + b.posted[0], 1]);
  expect(await reloaded.unresolved()).toEqual([]);
});
