/** Private Site credentials, owned only by the fixed ScopeIndex binding.
 * Provider answers are not native authority. Unknown mints have the bounded
 * hold accepted by planner ruling 3fdb03b9; they are never retried inline. */
import { canonicalize, isScopeId, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import { refName } from "@generalbusiness/dap-git";
import { READ_TTL } from "../artifacts-host.ts";
import { ARTIFACTS_HOST, type ArtifactsReadiness } from "../artifacts-wiring.ts";
import type { DestinationRepository } from "../destination-host.ts";
import type { Sql, SqlValue } from "../sqlite.ts";

export interface SiteTokenRequest { register: string; repository: DestinationRepository; ref: string; configuration: string }
export type SiteTokenAnswer = { ok: true; plaintext: string; ends: number } | { ok: false; reason: "unavailable" | "capacity" | "mint-pending" } | { ok: false; reason: "provider"; step: "open" | "info" | "token" };
export interface SiteTokenPort { acquireSiteRead(request: SiteTokenRequest): Promise<SiteTokenAnswer> }
type Wait = <T>(work: Promise<T>) => Promise<T>;
class DeadlineFailure extends Error {}
function deadlineAt(ends: number, clock: () => number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new DeadlineFailure()), Math.max(0, ends - clock())); });
  return { wait: (<T>(work: Promise<T>) => Promise.race([work, expired])) as Wait, close: () => { if (timer !== undefined) clearTimeout(timer); } };
}
interface Flight { generation: string; promise: Promise<SiteTokenAnswer>; waiters: number; done: boolean; deadline: ReturnType<typeof deadlineAt> }
class ProviderFailure extends Error { constructor(readonly step: "open" | "info" | "token") { super("Site provider unavailable"); } }
const failed = (error: unknown): SiteTokenAnswer => error instanceof DeadlineFailure ? PENDING : error instanceof ProviderFailure ? { ok: false, reason: "provider", step: error.step } : NO_TOKEN;
const NO_TOKEN: SiteTokenAnswer = { ok: false, reason: "unavailable" };
const PENDING: SiteTokenAnswer = { ok: false, reason: "mint-pending" };
const FULL: SiteTokenAnswer = { ok: false, reason: "capacity" };
const SCHEMA = `CREATE TABLE IF NOT EXISTS private_site_token (
  key TEXT PRIMARY KEY, generation TEXT NOT NULL, state TEXT NOT NULL,
  ends INTEGER NOT NULL, plaintext TEXT
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS private_site_token_end ON private_site_token(ends);`;
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const nowIs = (now: number): boolean => Number.isSafeInteger(now) && now >= 0 && now <= Number.MAX_SAFE_INTEGER - (READ_TTL + 60) * 1000;

/** Construction and empty wake lookup write no schema. Each SQL pass is
 * bounded by the 256 retained keys. All transitions run in one transaction. */
export class SiteTokenReuse {
  readonly #sql: Sql;
  readonly #readiness: () => ArtifactsReadiness;
  readonly #clock: () => number;
  readonly #schedule: () => Promise<void>;
  readonly #flights = new Map<string, Flight>();
  #waiters = 0;
  constructor(sql: Sql, readiness: () => ArtifactsReadiness, clock: () => number, schedule: () => Promise<void>) {
    this.#sql = sql; this.#readiness = readiness; this.#clock = clock; this.#schedule = schedule;
  }
  #exists(): boolean { return this.#sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='private_site_token'").toArray().length === 1; }
  maintain(now: number): void {
    if (!nowIs(now) || !this.#exists()) return;
    this.#sql.exec("DELETE FROM private_site_token WHERE key IN (SELECT key FROM private_site_token WHERE ends <= ? ORDER BY ends LIMIT 256)", now).toArray();
  }
  wake(): number | null {
    if (!this.#exists()) return null;
    const ends = this.#sql.exec("SELECT ends FROM private_site_token ORDER BY ends LIMIT 1").toArray()[0]?.["ends"];
    return typeof ends === "number" && nowIs(ends) ? ends : null;
  }
  #row(key: string): Record<string, SqlValue> | undefined {
    return this.#sql.exec("SELECT generation,state,ends,plaintext FROM private_site_token WHERE key = ?", key).toArray()[0];
  }
  #ready(key: string, generation: string): SiteTokenAnswer {
    const row = this.#row(key), now = this.#clock();
    return nowIs(now) && row?.["generation"] === generation && row["state"] === "ready" && typeof row["ends"] === "number" && row["ends"] > now
      && typeof row["plaintext"] === "string" ? { ok: true, plaintext: row["plaintext"], ends: row["ends"] } : PENDING;
  }
  async acquire(request: SiteTokenRequest): Promise<SiteTokenAnswer> {
    const ready = this.#readiness(), supplied = record(request), repository = record(supplied?.["repository"]);
    if (ready.state !== "wired" || !supplied || Object.keys(supplied).length !== 4 || !repository || Object.keys(repository).length !== 4
      || supplied["register"] !== ready.config.registerScope || !isScopeId(supplied["register"])
      || supplied["configuration"] !== canonicalize(ready.config)
      || repository["host"] !== ARTIFACTS_HOST || repository["namespace"] !== ready.config.namespace
      || typeof repository["name"] !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(repository["name"])
      || repository["name"].toLowerCase().endsWith(".git") || repository["id"] !== repository["name"]
      || typeof supplied["ref"] !== "string" || supplied["ref"].length > 1024 || utf8(supplied["ref"]).length > 1024 || !supplied["ref"].startsWith("refs/")) return NO_TOKEN;
    try { refName(supplied["ref"], "Site token ref"); } catch (error) { return failed(error); }
    const name = repository["name"];
    const now = this.#clock();
    if (!nowIs(now)) return NO_TOKEN;
    const key = canonicalize({ configuration: ready.config, repository, ref: supplied["ref"] });
    this.maintain(now);
    // Reserve before any provider await. Neither a restart nor caller churn
    // bypasses the 32 unknown/live mint reservations or the 256 live keys.
    const selected = this.#sql.transaction(() => {
      this.#sql.exec(SCHEMA).toArray();
      const prior = this.#row(key);
      if (prior) return { row: prior, leader: false };
      const counts = this.#sql.exec("SELECT count(*) AS keys, sum(state='reserved') AS mints FROM private_site_token").toArray()[0]!;
      if (Number(counts["keys"]) >= 256 || Number(counts["mints"]) >= 32) return null;
      const generation = crypto.randomUUID();
      this.#sql.exec("INSERT INTO private_site_token(key,generation,state,ends,plaintext) VALUES(?,?,'reserved',?,NULL)", key, generation, now + (READ_TTL + 60) * 1000).toArray();
      return { row: this.#row(key)!, leader: true };
    });
    if (!selected) return FULL;
    const generation = selected.row["generation"] as string;
    const current = () => {
      const actual = this.#readiness();
      return actual.state === "wired" && actual.binding === ready.binding && canonicalize(actual.config) === canonicalize(ready.config);
    };
    const remote = async (wait: Wait) => {
      let handle;
      try { handle = await wait(ready.binding.get(name)); } catch (error) { if (error instanceof DeadlineFailure) throw error; throw new ProviderFailure("open"); }
      let info;
      try { info = record(await wait(handle.info())); } catch (error) { if (error instanceof DeadlineFailure) throw error; throw new ProviderFailure("info"); }
      const expected = `https://${ready.config.host}/git/${ready.config.namespace}/${name}.git`;
      const bare = (s: string) => s.replace(/\/+$/, "").replace(/\.git$/, "");
      if (typeof info?.["remote"] !== "string" || bare(info["remote"]) !== bare(expected)) throw new ProviderFailure("info");
      if (!current()) throw Error("Site config changed");
      return handle;
    };
    if (selected.row["state"] === "ready") {
      // Bound this acquisition even if the provider reports a distant end.
      // This local deadline never changes the durable token's actual expiry.
      const deadline = deadlineAt(Math.min(selected.row["ends"] as number, now + (READ_TTL + 60) * 1000), this.#clock);
      try { await remote(deadline.wait); await deadline.wait(this.#schedule()); return current() ? this.#ready(key, generation) : NO_TOKEN; }
      catch (error) { return failed(error); }
      finally { deadline.close(); }
    }
    if (selected.row["state"] === "unavailable") {
      // A known token lost local custody after an alarm failure. Its actual
      // expiry still reserves the key; rearming never mints or restores it.
      try { await this.#schedule(); } catch { return NO_TOKEN; }
      return PENDING;
    }
    if (!selected.leader) {
      const flight = this.#flights.get(key);
      if (!flight || flight.generation !== generation) return PENDING;
      if (flight.waiters >= 8 || this.#waiters >= 64) return FULL;
      flight.waiters++; this.#waiters++;
      try {
        await remote(flight.deadline.wait);
        const answer = await flight.deadline.wait(flight.promise);
        return answer.ok ? current() ? this.#ready(key, generation) : NO_TOKEN : answer;
      } catch (error) { return failed(error); }
      finally { flight.waiters--; this.#waiters--; if (flight.done && flight.waiters === 0) flight.deadline.close(); }
    }
    const flight: Flight = { generation, waiters: 0, done: false, deadline: deadlineAt(selected.row["ends"] as number, this.#clock), promise: Promise.resolve(PENDING) };
    this.#flights.set(key, flight);
    flight.promise = (async (): Promise<SiteTokenAnswer> => {
      let mintEntered = false;
      try {
        // Persisted reservation must also have its expiry alarm before mint.
        await flight.deadline.wait(this.#schedule());
        const handle = await remote(flight.deadline.wait);
        const reservation = this.#row(key), beforeMint = this.#clock();
        if (!nowIs(beforeMint) || reservation?.["generation"] !== generation || reservation["state"] !== "reserved" || Number(reservation["ends"]) <= beforeMint) return PENDING;
        let minted;
        try { mintEntered = true; minted = record(await flight.deadline.wait(handle.createToken("read", READ_TTL))); } catch (error) { if (error instanceof DeadlineFailure) throw error; throw new ProviderFailure("token"); }
        const plaintext = typeof minted?.["plaintext"] === "string" ? minted["plaintext"] : minted?.["token"];
        const expiry = minted?.["expiresAt"];
        const ends = typeof expiry === "string" ? timeMs(expiry.replace(/\.000Z$/, "Z")) : null;
        const at = this.#clock();
        if (!current() || minted?.["scope"] !== "read" || typeof plaintext !== "string" || !/^[!-~]{1,4096}$/.test(plaintext)
          || !nowIs(at) || ends === null || !nowIs(ends) || ends <= at) throw new ProviderFailure("token");
        const installed = this.#sql.transaction(() => this.#sql.exec("UPDATE private_site_token SET state='ready',ends=?,plaintext=? WHERE key=? AND generation=? AND state='reserved' AND ends > ? RETURNING generation", ends, plaintext, key, generation, at).toArray().length === 1);
        if (!installed) return PENDING;
        try { await flight.deadline.wait(this.#schedule()); }
        catch {
          // Never retain an unscheduled plaintext. Keep its known expiry and
          // key, so losing local custody cannot mint a second live token.
          this.#sql.exec("UPDATE private_site_token SET state='unavailable',plaintext=NULL WHERE key=? AND generation=? AND state='ready'", key, generation).toArray();
          return NO_TOKEN;
        }
        return current() ? this.#ready(key, generation) : NO_TOKEN;
      } catch (error) { return failed(error); }
      finally {
        // Before createToken entered there is no ambiguous provider effect.
        // Release only our reservation, never a successor or a ready token.
        if (!mintEntered) {
          this.#sql.exec("DELETE FROM private_site_token WHERE key=? AND generation=? AND state='reserved'", key, generation).toArray();
          try { await flight.deadline.wait(this.#schedule()); }
          catch {
            // Keep the original answer if cleanup fails or times out.
            // A timed-out schedule may still finish in the owner's revision loop.
          }
        }
        flight.done = true;
        if (flight.waiters === 0) flight.deadline.close();
        if (this.#flights.get(key) === flight) this.#flights.delete(key);
      }
    })();
    return flight.promise;
  }
}
