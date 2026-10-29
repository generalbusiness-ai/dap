/** Native workerd scheduling, not physical celld cadence or idle CPU.
 * PlatformScope keeps its scripted clock, historical creation allowlist and
 * inspector reads. Membership authority, cohort rules, transport, callbacks,
 * SQLite and getAlarm are real. Host-none opens no provider work: no
 * OutsideDouble, scripted acknowledgments or test authority is installed. */
import { env } from "cloudflare:workers";
import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { ScopeId } from "@generalbusiness/dap-contract";
import { b64url, intentDigest, isSeed, scopeIdOf, signIntent, timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { invitationIssueFields } from "@generalbusiness/dap-client";
import { UNPUBLISHED_COHORT as C, platform } from "@generalbusiness/dap-platform";
import { SCOPE_INDEX_NAME } from "../src/scope-index.ts";
import { rita, sam, type Platform } from "./repository.ts";
import { reader } from "./support.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { drainScheduledFixture, nativeFixtureLifetime } from "./support/native-fixture-lifetime.ts";
import { StartupOwner } from "./support/serving-startup.ts";

test("a confirmed native host-none room stays unarmed across reads and eviction; one real invitation deadline arms only Membership until its timed end", async () => {
  // Reuse the callback owner, including its finite join-before-release hook.
  // An incomplete join retains ownership and fails; a timeout is no cancellation.
  const owner = new StartupOwner(env.SCOPE_INDEX);
  const life = nativeFixtureLifetime(beginSessionFixture({
    secret: "TEST idle room session secret longer than 32 bytes", sessions: true, inspector: reader,
  }), { required: false, finish: "external" });
  owner.attach(life, () => {});
  let calls = 0;
  const wait = <T>(action: () => Promise<T>): Promise<T> => {
    if (++calls > 4096) throw Error("Idle witness exceeded 4096 native actions; quiescence unknown");
    return owner.wait(() => life.wait(action));
  };
  const nodes = (): readonly Platform[] => {
    const found = life.platforms();
    if (found.length > 16) throw Error("Idle witness exceeded 16 journal owners; discovery incomplete");
    return found;
  };

  // Follow every actual retained create send, rather than guessing five room
  // siblings or forgetting the inbox created by Membership's seat act.
  const discover = async (): Promise<boolean> => {
    let added = false;
    for (const node of nodes()) {
      const targets = await wait(() => runInDurableObject(node.object, (_instance, state) =>
        state.storage.sql.exec<{ target: string | null }>(`SELECT CASE WHEN octet_length(target)<=4096 THEN target END AS target
          FROM outbox WHERE class='request' AND json_extract(message,'$.type')='create' ORDER BY seq,n LIMIT 17`).toArray()));
      if (targets.length > 16) throw Error("Idle witness create-send bound exceeded");
      for (const { target } of targets) {
        const seed: unknown = target === null ? null : JSON.parse(target);
        if (!isSeed(seed) || seed.creator?.scope !== node.name) throw Error("Idle witness has no bounded native child seed");
        const id = scopeIdOf(seed);
        if (!nodes().some(known => known.name === id)) {
          if (nodes().length === 16) throw Error("Idle witness journal discovery exhausted its bound");
          life.platform(id); added = true;
        }
      }
    }
    return added;
  };

  const snapshot = async (node: Platform) => {
    // Read-only SQL: no store constructor/migration, retained body or credential
    // plaintext read. Independently enumerate live timed targets as well as meta.
    return wait(() => runInDurableObject(node.object, async (_instance, state) => {
      const sql = state.storage.sql;
      const count = (query: string): number => sql.exec<{ n: number }>(query).one().n;
      const meta = (key: string): string | null => sql.exec<{ v: string }>("SELECT v FROM meta WHERE k=?", key).toArray()[0]?.v ?? null;
      const scope = sql.exec<{ scope: string; inc: string; kind: string; status: string; head: number; hash: string; held: number }>(`SELECT
        json_extract(v,'$.at.scope') AS scope,json_extract(v,'$.at.inc') AS inc,json_extract(v,'$.at.kind') AS kind,
        json_extract(v,'$.status') AS status,json_extract(v,'$.head.seq') AS head,json_extract(v,'$.head.hash') AS hash,
        json_array_length(v,'$.held') AS held FROM meta WHERE k='scope'`).one();
      const genesis = sql.exec<{ decision: string; seed: string; controls: number }>(`SELECT json_extract(bytes,'$.input.decision') AS decision,
        json_extract(bytes,'$.input.seed') AS seed,(SELECT count(*) FROM entry WHERE json_extract(bytes,'$.input.type')='delivery'
        AND json_extract(bytes,'$.input.message.class')='control') AS controls FROM entry WHERE seq=0`).one();
      const seed: unknown = JSON.parse(genesis.seed);
      if (!isSeed(seed) || scopeIdOf(seed) !== node.name || scope.scope !== node.name || scope.kind !== seed.kind)
        throw Error("Idle witness genesis does not bind its discovered owner");
      const definition = platform(seed.definition);
      if (!definition) throw Error("Idle witness encountered an unknown native pin");
      const outbox = sql.exec<{ total: number; pending: number; held: number; requests: number; next: number | null }>(`SELECT count(*) AS total,
        count(CASE WHEN held=0 AND ack IS NULL AND result IS NULL AND diagnosis IS NULL THEN 1 END) AS pending,
        count(CASE WHEN held<>0 THEN 1 END) AS held,
        count(CASE WHEN request IS NOT NULL AND result IS NULL AND diagnosis IS NULL THEN 1 END) AS requests,
        min(CASE WHEN held=0 AND ack IS NULL AND result IS NULL AND diagnosis IS NULL THEN next END) AS next FROM outbox`).one();
      const timers: { rule: string; item: number; due: string }[] = [];
      for (const [name, rule] of Object.entries(definition.data.timed)) {
        const items = sql.exec<{ id: number; due: string }>(`SELECT id,json_extract(record,?) AS due FROM item
          WHERE type=? AND state IN (${rule.states.map(() => "?").join(",")}) ORDER BY id LIMIT 129`,
        `$.values.${rule.deadline}`, rule.on, ...rule.states).toArray();
        if (items.length > 128) throw Error("Idle witness timed-item bound exceeded");
        for (const item of items) {
          if (timeMs(item.due) === null) throw Error("Idle witness timed target has no valid deadline");
          timers.push({ rule: name, item: item.id, due: item.due });
        }
      }
      return {
        scope: node.name, inc: scope.inc, kind: seed.kind, pin: seed.definition, headHash: scope.hash,
        status: scope.status, head: scope.head, heldGenesis: scope.held, genesis: genesis.decision,
        creator: seed.creator?.scope ?? null, controls: genesis.controls, outbox, timers,
        operations: count("SELECT count(*) AS n FROM operation WHERE opened+unknown+unopened>0"),
        attempts: count("SELECT count(*) AS n FROM attempt WHERE outcome IS NULL"),
        nextSend: sql.exec<{ next: number | null }>("SELECT min(next) AS next FROM attempt WHERE outcome IS NULL").one().next,
        deadline: meta("deadline"), maintenance: meta("signer-maintenance"),
        signer: sql.exec<{ phase: string }>("SELECT json_extract(value,'$.phase') AS phase FROM local_signer_control WHERE id=1").toArray()[0]?.phase ?? null,
        archiveRows: count("SELECT count(*) AS n FROM meta WHERE k IN ('archive-row-1','archive-wake-1','archive-restart-1')"),
        credentialRows: count("SELECT count(*) AS n FROM private_credential"),
        expiryRows: count("SELECT count(*) AS n FROM private_credential_expiry"),
        credentialBackfill: sql.exec<{ done: number }>("SELECT done FROM private_credential_expiry_backfill WHERE singleton=1").one().done,
        revocations: count("SELECT count(*) AS n FROM private_credential_revocation WHERE done=0"),
        alarm: await state.storage.getAlarm(),
      };
    }));
  };
  type Snapshot = Awaited<ReturnType<typeof snapshot>>;
  const index = env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME));
  const indexSnapshot = () => wait(() => runInDurableObject(index, async (_instance, state) => {
    const exists = state.storage.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='private_site_token'").toArray().length === 1;
    return { owner: SCOPE_INDEX_NAME, siteRows: exists ? state.storage.sql.exec<{ n: number }>("SELECT count(*) AS n FROM private_site_token").one().n : 0,
      siteWake: exists ? state.storage.sql.exec<{ next: number | null }>("SELECT min(ends) AS next FROM private_site_token").one().next : null,
      alarm: await state.storage.getAlarm() };
  }));
  const observe = async (phase: string): Promise<Snapshot[]> => {
    // Normal reads may own actual callbacks. Join them before storage reads.
    for (const node of nodes()) {
      const summary = await wait(() => node.stub.summary(reader));
      if (!summary.ok || !summary.complete) throw Error("Idle witness summary unavailable or incomplete");
    }
    await owner.quiesce();
    for (const node of nodes()) {
      const joined = await wait(() => (node.stub as unknown as { awaitScheduledCallbacks(): Promise<{ callbacks: number }> }).awaitScheduledCallbacks());
      expect(joined.callbacks).toBe(0);
    }
    const result: Snapshot[] = [];
    for (const node of nodes()) result.push(await snapshot(node));
    await owner.quiesce();
    const fixed = await indexSnapshot();
    expect(fixed).toEqual({ owner: SCOPE_INDEX_NAME, siteRows: 0, siteWake: null, alarm: null });
    console.info("idle-alarm-metadata", { phase, calls, ownedCallbacks: 0, journals: result, index: fixed });
    return result;
  };
  const settled = async (creationRetries = false): Promise<void> => {
    const began = life.now(); let retries = 0;
    for (let round = 0; round < 64; round++) {
      const added = await discover();
      await drainScheduledFixture(nodes, wait);
      if (await discover() || added) continue;
      const current: Snapshot[] = [];
      for (const node of nodes()) current.push(await snapshot(node));
      if (current.every(row => row.status === "active" && !row.outbox.pending && !row.outbox.held && !row.outbox.requests
        && !row.operations && !row.attempts)) { await owner.quiesce(); return; }
      // Real retained confirmation retries only, under the existing inbox
      // fixture's four-round/eight-second clock budget. No fabricated ack.
      const next = current.filter(row => row.outbox.next !== null && row.outbox.next > life.now()
        && row.alarm === row.outbox.next).map(row => row.outbox.next!).sort((a, b) => a - b)[0];
      if (!creationRetries || retries++ >= 3 || next === undefined || next - began > 8000)
        throw Error("Native room did not settle inside its protocol budget; quiescence unknown");
      life.advance(next - life.now());
    }
    throw Error("Idle witness exceeded 64 discovery/settlement rounds");
  };
  const assertQuiet = (rows: readonly Snapshot[], timer?: { scope: ScopeId; item: number; due: string }): void => {
    for (const row of rows) {
      expect({ status: row.status, genesis: row.genesis, heldGenesis: row.heldGenesis, controls: row.controls })
        .toEqual({ status: "active", genesis: "applied", heldGenesis: 0, controls: row.creator === null ? 0 : 1 });
      expect({ pending: row.outbox.pending, held: row.outbox.held, requests: row.outbox.requests,
        operations: row.operations, attempts: row.attempts, nextSend: row.nextSend, dispatch: row.outbox.next,
        maintenance: row.maintenance, signer: row.signer, archiveRows: row.archiveRows,
        credentialRows: row.credentialRows, expiryRows: row.expiryRows, credentialBackfill: row.credentialBackfill, revocations: row.revocations })
        .toEqual({ pending: 0, held: 0, requests: 0, operations: 0, attempts: 0, nextSend: null, dispatch: null,
          maintenance: null, signer: "ready", archiveRows: 0, credentialRows: 0, expiryRows: 0, credentialBackfill: 1, revocations: 0 });
      const ownTimer = timer?.scope === row.scope ? timer : null;
      expect(row.timers).toEqual(ownTimer ? [{ rule: "member-invitation-end", item: ownTimer.item, due: ownTimer.due }] : []);
      expect(row.deadline).toBe(ownTimer ? ownTimer.due : null);
      expect(row.alarm).toBe(ownTimer ? timeMs(ownTimer.due) : null);
    }
    expect(rows.filter(row => row.alarm !== null).length).toBe(timer ? 1 : 0);
  };
  const reactivate = async (): Promise<void> => {
    await owner.quiesce();
    for (const node of nodes()) await wait(() => node.restart());
    for (const node of nodes()) await wait(() => node.stub.summary(reader));
    await owner.quiesce(); await settled();
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([owner.run(async () => {
      const install = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {},
        fields: { host: "none", namespace: "", policy: "keys", founders: [rita.key] },
        idempotencyKey: crypto.randomUUID(), notAfter: timeOf(life.now() + 60_000) } as const;
      const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: C.register, creator: null, cause: intentDigest(install), ordinal: 0 }));
      expect((await wait(() => R.stub.create(signIntent(install, rita.secret), C.register))).answer).toBe("accepted");
      const found = await wait(() => R.intent(rita, "found", { expected: { register: 1 },
        fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } }));
      expect((await wait(() => R.stub.submit(found, []))).answer).toBe("accepted");
      await settled(true);
      const initial = await observe("room-created");
      const membership = initial.find(row => row.kind === "membership");
      if (!membership) throw Error("Actual room creation has no Membership owner");
      const M = nodes().find(node => node.name === membership.scope)!;
      const seat = await wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
      await wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
      await settled(true);
      const quiet = await observe("founder-inbox-confirmed");
      expect(quiet.map(row => row.kind).sort()).toEqual(["destination", "directory", "inbox", "membership", "register", "rules"]);
      for (const row of quiet) expect(row.pin).toBe(C[row.kind as keyof typeof C]);
      expect(quiet.reduce((n, row) => n + row.outbox.total, 0)).toBeGreaterThan(0);
      assertQuiet(quiet);
      await settled();
      const read = await observe("normal-read-and-callbacks"); assertQuiet(read); expect(read).toEqual(quiet);
      await reactivate();
      const cold = await observe("evicted-and-reactivated"); assertQuiet(cold); expect(cold).toEqual(quiet);

      const due = timeOf(life.now() + 60_000);
      const invitation = await wait(() => M.did(rita, "invite-member", { fields: { handle: "@idle-timer", role: "member",
        ...invitationIssueFields(C.membership, b64url(new Uint8Array(32).fill(91))), inviteEnds: due } }));
      await settled();
      const timed = { scope: M.name, item: invitation, due };
      const armed = await observe("one-future-invitation"); assertQuiet(armed, timed);
      await reactivate();
      const armedCold = await observe("future-deadline-after-eviction"); assertQuiet(armedCold, timed); expect(armedCold).toEqual(armed);
      const before = armedCold.find(row => row.scope === M.name)!.head;
      life.advance(timeMs(due)! - life.now());
      expect(await wait(() => runDurableObjectAlarm(M.object))).toBe(true);
      await settled();
      const ended = await observe("genuine-timed-end-settled"); assertQuiet(ended);
      expect(ended.find(row => row.scope === M.name)!.head).toBe(before + 1);
      const transition = await wait(() => M.stub.entry(reader, before + 1));
      if (!transition.ok) throw Error("Native timed entry unavailable");
      const input = transition.value.entry.input;
      expect(input.type === "timed" ? { type: input.type, item: input.item, rule: input.rule, due: input.due } : { type: input.type })
        .toEqual({ type: "timed", item: invitation, rule: "member-invitation-end", due });
      expect(await wait(() => runInDurableObject(M.object, (_instance, state) =>
        state.storage.sql.exec<{ state: string }>("SELECT state FROM item WHERE id=?", invitation).one().state))).toBe("lapsed");
    }), new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(Error("Idle witness exceeded 30 seconds; quiescence unknown, native cancellation unproved")), 30_000);
    })]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    // Existing owner supplies a separate 7.5 s join bound and retains custody
    // on failure. Do not erase alarms, pending rows or private bookkeeping.
    await owner.finish();
  }
}, 45_000);
