// The Club package: the role-derived-audience plus retroactive-disclosure
// shape of the views note (cliffs 2 and 3), on the policy of spike plan
// §4.2 and the frozen manifest `manifests/club.md`.
//
// An application is private to its applicant and the committee at the
// position it was recorded; its id is the content id of the apply event.
// Votes, admits and standing are members' facts. A committee member
// granted `vote` after an application was recorded holds only its header
// until a `dap.disclose` shows it to them; disclosures are members' facts
// too, and the model folds them (`ambient: true`), so every member can tell
// who was shown which positions. Two rules span the partitions: quorum
// (an admit reads votes) and standing (a vote reads standing).
//
// The fold runs over each participant's own view, so its state holds only
// what that participant could read. Every rule therefore reads facts that
// every reader of the judged event saw, as far as the predeclared kinds
// allow:
//
// - `lapsed`, `already_voted`, `already_admitted`, `no_quorum` and
//   `no_majority` read standing, votes and admits: members' kinds. A
//   member who joins later holds only their headers, so the model declares
//   a dependency for newcomers (`config.joinDisclosure`, a design choice in
//   the baseline, after the Sale ledger's late-joiner finding): on every
//   join the founder discloses to the newcomer every effective vote, admit,
//   standing event and disclosure recorded before the join. None of those
//   carries an applicant, a statement or a reason.
// - `unknown_application` reads the application's position and the
//   committee at that position, which the apply's readers have, and the
//   disclosures since, which every member has. A reader who cannot see the
//   apply (a member with no role, the applicant of another application, or
//   the late committee member before their disclosure) knows the
//   application only by id from the votes and admits naming it. Such a
//   reader cannot map an id to a hidden position, so it estimates: the
//   voter is taken to have been on the committee when the application was
//   recorded unless an earlier effective vote or admit on it shows the
//   voter was not on the committee then; a voter shown to be late needs an
//   effective disclosure to them, before the vote, of a position the
//   reader cannot account for. The estimate never runs in the oracle, and
//   it is wrong in two shapes, recorded here before any checker run:
//   a late voter whose vote is the first effective mention of an
//   application recorded before their grant, and a late voter disclosed one
//   application who votes on another. Closing those needs the application's
//   position to be a members' fact (a stub kind, or the hidden header's
//   commitment, which is the id), neither of which this file may add.
// - A malformed application id (anything that is not a content id) is
//   `malformed` for every reader; the only ids in play are content ids, so
//   an unknown id never has to be judged from a payload alone.
// - An application is effective whenever it is well formed: an ineffective
//   application would be one its non-parties could not tell from an
//   effective one when judging the votes that name it.
//
// The declared effect (`config.effects`) has the founder's client grant
// Member to the applicant after an effective admit; the model cannot emit
// `dap.grant`. The declared disclosure policy lets a client widen an
// application only to a holder of `vote`, and otherwise only the public
// kinds and an attach, so no client under it widens an application or a
// reason beyond the privacy budget.
//
// The projection derives every row from the position of the event that
// produced it and shows it only when that position is visible to the
// principal; the applicant and the statement go only to readers of the
// apply, the reason only to readers of the standing_reason.

import { descriptorId, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { MEMBERS, named, type EventBody } from '../src/types.ts';

const NS = 'com.example.club.';
/** The system kind that shows earlier positions to recipients; folded here so the model knows who was shown what. */
const DISCLOSE = 'ai.generalbusiness.dap.disclose';
/** The system kind of an ambient fact; the Club has no clock and leaves it unhandled. */
const OBSERVE = 'ai.generalbusiness.dap.observe';
/** The system kind that installs a package; part of any disclosure's dependency closure. */
const ATTACH = 'ai.generalbusiness.dap.attach';

export interface Application {
  /** the content id of the apply event */
  id: string;
  position: number;
  applicant: string;
  statement: string;
  /** whoever held `vote` at the apply's position: the readers besides the applicant */
  committee: string[];
}

export interface Vote {
  id: string;
  voter: string;
  choice: 'yes' | 'no';
  position: number;
  /** whoever held `vote` at the vote's position */
  committee: string[];
}

export interface Admit {
  id: string;
  actor: string;
  position: number;
  committee: string[];
}

export interface StandingEvent {
  member: string;
  standing: 'good' | 'lapsed';
  position: number;
}

export interface Reason {
  member: string;
  text: string;
  position: number;
}

export interface Disclosure {
  position: number;
  to: string[];
  positions: number[];
}

export interface ClubState {
  /** effective applications this view could read, in position order */
  applications: Application[];
  /** effective votes, in position order */
  votes: Vote[];
  /** effective admits, in position order */
  admits: Admit[];
  /** effective standing events, in position order */
  standing: StandingEvent[];
  /** effective standing reasons this view could read, in position order */
  reasons: Reason[];
  /** effective disclosures, in position order */
  disclosures: Disclosure[];
}

export type ClubConfig = {
  quorum: number;
  /** the newcomer's backlog: the members' kinds and the disclosures, effective ones only */
  joinDisclosure: { by: 'founder'; kinds: string[]; effectiveOnly: true };
  /** what a client may disclose beyond an audience: an application only to a holder of `vote` */
  disclosurePolicy: { kinds: (string | { kind: string; to: string })[] };
  /** after an effective admit, the founder's client grants Member to the applicant */
  effects: { kind: string; grant: { roles: string[]; principalFrom: string } }[];
};

type Visible = (position: number) => boolean;

/** In the fold, everything in the state was read; only observe narrows. */
const everything: Visible = () => true;

const CONTENT_ID = /^sha256:[0-9a-f]{64}$/;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** An application id is the content id of an apply event; anything else is malformed. */
function isId(x: unknown): x is string {
  return typeof x === 'string' && CONTENT_ID.test(x);
}

function applicationOf(state: ClubState, id: string): Application | undefined {
  return state.applications.find((a) => a.id === id);
}

/** A member's standing before `before`: the latest visible effective standing event, good by default. */
function standingAt(state: ClubState, member: string, before: number, visible: Visible): 'good' | 'lapsed' {
  let standing: 'good' | 'lapsed' = 'good';
  for (const s of state.standing) if (s.member === member && s.position < before && visible(s.position)) standing = s.standing;
  return standing;
}

function votesOn(state: ClubState, id: string, before: number, visible: Visible): Vote[] {
  return state.votes.filter((v) => v.id === id && v.position < before && visible(v.position));
}

function admitOf(state: ClubState, id: string, before: number, visible: Visible): Admit | undefined {
  return state.admits.find((a) => a.id === id && a.position < before && visible(a.position));
}

/** Whether an effective disclosure before `before` showed `position` to `to`. */
function disclosedTo(state: ClubState, position: number, to: string, before: number, visible: Visible): boolean {
  return state.disclosures.some((d) => d.position < before && visible(d.position) && d.to.includes(to) && d.positions.includes(position));
}

/** The earliest effective vote or admit naming the id before `before`, with the committee at that position. */
function firstMention(state: ClubState, id: string, before: number): { position: number; committee: string[] } | undefined {
  let found: { position: number; committee: string[] } | undefined;
  for (const v of state.votes) if (v.id === id && v.position < before && (!found || v.position < found.position)) found = v;
  for (const a of state.admits) if (a.id === id && a.position < before && (!found || a.position < found.position)) found = a;
  return found;
}

/** The positions this view folded into the state: none of them can be an application it cannot see. */
function knownPositions(state: ClubState): Set<number> {
  const out = new Set<number>();
  for (const a of state.applications) out.add(a.position);
  for (const v of state.votes) out.add(v.position);
  for (const a of state.admits) out.add(a.position);
  for (const s of state.standing) out.add(s.position);
  for (const r of state.reasons) out.add(r.position);
  for (const d of state.disclosures) out.add(d.position);
  return out;
}

/**
 * Whether the voter had been shown the application before position
 * `before`: on the committee when it was recorded, or a recipient of an
 * effective disclosure of its position since. A view that cannot see the
 * apply estimates, as the header comment says; the oracle never estimates.
 */
function shown(state: ClubState, voter: string, id: string, before: number): boolean {
  const app = applicationOf(state, id);
  if (app) return app.committee.includes(voter) || disclosedTo(state, app.position, voter, before, everything);
  const first = firstMention(state, id, before);
  if (!first || first.committee.includes(voter)) return true;
  const known = knownPositions(state);
  return state.disclosures.some((d) => d.position < before && d.to.includes(voter) && d.positions.some((p) => p < first.position && !known.has(p)));
}

/** Whether the principal may vote on a visible application: shown to them, not admitted, not yet voted on by them. */
function votable(state: ClubState, p: string, app: Application, visible: Visible): boolean {
  if (!visible(app.position) || admitOf(state, app.id, Infinity, visible)) return false;
  if (!app.committee.includes(p) && !disclosedTo(state, app.position, p, Infinity, visible)) return false;
  return !votesOn(state, app.id, Infinity, visible).some((v) => v.voter === p);
}

function tally(votes: Vote[]): { yes: number; no: number } {
  return { yes: votes.filter((v) => v.choice === 'yes').length, no: votes.filter((v) => v.choice === 'no').length };
}

function refuse(state: ClubState, reason: string) {
  return { effective: false, state, reason };
}

function ok(state: ClubState) {
  return { effective: true, state };
}

export const clubModel: ModelSpec<ClubState, ClubConfig> = {
  id: 'club',
  config: {
    quorum: 2,
    joinDisclosure: { by: 'founder', kinds: [NS + 'vote', NS + 'admit', NS + 'standing', DISCLOSE], effectiveOnly: true },
    disclosurePolicy: { kinds: [{ kind: NS + 'apply', to: NS + 'vote' }, NS + 'vote', NS + 'admit', NS + 'standing', DISCLOSE, ATTACH] },
    effects: [{ kind: NS + 'admit', grant: { roles: ['Member'], principalFrom: 'application_id' } }],
  },
  ambient: true,
  init: () => ({ applications: [], votes: [], admits: [], standing: [], reasons: [], disclosures: [] }),
  roles: {
    Member: [NS + 'member'],
    Committee: [NS + 'vote', NS + 'admit'],
    Treasurer: [NS + 'set_standing'],
  },
  fold(state, event: EventBody, ctx, config) {
    const kind = event.kind;
    const p = event.payload;
    switch (kind) {
      case OBSERVE:
        return refuse(state, 'unhandled');
      case DISCLOSE: {
        if (!isRecord(p) || !Array.isArray(p.positions) || !Array.isArray(p.to)) return refuse(state, 'malformed');
        const positions = p.positions.filter((i): i is number => Number.isInteger(i));
        const to = p.to.filter((r): r is string => typeof r === 'string');
        return ok({ ...state, disclosures: [...state.disclosures, { position: ctx.position, to, positions }] });
      }
      case NS + 'apply': {
        if (!isRecord(p) || typeof p.statement !== 'string') return refuse(state, 'malformed');
        const app: Application = { id: ctx.id, position: ctx.position, applicant: event.actor, statement: p.statement, committee: [...ctx.holders(NS + 'vote')].sort() };
        return ok({ ...state, applications: [...state.applications, app] });
      }
      case NS + 'vote': {
        if (!isRecord(p) || !isId(p.application_id) || (p.choice !== 'yes' && p.choice !== 'no')) return refuse(state, 'malformed');
        const id = p.application_id;
        // Members' facts first, so a refusal every reader can check is never replaced by an estimate.
        if (standingAt(state, event.actor, ctx.position, everything) === 'lapsed') return refuse(state, 'lapsed');
        if (votesOn(state, id, ctx.position, everything).some((v) => v.voter === event.actor)) return refuse(state, 'already_voted');
        if (!shown(state, event.actor, id, ctx.position)) return refuse(state, 'unknown_application');
        const vote: Vote = { id, voter: event.actor, choice: p.choice, position: ctx.position, committee: [...ctx.holders(NS + 'vote')].sort() };
        return ok({ ...state, votes: [...state.votes, vote] });
      }
      case NS + 'admit': {
        if (!isRecord(p) || !isId(p.application_id)) return refuse(state, 'malformed');
        const id = p.application_id;
        if (admitOf(state, id, ctx.position, everything)) return refuse(state, 'already_admitted');
        const votes = votesOn(state, id, ctx.position, everything);
        if (votes.length < config.quorum) return refuse(state, 'no_quorum');
        const { yes, no } = tally(votes);
        if (yes <= no) return refuse(state, 'no_majority');
        const admit: Admit = { id, actor: event.actor, position: ctx.position, committee: [...ctx.holders(NS + 'vote')].sort() };
        return ok({ ...state, admits: [...state.admits, admit] });
      }
      case NS + 'standing': {
        if (!isRecord(p) || typeof p.member !== 'string' || (p.standing !== 'good' && p.standing !== 'lapsed')) return refuse(state, 'malformed');
        const s: StandingEvent = { member: p.member, standing: p.standing, position: ctx.position };
        return ok({ ...state, standing: [...state.standing, s] });
      }
      case NS + 'standing_reason': {
        if (!isRecord(p) || typeof p.member !== 'string' || typeof p.text !== 'string') return refuse(state, 'malformed');
        const r: Reason = { member: p.member, text: p.text, position: ctx.position };
        return ok({ ...state, reasons: [...state.reasons, r] });
      }
      default:
        return refuse(state, 'unhandled');
    }
  },
  observe(_p, state, ctx) {
    const visible = ctx.visible;
    const ids = new Set<string>();
    for (const a of state.applications) ids.add(a.id);
    for (const v of state.votes) ids.add(v.id);
    for (const a of state.admits) ids.add(a.id);
    type Row = { id: string; position: number | null; applicant: string | null; statement: string | null; votes: { yes: number; no: number }; status: 'open' | 'admitted' };
    const rows: { first: number; row: Row }[] = [];
    for (const id of ids) {
      const app = applicationOf(state, id);
      const appVisible = app !== undefined && visible(app.position);
      const votes = votesOn(state, id, Infinity, visible);
      const admit = admitOf(state, id, Infinity, visible);
      const appearances = [...(appVisible ? [app.position] : []), ...votes.map((v) => v.position), ...(admit ? [admit.position] : [])];
      if (appearances.length === 0) continue;
      rows.push({
        first: Math.min(...appearances),
        row: {
          id,
          position: appVisible ? app.position : null,
          applicant: appVisible ? app.applicant : null,
          statement: appVisible ? app.statement : null,
          votes: tally(votes),
          status: admit ? 'admitted' : 'open',
        },
      });
    }
    rows.sort((a, b) => a.first - b.first);
    const standing: Record<string, 'good' | 'lapsed'> = {};
    for (const s of state.standing) if (visible(s.position)) standing[s.member] = s.standing;
    const reasons = state.reasons.filter((r) => visible(r.position)).map((r) => ({ member: r.member, text: r.text, position: r.position }));
    return { applications: rows.map((r) => r.row), standing, reasons };
  },
  affordances(p, state, ctx, config) {
    const visible = ctx.visible;
    const out: string[] = [];
    // Anyone who is not yet a member and has no open application may apply.
    const open = state.applications.some((a) => a.applicant === p && visible(a.position) && !admitOf(state, a.id, Infinity, visible));
    if (!ctx.holds(NS + 'member') && !open) out.push(NS + 'apply');
    if (ctx.holds(NS + 'vote') && standingAt(state, p, Infinity, visible) === 'good' && state.applications.some((a) => votable(state, p, a, visible))) out.push(NS + 'vote');
    if (ctx.holds(NS + 'admit')) {
      const ids = new Set<string>();
      for (const a of state.applications) ids.add(a.id);
      for (const v of state.votes) ids.add(v.id);
      const ready = [...ids].some((id) => {
        if (admitOf(state, id, Infinity, visible)) return false;
        const votes = votesOn(state, id, Infinity, visible);
        const { yes, no } = tally(votes);
        return votes.length >= config.quorum && yes > no;
      });
      if (ready) out.push(NS + 'admit');
    }
    if (ctx.holds(NS + 'set_standing')) out.push(NS + 'standing', NS + 'standing_reason');
    return out.sort();
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
