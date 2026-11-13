/** Real Durable Object SQL and production issuer/access code. Agent identity,
 * standing, clock, randomness and transport callbacks are explicit stand-ins;
 * these cases prove no Native enrollment, browser consent or network delivery. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { MemberId, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, keyIdOfSecret, utf8 } from "@generalbusiness/dap-bytes";
import { OAuthAccess, OAUTH_ACCESS_MS, OAUTH_GRANT_MS, type OAuthAgentIdentity } from "../src/oauth-access.ts";
import { OAuthIssuer, type OAuthIssuerPorts, type OAuthResult } from "../src/oauth-issuer.ts";
import type { OAuthBinding } from "../src/oauth-parameters.ts";
import type { Sql } from "../src/sqlite-custody.ts";
import { hostedRolePort, type HostedRoleDecision, type HostedRoleRead } from "../src/hosted.ts";

const START = Date.parse("2099-01-01T00:00:00Z"), CLIENT = "https://clients.example/metadata.json", REDIRECT = "https://claude.ai/api/mcp/auth_callback", RESOURCE = "https://room.example/mcp?host=claude";
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const BINDING: OAuthBinding = { client_id: CLIENT, redirect_uri: REDIRECT, code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", resource: RESOURCE, scope: "mcp", state_digest: digestBytes(utf8("state")) };
const MEMBERSHIP: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"a".repeat(64)}` };
function fixture(sql: Sql, id: string) {
  sql.exec(`CREATE TABLE test_issuer_budget (used INTEGER NOT NULL)`); sql.exec(`INSERT INTO test_issuer_budget VALUES (0)`);
  const state = { now: START, limit: 16 * 1024 * 1024, reads: 0, standing: { status: "active" } as HostedRoleDecision, hold: null as Promise<void> | null, onRead: null as (() => void) | null,
    owner: "original", lastRandom: "", endedHold: null as Promise<void> | null, onEnded: null as (() => void) | null, rotatedHold: null as Promise<void> | null, onRotated: null as (() => void) | null, random: 0, ended: [] as string[], rotated: [] as string[] };
  const identity: OAuthAgentIdentity = { op: "TEST issuer fixture", configuration: canonicalize({ service: RESOURCE }), state: "enrolled", membership: MEMBERSHIP, key: keyIdOfSecret(new Uint8Array(32).fill(3)), handle: "@agent" };
  const charge = (bytes: number) => {
    const before = Number(sql.exec(`SELECT used FROM test_issuer_budget`).toArray()[0]!["used"]);
    if (before + bytes > state.limit) return false;
    expect(before + bytes).toBeGreaterThanOrEqual(0);
    sql.exec(`UPDATE test_issuer_budget SET used = ?`, before + bytes); return true;
  };
  const ports: OAuthIssuerPorts = { id, now: () => state.now, agent: () => identity, charge,
    random: n => { const bytes = new Uint8Array(n).fill(++state.random); state.lastRandom = b64url(bytes); return bytes; },
    issueOwner: op => canonicalize({ op, owner: state.owner }),
    standing: async () => { state.reads++; state.onRead?.(); await state.hold; return state.standing; },
    ended: async (id, current) => { expect(current()).toBe(true); state.ended.push(id); state.onEnded?.(); await state.endedHold; }, rotated: async id => { state.rotated.push(id); state.onRotated?.(); await state.rotatedHold; },
  };
  const access = () => new OAuthAccess(sql, { now: ports.now, agent: ports.agent, charge: n => { expect(charge(n)).toBe(true); },
    roleStanding: hostedRolePort(async (request): Promise<HostedRoleRead> => {
      if (!("agent" in request)) throw Error("Issuer Access fixture received an unexpected actor-only read");
      return { status: "observed", of: { ...request.membership }, head: { seq: 1, hash: digestBytes(utf8("TEST role head")) },
      agent: { member: request.agent, state: "active", role: "agent", activeKey: true, controller: "@owner" as MemberId, actions: [] },
      agentKey: request.agentKey === null ? null : { key: request.agentKey, keyState: "active", member: request.agent, memberState: "active", controller: "@owner" as MemberId, actions: [] },
      controller: { member: "@owner" as MemberId, state: "active", role: "member", activeKey: false, controller: null, actions: [] }, actor: null };
    }) });
  let admitted = access();
  let issuer = new OAuthIssuer(sql, ports, admitted);
  return { state, identity, ports, get access() { return admitted; }, get issuer() { return issuer; }, restart: () => { admitted = access(); issuer = new OAuthIssuer(sql, ports, admitted); },
    used: () => Number(sql.exec(`SELECT used FROM test_issuer_budget`).toArray()[0]!["used"]) };
}
function token(result: OAuthResult, key: string): [string, string, string] {
  const value = result.body[key]; expect(typeof value).toBe("string");
  const parts = String(value).split("."); expect(parts).toHaveLength(3); return parts as [string, string, string];
}

test("codes bind the request once, refresh survives access expiry, and reuse of any rotated refresh ends the durable grant", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    const f = fixture(sql, state.id.toString()), secrets: string[] = [];
    const issued = await f.issuer.issue("first", "@owner" as MemberId, BINDING, "TEST client"); expect(issued.status).toBe(201);
    const [, id, code] = token(issued, "code"); secrets.push(code);
    const replayed = await f.issuer.issue("first", "@owner" as MemberId, BINDING, "TEST client");
    expect(replayed.body).toMatchObject({ grant: id, codeShown: true }); expect(replayed.body).not.toHaveProperty("code");
    const readsBeforeInvalidBindings = f.state.reads;
    for (const [client, redirect, verifier, resource] of [
      [CLIENT + "/other", REDIRECT, VERIFIER, RESOURCE], [CLIENT, REDIRECT + "/other", VERIFIER, RESOURCE],
      [CLIENT, REDIRECT, "x".repeat(43), RESOURCE], [CLIENT, REDIRECT, VERIFIER, "https://room.example/mcp?host=chatgpt"],
    ]) expect((await f.issuer.exchange(id, code, client!, redirect!, verifier!, resource)).body).toEqual({ error: "invalid_grant" });
    expect(f.state.reads).toBe(readsBeforeInvalidBindings);
    f.restart();
    const exchanged = await f.issuer.exchange(id, code, CLIENT, REDIRECT, VERIFIER, RESOURCE); expect(exchanged.status).toBe(200);
    const [, grant, access] = token(exchanged, "access_token"), [, , refresh] = token(exchanged, "refresh_token"); secrets.push(access, refresh);
    expect(f.access.inspect(grant, access, RESOURCE)).not.toBeNull();
    expect((await f.issuer.exchange(id, code, CLIENT, REDIRECT, VERIFIER)).body).toEqual({ error: "invalid_grant" });
    expect(f.access.inspect(grant, access, RESOURCE)).toBeNull();
    expect(f.state.ended).toContain(id);
    const second = await f.issuer.issue("second", "@owner" as MemberId, BINDING, "TEST client"), [, secondId, secondCode] = token(second, "code"); secrets.push(secondCode);
    const firstTokens = await f.issuer.exchange(secondId, secondCode, CLIENT, REDIRECT, VERIFIER);
    const [, , firstAccess] = token(firstTokens, "access_token"), [, , firstRefresh] = token(firstTokens, "refresh_token"); secrets.push(firstAccess, firstRefresh);
    f.state.now += OAUTH_ACCESS_MS + 1;
    expect(f.access.inspect(secondId, firstAccess, RESOURCE)).toBeNull();
    const rotated = await f.issuer.refresh(secondId, firstRefresh, CLIENT, RESOURCE); expect(rotated.status).toBe(200);
    const [, , nextAccess] = token(rotated, "access_token"), [, , nextRefresh] = token(rotated, "refresh_token"); secrets.push(nextAccess, nextRefresh);
    expect(f.access.inspect(secondId, nextAccess, RESOURCE)?.grant.ends).toBe(START + OAUTH_GRANT_MS);
    f.restart();
    const twice = await f.issuer.refresh(secondId, nextRefresh, CLIENT); expect(twice.status).toBe(200);
    const [, , lastAccess] = token(twice, "access_token"), [, , lastRefresh] = token(twice, "refresh_token"); secrets.push(lastAccess, lastRefresh);
    expect((await f.issuer.refresh(secondId, firstRefresh, CLIENT)).body).toEqual({ error: "invalid_grant" });
    expect(f.access.inspect(secondId, lastAccess, RESOURCE)).toBeNull();
    expect(sql.exec(`SELECT count(*) AS n FROM oauth_refresh_used WHERE grant_id = ?`, secondId).toArray()[0]!["n"]).toBe(0);
    expect(f.state.rotated).toHaveLength(4);
    const stored = JSON.stringify({ details: sql.exec(`SELECT * FROM oauth_issuer`).toArray(), access: sql.exec(`SELECT * FROM oauth_grant`).toArray(), used: sql.exec(`SELECT * FROM oauth_refresh_used`).toArray() });
    for (const secret of secrets) expect(stored).not.toContain(secret);

    // Final issue standing is separate from the pre-mint read. Subset loss
    // withholds plaintext but preserves the one pending row and reservation.
    const firstRead = f.state.reads;
    let issueEntered!: () => void, releaseIssue!: () => void;
    const issueHeld = new Promise<void>(resolve => { issueEntered = resolve; });
    const issueRelease = new Promise<void>(resolve => { releaseIssue = resolve; });
    f.state.onRead = () => { if (f.state.reads === firstRead + 2) { f.state.hold = issueRelease; issueEntered(); } };
    const issuing = f.issuer.issue("withheld-code", "@owner" as MemberId, BINDING, "TEST");
    await issueHeld;
    const keptCode = sql.exec(`SELECT id, row, state FROM oauth_issuer WHERE op = ?`, "withheld-code").toArray();
    const keptBudget = f.used(), keptRandom = f.state.random;
    f.state.standing = { status: "inactive", reason: "role-subset" }; releaseIssue();
    const withheldCode = await issuing;
    f.state.hold = null; f.state.onRead = null;
    expect(withheldCode.status).toBe(403);
    expect(withheldCode.body).toEqual({ error: "unauthorized", rule: "controller-role", agent: state.id.toString(), grant: keptCode[0]!["id"], codeShown: true, state_digest: BINDING.state_digest,
      next: "This attempt committed a one-shot credential but returned no credential plaintext. Its retained receipt cannot redisplay the secret. Do not expect a later role change or same-operation replay to recover it." });
    expect(sql.exec(`SELECT id, row, state FROM oauth_issuer WHERE op = ?`, "withheld-code").toArray()).toEqual(keptCode);
    expect(f.used()).toBe(keptBudget); expect(f.state.random).toBe(keptRandom);
    f.state.standing = { status: "active" };
    const codeReceipt = await f.issuer.issue("withheld-code", "@owner" as MemberId, BINDING, "TEST");
    expect(codeReceipt.body).toEqual({ agent: state.id.toString(), grant: keptCode[0]!["id"], codeShown: true, state_digest: BINDING.state_digest });
    expect(f.state.random).toBe(keptRandom); expect(f.used()).toBe(keptBudget);

    // The random port is an explicit in-memory TEST stand-in. It exposes the
    // held refresh only to construct a newer real issuer rotation, never a
    // claim that a withheld client received that secret.
    const concurrentCode = await f.issuer.issue("newer-candidate", "@owner" as MemberId, BINDING, "TEST"), [, concurrentId, concurrentSecret] = token(concurrentCode, "code");
    const concurrentTokens = await f.issuer.exchange(concurrentId, concurrentSecret, CLIENT, REDIRECT, VERIFIER);
    const [, , concurrentRefresh] = token(concurrentTokens, "refresh_token");
    let rotationEntered!: () => void, releaseRotation!: () => void;
    const rotationHeld = new Promise<void>(resolve => { rotationEntered = resolve; });
    f.state.rotatedHold = new Promise<void>(resolve => { releaseRotation = resolve; });
    f.state.onRotated = rotationEntered;
    const older = f.issuer.refresh(concurrentId, concurrentRefresh, CLIENT);
    await rotationHeld;
    const heldRefresh = f.state.lastRandom;
    f.state.rotatedHold = null; f.state.onRotated = null;
    const newer = await f.issuer.refresh(concurrentId, heldRefresh, CLIENT);
    expect(newer.status).toBe(200);
    const [, , newerAccess] = token(newer, "access_token");
    const newerRows = sql.exec(`SELECT row, state FROM oauth_grant WHERE id = ?`, concurrentId).toArray();
    const endedBeforeOld = [...f.state.ended];
    f.state.standing = { status: "inactive", reason: "controller-inactive" }; releaseRotation();
    const olderAnswer = await older;
    expect(olderAnswer.status).toBe(400);
    expect(olderAnswer.body).toEqual({ error: "invalid_grant", error_description: "This attempt committed tokens but returned no token plaintext after a final authority or owner check. The tokens cannot be redisplayed. Do not retry a consumed code or refresh token to recover them; refresh reuse keeps its existing revocation behavior." });
    expect(sql.exec(`SELECT row, state FROM oauth_grant WHERE id = ?`, concurrentId).toArray()).toEqual(newerRows);
    expect(f.access.inspect(concurrentId, newerAccess, RESOURCE)).not.toBeNull();
    expect(f.state.ended).toEqual(endedBeforeOld);
    expect(sql.exec(`SELECT digest FROM oauth_refresh_used WHERE grant_id = ?`, concurrentId).toArray()).toHaveLength(2);

    // Both submissions pass the initial same-secret check before either read
    // returns. After the first mint, the second is genuine reuse, not an old
    // plaintext response. A temporary role answer cannot hide that cause.
    for (const kind of ["code", "refresh"] as const) {
      f.state.standing = { status: "active" };
      const raceCode = await f.issuer.issue("same-secret-" + kind, "@owner" as MemberId, BINDING, "TEST");
      const [, raceId, raceCodeSecret] = token(raceCode, "code");
      let raceSecret = raceCodeSecret;
      if (kind === "refresh") {
        const raceTokens = await f.issuer.exchange(raceId, raceCodeSecret, CLIENT, REDIRECT, VERIFIER);
        [, , raceSecret] = token(raceTokens, "refresh_token");
      }
      const beforeRace = sql.exec(`SELECT row, state FROM oauth_issuer WHERE id = ?`, raceId).toArray();
      const randomBeforeRace = f.state.random;
      let firstReadEntered!: () => void, secondReadEntered!: () => void, rotationReady!: () => void;
      let releaseFirstRead!: () => void, releaseSecondRead!: () => void, releaseRaceRotation!: () => void;
      const firstReadHeld = new Promise<void>(resolve => { firstReadEntered = resolve; });
      const secondReadHeld = new Promise<void>(resolve => { secondReadEntered = resolve; });
      const raceRotationHeld = new Promise<void>(resolve => { rotationReady = resolve; });
      const firstReadRelease = new Promise<void>(resolve => { releaseFirstRead = resolve; });
      const secondReadRelease = new Promise<void>(resolve => { releaseSecondRead = resolve; });
      f.state.rotatedHold = new Promise<void>(resolve => { releaseRaceRotation = resolve; });
      f.state.onRotated = rotationReady;
      const submit = () => kind === "code"
        ? f.issuer.exchange(raceId, raceSecret, CLIENT, REDIRECT, VERIFIER)
        : f.issuer.refresh(raceId, raceSecret, CLIENT);
      f.state.hold = firstReadRelease; f.state.onRead = firstReadEntered;
      const firstSubmission = submit();
      await firstReadHeld;
      f.state.hold = secondReadRelease; f.state.onRead = secondReadEntered;
      const secondSubmission = submit();
      await secondReadHeld;
      let reused: OAuthResult;
      try {
        expect(sql.exec(`SELECT row, state FROM oauth_issuer WHERE id = ?`, raceId).toArray()).toEqual(beforeRace);
        expect(f.state.random).toBe(randomBeforeRace);
        releaseFirstRead(); await raceRotationHeld;
        expect(f.state.random).toBe(randomBeforeRace + 2);
        expect(JSON.parse(String(sql.exec(`SELECT row FROM oauth_issuer WHERE id = ?`, raceId).toArray()[0]!["row"]))).toMatchObject({ codeUsed: true, state: "active" });
        f.state.standing = { status: "inactive", reason: kind === "refresh" ? "role-subset" : "owner-changed" };
        releaseSecondRead(); reused = await secondSubmission;
      } finally {
        releaseFirstRead(); releaseSecondRead(); releaseRaceRotation();
        f.state.hold = null; f.state.onRead = null; f.state.rotatedHold = null; f.state.onRotated = null;
      }
      const olderDisclosure = await firstSubmission;
      expect(reused.body).toEqual({ error: "invalid_grant" });
      expect(olderDisclosure.status).toBe(400);
      expect(olderDisclosure.body).toEqual({ error: "invalid_grant", error_description: "This attempt committed tokens but returned no token plaintext after a final authority or owner check. The tokens cannot be redisplayed. Do not retry a consumed code or refresh token to recover them; refresh reuse keeps its existing revocation behavior." });
      expect(sql.exec(`SELECT state FROM oauth_issuer WHERE id = ?`, raceId).toArray()[0]!["state"]).toBe("ended");
      expect(sql.exec(`SELECT state FROM oauth_grant WHERE id = ?`, raceId).toArray()[0]!["state"]).toBe("ended");
      expect(sql.exec(`SELECT digest FROM oauth_refresh_used WHERE grant_id = ?`, raceId).toArray()).toEqual([]);
      expect(f.state.ended.filter(id => id === raceId)).toHaveLength(1);
      expect(f.state.random).toBe(randomBeforeRace + 2);
    }
  });
});

test("the live-grant bound, registration deadline, code expiry, budget refusal and authority waits preserve durable revocation", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    const f = fixture(sql, state.id.toString());
    f.state.limit = 0;
    await expect(f.issuer.issue("full", "@owner" as MemberId, BINDING, "TEST")).rejects.toMatchObject({ error: "temporarily_unavailable", status: 503 });
    expect(f.used()).toBe(0); expect(sql.exec(`SELECT id FROM oauth_issuer`).toArray()).toHaveLength(0);
    f.state.limit = 16 * 1024 * 1024;
    const grants: { id: string; secret: string }[] = [];
    for (let i = 0; i < 9; i++) {
      let issued: OAuthResult;
      if (i === 8) {
        let enteredEnd!: () => void, releaseEnd!: () => void;
        const ending = new Promise<void>(resolve => { enteredEnd = resolve; });
        f.state.endedHold = new Promise<void>(resolve => { releaseEnd = resolve; }); f.state.onEnded = enteredEnd;
        const readsBeforeEviction = f.state.reads;
        const evicting = f.issuer.issue("bounded-" + i, "@owner" as MemberId, BINDING, "TEST");
        await ending;
        try {
          expect(f.state.reads).toBe(readsBeforeEviction + 1);
          expect(sql.exec(`SELECT state FROM oauth_issuer WHERE id = ?`, grants[0]!.id).toArray()[0]!["state"]).toBe("ended");
          expect(sql.exec(`SELECT state FROM oauth_issuer WHERE op = ?`, "bounded-8").toArray()[0]!["state"]).toBe("pending");
        } finally { releaseEnd(); f.state.endedHold = null; f.state.onEnded = null; }
        issued = await evicting;
        expect(f.state.reads).toBe(readsBeforeEviction + 2);
      } else issued = await f.issuer.issue("bounded-" + i, "@owner" as MemberId, BINDING, "TEST");
      expect(issued.status).toBe(201); const [, id, secret] = token(issued, "code"); grants.push({ id, secret }); f.state.now++;
    }
    expect(f.issuer.list()).toHaveLength(8); expect(f.state.ended).toEqual([grants[0]!.id]);
    const beforeExpired = f.used(); f.state.now = START + 60_010;
    const registrationEnds = f.state.now + 90_000;
    const fresh = await f.issuer.issue("after-expiry", "@owner" as MemberId, BINDING, "TEST", registrationEnds), [, id, code] = token(fresh, "code");
    expect(f.issuer.list()).toHaveLength(1); expect(f.used()).toBeLessThan(beforeExpired);
    expect((await f.issuer.exchange(grants[8]!.id, grants[8]!.secret, CLIENT, REDIRECT, VERIFIER)).body).toEqual({ error: "invalid_grant" });
    f.state.standing = { status: "unavailable" };
    expect((await f.issuer.exchange(id, code, CLIENT, REDIRECT, VERIFIER)).status).toBe(503);
    f.state.standing = { status: "active" };
    let deadline!: () => void, entered!: () => void, late!: () => void;
    const scheduled = new Promise<void>(resolve => { entered = resolve; });
    f.state.hold = new Promise<void>(resolve => { late = resolve; });
    f.ports.deadline = (milliseconds, run) => { expect(milliseconds).toBe(8_000); deadline = run; entered(); return () => {}; };
    const delayed = f.issuer.exchange(id, code, CLIENT, REDIRECT, VERIFIER);
    await scheduled; deadline();
    expect((await delayed).status).toBe(503);
    expect(sql.exec(`SELECT id FROM oauth_grant WHERE id = ?`, id).toArray()).toHaveLength(0);
    late(); f.state.hold = null; delete f.ports.deadline;
    const admitted = await f.issuer.exchange(id, code, CLIENT, REDIRECT, VERIFIER); expect(admitted.status).toBe(200);
    const [, , refresh] = token(admitted, "refresh_token");
    const [, , access] = token(admitted, "access_token");
    expect(f.access.inspect(id, access, RESOURCE)?.grant.ends).toBe(registrationEnds);
    expect(admitted.body["expires_in"]).toBe(90);
    let release!: () => void; f.state.hold = new Promise<void>(resolve => { release = resolve; });
    const waiting = f.issuer.refresh(id, refresh, CLIENT);
    await f.issuer.revokeGrant(id, () => true); release();
    expect((await waiting).body).toEqual({ error: "invalid_grant", error_description: "The credential owner is no longer current. This attempt did not commit tokens." });
    expect(f.issuer.list()).toHaveLength(0);
    expect((await f.issuer.revokeToken(id, refresh, CLIENT)).status).toBe(200);
    expect((await f.issuer.revokeToken("unknown", "unknown", CLIENT)).status).toBe(200);

    const preCode = await f.issuer.issue("subset-before", "@owner" as MemberId, BINDING, "TEST"), [, preId, preSecret] = token(preCode, "code");
    const preRow = sql.exec(`SELECT row FROM oauth_issuer WHERE id = ?`, preId).toArray(), preBudget = f.used(), preRandom = f.state.random;
    f.state.standing = { status: "inactive", reason: "role-subset" };
    expect((await f.issuer.exchange(preId, preSecret, CLIENT, REDIRECT, VERIFIER)).body).toEqual({ error: "invalid_grant", error_description: "The current role exceeds its controller's authority. This attempt did not commit tokens." });
    expect(sql.exec(`SELECT row FROM oauth_issuer WHERE id = ?`, preId).toArray()).toEqual(preRow);
    expect(sql.exec(`SELECT row FROM oauth_grant WHERE id = ?`, preId).toArray()).toEqual([]);
    expect(f.used()).toBe(preBudget); expect(f.state.random).toBe(preRandom);
    f.state.standing = { status: "active" };
    const eligible = await f.issuer.exchange(preId, preSecret, CLIENT, REDIRECT, VERIFIER);
    expect(eligible.status).toBe(200);
    const [, , preRefresh] = token(eligible, "refresh_token");

    // Mint and rotation callback happen before the independent final read.
    let callbackEntered!: () => void, releaseCallback!: () => void;
    const callbackHeld = new Promise<void>(resolve => { callbackEntered = resolve; });
    f.state.onRotated = callbackEntered;
    f.state.rotatedHold = new Promise<void>(resolve => { releaseCallback = resolve; });
    const postStartedReads = f.state.reads;
    const post = f.issuer.refresh(preId, preRefresh, CLIENT);
    await callbackHeld;
    expect(f.state.reads).toBe(postStartedReads + 1);
    const committed = sql.exec(`SELECT row, state FROM oauth_grant WHERE id = ?`, preId).toArray();
    const committedIssuer = sql.exec(`SELECT row, state FROM oauth_issuer WHERE id = ?`, preId).toArray();
    const committedUsed = sql.exec(`SELECT digest, grant_id, created FROM oauth_refresh_used WHERE grant_id = ?`, preId).toArray();
    const committedBudget = f.used();
    let finalEntered!: () => void, releaseFinal!: () => void;
    const finalHeld = new Promise<void>(resolve => { finalEntered = resolve; });
    f.state.hold = new Promise<void>(resolve => { releaseFinal = resolve; }); f.state.onRead = finalEntered;
    releaseCallback(); await finalHeld;
    f.state.standing = { status: "inactive", reason: "role-subset" }; releaseFinal();
    const postResult = await post;
    f.state.hold = null; f.state.onRead = null; f.state.rotatedHold = null; f.state.onRotated = null;
    expect(postResult.status).toBe(400);
    expect(postResult.body).toEqual({ error: "invalid_grant", error_description: "This attempt committed tokens but returned no token plaintext after a final authority or owner check. The tokens cannot be redisplayed. Do not retry a consumed code or refresh token to recover them; refresh reuse keeps its existing revocation behavior." });
    expect(sql.exec(`SELECT row, state FROM oauth_grant WHERE id = ?`, preId).toArray()).toEqual(committed);
    expect(sql.exec(`SELECT row, state FROM oauth_issuer WHERE id = ?`, preId).toArray()).toEqual(committedIssuer);
    expect(sql.exec(`SELECT digest, grant_id, created FROM oauth_refresh_used WHERE grant_id = ?`, preId).toArray()).toEqual(committedUsed);
    expect(f.used()).toBe(committedBudget); expect(f.state.ended).not.toContain(preId);
    // The old refresh was consumed. Narrowing cannot recover the withheld pair;
    // repeating it keeps the separate existing reuse-revocation consequence.
    f.state.standing = { status: "active" };
    expect((await f.issuer.refresh(preId, preRefresh, CLIENT)).body).toEqual({ error: "invalid_grant" });
    expect(sql.exec(`SELECT state FROM oauth_issuer WHERE id = ?`, preId).toArray()[0]!["state"]).toBe("ended");

    // A caller-control replacement during the final issue read cannot receive
    // the code or make another row, and replay remains the original receipt.
    const ownerReads = f.state.reads;
    let ownerEntered!: () => void, releaseOwner!: () => void;
    const ownerHeld = new Promise<void>(resolve => { ownerEntered = resolve; });
    const ownerRelease = new Promise<void>(resolve => { releaseOwner = resolve; });
    f.state.onRead = () => { if (f.state.reads === ownerReads + 2) { f.state.hold = ownerRelease; ownerEntered(); } };
    const replaced = f.issuer.issue("owner-replaced", "@owner" as MemberId, BINDING, "TEST");
    await ownerHeld; f.state.owner = "replacement"; releaseOwner();
    const replacedResult = await replaced; f.state.onRead = null; f.state.hold = null;
    expect(replacedResult.status).toBe(409);
    expect(replacedResult.body).toMatchObject({ error: "op", rule: "stale", codeShown: true });
    expect(replacedResult.body).not.toHaveProperty("code");
    expect(sql.exec(`SELECT id FROM oauth_issuer WHERE op = ?`, "owner-replaced").toArray()).toHaveLength(1);

    const clockCode = await f.issuer.issue("clock-after", "@owner" as MemberId, BINDING, "TEST"), [, clockId, clockSecret] = token(clockCode, "code");
    let clockEntered!: () => void, releaseClock!: () => void;
    const clockHeld = new Promise<void>(resolve => { clockEntered = resolve; });
    f.state.onRotated = clockEntered; f.state.rotatedHold = new Promise<void>(resolve => { releaseClock = resolve; });
    const clockExchange = f.issuer.exchange(clockId, clockSecret, CLIENT, REDIRECT, VERIFIER);
    await clockHeld; const mintedAt = f.state.now; f.state.now--; releaseClock();
    const clockAnswer = await clockExchange;
    f.state.now = mintedAt; f.state.onRotated = null; f.state.rotatedHold = null;
    expect(clockAnswer.status).toBe(503);
    expect(clockAnswer.body).not.toHaveProperty("access_token"); expect(clockAnswer.body).not.toHaveProperty("refresh_token");
    expect(JSON.parse(String(sql.exec(`SELECT row FROM oauth_issuer WHERE id = ?`, clockId).toArray()[0]!["row"]))).toMatchObject({ codeUsed: true, state: "active" });

    // Real issuer fan-out commits all ends first. A held callback must not start
    // another callback after the actual Agent owner changes (callbacks are stand-ins).
    await f.issuer.issue("fanout-first", "@owner" as MemberId, BINDING, "TEST");
    await f.issuer.issue("fanout-second", "@owner" as MemberId, BINDING, "TEST");
    let notificationEntered!: () => void, notificationRelease!: () => void;
    const notificationHeld = new Promise<void>(resolve => { notificationEntered = resolve; });
    f.state.onEnded = notificationEntered;
    f.state.endedHold = new Promise<void>(resolve => { notificationRelease = resolve; });
    const notifiedBefore = f.state.ended.length, originalConfig = f.identity.configuration;
    const ending = f.issuer.revokeAll(() => true);
    const stoppedEnding = expect(ending).rejects.toMatchObject({ error: "temporarily_unavailable", status: 503 });
    await notificationHeld;
    const committedEnds = sql.exec(`SELECT id, row, state FROM oauth_issuer ORDER BY id`).toArray();
    expect(sql.exec(`SELECT id FROM oauth_issuer WHERE state IN ('pending','active')`).toArray()).toEqual([]);
    expect(f.state.ended.length).toBe(notifiedBefore + 1);
    f.identity.configuration = canonicalize({ service: RESOURCE, replacement: true });
    notificationRelease();
    try {
      await stoppedEnding;
      expect(f.state.ended.length).toBe(notifiedBefore + 1); // The second callback never borrowed the replacement owner.
      expect(sql.exec(`SELECT id, row, state FROM oauth_issuer ORDER BY id`).toArray()).toEqual(committedEnds);
    } finally {
      notificationRelease(); f.state.onEnded = null; f.state.endedHold = null; f.identity.configuration = originalConfig;
    }

    // Expiring an older code and minting its replacement happen in one real
    // transaction. A stopped notification cannot turn that into a pre-mint error.
    const postCode = "This attempt committed a one-shot credential but returned no credential plaintext. Its retained receipt cannot redisplay the secret. Do not expect a later role change or same-operation replay to recover it.";
    const postTokens = "This attempt committed tokens but returned no token plaintext after a final authority or owner check. The tokens cannot be redisplayed. Do not retry a consumed code or refresh token to recover them; refresh reuse keeps its existing revocation behavior.";
    f.state.standing = { status: "active" };
    const expiring = await f.issuer.issue("notification-expiring", "@owner" as MemberId, BINDING, "TEST");
    const [, expiringId] = token(expiring, "code");
    f.state.now = JSON.parse(String(sql.exec(`SELECT row FROM oauth_issuer WHERE id = ?`, expiringId).toArray()[0]!["row"])).codeExpires + 1;
    let mintedNotificationEntered!: () => void, mintedNotificationRelease!: () => void;
    const mintedNotificationHeld = new Promise<void>(resolve => { mintedNotificationEntered = resolve; });
    f.state.onEnded = mintedNotificationEntered;
    f.state.endedHold = new Promise<void>(resolve => { mintedNotificationRelease = resolve; });
    const mintingWithCleanup = f.issuer.issue("notification-minted", "@owner" as MemberId, BINDING, "TEST");
    await mintedNotificationHeld;
    const mintedRows = sql.exec(`SELECT id, op, row, state, created FROM oauth_issuer WHERE op = ?`, "notification-minted").toArray();
    expect(mintedRows).toHaveLength(1); expect(mintedRows[0]!["state"]).toBe("pending");
    const randomAfterNotificationMint = f.state.random;
    f.identity.configuration = canonicalize({ service: RESOURCE, replacement: "notification" });
    mintedNotificationRelease();
    try {
      const withheld = await mintingWithCleanup;
      expect([withheld.status, withheld.body]).toEqual([409, { error: "op", rule: "stale", agent: state.id.toString(),
        grant: mintedRows[0]!["id"], codeShown: true, state_digest: BINDING.state_digest, next: postCode }]);
      expect(sql.exec(`SELECT id, op, row, state, created FROM oauth_issuer WHERE op = ?`, "notification-minted").toArray()).toEqual(mintedRows);
      expect(f.state.random).toBe(randomAfterNotificationMint);
    } finally {
      mintedNotificationRelease(); f.state.onEnded = null; f.state.endedHold = null; f.identity.configuration = originalConfig;
    }
    const replayAfterNotification = await f.issuer.issue("notification-minted", "@owner" as MemberId, BINDING, "TEST");
    expect(replayAfterNotification.body).toEqual({ agent: state.id.toString(), grant: mintedRows[0]!["id"], codeShown: true, state_digest: BINDING.state_digest });
    expect(f.state.random).toBe(randomAfterNotificationMint);

    // An actual callback refusal with an unchanged owner must still withhold,
    // even though a fresh role read alone would permit disclosure.
    f.state.now = JSON.parse(String(mintedRows[0]!["row"])).codeExpires + 1;
    f.state.onEnded = () => { throw Error("TEST notification refused after the mint"); };
    let refusedNotification: OAuthResult;
    try { refusedNotification = await f.issuer.issue("notification-refused", "@owner" as MemberId, BINDING, "TEST"); }
    finally { f.state.onEnded = null; }
    const refusedRows = sql.exec(`SELECT id, op, row, state, created FROM oauth_issuer WHERE op = ?`, "notification-refused").toArray();
    expect(refusedRows).toHaveLength(1); expect(refusedRows[0]!["state"]).toBe("pending");
    expect([refusedNotification.status, refusedNotification.body]).toEqual([503, { error: "temporarily_unavailable", agent: state.id.toString(),
      grant: refusedRows[0]!["id"], codeShown: true, state_digest: BINDING.state_digest, next: postCode }]);

    // A post-disclosure-check end also keeps its already-withheld code/token
    // contract when its own notification stops. There is no rollback or remint.
    for (const mode of ["code", "tokens"] as const) {
      f.state.standing = { status: "active" };
      let codeId = "", codeSecret = "";
      if (mode === "tokens") {
        const issuedForTokens = await f.issuer.issue("notification-end-tokens", "@owner" as MemberId, BINDING, "TEST");
        [, codeId, codeSecret] = token(issuedForTokens, "code");
      }
      const initialReads = f.state.reads;
      f.state.onRead = () => { if (f.state.reads === initialReads + 2) f.state.standing = { status: "inactive", reason: "controller-inactive" }; };
      let endEntered!: () => void, endRelease!: () => void;
      const endHeld = new Promise<void>(resolve => { endEntered = resolve; });
      f.state.onEnded = endEntered;
      f.state.endedHold = new Promise<void>(resolve => { endRelease = resolve; });
      const endingDisclosure = mode === "code"
        ? f.issuer.issue("notification-end-code", "@owner" as MemberId, BINDING, "TEST")
        : f.issuer.exchange(codeId, codeSecret, CLIENT, REDIRECT, VERIFIER);
      await endHeld;
      const endedRows = sql.exec(`SELECT id, op, row, state, created FROM oauth_issuer WHERE op = ?`, "notification-end-" + mode).toArray();
      expect(endedRows).toHaveLength(1); expect(endedRows[0]!["state"]).toBe("ended");
      const randomAfterEnd = f.state.random;
      f.identity.configuration = canonicalize({ service: RESOURCE, replacement: "post-end-" + mode });
      endRelease();
      try {
        const withheld = await endingDisclosure;
        expect([withheld.status, withheld.body]).toEqual(mode === "code"
          ? [403, { error: "unauthorized", rule: "controller-role", agent: state.id.toString(), grant: endedRows[0]!["id"], codeShown: true,
              state_digest: BINDING.state_digest, next: postCode }]
          : [400, { error: "invalid_grant", error_description: postTokens }]);
        expect(sql.exec(`SELECT id, op, row, state, created FROM oauth_issuer WHERE op = ?`, "notification-end-" + mode).toArray()).toEqual(endedRows);
        expect(f.state.random).toBe(randomAfterEnd);
        if (mode === "tokens") {
          expect(JSON.parse(String(endedRows[0]!["row"]))).toMatchObject({ codeUsed: true, refreshDigest: null, state: "ended" });
          expect(sql.exec(`SELECT state FROM oauth_grant WHERE id = ?`, codeId).toArray()).toEqual([{ state: "ended" }]);
        }
      } finally {
        endRelease(); f.state.onRead = null; f.state.onEnded = null; f.state.endedHold = null;
        f.state.standing = { status: "active" }; f.identity.configuration = originalConfig;
      }
    }
  });
});
