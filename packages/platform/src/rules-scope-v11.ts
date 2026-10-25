/** Prospective Q11 policy/certificate boundary. Old Q10 data stays exact.
 * Catalog, D18 creator and Q11 typed-install factory wiring are separate. */
import type { Digest, FieldValue, ObservationRequest, PlatformData, RulesObservation } from '@generalbusiness/dap-contract';
import { canonicalize, isDigest, isFactRef, isRecord, same, utf8 } from '@generalbusiness/dap-bytes';
import { valueDigest, type GuardRule, type RuleGiven, type RuleEffect, type Rules, type StateView } from '@generalbusiness/dap-derive';
import { archiveDeviceRulesScope, archiveDeviceRules } from './archive-binding.ts';
import { rulesAnswer, revisionOf } from './rules-scope.ts';
import { rulesOwnerMayReviewV11, rulesPolicyProposalV11, rulesPolicyPatternsV11 } from './rules-policy-v11.ts';
import { RULES_TREE_PROOF, verifyRulesTree } from './rules-policy-tree.ts';
import { RULES_POLICY_VALUE_V11, RULES_EXTENTS_VALUE_V11, rulesCertificateFamily, rulesPublishedCertificate,
  type RulesCertificateProvenanceV11 } from './rules-certificate.ts';

const TRANSPORT=['proposal','proof','certificateRequest','certificate','directoryBirth','destinationBirth','membershipBirth'];
const birthField=(under:string,kind:string)=>({type:'fact' as const,kind:[kind],under,required:true});
const no=(name:string):ReturnType<GuardRule>=>({holds:false,name});
const bounded=(value:unknown,max:number)=>{try{return utf8(canonicalize(value)).length<=max;}catch{return false;}};
const rulesOf=(state:Pick<StateView,'page'>)=>state.page('rules',['current'],null,1).items[0]??null;
function completePolicy(given:RuleGiven) {
  const policy=Object.fromEntries(Object.entries(given.resolved.fields).filter(([name])=>!TRANSPORT.includes(name)));
  return rulesPolicyProposalV11(policy);
}
function publication(given:RuleGiven) {
  if(!given.resolved.signer)return {ok:false as const,reason:'rules-certificate-unavailable' as const};
  const candidate=completePolicy(given);if(!candidate.ok)return candidate;
  const proposal=given.resolved.fields['proposal'],proof=given.resolved.fields['proof'];
  if(!isDigest(proposal)||!isDigest(proof)||candidate.digest!==proposal)return {ok:false as const,reason:'invalid-policy' as const};
  const placed=given.placed('proposal'),tree=given.placed('proof');
  if(placed===undefined||tree===undefined)return {ok:false as const,reason:'extent-tree-unavailable' as const};
  const owned=rulesPolicyProposalV11(placed);
  if(!owned.ok||owned.digest!==proposal||!same(owned.policy,candidate.policy)||!bounded(owned.policy,RULES_POLICY_VALUE_V11.max))return {ok:false as const,reason:'invalid-policy' as const};
  const certificate=rulesPublishedCertificate(given,proposal,proof);
  if(!certificate)return {ok:false as const,reason:'rules-certificate-unavailable' as const};
  const checked=verifyRulesTree(canonicalize(tree),proof,certificate.binding,rulesPolicyPatternsV11(owned.policy));
  if(!checked.ok)return checked;
  const envelope={configured:true,policy:owned.policy,proposal,certificate:certificate.provenance};
  if(!bounded(envelope,RULES_EXTENTS_VALUE_V11.max))return {ok:false as const,reason:'invalid-policy' as const};
  return {ok:true as const,policy:owned.policy,proposal,certificate:certificate.provenance};
}
const oldRules=archiveDeviceRulesScope.items['rules']!,oldEstablish=archiveDeviceRulesScope.acts['establish']!,oldPublish=archiveDeviceRulesScope.acts['publish']!;
const {default:_ownerDefault,...ownerSlot}=oldRules.values['ownerMayReview']!;
const {default:_exceptionDefault,...exceptionField}=oldPublish.fields['singleControllerException']!;
const extentsType={type:'code' as const,code:'q11-bounded-extents',row:'R7'};
export const rulesScopeV11:PlatformData={...archiveDeviceRulesScope,
  items:{...archiveDeviceRulesScope.items,rules:{...oldRules,values:{...oldRules.values,
    ownerMayReview:ownerSlot,extents:{fixed:false,required:false,of:extentsType},configured:{fixed:false,required:true,of:{type:'bool'},default:false},
    policy:{fixed:false,required:false,of:{type:'code',code:'q11-complete-policy',row:'R7'}},
    proposal:{fixed:false,required:false,of:{type:'digest'}},certificate:{fixed:false,required:false,of:{type:'code',code:'q11-certificate-provenance',row:'R7'}},
  }}},acts:{...archiveDeviceRulesScope.acts,
    establish:{...oldEstablish,fields:{...oldEstablish.fields,ownerMayReview:{type:'bool',required:true}},
      effects:[...oldEstablish.effects,{value:{slot:'ownerMayReview',from:{field:'ownerMayReview'}}}]},
    publish:{...oldPublish,fields:{...oldPublish.fields,extents:{...extentsType,required:true},
      singleControllerException:exceptionField,allowZeroApprovals:{type:'bool',required:false},
      proposal:{type:'digest',required:true,value:RULES_POLICY_VALUE_V11},proof:{type:'digest',required:true,value:RULES_TREE_PROOF},
      certificateRequest:birthField('platform:destination','certify-rules-tree'),certificate:birthField('platform:destination','certify-rules-tree'),
      directoryBirth:birthField('platform:directory','establish'),destinationBirth:birthField('platform:destination','establish'),membershipBirth:birthField('platform:membership','establish')},
      guards:[...oldPublish.guards.filter(guard=>!('code'in guard&&guard.code==='extents-hold')),{code:'q11-certified-policy',row:'R7'}],
      effects:[{code:'q11-publish-policy',row:'R7'}]},
  }};
function provenance(value:unknown):value is RulesCertificateProvenanceV11 {
  return isRecord(value)&&Object.keys(value).length===4&&['request','certificate','proof','commit'].every(key=>Object.hasOwn(value,key))
    &&isFactRef(value['request'])&&isFactRef(value['certificate'])&&isDigest(value['proof'])&&typeof value['commit']==='string'&&/^[0-9a-f]{40}$/.test(value['commit']);
}
export const rulesScopeRulesV11:Rules={...archiveDeviceRules,
  'q11-bounded-extents':{place:'type',run:(_given,value)=>Array.isArray(value)&&value.length>=1&&value.length<=8&&bounded(value,RULES_POLICY_VALUE_V11.max)},
  'q11-complete-policy':{place:'type',run:(_given,value)=>rulesPolicyProposalV11(value).ok&&bounded(value,RULES_POLICY_VALUE_V11.max)},
  'q11-certificate-provenance':{place:'type',run:(_given,value)=>provenance(value)},
  'q11-certified-policy':{place:'guard',refusals:['invalid-policy','approval-opt-in-required','approver-not-review','rules-extent-required','catch-all-required','extent-check-unknown','extent-tree-unavailable','extent-pattern-unmatched','rules-certificate-unavailable'],run:given=>{
    const result=publication(given);return result.ok?{holds:true}:no(result.reason);
  }},
  'q11-publish-policy':{place:'effect',most:11,run:given=>{
    const result=publication(given),item=rulesOf(given.state);if(!result.ok||!item)throw Error('checked Q11 publication missing');
    const p=result.policy;
    return [
      ...Object.entries({approvals:p.approvals,ownerMayReview:p.ownerMayReview,checks:p.checks,labels:p.labels,extents:p.extents,
        singleControllerException:p.singleControllerException===true,configured:true,policy:p,proposal:result.proposal,certificate:result.certificate})
        .map(([slot,value]):RuleEffect=>({effect:'value',item:item.id,slot,value:value as FieldValue})),
      {effect:'ref',item:item.id,slot:'published',to:given.resolved.self},
    ];
  }},
};

function observationPolicy(state:Pick<StateView,'page'>) {
  const item=rulesOf(state);if(!item)return null;
  if(item.values['configured']===true){
    const result=rulesPolicyProposalV11(item.values['policy']);
    if(!result.ok||result.digest!==item.values['proposal']||!provenance(item.values['certificate']))return null;
    const envelope={configured:true,policy:result.policy,proposal:result.digest,certificate:item.values['certificate']};
    if(!bounded(envelope,RULES_EXTENTS_VALUE_V11.max))return null;
    return {policy:result.policy,envelope};
  }
  if(item.values['configured']!==false||typeof item.values['approvals']!=='number'||rulesOwnerMayReviewV11(item.values)===null)return null;
  const checks=Array.isArray(item.values['checks'])?item.values['checks']:[];
  return {policy:{approvals:item.values['approvals'],ownerMayReview:item.values['ownerMayReview'] as boolean,checks,
    labels:Array.isArray(item.values['labels'])?item.values['labels']:[],singleControllerException:item.values['singleControllerException']===true},
    envelope:{configured:false,policy:null,proposal:null,certificate:null}};
}
export function rulesAnswerV11(state:Pick<StateView,'scope'|'page'>,asked:ObservationRequest):Omit<RulesObservation,'at'>|null {
  if('asked'in asked&&asked.asked==='definitions')return rulesAnswer(state,asked,'platform:rules@11');
  const scope=state.scope(),held=observationPolicy(state),revision=revisionOf(state);
  if(!scope||scope.status!=='active'||scope.at.kind!=='rules'||asked.of.scope!==scope.at.scope||asked.of.kind!=='rules'
    ||('inc'in asked.of&&asked.of.inc!==scope.at.inc)||!('asked'in asked)||asked.asked!=='rules'||!held||revision===null)return null;
  const checks=held.policy.checks as unknown as {name:string;configuration:Digest;required:boolean;checker:{member:import('@generalbusiness/dap-contract').MemberId}}[];
  return {subject:'rules',of:scope.at,head:scope.head,revision,definition:'platform:rules@11',content:{asked:'rules',
    approvals:held.policy.approvals,ownerMayReview:held.policy.ownerMayReview,checks:checks.map(row=>({...row,checker:row.checker.member})),
    labels:held.policy.labels as string[],singleControllerException:held.policy.singleControllerException===true,
    extents:valueDigest(RULES_EXTENTS_VALUE_V11.domain,held.envelope)}};
}
export function rulesObservedValuesV11(state:Pick<StateView,'scope'|'page'>,asked:ObservationRequest):readonly {domain:string;bytes:string}[] {
  if(!rulesAnswerV11(state,asked)||!('asked'in asked)||asked.asked!=='rules')return [];
  const held=observationPolicy(state);if(!held)return [];
  const bytes=canonicalize(held.envelope);if(utf8(bytes).length>RULES_EXTENTS_VALUE_V11.max)return [];
  return [{domain:RULES_EXTENTS_VALUE_V11.domain,bytes}];
}
