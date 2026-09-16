// The machine-readable part of the Club manifest (club.md): bounds, seeds,
// the cast and base context, invariants over recorded events and
// verdicts, the privacy budget over readable events and observations, and
// the generator's payload builders including late committee grants.
// Nothing here reads the candidate model's state shape: the manifest is
// written independently of the fold and frozen before the baseline. The
// manifest identity binds the prose and this module; the package under
// test is cited beside it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contentId } from '../src/canon.ts';
import { descriptorId, moduleHash, type PackageDescriptor } from '../src/descriptor.ts';
import { CAP, K, heldAt, type FoundationState } from '../src/foundation.ts';
import type { GeneratorSpec } from '../src/generate.ts';
import type { Observation } from '../src/observe.ts';
import type { Script, Step } from '../src/script.ts';
import { MEMBERS, type Entry, type EventBody, type Principal } from '../src/types.ts';
import { CLUB, clubPackage } from '../fixtures/club.ts';

export const clubBounds = { maxParticipants: 6, maxPositions: 60, seeds: Array.from({ length: 200 }, (_, i) => i + 1) };
export const QUORUM = 2;

const proseUrl = new URL('./club.md', import.meta.url);
export const CLUB_PROSE = readFileSync(fileURLToPath(proseUrl), 'utf8');

/** The experiment identity: the prose and this module. The package under test is cited separately. */
export const CLUB_MANIFEST_ID = contentId({ prose: contentId(CLUB_PROSE), executable: moduleHash(import.meta.url) });

export function proseBounds(): { maxParticipants: number; maxPositions: number; seeds: number[] } {
  const m = /At most (\d+) participants, at most (\d+) positions, seeds (\d+) to (\d+)/.exec(CLUB_PROSE);
  if (!m) throw new Error('club.md does not state its bounds');
  const from = Number(m[3]);
  const to = Number(m[4]);
  return { maxParticipants: Number(m[1]), maxPositions: Number(m[2]), seeds: Array.from({ length: to - from + 1 }, (_, i) => from + i) };
}

// ----- the cast and the base context -----

export const FOUNDER = 'alice';
export const BOB = 'bob';
export const CAROL = 'carol';
export const DANA = 'dana';
export const ERIN = 'erin';
export const FRANK = 'frank';
export const FOUNDER_CAPS = [CAP.invite, CAP.attach, CAP.grant, CAP.disclose, CAP.close];

/** The base every Club series starts from: the founder's genesis, the founder on the committee and treasurer. */
export function clubBase(pkg: PackageDescriptor = clubPackage): Script['base'] {
  return {
    creator: FOUNDER,
    packages: { [pkg.id]: pkg },
    bindings: [{ package: pkg.id }],
    grants: [{ principal: FOUNDER, roles: ['Committee', 'Treasurer', 'Member'], capabilities: FOUNDER_CAPS }],
    referents: ['the-club'],
    route: 'route:club',
  };
}

/** Bob and Carol join as committee members: positions 1 to 4 of every series. */
export function committeePrelude(): Step[] {
  return [
    { type: 'invite', inviter: FOUNDER, invitee: BOB, grants: { roles: ['Committee', 'Member'] } },
    { type: 'accept', invitee: BOB },
    { type: 'invite', inviter: FOUNDER, invitee: CAROL, grants: { roles: ['Committee', 'Member'] } },
    { type: 'accept', invitee: CAROL },
  ];
}

// ----- invariants over recorded events and the oracle's verdicts -----

function effective(state: FoundationState, i: number): boolean {
  return state.verdicts[i]?.effective === true;
}

/** Whether `p` was in good standing at `position`: no effective lapsed after the last effective good. */
function goodStandingAt(state: FoundationState, entries: readonly Entry[], p: Principal, position: number): boolean {
  let good = true;
  for (let i = 1; i < position && i < entries.length; i++) {
    const e = entries[i]!.event;
    if (e.kind !== CLUB + 'standing' || !effective(state, i)) continue;
    const pl = e.payload as { member?: string; standing?: string };
    if (pl.member === p) good = pl.standing === 'good';
  }
  return good;
}

/** The position at which `p` first held `vote`, from the grant history. */
function committeeSince(state: FoundationState, p: Principal, upTo: number): number | undefined {
  for (let i = 0; i <= upTo; i++) if (heldAt(state, p, CLUB + 'vote', i + 1)) return i;
  return undefined;
}

function disclosedTo(state: FoundationState, entries: readonly Entry[], position: number, to: Principal, before: number): boolean {
  for (let i = 1; i < before && i < entries.length; i++) {
    const e = entries[i]!.event;
    if (e.kind !== K.disclose || !effective(state, i)) continue;
    const p = e.payload as { positions?: number[]; to?: string[] };
    if (p.positions?.includes(position) && p.to?.includes(to)) return true;
  }
  return false;
}

/** Invariants of club.md, evaluated on the oracle's state and the recorded entries; they never read the model's state. */
export function clubInvariants(state: FoundationState, frontier: number, entries: readonly Entry[]): string[] {
  const out: string[] = [];
  const applications = new Map<string, { position: number; applicant: Principal }>();
  const votes = new Map<string, { voter: Principal; choice: string; position: number }[]>();
  const admitted = new Map<string, number>();
  let pendingGrant: { applicant: Principal; since: number } | undefined;
  for (let i = 0; i <= frontier && i < entries.length; i++) {
    const entry = entries[i]!;
    const e = entry.event;
    if (pendingGrant && e.kind === K.grant && effective(state, i)) {
      const g = e.payload as { principal?: string; roles?: string[] };
      if (g.principal === pendingGrant.applicant && g.roles?.includes('Member')) pendingGrant = undefined;
    }
    if (!e.kind.startsWith(CLUB)) continue;
    if (pendingGrant && effective(state, i)) {
      out.push(`admit at ${pendingGrant.since} of ${pendingGrant.applicant} was not followed by a Member grant before ${i}`);
      pendingGrant = undefined;
    }
    if (!effective(state, i)) continue;
    const p = e.payload as { application_id?: string; choice?: string };
    switch (e.kind) {
      case CLUB + 'apply':
        applications.set(entry.id, { position: i, applicant: e.actor });
        break;
      case CLUB + 'vote': {
        const id = p.application_id ?? '';
        const app = applications.get(id);
        if (!app) {
          out.push(`vote at ${i} on unknown application ${id}`);
          break;
        }
        if (!goodStandingAt(state, entries, e.actor, i)) out.push(`vote at ${i} by ${e.actor} while lapsed`);
        const since = committeeSince(state, e.actor, i);
        if (since !== undefined && since > app.position && !disclosedTo(state, entries, app.position, e.actor, i)) out.push(`vote at ${i} by ${e.actor}, on the committee since ${since}, without a disclosure of the application at ${app.position}`);
        const prior = votes.get(id) ?? [];
        if (prior.some((v) => v.voter === e.actor)) out.push(`second effective vote at ${i} by ${e.actor} on ${id}`);
        votes.set(id, [...prior, { voter: e.actor, choice: p.choice ?? '', position: i }]);
        break;
      }
      case CLUB + 'admit': {
        const id = p.application_id ?? '';
        const app = applications.get(id);
        if (!app) {
          out.push(`admit at ${i} of unknown application ${id}`);
          break;
        }
        if (admitted.has(id)) out.push(`second effective admit at ${i} of ${id} (first at ${admitted.get(id)})`);
        const vs = votes.get(id) ?? [];
        const yes = vs.filter((v) => v.choice === 'yes').length;
        const no = vs.filter((v) => v.choice === 'no').length;
        if (vs.length < QUORUM) out.push(`admit at ${i} with ${vs.length} votes, below quorum`);
        if (yes <= no) out.push(`admit at ${i} with ${yes} yes and ${no} no`);
        admitted.set(id, i);
        pendingGrant = { applicant: app.applicant, since: i };
        break;
      }
      default:
        break;
    }
  }
  return out;
}

// ----- the privacy budget over readable events and observations -----

/** The readers a private Club event may have at frontier n: the applicant or member concerned, and the committee at n. */
export function privateParties(view: readonly { position: number; event?: EventBody }[], i: number, state: FoundationState, n: number): Principal[] | undefined {
  const ev = view[i]?.event;
  if (!ev) return undefined;
  const committee = state.participants.filter((m) => heldAt(state, m, CLUB + 'vote', n + 1));
  if (ev.kind === CLUB + 'apply') return [ev.actor, ...committee];
  if (ev.kind === CLUB + 'standing_reason') {
    const member = (ev.payload as { member?: string } | null)?.member;
    return [ev.actor, ...(typeof member === 'string' ? [member] : []), ...committee];
  }
  return undefined;
}

export function clubBudgetViolations(obs: Observation, p: Principal, state: FoundationState, n: number, view: readonly { position: number; event?: EventBody }[]): string[] {
  const out: string[] = [];
  for (const v of view) {
    if (!v.event) continue;
    const parties = privateParties(view, v.position, state, n);
    if (parties && !parties.includes(p)) out.push(`${p} can read the ${v.event.kind.replace(/^com\.example\./, '')} at ${v.position}, whose parties are ${parties.join('+')}`);
  }
  const committee = heldAt(state, p, CLUB + 'vote', n + 1);
  const club = obs.models['club'] as { applications?: { id: string; applicant: string | null; statement: string | null }[]; reasons?: { member: string; position: number }[] } | undefined;
  for (const a of club?.applications ?? []) {
    if (!committee && a.applicant !== null && a.applicant !== p) out.push(`${p} sees the applicant of ${a.id}`);
    if (!committee && a.statement !== null && a.applicant !== p) out.push(`${p} sees the statement of ${a.id}`);
  }
  for (const r of club?.reasons ?? []) if (!committee && r.member !== p) out.push(`${p} sees the reason at ${r.position} for ${r.member}`);
  return out;
}

// ----- the generator's payload builders -----

function pick<T>(r: () => number, xs: T[]): T | undefined {
  return xs.length ? xs[Math.floor(r() * xs.length)] : undefined;
}

function applicationIds(entries: readonly Entry[]): string[] {
  return entries.filter((e) => e.event.kind === CLUB + 'apply').map((e) => e.id);
}

/** An unrelated package for the generator's narrow attach. */
const sideBase: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.side',
  models: {
    side: {
      id: 'side',
      config: {},
      init: () => ({ notes: [] }),
      fold: (s: { notes: number[] }, _ev: EventBody, ctx: { position: number }) => ({ effective: true, state: { notes: [...s.notes, ctx.position] } }),
      observe: (_p: Principal, s: { notes: number[] }, ctx: { visible(i: number): boolean }) => ({ notes: s.notes.filter((i) => ctx.visible(i)).length }),
    } as never,
  },
  capabilities: [],
  kinds: { 'com.example.side.note': { kind: 'com.example.side.note', schema: { text: 'string' }, handlers: ['side'], audienceId: 'members', audience: () => MEMBERS } },
};
export const sidePackage: PackageDescriptor = { id: descriptorId(sideBase), ...sideBase };

/** The generator spec for the Club campaign over a package under test. */
export function clubGeneratorSpec(pkg: PackageDescriptor): GeneratorSpec {
  return {
    base: clubBase(pkg),
    prelude: committeePrelude(),
    newcomers: [DANA, ERIN, FRANK],
    newcomerRoles: [],
    payloads: {
      [CLUB + 'apply']: (_r, { step }) => ({ statement: 'let me in ' + step }),
      [CLUB + 'vote']: (r, { entries }) => ({ application_id: pick(r, applicationIds(entries)) ?? 'none', choice: r() < 0.7 ? 'yes' : 'no' }),
      [CLUB + 'admit']: (r, { entries }) => ({ application_id: pick(r, applicationIds(entries)) ?? 'none' }),
      [CLUB + 'standing']: (r, { members }) => ({ member: pick(r, members) ?? FOUNDER, standing: r() < 0.5 ? 'lapsed' : 'good' }),
      [CLUB + 'standing_reason']: (r, { members, step }) => ({ member: pick(r, members) ?? FOUNDER, text: 'reason ' + step }),
      [K.grant]: (r, { members }) => ({ principal: pick(r, members) ?? FOUNDER, roles: ['Committee'] }),
      'com.example.side.note': (_r, { step }) => ({ text: 'note ' + step }),
    },
    sidePackage,
    ineffectiveRate: 0.06,
    weights: { [CLUB + 'apply']: 1.5, [CLUB + 'vote']: 2, [CLUB + 'admit']: 0.7, [CLUB + 'standing']: 0.4, [CLUB + 'standing_reason']: 0.3, [K.grant]: 0.15, 'com.example.side.note': 0.3 },
    bounds: { maxPositions: clubBounds.maxPositions, maxParticipants: clubBounds.maxParticipants },
  };
}
