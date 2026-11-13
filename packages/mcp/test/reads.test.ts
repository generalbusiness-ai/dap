import { setImmediate } from "node:timers/promises";
import { expect, test } from "vitest";
import type { ScopeRef, SignedSessionRequest } from "@generalbusiness/dap-contract";
import { secretSigner } from "@generalbusiness/dap-client";
import { Reads, ReadSessions } from "../src/reads.ts";
import { Kept, readInventory } from "../src/inventory.ts";
import { StandIn, SERVICE } from "./support/standin.ts";

const START = Date.parse("2099-01-01T00:00:00Z");
const signer = () => secretSigner(crypto.getRandomValues(new Uint8Array(32)));
const gate = () => {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  return { wait, release };
};

// The HTTP answers and session authority are stand-ins; the request signatures,
// response binding, expiry, cache and each transport are real.
test("concurrent reads share one issuance; completed credentials keep each reader's transport and expiry", async () => {
  const key = signer(), stand = new StandIn(key.key), sessions = new ReadSessions(), clock = { now: START };
  const entered = gate(), release = gate();
  let closed = false, firstRequests = 0, secondRequests = 0;
  const first = new Reads({ service: SERVICE, signer: key, sessions, now: () => clock.now, fetch: async (url, init) => {
    expect(closed, "a new reader must not reuse a closed collection's fetch").toBe(false);
    firstRequests++;
    if (url.endsWith("/sessions")) { entered.release(); await release.wait; }
    return stand.fetch(url, init);
  } });
  const pending = [first.session(stand.membership), first.session(stand.membership), first.session(stand.membership)];
  await entered.wait;
  expect(firstRequests).toBe(1);
  release.release();
  const held = await Promise.all(pending);
  expect(held[0]).not.toBeNull();
  expect(held.every(value => value === held[0])).toBe(true);
  closed = true;
  const second = new Reads({ service: SERVICE, signer: key, sessions, now: () => clock.now, fetch: async (url, init) => {
    secondRequests++; return stand.fetch(url, init);
  } });
  const summary = await second.read(stand.membership, (transport, reader) => transport.summary(stand.directory.scope, reader));
  expect(summary.ok).toBe(true);
  expect(secondRequests).toBe(1);
  expect(second.held(stand.membership)).toBe(true);
  clock.now = Date.parse(stand.sessionEnds) - 9999;
  stand.sessionEnds = "2099-01-01T00:20:00Z";
  expect(await second.session(stand.membership)).not.toBe(held[0]);
  expect(secondRequests).toBe(2);
});

test("shared credentials bind service, signer and the full membership reference", async () => {
  const sessions = new ReadSessions(), a = signer(), b = signer(), stand = new StandIn(a.key);
  let issued = 0;
  const fetcher = async (_url: string, init?: { body?: string }) => {
    issued++;
    const signed = JSON.parse(init!.body!) as SignedSessionRequest;
    return { status: 200, body: new Response(JSON.stringify({ ok: true, token: "STANDIN-private-token", session: {
      v: 1, deployment: "standin", membership: signed.request.to, key: signed.request.actor, member: "@agent", reads: [], ends: "2099-01-01T00:10:00Z",
    } })).body as never };
  };
  const cases = [
    { service: SERVICE, key: a, ref: stand.membership },
    { service: SERVICE + "/another", key: a, ref: stand.membership },
    { service: SERVICE, key: b, ref: stand.membership },
    { service: SERVICE, key: a, ref: { ...stand.membership, genesis: stand.directory.genesis } },
    { service: SERVICE, key: a, ref: { ...stand.membership, scope: stand.directory.scope } },
    { service: SERVICE, key: a, ref: { ...stand.membership, kind: "directory" as const } },
  ];
  for (const [index, one] of cases.entries()) {
    const reads = new Reads({ service: one.service, signer: one.key, sessions, now: () => START, fetch: fetcher });
    const session = await reads.session(one.ref);
    expect(session?.claims.membership).toEqual(one.ref);
    expect(session?.claims.key).toBe(one.key.key);
    expect(issued).toBe(index + 1);
    expect(await reads.session(one.ref)).toBe(session);
    expect(issued).toBe(index + 1);
  }
});

test("forget during issuance discards its late answer and never replaces a newer credential", async () => {
  const key = signer(), stand = new StandIn(key.key), sessions = new ReadSessions(), entered = gate(), release = gate();
  let requests = 0;
  const reads = new Reads({ service: SERVICE, signer: key, sessions, now: () => START, fetch: async (url, init) => {
    requests++;
    if (requests === 1) { entered.release(); await release.wait; }
    return stand.fetch(url, init);
  } });
  const old = reads.session(stand.membership);
  await entered.wait;
  reads.forget(stand.membership.scope);
  const fresh = await reads.session(stand.membership);
  expect(fresh).not.toBeNull();
  release.release();
  expect(await old).toBeNull();
  expect(await reads.session(stand.membership)).toBe(fresh);
  expect(requests).toBe(2);
});

test("refusal cooldown and signed-read fallback stay local to a reader; explicit forget invalidates shared credentials", async () => {
  const key = signer(), stand = new StandIn(key.key), sessions = new ReadSessions(), clock = { now: START };
  stand.sessions = "refuse";
  const make = () => new Reads({ service: SERVICE, signer: key, sessions, now: () => clock.now, fetch: stand.fetch });
  const a = make();
  expect(await a.session(stand.membership)).toBeNull();
  const b = make();
  const result = await a.read(stand.membership, (transport, reader) => transport.summary(stand.directory.scope, reader));
  expect(result.ok).toBe(true);
  expect(stand.requests.filter(route => route.endsWith("/sessions"))).toHaveLength(1);
  stand.sessions = "issue";
  expect(await b.session(stand.membership)).not.toBeNull();
  expect(stand.requests.filter(route => route.endsWith("/sessions"))).toHaveLength(2);
  clock.now += 60_000;
  expect(await b.session(stand.membership)).not.toBeNull();
  a.forget(stand.membership.scope);
  expect(await b.session(stand.membership)).not.toBeNull();
  expect(stand.requests.filter(route => route.endsWith("/sessions"))).toHaveLength(3);
});

test("an exact-read inventory overlaps fresh authority reads and omits unrelated discovery", async () => {
  const key = signer(), stand = new StandIn(key.key), started = gate(), release = gate(), seen: string[] = [];
  const authority = [stand.membership.scope, stand.directory.scope, stand.rules.scope];
  const reads = new Reads({ service: SERVICE, signer: key, now: () => START, fetch: async (url, init) => {
    const scope = new URL(url).pathname.split("/").at(-1)!;
    if ((init?.method ?? "GET") === "GET" && authority.includes(scope as ScopeRef["scope"])) {
      seen.push(scope); started.release(); await release.wait;
    }
    return stand.fetch(url, init);
  } });
  await reads.session(stand.membership);
  const pending = readInventory(reads, new Kept(), stand.config(), stand.destination.scope);
  await started.wait;
  await setImmediate();
  try { expect(seen.sort()).toEqual([...authority].sort()); } finally { release.release(); }
  const inventory = await pending;
  expect(inventory.inventory.scopes.map(scope => scope.scope)).toEqual([stand.destination.scope]);
  expect(inventory.inventory.standing[stand.membership.scope]).toMatchObject({ known: true, role: "admin" });
  expect(stand.requests.filter(route => route.startsWith("GET "))).toHaveLength(3);
});

// The cache holds at most 64 completed identities. Eviction costs a new
// signed session request; it cannot turn an old membership into authority.
test("the shared credential cache evicts after 64 identities and reissues for the evicted identity", async () => {
  const key = signer(), stand = new StandIn(key.key), sessions = new ReadSessions();
  const reads = new Reads({ service: SERVICE, signer: key, sessions, now: () => START, fetch: stand.fetch });
  expect(await reads.session(stand.membership)).not.toBeNull();
  for (let n = 0; n < 64; n++) {
    const scope = stand.add("membership", "platform:membership@2");
    expect(await reads.session(scope)).not.toBeNull();
  }
  expect(await reads.session(stand.membership)).not.toBeNull();
  expect(stand.requests.filter(route => route.endsWith("/sessions"))).toHaveLength(66);
});
