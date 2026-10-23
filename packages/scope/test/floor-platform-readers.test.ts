/** Real PLATFORM births, member authority, rules, turns, operations and SQLite.
 * The package/Git peer, outside replies, clock and setup read inspector are
 * fixtures. Direct internal floor offers use test-authored receipts; this
 * witnesses neither archive custody nor the alarm writer. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type FloorInput } from "@generalbusiness/dap-contract";
import { isSeed, scopeIdOf } from "@generalbusiness/dap-bytes";
import { secretSigner, signedApplicationInstall } from "@generalbusiness/dap-client";
import type { Own } from "@generalbusiness/dap-derive";
import { TRUSTED_APPLICATION_COHORT as C, destinationRead, firstHeadCommit, revokedToken } from "@generalbusiness/dap-platform";
import { Scope, ownOf, type Checkpointed } from "../src/core.ts";
import { production } from "../src/ports.ts";
import type { Outside } from "../src/operations.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationContentBindings, applicationHttpPeer, applicationResolverFixture, dispatchFixture, driveFixture, effectFixture, sessionRoom } from "./fixtures-native.ts";
import { net, soon } from "./net.ts";
import { rita, type Platform } from "./repository.ts";
import { archiveSql } from "./support/archive.ts";

const inspect = (node: Platform) => runInDurableObject(node.object, (_instance, state) => {
  const store = new SqliteStore(archiveSql(state));
  return { all: store.all(), payloads: state.storage.sql.exec<{ seq: number }>("SELECT seq FROM entry ORDER BY seq").toArray().map(row => row.seq) };
});

async function floor(node: Platform, commit: string) {
  return runInDurableObject(node.object, (_instance, state) => {
    const sql = archiveSql(state), store = new SqliteStore(sql), position = 100;
    const anchors = store.localSigners.floorAnchors(position);
    expect(anchors).not.toBeNull();
    // These rules and destination scopes have no register claim-discovery
    // index. Keep their actual signer and unacknowledged outbox anchors.
    const unacknowledged = sql.exec("SELECT DISTINCT seq FROM outbox WHERE ack IS NULL AND seq < ? ORDER BY seq", position).toArray().map(row => row["seq"] as number);
    const keep = [...new Set([...anchors!, ...unacknowledged].filter(seq => seq < position))].sort((a, b) => a - b);
    const input: FloorInput = { type: "floor", floor: position, receipt: { commit, through: store.scope()!.head }, keep };
    return new Scope(node.name, store, { ...production(), clock: net.clock }, PROPOSED_BOUNDS).floor(input);
  });
}

// Invariant: after real payload eviction and object restart, a pending install
// can follow its fetch outcome, and destination readers can follow their old
// mint/read origins to finish the native deciding read and revocation.
test("Native live install and destination mint/read origins survive a floor and restart", async () => {
  const { life, R, D, children } = await sessionRoom(C.register);
  const [M, A, G] = children;
  if (!M || !A || !G) return expect.fail("the native room needs all three children");
  let contentKey: string | null = null;
  try {
    const seat = await M.did(rita, "seat", { expected: { roster: 1 } });
    await M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) });
    const packet = await applicationResolverFixture("sha1", undefined, { admin: ["counting.control"], member: ["counting.fulfill"] });
    contentKey = packet.key;
    const peer = applicationHttpPeer(packet), bindings = applicationContentBindings(env.APPLICATION_CONTENT, JSON.stringify(packet.trust));
    let admit = false, admissions = 0;
    life.outside(D.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch));
    life.outside(A.name, (given, sql) => {
      const port = hostOutside(given, sql, bindings, peer.fetch);
      return { ...port,
        accepts: (owner, kind) => { life.active(); return (kind !== "admit-application" || admit) && port.accepts(owner, kind); },
        send: request => { life.active(); if (request.kind === "admit-application") admissions++; return port.send(request); },
      };
    });
    await D.restart(); await A.restart();
    const install = await signedApplicationInstall(secretSigner(rita.secret), packet.packet.bytes,
      { rules: await A.at(), uri: packet.uri, release: packet.packet.ids.release, roles: ["admin", "member"], values: { target: 7 } }, { now: life.now() });
    const accepted = await A.stub.submit(install.signed, [], install.beside);
    expect(accepted.answer).toBe("accepted");
    if (accepted.answer !== "accepted") return expect.fail("the real member's signed install must be recorded");
    const job = accepted.receipt.fact.seq;
    await effectFixture([A], life.wait);
    expect(await A.item(job)).toMatchObject({ state: "pending", values: { phase: "admission" } });
    expect(admissions).toBe(0);
    const admittedFrom = (await inspect(A)).all.operations.find(operation => operation.kind === "admit-application");
    expect(admittedFrom).toBeDefined();
    const fetchOrigin = Number(admittedFrom!.id.split(":")[0]);
    expect(fetchOrigin).toBeGreaterThan(job);

    // A scripted provider confirms a genuine mint, then loses the first-head
    // reply. Native rules write unknown and open a deciding read and revoke.
    // Both are held BEFORE send, so no timeout or fabricated outcome is used.
    let finishDestination = false, minted = false;
    let initialHead = "";
    const destinationCalls: string[] = [];
    life.outside(G.name, given => {
      const outside: Outside = {
        accepts: (_owner, kind) => { life.active(); return kind === "first-head" || kind === "mint" && !minted || finishDestination && (kind === "read" || kind === "revoke"); },
        send: async request => {
          life.active();
          destinationCalls.push(request.kind);
          if (request.kind === "mint") { minted = true; return { result: "confirmed", evidence: { basis: "own-answer", body: { token: "TEST-floor-old-mint", ends: soon(60) } } }; }
          if (request.kind === "first-head") {
            const write = given.state.operation(request.operation)!;
            initialHead = firstHeadCommit(given.state, given.own, write, "sha1");
            return null; // Explicit lost provider reply; the real rule supplies unknown.
          }
          if (request.kind === "revoke") return { result: "confirmed", evidence: { basis: "own-answer", body: { token: "TEST-floor-old-mint" } } };
          if (request.kind === "read") return { result: "confirmed", evidence: { basis: "own-answer", body: { seen: initialHead } } };
          return expect.fail("the fixture accepts no other outside operation");
        },
      };
      return outside;
    });
    await G.restart();
    await effectFixture([G], life.wait);
    expect(destinationCalls).toEqual(["mint", "first-head"]);
    const beforeG = await inspect(G);
    const read = beforeG.all.operations.find(operation => operation.kind === "read"), revoke = beforeG.all.operations.find(operation => operation.kind === "revoke");
    const mint = beforeG.all.operations.find(operation => operation.kind === "mint");
    expect(read).toBeDefined(); expect(revoke).toBeDefined();
    const readOrigin = Number(read!.id.split(":")[0]), mintOutcome = mint!.attempts[0]!.outcomes.find(outcome => outcome.result === "confirmed")!.seq;
    expect(readOrigin).toBeGreaterThan(0); expect(mintOutcome).toBeGreaterThan(0);
    expect(beforeG.all.items.find(item => item.type === "branch")).toMatchObject({ state: "empty" });

    // Genuine checkpoint inputs create a dense tail; no raw entry insertion,
    // invented genesis or checkpoint digest constructs either floor witness.
    for (const node of [A, G]) for (let n = 0; n < 205; n++) {
      expect(await life.wait(() => (node.object as unknown as { checkpoint(): Promise<Checkpointed> }).checkpoint())).toMatchObject({ answer: "written" });
    }
    life.advance(1000_000);
    expect(await life.wait(() => floor(A, "a".repeat(40)))).toMatchObject({ answer: "written" });
    expect(await life.wait(() => floor(G, "b".repeat(40)))).toMatchObject({ answer: "written" });
    await A.restart(); await G.restart();
    const afterA = await inspect(A), afterG = await inspect(G);
    expect(afterA.all.floor?.kept).toContain(fetchOrigin);
    expect(afterG.all.floor?.kept).toEqual(expect.arrayContaining([readOrigin, mintOutcome]));
    for (const after of [afterA, afterG]) {
      expect(after.payloads.filter(seq => seq < 100)).toEqual(after.all.floor!.kept);
      expect(after.payloads.filter(seq => seq < 100).length).toBeLessThan(100);
    }
    const readers = await runInDurableObject(G.object, (_instance, state) => {
      const store = new SqliteStore(archiveSql(state)), own = ownOf(store), readOperation = store.operation(read!.id)!, revokeOperation = store.operation(revoke!.id)!;
      const missingMint: Own = seq => seq === mintOutcome ? null : own(seq);
      // Read-only missing-ancestor control: the genuine helper loses the
      // exact old token proof when its confirmed mint outcome is masked.
      expect(() => revokedToken(store, missingMint, revokeOperation)).toThrow(`this scope's own entry ${mintOutcome} is not at hand`);
      return { target: destinationRead(store, own, readOperation), token: revokedToken(store, own, revokeOperation) };
    });
    expect(readers).toEqual({ target: "first-head", token: "TEST-floor-old-mint" });
    finishDestination = true;
    await effectFixture([G], life.wait);
    const completedG = await inspect(G);
    expect(completedG.all.items.find(item => item.type === "branch")).toMatchObject({ state: "ready", values: { head: initialHead } });
    for (const id of [read!.id, revoke!.id]) expect(completedG.all.operations.find(operation => operation.id === id)?.attempts[0]?.outcomes).toMatchObject([{ result: "confirmed" }]);

    admit = true;
    await effectFixture([A], life.wait);
    expect(admissions).toBe(1);
    expect(await A.item(job)).toMatchObject({ state: "pending", values: { phase: "activation" } });
    await dispatchFixture([R, D, M, A, G], life.wait);
    const creation = (await D.entries()).flatMap(entry => entry.sends).find(send => send.message.class === "request" && send.message.type === "create" && isSeed(send.to) && send.to.kind === "lane");
    if (!creation || !isSeed(creation.to)) return expect.fail("Directory must record the genuine child create");
    const child = life.platform(scopeIdOf(creation.to));
    await driveFixture([R, D, M, A, G, child], life.wait);
    expect(await A.item(job)).toMatchObject({ state: "active", refs: { scope: await child.at() } });
    expect((await child.summary()).value).toMatchObject({ status: "active", definition: packet.packet.package.semantic.entry });
  } finally {
    // The Worker and its R2 binding are shared across files. This exact
    // deterministic release belongs to the fixture's cleanup obligation.
    try { if (contentKey !== null) await env.APPLICATION_CONTENT.delete(contentKey); }
    finally { life.release(); }
  }
}, 60_000);
