/**
 * A member's original requests, as a device reads and writes them at the
 * membership scope (notes/2026-10-31-signed-requests-across-devices.md). A
 * **copy** is the exact body of one `POST .../acts` request. Each route takes
 * the session in the `Authorization` header, and a copy holds no key and no
 * token.
 */
import type { Beside, Digest, Grant, KeyId, ScopeId, ScopeRef, SignedIntent, Timestamp } from "@generalbusiness/dap-contract";
import { LATE, intentDigest, isDigest, isKeyId, isRecord, isScopeRef, isSignedIntentShape, parseStrict, takeBytes, timeMs, verifySignedIntent, within } from "@generalbusiness/dap-bytes";
import type { Fetch } from "./http.ts";

/**
 * How far one device's clock can differ from a scope's, for a check of an
 * expired request. Nothing sends an unanswered request again until this long
 * past its `notAfter`. The contract states no bound.
 */
export const EXPIRY_MARGIN_MS = 60_000;
/** The route's bound on one body, which is the bound of `POST .../acts`. */
const BODY_BYTES = 1024 * 1024;
/** How long one route waits for a whole reply. */
const REPLY_SECONDS = 30;

/** The body of one act's request, as `POST .../acts` carries it and as a copy keeps it. */
export const actBody = (signed: SignedIntent, grants: readonly Grant[], beside: Beside = {}): { signed: SignedIntent; grants: readonly Grant[] } & Beside => ({ signed, grants, ...beside });
/** The exact bytes of that body. */
export const actBodyText = (signed: SignedIntent, beside: Beside = {}): string => JSON.stringify(actBody(signed, [], beside));

/** One open copy, without its body. */
export interface OriginalRow { digest: Digest; to: ScopeRef; kind: string; on: number | null; actor: KeyId; notAfter: Timestamp }
/** A copy's parts, after its signature and digest were verified. */
export interface OriginalRequest { digest: Digest; signed: SignedIntent & { intent: { to: ScopeRef } }; grants: readonly Grant[]; beside: Beside }

const BESIDE = ["texts", "presented", "values"] as const;

/** The request in a copy's bytes, or null: other than one verified request with empty grants, under that digest. */
export function originalRequest(bytes: string, digest: Digest): OriginalRequest | null {
  try {
    const value = parseStrict(bytes) as unknown;
    if (!isRecord(value) || !Object.keys(value).every(name => name === "signed" || name === "grants" || (BESIDE as readonly string[]).includes(name))) return null;
    const { signed, grants } = value;
    if (!Array.isArray(grants) || grants.length !== 0 || !isSignedIntentShape(signed) || signed.intent.to === null || !verifySignedIntent(signed) || intentDigest(signed.intent) !== digest) return null;
    // The page sends these again in the order it read them, so the second body is byte-identical.
    const beside = Object.fromEntries(Object.keys(value).filter(name => name !== "signed" && name !== "grants").map(name => [name, value[name]])) as Beside;
    return { digest, signed: signed as OriginalRequest["signed"], grants: [], beside };
  } catch { return null; }
}

/** The time from which an unanswered copy may be sent again, in milliseconds. */
export const sendableAt = (notAfter: Timestamp): number => timeMs(notAfter)! + EXPIRY_MARGIN_MS;

const isRow = (value: unknown): value is OriginalRow => isRecord(value) && isDigest(value["digest"]) && isScopeRef(value["to"]) && typeof value["kind"] === "string"
  && (value["on"] === null || Number.isSafeInteger(value["on"])) && isKeyId(value["actor"]) && typeof value["notAfter"] === "string" && timeMs(value["notAfter"]) !== null;

export type OriginalKeep = { ok: true } | { ok: false; reason: string };
export type OriginalList = { ok: true; rows: readonly OriginalRow[] } | { ok: false; reason: string };
export type OriginalRead = { ok: true; bytes: string } | { ok: false; reason: string };
export type OriginalEnd = { ok: true } | { ok: false; reason: string };

/** The four routes for one membership scope, under one session. A lost reply throws: its outcome is unknown. */
export function originalsAt(service: string, membership: ScopeId, reader: string, options: { fetch?: Fetch } = {}) {
  const base = `${service.replace(/\/+$/, "")}/v1/scopes/${encodeURIComponent(membership)}/originals`;
  const exchange = async (path: string, method: "GET" | "POST" | "DELETE", body?: string): Promise<{ status: number; text: string }> => {
    const send = options.fetch ?? (globalThis as { fetch?: Fetch }).fetch;
    if (!send) throw new Error("this runtime has no fetch; nothing was sent");
    const headers: Record<string, string> = { authorization: reader, ...(body === undefined ? {} : { "content-type": "application/json" }) };
    const got = await within(REPLY_SECONDS, async (signal) => {
      const response = await send(`${base}${path}`, { method, headers, ...(body === undefined ? {} : { body }), signal: signal as never });
      return { status: response.status, bytes: response.body ? await takeBytes(response.body, BODY_BYTES + 4096, signal) : new Uint8Array(0) };
    });
    if (got === LATE || got.bytes === LATE) throw new Error(`no whole reply within ${REPLY_SECONDS} seconds`);
    if (got.bytes === null) throw new Error("the reply exceeds its bound");
    return { status: got.status, text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(got.bytes as Uint8Array) };
  };
  const reasonOf = (reply: { status: number; text: string }): string => {
    try {
      const value = JSON.parse(reply.text) as unknown;
      if (isRecord(value) && typeof value["reason"] === "string") return value["reason"];
    } catch { /* A reply with no reason states its status alone. */ }
    return `status ${reply.status}`;
  };
  return {
    keep: async (bytes: string): Promise<OriginalKeep> => { const reply = await exchange("", "POST", bytes); return reply.status === 204 ? { ok: true } : { ok: false, reason: reasonOf(reply) }; },
    list: async (): Promise<OriginalList> => {
      const reply = await exchange("", "GET");
      if (reply.status !== 200) return { ok: false, reason: reasonOf(reply) };
      const value = JSON.parse(reply.text) as unknown;
      const rows = isRecord(value) ? value["value"] : null;
      return Array.isArray(rows) && rows.every(isRow) ? { ok: true, rows } : { ok: false, reason: "unavailable" };
    },
    read: async (digest: Digest): Promise<OriginalRead> => { const reply = await exchange(`/${encodeURIComponent(digest)}`, "GET"); return reply.status === 200 ? { ok: true, bytes: reply.text } : { ok: false, reason: reasonOf(reply) }; },
    end: async (digest: Digest): Promise<OriginalEnd> => { const reply = await exchange(`/${encodeURIComponent(digest)}`, "DELETE"); return reply.status === 204 ? { ok: true } : { ok: false, reason: reasonOf(reply) }; },
  };
}
