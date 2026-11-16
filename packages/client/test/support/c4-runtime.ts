/** Production Core/Reads/session phase over the exact native-judged bootstrap.
 * Only the local transport, Node SQLite adapter, clock and notifications are
 * fixture infrastructure. No successful Native Answer or proof is scripted. */
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
import { DOMAINS, PROPOSED_BOUNDS, SESSION_DOMAINS } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, intentDigest, isRecord, isSignedIntentShape, timeMs, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { applyEntry, membershipOf } from "@generalbusiness/dap-derive";
import { Scope, Reads, SqliteStore, production, ReadPreparation, Deliveries, type Sql, type SqlValue } from "@generalbusiness/dap-scope/runtime";
import { bornOf, used } from "../../../scope/src/core.ts";
import { repositoryAuthority } from "../../../scope/src/authority.ts";
import { sourced, declaredBy, sentText, observedAt, membershipIn, namespace, type Peer } from "../../../scope/src/namespace.ts";
import { nativeBirth, nativeBirthByName } from "../../../scope/src/native-birth.ts";
import { creationDeclaration } from "../../../scope/src/creation-declaration.ts";
import { ProofBytes, EXACT_PROOF_RECEIVER_BOUNDS } from "../../../scope/src/proof-bytes.ts";
import { PreparationBudget } from "../../../scope/src/preparation-budget.ts";
import { issueSession, SessionRequests, sessionReaders, sessionsOf } from "../../../scope/src/sessions.ts";
import { HeldEntries } from "../../src/replica-own.ts";
import { ScopeHandle } from "../../src/handle.ts";
import { declaredHandle } from "../../src/declared.ts";
import { httpTransport, type Fetch } from "../../src/http.ts";
import { originalRequest } from "../../src/originals.ts";
import { requestSession, signerSessionRequest } from "../../src/session.ts";
import { secretSigner } from "../../src/intent.ts";
import { wallClock } from "../../src/request-schedule.ts";
import { c4Bootstrap, c4SelectionBootstrap, type CapturedNode } from "./c4-bootstrap.ts";
import { lending } from "../../../../examples/lending/definition.ts";
import { selection } from "./c4-selection.ts";

export const C4_SERVICE = "https://c4-scopes.test";
const same = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);
function requireSame(a: unknown, b: unknown, what: string): void {
  if (!same(a, b)) throw new Error(`C4 restored source mismatch: ${what}`);
}

/** Existing application-local.ts Node SQLite behavior, without its scripted
 * authority or read adapter. SQL and rollback remain real. */
function sqlite(): Sql & { close(): void } {
  const db = new DatabaseSync(":memory:");
  let depth = 0;
  return {
    close: () => db.close(),
    exec(query, ...bindings) {
      if (/^\s*CREATE\s/i.test(query)) {
        if (bindings.length) throw new Error("C4 schema has unexpected bindings");
        db.exec(query); return { toArray: () => [] };
      }
      const rows = db.prepare(query).all(...bindings.map(value => value instanceof ArrayBuffer ? Buffer.from(value) : value));
      return { toArray: () => rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]): [string, SqlValue] => {
        if (value === null || typeof value === "string" || typeof value === "number") return [key, value];
        if (value instanceof Uint8Array) return [key, new Uint8Array(value).buffer];
        throw new Error("C4 unsupported SQL value");
      }))) };
    },
    transaction(work) {
      if (depth > 0) return work();
      db.exec("BEGIN"); depth++;
      try { const result = work(); db.exec("COMMIT"); return result; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
      finally { depth--; }
    },
  };
}

/** Same receiver allowance as object.ts; no fixture deadline extension. */
function activeWithin(milliseconds: number): (() => boolean) | null {
  const began = performance.now(), ends = began + milliseconds;
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || milliseconds > EXACT_PROOF_RECEIVER_BOUNDS.milliseconds
    || !Number.isFinite(began) || !Number.isFinite(ends)) return null;
  return () => { const now = performance.now(); return now >= began && now < ends; };
}

/** Preserve the concrete Lending handle and existing caller shape. */
export async function c4Runtime() {
  const { scopeHandle, ...runtime } = await restore("lending");
  try {
    const handle = await declaredHandle(scopeHandle, lending);
    if (!handle.ok) throw new Error(`C4 production declared read refused: ${handle.reason}`);
    return { ...runtime, handle: handle.handle };
  } catch (error) { runtime.close(); throw error; }
}
/** Fixed selection declaration; no caller chooses a definition or scope. */
export async function c4SelectionRuntime() {
  const { scopeHandle, ...runtime } = await restore("selection");
  try {
    const handle = await declaredHandle(scopeHandle, selection);
    if (!handle.ok) throw new Error(`C4 production selection declared read refused: ${handle.reason}`);
    return { ...runtime, handle: handle.handle };
  } catch (error) { runtime.close(); throw error; }
}

async function restore(preset: "lending" | "selection") {
  const bootstrap = preset === "lending" ? await c4Bootstrap() : await c4SelectionBootstrap();
  const application = "lending" in bootstrap ? bootstrap.lending : bootstrap.application;
  const now = timeMs(bootstrap.captured[0]!.ledger.now)!;
  const sqls: (Sql & { close(): void })[] = [];
  const runtimes = new Map<string, ReturnType<typeof makeNode>>();
  const facts = bootstrap.captured.flatMap(node => node.rows.map(row => ({ fact: node.ledger.fact(row.entry.seq), entry: row.entry,
    under: node.ledger.under, bytes: row.bytes, sequence: node.ledger.own.sequence()! })));
  try {
    // Restore actual retained foreign bytes and their birth associations using
    // production helpers, then fold with preceding-only Own at each entry.
    for (const captured of bootstrap.captured) {
      const sql = sqlite(); sqls.push(sql);
      const store = new SqliteStore(sql);
      store.cover(captured.ledger.definition.indexes);
      const held = new HeldEntries(PROPOSED_BOUNDS.entryBytes);
      for (const row of captured.rows) {
        if (canonicalize(row.entry) !== row.bytes || entryHash(row.entry) !== row.hash) throw new Error("C4 captured row changed");
        held.put({ entry: row.entry, hash: row.hash }, row.bytes);
      }
      store.transaction(() => {
        for (const input of captured.retained) store.retain(input);
        if (captured.platform === null) store.retain({ kind: "definition", digest: captured.ledger.definition.digest,
          bytes: canonicalize(captured.ledger.definition.declared) });
        for (const row of captured.rows) {
          for (const input of used(row.entry, facts)) store.retain(input);
          for (const birth of bornOf(row.entry, facts)) store.retainBirth(birth.at, birth.input);
        }
        const complete = held.foldThrough(captured.rows.length - 1, (row, own) => {
          const original = captured.rows[row.entry.seq];
          if (!original || original.hash !== row.hash || original.bytes !== canonicalize(row.entry)) throw new Error("C4 prefix row changed");
          store.append(row.entry, row.hash, original.bytes, utf8(original.bytes).length);
          applyEntry(store, captured.ledger.definition, row.entry, row.hash, { bounds: PROPOSED_BOUNDS, own, facts,
            ...(captured.platform ? { platform: captured.platform } : {}) });
        });
        if (!complete || held.take().length > 0) throw new Error("C4 actual source prefix could not restore");
        requireSame(store.all(), JSON.parse(captured.snapshot), "full folded snapshot");
        for (const row of captured.rows) {
          const stored = store.stored(row.entry.seq);
          if (!stored || stored.hash !== row.hash || stored.bytes !== row.bytes) throw new Error("C4 restored journal bytes changed");
        }
      });
      // makeNode closes only over real SQL, store and production functions.
      runtimes.set(captured.ledger.at.scope, makeNode(captured, sql, store));
    }

    const bindings = { idFromName: (name: string) => name,
      get: (name: string) => {
        const node = runtimes.get(name);
        if (!node) throw new Error("C4 peer outside its actual graph");
        return node.peer;
      } };
    const peers = namespace(bindings), membership = membershipIn(bindings);
    for (const node of runtimes.values()) {
      node.ports.resolver = peers.resolver; node.ports.proofs = peers.proofs; node.ports.births = peers.births;
      node.ports.definitions = peers.definitions; node.ports.texts = peers.texts;
      node.ports.authority = repositoryAuthority({ clock: node.ports.clock, random: node.ports.random,
        genesis: node.genesis, state: node.store, reader: membership,
        // The private fixture supplies no out-of-history compromise notices.
        named: () => false });
    }
    const M = runtimes.get(bootstrap.membership.scope), app = runtimes.get(application.scope);
    if (!M || !app) throw new Error(preset === "lending" ? "C4 restored membership or Lending scope missing" : "C4 restored membership or selection scope missing");
    requireSame(app.store.scope()?.at, application, preset === "lending" ? "Lending full reference" : "selection full reference");
    requireSame(M.store.scope()?.at, bootstrap.membership, "membership full reference");
    const genesis = app.genesis();
    if (!genesis) throw new Error(preset === "lending" ? "C4 actual Lending genesis missing" : "C4 actual selection genesis missing");
    requireSame(membershipOf(genesis, application), bootstrap.membership, "restored recorded membership");

    // The TEST secret stays in this issuer closure. Return the actual Session
    // for private reader binding, never a raw credential/report field.
    const sessionSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
    const sessions = sessionsOf(sessionSecret, "C4 private Node fixture");
    if (!sessions) throw new Error("C4 TEST session configuration refused");
    const requests = new SessionRequests(M.sql);
    for (const node of runtimes.values()) node.setReaders(sessionReaders({ sessions: () => sessions,
      clock: node.ports.clock, scope: () => node.store.scope(), membership: at => {
        const birth = node.genesis();
        return birth ? membershipOf(birth, at) : null;
      } }));
    const counts = { sessionRequests: 0, readAuthSignatures: 0, actSignatures: 0,
      summaryReads: 0, journalReads: 0, submissions: 0, settlements: 0 };
    const routes: string[] = [];
    const fetch: Fetch = async (url, init) => {
      const address = new URL(url);
      if (address.origin !== C4_SERVICE) throw new Error("C4 transport left its local graph");
      const method = init?.method ?? "GET", path = address.pathname;
      routes.push(`${method} ${path}`);
      if (method === "POST" && path === `/v1/scopes/${bootstrap.membership.scope}/sessions`) {
        counts.sessionRequests++;
        const asked: unknown = JSON.parse(init?.body ?? "null");
        return Response.json(issueSession({ sessions, clock: M.ports.clock, requests }, M.store, M.core.pinned(), asked));
      }
      const prefix = `/v1/scopes/${application.scope}`;
      const reader = init?.headers?.["authorization"] ?? null;
      if (method === "GET" && path === prefix) { counts.summaryReads++; return Response.json(app.reads().summary(reader)); }
      if (method === "GET" && path === `${prefix}/log`) {
        counts.journalReads++;
        const cursor = address.searchParams.get("cursor");
        return Response.json(app.reads().log(reader, cursor === null ? undefined : cursor));
      }
      if (method === "POST" && (path === `${prefix}/acts` || path === `${prefix}/settle`)) {
        const raw = init?.body ?? "", body: unknown = JSON.parse(raw);
        if (!isRecord(body) || !isSignedIntentShape(body["signed"])) throw new Error("C4 unexpected signed request shape");
        const parsed = originalRequest(path.endsWith("/acts") ? raw : JSON.stringify({ signed: body["signed"], grants: [] }),
          intentDigest(body["signed"].intent));
        if (!parsed) throw new Error("C4 actual original request did not verify");
        if (path.endsWith("/acts")) { counts.submissions++; return Response.json(await app.core.submit(parsed.signed, parsed.grants, parsed.beside)); }
        counts.settlements++; return Response.json(app.core.settle(parsed.signed));
      }
      throw new Error("C4 unexpected local route");
    };
    const actualSigner = secretSigner(bootstrap.actor.secret), actTag = utf8(`${DOMAINS.intent}\n`), sessionTag = utf8(`${SESSION_DOMAINS.request}\n`);
    const begins = (bytes: Uint8Array, tag: Uint8Array): boolean => tag.every((byte, index) => bytes[index] === byte);
    const signer = { key: actualSigner.key, sign: async (bytes: Uint8Array) => {
      if (begins(bytes, actTag)) counts.actSignatures++;
      else if (begins(bytes, sessionTag)) counts.readAuthSignatures++;
      return actualSigner.sign(bytes);
    } };
    const asked = await signerSessionRequest(bootstrap.membership, signer, timeOf(now + 60_000), "c4-real-read-session");
    const issued = await requestSession(C4_SERVICE, bootstrap.membership.scope, asked, { fetch });
    if (!issued.ok) throw new Error(`C4 production session refused: ${issued.reason}`);
    requireSame(issued.session.claims.key, signer.key, "issued session key");
    requireSame(issued.session.claims.membership, bootstrap.membership, "issued session membership");
    requireSame(issued.session.claims.member, bootstrap.member.member, "issued session member");
    const scopeHandle = new ScopeHandle(httpTransport(C4_SERVICE, { fetch }), application.scope, issued.session.reader());
    return { scopeHandle, session: issued.session, signer, member: bootstrap.member,
      service: C4_SERVICE, at: application, membership: bootstrap.membership, destination: bootstrap.destination,
      counts, routes, now: () => now, clock: { now: () => now, set: wallClock.set, clear: wallClock.clear },
      readInputs: async () => ({ is: "ready" as const, session: issued.session }),
      core: app.core, store: app.store,
      close: () => { for (const sql of sqls) sql.close(); },
    };
  } catch (error) { for (const sql of sqls) sql.close(); throw error; }

  function makeNode(captured: CapturedNode, sql: Sql, store: SqliteStore) {
    const ports = production(); ports.clock = { read: () => timeOf(now) };
    const core = new Scope(captured.ledger.at.scope, store, ports, PROPOSED_BOUNDS);
    const genesis = () => { const input = captured.rows[0]?.entry.input; return input?.type === "genesis" ? input : null; };
    requireSame(core.pinned()?.named, captured.named, "actual Core pin");
    const preparation = new ReadPreparation(sql, { policy: () => "c4-production-default-support-v1",
      declared: bytes => core.validate(bytes), platform: named => core.platform(named) });
    const proof = new ProofBytes(sql), deliveries = new Deliveries(captured.ledger.at.scope, core, store, ports, PROPOSED_BOUNDS);
    let reads: Reads | null = null;
    const peer: Peer = {
      deliver: envelope => deliveries.deliver(envelope),
      source: async (seq, origin) => sourced(store, core.pinned(), seq, origin),
      declared: async digest => declaredBy(store, digest),
      text: async (seq, digest) => sentText(store, seq, digest),
      observe: async asked => observedAt(store, core.pinned(), asked),
      proofSource: async (fact, maxBytes, milliseconds) => {
        if (milliseconds === undefined) return proof.exact(fact, maxBytes);
        const active = activeWithin(milliseconds); if (!active) return null;
        let calls = 0;
        const bytes = new ProofBytes(sql, () => { if (!active() || ++calls > EXACT_PROOF_RECEIVER_BOUNDS.sqlCalls) throw new Error("C4 proof unavailable"); });
        const result = bytes.exact(fact, maxBytes); return active() ? result : null;
      },
      nativeBirth: async (at, milliseconds, maxBytes) => {
        const active = activeWithin(milliseconds); if (!active) return null;
        const result = nativeBirth(preparation, at, new PreparationBudget(undefined, active), maxBytes);
        return active() ? result : null;
      },
      nativeBirthByName: async (name, kind, milliseconds, maxBytes) => {
        const active = activeWithin(milliseconds); if (!active) return null;
        const result = nativeBirthByName(preparation, name, kind, new PreparationBudget(undefined, active), maxBytes);
        return active() ? result : null;
      },
      creationDeclaration: async (at, digest, maxBytes, milliseconds) => {
        const active = activeWithin(milliseconds); return active ? creationDeclaration(store, core.pinned(), at, digest, maxBytes, active) : null;
      },
    };
    return { sql, store, ports, core, peer, genesis,
      setReaders: (reader: ReturnType<typeof sessionReaders>) => { reads = new Reads(store, () => core.pinned(), reader); },
      reads: () => { if (!reads) throw new Error("C4 production readers not bound"); return reads; },
    };
  }
}
