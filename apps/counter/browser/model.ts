/** Proposals are convenience inputs. The native C1 declaration still checks authority and admission. */
import { same } from "@generalbusiness/dap-bytes";
import type { MemberRef, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { canonicalize, isMemberRef, timeMs } from "@generalbusiness/dap-bytes";
import { expectedOf, shapeDeclaredAct, type AskedOf, type Kind, type Members, type ProjectedItem } from "@generalbusiness/dap-client";
import { countingCommitments } from "../commitments.ts";
import { COUNTING_COMMITMENTS_DEFINITION } from "../commitments-pin.ts";
import type { ActorIdentity, Completion, TurnToken } from "./voice-controller.ts";
import { refuseProposal } from "./annotations.ts";

type Definition = typeof countingCommitments;
export type Control = Kind<Definition>;
type Fields<K extends Control> = Members<Definition["acts"][K]["fields"]>;
const declared = countingCommitments.items;
const targetType = declared.configuration.values.target.of;
const generationType = declared.board.values.generation.of;
const serialType = declared.board.values.serial.of;
const promiseSerialType = declared.promise.values.serial.of;
const participantState = (state: string): state is keyof Definition["items"]["participant"]["states"] => Object.hasOwn(declared.participant.states, state);
const boardState = (state: string): state is keyof Definition["items"]["board"]["states"] => Object.hasOwn(declared.board.states, state);

export interface Participant { id: number; revision: number; member: MemberRef; state: keyof Definition["items"]["participant"]["states"] }
export const failureReasons = countingCommitments.acts.fail.fields.reason.of;
export type FailureReason = typeof failureReasons[number];
export interface Pledge {
  id: number; revision: number; state: "pledged"; member: MemberRef; participant: number; admittedAt: number;
  generation: number; serial: number; n: number; until: number; basis: Fields<"commit">["basis"];
}
export interface Board {
  id: number; revision: number; state: keyof Definition["items"]["board"]["states"]; target: number;
  generation: number; serial: number; lastNumber: number; lastSpeaker: MemberRef|null;
  pledge: number|null; lastFulfilledAt: number|null;
  /** These display values come only from the current linked promise, never a scheduler. */
  number: number|null; speaker: MemberRef|null; until: number|null;
}
/** Selected native item fields; this is not a Summary protocol reply. */
export type CountingRead = Pick<Summary,"scope"|"definition"> & { readonly items:readonly ProjectedItem[];readonly status?:Summary["status"] };
export interface CountingView {
  snapshot: CountingRead; configuration: {id:number;revision:number;target:number;controller:MemberRef};
  board: Board|null; participants: Participant[]; pledge: Pledge|null;
  /** May remain live briefly after the board's earlier expiry entry has cleared its link. */
  pendingPromise: Pledge|null;
}
/** Establish is genesis/bootstrap, not a command over an already-established view. */
export interface ProposalOptions { participant?:Fields<"commit">["participant"]; reason?:FailureReason }
function invalid():never { throw new Error("The counting snapshot has invalid values."); }
const numeric = (v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):number => typeof v==="number"&&Number.isSafeInteger(v)&&v>=min&&v<=max?v:invalid();
const member = (v:unknown):MemberRef|null => v===null||v===undefined?null:isMemberRef(v)?v:invalid();
const requiredMember = (v:unknown):MemberRef => member(v)??invalid();
const instant = (v:unknown):number => timeMs(v)??invalid();
const ref = (v:unknown):number|null => v==null?null:numeric(v);

export function countingView(snapshot:CountingRead,scope:ScopeRef):CountingView {
  if(!same(snapshot.scope,scope)||snapshot.definition!==COUNTING_COMMITMENTS_DEFINITION||("status"in snapshot&&snapshot.status!=="active"))throw new Error("This is not the configured counting scope and pin.");
  const configurations=snapshot.items.filter(i=>i.type==="configuration"),boards=snapshot.items.filter(i=>i.type==="board");
  if(configurations.length!==1||boards.length>1||new Set(snapshot.items.map(i=>i.id)).size!==snapshot.items.length)invalid();
  const c=configurations[0]!,controller=requiredMember(c.parties["controller"]),target=numeric(c.values["target"],targetType.min,targetType.max);
  if(c.state!==declared.configuration.initial)invalid();
  const participants=snapshot.items.filter(i=>i.type==="participant").map(i=>{
    if(!participantState(i.state))invalid();
    return{id:numeric(i.id),revision:numeric(i.revision),member:requiredMember(i.parties["agent"]),state:i.state};
  }).sort((a,b)=>a.id-b.id);
  const live=participants.filter(p=>p.state!=="removed");
  if(live.length>declared.participant.max||new Set(live.map(p=>canonicalize(p.member))).size!==live.length)invalid();
  const pending=snapshot.items.filter(i=>i.type==="promise"&&i.state==="pledged");if(pending.length>declared.promise.max)invalid();
  let pendingPromise:Pledge|null=null;
  if(pending.length){
    const p=pending[0]!,raw=p.values["basis"];if(!Array.isArray(raw)||!raw.length||raw.length>declared.promise.values.basis.of.max)invalid();
    const basis=raw.map(v=>{
      if(v===null||typeof v!=="object"||Array.isArray(v)||!("id" in v)||!("member" in v))invalid();
      return{id:numeric(v.id),member:requiredMember(v.member)};
    });
    if(basis.some((p,i)=>i>0&&p.id<=basis[i-1]!.id)||new Set(basis.map(p=>canonicalize(p.member))).size!==basis.length)invalid();
    pendingPromise={id:numeric(p.id),revision:numeric(p.revision),state:"pledged",member:requiredMember(p.parties["agent"]),participant:numeric(p.refs["participant"]),admittedAt:numeric(p.refs["admittedAt"]),generation:numeric(p.values["generation"],generationType.min,generationType.max),serial:numeric(p.values["serial"],promiseSerialType.min,promiseSerialType.max),n:numeric(p.values["n"],declared.promise.values.n.of.min,target),until:instant(p.values["until"]),basis};
    const owner=participants.find(i=>i.id===pendingPromise!.participant);
    if(pendingPromise.admittedAt!==pendingPromise.id||!owner||owner.state!=="active"||!same(owner.member,pendingPromise.member)||!basis.some(i=>i.id===owner.id&&same(i.member,owner.member)))invalid();
  }
  let board:Board|null=null,pledge:Pledge|null=null;
  if(boards.length){
    const b=boards[0]!;if(!boardState(b.state)||!same(b.parties["controller"],controller)||b.values["target"]!==target)invalid();
    const linked=ref(b.refs["pledge"]),until=b.values["until"]==null?null:instant(b.values["until"]);
    board={id:numeric(b.id),revision:numeric(b.revision),state:b.state,target,generation:numeric(b.values["generation"],generationType.min,generationType.max),serial:numeric(b.values["serial"],serialType.min,serialType.max),lastNumber:numeric(b.values["lastNumber"],declared.board.values.lastNumber.of.min,target),lastSpeaker:member(b.parties["lastSpeaker"]),pledge:linked,lastFulfilledAt:ref(b.refs["lastFulfilledAt"]),number:null,speaker:null,until:null};
    if(linked!==null){
      const p=pendingPromise;
      if(!p||p.id!==linked||board.state!=="open"||p.generation!==board.generation||p.serial!==board.serial||p.n!==board.lastNumber+1||p.until!==until)invalid();
      pledge=p;board.number=p.n;board.speaker=p.member;board.until=p.until;
    }else {
      if(until!==null)invalid();
      if(pendingPromise&&(board.state!=="paused"||pendingPromise.generation!==board.generation||pendingPromise.serial!==board.serial||pendingPromise.n!==board.lastNumber+1))invalid();
    }
    if(board.state==="finished"&&board.lastNumber!==target)invalid();
  }else if(pendingPromise)invalid();
  return{snapshot,configuration:{id:numeric(c.id),revision:numeric(c.revision),target,controller},board,participants,pledge,pendingPromise};
}
const matchesIdentity=(view:CountingView,actor:ActorIdentity):boolean=>actor.definition===COUNTING_COMMITMENTS_DEFINITION&&same(actor.scope,view.snapshot.scope)&&same(actor.member.membership,actor.membership);
export function ownedParticipant(view:CountingView,actor:ActorIdentity):Participant|undefined{return view.participants.find(p=>p.state!=="removed"&&same(p.member,actor.member));}
export function controllerOf(view:CountingView,actor:ActorIdentity):boolean{return same(view.configuration.controller,actor.member);}
/** Eligibility is a convenience hint; grants, signer and fairness are still checked natively. */
export function canCommit(view:CountingView,actor:ActorIdentity):boolean {
  const b=view.board,p=ownedParticipant(view,actor),active=view.participants.filter(p=>p.state==="active");
  return matchesIdentity(view,actor)&&!!b&&b.state==="open"&&b.pledge===null&&!view.pendingPromise&&!!p&&p.state==="active"&&b.lastNumber<b.target&&b.serial<serialType.max&&(active.length===1||!same(b.lastSpeaker,actor.member));
}
export function assignedTurn(view:CountingView,actor:ActorIdentity):TurnToken|undefined {
  const b=view.board,p=view.pledge;
  if(!matchesIdentity(view,actor)||!b||b.state!=="open"||!p||b.pledge!==p.id||!same(p.member,actor.member)||p.generation!==b.generation||p.serial!==b.serial||p.n!==b.lastNumber+1||p.until!==b.until)return undefined;
  return{...actor,generation:p.generation,serial:p.serial,N:p.n,expiresAt:p.until};
}
const basis=(roster:Participant[]):Fields<"commit">["basis"]=>roster.filter(p=>p.state==="active").sort((a,b)=>a.id-b.id).map(p=>({id:p.id,member:p.member}));
/** Current fields are ordinary required values. The signing client retains the shaper's beside data. */
function proposed<K extends Control>(view:CountingView,kind:K,asked:AskedOf<Definition,NoInfer<K>> & {fields:Fields<NoInfer<K>>}) {
  const shaped=shapeDeclaredAct(countingCommitments,kind,asked),act=countingCommitments.acts[kind];
  const expected=expectedOf(act,view.snapshot.items,shaped.on,shaped.fields);
  if(act.step==="transition"&&shaped.on!==null&&!Object.hasOwn(expected,"on"))refuseProposal(kind,"item-unavailable");
  for(const name of Object.keys(act.also)) if(!Object.hasOwn(expected,name))refuseProposal(kind,"required-item-unavailable");
  return{kind,on:shaped.on,fields:asked.fields,expected};
}
/** No proposal mutates this snapshot or grants permission to the signing device. */
export function proposal(view:CountingView,actor:ActorIdentity,kind:Control,completion?:Completion,options:ProposalOptions={}) {
  const unavailable=(reason:Parameters<typeof refuseProposal>[1]):never=>refuseProposal(kind,reason);
  if(!matchesIdentity(view,actor))unavailable("device-mismatch");
  const b=view.board,own=ownedParticipant(view,actor);
  const control=()=>{if(!controllerOf(view,actor))unavailable("not-controller");};
  const empty=()=>{if(!b||b.pledge!==null||view.pendingPromise)unavailable("promise-pending");};
  if(kind==="initialize"){
    control();if(b)unavailable("initialized");
    return proposed(view,kind,{fields:{}});
  }
  if(kind==="participate"){
    if(own)unavailable("participating");
    if(view.participants.filter(p=>p.state!=="removed").length>=declared.participant.max)unavailable("roster-full");
    return proposed(view,kind,{fields:{}});
  }
  if(kind==="activate"||kind==="deactivate"||kind==="force-deactivate"||kind==="remove-participant"){
    const p=options.participant===undefined?own:view.participants.find(p=>p.id===options.participant);
    if(!p||p.state==="removed")return unavailable("participant-unavailable");
    if(kind==="activate"||kind==="deactivate"){
      if(!same(p.member,actor.member))unavailable("not-participant-owner");
    }else {control();if(kind==="force-deactivate"&&same(p.member,actor.member))unavailable("own-deactivation");}
    if(p.state!==(kind==="activate"||kind==="remove-participant"?"inactive":"active"))unavailable("participant-changed");
    if(kind!=="activate"&&view.pendingPromise&&same(view.pendingPromise.member,p.member))unavailable("participant-promise");
    return proposed(view,kind,{on:p.id,fields:{}});
  }
  if(!b)return unavailable("board-unavailable");
  if(kind==="commit"){
    if(!canCommit(view,actor)||!own)return unavailable("cannot-commit");
    return proposed(view,kind,{fields:{participant:own.id,generation:b.generation,serial:b.serial+1,n:b.lastNumber+1,basis:basis(view.participants)}});
  }
  if(kind==="fulfill"||kind==="fail"||kind==="cancel"){
    const p=view.pledge;if(!p||b.state!=="open"||b.pledge!==p.id)return unavailable("promise-unavailable");
    if(kind==="cancel")control();else if(!same(p.member,actor.member))unavailable("not-promise-owner");
    if(completion&&!same(assignedTurn(view,actor),completion.turn))unavailable("completion-changed");
    if(kind==="fulfill"&&!completion)unavailable("completion-unavailable");
    const fields={generation:p.generation,serial:p.serial,n:p.n};
    if(kind==="fail"){
      if(!options.reason||!failureReasons.includes(options.reason))return unavailable("failure-reason");
      return proposed(view,kind,{on:p.id,fields:{...fields,reason:options.reason}});
    }
    return proposed(view,kind,{on:p.id,fields});
  }
  control();empty();
  if(kind==="start"&&(b.state!=="paused"||b.lastNumber>=b.target))unavailable("cannot-start");
  if(kind==="pause"&&b.state!=="open")unavailable("not-open");
  if(kind==="reset"){
    if(!["paused","finished"].includes(b.state)||b.generation>=generationType.max)unavailable("cannot-reset");
    return proposed(view,kind,{on:b.id,fields:{generation:b.generation+1}});
  }
  return proposed(view,kind,{on:b.id,fields:{}});
}
export type Proposal = ReturnType<typeof proposal>;
export function label(memberRef:MemberRef):string{const text=memberRef.member.slice(1);return text.charAt(0).toUpperCase()+text.slice(1);}

export { same };
