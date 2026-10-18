/** Canonical bounded projection requests/replies. These forms authenticate
 * no viewer; a native read owner owes authorization and coverage. */
import { APPLICATION_PROJECTION_REFUSALS, APPLICATION_PROJECTION_WIRE_BOUNDS as B, type ApplicationProjectionData, type ApplicationProjectionQuery, type ApplicationProjectionRead } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, isDigest, isFieldValue, isHead, isRecord, isScopeRef, parseStrict, parseStrictBytes, unb64url, utf8 } from "./index.ts";
import type { Digest } from "@generalbusiness/dap-contract";
import { applicationJson } from "./application-json.ts";
const whole = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
const name = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value);
const projectionName = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(value);
const only = (value: object, keys: string) => Object.keys(value).sort().join() === keys;
function freeze(value: unknown): void {
  if (value !== null && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
}
function query(value: unknown): value is ApplicationProjectionQuery {
  return isRecord(value) && only(value, "directory,install,items,projection,scope,v") && value["v"] === 1
    && isScopeRef(value["scope"]) && isScopeRef(value["directory"]) && value["directory"].kind === "directory"
    && whole(value["install"]) && projectionName(value["projection"]) && isRecord(value["items"])
    && Object.keys(value["items"]).length <= B.sources && Object.entries(value["items"]).every(([key, id]) => name(key) && whole(id));
}
export function encodeApplicationProjectionQuery(value: ApplicationProjectionQuery): string | null {
  try { const raw = applicationJson(value, B.queryBytes), owned = parseStrict(raw); return query(owned) ? b64url(utf8(raw)) : null; }
  catch { return null; }
}
export function readApplicationProjectionQuery(encoded: unknown): ApplicationProjectionQuery | null {
  if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > B.encodedChars || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const bytes = unb64url(encoded); if (!bytes || bytes.length > B.queryBytes || b64url(bytes) !== encoded) return null;
    const value: unknown = parseStrictBytes(bytes);
    if (!query(value) || b64url(utf8(applicationJson(value, B.queryBytes))) !== encoded) return null;
    freeze(value); return value;
  } catch { return null; }
}
export function applicationProjectionQueryDigest(value: ApplicationProjectionQuery): Digest | null {
  const encoded = encodeApplicationProjectionQuery(value), owned = readApplicationProjectionQuery(encoded);
  return owned ? digestBytes(utf8("dap-application-projection-query-1\n" + canonicalize(owned))) : null;
}
function data(value: unknown): value is ApplicationProjectionData {
  if (!isRecord(value) || !only(value, "at,projection,scope,sources,v") || value["v"] !== 1 || !isDigest(value["projection"])
    || !isHead(value["at"]) || !isScopeRef(value["scope"]) || !isRecord(value["sources"])) return false;
  const sources = Object.entries(value["sources"]);
  return sources.length > 0 && sources.length <= B.sources && sources.every(([key, rows]) => name(key) && Array.isArray(rows) && rows.length <= B.rows
    && rows.every((row: unknown, i: number) => isRecord(row) && only(row, "fields,id,revision,state,type") && whole(row["id"]) && whole(row["revision"])
      && typeof row["type"] === "string" && name(row["type"]) && name(row["state"]) && (i === 0 || rows[i - 1].id < row["id"])
      && isRecord(row["fields"]) && Object.keys(row["fields"]).length <= B.fields
      && Object.entries(row["fields"]).every(([key, field]) => name(key) && (field === null || isFieldValue(field)))));
}
export function isApplicationProjectionRead(value: unknown): value is ApplicationProjectionRead {
  if (!isRecord(value)) return false;
  return value["ok"] === true ? only(value, "ok,query,value") && isDigest(value["query"]) && data(value["value"])
    : value["ok"] === false && only(value, "ok,reason") && APPLICATION_PROJECTION_REFUSALS.some(reason => reason === value["reason"]);
}
/** Bytes are capped before strict parsing; materialized data is owned before
 * recursive record checks. Shape is not authorization or journal coverage. */
export function readApplicationProjectionReply(bytes: Uint8Array, query?: ApplicationProjectionQuery): ApplicationProjectionRead | null {
  if (!(bytes instanceof Uint8Array) || bytes.length > B.resultBytes) return null;
  try {
    const value: unknown = parseStrictBytes(bytes);
    if (!isApplicationProjectionRead(value) || canonicalize(value) !== new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes)) return null;
    if (value.ok && query && (value.query !== applicationProjectionQueryDigest(query) || canonicalize(value.value.scope) !== canonicalize(query.scope))) return null;
    applicationJson(value, B.resultBytes); freeze(value); return value;
  } catch { return null; }
}
