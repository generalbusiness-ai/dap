/**
 * Original requests: the exact bodies of a member's `POST .../acts` requests,
 * kept in the membership scope's object until an answer ends them
 * (notes/2026-10-31-signed-requests-across-devices.md, sections 1 and 2).
 *
 * A row is a **copy**, and a copy is open while its row exists. This table is
 * outside the history: no entry holds it, no guard reads it and no judgment is
 * given it. A copy holds a request and nothing else: no key and no token.
 *
 * **Who reads a row.** Only a session of the row's member. At each request
 * the object verifies the session, takes its key, reads that key's standing
 * from its own head, and requires the key and the member to be active. It then
 * compares the member with the row. A row of another member answers
 * `not-found`, the same as a row that does not exist. The check uses the
 * `summary` read and adds no read name: every member's session holds the same
 * member reads, so the compare does the work.
 *
 * **Who keeps a row.** A session of the key that signed the intent. A session
 * can make a copy only of a request that its key signed: the signature must
 * verify, and the intent's actor must be the session's key. The digest does
 * not cover `texts`, `presented` or `values`, so those parts can differ from
 * what the key's page sent. The scope verifies them when they are sent. This
 * grants nothing, because the signature still binds the act.
 *
 * **What a stolen session does.** It reads, delivers or deletes the member's
 * copies until the session ends. It can delete a row and keep it again with
 * other unsigned parts, or make a row from a request that its key already
 * signed and that has not expired. A deletion loses only the button, and the
 * journal stays true.
 *
 * **The list's reply.** 64 rows always fit. Only `kind` has a chosen length, and
 * `keep` bounds it at 256 bytes. JSON writes that in at most 1,536 bytes, six for
 * each control byte. The rest of a row has one form: digest 71, `to` 55 + 29 + 11,
 * `actor` 47, `notAfter` at most 24, `on` at most 16 digits, and under 100 of names
 * and punctuation. A row is under 1,900 bytes, so 64 rows are under 121,600 bytes.
 * The client's bound on a reply is 1,052,672 bytes.
 *
 * **A full object.** The caps of one member refuse with `full`, and the object's
 * cap with `room-full`. Before `room-full`, `keep` drops rows of members who are no
 * longer active or who hold no active key, one bounded quantum at a time. A retired
 * key of a member with another active key keeps its rows. The object's cap does not
 * refuse a request to this membership scope, so an admin can still remove a member.
 * Only the member's own caps bound those rows. Cloudflare's limits page states 10 GB
 * per Durable Object: that is the provider's statement and no measurement here. It
 * takes about 600 active members who each fill 16 MiB on purpose. The page says that
 * writes then fail with `SQLITE_FULL` and `DELETE` still succeeds. It also states 1 GB
 * in one section for the Free plan, and nobody checked which plan applies. Nobody
 * tested whether the alarm finishes its work at that point.
 *
 * **The time bound.** A row with no answer goes seven days past its `notAfter`,
 * plus the delay of the object's one alarm. `wake` is one cause of `Wakes`, so
 * it cannot clear another cause. Ending a row leaves the wake, and an early
 * wake clears itself.
 */
import type { Digest, ReadRefusal, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, isDigest, isRecord, isSignedIntentShape, parseStrict, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { timeMs, timeOf, type StateView } from "@generalbusiness/dap-derive";
import { platform, standingOf } from "@generalbusiness/dap-platform";
import type { Clock, Readers } from "./ports.ts";
import type { Sql } from "./sqlite.ts";

/** The caps of one membership object, and of one member within it. */
export interface OriginalLimits { rows: number; memberBytes: number; objectBytes: number; bodyBytes: number; kindBytes: number }
export const ORIGINAL_LIMITS: OriginalLimits = { rows: 64, memberBytes: 16 * 1024 * 1024, objectBytes: 1024 * 1024 * 1024, bodyBytes: 1024 * 1024, kindBytes: 256 };
/** How long past its `notAfter` a row with no answer lasts, before the alarm's delay. */
export const ORIGINAL_DAYS = 7;
const DROP_MS = ORIGINAL_DAYS * 24 * 3600 * 1000;
/** The most rows one alarm deletes. A backlog leaves a due wake, so the next alarm continues. */
const EXPIRE_QUANTUM = 64;
/** The most members one `keep` examines on a full object, and the most of their rows it drops. The next `keep` continues. */
const SWEEP_MEMBERS = 16, SWEEP_ROWS = 64;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS original_copy (
  digest TEXT PRIMARY KEY, genesis TEXT NOT NULL, member TEXT NOT NULL, actor TEXT NOT NULL,
  target TEXT NOT NULL, kind TEXT NOT NULL, item INTEGER, not_after TEXT NOT NULL,
  drop_ms INTEGER NOT NULL, size INTEGER NOT NULL, bytes TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS original_copy_member ON original_copy (genesis, member, size);
CREATE INDEX IF NOT EXISTS original_copy_due ON original_copy (drop_ms);
`;

/** One open copy, without its body. */
export interface OriginalRow { digest: Digest; to: ScopeRef; kind: string; on: number | null; actor: string; notAfter: Timestamp }
export type OriginalKeepRefusal = "bad-request" | "expired" | "conflict" | "full" | "room-full";
export type OriginalRefusal = Extract<ReadRefusal, "not-found" | "forbidden" | "sessions-unavailable" | "clock-behind">;
export type OriginalKept = { ok: true; fresh: boolean } | { ok: false; reason: OriginalRefusal | OriginalKeepRefusal };
export type OriginalBytes = { ok: true; bytes: string } | { ok: false; reason: OriginalRefusal };
export type OriginalEnded = { ok: true } | { ok: false; reason: OriginalRefusal };
export type OriginalPage = { ok: true; at: NonNullable<ReturnType<StateView["scope"]>>["head"]; value: readonly OriginalRow[]; complete: true } | { ok: false; reason: OriginalRefusal };

export interface OriginalsConfig {
  sql: Pick<Sql, "exec">;
  readers: Pick<Readers, "holder">;
  clock: Clock;
  state: Pick<StateView, "scope" | "page" | "item">;
  pinned: () => { named: unknown } | null;
  /** The bound of a signed intent's lifetime, in seconds. */
  lifetimeSeconds: number;
  limits?: OriginalLimits;
}

const BESIDE = new Set(["signed", "grants", "texts", "presented", "values"]);

/** The parts of a request body that a row states, or null: not one act's request with its grants empty. */
function requestOf(bytes: string) {
  try {
    const value = parseStrict(bytes) as unknown;
    if (!isRecord(value) || !Object.keys(value).every(name => BESIDE.has(name))) return null;
    const { signed, grants } = value;
    if (!Array.isArray(grants) || grants.length !== 0 || !isSignedIntentShape(signed) || signed.intent.to === null || !verifySignedIntent(signed)) return null;
    return signed.intent;
  } catch { return null; }
}

export class Originals {
  readonly #sql: Pick<Sql, "exec">;
  readonly #config: OriginalsConfig;
  readonly #limits: OriginalLimits;
  /** Where the next sweep of a full object starts. Memory only: a new instance starts at the first member. */
  #sweptTo = "";

  constructor(config: OriginalsConfig) {
    this.#config = config;
    this.#sql = config.sql;
    this.#limits = config.limits ?? ORIGINAL_LIMITS;
    this.#sql.exec(SCHEMA).toArray();
  }

  /** Who asks: the scope's genesis hash and the session's member. A refusal: this is no active membership scope, or the session or its standing fails. */
  #asker(reader: unknown): { genesis: string; member: string; key: string; named: string; at: NonNullable<ReturnType<StateView["scope"]>> } | { refused: OriginalRefusal } {
    const scope = this.#config.state.scope();
    const pinned = this.#config.pinned();
    if (!scope || scope.status !== "active" || scope.kind !== "membership" || !pinned || typeof pinned.named !== "string" || !platform(pinned.named)) return { refused: "not-found" };
    const key = this.#config.readers.holder?.(reader, "summary") ?? false;
    if (key === false) return { refused: "forbidden" };
    if (key === "sessions-unavailable" || key === "clock-behind") return { refused: key };
    const standing = standingOf(this.#config.state, { of: scope.at, key }, pinned.named as never);
    if (!standing || !("key" in standing) || standing.keyState !== "active" || standing.memberState !== "active" || standing.controllerActive === false) return { refused: "forbidden" };
    return { genesis: scope.at.genesis, member: standing.member, key, named: pinned.named, at: scope };
  }

  /** One bounded quantum on a full object: the rows of members who are no longer active or who hold no active key. */
  #sweep(asker: { genesis: string; named: string; at: NonNullable<ReturnType<StateView["scope"]>> }): void {
    const members = this.#sql.exec("SELECT DISTINCT member FROM original_copy WHERE genesis = ? AND member > ? ORDER BY member LIMIT ?", asker.genesis, this.#sweptTo, SWEEP_MEMBERS).toArray().map(row => row["member"] as string);
    let left = SWEEP_ROWS, after = this.#sweptTo, finished = true;
    for (const member of members) {
      const standing = standingOf(this.#config.state, { of: asker.at.at, member: member as never }, asker.named as never);
      if (standing && "memberState" in standing && (standing.memberState !== "active" || !("activeKey" in standing) || standing.activeKey !== true)) {
        const doomed = this.#sql.exec("SELECT digest FROM original_copy WHERE genesis = ? AND member = ? LIMIT ?", asker.genesis, member, left).toArray();
        for (const row of doomed) this.#sql.exec("DELETE FROM original_copy WHERE digest = ?", row["digest"] as string).toArray();
        left -= doomed.length;
        if (left === 0) { finished = false; break; } // This member can hold more rows, so the next sweep starts with it.
      }
      after = member;
    }
    this.#sweptTo = finished && members.length < SWEEP_MEMBERS ? "" : after;
  }

  /** The object's bytes with this body would pass the cap. */
  #objectFull(size: number): boolean {
    const all = this.#sql.exec("SELECT COALESCE(SUM(size), 0) AS total FROM original_copy").toArray()[0]!;
    return (all["total"] as number) + size > this.#limits.objectBytes;
  }

  /**
   * Keep one request. The same digest with the same bytes changes nothing and
   * charges nothing. The same digest with other bytes keeps the first. `fresh`
   * says that a row was written, so the object's alarm needs setting.
   */
  keep(reader: unknown, bytes: unknown): OriginalKept {
    const asker = this.#asker(reader);
    if ("refused" in asker) return { ok: false, reason: asker.refused };
    if (typeof bytes !== "string") return { ok: false, reason: "bad-request" };
    const size = utf8(bytes).length;
    if (size > this.#limits.bodyBytes) return { ok: false, reason: "bad-request" };
    const intent = requestOf(bytes);
    if (!intent || utf8(intent.kind).length > this.#limits.kindBytes) return { ok: false, reason: "bad-request" };
    if (intent.actor !== asker.key) return { ok: false, reason: "forbidden" };
    const [now, ends] = [timeMs(this.#config.clock.read()), timeMs(intent.notAfter)];
    if (now === null || ends === null || now >= ends) return { ok: false, reason: "expired" };
    if (ends - now > this.#config.lifetimeSeconds * 1000) return { ok: false, reason: "bad-request" };
    const digest = intentDigest(intent);
    const held = this.#sql.exec("SELECT bytes FROM original_copy WHERE digest = ? AND genesis = ?", digest, asker.genesis).toArray()[0];
    if (held) return held["bytes"] === bytes ? { ok: true, fresh: false } : { ok: false, reason: "conflict" };
    const mine = this.#sql.exec("SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS total FROM original_copy WHERE genesis = ? AND member = ?", asker.genesis, asker.member).toArray()[0]!;
    if ((mine["n"] as number) >= this.#limits.rows || (mine["total"] as number) + size > this.#limits.memberBytes) return { ok: false, reason: "full" };
    const toThisScope = intent.to?.scope === asker.at.at.scope && intent.to.genesis === asker.at.at.genesis;
    if (!toThisScope && this.#objectFull(size)) {
      this.#sweep(asker);
      if (this.#objectFull(size)) return { ok: false, reason: "room-full" };
    }
    this.#sql.exec("INSERT INTO original_copy (digest, genesis, member, actor, target, kind, item, not_after, drop_ms, size, bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      digest, asker.genesis, asker.member, intent.actor, canonicalize(intent.to), intent.kind, intent.on, intent.notAfter, ends + DROP_MS, size, bytes).toArray();
    return { ok: true, fresh: true };
  }

  /** The member's open copies, without bodies. The cap on rows bounds the page, so one page holds them all. */
  list(reader: unknown): OriginalPage {
    const asker = this.#asker(reader);
    if ("refused" in asker) return { ok: false, reason: asker.refused };
    const rows = this.#sql.exec("SELECT digest, actor, target, kind, item, not_after FROM original_copy WHERE genesis = ? AND member = ? ORDER BY not_after, digest", asker.genesis, asker.member).toArray();
    const value = rows.map((row): OriginalRow => ({ digest: row["digest"] as Digest, to: JSON.parse(row["target"] as string) as ScopeRef, kind: row["kind"] as string, on: row["item"] as number | null, actor: row["actor"] as string, notAfter: row["not_after"] as Timestamp }));
    return { ok: true, at: asker.at.head, value, complete: true };
  }

  /** One copy's exact bytes. */
  read(reader: unknown, digest: unknown): OriginalBytes {
    const asker = this.#asker(reader);
    if ("refused" in asker) return { ok: false, reason: asker.refused };
    const row = isDigest(digest) ? this.#sql.exec("SELECT bytes FROM original_copy WHERE digest = ? AND genesis = ? AND member = ?", digest, asker.genesis, asker.member).toArray()[0] : undefined;
    return row ? { ok: true, bytes: row["bytes"] as string } : { ok: false, reason: "not-found" };
  }

  /** End one copy. The wake stays, and an early wake clears itself. */
  end(reader: unknown, digest: unknown): OriginalEnded {
    const asker = this.#asker(reader);
    if ("refused" in asker) return { ok: false, reason: asker.refused };
    if (!isDigest(digest) || this.#sql.exec("SELECT 1 AS x FROM original_copy WHERE digest = ? AND genesis = ? AND member = ?", digest, asker.genesis, asker.member).toArray().length === 0) return { ok: false, reason: "not-found" };
    this.#sql.exec("DELETE FROM original_copy WHERE digest = ?", digest).toArray();
    return { ok: true };
  }

  /** The earliest time at which a row goes, or null. It reads no clock, so a quiet object samples none. */
  wake(): Timestamp | null {
    const next = this.#sql.exec("SELECT MIN(drop_ms) AS at FROM original_copy").toArray()[0]?.["at"];
    return typeof next === "number" ? timeOf(next) : null;
  }

  /** One bounded quantum of rows past the bound. */
  expire(now: Timestamp): void {
    const at = timeMs(now);
    if (at === null) throw new Error("the time bound of a copy requires a valid clock");
    this.#sql.exec("DELETE FROM original_copy WHERE digest IN (SELECT digest FROM original_copy WHERE drop_ms <= ? ORDER BY drop_ms LIMIT ?)", at, EXPIRE_QUANTUM).toArray();
  }
}
