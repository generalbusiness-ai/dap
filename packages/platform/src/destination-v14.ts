/** Prospective G14 data only; catalog/default/protocol dispatch is separate. */
import type { FieldValue, PlatformData } from '@generalbusiness/dap-contract';
import { canonicalize, isDigest, isFactRef, same, utf8 } from '@generalbusiness/dap-bytes';
import { type RuleGiven, type Rules, type RuleEffect, type OperationRules } from '@generalbusiness/dap-derive';
import { destination4, destinationRules4, certifiedPublicationState } from './destination.ts';
import { rulesPolicyProposalV11, rulesPolicyPatternsV11 } from './rules-policy-v11.ts';
import { RULES_TREE_PROOF, verifyRulesTree } from './rules-policy-tree.ts';
import { RULES_CERTIFICATE_KIND, RULES_POLICY_VALUE_V11, readRulesCertificateBinding, rulesCertificateBranchMatches,
  rulesCertificateFamily, rulesCertificateOpening } from './rules-certificate.ts';

const birthField=(under:string)=>({type:'fact' as const,kind:['establish'],under,required:true});
const branch=(given:RuleGiven)=>given.resolved.subjects.get('branch') ?? given.state.page('branch',['ready'],null,1).items[0];
const refuse={holds:false,name:'rules-certificate-unavailable'} as const;
function bindingAt(given:RuleGiven) {
  const family=rulesCertificateFamily(given,'rules'),item=branch(given),digest=given.resolved.fields['proposal'];
  if(!given.resolved.signer||!family||!item||item.state!=='ready'||!isDigest(digest)||!same(item.refs['directory'],family.directory.fact.at)
    ||item.values['membership']!==family.membership.fact.at.scope||item.values['rules']!==family.rules.fact.at.scope)return null;
  const binding=readRulesCertificateBinding({rules:family.rules.fact.at,proposal:digest,destination:given.resolved.at,
    repository:item.values['repository'],ref:`refs/heads/${item.values['name']}`,commit:item.values['head']});
  return binding ? {binding,item} : null;
}
const checkedPolicy=(given:RuleGiven,digest:unknown)=>{
  if(!isDigest(digest))return null;
  const raw=given.value(RULES_POLICY_VALUE_V11.domain,digest,RULES_POLICY_VALUE_V11.max);
  if(raw===undefined)return null;
  const proposal=rulesPolicyProposalV11(raw);
  return proposal.ok && proposal.digest===digest && utf8(canonicalize(proposal.policy)).length<=RULES_POLICY_VALUE_V11.max ? proposal : null;
};
const evidence=(body:unknown):body is {proposal:string;proof:string;started:unknown} => {
  const value=readRecord(body,['proposal','proof','started']);
  return !!value&&isDigest(value['proposal'])&&isDigest(value['proof'])&&isFactRef(value['started']);
};
function readRecord(value:unknown,keys:readonly string[]):Record<string,unknown>|null {
  if(value===null||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length)return null;
  return keys.every(key=>Object.hasOwn(value,key))?value as Record<string,unknown>:null;
}
/** The exact pure selector shared with bounded archive metadata projection.
 * It selects no value when the complete native evidence body is malformed. */
export const rulesCertificateEvidenceValues: NonNullable<OperationRules['values']> = answer=>evidence(answer.body)?[{...RULES_POLICY_VALUE_V11,digest:answer.body.proposal as import('@generalbusiness/dap-contract').Digest},
      {...RULES_TREE_PROOF,digest:answer.body.proof as import('@generalbusiness/dap-contract').Digest}]:[];
const certificateAct:PlatformData['acts'][string]={step:'transition',on:'branch',grant:'rules.publish',also:{},
  fields:{proposal:{type:'digest',required:true,value:RULES_POLICY_VALUE_V11},directoryBirth:birthField('platform:directory'),
    rulesBirth:birthField('platform:rules'),membershipBirth:birthField('platform:membership')},
  guards:[{state:['ready']},{code:'rules-certificate-request-v14',row:'R7'}],
  effects:[{code:'rules-certificate-open-v14',row:'R7'}],sends:[],attention:[]};
const oldBranch=destination4.items['branch']!;
const oldPublication=destination4.items['publication']!;
const oldJudge=destination4.outcomes['judge']!;
const oldJudgeRule=destinationRules4['judge'];
if(!oldJudgeRule||oldJudgeRule.place!=='outcome')throw Error('native judge outcome required');
export const destinationV14:PlatformData={...destination4,items:{...destination4.items,publication:{...oldPublication,values:{...oldPublication.values,
  passes:{fixed:false,required:false,of:{type:'code',code:'certified-publication-state-v14',row:'R7'}}}},branch:{...oldBranch,
  holds:{...oldBranch.holds,operations:{...oldBranch.holds?.operations,[RULES_CERTIFICATE_KIND]:1}},
  values:{...oldBranch.values,rulesCertificateRequest:{fixed:false,required:false,of:{type:'code',code:'rules-certificate-binding-v14',row:'R7'}}}}},
  acts:{...destination4.acts,[RULES_CERTIFICATE_KIND]:certificateAct},outcomes:{...destination4.outcomes,
    judge:{...oldJudge,most:{...oldJudge.most!,effects:16},observes:oldJudge.observes!.map(row=>row.of==='rules'?{...row,retains:[{domain:'artroom-rules-extents-2',max:262144}]}:row)},
    [RULES_CERTIFICATE_KIND]:{code:'rules-certificate-outcome-v14',row:'R7',attempts:1,origin:'rule',most:{effects:0,operations:[]}}}};

export const destinationRulesV14:Rules={...destinationRules4,
  judge:{...oldJudgeRule,rules:{...oldJudgeRule.rules,most:{...oldJudgeRule.rules.most!,effects:16}}},
  'certified-publication-state-v14':{place:'type',run:(_given,value)=>certifiedPublicationState(value)!==null},
  'rules-certificate-binding-v14':{place:'type',run:(_given,value)=>readRulesCertificateBinding(value)!==null},
  'rules-certificate-request-v14':{place:'guard',refusals:['rules-certificate-unavailable'],run:given=>{
    // Standard native grant/key/member checks still precede this sibling proof.
    return bindingAt(given)&&checkedPolicy(given,given.resolved.fields['proposal'])?{holds:true}:refuse;
  }},
  'rules-certificate-open-v14':{place:'effect',most:3,run:given=>{
    const held=bindingAt(given);if(!held)throw Error('checked certificate binding missing');
    // Serialization cast follows closed bounded native snapshot validation.
    return [{effect:'value',item:held.item.id,slot:'rulesCertificateRequest',value:held.binding as unknown as FieldValue},
      {effect:'operation',k:0,owner:'platform:destination@14',kind:RULES_CERTIFICATE_KIND,attempts:1,for:held.item.id},
      {effect:'attempt',operation:{k:0},attempt:1,result:'opened',selected:null}] satisfies readonly RuleEffect[];
  }},
  'rules-certificate-outcome-v14':{place:'outcome',rules:{selects:true,read:false,retries:()=>false,
    valueDomains:[RULES_POLICY_VALUE_V11,RULES_TREE_PROOF],
    values:rulesCertificateEvidenceValues,
    origin:(_given,operation)=>operation.attempts.find(attempt=>attempt.attempt===1)?.opened??null,
    unknown:()=>({}),wellFormed:(result,answer)=>result==='confirmed'?answer.basis==='own-answer'&&evidence(answer.body):readRecord(answer.body,[])!==null,
    holds:(given,operation)=>{
      if(given.input.type!=='outcome'||given.input.result!=='confirmed'||!evidence(given.input.evidence.body))return false;
      const opened=rulesCertificateOpening(given.own,operation,given.resolved.at),scope=given.state.scope();
      if(!opened||!scope||!same(scope.head,{seq:opened.started.seq,hash:opened.started.hash})
        ||operation.for===undefined||!rulesCertificateBranchMatches(given.state,opened.binding,operation.for))return false;
      const request=given.own(opened.started.seq);if(request?.entry.input.type!=='act')return false;
      const family=rulesCertificateFamily(given,'rules',request.entry.input.signed.intent.fields);
      if(!family||!same(opened.binding.rules,family.rules.fact.at))return false;
      const body=given.input.evidence.body,proposal=checkedPolicy(given,body.proposal);
      if(!same(body.started,opened.started)||body.proposal!==opened.binding.proposal||!proposal)return false;
      const proof=given.value(RULES_TREE_PROOF.domain,body.proof as import('@generalbusiness/dap-contract').Digest,RULES_TREE_PROOF.max);
      return proof!==undefined&&verifyRulesTree(canonicalize(proof),body.proof as import('@generalbusiness/dap-contract').Digest,
        opened.binding,rulesPolicyPatternsV11(proposal.policy)).ok;
    },most:{effects:0,requests:0,operations:0},derives:()=>({effects:[],sends:[],opens:[]}),
  }},
};
