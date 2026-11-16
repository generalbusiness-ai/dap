/**
 * A read session, as a device holds one (authority note, sections 3.9 and
 * 5.3). A session is a credential for the reads of one repository. It
 * signs nothing: the device's key signs every act, and no act presents a
 * session. A session also reaches its member's original requests at
 * membership (`originals.ts`): it reads, delivers and deletes them, and it
 * can make one only of a request that its key signed. The unsigned parts can
 * differ, and the scope verifies them when they are sent. This grants nothing.
 *
 * - **Asking.** The device signs a session request with its own key, to the
 *   repository's membership scope with its incarnation, and sends it in a
 *   request's body. A key that is revoked is refused a new session. A
 *   request is answered with a session once: after a lost reply the device
 *   signs a new request, with a new operation identity.
 * - **Holding.** The token is kept in memory, in a `Session`. Nothing here
 *   writes it to storage, to a URL, to an error or to a log. `toJSON` and
 *   the text form of a `Session` leave it out.
 * - **Presenting.** `reader()` is the value of the `Authorization` header,
 *   which a transport sets from memory. It is what a `ScopeHandle` is given
 *   as its reader.
 * - **Standing.** A device that passes `standing: true` asks with
 *   `?standing=1` and may get its own standing beside the session: the value
 *   that membership made when it issued the session, with its head. The
 *   reader keeps the value with the token, or keeps no value. An answer with
 *   three members, from a Worker that ignores the option, gives a session
 *   with no standing. Without the option the request has no query, as
 *   before: a screen in the application sandbox asks without it, because
 *   its gateway allows no query on this route.
 * - **Ending.** `ends` is the end time that membership's clock wrote. A
 *   scope judges it on its own clock, so this device's clock decides
 *   nothing: `endedBy` says only whether to ask again. A session is not
 *   renewed: a new one needs a new signed request.
 *
 * Reading a stream, and its cleanup in the client, is the client pages'
 * (I5), by the proof plan's key O12.
 */

import { SESSION_DOMAINS } from "@generalbusiness/dap-contract";
import { answersVersionQuestion, platform } from "@generalbusiness/dap-platform";
import type { Signer } from "./intent.ts";
import type { KeyId, ObservationAnswer, ScopeId, ScopeRef, SessionAnswer, SessionClaims, SessionRefusal, SessionRequest, SignedSessionRequest, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalBytes, parseStrictBytes, taggedBytes, LATE, isHead, isKeyId, isMemberId, isScopeRef, keyIdOfSecret, same, signSessionRequest, takeBytes, timeMs, within } from "@generalbusiness/dap-bytes";
import { TransportError } from "./handle.ts";
import { REPLY_SECONDS, type Fetch } from "./http.ts";

/** A signed request for a read session of the repository whose membership scope is `to`. `operation`: a new identity for each request. */
export function sessionRequest(to: ScopeRef, secret: Uint8Array, notAfter: Timestamp, operation: string): SignedSessionRequest {
  const request: SessionRequest = { v: 1, to, actor: keyIdOfSecret(secret), action: "read-session", operation, notAfter };
  return signSessionRequest(request, secret);
}

/** Sign a detached read-session request through an asynchronous device signer. */
export async function signerSessionRequest(to: ScopeRef, signer: Signer, notAfter: Timestamp, operation: string): Promise<SignedSessionRequest> {
  const request = parseStrictBytes(canonicalBytes({ v: 1, to, actor: signer.key, action: "read-session", operation, notAfter } satisfies SessionRequest)) as SessionRequest;
  return { request, sig: await signer.sign(taggedBytes(SESSION_DOMAINS.request, canonicalBytes(request))) };
}

/** The signer's standing in membership, as a session answer carries it on request: one key's observation, with no `at`. */
export type SessionStanding = Extract<ObservationAnswer, { key: KeyId }>;

/** The members of a standing value, exactly. */
const STANDING_MEMBERS = ["of", "head", "key", "keyState", "member", "memberState", "role", "actions", "within", "controller", "controllerActive", "notAfter", "definition"];

/** What a standing value must agree with: the request's membership and key, and the claims of the same answer. */
export interface StandingBinding { readonly membership: ScopeRef; readonly key: KeyId }

/**
 * The standing that a session answer carries, or null. Each check refuses the whole value and leaves the session as it is:
 *
 * 1. The value has exactly the members of a key's observation, each of its form. It has no `at` and no end time. Whether its
 *    states make the caller eligible is the reader's to judge: this check is of form and agreement, and a value that states an
 *    inactive controller is a value.
 * 2. Its definition is a pinned platform membership that answers the session question: the one the issuing scope checks.
 * 3. Its key is the request's key and the claims' key; its member is the claims' member; its membership and incarnation, and
 *    the filter that it names, are the request's and the claims'.
 *
 * The service states it. No journal is checked here, and the token's MAC covers the claims only.
 */
export function sessionStanding(value: unknown, bound: StandingBinding, claims: SessionClaims): SessionStanding | null {
  if (!isObject(value)) return null;
  const names = Object.keys(value);
  if (names.length !== STANDING_MEMBERS.length || !STANDING_MEMBERS.every(name => Object.hasOwn(value, name))) return null;
  const { of, head, key, keyState, member, memberState, role, actions, within: filter, controller, controllerActive, notAfter, definition } = value;
  const formed = isScopeRef(of) && isHead(head) && isKeyId(key) && (keyState === "active" || keyState === "retired" || keyState === "compromised" || keyState === "unknown")
    && isMemberId(member) && (memberState === "active" || memberState === "removed")
    && typeof role === "string" && Array.isArray(actions) && actions.every(action => typeof action === "string")
    && isObject(filter) && Object.keys(filter).length === 1 && isScopeRef(filter["membership"])
    && (controller === null ? controllerActive === null : isMemberId(controller) && typeof controllerActive === "boolean") && notAfter === null;
  if (!formed || !(answersVersionQuestion(definition, "scopeSessionMembership") && platform(definition))) return null;
  if (!same(of, bound.membership) || !same(of, claims.membership) || !same(filter["membership"], of)
    || key !== bound.key || key !== claims.key || member !== claims.member) return null;
  return structuredClone(value) as unknown as SessionStanding;
}

/** A read session in memory. */
export class Session {
  readonly #token: string;
  /** What the token names: the repository, the member and key, the reads, and the end time. No part of it is a credential. */
  readonly claims: SessionClaims;
  /** The signer's standing that membership stated when it issued this session, or null: none was asked, given or accepted. */
  readonly standing: SessionStanding | null;

  constructor(token: string, claims: SessionClaims, standing: SessionStanding | null = null) {
    this.#token = token;
    this.standing = standing === null ? null : structuredClone(standing);
    this.claims = { v: claims.v, deployment: claims.deployment, membership: { scope: claims.membership.scope, genesis: claims.membership.genesis },
      member: claims.member, key: claims.key, reads: [...claims.reads], ends: claims.ends };
  }

  /** The value of the `Authorization` header: what a transport presents to the read port. */
  reader(): string { return `Session ${this.#token}`; }
  /** Whether this clock's reading is at or past the end time. A scope decides on its own clock; this says only when to ask again. */
  endedBy(now: Timestamp): boolean { return (timeMs(now) ?? Infinity) >= (timeMs(this.claims.ends) ?? 0); }
  /** The claims only: the token is never part of a session's JSON or text. */
  toJSON(): { claims: SessionClaims } { return { claims: this.claims }; }
  toString(): string { return `Session of ${this.claims.member} until ${this.claims.ends}`; }
}

const REFUSALS: Record<SessionRefusal, true> = { "sessions-unavailable": true, "bad-request": true, "not-found": true, misaddressed: true, "clock-behind": true, expired: true, unauthorized: true, replayed: true, "rate-limited": true };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Whether a reply is an answer to a session request, with what that answer must carry. A reply is untrusted until this has passed. */
export function isSessionAnswer(v: unknown): v is SessionAnswer {
  if (!isObject(v)) return false;
  if (v["ok"] === false) return Object.keys(v).length === 2 && typeof v["reason"] === "string" && Object.hasOwn(REFUSALS, v["reason"]);
  const claims = v["session"];
  // A fourth member is the standing, and only that. Its own checks are `sessionStanding`'s, which keep the session when they refuse it.
  const members = Object.keys(v).length;
  return v["ok"] === true && (members === 3 || members === 4 && Object.hasOwn(v, "standing")) && typeof v["token"] === "string" && v["token"].length <= 4096 && isObject(claims) && claims["v"] === 1
    && isObject(claims["membership"]) && isMemberId(claims["member"]) && isKeyId(claims["key"]) && Array.isArray(claims["reads"]) && claims["reads"].every((read) => typeof read === "string")
    && timeMs(claims["ends"]) !== null;
}

/** The most raw bytes of an answer to a session request. */
const ANSWER_BYTES = 16 * 1024;

/**
 * Ask a membership scope for a read session over the scope service's HTTP
 * route. The signed request travels in the body, and the token comes back
 * in the answer's body: neither is ever in a URL. The one query option,
 * `standing=1`, asks for the signer's standing beside the session. It is
 * sent only when `options.standing` is true.
 *
 * A session, or the reason that membership gave none. A reply that is no
 * answer, that names another repository or member key, or that does not
 * come in time is a `TransportError`,
 * whose text holds nothing of the reply.
 */
export async function requestSession(service: string, membership: ScopeId, signed: SignedSessionRequest, options: { fetch?: Fetch; seconds?: number; standing?: true } = {}): Promise<{ ok: true; session: Session } | { ok: false; reason: SessionRefusal; retryAfterSeconds?: number }> {
  const send = options.fetch ?? (globalThis as { fetch?: Fetch }).fetch;
  if (!send) throw new TransportError("this runtime has no fetch; nothing was sent");
  const seconds = options.seconds ?? REPLY_SECONDS;
  const failed = (what: string) => new TransportError(`${what}. No session was taken; a new signed request may be sent.`);
  let got: { bytes: Uint8Array | null | typeof LATE; status: number; retryAfter: string | null } | typeof LATE;
  try {
    got = await within(seconds, async (signal) => {
      const response = await send(`${service.replace(/\/+$/, "")}/v1/scopes/${encodeURIComponent(membership)}/sessions${options.standing === true ? "?standing=1" : ""}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(signed), signal: signal as never });
      const header = response.headers?.get("retry-after");
      return { bytes: response.body ? await takeBytes(response.body, ANSWER_BYTES, signal) : new Uint8Array(0), status: response.status,
        retryAfter: typeof header === "string" && header.length <= 16 ? header : null };
    });
  } catch {
    throw failed("no reply");
  }
  if (got === LATE || got.bytes === LATE) throw failed(`no whole reply within ${seconds} seconds`);
  if (got.bytes === null) throw failed("the reply is too long and was not read");
  let answer: unknown;
  try {
    answer = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(got.bytes));
  } catch {
    answer = null;
  }
  if (!isSessionAnswer(answer)) throw failed("the reply is not an answer to a session request");
  if (got.status === 429 && (answer.ok || answer.reason !== "rate-limited")) throw failed("the 429 reply is not a rate-limit refusal");
  if (!answer.ok) {
    const retry = got.status === 429 && answer.reason === "rate-limited" && got.retryAfter !== null && /^[1-9][0-9]{0,15}$/.test(got.retryAfter) ? Number(got.retryAfter) : null;
    return retry !== null && Number.isSafeInteger(retry) ? { ...answer, retryAfterSeconds: retry } : answer;
  }
  // The session must be the one that was asked for: of that membership scope and genesis hash, and for the key that signed.
  const { membership: of, key } = answer.session;
  if (of.scope !== signed.request.to.scope || of.genesis !== signed.request.to.genesis || key !== signed.request.actor) throw failed("the reply is a session of another repository or key");
  // The standing is kept only when it was asked for and passes every check. An answer without it, or with one that fails, is a session with no standing.
  const standing = options.standing === true && Object.hasOwn(answer, "standing")
    ? sessionStanding((answer as { standing?: unknown }).standing, { membership: signed.request.to, key: signed.request.actor }, answer.session) : null;
  return { ok: true, session: new Session(answer.token, answer.session, standing) };
}
