// Shared semantic types. Legacy visibility inputs trust the actor field;
// the O1 Journal boundary supplies codec-verified envelopes and headers.

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

/** Header fields, with an optional O1 sequencer signature. */
export interface Header {
  genesis: string;
  position: number;
  prev: string;
  commitment: string;
  /**
   * For an application event: the position of the attach (or genesis, 0)
   * that produced the binding the sequencer judged the event under. Public
   * metadata like the position itself; it names a position, never a
   * package. A viewer who cannot see that position cannot judge the event.
   */
  activation?: number;
  /**
   * For an attach: the positions of the attaches (or genesis, 0) whose
   * installed models and bindings this attach builds on, as the sequencer
   * resolved it. A viewer who cannot see one of them cannot judge the
   * attach, nor anything judged under the binding it produces.
   */
  requires?: number[];
  /** O1 writer signature; excluded from the header hash preimage. */
  seq_sig?: string;
}

export interface Entry {
  position: number;
  event: EventBody;
  /** Header commitment: legacy body id or O1 signed-envelope id. */
  id: string;
  header: Header;
  headerHash: string;
  /** Present only at the verified O1 boundary; legacy fixture entries retain body ids. */
  actorSig?: string;
  committed?: string;
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
