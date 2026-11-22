/** Real issued session and production journal, with a fixed local transport and clock. */
import { expect, test } from "vitest";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { actVersion } from "../src/act-version.ts";
import { retainComposition } from "../src/scope-composition.ts";
import { Reads } from "../src/reads.ts";
import { ScopeHandle } from "../src/handle.ts";
import { DeclaredHandle } from "../src/declared.ts";
import { scopeReplica } from "../src/replica.ts";
import { scopeClient, clientIdle, clientReplica } from "../src/scope-client.ts";
import { identityId, memoryStore } from "../src/custody.ts";
import { exploreReplicaChain } from "../src/replica-explore.ts";
import { Feed } from "./replica-support.ts";
import { c4SelectionRuntime } from "./support/c4-runtime.ts";
import type { selection } from "./support/c4-selection.ts";

test("a checked source chain selects a pending connector's recorded target", async () => {
  const runtime = await c4SelectionRuntime(), feed = new Feed();
  let clock = runtime.now();
  const reads = new Reads({ service: runtime.service, fetch: runtime.fetch, signer: runtime.signer, now: () => clock });
  const session = await reads.session(runtime.membership);
  if (!session) { runtime.close(); return expect.fail("Reads must obtain an issued session"); }
  const requestedAt = reads.sessionRequestedAt(runtime.membership, session);
  if (!requestedAt) { runtime.close(); return expect.fail("Reads must retain the session request start"); }
  const handle = new DeclaredHandle(new ScopeHandle(reads.transport, runtime.at.scope, session.reader()),
    runtime.at, runtime.handle.definition, runtime.handle.digest);
  const replica = scopeReplica(handle, { observe: feed.observe, exploration: {
    actor: runtime.signer.key, member: runtime.member, clock: () => timeOf(clock),
    read: async () => ({ is: "ready", session }),
  } });
  try {
    feed.emit({ status: "streaming" }); await replica.read();
    expect(session.standing?.actions).toEqual(expect.arrayContaining([
      "c4-selection.connector-open", "c4-selection.connector-touch",
    ]));
    const packet = await runtime.handle.intent(runtime.signer, "make-target", { on: null, fields: { n: 2 }, expected: {} },
      { now: runtime.now(), idempotencyKey: "chain-real-target", lifetimeSeconds: 60 });
    const answer = await runtime.handle.submit(packet.signed, [], packet.beside);
    if (answer.answer !== "accepted") return expect.fail(`target setup refused: ${answer.answer}`);
    const opened = answer.receipt.effects.find(effect => effect.effect === "open");
    if (!opened || opened.effect !== "open") return expect.fail("target setup must open a real item");
    await replica.read();
    const target = replica.view.rows("target").find(item => item.id === opened.item);
    if (!target) return expect.fail("the checked replica must hold the actual target");
    const dueAt = runtime.now() + 10_000;
    const sourceAct = { kind: "make-connector", on: null, fields: { target: target.id, until: timeOf(dueAt) },
      expected: { target: target.revision } } as const;
    const source = { key: "chain-connector", version: actVersion(sourceAct) };
    const dependent = { kind: "touch-connector", on: { output: source }, fields: { n: 4 },
      expected: { on: { after: source }, target: target.revision } } as const;
    const authority = { session, requestedAt, clock: () => timeOf(clock),
      stillHeld: () => reads.sessionRequestedAt(runtime.membership, session) === requestedAt };
    const before = { state: canonicalize(runtime.store.all()), counts: { ...runtime.counts } };
    const result = await exploreReplicaChain<typeof selection, "touch-connector">(replica,
      [{ source, act: sourceAct }], "chain-touch", dependent, authority);
    if (result.is !== "admitted") return expect.fail(`checked chain unavailable: ${result.reason}`);
    expect(result.current()).toBe(true);
    expect(result.exploration.judgesTime).toBe(false);
    expect(runtime.store.all().items.some(item => item.type === "connector")).toBe(false);
    clock += 1;
    expect(result.current()).toBe(true);
    clock = dueAt - 1;
    expect(result.current()).toBe(true);
    clock = dueAt;
    expect(result.current()).toBe(false);
    clock = runtime.now() - 1;
    expect(result.current()).toBe(false);
    clock = runtime.now();
    expect(result.subjects).toContainEqual({ name: "on", item: { output: source } });
    expect(result.subjects).toContainEqual({ name: "target", item: target.id });
    expect(result.exploration.act).toEqual(dependent);
    expect(canonicalize(runtime.store.all())).toBe(before.state);
    expect(runtime.counts.actSignatures).toBe(before.counts.actSignatures);
    expect(runtime.counts.submissions).toBe(before.counts.submissions);
    const wrong = { ...source, version: actVersion({ ...sourceAct, expected: {} }) };
    const rejected = await exploreReplicaChain<typeof selection, "touch-connector">(replica,
      [{ source: wrong, act: sourceAct }], "chain-touch", dependent, authority);
    expect(rejected).toEqual({ is: "unavailable", reason: "source" });
    expect(canonicalize(runtime.store.all())).toBe(before.state);
    expect(runtime.counts.actSignatures).toBe(before.counts.actSignatures);
    expect(runtime.counts.submissions).toBe(before.counts.submissions);
    clock = Date.parse(session.claims.ends);
    expect(result.current()).toBe(false);
    clock = runtime.now();
    const anchor = replica.view.rows("anchor")[0];
    if (!anchor) return expect.fail("the checked replica must hold the recorded anchor");
    const later = await runtime.handle.intent(runtime.signer, "rename-anchor", {
      on: anchor.id, fields: { label: "new head" }, expected: { on: anchor.revision },
    }, { now: runtime.now(), idempotencyKey: "chain-change-head", lifetimeSeconds: 60 });
    expect((await runtime.handle.submit(later.signed, [], later.beside)).answer).toBe("accepted");
    await replica.read();
    expect(result.current()).toBe(false);
    const rebuilt = await exploreReplicaChain<typeof selection, "touch-connector">(replica,
      [{ source, act: sourceAct }], "chain-touch-after-head", dependent, authority);
    if (rebuilt.is !== "admitted") return expect.fail(`fresh checked chain unavailable: ${rebuilt.reason}`);
    expect(rebuilt.current()).toBe(true);
    const stableHead = structuredClone(replica.view.head), stableClock = clock;
    reads.forget(runtime.membership.scope);
    expect(reads.sessionRequestedAt(runtime.membership, session)).toBeNull();
    expect(replica.view.head).toEqual(stableHead);
    expect(clock).toBe(stableClock);
    expect(rebuilt.current()).toBe(false);
  } finally { replica.close(); runtime.close(); }
});

// The client's pending-via path uses the same issued session and cache cut as its Replica.
test("a local client waits unsigned for a checked pending via and signs after its real source", async () => {
  const runtime = await c4SelectionRuntime(), feed = new Feed(), store = memoryStore();
  let clock = runtime.now();
  const reads = new Reads({ service: runtime.service, fetch: runtime.fetch, signer: runtime.signer, now: () => clock });
  const session = await reads.session(runtime.membership);
  if (!session) { runtime.close(); return expect.fail("Reads must issue a session"); }
  const requestedAt = reads.sessionRequestedAt(runtime.membership, session);
  if (!requestedAt) { runtime.close(); return expect.fail("Reads must retain the request start"); }
  const standingCut = { requestedAt, stillHeld: () => reads.sessionRequestedAt(runtime.membership, session) === requestedAt };
  const handle = new DeclaredHandle(new ScopeHandle(reads.transport, runtime.at.scope, session.reader()),
    runtime.at, runtime.handle.definition, runtime.handle.digest);
  const client = scopeClient(handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store,
    drafts: { read: async () => [], write: async () => {}, observe: () => () => {} }, observe: feed.observe,
    clock: { ...runtime.clock, now: () => clock }, lifetimeSeconds: 60,
    exploration: async () => ({ is: "ready", session, standingCut }),
  });
  let entered!: () => void, release!: () => void, sourceRead!: () => void;
  const dispatchStarted = new Promise<void>(resolve => { entered = resolve; });
  const dispatchAllowed = new Promise<void>(resolve => { release = resolve; });
  const sourceChecked = new Promise<void>(resolve => { sourceRead = resolve; });
  const submit = handle.scope.submit.bind(handle.scope), read = store.read.bind(store);
  let observeSource = false;
  try {
    feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
    expect(session.standing?.actions).toEqual(expect.arrayContaining(["c4-selection.connector-open", "c4-selection.connector-touch"]));
    const packet = await handle.intent(runtime.signer, "make-target", { on: null, fields: { n: 2 }, expected: {} },
      { now: clock, idempotencyKey: "client-via-target", lifetimeSeconds: 60 });
    const targetAnswer = await handle.submit(packet.signed, [], packet.beside);
    if (targetAnswer.answer !== "accepted") return expect.fail(`target setup refused: ${targetAnswer.answer}`);
    const effect = targetAnswer.receipt.effects.find(value => value.effect === "open");
    if (!effect || effect.effect !== "open") return expect.fail("target setup must open an item");
    await client.read(); await clientIdle(client);
    const target = client.view.row({ item: effect.item });
    if (!target) return expect.fail("the checked replica must hold the real target");
    const sourceAct = { kind: "make-and-revise-connector", on: null,
      fields: { target: target.id, until: timeOf(clock + 30_000) }, expected: { target: target.revision } } as const;
    const source = { key: "client-via-source", version: actVersion(sourceAct) };
    const dependentAct = { kind: "touch-connector", on: { output: source }, fields: { n: 4 },
      expected: { on: { after: source }, target: { after: source } } } as const;
    const before = { signs: runtime.counts.actSignatures, posts: runtime.counts.submissions };
    const held = await client.retainAuthorizations([{ key: source.key, act: sourceAct }, { key: "client-via-dependent", act: dependentAct }]);
    const waiting = await client.authorization(held[1]!.identity);
    expect(waiting?.versions[0]?.after).toContainEqual(source);
    expect(waiting?.versions[0]?.subjects).toContainEqual({ name: "on", item: { output: source } });
    expect(waiting?.versions[0]?.subjects).toContainEqual({ name: "target", item: target.id });
    expect(waiting?.permissions).toEqual([]); expect(waiting?.materializations).toEqual([]);
    expect(store.records.size).toBe(0);
    expect([runtime.counts.actSignatures, runtime.counts.submissions]).toEqual([before.signs, before.posts]);
    handle.scope.submit = async (signed, grants, beside) => {
      if (signed.intent.idempotencyKey === source.key) { entered(); await dispatchAllowed; }
      return submit(signed, grants, beside);
    };
    const sourceIdentity = identityId({ service: runtime.service, membership: runtime.member.membership,
      signer: runtime.signer.key, target: runtime.at, key: source.key });
    store.read = async id => { const result = await read(id); if (observeSource && id === sourceIdentity) sourceRead(); return result; };
    const opening = client.sendAuthorization(held[0]!);
    await Promise.race([dispatchStarted, opening.then(() => { throw new Error("source finished before dispatch barrier"); }, error => { throw error; })]);
    observeSource = true;
    let settled = false;
    const dependent = client.sendAuthorization(held[1]!).then(value => { settled = true; return { value }; }, error => { settled = true; return { error }; });
    await Promise.race([sourceChecked, dependent.then(result => { throw new Error(`dependent ended before source check: ${JSON.stringify(result)}`); })]);
    const pending = await client.authorization(held[1]!.identity);
    expect(pending?.permissions).toEqual([]); expect(pending?.materializations).toEqual([]);
    expect([runtime.counts.actSignatures, runtime.counts.submissions, settled]).toEqual([before.signs + 1, before.posts, false]);
    expect([...store.records.values()].every(text => !text.includes("client-via-dependent"))).toBe(true);
    release();
    const first = await opening;
    expect("answer" in first && first.answer.answer).toBe("accepted");
    await client.read();
    const result = await dependent;
    if (!("value" in result)) return expect.fail(`dependent did not complete: ${String(result.error)}`);
    expect("answer" in result.value && result.value.answer.answer).toBe("accepted");
    const proof = clientReplica(client).authorizationSource(runtime.signer.key, source.key);
    if (!proof || proof.entry.opened === null) return expect.fail("the checked source must open a connector");
    const materialized = (await client.authorization(held[1]!.identity))?.materializations[0];
    expect(materialized?.act.on).toBe(proof.entry.opened);
    expect(materialized?.act.expected["on"]).toBe(proof.revisions[proof.entry.opened]);
    expect(materialized?.act.expected["target"]).toBe(proof.revisions[target.id]);
    expect(runtime.store.item(proof.entry.opened)?.refs["target"]).toBe(target.id);
    expect(runtime.store.item(proof.entry.opened)?.values["n"]).toBe(4);
    expect(runtime.store.item(target.id)?.values["n"]).toBe(3);
    expect(proof.revisions[target.id]).toBeGreaterThan(target.revision);
    expect([runtime.counts.actSignatures, runtime.counts.submissions]).toEqual([before.signs + 2, before.posts + 2]);
  } finally {
    release(); handle.scope.submit = submit; store.read = read; client.close();
    try { await clientIdle(client); } finally { runtime.close(); }
  }
});

// A recorded source is an alias, not an act to replay.
test("a recorded predecessor supplies a symbolic target to a pending via chain", async () => {
  const runtime = await c4SelectionRuntime(), feed = new Feed(), store = memoryStore();
  let clock = runtime.now();
  const reads = new Reads({ service: runtime.service, fetch: runtime.fetch, signer: runtime.signer, now: () => clock });
  const session = await reads.session(runtime.membership);
  if (!session) { runtime.close(); return expect.fail("Reads must issue a session"); }
  const requestedAt = reads.sessionRequestedAt(runtime.membership, session);
  if (!requestedAt) { runtime.close(); return expect.fail("Reads must retain the request start"); }
  const standingCut = { requestedAt, stillHeld: () => reads.sessionRequestedAt(runtime.membership, session) === requestedAt };
  const handle = new DeclaredHandle(new ScopeHandle(reads.transport, runtime.at.scope, session.reader()),
    runtime.at, runtime.handle.definition, runtime.handle.digest);
  const client = scopeClient(handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store,
    drafts: { read: async () => [], write: async () => {}, observe: () => () => {} }, observe: feed.observe,
    clock: { ...runtime.clock, now: () => clock }, lifetimeSeconds: 60,
    exploration: async () => ({ is: "ready", session, standingCut }),
  });
  let entered!: () => void, release!: () => void, sourceRead!: () => void;
  const dispatchStarted = new Promise<void>(resolve => { entered = resolve; });
  const dispatchAllowed = new Promise<void>(resolve => { release = resolve; });
  const sourceChecked = new Promise<void>(resolve => { sourceRead = resolve; });
  const submit = handle.scope.submit.bind(handle.scope), read = store.read.bind(store);
  let observeSource = false;
  try {
    feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
    expect(session.standing?.actions).toEqual(expect.arrayContaining(["c4-selection.connector-open", "c4-selection.connector-touch"]));
    const firstAct = { kind: "make-target", on: null, fields: { n: 2 }, expected: {} } as const;
    const firstSource = { key: "recorded-predecessor", version: actVersion(firstAct) };
    const [firstHeld] = await client.retainAuthorizations([{ key: firstSource.key, act: firstAct }]);
    const recordedFirst = await client.sendAuthorization(firstHeld!);
    expect("answer" in recordedFirst && recordedFirst.answer.answer).toBe("accepted");
    await client.read(); await clientIdle(client);
    const firstProof = clientReplica(client).authorizationSource(runtime.signer.key, firstSource.key);
    if (!firstProof || firstProof.entry.opened === null) return expect.fail("A must be a checked recorded opening");
    const target = client.view.row({ item: firstProof.entry.opened });
    if (!target) return expect.fail("the checked replica must hold A's actual target");
    const sourceAct = { kind: "make-and-revise-connector", on: null,
      fields: { target: { output: firstSource }, until: timeOf(clock + 30_000) },
      expected: { target: { after: firstSource } } } as const;
    const source = { key: "client-via-source", version: actVersion(sourceAct) };
    const dependentAct = { kind: "touch-connector", on: { output: source }, fields: { n: 4 },
      expected: { on: { after: source }, target: { after: source } } } as const;
    const before = { signs: runtime.counts.actSignatures, posts: runtime.counts.submissions };
    const held = await client.retainAuthorizations([{ key: source.key, act: sourceAct }, { key: "client-via-dependent", act: dependentAct }]);
    const waiting = await client.authorization(held[1]!.identity);
    const sourceRow = await client.authorization(held[0]!.identity);
    expect(sourceRow?.versions[0]?.id).toBe(source.version);
    expect(sourceRow?.versions[0]?.act).toEqual(sourceAct);
    expect(actVersion(sourceRow!.versions[0]!.act)).toBe(source.version);
    expect(waiting?.versions[0]?.after).toContainEqual(source);
    expect(waiting?.versions[0]?.subjects).toContainEqual({ name: "on", item: { output: source } });
    expect(waiting?.versions[0]?.subjects).toContainEqual({ name: "target", item: target.id });
    expect(waiting?.permissions).toEqual([]); expect(waiting?.materializations).toEqual([]);
    expect(store.records.size).toBe(1);
    expect([runtime.counts.actSignatures, runtime.counts.submissions]).toEqual([before.signs, before.posts]);
    handle.scope.submit = async (signed, grants, beside) => {
      if (signed.intent.idempotencyKey === source.key) { entered(); await dispatchAllowed; }
      return submit(signed, grants, beside);
    };
    const sourceIdentity = identityId({ service: runtime.service, membership: runtime.member.membership,
      signer: runtime.signer.key, target: runtime.at, key: source.key });
    store.read = async id => { const result = await read(id); if (observeSource && id === sourceIdentity) sourceRead(); return result; };
    const opening = client.sendAuthorization(held[0]!);
    await Promise.race([dispatchStarted, opening.then(() => { throw new Error("source finished before dispatch barrier"); }, error => { throw error; })]);
    observeSource = true;
    let settled = false;
    const dependent = client.sendAuthorization(held[1]!).then(value => { settled = true; return { value }; }, error => { settled = true; return { error }; });
    await Promise.race([sourceChecked, dependent.then(result => { throw new Error(`dependent ended before source check: ${JSON.stringify(result)}`); })]);
    const pending = await client.authorization(held[1]!.identity);
    expect(pending?.permissions).toEqual([]); expect(pending?.materializations).toEqual([]);
    expect([runtime.counts.actSignatures, runtime.counts.submissions, settled]).toEqual([before.signs + 1, before.posts, false]);
    expect([...store.records.values()].every(text => !text.includes("client-via-dependent"))).toBe(true);
    release();
    const first = await opening;
    expect("answer" in first && first.answer.answer).toBe("accepted");
    await client.read();
    const result = await dependent;
    if (!("value" in result)) return expect.fail(`dependent did not complete: ${String(result.error)}`);
    expect("answer" in result.value && result.value.answer.answer).toBe("accepted");
    const proof = clientReplica(client).authorizationSource(runtime.signer.key, source.key);
    if (!proof || proof.entry.opened === null) return expect.fail("the checked source must open a connector");
    const materialized = (await client.authorization(held[1]!.identity))?.materializations[0];
    expect(materialized?.act.on).toBe(proof.entry.opened);
    expect(materialized?.act.expected["on"]).toBe(proof.revisions[proof.entry.opened]);
    expect(materialized?.act.expected["target"]).toBe(proof.revisions[target.id]);
    expect(runtime.store.item(proof.entry.opened)?.refs["target"]).toBe(target.id);
    expect(runtime.store.item(proof.entry.opened)?.values["n"]).toBe(4);
    expect(runtime.store.item(target.id)?.values["n"]).toBe(3);
    expect(proof.revisions[target.id]).toBeGreaterThan(target.revision);
    const materializedSource = (await client.authorization(held[0]!.identity))?.materializations[0];
    expect(materializedSource?.act.fields["target"]).toBe(target.id);
    expect(materializedSource?.act.expected["target"]).toBe(firstProof.revisions[target.id]);
    expect([runtime.counts.actSignatures, runtime.counts.submissions]).toEqual([before.signs + 2, before.posts + 2]);
    expect((await client.authorization(held[0]!.identity))?.versions[0]?.id).toBe(source.version);
    expect(clientReplica(client).authorizationSource(runtime.signer.key, firstSource.key)?.entry.fact).toEqual(firstProof.entry.fact);

    // B changed the target after A. A new B2 cannot use A's historical revision.
    await clientIdle(client);
    const oldProof = clientReplica(client).authorizationSource(runtime.signer.key, firstSource.key);
    expect(oldProof?.entry.fact).toEqual(firstProof.entry.fact);
    expect(oldProof?.revisions[target.id]).toBe(target.revision);
    expect(runtime.store.item(target.id)!.revision).toBeGreaterThan(oldProof!.revisions[target.id]!);
    const secondSource = { key: "stale-via-source", version: actVersion(sourceAct) };
    const staleDependent = { kind: "touch-connector", on: { output: secondSource }, fields: { n: 4 },
      expected: { on: { after: secondSource }, target: { after: secondSource } } } as const;
    const beforeStale = canonicalize(await store.authorizations.read(runtime.signer.key, runtime.at));
    const staleSigns = runtime.counts.actSignatures, stalePosts = runtime.counts.submissions;
    await expect(client.retainAuthorizations([{ key: secondSource.key, act: sourceAct },
      { key: "stale-via-dependent", act: staleDependent }])).rejects.toMatchObject({ name: "AuthorizationError", reason: "source" });
    expect(canonicalize(await store.authorizations.read(runtime.signer.key, runtime.at))).toBe(beforeStale);
    expect([runtime.counts.actSignatures, runtime.counts.submissions]).toEqual([staleSigns, stalePosts]);
    expect(clientReplica(client).authorizationSource(runtime.signer.key, firstSource.key)).toEqual(oldProof);
  } finally {
    release(); handle.scope.submit = submit; store.read = read; client.close();
    try { await clientIdle(client); } finally { runtime.close(); }
  }
});

// The private ordered sequence adds immediate dependencies even for independent acts.
test("a checked composition orders independent acts before any later signing", async () => {
  const runtime = await c4SelectionRuntime(), feed = new Feed(), store = memoryStore();
  const reads = new Reads({ service: runtime.service, fetch: runtime.fetch, signer: runtime.signer, now: runtime.now });
  const session = await reads.session(runtime.membership);
  if (!session) { runtime.close(); return expect.fail("Reads must issue a session"); }
  const requestedAt = reads.sessionRequestedAt(runtime.membership, session);
  if (!requestedAt) { runtime.close(); return expect.fail("Reads must retain its request start"); }
  const standingCut = { requestedAt, stillHeld: () => reads.sessionRequestedAt(runtime.membership, session) === requestedAt };
  const handle = new DeclaredHandle(new ScopeHandle(reads.transport, runtime.at.scope, session.reader()),
    runtime.at, runtime.handle.definition, runtime.handle.digest);
  const client = scopeClient(handle, { signer: runtime.signer,
    member: { service: runtime.service, ...runtime.member, principal: null }, store,
    drafts: { read: async () => [], write: async () => {}, observe: () => () => {} },
    observe: feed.observe, clock: runtime.clock, lifetimeSeconds: 60,
    exploration: async () => ({ is: "ready", session, standingCut }),
  });
  let entered!: () => void, release!: () => void, secondEntered!: () => void, secondRelease!: () => void, firstRead!: () => void, secondRead!: () => void;
  const dispatchStarted = new Promise<void>(resolve => { entered = resolve; });
  const dispatchAllowed = new Promise<void>(resolve => { release = resolve; });
  const secondStarted = new Promise<void>(resolve => { secondEntered = resolve; });
  const secondAllowed = new Promise<void>(resolve => { secondRelease = resolve; });
  const sawFirst = new Promise<void>(resolve => { firstRead = resolve; });
  const sawSecond = new Promise<void>(resolve => { secondRead = resolve; });
  const submit = handle.scope.submit.bind(handle.scope), read = store.read.bind(store);
  let observing = false;
  try {
    feed.emit({ status: "streaming" }); await client.read(); await clientIdle(client);
    const anchor = client.view.rows("anchor")[0];
    if (!anchor) return expect.fail("the checked Replica must hold the anchor");
    const acts = [
      { kind: "make-target", on: null, fields: { n: 1 }, expected: {} },
      { kind: "make-target", on: null, fields: { n: 2 }, expected: {} },
      { kind: "rename-anchor", on: anchor.id, fields: { label: "composed" }, expected: { on: anchor.revision } },
    ] as const;
    const sources = acts.map((act, index) => ({ key: `composition-${index}`, version: actVersion(act) }));
    const initial = { signs: runtime.counts.actSignatures, posts: runtime.counts.submissions };
    const badSources = sources.map((source, index) => index === 1 ? { ...source, version: actVersion(acts[0]) } : source);
    const beforeBad = canonicalize(await store.authorizations.read(runtime.signer.key, runtime.at));
    await expect(retainComposition(client, acts.map((act, index) => ({ source: badSources[index]!, act }))))
      .rejects.toMatchObject({ reason: "source" });
    expect(canonicalize(await store.authorizations.read(runtime.signer.key, runtime.at))).toBe(beforeBad);
    expect([runtime.counts.actSignatures, runtime.counts.submissions, store.records.size]).toEqual([initial.signs, initial.posts, 0]);
    const held = await retainComposition(client, acts.map((act, index) => ({ source: sources[index]!, act })));
    expect(held).toHaveLength(3);
    const rows = await store.authorizations.read(runtime.signer.key, runtime.at);
    expect(rows.find(row => row.key === sources[1]!.key)?.versions[0]?.after).toContainEqual(sources[0]);
    expect(rows.find(row => row.key === sources[2]!.key)?.versions[0]?.after).toContainEqual(sources[1]);
    expect(rows.every(row => row.permissions.length === 0 && row.materializations.length === 0)).toBe(true);
    expect([runtime.counts.actSignatures, runtime.counts.submissions, store.records.size]).toEqual([initial.signs, initial.posts, 0]);
    handle.scope.submit = async (signed, grants, beside) => {
      if (signed.intent.idempotencyKey === sources[0]!.key) { entered(); await dispatchAllowed; }
      if (signed.intent.idempotencyKey === sources[1]!.key) { secondEntered(); await secondAllowed; }
      return submit(signed, grants, beside);
    };
    const custodyId = (key: string) => identityId({ service: runtime.service, membership: runtime.member.membership,
      signer: runtime.signer.key, target: runtime.at, key });
    store.read = async id => {
      const value = await read(id);
      if (observing && id === custodyId(sources[0]!.key)) firstRead();
      if (observing && id === custodyId(sources[1]!.key)) secondRead();
      return value;
    };
    const first = client.sendAuthorization(held[0]!);
    await Promise.race([dispatchStarted, first.then(() => { throw new Error("first ended before dispatch barrier"); }, error => { throw error; })]);
    observing = true;
    const second = client.sendAuthorization(held[1]!).then(value => ({ value }), error => ({ error }));
    const third = client.sendAuthorization(held[2]!).then(value => ({ value }), error => ({ error }));
    await Promise.race([Promise.all([sawFirst, sawSecond]), second.then(result => { throw new Error(`second ended while waiting: ${JSON.stringify(result)}`); }),
      third.then(result => { throw new Error(`third ended while waiting: ${JSON.stringify(result)}`); })]);
    expect([runtime.counts.actSignatures, runtime.counts.submissions]).toEqual([initial.signs + 1, initial.posts]);
    expect((await client.authorization(held[1]!.identity))?.permissions).toEqual([]);
    expect((await client.authorization(held[2]!.identity))?.permissions).toEqual([]);
    release();
    const firstAnswer = await first;
    expect("answer" in firstAnswer && firstAnswer.answer.answer).toBe("accepted");
    await client.read();
    await Promise.race([secondStarted, second.then(result => { throw new Error(`second ended before dispatch barrier: ${JSON.stringify(result)}`); })]);
    expect([runtime.counts.actSignatures, runtime.counts.submissions]).toEqual([initial.signs + 2, initial.posts + 1]);
    expect((await client.authorization(held[2]!.identity))?.permissions).toEqual([]);
    secondRelease();
    const secondAnswer = await second;
    if (!("value" in secondAnswer)) return expect.fail(`second failed: ${String(secondAnswer.error)}`);
    expect("answer" in secondAnswer.value && secondAnswer.value.answer.answer).toBe("accepted");
    await client.read();
    const thirdAnswer = await third;
    if (!("value" in thirdAnswer)) return expect.fail(`third failed: ${String(thirdAnswer.error)}`);
    expect("answer" in thirdAnswer.value && thirdAnswer.value.answer.answer).toBe("accepted");
    const entries = sources.map(source => clientReplica(client).accepted(runtime.signer.key, source.key));
    expect(entries.every(entry => entry !== null)).toBe(true);
    expect(entries[0]!.fact.seq).toBeLessThan(entries[1]!.fact.seq);
    expect(entries[1]!.fact.seq).toBeLessThan(entries[2]!.fact.seq);
    expect([runtime.counts.actSignatures, runtime.counts.submissions]).toEqual([initial.signs + 3, initial.posts + 3]);
  } finally {
    release(); secondRelease(); handle.scope.submit = submit; store.read = read; client.close();
    try { await clientIdle(client); } finally { runtime.close(); }
  }
});
