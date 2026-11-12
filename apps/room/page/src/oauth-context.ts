/** Consent uses the selected room and its existing nonextractable key. It
 * never adopts an address from saved settings or creates a browser key. */
import type { ControlAction, MemberRef, SignedControl } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, isKeyId, isRecord, isScopeId, isScopeRef, LATE, parseStrict, signControlWith, takeBytes, timeOf, utf8, within, type Expiry } from "@generalbusiness/dap-bytes";
import type { Fetch, Signer } from "@generalbusiness/dap-client";
import { openRoom, type Room } from "./data.ts";
import { pageKeyStore } from "./browser-key-store.ts";
import type { CustodyStorage } from "./custody.ts";

export interface OAuthBinding { client_id: string; redirect_uri: string; code_challenge: string; resource: string; scope: "mcp"; state_digest: string }
export interface OAuthAuthorization { issuer: string; client: { client_id: string; client_name: string; redirect_uris: string[]; token_endpoint_auth_method: "none" }; binding: OAuthBinding; state: string }
export interface OAuthSelection { origin: string; room: Room; signer: Signer; controller: MemberRef; binding: string; current(): boolean; fetch: Fetch; now(): number }
export interface OAuthContextOptions { fetch?: Fetch; now?: () => number; keys?: Pick<ReturnType<typeof pageKeyStore>, "load"> }
const changed = () => new Error("The selected room or browser key changed. Reopen this authorization from its client.");
export function currentOAuth(selection: OAuthSelection): void { if (!selection.current()) throw changed(); }

export async function loadOAuthAuthorization(origin: string, query: URLSearchParams, fetch: Fetch = globalThis.fetch.bind(globalThis) as Fetch): Promise<OAuthAuthorization> {
  const result = await within(30, async signal => {
    const response = await fetch(origin + "/oauth/authorize/context?" + query.toString(), { signal: signal as never });
    return { status: response.status, body: await oauthJson(response, signal) };
  });
  if (result === LATE) throw new Error("The authorization server did not answer. Try again from your client.");
  if (result.status !== 200) throw new Error("This authorization request, client or callback is not allowed.");
  const value = result.body, client = value["client"], binding = value["binding"], state = value["state"];
  if (Object.keys(value).length !== 4 || value["issuer"] !== origin || !isRecord(client) || !isRecord(binding)
    || Object.keys(client).length !== 4 || Object.keys(binding).length !== 6 || typeof state !== "string" || state !== query.get("state")
    || typeof client["client_name"] !== "string" || typeof client["client_id"] !== "string" || client["client_id"] !== query.get("client_id") || client["token_endpoint_auth_method"] !== "none"
    || !Array.isArray(client["redirect_uris"]) || !client["redirect_uris"].includes(query.get("redirect_uri"))
    || binding["client_id"] !== client["client_id"] || binding["redirect_uri"] !== query.get("redirect_uri") || binding["code_challenge"] !== query.get("code_challenge")
    || binding["resource"] !== query.get("resource") || binding["scope"] !== "mcp" || binding["state_digest"] !== digestBytes(utf8(state))) throw new Error("The authorization answer does not match this request.");
  return value as unknown as OAuthAuthorization;
}
/** Only a server-validated callback may receive an authorization response. */
export function oauthCallback(authorization: OAuthAuthorization, response: { code: string } | { error: string }): string {
  const url = new URL(authorization.binding.redirect_uri);
  for (const key of ["code", "error", "error_description", "state", "iss"]) url.searchParams.delete(key);
  if ("code" in response) url.searchParams.set("code", response.code); else url.searchParams.set("error", response.error);
  url.searchParams.set("state", authorization.state); url.searchParams.set("iss", authorization.issuer);
  return url.href;
}

export async function selectedOAuthRoom(origin: string, storage: CustodyStorage, options: OAuthContextOptions = {}): Promise<OAuthSelection> {
  const raw = storage.getItem("artroom-page:v2");
  if (raw === null || utf8(raw).length > 64 * 1024) throw new Error("Open this room in dap and select your browser key, then return here.");
  let kept: unknown;
  try { kept = parseStrict(raw); } catch { throw new Error("Open this room in dap and select your browser key, then return here."); }
  if (!isRecord(kept) || !isKeyId(kept["publicKey"]) || Object.hasOwn(kept, "secret") || !isRecord(kept["place"]) || !isScopeId(kept["place"]["directory"]) || !isScopeRef(kept["place"]["membership"]) || kept["place"]["membership"].kind !== "membership") throw new Error("Open this room in dap and select your browser key, then return here.");
  const browser = globalThis as { location?: { origin: string } };
  if (new URL(origin).origin !== origin || browser.location && browser.location.origin !== origin) throw changed();
  const current = () => storage.getItem("artroom-page:v2") === raw;
  const signer = await (options.keys ?? pageKeyStore()).load(kept["publicKey"]);
  if (!current() || signer.key !== kept["publicKey"]) throw changed();
  const fetch = options.fetch ?? globalThis.fetch.bind(globalThis) as Fetch, now = options.now ?? (() => Date.now());
  const room = await openRoom({ service: origin, signer, fetch, now }, { directory: kept["place"]["directory"], membership: kept["place"]["membership"] });
  if (!current() || room.key !== signer.key) throw changed();
  if (!room.me?.ref || !room.directoryIndex) throw new Error("This browser key is not an active member of the selected room.");
  const binding = digestBytes(utf8(canonicalize([origin, signer.key, room.membership, room.directory])));
  return { origin, room, signer, controller: room.me.ref, binding, current, fetch, now };
}

/** OAuth replies are small. A proxy error cannot allocate an unbounded body. */
export async function oauthJson(response: Awaited<ReturnType<Fetch>>, signal?: Expiry): Promise<Record<string, unknown>> {
  if (!response.body || Number(response.headers?.get("content-length") ?? 0) > 64 * 1024) throw new Error("The authorization server returned an unreadable answer.");
  const bytes = signal ? await takeBytes(response.body, 64 * 1024, signal) : await within(30, expiry => takeBytes(response.body!, 64 * 1024, expiry));
  if (bytes === null || bytes === LATE) throw new Error("The authorization server did not return a complete answer. Try again.");
  let value: unknown;
  try { value = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes)); } catch { throw new Error("The authorization server returned an unreadable answer."); }
  if (!isRecord(value)) throw new Error("The authorization server returned an unreadable answer.");
  return value;
}
export async function oauthControl(selection: OAuthSelection, action: ControlAction, agent: string | null, body: string, operation: string): Promise<SignedControl> {
  currentOAuth(selection);
  const signed = await signControlWith({ v: 1, action, service: selection.origin, membership: selection.room.membership, agent, actor: selection.signer.key, body: digestBytes(utf8(body)), op: operation, notAfter: timeOf(selection.now() + 60_000) }, selection.signer);
  currentOAuth(selection); return signed;
}
export async function postOAuthControl(selection: OAuthSelection, path: string, body: string, signed: SignedControl): Promise<{ status: number; body: Record<string, unknown> }> {
  currentOAuth(selection);
  const result = await within(30, async signal => {
    const response = await selection.fetch(selection.origin + path, { method: "POST", headers: { authorization: `Control ${b64url(utf8(canonicalize(signed.request)))}.${signed.sig}`, "content-type": "application/json" }, body, signal: signal as never });
    return { status: response.status, body: await oauthJson(response, signal) };
  });
  if (result === LATE) throw new Error("Connection status is unknown. Continue the original request.");
  currentOAuth(selection); return result;
}
export interface OAuthAgentConnection { agent: string; handle: string; client_id: string; created: string }
export async function oauthConnections(selection: OAuthSelection, controller?: MemberRef): Promise<OAuthAgentConnection[]> {
  const agents: OAuthAgentConnection[] = []; let after: string | null = null;
  for (let page = 0; page < 8; page++) {
    if (controller && canonicalize(controller.membership) !== canonicalize(selection.room.membership)) throw new Error("The agent belongs to another room.");
    const body = canonicalize({ after, ...(controller ? { controller: controller.member } : {}) }), signed = await oauthControl(selection, "connections", null, body, crypto.randomUUID());
    const answer = await postOAuthControl(selection, "/mcp/agents/connections", body, signed), rows = answer.body["agents"];
    if (answer.status !== 200 || !Array.isArray(rows) || rows.length > 8 || rows.some(row => !isRecord(row) || Object.keys(row).length !== 4 || typeof row["agent"] !== "string" || !/^[0-9a-f]{64}$/.test(row["agent"]) || typeof row["handle"] !== "string" || typeof row["client_id"] !== "string" || typeof row["created"] !== "string")) throw new Error("The existing connections could not be read. Try again before allowing access.");
    agents.push(...rows as OAuthAgentConnection[]);
    const next = answer.body["next"];
    if (next === null) return agents;
    if (typeof next !== "string" || !/^[0-9a-f]{64}$/.test(next) || next === after) break;
    after = next;
  }
  throw new Error("The connection list is incomplete. Try again before allowing access.");
}
export interface OAuthConnectedGrant { id: string; client_id: string; client_name: string; resource: string; controller: string; ends: number }
export interface OAuthConnectedAgent extends OAuthAgentConnection { state: string; grants: OAuthConnectedGrant[] }
export async function oauthConnectedClients(selection: OAuthSelection, controller?: MemberRef): Promise<OAuthConnectedAgent[]> {
  const connections = await oauthConnections(selection, controller), result: OAuthConnectedAgent[] = [];
  for (const connection of connections) {
    const body = "{}", signed = await oauthControl(selection, "connections", connection.agent, body, crypto.randomUUID());
    const response = await postOAuthControl(selection, `/mcp/agents/${connection.agent}/connections`, body, signed), rows = response.body["connections"];
    if (response.status !== 200 || typeof response.body["state"] !== "string" || !Array.isArray(rows) || rows.length > 8 || rows.some(row => !isRecord(row) || typeof row["id"] !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(row["id"]) || typeof row["client_id"] !== "string" || typeof row["client_name"] !== "string" || typeof row["resource"] !== "string" || typeof row["controller"] !== "string" || !Number.isSafeInteger(row["ends"]))) throw new Error("The existing connections could not be read. Try again before allowing access.");
    result.push({ ...connection, state: response.body["state"], grants: rows as OAuthConnectedGrant[] });
  }
  return result;
}
export async function revokeOAuthConnection(selection: OAuthSelection, agent: string, grant: string): Promise<void> {
  if (!/^[0-9a-f]{64}$/.test(agent) || !/^[A-Za-z0-9_-]{43}$/.test(grant)) throw new Error("This connection is unavailable.");
  const body = canonicalize({ grant });
  const operation = "oauth-revoke:" + digestBytes(utf8(canonicalize([selection.signer.key, selection.room.membership, agent, grant]))).slice("sha256:".length);
  const signed = await oauthControl(selection, "revoke-grant", agent, body, operation);
  const response = await postOAuthControl(selection, `/mcp/agents/${agent}/revoke-grant`, body, signed);
  if (response.status !== 200) throw new Error("Revocation is not confirmed. Check the connections before trying again.");
}
