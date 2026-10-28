/** Q13 consumes each admitted G17 certificate once. Q12 stays exact.
 * The last full destination request is retained atomically with policy. */
import type { FieldValue, MemberObservation, ObservationRequest, PlatformData, RulesObservation, ScopeRef, ServiceMark } from '@generalbusiness/dap-contract';
import { canonicalize, isDigest, isFactRef, isRecord, isScopeRef, same, utf8 } from '@generalbusiness/dap-bytes';
import { valueDigest, type GuardRule, type RuleGiven, type RuleEffect, type Rules, type StateView } from '@generalbusiness/dap-derive';
import { archiveDeviceRulesScope, archiveDeviceRules } from './archive-binding.ts';
import { extentsOf, rulesAnswer, revisionOf, rulesMembership } from './rules-scope.ts';
import { rulesOwnerMayReviewV11 } from './rules-policy-v11.ts';
import { readServiceMarkV13, rulesPolicyProposalV13, rulesPolicyPatternsV13, rulesPolicyCheckersV13, RULES_CONTENT_BYTES_V13, RULES_POLICY_VALUE_V13, RULES_EXTENTS_VALUE_V13 } from './rules-policy-v13.ts';
import type { RulesCheckV13, RulesPolicyV13 } from './rules-policy-v13.ts';
import { RULES_TREE_PROOF, verifyRulesTree } from './rules-policy-tree.ts';
import type { RulesCertificateProvenanceV11 } from './rules-certificate.ts';
import { rulesPublishedCertificateV17 } from './rules-certificate-v17.ts';
import { evidenceWireV17, readEvidenceWireV17 } from './evidence-wire-v17.ts';

const TRANSPORT=['proposal','proof','certificateRequest','certificate','directoryBirth','destinationBirth','membershipBirth','checkers'];
const birthField=(under:string,kind:string)=>({type:'fact' as const,kind:[kind],under,required:true});
const no=(name:string):ReturnType<GuardRule>=>({holds:false,name});
const bounded=(value:unknown,max:number)=>{try{return utf8(canonicalize(value)).length<=max;}catch{return false;}};
const rulesOf=(state:Pick<StateView,'page'>)=>state.page('rules',['current'],null,1).items[0]??null;
const SERVICE_MARK_TEXT_BYTES=16384;
function policyWire(value:unknown) {
  const read=readEvidenceWireV17(value,RULES_POLICY_VALUE_V13.max);
  return read.ok?rulesPolicyProposalV13(read.value):{ok:false as const,reason:'invalid-policy' as const};
}
function markWire(value:unknown) {
  const read=readEvidenceWireV17(value,SERVICE_MARK_TEXT_BYTES);
  return read.ok?readServiceMarkV13(read.value):{ok:false as const};
}
function oldMark(state:Pick<StateView,'page'>):ServiceMark|null {
  const item=rulesOf(state);
  if(item?.values['configured']!==true)return null;
  const policy=policyWire(item.values['policy']);
  if(!policy.ok)throw Error('Q13 stored policy is invalid');
  return policy.policy.roomService;
}
function generation(state:Pick<StateView,'page'>):number|null {
  const held=rulesOf(state)?.refs['roomServiceChanged'];
  return held===undefined||held===null?0:typeof held==='number'&&Number.isSafeInteger(held)&&held>=1?held:null;
}
function content(policy:Pick<RulesPolicyV13,'approvals'|'ownerMayReview'|'checks'|'labels'|'singleControllerException'|'roomService'>,envelope:unknown,rules:ScopeRef,seq:number) {
  return {asked:'rules' as const,approvals:policy.approvals,ownerMayReview:policy.ownerMayReview,
    checks:policy.checks.map(({name,configuration,required,checker})=>({name,configuration,required,checker:checker.member})),
    labels:policy.labels,singleControllerException:policy.singleControllerException===true,
    extents:valueDigest(RULES_EXTENTS_VALUE_V13.domain,envelope),roomService:policy.roomService,serviceGeneration:{rules,seq}};
}
function completePolicy(given:RuleGiven) {
  const policy=Object.fromEntries(Object.entries(given.resolved.fields).filter(([name])=>!TRANSPORT.includes(name)));
  const mark=markWire(policy['roomService']);
  return mark.ok?rulesPolicyProposalV13({...policy,roomService:mark.mark}):{ok:false as const,reason:'invalid-policy' as const};
}
function publication(given:RuleGiven) {
  if(!given.resolved.signer)return {ok:false as const,reason:'rules-certificate-unavailable' as const};
  const candidate=completePolicy(given);if(!candidate.ok)return candidate;
  const proposal=given.resolved.fields['proposal'],proof=given.resolved.fields['proof'];
  if(!isDigest(proposal)||!isDigest(proof)||candidate.digest!==proposal)return {ok:false as const,reason:'invalid-policy' as const};
  const placed=given.placed('proposal'),tree=given.placed('proof');
  if(placed===undefined||tree===undefined)return {ok:false as const,reason:'extent-tree-unavailable' as const};
  const owned=rulesPolicyProposalV13(placed);
  if(!owned.ok||owned.digest!==proposal||!same(owned.policy,candidate.policy)||!bounded(owned.policy,RULES_POLICY_VALUE_V13.max))return {ok:false as const,reason:'invalid-policy' as const};
  const certificate=rulesPublishedCertificateV17(given,proposal,proof);
  if(!certificate)return {ok:false as const,reason:'rules-certificate-unavailable' as const};
  const item=rulesOf(given.state),previous=item?.values['certificate'];
  if(!item || item.values['configured']===true&&!provenance(previous) || previous!==undefined&&previous!==null&&!provenance(previous))return {ok:false as const,reason:'rules-certificate-unavailable' as const};
  if(provenance(previous)){
    // One monotone request position under the same complete sibling ref.
    // Never reset the position by accepting another incarnation/destination.
    if(!same(previous.request.at,certificate.provenance.request.at))return {ok:false as const,reason:'rules-certificate-destination-mismatch' as const};
    if(certificate.provenance.request.seq===previous.request.seq)return {ok:false as const,reason:'rules-certificate-used' as const};
    if(certificate.provenance.request.seq<previous.request.seq)return {ok:false as const,reason:'rules-certificate-stale' as const};
  }
  const checked=verifyRulesTree(canonicalize(tree),proof,certificate.binding,rulesPolicyPatternsV13(owned.policy));
  if(!checked.ok)return checked;
  const changed=!same(oldMark(given.state),owned.policy.roomService),previousGeneration=generation(given.state);
  if(previousGeneration===null||previousGeneration>given.resolved.self)return {ok:false as const,reason:'rules-content-too-large' as const};
  const envelope={configured:true,policy:owned.policy,proposal,certificate:certificate.provenance};
  if(!bounded(envelope,RULES_EXTENTS_VALUE_V13.max))return {ok:false as const,reason:'invalid-policy' as const};
  if(!bounded(content(owned.policy,envelope,given.resolved.at,changed?given.resolved.self:previousGeneration),RULES_CONTENT_BYTES_V13))return {ok:false as const,reason:'rules-content-too-large' as const};
  return {ok:true as const,policy:owned.policy,proposal,certificate:certificate.provenance};
}
const oldRules=archiveDeviceRulesScope.items['rules']!,oldEstablish=archiveDeviceRulesScope.acts['establish']!,oldPublish=archiveDeviceRulesScope.acts['publish']!;
const {default:_ownerDefault,...ownerSlot}=oldRules.values['ownerMayReview']!;
const {default:_exceptionDefault,...exceptionField}=oldPublish.fields['singleControllerException']!;
const extentsType={type:'code' as const,code:'q13-bounded-extents',row:'R7'};
const checksType={type:'list' as const,max:32,of:{type:'record' as const,of:{
  name:{type:'text' as const,max:128,required:true},configuration:{type:'digest' as const,required:true},required:{type:'bool' as const,required:true},checker:{type:'member' as const,required:true},
  source:{type:'enum' as const,of:['member','room'],required:false},reuse:{type:'bool' as const,required:false},stage:{type:'enum' as const,of:['work','landing','published'],required:false},
  audit:{type:'record' as const,required:false,of:{check:{type:'text' as const,max:128,required:true},every:{type:'int' as const,min:1,max:1,required:true}}},holds:{type:'bool' as const,required:false}}}};
export const rulesScopeV13:PlatformData={...archiveDeviceRulesScope,
  items:{...archiveDeviceRulesScope.items,rules:{...oldRules,refs:{...oldRules.refs,roomServiceChanged:{fixed:false,required:false,to:{type:'fact',kind:['publish'],under:'platform:rules'}}},values:{...oldRules.values,
    checks:{...oldRules.values['checks']!,of:checksType},
    ownerMayReview:ownerSlot,extents:{fixed:false,required:false,of:extentsType},configured:{fixed:false,required:true,of:{type:'bool'},default:false},
    policy:{fixed:false,required:false,of:{type:'code',code:'q13-complete-policy',row:'R7'}},
    proposal:{fixed:false,required:false,of:{type:'digest'}},certificate:{fixed:false,required:false,of:{type:'code',code:'q13-certificate-provenance',row:'R7'}},
  }}},acts:{...archiveDeviceRulesScope.acts,
    establish:{...oldEstablish,fields:{...oldEstablish.fields,ownerMayReview:{type:'bool',required:true}},
      effects:[...oldEstablish.effects,{value:{slot:'ownerMayReview',from:{field:'ownerMayReview'}}}]},
    publish:{...oldPublish,fields:{...oldPublish.fields,checks:{...checksType,required:true},extents:{...extentsType,required:true},
      roomService:{type:'text',max:SERVICE_MARK_TEXT_BYTES,required:true},checkers:{type:'list',max:33,of:{type:'member'},required:true},
      singleControllerException:exceptionField,allowZeroApprovals:{type:'bool',required:false},
      proposal:{type:'digest',required:true,value:RULES_POLICY_VALUE_V13},proof:{type:'digest',required:true,value:RULES_TREE_PROOF},
      certificateRequest:birthField('platform:destination','certify-rules-tree'),certificate:birthField('platform:destination','certify-rules-tree'),
      directoryBirth:birthField('platform:directory','establish'),destinationBirth:birthField('platform:destination','establish'),membershipBirth:birthField('platform:membership','establish')},
      observes:[{of:'member',from:{field:'checkers'},max:33,window:300,use:'reuse'}],
      guards:[...oldPublish.guards.filter(guard=>!('code'in guard&&['extents-hold','checkers'].includes(guard.code))),{code:'q13-checker-union',row:'ER1'},{code:'q13-certified-policy',row:'R7'}],
      effects:[{code:'q13-publish-policy',row:'R7'},{ref:{slot:'published',from:'self'}}]},
  }};
function provenance(value:unknown):value is RulesCertificateProvenanceV11 {
  return isRecord(value)&&Object.keys(value).length===4&&['request','certificate','proof','commit'].every(key=>Object.hasOwn(value,key))
    &&isFactRef(value['request'])&&isFactRef(value['certificate'])&&isDigest(value['proof'])&&typeof value['commit']==='string'&&/^[0-9a-f]{40}$/.test(value['commit']);
}
export const rulesScopeRulesV13:Rules={...archiveDeviceRules,
  // Only the successor lane receives evidence policy and scoped positions.
  'rules-update':{place:'send',run:given=>{
    const held=observationPolicy(given.state),item=rulesOf(given.state);
    if(given.input.type!=='delivery'||!held||!item)throw Error('Q13 rules-update requires the stored policy and its delivery');
    const p=held.policy,extents=held.envelope.policy?.extents??extentsOf(given.state);
    const serviceGeneration=generation(given.state),revision=revisionOf(given.state);
    if(!extents||serviceGeneration===null||revision===null)throw Error('Q13 generation unavailable');
    // Fixed scope/key grammars and one <=256-byte ASCII member bound the
    // three closed fields before canonical allocation. No policy list is copied here.
    if(!isScopeRef(given.resolved.at)||given.resolved.at.kind!=='rules'||!Number.isSafeInteger(revision)||revision<0||revision>1_000_000_000
      ||serviceGeneration>revision||!readServiceMarkV13(p.roomService).ok)throw Error('Q13 evidence policy unavailable');
    const evidencePolicy=canonicalize({roomService:p.roomService,serviceGeneration:{rules:given.resolved.at,seq:serviceGeneration},policyGeneration:{rules:given.resolved.at,seq:revision}});
    if(utf8(evidencePolicy).length>2048)throw Error('Q13 evidence policy exceeds its declared byte bound');
    const detail={approvals:p.approvals,ownerMayReview:p.ownerMayReview,checks:p.checks,labels:p.labels,
      evidencePolicy,
      singleControllerException:p.singleControllerException===true,
      extents:extents.map(({name,approvals,approver,checks,class:of})=>({name,approvals,approver,checks,class:of}))};
    return {to:given.input.from.at,message:{class:'request',type:'relate',body:{name:'rules',
      item:{at:given.resolved.at,seq:item.id,hash:item.opened},state:'current',detail}}};
  }},
  'q13-checker-union':{place:'guard',refusals:['invalid-policy','not-a-checker','room-service-admin-required'],run:given=>{
    const proposed=completePolicy(given),provided=given.resolved.fields['checkers'];
    if(!proposed.ok||!Array.isArray(provided)||provided.length>33)return no('invalid-policy');
    const required=rulesPolicyCheckersV13(proposed.policy);
    if(provided.length!==required.length||provided.some((member,index)=>provided.findIndex(other=>same(member,other))!==index)
      ||required.some(member=>!provided.some(other=>same(member,other))))return no('invalid-policy');
    const recorded=rulesMembership(given.state);
    if(!recorded)return {holds:null,reason:'dependency-unavailable'};
    for(const checker of required){
      const observed=given.observed({member:checker.member})?.observation as MemberObservation|undefined;
      if(checker.membership.scope!==recorded.scope||checker.membership.kind!=='membership')return no('not-a-checker');
      if(!observed||observed.of.scope!==recorded.scope||observed.of.kind!=='membership')return {holds:null,reason:'dependency-unavailable'};
      if(observed.of.inc!==checker.membership.inc||recorded.inc!==null&&recorded.inc!==observed.of.inc||observed.memberState!=='active'||observed.role!=='checker')return no('not-a-checker');
    }
    if(!same(oldMark(given.state),proposed.policy.roomService)){
      const observed=given.input.type==='act'?given.input.grant?.fresh?.observation:null;
      if(!observed||'subject'in observed||observed.role!=='admin')return no('room-service-admin-required');
    }
    return {holds:true};
  }},
  'q13-bounded-extents':{place:'type',run:(_given,value)=>Array.isArray(value)&&value.length>=1&&value.length<=8&&bounded(value,RULES_POLICY_VALUE_V13.max)},
  'q13-complete-policy':{place:'type',run:(_given,value)=>policyWire(value).ok},
  'q13-certificate-provenance':{place:'type',run:(_given,value)=>provenance(value)},
  'q13-certified-policy':{place:'guard',refusals:['invalid-policy','approval-opt-in-required','approver-not-review','rules-extent-required','catch-all-required','extent-check-unknown','audit-invalid','published-reuse','holds-stage','rules-content-too-large','extent-tree-unavailable','extent-pattern-unmatched','rules-certificate-unavailable','rules-certificate-destination-mismatch','rules-certificate-used','rules-certificate-stale'],run:given=>{
    const result=publication(given);return result.ok?{holds:true}:no(result.reason);
  }},
  'q13-publish-policy':{place:'effect',most:11,run:given=>{
    const result=publication(given),item=rulesOf(given.state);if(!result.ok||!item)throw Error('checked Q13 publication missing');
    const p=result.policy;
    return [
      ...Object.entries({approvals:p.approvals,ownerMayReview:p.ownerMayReview,checks:p.checks,labels:p.labels,extents:p.extents,
        singleControllerException:p.singleControllerException===true,configured:true,policy:evidenceWireV17(p,RULES_POLICY_VALUE_V13.max),proposal:result.proposal,certificate:result.certificate})
        .map(([slot,value]):RuleEffect=>({effect:'value',item:item.id,slot,value:value as FieldValue})),
      ...(!same(oldMark(given.state),p.roomService)?[{effect:'ref' as const,item:item.id,slot:'roomServiceChanged',to:given.resolved.self}]:[]),
    ];
  }},
};

function observationPolicy(state:Pick<StateView,'page'>) {
  const item=rulesOf(state);if(!item)return null;
  if(item.values['configured']===true){
    const result=policyWire(item.values['policy']);
    if(!result.ok||result.digest!==item.values['proposal']||!provenance(item.values['certificate']))return null;
    const envelope={configured:true,policy:result.policy,proposal:result.digest,certificate:item.values['certificate']};
    if(!bounded(envelope,RULES_EXTENTS_VALUE_V13.max))return null;
    return {policy:result.policy,envelope};
  }
  if(item.values['configured']!==false||typeof item.values['approvals']!=='number'||rulesOwnerMayReviewV11(item.values)===null)return null;
  const checks=(Array.isArray(item.values['checks'])?item.values['checks']:[]) as unknown as readonly RulesCheckV13[];
  return {policy:{approvals:item.values['approvals'],ownerMayReview:item.values['ownerMayReview'] as boolean,checks,
    labels:(Array.isArray(item.values['labels'])?item.values['labels']:[]) as readonly string[],singleControllerException:item.values['singleControllerException']===true,roomService:null},
    envelope:{configured:false,policy:null,proposal:null,certificate:null}};
}
export function rulesAnswerV13(state:Pick<StateView,'scope'|'page'>,asked:ObservationRequest):Omit<RulesObservation,'at'>|null {
  if('asked'in asked&&asked.asked==='definitions')return rulesAnswer(state,asked,'platform:rules@13');
  const scope=state.scope(),held=observationPolicy(state),revision=revisionOf(state);
  if(!scope||scope.status!=='active'||scope.at.kind!=='rules'||asked.of.scope!==scope.at.scope||asked.of.kind!=='rules'
    ||('inc'in asked.of&&asked.of.inc!==scope.at.inc)||!('asked'in asked)||asked.asked!=='rules'||!held||revision===null)return null;
  const serviceGeneration=generation(state);
  if(serviceGeneration===null||serviceGeneration>revision||revision>scope.head.seq||held.policy.roomService!==null&&serviceGeneration===0)return null;
  const projection=content(held.policy,held.envelope,scope.at,serviceGeneration);
  if(!bounded(projection,RULES_CONTENT_BYTES_V13))return null;
  return {subject:'rules',of:scope.at,head:scope.head,revision,definition:'platform:rules@13',content:projection};
}
export function rulesObservedValuesV13(state:Pick<StateView,'scope'|'page'>,asked:ObservationRequest):readonly {domain:string;bytes:string}[] {
  if(!rulesAnswerV13(state,asked)||!('asked'in asked)||asked.asked!=='rules')return [];
  const held=observationPolicy(state);if(!held)return [];
  const bytes=canonicalize(held.envelope);if(utf8(bytes).length>RULES_EXTENTS_VALUE_V13.max)return [];
  return [{domain:RULES_EXTENTS_VALUE_V13.domain,bytes}];
}
