/**
 * `@generalbusiness/dap-client/scope`: the client of one declared scope
 * (`notes/2026-11-13-scope-client.md`, section 11). This entry imports `@generalbusiness/dap-derive`.
 * The root entry does not import this one, so a page that uses only the
 * root entry does not load the fold and the judges.
 */

export { Replica, scopeReplica, intentMeaning } from "./replica.ts";
export type { Observe, ReplicaOptions, ReplicaState, ReplicaView, Row, SignedEntry, Stopped, TypeOf } from "./replica.ts";
export type { Judged, Judging } from "./replica-judged.ts";
export { UnheldEntry } from "./replica-own.ts";

import type { SignedIntent } from "@generalbusiness/dap-contract";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import type { Replica } from "./replica.ts";
import type { Judged, Judging } from "./replica-judged.ts";

/** The status of signed bytes at the replica's head (`notes/2026-11-13-scope-client.md`, section 9). */
export function judged<D extends DeclaredDefinition>(replica: Replica<D>, signed: SignedIntent, judging: Judging): Judged {
  return replica.judged(signed, judging);
}

export { scopeClient } from "./scope-client.ts";
export type { ScopeClient, ClientOptions, ClientView, ClientRow, DraftRead, PresentRequest, RequestView, ScopeMember } from "./scope-client.ts";
export { requestStatus } from "./request-status.ts";
export type { RequestStatus, RequestStatusAt, Why } from "./request-status.ts";
export type { ClientClock } from "./request-schedule.ts";
