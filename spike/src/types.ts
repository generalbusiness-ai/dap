// Shared types for the fixture. Inputs are verified entries: the actor
// field is trusted as given, and no signatures are checked here (spike
// plan §1, staged checker). O1 adds the codec.

import type { Json } from './canon.ts';

export type Principal = string;
export type Kind = string;

export const SYSTEM_PREFIX = 'ai.generalbusiness.dap.';

/** The event body. Origins and the genesis carry no genesis, action_id or expected_binding. */
export interface EventBody {
  kind: Kind;
  payload: Json;
  actor: Principal;
  nonce: string;
  genesis?: string;
  action_id?: string;
  expected_binding?: string;
  /** the position of the attach (or genesis, 0) that produced the expected binding: activation provenance */
  expected_activation?: number;
}

/** The authenticated header's preimage. The sequencer signature is O1's. */
export interface Header {
  genesis: string;
  position: number;
  prev: string;
  commitment: string;
}

export interface Entry {
  position: number;
  event: EventBody;
  /** content id of the event body: the header's commitment */
  id: string;
  header: Header;
  headerHash: string;
}

export type Audience =
  | { kind: 'spine' }
  | { kind: 'members' }
  | { kind: 'named'; principals: Principal[] };

export const SPINE: Audience = { kind: 'spine' };
export const MEMBERS: Audience = { kind: 'members' };
export function named(...principals: Principal[]): Audience {
  return { kind: 'named', principals: [...new Set(principals)].sort() };
}

/** The four distinct questions of design note §3, plus the pause. */
export interface Verdict {
  known: boolean;
  authorized: boolean;
  effective: boolean;
  reason?: string;
  perModel?: Record<string, { effective: boolean; reason?: string }>;
}

export interface Receipt {
  header: Header;
  headerHash: string;
  replay: boolean;
}

export interface Refusal {
  refused: true;
  reason: string;
}

export function isRefusal(x: Receipt | Refusal): x is Refusal {
  return (x as Refusal).refused === true;
}
