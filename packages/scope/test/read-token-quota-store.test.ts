/** Real Durable Object SQLite. Opening entries, membership grants and
 * provider replies are SCRIPTED; no authority or provider runs here. The
 * separate Native owner witnesses admission and the actual adapter path. */
import { expect, test } from "vitest";
import type { Entry, MemberRef, OperationId, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, keyIdOfSecret, signIntent, timeOf } from "@generalbusiness/dap-bytes";
import { LAST_MS, timeMs } from "@generalbusiness/dap-derive";
import { d, grantOf, keys, t, type Actor } from "@generalbusiness/dap-derive/testing";
import { Branch } from "../../platform/test/support-destination.ts";
import { CredentialStore } from "../src/credential-store.ts";
import { create } from "./fixtures-native.ts";

const { rita } = keys;
const branch = new Branch(false).confirmed();
const destination = branch.at;

/** Structurally complete scripted input; it supplies no Native judgment. */
function opening(seq: number, at = destination, member: MemberRef = rita.member, hours = 1, time: Timestamp = t(0), who: Actor = rita): Entry {
  const actor = { ...who, member };
  const signed = signIntent({ v: 1, to: at, actor: actor.key, kind: "read-token", on: 0, expected: { on: 1 }, fields: { hours }, idempotencyKey: `TEST-read-${seq}`, notAfter: timeOf(Math.min(LAST_MS, timeMs(time)! + 60_000)) }, actor.secret);
  return { v: 1, genesis: at.genesis, seq, prev: d("1"), time, clamped: false, epoch: 0,
    input: { type: "act", signed, authority: [grantOf(actor, at, ["destination.read-token"])], presented: {} },
    uses: [], prepared: [], effects: [{ effect: "operation", k: 0, owner: "platform:destination@2", kind: "mint-read", attempts: 1 }], sends: [] };
}

test("private read reservations retain actual expiry after plaintext take, preserve legacy and incarnation boundaries across restart, and expire in bounded indexed quanta without inventing an impossible alarm", async () => {
  const scope = await create();
  const first = opening(10, destination, rita.member, 24), unknown = opening(12, destination, rita.member, 24);
  const initial = await scope.inside(state => {
    const custody = new CredentialStore(state.storage.sql, () => destination), quota = custody.readTokens;
    // Pre-upgrade read metadata has no member and never gains a quota row.
    custody.putRead({ id: "read:TEST-legacy", mint: "2:0" as OperationId, attempt: 1, ends: t(3600), plaintext: "TEST-legacy-plaintext" });
    const old = quota.bind("2:0" as OperationId, "read:TEST-legacy", t(0));
    quota.sealed(first);
    const reserved = quota.nextExpiry();
    const bound = quota.bind("10:0" as OperationId, "read:TEST-current", t(0));
    const actual = quota.minted("10:0" as OperationId, "read:TEST-current", t(10), t(0));
    custody.putRead({ id: "read:TEST-current", mint: "10:0" as OperationId, attempt: 1, ends: t(10), plaintext: "TEST-current-plaintext" });
    custody.judged("10:0" as OperationId, 1, { id: "read:TEST-current", ends: t(10) });
    const took = custody.take("read:TEST-current", t(1)) !== null;
    const wakeAfterTake = custody.expiryWake(t(1));
    quota.sealed(opening(11));
    quota.bind("11:0" as OperationId, "read:TEST-refused", t(0));
    quota.refused("11:0" as OperationId, "read:TEST-refused");
    quota.sealed(unknown);
    quota.bind("12:0" as OperationId, "read:TEST-unknown", t(0));
    quota.refused("12:0" as OperationId, "read:TEST-wrong-handle");
    const beforeExpiry = state.storage.sql.exec("SELECT mint,ends_ms FROM private_read_quota ORDER BY mint").toArray();
    custody.expire(t(10));
    const cannotRemint = quota.bind("10:0" as OperationId, "read:TEST-current", t(10));
    const cannotRevive = quota.minted("10:0" as OperationId, "read:TEST-current", t(3600), t(10));
    return { old, reserved, bound, actual, took, wakeAfterTake, beforeExpiry, cannotRemint, cannotRevive, remaining: state.storage.sql.exec("SELECT mint,ends_ms FROM private_read_quota").toArray(), legacyStillUnassigned: quota.bind("2:0" as OperationId, "read:TEST-legacy", t(10)) };
  });
  const end = timeMs(t(0))! + (24 * 60 + 10) * 60_000;
  expect(initial).toEqual({ old: "legacy", reserved: end, bound: "bound", actual: true, took: true, wakeAfterTake: t(10), beforeExpiry: [{ mint: "10:0", ends_ms: timeMs(t(10)) }, { mint: "12:0", ends_ms: end }], cannotRemint: "closed", cannotRevive: false, remaining: [{ mint: "12:0", ends_ms: end }], legacyStillUnassigned: "legacy" });
  await scope.restart();
  const otherMembership = { ...rita.member, membership: { ...rita.member.membership, genesis: `sha256:${"17".repeat(32)}` as const } };
  const otherDestination: ScopeRef = { ...destination, genesis: `sha256:${"18".repeat(32)}` as const };
  const isolated = await scope.inside(state => {
    const old = new CredentialStore(state.storage.sql, () => destination).readTokens;
    const retained = old.nextExpiry();
    old.sealed(opening(13, destination, otherMembership));
    const newer = new CredentialStore(state.storage.sql, () => otherDestination).readTokens;
    newer.sealed(opening(1, otherDestination));
    newer.bind("1:0" as OperationId, "read:TEST-new-incarnation", t(0));
    newer.refused("1:0" as OperationId, "read:TEST-new-incarnation");
    return { retained, rows: state.storage.sql.exec("SELECT scope,mint,bucket FROM private_read_quota ORDER BY mint").toArray(), legacy: old.bind("2:0" as OperationId, "read:TEST-legacy", t(10)), oldAttempt: old.bind("12:0" as OperationId, "read:TEST-unknown", t(10)) };
  });
  expect(isolated).toEqual({ retained: end, rows: [{ scope: canonicalize(destination), mint: "12:0", bucket: canonicalize(rita.member) }, { scope: canonicalize(destination), mint: "13:0", bucket: canonicalize(otherMembership) }], legacy: "legacy", oldAttempt: "closed" });

  const quantum = await scope.inside(state => {
    const custody = new CredentialStore(state.storage.sql, () => destination), quota = custody.readTokens;
    custody.expire(t(25 * 3600));
    const time = t(30 * 3600), ends = t(30 * 3600 + 1);
    // Sixty-five distinct member/key identities can exist in this bucket
    // domain. Each owns one slot; this does not repeat the Native cap8 case.
    for (let n = 0; n < 65; n++) {
      const secret = new Uint8Array(32).fill(n + 100);
      const who: Actor = { secret, key: keyIdOfSecret(secret), member: { ...rita.member, member: `@quota-${n}` }, principal: null };
      quota.sealed(opening(100 + n, destination, who.member, 1, time, who));
      quota.bind(`${100 + n}:0` as OperationId, `read:TEST-quantum-${n}`, time);
      quota.minted(`${100 + n}:0` as OperationId, `read:TEST-quantum-${n}`, ends, time);
    }
    const count = () => state.storage.sql.exec("SELECT COUNT(*) AS n FROM private_read_quota").one()["n"];
    const before = count();
    custody.expire(ends);
    const afterOne = count(), dueAgain = custody.expiryWake(ends);
    custody.expire(ends);
    const afterTwo = count();
    let clockReads = 0;
    const quiet = custody.expiryWake(() => { clockReads++; return ends; });
    return { before, afterOne, dueAgain, afterTwo, quiet, clockReads };
  });
  expect(quantum).toEqual({ before: 65, afterOne: 1, dueAgain: t(30 * 3600 + 1), afterTwo: 0, quiet: null, clockReads: 0 });

  const boundary = await scope.inside(state => {
    const custody = new CredentialStore(state.storage.sql, () => destination), quota = custody.readTokens;
    // One millisecond remains for the signed intent, so this opening time
    // precedes notAfter even at the final representable date.
    quota.sealed(opening(500, destination, rita.member, 24, timeOf(LAST_MS - 1)));
    quota.expire(timeOf(LAST_MS));
    let clockReads = 0;
    const wake = custody.expiryWake(() => { clockReads++; return timeOf(LAST_MS); });
    return { open: state.storage.sql.exec("SELECT COUNT(*) AS n FROM private_read_quota").one()["n"], end: quota.nextExpiry(), wake, clockReads };
  });
  expect(boundary).toEqual({ open: 1, end: null, wake: null, clockReads: 0 });
});
