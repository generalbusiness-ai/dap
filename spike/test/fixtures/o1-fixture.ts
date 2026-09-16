import { createPrivateKey } from 'node:crypto';
import { principalOf, signEvent, envelopeBytes } from '../../src/codec.ts';
import { CAP, F0_ID, K, RUNTIME } from '../../src/foundation.ts';
import { Journal, O1_PROFILE_VERSION } from '../../src/journal.ts';
import type { Backend } from '../../src/append.ts';
import { salePackage, SALE } from '../../fixtures/sale.ts';
import type { EventBody } from '../../src/types.ts';
export function key(n: number) { return createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.alloc(32, n)]), format: 'der', type: 'pkcs8' }); }
export const keys = { alice: key(1), bob: key(2), carol: key(3), ivan: key(4), writer: key(5) };
export const people = Object.fromEntries(Object.entries(keys).map(([name, key]) => [name, principalOf(key)])) as Record<keyof typeof keys, string>;
export const packages = { [salePackage.id]: salePackage };
export function createJournal(backend: Backend, ask = 800) {
  const origin: EventBody = { actor: people.alice, nonce: '01'.repeat(16), kind: SALE + 'listing', payload: { referent: 'guitar-1', ask } };
  const genesis: EventBody = { actor: people.alice, nonce: '02'.repeat(16), kind: K.genesis, payload: {
    foundation: F0_ID, runtime: RUNTIME, sequencing: { profile: O1_PROFILE_VERSION, writer: people.writer },
    grants: [{ principal: people.alice, roles: ['Seller'], capabilities: [CAP.invite, CAP.attach, CAP.grant, CAP.disclose, CAP.close] }],
    bindings: [{ package: salePackage.id }], origins: [origin] as never, referents: ['guitar-1'], route: 'route:o1-test',
  } };
  return Journal.create({ backend, writerKey: keys.writer, packages }, envelopeBytes(signEvent(genesis, keys.alice)), [envelopeBytes(signEvent(origin, keys.alice))]);
}
export function act(journal: Journal, who: keyof typeof keys, kind: string, payload: EventBody['payload'], action_id?: string) {
  const event = journal.context.intent(people[who], kind, payload, action_id ? { action_id } : {});
  return journal.submit(envelopeBytes(signEvent(event, keys[who])), journal.context.credentialFor(people[who]));
}
export function invite(journal: Journal, who: 'bob' | 'carol' | 'ivan', roles = ['Buyer']) {
  const r = act(journal, 'alice', K.invite, { invitee: people[who], grants: { principal: people[who], roles }, token_id: 'o1-token:' + who });
  if ('refused' in r || !r.verdict?.effective) throw new Error('fixture invite failed: ' + JSON.stringify(r));
  return r.header.position;
}
export function acceptance(journal: Journal, who: 'bob' | 'carol' | 'ivan', position: number, action_id = 'accept:' + who) {
  return signEvent(journal.context.intent(people[who], K.accept_invite, journal.context.inviteEnvelope(position) as never, { action_id }), keys[who]);
}
