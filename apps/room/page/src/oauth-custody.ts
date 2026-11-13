/** One retained consent operation. Invitation snapshots and control meanings
 * survive unknown answers. Browser custody never exports the signing key. */
import type { MemberRef, SignedControl } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isKeyId, isMemberRef, isRecord, isScopeRef, parseStrict, same, timeMs, utf8, verifyControl } from "@generalbusiness/dap-bytes";
import { agentKeyInvitationOf, type AgentKeyInvitation } from "@generalbusiness/dap-client";
import { issueOwnAgentInvitation, type Config, type Store } from "@generalbusiness/dap-cli/browser";
import { custodyKind, closedCustodyRecord as closed, type CustodyStorage } from "./custody.ts";
import { currentOAuth, oauthCallback, oauthConnectedClients, oauthControl, postOAuthControl, type OAuthAuthorization, type OAuthSelection } from "./oauth-context.ts";
import type { ClaimLocks } from "./claim.ts";

type State = "inviting" | "ready" | "unknown" | "done" | "refused";
interface Grant { agent: string | null; path: string; body: string; attempts: SignedControl[]; attempted: boolean }
interface Row {
  operation: string; authorization: OAuthAuthorization; actor: string; controller: MemberRef;
  native: "own" | "prepared" | "existing"; handle: string; config: Config;
  private: Record<string, string>; agent: string | null; link: string | null; grant: Grant | null; state: State; reason?: string;
}
interface Journal { v: 1; binding: string; active: string; rows: Record<string, Row> }
export interface OAuthOriginal { operation: string; state: State; client: string; handle: string; controller: MemberRef; agent: string | null; canCheck: boolean; reason?: string; resume: string; matches?: boolean }
export interface OAuthConsentOptions { mode: "new" | "check" | "continue"; locks?: ClaimLocks; handle?: string; preparedLink?: string; pause?: (waiting: readonly string[]) => Promise<void> }
export interface OAuthConsentResult extends Omit<OAuthOriginal, "resume"> { redirect?: string }
const unavailable = () => new Error("The original connection is unavailable or changed. No replacement was created.");
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const agentId = (value: unknown): value is string | null => value === null || typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
function permittedController(selection: OAuthSelection, controller: MemberRef): boolean {
  return same(controller.membership, selection.room.membership) && (same(controller, selection.controller) || selection.room.me!.actions.includes("membership.manage"));
}
/** The display and the grant use the same checked invitation context. Native
 * authority still checks the invitation and the signer's live standing. */
export function preparedOAuthInvitation(selection: OAuthSelection, text: string): AgentKeyInvitation {
  currentOAuth(selection);
  const invitation = agentKeyInvitationOf(text.trim());
  if (!invitation || invitation.service !== selection.origin || !same(invitation.repository.membership, selection.room.membership)) throw new Error("Enter a valid agent invitation for this room.");
  if (!permittedController(selection, invitation.controller)) throw new Error("This agent has another controller. Ask an admin to connect it, or use an invitation controlled by you.");
  return invitation;
}
function resume(row: Row): string {
  const b = row.authorization.binding, query = new URLSearchParams({ response_type: "code", client_id: b.client_id, redirect_uri: b.redirect_uri, code_challenge: b.code_challenge, code_challenge_method: "S256", resource: b.resource, scope: "mcp", state: row.authorization.state });
  return row.authorization.issuer + "/oauth/authorize?" + query.toString();
}
function publicRow(row: Row): OAuthOriginal { return { operation: row.operation, state: row.state, client: row.authorization.binding.client_id, handle: row.handle, controller: structuredClone(row.controller), agent: row.agent, canCheck: row.grant === null, ...(row.reason ? { reason: row.reason } : {}), resume: resume(row) }; }
function decode(raw: string, binding: string): Journal {
  const parsed = parseStrict(raw);
  if (!closed(parsed, ["v", "binding", "active", "rows"]) || parsed["v"] !== 1 || parsed["binding"] !== binding || !uuid(parsed["active"]) || !isRecord(parsed["rows"]) || Object.keys(parsed["rows"]).length > 16 || !Object.hasOwn(parsed["rows"], parsed["active"])) throw unavailable();
  const journal = parsed as unknown as Journal;
  for (const [operation, row] of Object.entries(journal.rows)) {
    if (!uuid(operation) || !closed(row, ["operation", "authorization", "actor", "controller", "native", "handle", "config", "private", "agent", "link", "grant", "state"], ["reason"]) || row.operation !== operation || !isKeyId(row.actor) || !isMemberRef(row.controller)
      || !["own", "prepared", "existing"].includes(row.native) || typeof row.handle !== "string" || utf8(row.handle).length > 256 || !["inviting", "ready", "unknown", "done", "refused"].includes(row.state)
      || row.reason !== undefined && (typeof row.reason !== "string" || row.reason.length > 2048) || !agentId(row.agent) || row.link !== null && (typeof row.link !== "string" || utf8(row.link).length > 48 * 1024)
      || !isRecord(row.config) || row.config.v !== 2 || row.config.key !== "browser" || !row.config.repository || !isScopeRef(row.config.repository.membership) || !same(row.controller.membership, row.config.repository.membership)
      || !isRecord(row.private) || Object.keys(row.private).length > 32 || Object.entries(row.private).some(([name, bytes]) => !/^i-[0-9a-f]{30}$/.test(name) || typeof bytes !== "string" || utf8(bytes).length > 64 * 1024)) throw unavailable();
    const authorization = row.authorization, b = authorization?.binding;
    if (!closed(authorization, ["issuer", "client", "binding", "state"]) || typeof authorization.state !== "string" || utf8(authorization.state).length > 2048 || authorization.issuer !== row.config.service
      || !closed(b, ["client_id", "redirect_uri", "code_challenge", "resource", "scope", "state_digest"]) || b.scope !== "mcp" || b.state_digest !== digestBytes(utf8(authorization.state))
      || !closed(authorization.client, ["client_id", "client_name", "redirect_uris", "token_endpoint_auth_method"]) || authorization.client.client_id !== b.client_id || !Array.isArray(authorization.client.redirect_uris) || !authorization.client.redirect_uris.includes(b.redirect_uri)) throw unavailable();
    if (row.link !== null) {
      const link = agentKeyInvitationOf(row.link);
      if (!link || link.service !== row.config.service || !same(link.repository.membership, row.controller.membership) || !same(link.controller, row.controller) || link.handle !== row.handle) throw unavailable();
    }
    if (row.grant) {
      const grant = row.grant;
      if (!closed(grant, ["agent", "path", "body", "attempts", "attempted"]) || !agentId(grant.agent) || grant.path !== (grant.agent === null ? "/mcp/agents/grant" : `/mcp/agents/${grant.agent}/grant`) || typeof grant.attempted !== "boolean"
        || grant.body !== canonicalize({ ...b, ...(grant.agent === null ? { link: row.link } : {}) }) || grant.agent === null && row.link === null || !Array.isArray(grant.attempts) || grant.attempts.length < 1 || grant.attempts.length > 8) throw unavailable();
      for (const signed of grant.attempts) if (!closed(signed, ["request", "sig"]) || !verifyControl(signed) || signed.request.action !== "grant" || signed.request.service !== row.config.service || signed.request.actor !== row.actor || !same(signed.request.membership, row.controller.membership) || signed.request.agent !== grant.agent || signed.request.op !== operation || signed.request.body !== digestBytes(utf8(grant.body))) throw unavailable();
    }
  }
  return journal;
}
const custody = custodyKind<Journal, OAuthOriginal>({ kind: "connection", prefix: "artroom-oauth-connection-1", most: 512 * 1024, unavailable, bindingOf: row => row.binding, decode, publicOf: row => publicRow(row.rows[row.active]!), readBack: "clone" });
export function originalOAuthConnection(selection: OAuthSelection, storage: CustodyStorage, authorization?: OAuthAuthorization): OAuthOriginal | null {
  currentOAuth(selection);
  const journal = custody.read(selection.binding, storage); if (!journal) return null;
  const row = journal.rows[journal.active]!;
  if (row.actor !== selection.signer.key || row.authorization.issuer !== selection.origin || row.config.service !== selection.origin || !same(row.config.repository?.membership, selection.room.membership) || !permittedController(selection, row.controller)) throw unavailable();
  return { ...publicRow(row), ...(authorization ? { matches: same(row.authorization.binding, authorization.binding) && row.authorization.state === authorization.state } : {}) };
}

export async function consentOAuth(selection: OAuthSelection, authorization: OAuthAuthorization, storage: CustodyStorage, options: OAuthConsentOptions): Promise<OAuthConsentResult> {
  if (authorization.issuer !== selection.origin) throw unavailable();
  const locks = options.locks ?? (globalThis as { navigator?: { locks?: ClaimLocks } }).navigator?.locks;
  if (!locks) throw new Error("This browser cannot keep the original connection safely. Use a browser with Web Locks.");
  return locks.request("artroom-oauth-connection:" + selection.binding, async () => {
    currentOAuth(selection);
    let journal = custody.read(selection.binding, storage), row: Row;
    const base: Config = { v: 2, service: selection.origin, key: "browser", handle: selection.room.me!.handle,
      repository: { directory: selection.room.directoryIndex!.scope, membership: selection.room.membership, rules: selection.room.rules, destination: selection.room.destination } };
    for (const stored of Object.values(journal?.rows ?? {})) {
      const { invitationIssue: _pointer, ...configuration } = stored.config;
      if (stored.actor !== selection.signer.key || !same(configuration, base) || !permittedController(selection, stored.controller)) throw unavailable();
    }
    const write = (next: Row): void => {
      currentOAuth(selection);
      const before = journal ? canonicalize(journal) : null;
      if (storage.getItem(custody.keyOf(selection.binding)) !== before) throw unavailable();
      journal = custody.write({ v: 1, binding: selection.binding, active: next.operation, rows: { ...(journal?.rows ?? {}), [next.operation]: next } }, storage, { current: selection.current });
      row = structuredClone(journal.rows[next.operation]!);
    };
    if (options.mode === "new") {
      const active = journal?.rows[journal.active];
      if (active && !["done", "refused"].includes(active.state)) throw new Error("An original connection is unfinished. Continue it before allowing another.");
      if (Object.keys(journal?.rows ?? {}).length >= 16) throw new Error("This browser's connection history is full. No original was removed.");
      const prepared = options.preparedLink !== undefined ? preparedOAuthInvitation(selection, options.preparedLink) : null;
      const controller = prepared?.controller ?? selection.controller;
      const connections = await oauthConnectedClients(selection, controller);
      const existing = connections.find(connection => connection.client_id === authorization.binding.client_id && connection.state === "enrolled");
      let native: Row["native"] = "existing", handle = existing?.handle ?? options.handle ?? "", link: string | null = null;
      if (!existing) {
        if (!prepared && !selection.room.me!.actions.includes("membership.own-agent")) throw new Error("Enter an agent invitation for this room, prepared by an admin.");
        if (!prepared) native = "own";
        else {
          native = "prepared"; link = options.preparedLink?.trim() ?? null;
          handle = prepared.handle;
        }
      }
      row = { operation: crypto.randomUUID(), authorization: structuredClone(authorization), actor: selection.signer.key, controller: structuredClone(controller), native, handle, config: structuredClone(base), private: {}, agent: existing?.agent ?? null, link, grant: null, state: native === "own" ? "inviting" : "ready" };
      write(row);
    } else {
      if (!journal) throw new Error("This browser has no original connection to continue.");
      row = structuredClone(journal.rows[journal.active]!);
      if (!same(row.authorization.binding, authorization.binding) || row.authorization.state !== authorization.state) throw new Error("A previous authorization is unfinished. Resume that original request.");
    }
    if (row.state === "done" || row.state === "refused") return publicRow(row);
    if (row.native === "own" && row.link === null) {
      const store: Store = {
        config: async () => structuredClone(row.config),
        save: async config => { const { invitationIssue: _pointer, ...configuration } = config; if (!same(configuration, base) || config.invitationIssue?.operation !== row.operation) throw unavailable(); write({ ...row, config: structuredClone(config) }); },
        signer: async name => name === "browser" ? selection.signer : null,
        secret: async () => { throw new Error("Browser signing keys cannot be exported."); }, keep: async () => { throw unavailable(); },
        private: async name => row.private[name] === undefined ? null : utf8(row.private[name]!),
        keepPrivate: async (name, bytes) => {
          if (Object.hasOwn(row.private, name)) throw unavailable();
          const value = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
          write({ ...row, private: { ...row.private, [name]: value } });
        },
      };
      const result = await issueOwnAgentInvitation({ store, fetch: selection.fetch, now: selection.now, ...(options.pause ? { pause: options.pause } : {}) },
        { handle: row.handle, hours: 1, controller: row.controller }, { operation: row.operation, privateRequests: Object.keys(row.private), mode: options.mode === "new" ? "new" : options.mode, current: selection.current });
      if (result.state !== "verified") {
        write({ ...row, state: result.state === "refused" ? "refused" : "unknown", ...(result.reason ? { reason: result.reason } : {}) });
        return publicRow(row);
      }
      write({ ...row, state: "ready", link: result.link! });
    }
    if (options.mode === "check") return { ...publicRow(row), reason: row.grant ? "Continue the original request to ask for its outcome." : "The original invitation is ready. Continue to allow access." };
    if (!row.grant) {
      const body = canonicalize({ ...row.authorization.binding, ...(row.agent === null ? { link: row.link } : {}) });
      const signed = await oauthControl(selection, "grant", row.agent, body, row.operation);
      write({ ...row, grant: { agent: row.agent, path: row.agent === null ? "/mcp/agents/grant" : `/mcp/agents/${row.agent}/grant`, body, attempts: [signed], attempted: false } });
    }
    const previous = row.grant!.attempts.at(-1)!;
    if (timeMs(previous.request.notAfter)! <= selection.now() + 5000) {
      if (row.grant!.attempts.length >= 8) throw new Error("The original connection has reached its retry limit. Its records remain saved.");
      // Control identity excludes the deadline. Keep every earlier permission;
      // explicit Continue renews only that deadline, never Native enrollment.
      const signed = await oauthControl(selection, "grant", row.grant!.agent, row.grant!.body, row.operation);
      write({ ...row, grant: { ...row.grant!, attempts: [...row.grant!.attempts, signed] } });
    }
    write({ ...row, state: "unknown", grant: { ...row.grant!, attempted: true } });
    let response: Awaited<ReturnType<typeof postOAuthControl>>;
    try { response = await postOAuthControl(selection, row.grant!.path, row.grant!.body, row.grant!.attempts.at(-1)!); }
    catch { return publicRow(row); }
    if (response.status >= 500) return publicRow(row);
    if (response.status >= 400) { write({ ...row, state: "refused", reason: "This connection was refused. Check the room, invitation and your current role before trying again." }); return publicRow(row); }
    const agent = response.body["agent"], code = response.body["code"];
    if (typeof agent !== "string" || !/^[0-9a-f]{64}$/.test(agent) || response.body["state_digest"] !== row.authorization.binding.state_digest || typeof code !== "string" && response.body["codeShown"] !== true || typeof code === "string" && !new RegExp(`^${agent}\\.[A-Za-z0-9_-]{43}\\.[A-Za-z0-9_-]{43}$`).test(code)) return publicRow(row);
    // Keep only the single-disclosure receipt; the callback code stays in this
    // call's memory until navigation. No code or token enters browser storage.
    write({ ...row, agent, state: "done", ...(typeof code !== "string" ? { reason: "The previous authorization code was already shown. Allow a fresh grant for this connection." } : {}) });
    return { ...publicRow(row), ...(typeof code === "string" ? { redirect: oauthCallback(row.authorization, { code }) } : {}) };
  });
}
