/** Navigation and room identity shared by the browser shell and its tests. */
import type { MemberRef } from "@generalbusiness/dap-contract";
import { canonicalize, isMemberRef } from "@generalbusiness/dap-bytes";
export type Destination = "issues" | "changes" | "commons" | "rules" | "devices" | "join" | "invitation" | "config" | "start";
export interface Route { destination: Destination; scope: string | null }

/** State-sensitive presentation only; the scope still judges each offered act. */
export function issueActions(state: string, offered: readonly string[], requester?: MemberRef | null, current?: MemberRef | null): { primary: string[]; blockedKinds: string[] } {
  const closes = ["close-own", "close-any"], reopens = ["reopen-own", "reopen-any"];
  const own = isMemberRef(requester) && isMemberRef(current) && canonicalize(requester) === canonicalize(current);
  const blockedKinds = [...new Set([...(state === "closed" ? closes : state === "open" ? reopens : [...closes, ...reopens]), ...(!own ? ["close-own", "reopen-own"] : [])])];
  const transition = (state === "closed" ? reopens : state === "open" ? closes : []).find((kind) => offered.includes(kind) && !blockedKinds.includes(kind));
  return { primary: ["comment", ...(transition ? [transition] : [])], blockedKinds };
}

export function changeActions(state: string, invalidPath: boolean): { primary: string[]; blockedKinds: string[] } {
  const decisions = ["merge", "review-verdict", "ready-own", "ready-any", "request-review-own", "request-review-any"];
  const blockedKinds = ["merged", "closed", "cancelled"].includes(state) || invalidPath ? decisions : [];
  return { primary: ["comment", "review-verdict", "merge", "request-review-own", "ready-own"].filter((kind) => !blockedKinds.includes(kind)), blockedKinds };
}

export function routeOf(hash: string): Route {
  const [path, query] = hash.replace(/^#/, "").split("?");
  const [, kind, scope] = (path || "/").split("/");
  if (kind === "settings" || kind === "join") return { destination: "join", scope: null };
  if (kind === "invitation" || kind === "config" || kind === "start" || kind === "rules" || kind === "devices") return { destination: kind, scope: null };
  if (kind === "commons") return { destination: "commons", scope: scope ?? null };
  if (kind === "issue" && scope) return { destination: "issues", scope };
  if (kind === "change" && scope) return { destination: "changes", scope };
  return { destination: new URLSearchParams(query).get("kind") === "change" ? "changes" : "issues", scope: null };
}

/** Membership incarnation and device key are part of a room's reading context. */
export function roomContext(origin: string, place: { directory: string; membership: { scope: string; genesis: string } }, key: string): string {
  return JSON.stringify([origin, place.directory, place.membership.scope, place.membership.genesis, key]);
}

/** Share pending reads and reuse completed rooms only while their identity remains usable. */
export class RoomOpening<T> {
  private current: { key: string; value: Promise<T>; result?: { value: T } } | null = null;
  constructor(private readonly reusable: (value: T) => boolean) {}
  clear(): void { this.current = null; }
  get(key: string, load: () => Promise<T>): Promise<T> {
    if (this.current?.key === key && (!this.current.result || this.reusable(this.current.result.value))) return this.current.value;
    const pending: NonNullable<RoomOpening<T>["current"]> = { key, value: load() };
    this.current = pending;
    void pending.value.then(value => { pending.result = { value }; }, () => { if (this.current === pending) this.current = null; });
    return pending.value;
  }
}

export type SendingState = "preparing" | "submitting" | "unknown";
/** One mutation per room/member/scope. An attempted request is never replaced after an unknown outcome. */
export class ScopeSending {
  private states = new Map<string, { kind: string; state: SendingState; digest?: string }>();
  get(key: string): { kind: string; state: SendingState; digest?: string } | undefined { return this.states.get(key); }
  begin(key: string, kind: string): boolean {
    if (this.states.has(key)) return false;
    this.states.set(key, { kind, state: "preparing" });
    return true;
  }
  /** `digest` names the request, so that an answer to another request lifts no fence. */
  submitting(key: string, digest: string): void {
    const current = this.states.get(key);
    if (current?.state === "preparing") { current.state = "submitting"; current.digest = digest; }
  }
  answered(key: string): void { this.states.delete(key); }
  failed(key: string): void {
    const current = this.states.get(key);
    if (current?.state === "preparing") this.states.delete(key);
    else if (current) current.state = "unknown";
  }
}

/** Why this page holds no read session: membership's refusal, or `no-reply`, and how long a rate limit says to wait. */
export interface NoSession { why: string; retryAfterSeconds?: number }

const waitOf = (seconds?: number): string => seconds === undefined ? "a few minutes" : seconds < 120 ? `${seconds} second${seconds === 1 ? "" : "s"}` : `${Math.ceil(seconds / 60)} minutes`;

/**
 * The cause and the next step of a read refused because the page holds no session. The refusal alone says neither.
 * Membership answers `sessions-unavailable` before it reads the request, so on such a service a member's key and a
 * stranger's key get these same words. Where the service issues sessions, a stranger's key gets `unauthorized` and a
 * member's active key gets a session. So only `unauthorized` speaks of the key's standing.
 */
export function noSessionWords({ why, retryAfterSeconds }: NoSession): string {
  switch (why) {
    case "no-reply": return "The service did not give a usable answer to this page's request for a read session. Reload this page to try again.";
    case "rate-limited": return `This key has asked for too many read sessions. Wait ${waitOf(retryAfterSeconds)}, then reload this page.`;
    case "sessions-unavailable": return "This service is not giving read sessions to any key, so it did not check whether this key belongs to the room. Without a session, the room opens only for a key that signed there recently. Ask whoever runs this service to turn on read sessions, then reload this page.";
    case "unauthorized": return "This key is not an active key of a member of this room, so the service gave it no read session. Ask someone in the room for a new invitation link, then join with it.";
    case "not-found": case "misaddressed": return "This connection does not match an active room on this service, so the service gave this key no read session. Ask someone in the room for a new invitation link, then join with it.";
    case "clock-behind": return "The service's clock is behind, so it gave no read session. Reload this page later to try again.";
    case "expired": case "bad-request": return "The service refused this page's request for a read session. This device's clock may be wrong. Check its date and time, then reload this page.";
    default: return `The service refused this page's request for a read session (${why}). Reload this page to try again.`;
  }
}

/** Why a failed read has no session behind it, or null: every other failure keeps its own words. */
export const noSessionOf = (error: unknown): NoSession | null => error instanceof Error ? (error as Error & { noSession?: NoSession | null }).noSession ?? null : null;

/** What a form shows for a failed open. */
export function failureText(error: unknown, otherwise: string): string {
  const noSession = noSessionOf(error);
  return noSession ? noSessionWords(noSession) : error instanceof Error ? error.message : otherwise;
}

/**
 * Initialization guidance is shown only for positive native absence evidence. A room open on signed reads
 * may not reach its rules, so there an unknown state says why the page holds no session.
 */
export function initializationMessage(state: "not-initialized" | "configured" | "unknown", unsessioned: string | null = null): string | null {
  if (state === "not-initialized") return "This room is not initialized yet. Its creator initializes it before issues, changes and rules can be used.";
  return state === "unknown" && unsessioned !== null ? `The complete rules could not be read. ${noSessionWords({ why: unsessioned })}` : null;
}
