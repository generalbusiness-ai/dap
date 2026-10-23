/** Real PLATFORM creation, signer index, claim discovery, turns and SQLite.
 * Host/clock and manually minted session credentials are explicit fixtures.
 * Floors are direct internal judged calls with test-authored receipts: this
 * witnesses no archive custody, provider confirmation or alarm scheduling. */
import { expect, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import type { Entry, FloorInput } from "@generalbusiness/dap-contract";
import { timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { isEntryOf } from "@generalbusiness/dap-derive";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { Scope, type Checkpointed } from "../src/core.ts";
import { production } from "../src/ports.ts";
import { Chains } from "../src/signed-reads.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { mintSession, readerOf } from "../src/sessions.ts";
import { net, soon } from "./net.ts";
import { rita, type Platform } from "./repository.ts";
import { sessionRoom, sessionRepository } from "./fixtures-native.ts";
import { archiveSql } from "./support/archive.ts";

async function bookkeeping(scope: Platform) {
  return runInDurableObject(scope.object, async (_instance, state) => {
    const store = new SqliteStore(archiveSql(state));
    const chains = new Chains(store, async use => {
      const own = use.fact.at.scope === scope.name ? store.stored(use.fact.seq) : null;
      const held = own ?? store.retained("entry", use.content);
      const entry = held ? JSON.parse(held.bytes) as Entry : null;
      return entry && isEntryOf(entry, use.fact) ? entry : null;
    });
    await chains.update();
    return { discoveries: chains.discoveries(), anchors: store.localSigners.floorAnchors(),
      signer: store.localSigners.proof(rita.key, 0), head: store.scope()!.head };
  });
}

async function floor(scope: Platform, position: number, commit: string) {
  const before = await bookkeeping(scope);
  expect(before.anchors).not.toBeNull();
  const keep = [...new Set([...before.anchors!, ...before.discoveries].filter(seq => seq < position))].sort((a, b) => a - b);
  const input: FloorInput = { type: "floor", floor: position, receipt: { commit, through: before.head }, keep };
  const answer = await runInDurableObject(scope.object, (_instance, state) => {
    const store = new SqliteStore(archiveSql(state));
    return new Scope(scope.name, store, { ...production(), clock: net.clock }, PROPOSED_BOUNDS).floor(input);
  });
  expect(answer).toMatchObject({ answer: "written" });
  return { before, keep };
}

// Invariant: two floors preserve the actual signer/discovery entries needed
// after eviction, without granting a claim to an unrelated real membership.
test("Native register signer and discovered membership survive two floors and restart without admitting another claim", async () => {
  const { life, R, membership, claims, sessions } = await sessionRoom("platform:register@17");
  try {
    const other = await sessionRepository(life, "platform:register@17");
    const otherMembership = await life.wait(() => other.children[0]!.at());
    const initial = await life.wait(() => bookkeeping(R));
    expect(initial.discoveries.length).toBeGreaterThan(0);
    expect(initial.signer).toMatchObject({ state: "positive" });
    // Each checkpoint is an actual sealed input. No native journal row is
    // inserted or rewritten to manufacture a long history.
    for (let n = 0; n < 205; n++) {
      const answer = await life.wait(() => (R.object as unknown as { checkpoint(): Promise<Checkpointed> }).checkpoint());
      expect(answer).toMatchObject({ answer: "written" });
    }
    life.active(); net.clock.now = timeOf(timeMs(net.clock.now)! + 1000_000);
    const first = await life.wait(() => floor(R, 100, "a".repeat(40)));
    expect(first.keep).toEqual(expect.arrayContaining([...initial.discoveries]));
    await life.wait(() => R.restart());
    const second = await life.wait(() => floor(R, 101, "b".repeat(40)));
    expect(second.keep).toEqual(expect.arrayContaining([...initial.discoveries]));
    await life.wait(() => R.restart());
    const after = await life.wait(() => bookkeeping(R));
    expect(after.signer).toEqual(initial.signer);
    expect(after.discoveries).toEqual(initial.discoveries);
    // Required-session lease disables the setup inspector bypass. Both
    // tokens name real created memberships; only one belongs to this root.
    const token = readerOf(mintSession(sessions, { ...claims, reads: ["entry", "retained"], ends: soon(60) }));
    const unrelated = readerOf(mintSession(sessions, { ...claims, reads: ["entry", "retained"], membership: otherMembership, ends: soon(60) }));
    // Existing chained-session authority permits entry/retained, not summary.
    expect(await life.owner.required(() => R.stub.entry(token, 0))).toMatchObject({ ok: true, value: { entry: { seq: 0, at: { kind: "register" } } } });
    expect(await life.owner.required(() => R.stub.entry(unrelated, 0))).toEqual({ ok: false, reason: "forbidden" });
    const carried = await runInDurableObject(R.object, (_instance, state) => {
      const store = new SqliteStore(archiveSql(state));
      const discovery = JSON.parse(store.stored(initial.discoveries[0]!)!.bytes) as Entry;
      const use = discovery.uses.find(use => store.retained("entry", use.content) !== null);
      if (!use) throw Error("the kept discovery must carry its genuine foreign genesis");
      return { digest: use.content, bytes: store.retained("entry", use.content)!.bytes };
    });
    expect(await life.owner.required(() => R.stub.retained(token, "entry", carried.digest))).toMatchObject({ ok: true, value: { bytes: carried.bytes } });
    expect(await life.owner.required(() => R.stub.retained(unrelated, "entry", carried.digest))).toEqual({ ok: false, reason: "forbidden" });
    expect(membership.scope).not.toBe(otherMembership.scope);
  } finally { life.release(); }
}, 30_000);
