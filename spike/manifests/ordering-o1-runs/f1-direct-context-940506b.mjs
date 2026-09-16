// Reproduction at 940506b473abc808666560d5e757811f985fcdaa.
// Run from this isolated snapshot's spike directory: node qa-context-error.mjs
import assert from 'node:assert/strict';
import { MemoryBackend } from './src/append.ts';
import { signEvent } from './src/codec.ts';
import { CAP, K } from './src/foundation.ts';
import { Journal } from './src/journal.ts';
import { createJournal, keys, people, packages, act, acceptance } from './test/fixtures/o1-fixture.ts';
class LostResponse extends MemoryBackend {
  armed = false;
  commit(...args) {
    super.commit(...args);
    if (this.armed) { this.armed = false; throw new Error('lost response after commit'); }
  }
}
const backend = new LostResponse();
const j = createJournal(backend);
const revoke = signEvent(j.context.intent(people.alice, K.revoke, {
  principal: people.alice, capabilities: [CAP.invite],
}, { action_id: 'qa:revoke', nonce: 'a1'.repeat(16) }), keys.alice);
backend.armed = true;
assert.throws(() => j.context.submit(revoke.body, j.context.credentialFor(people.alice), revoke), /lost response/);
const invitation = act(j, 'alice', K.invite, {
  invitee: people.bob, grants: { principal: people.bob, roles: ['Buyer'] }, token_id: 'qa:invite',
}, 'qa:invite');
assert.ok(!('refused' in invitation) && invitation.verdict.effective);
const redemption = j.submit(acceptance(j, 'bob', invitation.header.position, 'qa:accept'));
assert.ok(!('refused' in redemption) && redemption.verdict.effective);
const liveParticipants = [...j.context.state.participants];
j.close();
const cold = Journal.open({ backend, writerKey: keys.writer, packages });
assert.notDeepEqual(liveParticipants, cold.context.state.participants);
console.log(JSON.stringify({ source: '940506b473abc808666560d5e757811f985fcdaa',
  revocation: 2, invitation: invitation.header.position, redemption: redemption.header.position,
  liveParticipants, coldParticipants: cold.context.state.participants,
  coldInviteVerdict: cold.context.verdictAt(invitation.header.position), head: cold.context.head,
}, null, 2));
cold.close();
