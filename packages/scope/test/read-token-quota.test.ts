/** Real native admission, authority, transactions and SQLite. Artifacts
 * replies and the clock are explicit TEST stand-ins; no host token exists. */
import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Intent, OperationId } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, intentDigest, isSeed, scopeIdOf, signIntent, timeOf } from "@generalbusiness/dap-bytes";
import { invitationIssueFields, invitationRedemptionFields } from "@generalbusiness/dap-client";
import { keys } from "@generalbusiness/dap-derive/testing";
import { FAILED_CLAIM_COHORT as C } from "@generalbusiness/dap-platform";
import { artifactsOutside } from "../src/artifacts-wiring.ts";
import type { ArtifactsNamespace } from "../src/artifacts-host.ts";
import { CredentialStore } from "../src/credential-store.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { driveFixture, effectFixture, nativeFixtureLifetime } from "./support/native-fixture-lifetime.ts";

const { rita, una, vic, paul, sam } = keys;
const HOST = "quota.invalid", NAMESPACE = "r13-read-quota-test";
type Mode = "ok" | "refused" | "unknown" | "late" | "expired";
const quotaPhase = (scenario: "admission" | "adapter", step: string) => console.info("TEST R13 quota phase", { scenario, step });

async function quotaRoom() {
  const life = nativeFixtureLifetime(beginSessionFixture({ secret: null, sessions: false, inspector: null }), { required: false });
  const now = () => timeOf(life.now());
  let started!: () => void;
  const providerStarted = new Promise<void>(resolve => { started = resolve; });
  const control = {
    mode: "ok" as Mode, calls: [] as { seconds: number; rows: Record<string, unknown>[] }[],
    rows: (): Record<string, unknown>[] => [],
    finishLate: null as ((value: unknown) => void) | null,
  };
  const ns: ArtifactsNamespace = {
    create: async name => ({ name, remote: `https://${HOST}/git/${NAMESPACE}/${name}.git`, token: "TEST-creation-plaintext" }) as never,
    delete: async () => true,
    get: async name => ({
      createToken: async (scope: string, seconds: number) => {
        if (scope !== "read") throw Error("TEST unexpected write token");
        control.calls.push({ seconds, rows: control.rows() });
        if (control.mode === "refused") throw Object.assign(new Error("TEST explicit refusal"), { code: "INVALID_TTL", numericCode: 400 });
        if (control.mode === "unknown") throw Error("TEST lost provider answer");
        if (control.mode === "late") return new Promise<unknown>(resolve => { control.finishLate = resolve; started(); });
        return { id: `TEST-token-${control.calls.length}`, scope, plaintext: `TEST-read-${control.calls.length}`, expiresAt: timeOf(life.now() + (control.mode === "expired" ? -1000 : seconds * 1000)) };
      },
      revokeToken: async () => true,
      info: async () => ({ name, remote: `https://${HOST}/git/${NAMESPACE}/${name}.git` }),
    }) as never,
  };
  const install: Intent = { v: 1, to: null, actor: paul.key, kind: "install", on: null, expected: {}, fields: { host: "artifacts", namespace: NAMESPACE, policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: timeOf(life.now() + 60_000) };
  const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: C.register, creator: null, cause: intentDigest(install), ordinal: 0 }));
  const settings = { ARTIFACTS_CONFIG: canonicalize({ registerScope: R.name, namespace: NAMESPACE, host: HOST, maxBytes: 10485760, credentialIdentity: "adapter-attempt" }), ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS: ns };
  life.outside(R.name, (given, sql) => artifactsOutside(given, sql, settings));
  expect(await R.stub.create(signIntent(install, paul.secret), C.register)).toMatchObject({ answer: "accepted" });
  expect(await R.act(rita, "found", { expected: { register: 1 }, fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } })).toMatchObject({ answer: "accepted" });
  await effectFixture([R], life.wait);
  const birth = (await R.entries()).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.kind === "directory");
  if (!birth || !isSeed(birth.to)) return expect.fail("Native directory birth missing");
  const D = life.platform(scopeIdOf(birth.to));
  await driveFixture([R, D], life.wait);
  const children = (await D.entries())[0]!.sends.map(send => send.to).filter(isSeed);
  const nodes = children.map(seed => life.platform(scopeIdOf(seed)));
  const M = nodes[children.findIndex(seed => seed.kind === "membership")]!;
  const G = nodes[children.findIndex(seed => seed.kind === "destination")]!;
  await driveFixture([R, D, ...nodes], life.wait);
  const seat = await M.did(rita, "seat", { expected: { roster: 1 } });
  await M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) });
  life.outside(G.name, (given, sql) => {
    control.rows = () => sql.exec("SELECT mint,bucket,ends_ms,handle FROM private_read_quota ORDER BY mint").toArray();
    const port = artifactsOutside(given, sql, settings);
    return { ...port, accepts: (owner, kind) => kind === "mint-read" && port.accepts(owner, kind) };
  });
  await G.restart();
  const branch = (await G.summary()).value.items.find(item => item.type === "branch")!;
  const submit = async (who = rita) => G.act(who, "read-token", { on: branch.id, fields: {}, expected: await G.expected({ on: branch.id }) });
  const rows = () => life.wait(() => runInDurableObject(G.object, (_instance, state) => state.storage.sql.exec("SELECT scope,mint,bucket,ends_ms,handle FROM private_read_quota ORDER BY mint").toArray()));
  return { life, now, R, D, M, G, seat, branch, control, providerStarted, submit, rows };
}

test("Native read-token quota shares eight slots across a member's keys, refuses a ninth without an entry, preserves retries and another member, and reserves atomically before the provider", async () => {
  quotaPhase("admission", "room-start");
  const f = await quotaRoom(), { life, M, G, control, rows } = f;
  quotaPhase("admission", "room-ready");
  try {
    const membership = await M.at();
    // Una's fixture hint names another person. Real enrolment binds her key
    // to @rita, so only the authenticated grant can choose this bucket.
    const enrol = async (who: typeof una, member: number, kind: "device" | "agent", fill: number) => {
      const secret = b64url(new Uint8Array(32).fill(fill));
      const invitation = await M.did(rita, "invite-key", { fields: { member, kind, inviteEnds: timeOf(life.now() + 3_600_000), ...invitationIssueFields(C.membership, secret) }, expected: await M.expected({ member }) });
      await M.did(who, "enrol", { on: 0, fields: invitationRedemptionFields(C.membership, membership, invitation, who.key, secret), expected: await M.expected({ on: 0, member }) });
    };
    await enrol(una, f.seat, "device", 41);
    quotaPhase("admission", "second-key-enrolled");
    const independent = await M.did(rita, "add-member", { fields: { handle: "@quota-other", kind: "agent", controller: { membership, member: "@rita" } } });
    await enrol(vic, independent, "agent", 42);
    quotaPhase("admission", "other-member-enrolled");
    const first = await G.intent(rita, "read-token", { on: f.branch.id, fields: {}, expected: await G.expected({ on: f.branch.id }) });
    const beforeFault = await G.entries();
    await life.wait(() => runInDurableObject(G.object, (_instance, state) => {
      state.storage.sql.exec("CREATE TRIGGER TEST_quota_rollback AFTER INSERT ON private_read_quota BEGIN SELECT RAISE(ABORT,'TEST read quota rollback'); END").toArray();
    }));
    quotaPhase("admission", "rollback-trigger-ready");
    await expect(G.stub.submit(first, [])).rejects.toThrow(/TEST read quota rollback/);
    quotaPhase("admission", "rollback-observed");
    const rollback = await life.wait(() => runInDurableObject(G.object, (_instance, state) => {
      state.storage.sql.exec("DROP TRIGGER TEST_quota_rollback").toArray();
      return ["entry", "private_read_quota", "private_read_quota_start"].map(table => state.storage.sql.exec(`SELECT COUNT(*) AS n FROM ${table}`).one()["n"]);
    }));
    expect(rollback).toEqual([beforeFault.length, 0, 0]);
    quotaPhase("admission", "rollback-rows-checked");
    await G.restart();
    quotaPhase("admission", "rollback-restarted");
    expect(await G.entries()).toEqual(beforeFault);
    const accepted = await G.stub.submit(first, []);
    expect(accepted.answer).toBe("accepted");
    quotaPhase("admission", "first-mint-accepted");
    for (let n = 1; n < 8; n++) expect((await f.submit(n % 2 ? una : rita)).answer).toBe("accepted");
    quotaPhase("admission", "eight-mints-accepted");
    await effectFixture([G], life.wait);
    quotaPhase("admission", "eight-effects-joined");
    const full = await rows(), bucket = canonicalize({ membership, member: "@rita" });
    expect(full).toHaveLength(8);
    expect(full.every(row => row["bucket"] === bucket)).toBe(true);
    expect(control.calls).toHaveLength(8);
    expect(control.calls.every(call => call.seconds === 3600 && call.rows.some(row => typeof row["handle"] === "string" && row["ends_ms"] === life.now() + 4_200_000))).toBe(true);
    const before = await G.entries();
    expect(await f.submit(una)).toMatchObject({ answer: "refused", reason: "limit" });
    expect(await G.entries()).toEqual(before);
    expect(await G.stub.submit(first, [])).toEqual(accepted);
    expect(await G.stub.submit(signIntent({ ...first.intent, notAfter: timeOf(life.now() + 61_000) }, rita.secret), [])).toMatchObject({ answer: "mismatch" });
    expect(await rows()).toEqual(full);
    expect(await G.entries()).toEqual(before);
    expect((await f.submit(vic)).answer).toBe("accepted");
    quotaPhase("admission", "other-member-mint-accepted");
    await effectFixture([G], life.wait);
    quotaPhase("admission", "other-member-effect-joined");
    expect((await rows()).filter(row => row["bucket"] === canonicalize({ membership, member: "@quota-other" }))).toHaveLength(1);
    const destination = await G.at();
    const taken = await life.wait(() => runInDurableObject(G.object, (_instance, state) => {
      const custody = new CredentialStore(state.storage.sql, () => destination);
      return state.storage.sql.exec("SELECT handle FROM private_read_quota").toArray().filter(row => typeof row["handle"] === "string" && custody.take(row["handle"], f.now()) !== null).length;
    }));
    expect(taken).toBe(9);
    quotaPhase("admission", "plaintext-taken");
    expect(await f.submit(rita)).toMatchObject({ answer: "refused", reason: "limit" });
    expect(await rows()).toHaveLength(9);
    await G.restart();
    quotaPhase("admission", "expiry-restarted");
    life.advance(3_600_000);
    quotaPhase("admission", "expiry-clock-advanced");
    expect(await life.wait(() => runDurableObjectAlarm(G.object))).toBe(true);
    quotaPhase("admission", "expiry-alarm-finished");
    expect(await rows()).toEqual([]);
    expect((await f.submit(rita)).answer).toBe("accepted");
    quotaPhase("admission", "fresh-mint-accepted");
    await effectFixture([G], life.wait);
    quotaPhase("admission", "fresh-effect-joined");
  } finally { life.release(); }
});

test("Native read-token adapter frees explicit refusal, holds an unknown for requested hours plus ten minutes, and confirms a late reply without plaintext or a slot after a replacement takes the eighth place", async () => {
  quotaPhase("adapter", "room-start");
  const f = await quotaRoom(), { life, G, control, rows } = f;
  quotaPhase("adapter", "room-ready");
  let driving: Promise<number> | null = null;
  try {
    const outcome = async (mint: OperationId) => (await G.entries()).find(entry => entry.input.type === "outcome" && entry.input.operation === mint)?.input;
    control.mode = "refused";
    const refused = await f.submit();
    if (refused.answer !== "accepted") return expect.fail("Native refusal attempt was not admitted");
    await effectFixture([G], life.wait);
    expect(await rows()).toEqual([]);
    expect(await outcome(`${refused.receipt.fact.seq}:0`)).toMatchObject({ type: "outcome", result: "refused", evidence: { basis: "own-answer", body: {} } });
    quotaPhase("adapter", "refusal-checked");
    control.mode = "expired";
    const expired = await f.submit();
    if (expired.answer !== "accepted") return expect.fail("Native known expired attempt was not admitted");
    await effectFixture([G], life.wait);
    // P16 records a genuine known mint even when its reported end elapsed.
    // Quota must not turn that valid confirmed fact into an unknown answer.
    expect(await outcome(`${expired.receipt.fact.seq}:0`)).toMatchObject({ type: "outcome", result: "confirmed", evidence: { basis: "own-answer", body: { ends: timeOf(life.now() - 1000) } } });
    quotaPhase("adapter", "known-expired-checked");
    control.mode = "unknown";
    const opened = life.now(), unknown = await f.submit();
    if (unknown.answer !== "accepted") return expect.fail("Native unknown attempt was not admitted");
    await effectFixture([G], life.wait);
    expect((await rows()).map(row => row["ends_ms"])).toEqual([opened + 4_200_000]);
    expect(await outcome(`${unknown.receipt.fact.seq}:0`)).toMatchObject({ type: "outcome", result: "unknown", evidence: { basis: "none", body: {} } });
    quotaPhase("adapter", "unknown-checked");
    await G.restart();
    life.advance(4_199_999);
    expect(await rows()).toHaveLength(1);
    life.advance(1);
    expect(await life.wait(() => runDurableObjectAlarm(G.object))).toBe(true);
    expect(await rows()).toEqual([]);
    control.mode = "late";
    quotaPhase("adapter", "unknown-expired");
    const lateIntent = await G.intent(rita, "read-token", { on: f.branch.id, fields: {}, expected: await G.expected({ on: f.branch.id }) });
    const late = await G.stub.submit(lateIntent, []);
    if (late.answer !== "accepted") return expect.fail("Native late attempt was not admitted");
    driving = life.wait(() => (G.stub as unknown as { effect(): Promise<number> }).effect());
    void driving.catch(() => undefined); // The awaited result below still decides.
    await f.providerStarted;
    quotaPhase("adapter", "late-provider-started");
    // The actual provider await stays held while seven later acts reserve
    // their slots. Their fallback ends remain one second after the old end.
    life.advance(1000);
    for (let n = 0; n < 7; n++) expect((await f.submit()).answer).toBe("accepted");
    quotaPhase("adapter", "seven-later-mints-accepted");
    life.advance(4_199_000);
    const replacement = await f.submit();
    expect(replacement.answer).toBe("accepted");
    quotaPhase("adapter", "replacement-accepted");
    expect(await rows()).toHaveLength(8);
    const lateMint = `${late.receipt.fact.seq}:0` as OperationId;
    expect((await rows()).some(row => row["mint"] === lateMint)).toBe(false);
    control.mode = "ok";
    const lateEnd = timeOf(life.now() + 3_600_000);
    control.finishLate!({ id: "TEST-late", scope: "read", plaintext: "TEST-late-plaintext", expiresAt: lateEnd });
    control.finishLate = null;
    await driving;
    quotaPhase("adapter", "late-effect-joined");
    await effectFixture([G], life.wait);
    quotaPhase("adapter", "later-effects-joined");
    expect(await outcome(lateMint)).toMatchObject({ type: "outcome", result: "confirmed", evidence: { basis: "own-answer", body: { token: expect.any(String), ends: lateEnd } } });
    const kept = await life.wait(() => runInDurableObject(G.object, (_instance, state) => state.storage.sql.exec("SELECT ends,plaintext FROM private_credential WHERE mint=?", lateMint).toArray()));
    expect(kept).toEqual([{ ends: lateEnd, plaintext: null }]);
    expect(canonicalize(await G.entries())).not.toContain("TEST-late-plaintext");
    expect(await G.stub.submit(lateIntent, [])).toEqual(late);
    expect(await rows()).toHaveLength(8);
    expect(await f.submit()).toMatchObject({ answer: "refused", reason: "limit" });
    expect(control.calls).toHaveLength(12);
    quotaPhase("adapter", "late-quota-checked");
  } finally {
    control.finishLate?.(null);
    control.finishLate = null;
    if (driving) await driving.catch(() => undefined);
    life.release();
  }
});
