/** Real issued session and production journal, with a fixed local transport and clock. */
import { expect, test } from "vitest";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { actVersion } from "../src/act-version.ts";
import { scopeReplica } from "../src/replica.ts";
import { exploreReplicaChain } from "../src/replica-explore.ts";
import { Feed } from "./replica-support.ts";
import { c4SelectionRuntime } from "./support/c4-runtime.ts";
import type { selection } from "./support/c4-selection.ts";

test("a checked source chain selects a pending connector's recorded target", async () => {
  const runtime = await c4SelectionRuntime(true), feed = new Feed();
  const replica = scopeReplica(runtime.handle, { observe: feed.observe, exploration: {
    actor: runtime.signer.key, member: runtime.member, clock: () => timeOf(runtime.now()), read: runtime.readInputs,
  } });
  try {
    feed.emit({ status: "streaming" }); await replica.read();
    expect(runtime.session.standing?.actions).toEqual(expect.arrayContaining([
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
    const sourceAct = { kind: "make-connector", on: null, fields: { target: target.id },
      expected: { target: target.revision } } as const;
    const source = { key: "chain-connector", version: actVersion(sourceAct) };
    const dependent = { kind: "touch-connector", on: { output: source }, fields: { n: 4 },
      expected: { on: { after: source }, target: target.revision } } as const;
    const authority = { session: runtime.session, requestedAt: timeOf(runtime.now()), clock: () => timeOf(runtime.now()) };
    const before = { state: canonicalize(runtime.store.all()), counts: { ...runtime.counts } };
    const result = await exploreReplicaChain<typeof selection, "touch-connector">(replica,
      [{ source, act: sourceAct }], "chain-touch", dependent, authority);
    if (result.is !== "admitted") return expect.fail(`checked chain unavailable: ${result.reason}`);
    expect(result.current()).toBe(true);
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
  } finally { replica.close(); runtime.close(); }
});
