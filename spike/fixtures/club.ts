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
// - `unknown_application` reads the application's position, the committee
//   at that position and the disclosures since. A reader who cannot see
//   the apply (a member with no role, the applicant of another
//   application, the late committee member before their disclosure) knows
//   the application only by id from the votes and admits naming it. The id
//   is the content id of the apply event, and that is exactly the
//   commitment carried in the authenticated header of every position,
//   hidden or not (design note §1; views note, Serving a view), so the fold
//   asks the context for it (`ctx.commitmentAt`, fix 1) and finds the
//   position without reading the payload. The committee at that position
//   comes from the spine's grant history (`ctx.holdersAt`), which every
//   reader has. One rule then serves every reader: the voter held `vote`
//   at that position, or an effective disclosure before the vote named
//   that position with the voter as recipient.
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

import { descriptorId, type FoldCtx, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
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
}

export interface Admit {
  id: string;
  actor: string;
  position: number;
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

/** The position whose header commits to the id, before the position being folded: public in every view, hidden or not. */
function positionOf(ctx: FoldCtx, id: string): number | undefined {
  for (let i = 0; i < ctx.position; i++) if (ctx.commitmentAt(i) === id) return i;
  return undefined;
}

/**
 * Whether the voter had been shown the application before the position
 * being folded: on the committee when it was recorded, or a recipient of
 * an effective disclosure of its position since. Every reader judges this
 * the same way: the position comes from the chain's commitments, the
 * committee from the spine's grants, the disclosures from members' events.
 */
function shown(state: ClubState, ctx: FoldCtx, voter: string, id: string): boolean {
  const k = positionOf(ctx, id);
  if (k === undefined) return false;
  return ctx.holdersAt(NS + 'vote', k).includes(voter) || disclosedTo(state, k, voter, ctx.position, everything);
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
        if (!shown(state, ctx, event.actor, id)) return refuse(state, 'unknown_application');
        const vote: Vote = { id, voter: event.actor, choice: p.choice, position: ctx.position };
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
        const admit: Admit = { id, actor: event.actor, position: ctx.position };
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
