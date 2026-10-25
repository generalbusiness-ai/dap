/** Q11/G14 native certificate custody. Candidate facts are never authority:
 * callers pass only the engine's admitted own/foreign facts and native state. */
import type { Digest, Entry, FactRef, ScopeRef, Seed } from '@generalbusiness/dap-contract';
import { entryHash, isDigest, isFactRef, isRecord, isScopeRef, same, scopeIdOf, seedDigest, utf8 } from '@generalbusiness/dap-bytes';
import { isEntryOf, sentBy, type Fetched, type Operation, type Own, type RuleGiven, type StateView } from '@generalbusiness/dap-derive';
import { type RulesTreeBinding } from './rules-policy-tree.ts';

export const RULES_CERTIFICATE_KIND = 'certify-rules-tree';
export const RULES_POLICY_VALUE_V11 = { domain:'artroom-rules-policy-1',max:262144 } as const;
export const RULES_EXTENTS_VALUE_V11 = { domain:'artroom-rules-extents-2',max:262144 } as const;
export interface RulesCertificateProvenanceV11 { request: FactRef; certificate: FactRef; proof: Digest; commit: string }
const exact = (v: unknown, names: readonly string[]): v is Record<string, unknown> => isRecord(v) && Object.keys(v).length === names.length && names.every(k=>Object.hasOwn(v,k));
const text = (v:unknown,max:number):v is string => typeof v==='string' && v.length>0 && v.length<=max && utf8(v).length<=max;
const sha1 = (v:unknown):v is string => typeof v==='string' && /^[0-9a-f]{40}$/.test(v);
export function readRulesCertificateBinding(value:unknown):RulesTreeBinding|null {
  if(!exact(value,['rules','proposal','destination','repository','ref','commit']) || !isScopeRef(value['rules']) || value['rules'].kind!=='rules'
    || !isScopeRef(value['destination']) || value['destination'].kind!=='destination' || !isDigest(value['proposal']) || !sha1(value['commit'])
    || !text(value['ref'],267) || !value['ref'].startsWith('refs/heads/') || !exact(value['repository'],['host','namespace','name','id'])
    || !Object.values(value['repository']).every(v=>text(v,256)))return null;
  return {rules:{...value['rules']},proposal:value['proposal'],destination:{...value['destination']},
    repository:{host:value['repository']['host'] as string,namespace:value['repository']['namespace'] as string,name:value['repository']['name'] as string,id:value['repository']['id'] as string},ref:value['ref'],commit:value['commit']};
}
/** Immutable opening only; current head/branch equality remains required at
 * the host before and after I/O and again in native outcome selection. */
export function rulesCertificateOpening(own:Own,operation:Operation,at:ScopeRef):{binding:RulesTreeBinding;started:FactRef}|null {
  try {
    if(operation.owner!=='platform:destination@14'||operation.kind!==RULES_CERTIFICATE_KIND||operation.most!==1
      || operation.attempts.length!==1 || operation.attempts[0]!.attempt!==1 || operation.for===undefined)return null;
    const opened=operation.attempts[0]!.opened, sealed=own(opened);
    if(!sealed || operation.id!==`${opened}:0` || sealed.entry.seq!==opened || !same(sealed.entry.at,at) || entryHash(sealed.entry)!==sealed.hash
      || sealed.entry.input.type!=='act' || sealed.entry.input.signed.intent.kind!==RULES_CERTIFICATE_KIND)return null;
    const operations=sealed.entry.effects.filter(e=>e.effect==='operation');
    if(operations.length!==1 || !operations.some(e=>e.effect==='operation' && e.k===0 && e.owner===operation.owner && e.kind===operation.kind && e.attempts===1 && e.for===operation.for))return null;
    const attempts=sealed.entry.effects.filter(e=>e.effect==='attempt');
    if(attempts.length!==1 || !attempts.some(e=>e.effect==='attempt' && same(e.operation,{k:0}) && e.attempt===1 && e.result==='opened' && e.selected===null))return null;
    const snapshots=sealed.entry.effects.filter(e=>e.effect==='value' && e.item===operation.for && e.slot==='rulesCertificateRequest');
    if(snapshots.length!==1 || snapshots[0]!.effect!=='value')return null;
    const binding=readRulesCertificateBinding(snapshots[0]!.value);
    if(!binding || !same(binding.destination,at) || sealed.entry.input.signed.intent.fields['proposal']!==binding.proposal)return null;
    return {binding,started:{at:{...at},seq:opened,hash:sealed.hash}};
  }catch{return null;}
}

export function rulesCertificateBranchMatches(state:StateView,binding:RulesTreeBinding,holder:number):boolean {
  const branch=state.item(holder);
  return !!branch && branch.type==='branch' && branch.state==='ready' && same(branch.values['repository'],binding.repository)
    && `refs/heads/${branch.values['name']}`===binding.ref && branch.values['head']===binding.commit && branch.values['rules']===binding.rules.scope;
}

interface Birth { fact:FactRef; entry:Entry; seed:Seed; fields:Record<string,unknown> }
function birth(copy:Fetched|undefined,pin:string,kind:ScopeRef['kind']):Birth|null {
  if(!copy || copy.under!==`platform:${kind}` || copy.fact.seq!==0 || !isEntryOf(copy.entry,copy.fact) || copy.entry.seq!==0 || copy.entry.prev!==null
    || copy.entry.input.type!=='genesis' || copy.entry.input.decision!=='applied' || copy.entry.input.kind!=='establish')return null;
  const input=copy.entry.input;
  if(input.seed.definition!==pin || input.seed.kind!==kind || input.inc!==copy.fact.at.inc || copy.fact.at.kind!==kind
    || scopeIdOf(input.seed)!==copy.fact.at.scope || !input.message || input.message.class!=='request' || input.message.type!=='create'
    || !isRecord(input.message.body) || !isRecord(input.message.body['fields']))return null;
  return {fact:copy.fact,entry:copy.entry,seed:input.seed,fields:input.message.body['fields']};
}
const find=(given:RuleGiven,fact:FactRef):Fetched|undefined=>given.uses.find(copy=>same(copy.fact,fact));
/** Fixed admitted fact set; no arbitrary graph walk or incarnation inference. */
export function rulesCertificateFamily(given:RuleGiven,otherKind:'rules'|'destination',fields:Readonly<Record<string,unknown>>=given.resolved.fields):
  {directory:Birth;membership:Birth;rules:Birth;destination:Birth}|null {
  try {
    const own=given.own(0),ownKind=given.resolved.at.kind;
    if(!own || !['rules','destination'].includes(ownKind))return null;
    const ownCopy:Fetched={fact:{at:given.resolved.at,seq:0,hash:own.hash},entry:own.entry,under:`platform:${ownKind}`};
    const directoryFact=fields['directoryBirth'],memberFact=fields['membershipBirth'],otherFact=fields[otherKind+'Birth'];
    if(!isFactRef(directoryFact)||!isFactRef(memberFact)||!isFactRef(otherFact))return null;
    const directory=birth(find(given,directoryFact),'platform:directory@18','directory');
    const membership=birth(find(given,memberFact),'platform:membership@8','membership');
    const rules=birth(ownKind==='rules'?ownCopy:find(given,otherFact),'platform:rules@11','rules');
    const destination=birth(ownKind==='destination'?ownCopy:find(given,otherFact),'platform:destination@14','destination');
    if(!directory||!membership||!rules||!destination)return null;
    for(const [child,ordinal] of [[membership,0],[rules,1],[destination,2]] as const){
      const input=child.entry.input;if(input.type!=='genesis'||!same(child.seed.creator,directory.fact.at)||!same(input.source,directory.fact)
        ||child.seed.ordinal!==ordinal||child.seed.cause!==seedDigest(directory.seed)||input.n===null||!input.message
        ||!sentBy(directory.entry,{from:directory.fact,n:input.n,to:child.seed,message:input.message}))return null;
    }
    if(!same(rules.fields['directory'],directory.fact.at)||!same(destination.fields['directory'],directory.fact.at)
      ||rules.fields['membership']!==membership.fact.at.scope||destination.fields['membership']!==membership.fact.at.scope
      ||destination.fields['rules']!==rules.fact.at.scope||rules.fields['branch']!==destination.fields['branch']||rules.fields['ownerMayReview']!==false)return null;
    const signer=given.resolved.signer;
    if(signer && (!same(signer.member.membership,membership.fact.at) || signer.principal && !same(signer.principal.membership,membership.fact.at)))return null;
    return {directory,membership,rules,destination};
  }catch{return null;}
}

/** Presented certificate facts must be real admitted opening/selected outcome
 * facts of the proven G14 sibling, not proof bytes or a host success flag. */
export function rulesPublishedCertificate(given:RuleGiven,proposal:Digest,proof:Digest):
  {binding:RulesTreeBinding;provenance:RulesCertificateProvenanceV11}|null {
  try {
    const family=rulesCertificateFamily(given,'destination');
    const request=given.resolved.fields['certificateRequest'],certificate=given.resolved.fields['certificate'];
    if(!family||!isFactRef(request)||!isFactRef(certificate)||!same(request.at,family.destination.fact.at)||!same(certificate.at,request.at))return null;
    const opening=find(given,request),answer=find(given,certificate);
    if(!opening||!answer||opening.under!=='platform:destination'||answer.under!=='platform:destination'
      ||!isEntryOf(opening.entry,request)||!isEntryOf(answer.entry,certificate)||opening.entry.input.type!=='act'
      ||opening.entry.input.signed.intent.kind!==RULES_CERTIFICATE_KIND||answer.entry.input.type!=='outcome')return null;
    const input=answer.entry.input,op=`${request.seq}:0`;
    if(input.owner!=='platform:destination@14'||input.kind!==RULES_CERTIFICATE_KIND||input.operation!==op||input.attempt!==1
      ||input.result!=='confirmed'||input.evidence.basis!=='own-answer'||answer.entry.seq!==request.seq+1||answer.entry.prev!==request.hash
      ||!exact(input.evidence.body,['proposal','proof','started'])||input.evidence.body['proposal']!==proposal||input.evidence.body['proof']!==proof
      ||!same(input.evidence.body['started'],request))return null;
    const selected=answer.entry.effects.filter(e=>e.effect==='attempt');
    if(selected.length!==1||!selected.some(e=>e.effect==='attempt'&&e.operation===op&&e.attempt===1&&e.result==='confirmed'&&e.selected===true))return null;
    const openingEffect=opening.entry.effects.find(e=>e.effect==='operation'&&e.k===0);
    if(!openingEffect||openingEffect.effect!=='operation'||typeof openingEffect.for!=='number')return null;
    const operation:Operation={id:op as Operation['id'],owner:'platform:destination@14',kind:RULES_CERTIFICATE_KIND,most:1,for:openingEffect.for,
      attempts:[{attempt:1,opened:request.seq,outcomes:[]}],selected:null};
    const captured=rulesCertificateOpening(seq=>seq===request.seq?{entry:opening.entry,hash:request.hash}:null,operation,request.at);
    if(!captured||!same(captured.binding.rules,given.resolved.at)||captured.binding.proposal!==proposal
      ||!same(captured.binding.repository,family.destination.fields['repository'])
      ||captured.binding.ref!==`refs/heads/${family.destination.fields['branch']}`)return null;
    // All candidate birth refs in the opening must be exactly the same real
    // siblings that this reciprocal publication just authenticated.
    const fields=opening.entry.input.signed.intent.fields;
    if(!same(fields['directoryBirth'],family.directory.fact)||!same(fields['membershipBirth'],family.membership.fact)
      ||!same(fields['rulesBirth'],family.rules.fact))return null;
    return {binding:captured.binding,provenance:{request,certificate,proof,commit:captured.binding.commit}};
  }catch{return null;}
}
