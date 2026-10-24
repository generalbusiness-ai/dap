import { expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { timeMs, timeOf } from "@generalbusiness/dap-derive";
import { SqliteStore } from "../src/sqlite.ts";
import { Wakes } from "../src/outbox.ts";
import type { OperationId } from "@generalbusiness/dap-contract";
import { CredentialStore, type ExpectedRevocation, type MintedCredential } from "../src/credential-store.ts";
import { START, at, create, reader } from "./fixtures-native.ts";

// The credential IDs, mint references and replies are written by hand: no
// host runs and no scope judged a mint. Custody uses real Durable Object
// SQLite storage; the scope's test authority and readers are stand-ins.
const minted = (mint: string, plaintext = "private-provider-credential"): MintedCredential => ({ id: "provider-token-1", mint: mint as OperationId, attempt: 1, ends: at(60), plaintext });
const revoking = (revoke: string, credential: MintedCredential): ExpectedRevocation => ({ revoke: revoke as OperationId, attempt: 1, mint: credential.mint, mintAttempt: credential.attempt, id: credential.id });

test("private custody retains one mint's own reply and secret across a real object restart, uses only its judged live credential, and writes nothing into public state, history or log", async () => {
  const scope = await create();
  const credential = minted("1:0");
  const second = { ...minted("2:0", "private-provider-second"), id: "provider-token-2", ends: START };
  const revokeFirst = revoking("3:0", credential);
  const revokeSecond = revoking("4:0", second);
  const metadata = ({ mint, attempt, id, ends }: MintedCredential) => ({ mint, attempt, id, ends });
  const before = { head: await scope.head(), summary: await scope.summary(), history: await scope.sealed() };
  expect(await scope.inside((state) => {
    const store = new CredentialStore(state.storage.sql, () => scope.at);
    return [store.put(credential), store.put(second), store.expectRevoke(revokeFirst), store.expectRevoke(revokeSecond), store.judged(second.mint, 1, null), store.live(credential.mint, 1, START), store.reply(credential.mint, 1)];
  })).toEqual(["stored", "stored", true, true, false, null, { id: credential.id, ends: credential.ends }]);

  await scope.restart();
  expect(await scope.inside((state) => {
    const store = new CredentialStore(state.storage.sql, () => scope.at);
    const retained = store.read(credential.mint, 1);
    const reply = store.reply(credential.mint, 1)!;
    const firstPage = store.pending(null, 1);
    const nextPage = store.pending(firstPage.items[0]!, 1);
    const revokePage = store.revocations(null, 1);
    const revokeNext = store.revocations(revokePage.items[0]!, 1);
    const invalidLimit = store.pending(null, -2);
    const judged = store.judged(credential.mint, 1, reply);
    const live = store.live(credential.mint, 1, START);
    const otherAttempt = store.live(credential.mint, 2, START);
    const isolated = new CredentialStore(state.storage.sql, () => ({ ...scope.at, inc: "in_aaaaaaaaaaaaaaaaaaaaaaaaaa" as never }));
    const otherIncarnation = [isolated.read(credential.mint, 1), isolated.pending(null, 1), isolated.revocations(null, 1), isolated.expectRevoke(revokeFirst)];
    const revoked = store.revoked(second.mint, 1);
    return { retained, reply, firstPage, nextPage, revokePage, revokeNext, judged, live, otherAttempt, otherIncarnation, revoked, remaining: store.pending(null, 1), revokeRemaining: store.revocations(null, 1), invalidLimit };
  })).toEqual({
    retained: { ...credential, state: "held" }, reply: { id: credential.id, ends: credential.ends }, judged: true,
    firstPage: { items: [metadata(credential)], more: true }, nextPage: { items: [metadata(second)], more: false },
    revokePage: { items: [revokeFirst], more: true }, revokeNext: { items: [revokeSecond], more: false },
    live: { ...credential, state: "live" }, otherAttempt: null, otherIncarnation: [null, { items: [], more: false }, { items: [], more: false }, false],
    revoked: true, remaining: { items: [], more: false }, invalidLimit: { items: [], more: false },
    revokeRemaining: { items: [revokeFirst], more: false },
  });

  const after = { head: await scope.head(), summary: await scope.summary(), history: await scope.sealed() };
  const log = await scope.inside((_state, instance) => (instance as { log(reader: unknown): unknown }).log(reader));
  expect(after).toEqual(before);
  expect(JSON.stringify({ ...after, log })).not.toContain(credential.plaintext);
  expect(await scope.inside((state) => {
    const store = new CredentialStore(state.storage.sql, () => scope.at);
    return { revoked: store.revoked(credential.mint, 1), after: store.read(credential.mint, 1), evidence: store.reply(credential.mint, 1) };
  })).toEqual({ revoked: true, after: { ...credential, plaintext: null, state: "revoked" }, evidence: { id: credential.id, ends: credential.ends } });
  await scope.restart();
  expect(await scope.inside((state) => new CredentialStore(state.storage.sql, () => scope.at).revocations(null, 1))).toEqual({ items: [], more: false });
});

test("conflicting mint identities cannot replace custody; expiry and rejected custody drop never claim provider revocation or restore a secret", async () => {
  const scope = await create();
  const credential = minted("1:0");
  const other = { ...minted("2:0"), id: "provider-token-2" };
  const revoke = revoking("3:0", credential);
  expect(await scope.inside((state) => {
    const store = new CredentialStore(state.storage.sql, () => scope.at);
    const stored = store.put(credential);
    const sameId = store.put({ ...credential, mint: "2:0" as OperationId });
    const sameMint = store.put({ ...credential, id: "provider-token-2" });
    const storedOther = store.put(other);
    const wrongId = store.expectRevoke({ ...revoke, id: other.id });
    const expected = store.expectRevoke(revoke);
    const repeated = store.expectRevoke(revoke);
    const conflict = store.expectRevoke(revoking("3:0", other));
    const judged = store.judged(credential.mint, 1, { id: credential.id, ends: credential.ends });
    const beforeEnd = store.live(credential.mint, 1, at(59));
    const expired = store.live(credential.mint, 1, credential.ends);
    const stillLive = store.read(credential.mint, 1)?.state;
    const rejected = store.judged(credential.mint, 1, null);
    const repeat = store.put(credential);
    const restored = store.judged(credential.mint, 1, { id: credential.id, ends: credential.ends });
    return { stored, sameId, sameMint, storedOther, wrongId, expected, repeated, conflict, revocations: store.revocations(null, 1), judged, beforeEnd, expired, stillLive, rejected, repeat, restored, after: store.read(credential.mint, 1), reply: store.reply(credential.mint, 1) };
  })).toEqual({
    stored: "stored", sameId: "conflict", sameMint: "conflict", judged: true, beforeEnd: { ...credential, state: "live" },
    storedOther: "stored", wrongId: false, expected: true, repeated: true, conflict: false, revocations: { items: [revoke], more: false },
    expired: null, stillLive: "live", rejected: false, repeat: "repeat", restored: false,
    after: { ...credential, plaintext: null, state: "live" }, reply: { id: credential.id, ends: credential.ends },
  });
});

// Metadata/clock values here are mechanical private legacy rows, not host tokens.
// The actual alarm/authority boundary is covered by read-token.test.ts.
test("expiry backfill crosses restarts in bounded quanta and clears old incarnations without revocation", async () => {
  const scope = await create(), due = at(60), future = timeOf(timeMs(at(120))! + 123);
  const oldScope = canonicalize({ ...scope.at, inc: "in_zzzzzzzzzzzzzzzzzzzzzzzzzz" });
  expect(canonicalize(scope.at) < oldScope).toBe(true);
  await scope.inside(state => {
    const custody = new CredentialStore(state.storage.sql, () => scope.at);
    expect(custody.expiryWake(due), "empty custody has no maintenance alarm").toBeNull();
    expect(custody.expiryWake(() => { throw new Error("quiet custody sampled the clock"); })).toBeNull();
    // Model pre-queue storage, including dropped rows that still count toward
    // the primary-key quantum and an invalid legacy expiry that must erase.
    for (let n = 0; n < 65; n++) state.storage.sql.exec("INSERT INTO private_credential (scope,id,mint,attempt,ends,plaintext,state) VALUES (?,?,?,?,?,?,?)",
      oldScope, `legacy-${String(n).padStart(3, "0")}`, `${n}:0`, 1, n === 64 ? "invalid" : due, n === 0 ? null : "TEST legacy plaintext", "live").toArray();
    // Explicit trusted read-mint markers model known old-incarnation read
    // credentials; unknown legacy write rows are deliberately not classified.
    state.storage.sql.exec("INSERT INTO private_read_credential(scope,id,mint,attempt,ends) SELECT scope,id,mint,attempt,ends FROM private_credential WHERE scope=?", oldScope).toArray();
    state.storage.sql.exec("DELETE FROM private_credential_expiry").toArray();
    state.storage.sql.exec("UPDATE private_credential_expiry_backfill SET last_scope=NULL,last_id=NULL,done=0").toArray();
    custody.expire(due);
    expect(state.storage.sql.exec("SELECT COUNT(*) AS n FROM private_credential WHERE plaintext IS NOT NULL").toArray()).toEqual([{ n: 1 }]);
    expect(custody.expiryWake(due)).toBe(due);
    let readings = 0;
    expect(custody.expiryWake(() => { readings++; return due; })).toBe(due);
    expect(readings).toBe(1);
  });
  await scope.restart();
  await scope.inside(async state => {
    const custody = new CredentialStore(state.storage.sql, () => scope.at);
    // New writes behind the legacy cursor must queue independently.
    const current = { ...minted("500:0"), id: "fresh-behind-cursor", ends: future };
    expect(custody.putRead(current)).toBe("stored");
    const conflictingRead = { ...current, id: "must-not-create-read-marker" };
    expect(custody.putRead(conflictingRead)).toBe("conflict");
    expect(state.storage.sql.exec("SELECT COUNT(*) AS n FROM private_read_credential WHERE id=?", conflictingRead.id).toArray()).toEqual([{ n: 0 }]);

    custody.expire(due);
    expect(state.storage.sql.exec("SELECT COUNT(*) AS n FROM private_credential WHERE scope=? AND plaintext IS NOT NULL", oldScope).toArray()).toEqual([{ n: 0 }]);
    expect(state.storage.sql.exec("SELECT DISTINCT state FROM private_credential WHERE scope=?", oldScope).toArray()).toEqual([{ state: "live" }]);
    expect(custody.reply(current.mint, 1)).toEqual({ id: current.id, ends: future });
    expect(custody.expiryWake(due)).toBe(future);
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: closure => state.storage.transactionSync(closure) });
    const wakes = new Wakes(store, { set: time => time === null ? state.storage.deleteAlarm() : state.storage.setAlarm(timeMs(time)!) }, false, undefined, () => custody.expiryWake(due));
    // A durable native deadline remains earlier than private cleanup's wake.
    await wakes.deadline.set(at(90));
    expect(await state.storage.getAlarm()).toBe(timeMs(at(90)));
    await wakes.deadline.set(null);
    expect(await state.storage.getAlarm()).toBe(timeMs(future));

    custody.expire(timeOf(timeMs(future)! - 1));
    expect(custody.read(current.mint, 1)?.plaintext, "retain through the millisecond before the exact fractional end").toBe(current.plaintext);
    custody.expire(future);
    expect(custody.read(current.mint, 1)?.plaintext).toBeNull();
    expect(custody.expiryWake(future)).toBeNull();
    const write = { ...minted("503:0"), id: "read:provider-write-id", ends: future };
    expect(custody.put(write)).toBe("stored");
    custody.expire(future);
    expect(custody.read(write.mint, 1)?.plaintext, "a write id imitating read: is not eligibility").toBe(write.plaintext);
    // A synchronous fault after marker creation leaves only a nonsecret,
    // exact immutable binding. Different read bindings cannot use the marker.
    const orphan = { ...minted("504:0"), id: "orphan-read-marker", ends: future };
    const fault = new CredentialStore({ exec: (query, ...bindings) => {
      if (query.startsWith("INSERT INTO private_credential (")) throw new Error("TEST credential insert interrupted");
      return state.storage.sql.exec(query, ...bindings);
    } }, () => scope.at);
    expect(() => fault.putRead(orphan)).toThrow("TEST credential insert interrupted");
    expect(custody.read(orphan.mint, 1)).toBeNull();
    expect(state.storage.sql.exec("SELECT mint,attempt,ends FROM private_read_credential WHERE id=?", orphan.id).toArray()).toEqual([{ mint: orphan.mint, attempt: 1, ends: future }]);
    expect(custody.putRead({ ...orphan, mint: "505:0" as OperationId })).toBe("conflict");
    expect(custody.read("505:0" as OperationId, 1)).toBeNull();
    expect(custody.putRead(orphan)).toBe("stored");
    expect(state.storage.sql.exec("SELECT COUNT(*) AS n FROM private_credential_expiry WHERE id=?", orphan.id).toArray()).toEqual([{ n: 1 }]);
    expect(custody.judged(orphan.mint, 1, { id: orphan.id, ends: future })).toBe(true);
    expect(custody.take(orphan.id, START)?.plaintext).toBe(orphan.plaintext);
    expect(custody.putRead(orphan)).toBe("repeat");
    expect(custody.read(orphan.mint, 1)?.plaintext).toBeNull();
    expect(state.storage.sql.exec("SELECT COUNT(*) AS n FROM private_credential_expiry WHERE id=?", orphan.id).toArray()).toEqual([{ n: 0 }]);
    // A malformed old key must not starve independently queued valid tokens.
    const queued = { ...minted("501:0"), id: "queued-despite-malformed-legacy", ends: future };
    expect(custody.putRead(queued)).toBe("stored");
    state.storage.sql.exec("INSERT INTO private_credential (scope,id,mint,attempt,ends,plaintext,state) VALUES (?,?,?,?,?,?,?)", "!malformed", "x".repeat(4097), "502:0", 1, future, "TEST corrupt legacy plaintext", "live").toArray();
    state.storage.sql.exec("UPDATE private_credential_expiry_backfill SET last_scope=NULL,last_id=NULL,done=0").toArray();
    expect(() => custody.expire(future)).toThrow("credential expiry legacy key exceeds metadata bound");
    expect(custody.read(queued.mint, 1)?.plaintext).toBeNull();
    expect(custody.reply(queued.mint, 1)).toEqual({ id: queued.id, ends: future });
    expect(state.storage.sql.exec("SELECT last_scope,last_id,done FROM private_credential_expiry_backfill").toArray()).toEqual([{ last_scope: null, last_id: null, done: 0 }]);
    expect(state.storage.sql.exec("SELECT COUNT(*) AS n FROM private_credential WHERE scope=?", "!malformed").toArray()).toEqual([{ n: 1 }]);
  });
});
