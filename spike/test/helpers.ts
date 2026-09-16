import { nonce } from '../src/canon.ts';
import { Context } from '../src/context.ts';
import { CAP, K } from '../src/foundation.ts';
import type { EventBody, Principal } from '../src/types.ts';
import { SALE, salePackage } from '../fixtures/sale.ts';

export const ALICE = 'alice';
export const BOB = 'bob';
export const CAROL = 'carol';
export const IVAN = 'ivan';

export const ALICE_CAPS = [CAP.invite, CAP.attach, CAP.grant, CAP.disclose, CAP.close];

export function listing(actor: Principal = ALICE, referent = 'guitar-1', ask = 800): EventBody {
  return { kind: SALE + 'listing', payload: { referent, ask }, actor, nonce: nonce() };
}

export function saleContext(opts: { grants?: { principal: string; roles?: string[]; capabilities?: string[] }[]; origins?: EventBody[] } = {}): Context {
  return Context.create({
    creator: ALICE,
    packages: { [salePackage.id]: salePackage },
    bindings: [{ package: salePackage.id }],
    grants: opts.grants ?? [{ principal: ALICE, roles: ['Seller'], capabilities: ALICE_CAPS }],
    origins: opts.origins ?? [listing()],
    referents: ['guitar-1'],
    route: 'route:test',
  });
}

/** Issue a one-use invitation; returns the invite's position. */
export function invite(ctx: Context, inviter: Principal, invitee: Principal, roles: string[] = ['Buyer']): number {
  const r = ctx.act(inviter, K.invite, { invitee, grants: { principal: invitee, roles }, token_id: 'token:' + nonce() });
  if ('refused' in r) throw new Error('invite refused: ' + r.reason);
  return r.header.position;
}

/** Redeem the invitation at `invitePos` as `invitee`. No credential: the token admits. */
export function accept(ctx: Context, invitee: Principal, invitePos: number, action_id?: string) {
  const ev = ctx.intent(invitee, K.accept_invite, ctx.inviteEnvelope(invitePos) as never, action_id ? { action_id } : {});
  return { event: ev, result: ctx.submit(ev) };
}
