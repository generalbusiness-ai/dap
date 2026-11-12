/** HostedAgent, its HTTP decoders and custody use real Node SQLite. The scope,
 * authority and retained-row barrier are explicit wire stand-ins. The barrier
 * decodes the production minimum codec and models only the retained full-hash
 * refusal already covered by Native read-minimum tests. This proves hosted
 * classification and custody, not Native judgment, authority, waits or floors. */
import { DatabaseSync } from "node:sqlite";
import { expect, test } from "vitest";
import type { ControlRequest, Input, Receipt, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, readMinimumParameter, signControlWith, textDigest, timeOf, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { encodeAgentKeyInvitation, httpTransport, secretSigner, signedIntent, type AgentKeyInvitation, type Fetch } from "@generalbusiness/dap-client";
import { HostedAgent, type AgentPorts } from "../src/hosted.ts";
import { RETIRED_STORE_STOP } from "../src/hosted-store-stop.ts";
import { enrolledKeyItem, retirementBody } from "../src/hosted-retirement.ts";
import { identityId, type Identity } from "../src/custody.ts";
import { sqliteStore, type Sql, type SqlValue } from "../src/sqlite-custody.ts";
import { StandIn, SERVICE } from "./support/standin.ts";

/** The SQLite adapter used by sqlite-custody.test.ts, including PRAGMA reads
 * for HostedAgent's actual schema migration. Every instance owns its database. */
function nodeSql(): Sql & { db: DatabaseSync } {
  const db = new DatabaseSync(":memory:");
  let depth = 0;
  return {
    db,
    exec(query, ...bindings) {
      const statement = db.prepare(query);
      const values = bindings.map(value => value instanceof ArrayBuffer ? new Uint8Array(value) : value) as never[];
      const rows = /^\s*(SELECT|PRAGMA)\b/i.test(query) ? statement.all(...values) : (statement.run(...values), []);
      return { toArray: () => rows as Record<string, SqlValue>[] };
    },
    transaction(closure) {
      if (depth > 0) return closure();
      db.exec("BEGIN"); depth++;
      try { const result = closure(); db.exec("COMMIT"); return result; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
      finally { depth--; }
    },
  };
}

const NOW = Date.parse("2099-01-01T00:00:00Z");
const OP = "hosted-enrol-readback";

test.each([
  { fault: "retained-hash", status: 409 },
  { fault: "signed-input", status: 409 },
  { fault: "none", status: 201 },
] as const)("hosted enrollment classifies $fault readback with retained SQLite custody", async ({ fault, status }) => {
  const sql = nodeSql();
  const agentSigner = secretSigner(new Uint8Array(32).fill(23));
  const owner = secretSigner(new Uint8Array(32).fill(11));
  const peer = new StandIn(agentSigner.key);
  const membership = peer.scopes.get(peer.membership.scope)!;
  const transport = httpTransport(SERVICE, { fetch: peer.fetch });
  let agent: HostedAgent | null = null;
  try {
    // Chronological signed fixture entries, not Native membership admission.
    const member = await transport.submit(peer.membership.scope, await signedIntent(owner,
      { to: peer.membership, kind: "add-member", on: 0, fields: { handle: "@bot", kind: "agent", controller: "@owner" } },
      { idempotencyKey: "fixture-member", now: NOW }), []);
    const invitation = await transport.submit(peer.membership.scope, await signedIntent(owner,
      { to: peer.membership, kind: "invite-key", on: 0, fields: { member: 1, kind: "agent" } },
      { idempotencyKey: "fixture-invitation", now: NOW }), []);
    expect(member.answer).toBe("accepted");
    expect(invitation.answer).toBe("accepted");
    if (member.answer !== "accepted" || invitation.answer !== "accepted") return;
    const link: AgentKeyInvitation = {
      v: 1, kind: "agent-key", service: SERVICE,
      repository: { directory: peer.directory, membership: peer.membership, rules: peer.rules.scope, destination: peer.destination.scope },
      definition: "platform:membership@2", handle: "@bot",
      controller: { membership: peer.membership, member: "@owner" },
      member: member.receipt.fact, invitation: invitation.receipt.fact,
      secret: b64url(new Uint8Array(32).fill(31)), expected: { on: 1, member: 1 },
    };
    const sent: { signed?: SignedIntent; receipt?: Receipt } = {};
    let dispatches = 0, entryReads = 0, randomCalls = 0;
    const postedActs: string[] = [];
    peer.answers.set("enrol", signed => {
      sent.signed = signed; dispatches++;
      // The signature fault changes only retained signed bytes. Its hash and
      // the receipt agree, so only HostedAgent's own input comparison can fail.
      const retained = fault === "signed-input" ? { ...signed, sig: b64url(new Uint8Array(64).fill(99)) } : signed;
      const sealed = peer.append(membership, { type: "act", signed: retained, authority: [], presented: {} } as Input);
      const receipt = peer.receipt(membership, sealed);
      const admitted = fault === "retained-hash" ? { ...receipt, fact: { ...receipt.fact, hash: textDigest("wrong accepted receipt hash") } } : receipt;
      sent.receipt = admitted;
      return { answer: "accepted", receipt: admitted };
    });
    const fetch: Fetch = async (url, init) => {
      const parsed = new URL(url);
      // Record attempts before delegating. The stand-in still receives the
      // original request, including a revoke that the old catch would send.
      if (parsed.pathname === `/v1/scopes/${peer.membership.scope}/acts` && init?.method === "POST") {
        postedActs.push(typeof init.body === "string" ? init.body : "");
      }
      if (parsed.pathname.startsWith(`/v1/scopes/${peer.membership.scope}/entries/`)) {
        entryReads++;
        const minimum = readMinimumParameter(parsed.searchParams.get("atLeast"));
        if (minimum && typeof minimum.head !== "number" && membership.entries[minimum.head.seq]?.hash !== minimum.head.hash) {
          // Explicit wire stand-in for the real retained full-head barrier.
          // No wait or authorization behavior is inferred from this reply.
          return new Response(JSON.stringify({ ok: false, reason: "unavailable" }));
        }
      }
      return peer.fetch(url, init);
    };
    const ports: AgentPorts = {
      id: "a".repeat(64), fetch, now: () => NOW,
      random: bytes => { randomCalls++; return new Uint8Array(bytes).fill(23); },
      observe: async () => ({ keyState: "active", memberState: "active", member: "@bot", actions: [], controller: "@owner" }),
    };
    // The registry's control authorization is outside this constructor seam.
    const body = JSON.stringify({ link: encodeAgentKeyInvitation(link) });
    const request: ControlRequest = { v: 1, action: "create", service: SERVICE, membership: peer.membership, agent: null,
      actor: owner.key, body: digestBytes(utf8(body)), op: OP, notAfter: timeOf(NOW + 60_000) };
    agent = new HostedAgent(sql, ports);
    const result = await agent.create(OP, request, link);
    expect(result.status).toBe(status);
    if (fault !== "none") expect(result.body).toEqual({ error: "enrol", rule: "entry" });
    else expect(result.body["bearer"]).toEqual(expect.any(String));
    expect(dispatches).toBe(1);
    expect(entryReads).toBe(1);
    expect(randomCalls).toBe(fault === "none" ? 2 : 1);
    expect(agent.durable()).toMatchObject({ state: fault === "none" ? "enrolled" : "enrolling", bearer: fault === "none" });
    const identity: Identity = { service: SERVICE, membership: peer.membership, signer: agentSigner.key, target: peer.membership, key: `enrol:${OP}` };
    const store = sqliteStore(sql, undefined, () => NOW);
    const record = await store.read(identityId(identity));
    expect(record).toMatchObject({ phase: "accepted", attempt: 1, count: 1 });
    expect(record!.envelope.signed).toEqual(sent.signed);
    expect(verifySignedIntent(record!.envelope.signed)).toBe(true);
    expect(record!.outcomes).toMatchObject([{ attempt: 1, answer: { answer: "accepted", receipt: sent.receipt } }]);
    expect(agent.custodyOf(`enrol:${OP}`)?.intent).toBe(digestBytes(utf8(canonicalize(record!.envelope.signed.intent))));
    const finalEntry = membership.entries.at(-1)!;
    if (fault === "retained-hash") expect(finalEntry.hash).not.toBe(sent.receipt?.fact.hash);
    if (fault === "signed-input") {
      expect(finalEntry.hash).toBe(sent.receipt?.fact.hash);
      expect(finalEntry.entry.input.type).toBe("act");
      if (finalEntry.entry.input.type === "act") {
        expect(finalEntry.entry.input.signed.intent).toEqual(record!.envelope.signed.intent);
        expect(canonicalize(finalEntry.entry.input.signed)).not.toBe(canonicalize(record!.envelope.signed));
      }
    }
    // Reopening the object reads the accepted original. It sends no replacement
    // and neither mismatch can mint a bearer on an explicit repeated call.
    agent.abrupt();
    agent = new HostedAgent(sql, ports);
    const repeated = await agent.create(OP, request, link);
    expect(repeated.status).toBe(status);
    expect(dispatches).toBe(1);
    expect(await store.read(identityId(identity))).toEqual(record);
    expect(agent.durable().bearer).toBe(fault === "none");
    if (fault !== "none") expect(sql.exec("SELECT bearer, answer FROM agent WHERE id = 1").toArray()[0]).toMatchObject({ bearer: null, answer: null });
    else expect(repeated.body).toMatchObject({ bearerShown: true });

    if (fault === "none") {
      // This accepted original is the real fallback prerequisite. A missing
      // custody target or an invalid revoke must not explain zero posts.
      const revoke = await signedIntent(owner, { to: peer.membership, kind: "revoke-key",
        on: invitation.receipt.fact.seq, fields: { as: "retired" } }, { idempotencyKey: `${OP}-revoke`, now: NOW });
      const retireBytes = utf8(canonicalize({ revoke }));
      expect(verifySignedIntent(revoke)).toBe(true);
      expect(retirementBody(retireBytes, peer.membership, owner.key)).toEqual({ valid: true, revoke });
      expect(enrolledKeyItem(record, identity)).toBe(revoke.intent.on);
      expect(await store.read(identityId(identity))).toEqual(record);
      const retirement = await signControlWith({ ...request, action: "retire", agent: ports.id,
        op: `${OP}-late-retire`, body: digestBytes(retireBytes) }, owner);
      const originalObserve = ports.observe;
      type ReadMode = "retired-stop" | "error" | "active" | "missing" | "retired" | "compromised";
      let readMode: ReadMode = "retired-stop", authorityReads = 0;
      const keyReads: unknown[] = [];
      let enter!: () => void, release!: () => void;
      const entered = new Promise<void>(resolve => { enter = resolve; });
      const waiting = new Promise<void>(resolve => { release = resolve; });
      const ordinaryError = new Error("TEST observation failed after shutdown");
      ports.observe = async (at, asked) => {
        if ("key" in asked && asked.key === owner.key) {
          authorityReads++;
          return { keyState: "active", memberState: "active", member: "@owner", actions: ["membership.manage"], controller: null };
        }
        // Only the agent-key read is held. Owner authority above remains
        // fresh. This is a labelled port fault, not a mutated format word.
        keyReads.push({ at, asked });
        if (readMode === "retired-stop") { enter(); await waiting; throw RETIRED_STORE_STOP; }
        if (readMode === "error") throw ordinaryError;
        if (readMode === "missing") return null;
        return { keyState: readMode, memberState: "active", member: "@bot", actions: [], controller: "@owner" };
      };
      try {
        const postsBefore = postedActs.length;
        expect(postsBefore).toBe(1);
        let failure: unknown, returned: unknown;
        const settled = agent.control(retirement, "retire", retireBytes).then(
          value => { returned = value; }, failed => { failure = failed; });
        try {
          // An earlier refusal must fail immediately, not hang on the gate.
          expect(await Promise.race([entered.then(() => true), settled.then(() => false)])).toBe(true);
          expect(authorityReads).toBe(1);
          expect(keyReads).toEqual([{ at: peer.membership, asked: { key: agentSigner.key } }]);
          expect(sql.exec("SELECT state, length(seed) AS seedBytes, bearer FROM agent WHERE id = 1").toArray())
            .toEqual([{ state: "retired", seedBytes: 0, bearer: null }]);
          expect(sql.exec("SELECT state, answer FROM control WHERE op = ?", retirement.request.op).toArray())
            .toEqual([{ state: "pending", answer: null }]);
          expect(sql.exec("SELECT revoke FROM agent_retirement WHERE id = 1").toArray())
            .toEqual([{ revoke: canonicalize(revoke) }]);
          expect(postedActs).toHaveLength(postsBefore);
        } finally { release(); await settled; }
        expect(returned).toBeUndefined();
        expect(failure).toBe(RETIRED_STORE_STOP);
        expect(postedActs).toHaveLength(postsBefore);
        expect(sql.exec("SELECT state FROM control WHERE op = ?", retirement.request.op).toArray())
          .toEqual([{ state: "pending" }]);
        expect(agent.durable()).toMatchObject({ state: "retired", bearer: false });
        expect(await store.read(identityId(identity))).toEqual(record);

        // A normal rejected read still reaches the original valid revoke.
        // This comparator fails if zero posts came from unrelated bad input.
        readMode = "error";
        const ordinary = await agent.control(retirement, "retire", retireBytes);
        expect(ordinary.status).toBe(202);
        expect(ordinary.body).toMatchObject({ retired: false, endpointDisabled: true, seedErased: true,
          pending: true, reason: "revocation-unobserved" });
        expect(postedActs).toHaveLength(postsBefore + 1);
        expect(JSON.parse(postedActs.at(-1)!)).toMatchObject({ signed: revoke });
        expect(keyReads.slice(1)).toEqual([
          { at: peer.membership, asked: { key: agentSigner.key } },
          { at: peer.membership, asked: { key: agentSigner.key } },
        ]);

        // Ordinary key values keep their old no-confirmation/confirmation
        // distinction. Replays reuse the same retained revoke and identity.
        for (const mode of ["active", "missing", "retired", "compromised"] as const) {
          readMode = mode;
          const beforePosts = postedActs.length;
          const answer = await agent.control(retirement, "retire", retireBytes);
          const confirmed = mode === "retired" || mode === "compromised";
          expect(answer.status).toBe(confirmed ? 200 : 202);
          expect(answer.body).toMatchObject({ retired: confirmed, endpointDisabled: true, seedErased: true });
          expect(postedActs.length - beforePosts).toBe(confirmed ? 0 : 1);
        }
        expect(await store.read(identityId(identity))).toEqual(record);
      } finally { release(); ports.observe = originalObserve; }
    }
  } finally { agent?.abrupt(); sql.db.close(); }
});
