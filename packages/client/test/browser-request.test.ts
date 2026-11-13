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
  return { store, requests, script, calls, posted, send, again, builds: () => builds, phase: async (key: string) => (await requests.find(key))?.phase ?? null };
}

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
