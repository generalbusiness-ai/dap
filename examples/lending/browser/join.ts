/** Lending-specific browser joining and library discovery. Shared client
 * joining owns exact request custody; this adapter keeps the historical
 * membership pin and the application's own discovery/identity validation. */
import type { KeyId, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { ScopeHandle, httpTransport, requestSession, signerSessionRequest, storedWebCryptoSigner, generateBrowserDeviceKey,
  applicationDeviceIdentity, readApplicationInvitation, browserJoining, readBrowserInvitation, type ApplicationScreenContext, type BrowserJoining, type BrowserJoiningOptions, type Fetch, type Signer } from "@generalbusiness/dap-client";
import { LENDING_DEFINITION } from "../pin.ts";
import { memberForKey } from "./model.ts";
import type { LendingIdentity } from "./custody.ts";
import type { BrowserJoinSeat as Seat } from "@generalbusiness/dap-client";
export type { BrowserJoinSeat as Seat, BrowserInvitation as Invited, BrowserKeptJoin as KeptJoin, BrowserJoinStore as JoinStore, BrowserJoinOutcome as JoinOutcome, BrowserJoining as Joining } from "@generalbusiness/dap-client";
export const ROOM_MEMBERSHIP = "platform:membership@4";
export interface DeviceKey { publicKey: KeyId; pair: CryptoKeyPair }
export async function newDeviceKey(): Promise<DeviceKey> { return await generateBrowserDeviceKey() as DeviceKey; }
export function deviceSigner(device: DeviceKey): Signer { return storedWebCryptoSigner(device.publicKey, device.pair.privateKey); }
export const readInvitation = (text: string, origin: string, context?: ApplicationScreenContext) => context ? readApplicationInvitation(context, text) : readBrowserInvitation(text, { origin, membershipDefinition: ROOM_MEMBERSHIP });
export function joining(device: DeviceKey, options: Omit<BrowserJoiningOptions, "membershipDefinition"> & { membershipDefinition?: typeof ROOM_MEMBERSHIP | "platform:membership@7" | "platform:membership@8" }): BrowserJoining {
  return browserJoining(deviceSigner(device), { ...options, membershipDefinition: options.membershipDefinition ?? ROOM_MEMBERSHIP });
}

export type DiscoveryResult = { ok: true; identity: LendingIdentity } | { ok: false; reason: string };
/**
 * The room's lending scope, read from the room's directory with this device's own
 * session: the one application that the directory created under the lending pin.
 */
export async function findLending(seat: Seat, device: DeviceKey, options: { now?: () => number; fetch?: Fetch; deployment?: string; context?: ApplicationScreenContext } = {}): Promise<DiscoveryResult> {
  const context = options.context;
  if (context) {
    try { if (context.definition !== LENDING_DEFINITION) throw Error(); applicationDeviceIdentity(context, seat, device.publicKey); }
    catch { return { ok: false, reason: "This seat does not match the installed library." }; }
  }
  const signer = deviceSigner(device), now = options.now ?? (() => Date.now());
  const signed = await signerSessionRequest(seat.membership, signer, timeOf(now() + 60_000), b64url(crypto.getRandomValues(new Uint8Array(16))));
  const answer = await requestSession(seat.origin, seat.membership.scope, signed, options.fetch ? { fetch: options.fetch } : {});
  if (!answer.ok) return { ok: false, reason: `The room refused a read session: ${answer.reason}.` };
  const api = httpTransport(seat.origin, options.fetch ? { fetch: options.fetch } : {}), reader = answer.session.reader();
  const membership = await new ScopeHandle(api, seat.membership.scope, reader).summary();
  if (!membership.ok) return { ok: false, reason: `The room's membership could not be read: ${membership.reason}.` };
  if (!membership.complete || membership.next !== undefined || membership.value.definition !== (context?.membershipDefinition ?? ROOM_MEMBERSHIP) || canonicalize(membership.value.scope) !== canonicalize(seat.membership)) return { ok: false, reason: "The room's membership could not be confirmed for this history." };
  const member = memberForKey(membership.value, device.publicKey);
  if (!member) return { ok: false, reason: "The room did not confirm this device's active membership." };
  const read = await new ScopeHandle(api, seat.directory.scope, reader).summary();
  if (!read.ok) return { ok: false, reason: `The room's directory could not be read: ${read.reason}.` };
  if (context && (!read.complete || read.next !== undefined || canonicalize(read.value.scope) !== canonicalize(context.directory))) return { ok: false, reason: "The installed library directory could not be confirmed." };
  const scopes = lendingScopes(read.value).filter(scope => !context || canonicalize(scope) === canonicalize(context.scope));
  if (scopes.length !== 1) return { ok: false, reason: scopes.length === 0 ? "This room has no lending library." : "This room has more than one lending library." };
  return { ok: true, identity: { origin: seat.origin, deployment: context?.deployment ?? options.deployment ?? seat.origin, scope: scopes[0]!, definition: LENDING_DEFINITION,
    membership: seat.membership, member, publicKey: device.publicKey } };
}
/** The scopes of the directory's created applications that pin the lending definition. */
export function lendingScopes(directory: Summary): ScopeRef[] {
  return directory.items.filter((item) => item.type === "application" && item.state === "created" && item.values["definition"] === LENDING_DEFINITION)
    .map((item) => item.refs["scope"]).filter((ref): ref is ScopeRef => typeof ref === "object" && ref !== null && "scope" in ref && "inc" in ref);
}
