import { setImmediate } from "node:timers/promises";
import { expect, test } from "vitest";
import type { Input, Item, LogPage, Read, ScopeRef, SequenceEntry, SignedSessionRequest } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, intentDigest, timeOf } from "@generalbusiness/dap-bytes";
import { Custody, CustodyError, Lost, Reads, ReadSessions, identityId, meaningOf, memoryStore, secretSigner, signedIntent, type Identity } from "@generalbusiness/dap-client";
import { Kept, readInventory, standingFrom } from "../src/inventory.ts";
import { StandIn, SERVICE } from "./support/standin.ts";

const START = Date.parse("2099-01-01T00:00:00Z");
const signer = () => secretSigner(crypto.getRandomValues(new Uint8Array(32)));
const gate = () => {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  return { wait, release };
};

/** Real request signing and custody, with a canonical chained journal and scripted session/HTTP authority. No Native judge runs. */
async function absenceScene() {
  const key = signer(), stand = new StandIn(key.key), target = stand.add("lane", "platform:inbox@1");
  const scope = stand.scopes.get(target.scope)!, store = memoryStore(), clock = { now: START };
  let locks = 0, builds = 0, sessionSignatures = 0;
  const custody = new Custody({ ...store, lock: async (id, until) => {
    const release = await store.lock(id, until);
    if (!release) return null;
    locks++;
    return async () => { locks--; await release(); };
  } }, () => timeOf(clock.now));
  const who: Identity = { service: SERVICE, membership: stand.membership, signer: key.key, target, key: "TEST-absence" };
  await custody.send(who, meaningOf("TEST original"), async () => {
    builds++;
    return { binding: { definition: "inbox", kind: "open", declaration: null, pinned: "platform:inbox@1" },
      envelope: { signed: await signedIntent(key, { to: target, kind: "open", fields: {} }, { idempotencyKey: who.key, now: START, lifetimeSeconds: 60 }), beside: {} } };
  }, async () => { throw new Lost(); }, { notAfter: timeOf(START + 60_000) });
  clock.now = START + 120_000;
  const before = store.records.get(identityId(who))!, requests: string[] = [], authorities: string[] = [];
  type Page = Extract<Read<LogPage>, { ok: true }>;
  let change: ((page: Page, from: number) => unknown) | undefined;
  const reads = new Reads({ service: SERVICE, signer: { ...key, sign: async bytes => { sessionSignatures++; return key.sign(bytes); } }, now: () => clock.now,
    fetch: async (url, init) => {
      const at = new URL(url), method = init?.method ?? "GET";
      requests.push(`${method} ${at.pathname}`);
      if (at.pathname.endsWith("/log")) {
        expect(locks, "the journal read does not hold a custody identity lock").toBe(0);
        authorities.push((init?.headers as Record<string, string> | undefined)?.["authorization"] ?? "");
        const from = Number(at.searchParams.get("cursor") ?? "0"), rows = scope.entries.slice(from, from + 1);
        const more = from + rows.length < scope.entries.length;
        const page: Page = { ok: true, at: stand.head(scope), value: { scope: target, definition: scope.definition,
          entries: rows.map(row => ({ seq: row.entry.seq, hash: row.hash, bytes: canonicalize(row.entry) })) },
          complete: !more, ...(more ? { next: String(from + rows.length) } : {}) };
        const body = change ? change(page, from) : page;
        return { status: 200, body: new Response(JSON.stringify(body)).body as never };
      }
      return stand.fetch(url, init);
    } });
  const append = (at: number, input: Exclude<Input, { type: "genesis" }> = { type: "timed", item: 0, rule: "TEST other entry", due: timeOf(at) }) => {
    const entry: SequenceEntry = { v: 1, genesis: target.genesis, seq: scope.entries.length, prev: scope.entries.at(-1)!.hash,
      time: timeOf(at), clamped: false, epoch: 0, input, uses: [], prepared: [], effects: [], sends: [] };
    const row = { entry, hash: entryHash(entry) };
    scope.entries.push(row);
    return row;
  };
  return { key, stand, target, scope, store, custody, reads, who, before, append, requests, authorities,
    change: (next: typeof change) => { change = next; }, counts: () => ({ builds, sessionSignatures }) };
}

test("absence needs a continuous fixed head at expiry, and authenticates reads without signing another ACT", async () => {
  const s = await absenceScene();
  s.append(START + 59_999);
  expect(await s.reads.recoverAbsent(s.custody, s.who)).toMatchObject({ state: "unproved", why: { kind: "head-before-expiry" } });
  expect(s.store.records.get(identityId(s.who))).toBe(s.before);
  const fixed = s.append(START + 60_000), head = { seq: fixed.entry.seq, hash: fixed.hash };
  let grew = false;
  s.change((page, from) => {
    if (from === 0 && !grew) { grew = true; s.append(START + 60_001); }
    return page;
  });
  const recovered = await s.reads.recoverAbsent(s.custody, s.who);
  expect(recovered).toMatchObject({ state: "absent", head, record: { phase: "refused", outcomes: [{ lost: true }, { unsent: head }] } });
  expect(recovered.record!.envelope).toEqual(JSON.parse(s.before).envelope);
  expect(await s.store.unresolved()).toEqual([]);
  expect(s.requests.filter(request => request.endsWith("/log"))).toHaveLength(5);
  expect(s.authorities.every(value => value.startsWith("Session "))).toBe(true);
  expect(s.requests.filter(request => request.startsWith("POST "))).toHaveLength(1);
  expect(s.requests.find(request => request.endsWith("/acts"))).toBeUndefined();
  expect(s.counts()).toEqual({ builds: 1, sessionSignatures: 1 });
});

test("absence rejects broken, filtered, truncated, archived and contradictory journals without changing the original", async () => {
  const cases = ["prev", "head", "bytes", "gap", "scope", "definition", "no-next", "stalled", "refused", "floor", "backward-time"] as const;
  for (const fault of cases) {
    const s = await absenceScene(), last = s.append(START + 60_000);
    if (fault === "prev") { last.entry.prev = `sha256:${"d".repeat(64)}`; last.hash = entryHash(last.entry); }
    if (fault === "floor") s.append(START + 60_000, { type: "floor", floor: 1, receipt: { commit: "a".repeat(40), through: { seq: 0, hash: s.target.genesis } }, keep: [] });
    if (fault === "backward-time") s.append(START + 59_999);
    s.change((page, from) => {
      if (fault === "head") return { ...page, at: { ...page.at, hash: `sha256:${"e".repeat(64)}` } };
      if (fault === "bytes" && from === 1) return { ...page, value: { ...page.value, entries: [{ ...page.value.entries[0]!, bytes: page.value.entries[0]!.bytes + " " }] } };
      if (fault === "gap" && from === 0) return { ...page, value: { ...page.value, entries: [] } };
      if (fault === "scope") return { ...page, value: { ...page.value, scope: s.stand.directory } };
      if (fault === "definition") return { ...page, value: { ...page.value, definition: "platform:rules@2" } };
      if (fault === "no-next") { const { next: _, ...rest } = page; return { ...rest, complete: false }; }
      if (fault === "stalled") return { ...page, complete: false, next: String(from) };
      if (fault === "refused") return { ok: false, reason: "archived", archived: { floor: 1, commit: "a".repeat(40), through: { seq: 1, hash: last.hash } } };
      return page;
    });
    expect((await s.reads.recoverAbsent(s.custody, s.who)).state, fault).toBe("unproved");
    expect(s.store.records.get(identityId(s.who)), fault).toBe(s.before);
    expect(s.counts().builds, fault).toBe(1);
    expect(s.requests.find(request => request.endsWith("/acts")), fault).toBeUndefined();
  }
});

test("absence scans both actor and key, including a different intent under the kept key", async () => {
  for (const match of ["both", "actor-only", "key-only"] as const) {
    const s = await absenceScene(), author = match === "key-only" ? signer() : s.key;
    const signed = await signedIntent(author, { to: s.target, kind: "open", fields: { different: true } },
      { idempotencyKey: match === "actor-only" ? "TEST another key" : s.who.key, now: START, lifetimeSeconds: 60 });
    const row = s.append(START + 60_000, { type: "act", signed, authority: [], presented: {} });
    const found = await s.reads.recoverAbsent(s.custody, s.who);
    if (match === "both") {
      expect(found).toMatchObject({ state: "present", found: { fact: { at: s.target, seq: row.entry.seq, hash: row.hash }, intent: intentDigest(signed.intent) } });
      expect(s.store.records.get(identityId(s.who))).toBe(s.before);
    } else expect(found.state).toBe("absent");
    expect(s.counts().builds).toBe(1);
  }
});

test("absence refuses a missing session and does not fall back to a signed journal", async () => {
  const s = await absenceScene();
  s.append(START + 60_000);
  s.stand.sessions = "refuse";
  expect(await s.reads.recoverAbsent(s.custody, s.who)).toMatchObject({ state: "unproved", why: { kind: "no-session" } });
  expect(s.requests.some(request => request.endsWith("/log"))).toBe(false);
  expect(s.store.records.get(identityId(s.who))).toBe(s.before);
  expect(s.counts()).toEqual({ builds: 1, sessionSignatures: 1 });
});

test("absence requires the kept binding identity and keeps storage failures as errors", async () => {
  const changed = await absenceScene();
  changed.append(START + 60_000);
  const id = identityId(changed.who), record = (await changed.custody.find(changed.who))!;
  record.binding.pinned = "platform:rules@2";
  const changedBytes = canonicalize(record);
  changed.store.records.set(id, changedBytes);
  expect((await changed.reads.recoverAbsent(changed.custody, changed.who)).state).toBe("unproved");
  expect(changed.store.records.get(id)).toBe(changedBytes);
  expect(changed.counts().builds).toBe(1);

  const missing = await absenceScene(), kept = (await missing.custody.find(missing.who))!;
  const { binding: _, ...withoutBinding } = kept;
  const malformed = canonicalize(withoutBinding);
  missing.store.records.set(identityId(missing.who), malformed);
  expect(await missing.reads.recoverAbsent(missing.custody, missing.who)).toMatchObject({ state: "unproved", why: { kind: "identity" } });
  expect(missing.store.records.get(identityId(missing.who))).toBe(malformed);
  expect(missing.requests).toEqual([]);

  for (const failure of ["read", "write"] as const) {
    const s = await absenceScene();
    s.append(START + 60_000);
    const broken = new Custody({ ...s.store,
      ...(failure === "read" ? { read: async () => { throw Error("TEST storage read"); } }
        : { write: async () => { throw Error("TEST storage write"); } }),
    }, () => timeOf(START + 120_000));
    await expect(s.reads.recoverAbsent(broken, s.who)).rejects.toBeInstanceOf(CustodyError);
    expect(s.store.records.get(identityId(s.who))).toBe(s.before);
    expect(s.counts().builds).toBe(1);
    expect(s.requests.find(request => request.endsWith("/acts"))).toBeUndefined();
    const release = await s.store.lock(identityId(s.who), timeOf(START + 120_000));
    expect(release).not.toBeNull();
    await release?.();
  }
});

// The HTTP answers and session authority are stand-ins; the request signatures,
// response binding, expiry, cache and each transport are real.
test("concurrent reads share one issuance; completed credentials keep each reader's transport and expiry", async () => {
  const key = signer(), stand = new StandIn(key.key), sessions = new ReadSessions(), clock = { now: START };
  const entered = gate(), release = gate();
  let closed = false, firstRequests = 0, secondRequests = 0;
  const first = new Reads({ service: SERVICE, signer: key, sessions, now: () => clock.now, fetch: async (url, init) => {
    expect(closed, "a new reader must not reuse a closed collection's fetch").toBe(false);
    firstRequests++;
    if (new URL(url).pathname.endsWith("/sessions")) { entered.release(); await release.wait; }
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

// ES-1. Invariant: the inventory states standing from the value in the caller's session, and the shared value check (`judgeExploreGrant`)
// judges each action. `role`, `handle` and `key` only show the value. `kind` is the fixed `kind` field of the caller's member item in the
// membership summary that the inventory already read, and decides no action. With no value the standing is unknown. Stand-in: the
// roster, member and key are scripted (the member's kind is `person`), and `changeStanding` stands for a value that membership states
// differently. While the standing is unknown, the inventory has no role and no action for the caller: `room` lists the membership as
// "your standing here is unknown" with the reason, and a tool that needs a grant is not listed.
test("the inventory takes standing from the session's value, judges each action with the shared check, and is unknown with no value", async () => {
  const key = signer();
  const standingOf = async (script: (stand: StandIn) => void) => {
    const stand = new StandIn(key.key); script(stand);
    const reads = new Reads({ service: SERVICE, signer: key, now: () => START, fetch: stand.fetch });
    return (await readInventory(reads, new Kept(), stand.config())).inventory.standing[stand.membership.scope];
  };
  const adminActions = ["membership.manage", "membership.invite", "rules.activate", "rules.publish", "destination.read-token", "issue.open", "inbox.own"];
  expect(await standingOf(() => {})).toEqual({ known: true, role: "admin", handle: "@agent", key: key.key, actions: adminActions, kind: "person" });
  // A Worker that gives no standing, a value that fails a check, and a value with no session to hold it: unknown.
  expect(await standingOf(stand => { stand.standing = "ignore"; })).toEqual({ known: false, reason: "no-standing" });
  expect(await standingOf(stand => { stand.changeStanding = value => ({ ...value, key: signer().key }); })).toEqual({ known: false, reason: "no-standing" });
  expect(await standingOf(stand => { stand.sessions = "refuse"; })).toEqual({ known: false, reason: "no-session" });
  // The shared check refuses every action of a key that is not active, and shows no role, no handle and no kind: known, and not eligible.
  expect(await standingOf(stand => { stand.changeStanding = value => ({ ...value, keyState: "retired" }); }))
    .toEqual({ known: true, role: null, handle: null, key: key.key, actions: [] });
  // An agent whose controller is not active is refused each action but a comment. It still shows its role.
  expect(await standingOf(stand => { stand.changeStanding = value => ({ ...value, role: "agent", actions: ["issue.open", "issue.comment"], controller: "@owner", controllerActive: false }); }))
    .toEqual({ known: true, role: "agent", handle: "@agent", key: key.key, actions: ["issue.comment"], kind: "person" });
  // The same agent with an active controller holds each action.
  expect(await standingOf(stand => { stand.changeStanding = value => ({ ...value, role: "agent", actions: ["issue.open", "issue.comment"], controller: "@owner", controllerActive: true }); }))
    .toEqual({ known: true, role: "agent", handle: "@agent", key: key.key, actions: ["issue.open", "issue.comment"], kind: "person" });
});

// ES-1. Invariant: `standingFrom` states `kind` from the member item of the summary it is given, and states none when it is given no
// summary, or a summary with no active member for the key. It reads nothing itself, and the kind changes no action.
test("the member kind is read from the held member item, and is absent when that item is not held", async () => {
  const key = signer();
  const stand = new StandIn(key.key);
  const reads = new Reads({ service: SERVICE, signer: key, now: () => START, fetch: stand.fetch });
  const session = await reads.session(stand.membership);
  const roster = { id: 0, type: "roster", state: "active", values: {}, refs: {} };
  const held = (kind: string, state = "active") => [roster,
    { id: 1, type: "member", state, values: { handle: "@agent", role: "admin", kind }, refs: {} },
    { id: 2, type: "key", state: "active", values: { id: key.key }, refs: { member: 1 } }] as unknown as Item[];
  const without = standingFrom(session, key.key, START);
  expect(without.known && Object.hasOwn(without, "kind")).toBe(false);
  expect(standingFrom(session, key.key, START, held("person"))).toMatchObject({ known: true, kind: "person" });
  expect(standingFrom(session, key.key, START, held("agent"))).toMatchObject({ known: true, kind: "agent" });
  const removed = standingFrom(session, key.key, START, held("agent", "removed"));
  expect(removed.known && Object.hasOwn(removed, "kind")).toBe(false);
  // The kind does not change the actions: the shared check alone decides them.
  const [asPerson, asAgent] = [standingFrom(session, key.key, START, held("person")), standingFrom(session, key.key, START, held("agent"))];
  expect(asPerson.known && asAgent.known && asPerson.actions).toEqual(asAgent.known ? asAgent.actions : null);
});
