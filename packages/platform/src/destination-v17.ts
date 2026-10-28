/** G17 certificate liveness and bounded publication state; G14 remains exact. */
import type { FieldValue, PlatformData } from '@generalbusiness/dap-contract';
import { canonicalize, isDigest, isFactRef, same, utf8 } from '@generalbusiness/dap-bytes';
import { type RuleGiven, type Rules, type RuleEffect } from '@generalbusiness/dap-derive';
import { destination4, destinationRulesForV17 } from './destination.ts';
import { evidenceDestinationProfileV17, evidenceDestinationDataV17, evidenceDestinationRulesV17, evidenceFundCapacityV17, evidenceCapacityValidV17, evidenceJobStateV17, evidenceReadyUpdateV17 } from './destination-evidence-v17.ts';
import { fundingData, fundingRules } from './destination-evidence-funding-v17.ts';
import { certifiedPublicationStateWireV17 } from './destination-budget-v17.ts';
import { RULES_POLICY_VALUE_V13, rulesPolicyProposalV13, rulesPolicyPatternsV13 } from './rules-policy-v13.ts';
import { RULES_TREE_PROOF, verifyRulesTree } from './rules-policy-tree.ts';
import { RULES_CERTIFICATE_KIND, readRulesCertificateBinding, rulesCertificateBranchMatches } from './rules-certificate.ts';
import { rulesCertificateEvidenceValuesV17 } from './destination-budget-v17.ts';
import { evidenceLedgerInitializationV17 } from './evidence-ledger-v17.ts';
import { rulesCertificateFamilyV17, rulesCertificateOpeningV17, rulesCertificateDeclineV17, readRulesCertificateDeclinedV17 } from './rules-certificate-v17.ts';

const birthField=(under:string)=>({type:'fact' as const,kind:['establish'],under,required:true});
const branch=(given:RuleGiven)=>given.resolved.subjects.get('branch') ?? given.state.page('branch',['ready'],null,1).items[0];
const refuse={holds:false,name:'rules-certificate-unavailable'} as const;
function bindingAt(given:RuleGiven) {
  const family=rulesCertificateFamilyV17(given,'rules'),item=branch(given),digest=given.resolved.fields['proposal'];
  if(!given.resolved.signer||!family||!item||item.state!=='ready'||!isDigest(digest)||!same(item.refs['directory'],family.directory.fact.at)
    ||item.values['membership']!==family.membership.fact.at.scope||item.values['rules']!==family.rules.fact.at.scope)return null;
  const binding=readRulesCertificateBinding({rules:family.rules.fact.at,proposal:digest,destination:given.resolved.at,
    repository:item.values['repository'],ref:`refs/heads/${item.values['name']}`,commit:item.values['head']});
  return binding ? {binding,item} : null;
}
const checkedPolicy=(given:RuleGiven,digest:unknown)=>{
  if(!isDigest(digest))return null;
  const raw=given.value(RULES_POLICY_VALUE_V13.domain,digest,RULES_POLICY_VALUE_V13.max);
  if(raw===undefined)return null;
  const proposal=rulesPolicyProposalV13(raw);
  return proposal.ok && proposal.digest===digest && utf8(canonicalize(proposal.policy)).length<=RULES_POLICY_VALUE_V13.max ? proposal : null;
};
const evidence=(body:unknown):body is {proposal:string;proof:string;started:unknown} => {
  const value=readRecord(body,['proposal','proof','started']);
  return !!value&&isDigest(value['proposal'])&&isDigest(value['proof'])&&isFactRef(value['started']);
};
function readRecord(value:unknown,keys:readonly string[]):Record<string,unknown>|null {
  if(value===null||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length)return null;
  return keys.every(key=>Object.hasOwn(value,key))?value as Record<string,unknown>:null;
}

function validConfirmed(given:RuleGiven,operation:import('@generalbusiness/dap-derive').Operation) {
  if(given.input.type!=='outcome'||given.input.result!=='confirmed'||!evidence(given.input.evidence.body))return null;
  const opened=rulesCertificateOpeningV17(given.own,operation,given.resolved.at);
  if(!opened)return null;
  const request=given.own(opened.started.seq);if(request?.entry.input.type!=='act')return null;
  const family=rulesCertificateFamilyV17(given,'rules',request.entry.input.signed.intent.fields);
  if(!family||!same(opened.binding.rules,family.rules.fact.at))return null;
  const body=given.input.evidence.body,proposal=checkedPolicy(given,body.proposal);
  if(!same(body.started,opened.started)||body.proposal!==opened.binding.proposal||!proposal)return null;
  const proof=given.value(RULES_TREE_PROOF.domain,body.proof as import('@generalbusiness/dap-contract').Digest,RULES_TREE_PROOF.max);
  return proof!==undefined&&verifyRulesTree(canonicalize(proof),body.proof as import('@generalbusiness/dap-contract').Digest,
    opened.binding,rulesPolicyPatternsV13(proposal.policy)).ok?opened:null;
}
// Each signed request admits room for its own certificate operation, as read-token does.
const certificateAct:PlatformData['acts'][string]={step:'transition',on:'branch',grant:'rules.publish',
  adds:{operations:{[RULES_CERTIFICATE_KIND]:1}},also:{},
  fields:{proposal:{type:'digest',required:true,value:RULES_POLICY_VALUE_V13},directoryBirth:birthField('platform:directory'),
    rulesBirth:birthField('platform:rules'),membershipBirth:birthField('platform:membership')},
  guards:[{state:['ready']},{code:'rules-certificate-request-v17',row:'R7'}],
  effects:[{code:'rules-certificate-open-v17',row:'R7',most:{effects:6,operations:[RULES_CERTIFICATE_KIND],opens:'evidence-ledger'}}],sends:[],attention:[]};
const oldBranch=destination4.items['branch']!;
if(oldBranch.holds?.items!==1)throw Error('G17 preserves the original first-head receipt item before reserving its ledger');
const oldPublication=destination4.items['publication']!;
const oldJudge=destination4.outcomes['judge']!;
const baseRules=destinationRulesForV17(evidenceDestinationProfileV17);
const oldJudgeRule=baseRules['judge'];
if(!oldJudgeRule||oldJudgeRule.place!=='outcome')throw Error('native judge outcome required');
const certifiedDestinationV17:PlatformData={...destination4,items:{...destination4.items,publication:{...oldPublication,values:{...oldPublication.values,
  passes:{fixed:false,required:false,of:{type:'code',code:'certified-publication-state-v17',row:'R7'}}}},branch:{...oldBranch,
  holds:{...oldBranch.holds,items:2},values:{...oldBranch.values,rulesCertificateRequest:{fixed:false,required:false,of:{type:'code',code:'rules-certificate-binding-v17',row:'R7'}},
    rulesCertificateDeclined:{fixed:false,required:false,of:{type:'code',code:'rules-certificate-declined-v17',row:'R7'}}}}},
  acts:{...destination4.acts,[RULES_CERTIFICATE_KIND]:certificateAct},outcomes:{...destination4.outcomes,
    judge:{...oldJudge,most:{...oldJudge.most!,effects:16},observes:oldJudge.observes!.map(row=>row.of==='rules'?{...row,retains:[{domain:'artroom-rules-extents-3',max:262144}]}:row)},
    [RULES_CERTIFICATE_KIND]:{code:'rules-certificate-outcome-v17',row:'R7',attempts:1,origin:'rule',most:{effects:1,operations:[]}}}};

const certifiedDestinationRulesV17:Rules={...baseRules,
  judge:{...oldJudgeRule,rules:{...oldJudgeRule.rules,most:{...oldJudgeRule.rules.most!,effects:16}}},
  'certified-publication-state-v17':{place:'type',run:(given,value)=>certifiedPublicationStateWireV17(value,given.resolved.bounds)!==null},
  'rules-certificate-declined-v17':{place:'type',run:(given,value)=>{ const read=readRulesCertificateDeclinedV17(value);return read!==null&&same(read.request.at,given.resolved.at); }},
  'rules-certificate-binding-v17':{place:'type',run:(_given,value)=>readRulesCertificateBinding(value)!==null},
  'rules-certificate-request-v17':{place:'guard',refusals:['rules-certificate-unavailable'],run:given=>{
    // Standard native grant/key/member checks still precede this sibling proof.
    if(!bindingAt(given)||!checkedPolicy(given,given.resolved.fields['proposal']))return refuse;
    evidenceLedgerInitializationV17(given);return {holds:true};
  }},
  'rules-certificate-open-v17':{place:'effect',most:6,run:given=>{
    const held=bindingAt(given);if(!held)throw Error('checked certificate binding missing');
    // Serialization cast follows closed bounded native snapshot validation.
    return [...evidenceLedgerInitializationV17(given),{effect:'value',item:held.item.id,slot:'rulesCertificateRequest',value:held.binding as unknown as FieldValue},
      {effect:'operation',k:0,owner:'platform:destination@17',kind:RULES_CERTIFICATE_KIND,attempts:1,for:held.item.id},
      {effect:'attempt',operation:{k:0},attempt:1,result:'opened',selected:null}] satisfies readonly RuleEffect[];
  }},
  'rules-certificate-outcome-v17':{place:'outcome',rules:{selects:true,read:false,retries:()=>false,
    valueDomains:[RULES_POLICY_VALUE_V13,RULES_TREE_PROOF],
    values:rulesCertificateEvidenceValuesV17,
    origin:(_given,operation)=>operation.attempts.find(attempt=>attempt.attempt===1)?.opened??null,
    unknown:()=>({}),
    beforeSend:(state,operation,_attempt,own)=>{
      const scope=state.scope();if(!scope)return null;
      const opened=rulesCertificateOpeningV17(own,operation,scope.at);
      const declined=opened&&rulesCertificateDeclineV17(own,scope.at,scope.head,opened.started);
      return declined?{basis:'own-answer',body:declined as unknown as FieldValue}:null;
    },
    wellFormed:(result,answer,given)=>{
      if(result==='confirmed')return answer.basis==='own-answer'&&evidence(answer.body);
      if(readRecord(answer.body,[])!==null)return true;
      if(result!=='refused'||answer.basis!=='own-answer'||given.input.type!=='outcome')return false;
      const declined=readRulesCertificateDeclinedV17(answer.body),operation=given.state.operation(given.input.operation);
      const opened=operation&&rulesCertificateOpeningV17(given.own,operation,given.resolved.at),scope=given.state.scope();
      // Own-answer evidence carries the host's bounded observation. Only the
      // independently derived native fact below can enter branch state.
      return !!declined&&!!opened&&!!scope&&same(declined.request,opened.started)
        &&declined.interveningFact.seq<=scope.head.seq;
    },
    holds:(given,operation)=>{
      const opened=validConfirmed(given,operation),scope=given.state.scope();
      return !!opened&&!!scope&&same(scope.head,{seq:opened.started.seq,hash:opened.started.hash})
        &&operation.for!==undefined&&rulesCertificateBranchMatches(given.state,opened.binding,operation.for);
    },most:{effects:1,requests:0,operations:0},
    derives:(given,operation,selected)=>{
      if(given.input.type!=='outcome'||operation.for===undefined)return {effects:[],sends:[],opens:[]};
      const opened=rulesCertificateOpeningV17(given.own,operation,given.resolved.at),scope=given.state.scope();
      if(!opened||!scope)return {effects:[],sends:[],opens:[]};
      const hostDeclined=given.input.result==='refused'&&readRulesCertificateDeclinedV17(given.input.evidence.body)!==null;
      const finalRace=given.input.result==='confirmed'&&selected===false&&validConfirmed(given,operation)!==null;
      if(!hostDeclined&&!finalRace)return {effects:[],sends:[],opens:[]};
      const declined=rulesCertificateDeclineV17(given.own,given.resolved.at,scope.head,opened.started);
      if(!declined)return {effects:[],sends:[],opens:[]};
      // Every real decline remains in its own immutable outcome entry. This
      // value is the latest completed answer, never a consumed certificate.
      return {effects:[{effect:'value',item:operation.for,slot:'rulesCertificateDeclined',value:declined as unknown as FieldValue}],sends:[],opens:[]};
    },
  }},
};

export const destinationV17:PlatformData=fundingData(evidenceDestinationDataV17(certifiedDestinationV17));
export const destinationRulesV17:Rules=fundingRules(evidenceDestinationRulesV17(certifiedDestinationRulesV17), {
  fundCapacity:evidenceFundCapacityV17,capacityValid:evidenceCapacityValidV17,jobState:evidenceJobStateV17,readyUpdate:evidenceReadyUpdateV17,
});
export { destinationEvidenceJob,destinationEvidenceAdmissionCurrent,destinationEvidencePending,destinationEvidenceResultPending,destinationEvidenceNoticePending,destinationEvidenceProgressPending,evidenceFloorReferencesV17,WORK_COMMIT_PROOF_V17,EVIDENCE_ADMIT_V17 } from "./destination-evidence-v17.ts";
export type { EvidenceJobAdmissionV17 } from "./destination-evidence-v17.ts";
export { readEvidenceJobRecordWireV17, evidenceJobRecordWireV17, readEvidenceServiceWireV17, EVIDENCE_RECORD_BYTES_V17, EVIDENCE_SERVICE_BYTES_V17 } from "./destination-evidence-v17.ts";
export { destinationPublishedChecksPending } from "./destination-evidence-funding-v17.ts";
