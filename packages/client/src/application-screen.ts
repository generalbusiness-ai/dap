/** Browser entry metadata and invitation binding for an installed screen.
 * These values route native reads and acts; they grant no authority. */
import type { Digest, KeyId, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isKeyId, isMemberRef, LATE, parseStrictBytes, takeBytes, within } from "@generalbusiness/dap-bytes";
import { readApplicationScreenAddress, readApplicationScreenContext } from "./application-route.ts";
import { APPLICATION_SCREEN_HOST_PATH, applicationScreenHostMatches, bindApplicationScreenHost, isApplicationSandboxOrigin, readApplicationScreenHost, type ApplicationScreenHost } from "./application-gateway.ts";
import type { ApplicationScreenContext } from "./application-types.ts";
import { readBrowserInvitation, type Invited as BrowserInvitation, type Seat as BrowserJoinSeat } from "./browser-joining.ts";
import type { Fetch } from "./http.ts";
// The portable client needs only this standard URL surface.
declare const URL: new (url: string) => { origin: string; pathname: string; search: string; username: string; password: string; protocol: string };

/** Null only outside the generic application route. A matching route whose
 * metadata is unavailable or mismatched fails closed. No session is requested. */
export async function loadApplicationScreenContext(page: string, options: { fetch?: Fetch } = {}): Promise<ApplicationScreenContext | null> {
  const url = new URL(page), address = readApplicationScreenAddress(url.pathname);
  if (!address && !url.pathname.startsWith("/applications/")) return null;
  const unavailable = () => new Error("This installed application's room context is unavailable.");
  if (!address || url.search || url.username || url.password || !["https:", "http:"].includes(url.protocol)) throw unavailable();
  const send = options.fetch ?? (globalThis as { fetch?: Fetch }).fetch;
  if (!send) throw unavailable();
  const answer = await within(10, async signal => {
    const init = { method: "GET", headers: { accept: "application/json" }, signal: signal as never, redirect: "error", credentials: "omit" };
    let host: ApplicationScreenHost | undefined;
    if (isApplicationSandboxOrigin(url.origin)) {
      const response = await send(url.origin + APPLICATION_SCREEN_HOST_PATH, init);
      const bytes = response.body ? await takeBytes(response.body, 4096, signal) : null;
      if (response.status !== 200 || bytes === null || bytes === LATE) throw unavailable();
      host = readApplicationScreenHost(parseStrictBytes(bytes));
      if (host.screenOrigin !== url.origin || !applicationScreenHostMatches(host, url.pathname)) throw unavailable();
    }
    const response = await send(url.origin + address.base + "_/context", init);
    const bytes = response.body ? await takeBytes(response.body, 16 * 1024, signal) : null;
    if (response.status !== 200 || bytes === null || bytes === LATE) throw unavailable();
    const context = readApplicationScreenContext(parseStrictBytes(bytes), address, host?.roomOrigin ?? url.origin);
    if (host) bindApplicationScreenHost(context, host);
    return context;
  });
  if (answer === LATE) throw unavailable();
  return answer;
}

/** The private invitation must name this screen's exact native siblings. */
export function readApplicationInvitation(context: ApplicationScreenContext, text: string): BrowserInvitation {
  const invited = readBrowserInvitation(text, { origin: context.origin, membershipDefinition: context.membershipDefinition });
  if (!invited.ok) return invited;
  const repository = invited.link.repository;
  return canonicalize(repository.directory) === canonicalize(context.directory) && canonicalize(repository.membership) === canonicalize(context.membership)
    && repository.rules === context.rules.scope && repository.destination === context.destination.scope
    ? invited : { ok: false, reason: "This invitation belongs to another room." };
}
export interface ApplicationDeviceIdentity {
  readonly origin: string; readonly deployment: string; readonly definition: Digest; readonly scope: ScopeRef;
  readonly membership: ScopeRef; readonly member: MemberRef; readonly publicKey: KeyId;
}
/** Bind an enrolled seat to this exact application. Native sessions and acts
 * still check the key's current membership and permissions. */
export function applicationDeviceIdentity(context: ApplicationScreenContext, seat: BrowserJoinSeat, publicKey: KeyId): ApplicationDeviceIdentity {
  const member = { membership: context.membership, member: seat.handle };
  if (seat.origin !== context.origin || canonicalize(seat.directory) !== canonicalize(context.directory) || canonicalize(seat.membership) !== canonicalize(context.membership)
    || !isKeyId(publicKey) || !isMemberRef(member)) throw Error("The enrolled device does not match this installed application.");
  return Object.freeze({ origin: context.origin, deployment: context.deployment, definition: context.definition, scope: context.scope,
    membership: context.membership, member: Object.freeze(member), publicKey });
}
