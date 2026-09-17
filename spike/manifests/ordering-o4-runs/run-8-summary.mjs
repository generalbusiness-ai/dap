import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const [wt, out] = process.argv.slice(2);
const base = pathToFileURL(wt + '/spike/');
const { canonicalize } = await import(new URL('src/codec.ts',base));
const { lifecycleCases } = await import(new URL('manifests/ordering-lifecycle.ts',base));
const json = path => JSON.parse(readFileSync(path,'utf8'));
const read = name => json(join(out,'observations',name + '.json')).observation;
const hash = value => 'sha256:' + createHash('sha256').update(canonicalize(value)).digest('hex');
const actual = {};
for (const storage of ['memory','sqlite']) {
  const healthy = read('healthy-' + storage);
  const mutations = read('materialized-genesis-mutations-' + storage).records;
  const matrix = read('goal-1-history-matrix-' + storage);
  const poison = read('k1-participant-input-' + storage);
  const disclosure = read('k4-inspection-disclosure-' + storage);
  const adverse = lifecycleCases.map(c => ({ id:c.id,observations:read(c.id + '-' + storage).length }));
  const k3 = readdirSync(join(out,'observations')).filter(n=>n.startsWith('k3-')&&n.endsWith('-'+storage+'.json')).map(n=>{
    const o = read(n.slice(0,-5));
    return {file:n,memberAttempts:o.failures?.length??1,releaseEffective:o.released.verdict.effective,activationEffective:o.activated.verdict.effective,activations:o.final.activations};
  });
  actual[storage] = {
    contexts:healthy.observations.at(-1).identities,
    proofs:Object.fromEntries(Object.entries(healthy.proofs).map(([name,proof])=>[name,{identity:hash(proof),frontier:proof.frontier,genesis:proof.genesis}])),
    healthyBoundaries:healthy.observations.length,
    adverseCases:adverse.length,adverseSteps:adverse.reduce((n,c)=>n+c.observations,0),
    mutations:{cases:mutations.length,categories:mutations.reduce((acc,m)=>{const category=m.category??m.verdict?.reason??'unclassified';acc[category]=(acc[category]??0)+1;return acc;},{})},
    matrix:Object.fromEntries(['actualReaders','completedHeads','immediatelyAcrossAttachQuestions','actualReaderPreAttachQuestions','completedTransferHistoricalQuestions'].map(k=>[k,matrix[k]])),
    k1:{malformedInputs:poison.malformed.length,exactRetryChecks:poison.malformed.length*2+poison.completedRetries.length,recordedColdRetries:poison.malformed.length,recordedCompletedRetries:poison.completedRetries.length,immediateRetryEvidence:'executed assertions in ordering-scope-participant-input.test.ts; not duplicated in JSON',releases:{S:poison.saleRelease.header.position,D:poison.deliveryRelease.header.position},activationEffective:poison.activation.verdict.effective,final:poison.final},
    k3,
    k4:{phases:disclosure.observations.map(p=>({phase:p.phase,sourceReaders:p.sourceViews.map(v=>v.reader),destinationReaders:p.destinationViews.map(v=>v.reader),bobReadsRequest:p.sourceViews.find(v=>v.reader==='bob').requestReadable,bobGetsDerivedProof:p.sourceViews.find(v=>v.reader==='bob').admitReadable})),expectation:disclosure.expected},
  };
}
const result={source:json(join(out,'source.json')).source,proofIdentityDefinition:'sha256 of codec canonicalize(full PublicProof packet including its certificate)',actual,backendIdentityAgreement:canonicalize(actual.memory.contexts)===canonicalize(actual.sqlite.contexts)&&canonicalize(actual.memory.proofs)===canonicalize(actual.sqlite.proofs)};
writeFileSync(join(out,'actual.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(actual).map(([s,a])=>[s,{healthyBoundaries:a.healthyBoundaries,adverseCases:a.adverseCases,adverseSteps:a.adverseSteps,mutations:a.mutations,matrix:a.matrix,k1Inputs:a.k1.malformedInputs,k1Retries:a.k1.exactRetryChecks,k3:a.k3}])),null,2));
console.log('backendIdentityAgreement',result.backendIdentityAgreement);
