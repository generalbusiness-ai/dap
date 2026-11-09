import assert from 'node:assert/strict';
import { HttpGeneration } from '../../packages/mcp/src/http.ts';
import { transitionEdit, preparedEditStage } from '../../apps/room/page/src/retained-editor-state.ts';
const name = process.argv[2];
if (name === 'Transport') {
  let release;
  const owner = new HttpGeneration();
  const opening = owner.open(() => new Promise(resolve => { release = resolve; }));
  owner.detach();
  release({ generation: owner });
  await opening;
  assert.equal(owner.phase, 'closed', 'a late factory must not revive a retired generation');
} else if (name === 'Editor') {
  let stage = transitionEdit(preparedEditStage(), {type:'prepared-step',step:{kind:'open-pr',status:'unsent',attempted:false}});
  stage = transitionEdit(stage,{type:'attempted'});
  stage = transitionEdit(stage,{type:'answer',answer:{answer:'accepted',receipt:{fact:{seq:1}}}});
  assert.throws(() => transitionEdit(stage,{type:'step-recorded',workflow:'legacy'}), 'acceptance alone must not advance an edit');
  stage = transitionEdit(stage,{type:'receipt-verified'});
  assert.equal(transitionEdit(stage,{type:'step-recorded',workflow:'legacy'}).state,'waiting-lane');
} else throw new Error('Choose Transport or Editor');
console.log(`${name}: source property passed`);
