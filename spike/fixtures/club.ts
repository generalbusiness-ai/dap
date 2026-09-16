// The Club package: the kinds of the spike plan's §4.2 policy, declared
// with their audiences, capability contracts and roles so that binding
// identities exist. This file is the predeclared surface; the fold,
// projection and affordances are V5's, authored by an agent from the
// manifest. Until then every event is unhandled.
//
// Audiences are role-derived: the committee is whoever holds `vote` at
// the position, asked of the audience context. The model opts in to
// ambient system events (`ambient: true`) so it folds disclosures and
// can tell which applications were shown to whom.

import { descriptorId, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { MEMBERS, named, type EventBody } from '../src/types.ts';

const NS = 'com.example.club.';

export interface ClubState {
  // authored in V5
  placeholder?: true;
}

export const clubModel: ModelSpec<ClubState, { quorum: number }> = {
  id: 'club',
  config: { quorum: 2 },
  ambient: true,
  init: () => ({}),
  roles: {
    Member: [NS + 'member'],
    Committee: [NS + 'vote', NS + 'admit'],
    Treasurer: [NS + 'set_standing'],
  },
  fold(state, _event: EventBody) {
    return { effective: false, state, reason: 'unhandled' };
  },
};

/** The applicant and whoever is on the committee at this position. */
function applicantAndCommittee(ctx: { holders(capability: string): string[] }, ev: EventBody) {
  return named(ev.actor, ...ctx.holders(NS + 'vote'));
}
/** The member concerned and the committee. */
function memberAndCommittee(ctx: { holders(capability: string): string[] }, ev: EventBody) {
  const p = ev.payload;
  const member = p && typeof p === 'object' && !Array.isArray(p) && typeof (p as { member?: unknown }).member === 'string' ? (p as { member: string }).member : ev.actor;
  return named(ev.actor, member, ...ctx.holders(NS + 'vote'));
}
const membersAudience = () => MEMBERS;

const base: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.club',
  module: import.meta.url,
  models: { club: clubModel as unknown as ModelSpec },
  capabilities: [NS + 'member', NS + 'vote', NS + 'admit', NS + 'set_standing'],
  kinds: {
    [NS + 'apply']: { kind: NS + 'apply', schema: { statement: 'string' }, handlers: ['club'], audienceId: 'applicant+committee', audience: applicantAndCommittee },
    [NS + 'vote']: { kind: NS + 'vote', schema: { application_id: 'string', choice: 'yes|no' }, handlers: ['club'], audienceId: 'members', audience: membersAudience, capability: NS + 'vote' },
    [NS + 'admit']: { kind: NS + 'admit', schema: { application_id: 'string' }, handlers: ['club'], audienceId: 'members', audience: membersAudience, capability: NS + 'admit' },
    [NS + 'standing']: { kind: NS + 'standing', schema: { member: 'string', standing: 'good|lapsed' }, handlers: ['club'], audienceId: 'members', audience: membersAudience, capability: NS + 'set_standing' },
    [NS + 'standing_reason']: { kind: NS + 'standing_reason', schema: { member: 'string', text: 'string' }, handlers: ['club'], audienceId: 'member+committee', audience: memberAndCommittee, capability: NS + 'set_standing' },
  },
};

export const clubPackage: PackageDescriptor = { id: descriptorId(base), ...base };
export const CLUB = NS;
