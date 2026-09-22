// T3 re-expressions. Original Sale and Club packages remain regression fixtures.
import type { Json } from '../src/canon.ts';
import { descriptorId, type FoldCtx, type ModelSpec, type ObligationDraft, type PackageDescriptor } from '../src/descriptor.ts';
import { K } from '../src/foundation.ts';
import { SPINE, type EventBody } from '../src/types.ts';
import { SALE, salePackage, saleModel } from './sale.ts';
import { CLUB, clubPackage, clubModel } from './club.ts';

export const SERVICE = 'com.example.obligations.serve';
export const SERVICE_ROLE = 'ObligationService';
const contract = 'manifests/t3-obligations-contract.md: public recipes; complete backlog and correct target actor are client assumptions';
const record = (x: unknown): x is Record<string, Json> => x !== null && typeof x === 'object' && !Array.isArray(x);

function discloseDraft(event: EventBody, ctx: FoldCtx, kinds: string[], blocks: string[], within?: number): ObligationDraft {
  return { role: SERVICE_ROLE, act: { kind: K.disclose, input: { recipe: 'backlog', to: event.actor, before: ctx.position, kinds } }, blocks, ...(within === undefined ? {} : { within }) };
}
function matches(owed: ObligationDraft, event: EventBody, ctx: FoldCtx): boolean {
  const input = owed.act.input;
  const p = event.payload;
  if (!record(input) || !record(p)) return false;
  if (input.recipe === 'backlog') {
    return Object.keys(p).every((k) => ['positions', 'to', 'obligation'].includes(k)) &&
      Array.isArray(p.to) && p.to.length === 1 && p.to[0] === input.to &&
      Array.isArray(p.positions) && new Set(p.positions).size === p.positions.length &&
      p.positions.every((i) => Number.isSafeInteger(i) && (i as number) >= 0 && (i as number) < (input.before as number));
  }
  if (input.recipe === 'grant-target') {
    // The target's private body is not exposed to readers of this public grant.
    // The performing client supplies the target actor; the form checks the
    // public operation shape. This limitation is exercised as a negative control.
    return Object.keys(p).every((k) => ['principal', 'roles', 'obligation'].includes(k)) &&
      typeof p.principal === 'string' && ctx.members.includes(p.principal) &&
      Array.isArray(p.roles) && p.roles.length === 1 && p.roles[0] === 'Member';
  }
  return false;
}

function reexpress(pkg: PackageDescriptor, model: ModelSpec, kinds: string[], blocks: string[], within?: number): PackageDescriptor {
  const { joinDisclosure: _join, effects: _effects, ...config } = model.config as Record<string, Json>;
  const next: ModelSpec = {
    ...model, config,
    roles: { ...model.roles, [SERVICE_ROLE]: [SERVICE] },
    obligations: {
      on: [K.accept_invite, ...(model.id === 'club' ? [CLUB + 'admit'] : [])], contract,
      thenOblige: (_state, event, ctx, cfg) => {
        const c = cfg as Record<string, Json>;
        const b = c.obligationBlocks as string[];
        const deadline = c.obligationWithin === null ? undefined : c.obligationWithin as number;
        if (event.kind === K.accept_invite) return [discloseDraft(event, ctx, c.obligationKinds as string[], b, deadline)];
        const payload = event.payload as Record<string, Json>;
        return [{ role: SERVICE_ROLE, act: { kind: K.grant, input: { recipe: 'grant-target', target: payload.application_id } }, blocks: b, ...(deadline === undefined ? {} : { within: deadline }) }];
      },
      matches,
    },
  };
  // All captured values are immutable declaration input, included in config.
  next.config = { ...config, obligationKinds: kinds, obligationBlocks: blocks, obligationWithin: within ?? null };
  const base = { name: pkg.name + '.obligations', module: import.meta.url, models: { [model.id]: next }, kinds: Object.fromEntries(Object.entries(pkg.kinds).map(([name, binding]) => [name, name === CLUB + 'admit' ? { ...binding, audienceId: 'obligation-public-admission', audience: () => SPINE } : binding])), capabilities: [...pkg.capabilities, SERVICE] };
  // Original fold/audience source is retained as explicit identity input.
  next.config = { ...next.config as Record<string, Json>, originalPackage: pkg.id };
  return { ...base, id: descriptorId(base) };
}

export function saleObligations(within?: number): PackageDescriptor {
  return reexpress(salePackage, saleModel as unknown as ModelSpec,
    [SALE + 'offer', SALE + 'withdraw', SALE + 'accept'],
    ['offer', 'offer_terms', 'withdraw', 'counter', 'accept'].map((s) => SALE + s), within);
}
export function clubObligations(within?: number): PackageDescriptor {
  return reexpress(clubPackage, clubModel as unknown as ModelSpec,
    [CLUB + 'vote', CLUB + 'admit', CLUB + 'standing', K.disclose],
    Object.keys(clubPackage.kinds), within);
}
