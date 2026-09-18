// Executable one-process rendezvous fixture, not a network service or discovery protocol.
import assert from 'node:assert/strict';
import { canonicalize, envelopeBytes, envelopeId, parseCanonical, principalOf, publicKeyOf, signEvent, verifyEnvelope } from '../../src/codec.ts';
import { CAP, F0_ID, K, RUNTIME, type AcceptInvitePayload, type GenesisPayload } from '../../src/foundation.ts';
import { Journal, verifyJournalView } from '../../src/journal.ts';
import { HANDOVER_PROFILE } from '../../src/ordering.ts';
import { SQLiteBackend } from '../../src/sqlite.ts';
import { interpretView } from '../../src/interpret.ts';
import { checkContext } from '../../src/checker.ts';
import type { EventBody } from '../../src/types.ts';
import { salePackage, SALE } from '../../fixtures/sale.ts';
import { key, keys, people, packages } from './o1-fixture.ts';

export const ROUTE = 'fixture:ordering-o6/guitar';
const control = principalOf(key(6));
export interface PublishedEnvelope { L: string; G: string; route: string }

export function publication(route = ROUTE, genesisNonce = '62'.repeat(16)): string {
  // L is signed before G exists and has no genesis reference.
  const L: EventBody = { actor: people.alice, nonce: '61'.repeat(16), kind: SALE + 'listing',
    payload: { referent: 'guitar-o6', description: 'A guitar offered for sale', ask: 800, route } };
  const signedL = envelopeBytes(signEvent(L, keys.alice));
  const G: EventBody = { actor: people.alice, nonce: genesisNonce, kind: K.genesis, payload: {
    foundation: F0_ID, runtime: RUNTIME, sequencing: { profile: HANDOVER_PROFILE, writer: people.writer, control },
    grants: [{ principal: people.alice, roles: ['Seller'], capabilities: [CAP.invite, CAP.attach, CAP.grant, CAP.disclose, CAP.close] }],
    bindings: [{ package: salePackage.id }], origins: [L] as never, referents: ['guitar-o6'], route,
  } };
  return canonicalize({ L: signedL, G: envelopeBytes(signEvent(G, keys.alice)), route });
}

/** This fixture supports one signed listing adopted by its author, at one named route. */
export function inspectPublication(bytes: string) {
  const value = parseCanonical(bytes);
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'G,L,route'
    || typeof value.L !== 'string' || typeof value.G !== 'string' || typeof value.route !== 'string') {
    throw new Error('O6: malformed published envelope');
  }
  const published = value as unknown as PublishedEnvelope;
  const L = verifyEnvelope(published.L), G = verifyEnvelope(published.G);
  if (L.body.genesis !== undefined || L.body.kind !== SALE + 'listing' || G.body.kind !== K.genesis
    || L.body.actor !== G.body.actor) throw new Error('O6: unexpected standalone listing or genesis');
  const origin = L.body.payload as Record<string, unknown>;
  const genesis = G.body.payload as unknown as GenesisPayload;
  if (!/^fixture:ordering-o6\/[a-z0-9-]+$/.test(published.route)
    || origin?.route !== published.route || genesis?.route !== published.route) throw new Error('O6: route mismatch');
  if (!Array.isArray(genesis.origins) || genesis.origins.length !== 1
    || canonicalize(genesis.origins[0]) !== canonicalize(L.body)) throw new Error('O6: listing not adopted');
  return { published, genesis: envelopeId(G), origin: envelopeId(L), writer: genesis.sequencing.writer };
}

export function create(path: string, bytes: string) {
  const { published, writer } = inspectPublication(bytes);
  const backend = new SQLiteBackend(path, { writer, profile: HANDOVER_PROFILE });
  try { return Journal.create({ backend, writerKey: keys.writer, packages }, published.G, [published.L]); }
  catch (error) { backend.close(); throw error; }
}

/** A local registry selects the already-created journal. The route grants no authority. */
export class FixtureRouter {
  private routes = new Map<string, { bytes: string; journal: Journal }>();
  publish(bytes: string, journal: Journal): void {
    const checked = inspectPublication(bytes);
    if (journal.context.genesisId !== checked.genesis
      || journal.context.entries[0]?.committed !== checked.published.G
      || journal.context.entries[1]?.committed !== checked.published.L) throw new Error('O6: journal does not match envelope');
    if (this.routes.has(checked.published.route)) throw new Error('O6: route already published');
    this.routes.set(checked.published.route, { bytes, journal });
  }
  reach(route: string, bytes: string) {
    const checked = inspectPublication(bytes);
    if (route !== checked.published.route) throw new Error('O6: route mismatch');
    const target = this.routes.get(route);
    if (!target) throw new Error('O6: route unavailable');
    if (target.bytes !== bytes) throw new Error('O6: published context mismatch');
    const journal = target.journal;
    return {
      invite(responder: string): AcceptInvitePayload {
        publicKeyOf(responder);
        const event = journal.context.intent(people.alice, K.invite, {
          invitee: responder, grants: { principal: responder, roles: ['Buyer'] }, token_id: 'o6-invite:' + responder,
        }, { action_id: 'o6-invite:' + responder, nonce: '63'.repeat(16) });
        const result = journal.submit(envelopeBytes(signEvent(event, keys.alice)), journal.context.credentialFor(people.alice));
        if ('refused' in result || !result.verdict?.effective) throw new Error('O6: invitation failed');
        return journal.context.inviteEnvelope(result.header.position);
      },
      redeem(signedAcceptance: string) { return journal.submit(signedAcceptance); },
      view(responder: string) { return journal.context.view(responder); },
    };
  }
}

export function runDemo(path: string) {
  const bytes = publication();
  const pinned = inspectPublication(bytes);
  let journal = create(path, bytes);
  try {
    const router = new FixtureRouter();
    router.publish(bytes, journal);
    const endpoint = router.reach(pinned.published.route, bytes);
    const invitation = endpoint.invite(people.bob);
    const beforeJoin = verifyJournalView(endpoint.view(people.bob), pinned);
    const signedInvite = envelopeBytes(verifyEnvelope({ body: invitation.invite.event, sig: invitation.invite.actorSig! }));
    assert.equal(beforeJoin[2]!.committed, signedInvite);
    // The newcomer composes with published G and the delivered invitation, not a server-generated intent.
    const acceptance = envelopeBytes(signEvent({ actor: people.bob, kind: K.accept_invite, genesis: pinned.genesis,
      nonce: '64'.repeat(16), action_id: 'o6-accept:bob', payload: invitation as never }, keys.bob));
    const joined = endpoint.redeem(acceptance);
    assert.ok(!('refused' in joined) && joined.verdict?.effective);
    assert.equal(joined.header.position, 3);
    const view = verifyJournalView(endpoint.view(people.bob), pinned);
    const interpreted = interpretView(people.bob, [...view], 3, packages);
    assert.equal(interpreted.kind, 'interpreted');
    if (interpreted.kind !== 'interpreted') throw new Error('O6: unexpected pause');
    assert.equal(interpreted.outcomes[3]!.effective, true);
    assert.deepEqual(interpreted.state.participants, [people.alice, people.bob]);
    assert.deepEqual(checkContext(journal.context), []);
    const pending = (journal.context.backend as SQLiteBackend).pending();
    const retry = endpoint.redeem(acceptance);
    assert.ok(!('refused' in retry) && retry.replay);
    assert.equal(retry.headerHash, joined.headerHash);
    assert.equal(journal.context.head, 3);
    assert.deepEqual((journal.context.backend as SQLiteBackend).pending(), pending);
    journal.close();
    journal = Journal.open({ backend: new SQLiteBackend(path, { writer: pinned.writer, profile: HANDOVER_PROFILE }), writerKey: keys.writer, packages });
    const reopenedRouter = new FixtureRouter();
    reopenedRouter.publish(bytes, journal);
    const reopenedEndpoint = reopenedRouter.reach(pinned.published.route, bytes);
    const reopenedRetry = reopenedEndpoint.redeem(acceptance);
    assert.ok(!('refused' in reopenedRetry) && reopenedRetry.replay);
    assert.equal(reopenedRetry.headerHash, joined.headerHash);
    assert.equal(journal.context.head, 3);
    assert.deepEqual(verifyJournalView(reopenedEndpoint.view(people.bob), pinned), view);
    assert.deepEqual((journal.context.backend as SQLiteBackend).pending(), pending);
    return {
      node: process.version, pid: process.pid, platform: process.platform, profile: HANDOVER_PROFILE,
      database: path, topology: 'one process, local SQLite file, in-process route registry; no external services',
      publication: bytes, genesis: pinned.genesis, origin: pinned.origin, route: pinned.published.route,
      signedInvitation: signedInvite, signedAcceptance: acceptance, joined, retry, reopenedRetry,
      verifiedView: view, interpretation: { frontier: interpreted.frontier, participants: interpreted.state.participants,
        admission: interpreted.outcomes[3], bindings: interpreted.bindings },
      entriesAfterReopen: journal.context.entries.length, pendingPublications: pending.length,
    };
  } finally { journal.close(); }
}

if (import.meta.main) {
  if (!process.argv[2]) throw new Error('usage: node test/fixtures/o6-bootstrap.ts /absolute/path/to/new-journal.db');
  process.stdout.write(JSON.stringify(runDemo(process.argv[2]), null, 2) + '\n');
}
