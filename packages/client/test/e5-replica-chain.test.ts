/** Real issued session and production journal, with a fixed local transport and clock. */
import { expect, test } from "vitest";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { actVersion } from "../src/act-version.ts";
import { Reads } from "../src/reads.ts";
import { ScopeHandle } from "../src/handle.ts";
import { DeclaredHandle } from "../src/declared.ts";
import { scopeReplica } from "../src/replica.ts";
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
