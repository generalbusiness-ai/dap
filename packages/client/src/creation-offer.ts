/** Fixed same-origin discovery for an explicitly configured demo register.
 * This projection grants nothing. The native signed found is still judged. */
import { answersCatalogVocabularyQuestion } from "@generalbusiness/dap-contract/catalog-vocabulary";
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";
import { LATE, isHead, isLocalId, isRecord, isScopeRef, parseStrict, takeBytes, utf8, within, type ByteStream } from "@generalbusiness/dap-bytes";
import { TransportError } from "./handle.ts";

interface CreationOfferBase {
  readonly origin: string;
  readonly register: ScopeRef;
  readonly at: Head;
}
interface CreationRegisterItem {
  readonly id: number; readonly revision: number; readonly state: "open";
  readonly host: string; readonly namespace: string; readonly policy: "open";
}
/** These native register pins have no purpose field; the offer invents none. */
export interface CurrentCreationOffer extends CreationOfferBase {
  readonly v: 2;
  readonly definition: "platform:register@17" | "platform:register@26" | "platform:register@28";
  readonly registerItem: CreationRegisterItem;
}
export type CreationOffer = CurrentCreationOffer;
export type CreationOfferFetch = (url: string, init: {
  method: "GET"; redirect: "error"; credentials: "omit"; cache: "no-store";
  headers: Record<string, string>; signal: never;
}) => Promise<{ status: number; url: string; redirected: boolean; body: ByteStream | null }>;
const MOST = 16 * 1024;
const failed = () => new TransportError("The same-origin creation offer is unavailable or invalid. No claim was submitted.");
const closed = (value: unknown, fields: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
/** URL is provided by the fetch runtimes; no DOM library or ambient types are added. */
function exactOrigin(value: string): string {
  const Url = (globalThis as { URL?: new (url: string) => { origin: string; protocol: string; username: string; password: string; pathname: string; search: string; hash: string } }).URL;
  if (!Url || typeof value !== "string" || /[\x00-\x20\x7f-\x9f]/.test(value)) throw failed();
  const url = new Url(value), origin = value.replace(/\/+$/, "");
  const location = (globalThis as { location?: { origin: string } }).location;
  if (!["https:", "http:"].includes(url.protocol) || origin !== url.origin || url.username || url.password || url.pathname !== "/" || url.search || url.hash || location && location.origin !== origin) throw failed();
  return origin;
}
/** Closed data and exact context, not provenance or permission for a later act. */
export function isCreationOffer(value: unknown, origin: string, register?: ScopeRef): value is CreationOffer {
  try {
    const expectedOrigin = exactOrigin(origin);
    if (!closed(value, ["v", "origin", "register", "definition", "at", "registerItem"]) || value["origin"] !== expectedOrigin || (value["v"] !== 2 || !answersCatalogVocabularyQuestion(value["definition"], "clientCreationOfferRegister"))
      || !closed(value["register"], ["scope", "genesis"]) || !isScopeRef(value["register"])
      || !closed(value["at"], ["seq", "hash"]) || !isHead(value["at"])) return false;
    const ref = value["register"], at = value["at"], item = value["registerItem"];
    if (register && (ref.scope !== register.scope || ref.genesis !== register.genesis)) return false;
    return closed(item, ["id", "revision", "state", "host", "namespace", "policy"])
      && isLocalId(item["id"]) && isLocalId(item["revision"]) && item["revision"] >= 1 && item["id"] <= item["revision"] && item["revision"] <= at.seq + 1
      && item["state"] === "open" && item["policy"] === "open"
      && typeof item["host"] === "string" && utf8(item["host"]).length > 0 && utf8(item["host"]).length <= 256
      && typeof item["namespace"] === "string" && utf8(item["namespace"]).length > 0 && utf8(item["namespace"]).length <= 256;
  } catch { return false; }
}
/** One current same-origin projection, not permission to create. */
export function isCurrentCreationOffer(value: unknown, origin: string, register?: ScopeRef): value is CurrentCreationOffer {
  return isCreationOffer(value, origin, register);
}
/** One anonymous GET for a current register, optionally selected by exact reference. */
export async function creationOffer(origin: string, options: { fetch?: CreationOfferFetch; register?: ScopeRef } = {}): Promise<CreationOffer> {
  try {
    if (options.register && (!closed(options.register, ["scope", "genesis"]) || !isScopeRef(options.register))) throw failed();
    const endpoint = `${exactOrigin(origin)}/v1/demo/creation-offer${options.register ? `?register=${encodeURIComponent(options.register.scope)}&genesis=${encodeURIComponent(options.register.genesis)}` : ""}`;
    const send = options.fetch ?? (globalThis as { fetch?: CreationOfferFetch }).fetch;
    if (!send) throw failed();
    const bytes = await within(30, async signal => {
      const response = await send(endpoint, { method: "GET", redirect: "error", credentials: "omit", cache: "no-store", headers: { accept: "application/json" }, signal: signal as never });
      if (response.status !== 200 || response.redirected !== false || response.url !== endpoint || !response.body) { await response.body?.getReader().cancel(); throw failed(); }
      return takeBytes(response.body, MOST, signal);
    });
    if (bytes === LATE || bytes === null) throw failed();
    const value: unknown = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
    if (!isCreationOffer(value, origin, options.register)) throw failed();
    return value;
  } catch { throw failed(); }
}
