/** Actual SDK adapter. Bootstrap/enrollment belongs to F1/C4, never this stage.
 * Each command and each voice report is kept in the client's `Custody` before it is sent. */
import type { Answer, Receipt } from "@generalbusiness/dap-contract";
import type { ApplicationInstallation } from "@generalbusiness/dap-platform/application";
import { b64url, canonicalize, intentDigest, timeOf, type ByteStream } from "@generalbusiness/dap-bytes";
import { RETIRED_REQUEST, ScopeHandle, browserRequests, completeApplicationItems, httpTransport, meaningOf, observeScope, openHttpHeadStream, requestKey, requestSession, signerSessionRequest, shapeDeclaredAct, signedIntent, unsentError,
  type ClientCustodyStore, type CustodyRecord, type Envelope, type Fetch, type HeadStreamFetch, type Observation, type ObservationState, type RequestSettled, type Session, type Signer } from "@generalbusiness/dap-client";
import { countingCommitments as counting } from "../commitments.ts";
import { COUNTING_COMMITMENTS_DEFINITION as COUNTING_DEFINITION } from "../commitments-pin.ts";
import { assignedTurn, countingView, ownedParticipant, proposal, same, type Control, type ProposalOptions, type CountingRead, type CountingView } from "./model.ts";
import { counterStateProjection } from "./projection.ts";
import { correctionRoom, refusedReport, unsentReport, validReport, type ActorIdentity, type Completion, type CustodyLock, type PendingReport, type PendingStore, type Reporter, type ReportOutcome } from "./voice-controller.ts";

/** The one trusted send of an act. The gateway checks that the response answers this exact request. */
export type TrustedActFetch=(url:string,init:{method:"POST";headers:Record<string,string>;body:string;signal:AbortSignal;redirect:"error"})=>Promise<{status:number;body:ByteStream|null;headers:{get(name:string):string|null};url:string;redirected:boolean}>;
export type CommandOutcome=ReportOutcome|{readonly status:"blocked";readonly reason:string;readonly definitelyUnsent?:true;readonly refreshing?:true};
export interface StageGateway extends Reporter {
  observe(emit:(state:ObservationState<CountingRead>,view?:CountingView)=>void):Observation;
  command(kind:Control,options?:ProposalOptions):Promise<CommandOutcome>;
  checkCommand():Promise<ReportOutcome|null>;
  resumeCommand():Promise<ReportOutcome|null>;
  commandResumeReady():boolean;
  /** A kept command is present even when its record is malformed.
   * Only an empty target returns null; unknown is a display label. */
  pendingCommand():string|null;
  restoreCommand():Promise<void>;
  /** Removes the slots of the retired format and gives the words that say so; null when there were none. */
  retired?():Promise<string|null>;
  dispose():void;
}
/** The acts a Counter command may sign. `fulfill` is the voice report's act. */
export const COMMANDS:readonly string[]=["initialize","participate","activate","deactivate","force-deactivate","remove-participant","start","commit","fail","cancel","pause","reset"];
const sameStatus=(answer:Answer,status:number):boolean=>status===(answer.answer==="accepted"?200:answer.answer==="archived"?410:answer.answer==="unavailable"?503:answer.answer==="mismatch"?409:answer.reason==="unauthorized"?403:422);
const cancel=(body:ByteStream|null):void=>{try{void body?.getReader().cancel().catch(()=>undefined);}catch{ /* Disposal cannot restore knowledge. */ }};

export function nativeGateway(configured:ActorIdentity,signer:Signer,options:{current():boolean;lock:CustodyLock;voiceStore:PendingStore;custody:ClientCustodyStore;
  /** Removes slots of the retired format; true when one was there. */ retired?:()=>Promise<boolean>;
  fetch?:Fetch;headFetch?:HeadStreamFetch;actFetch?:TrustedActFetch;application?:Pick<ApplicationInstallation,"scope"|"directory"|"item"|"definition">;now?:()=>number}):StageGateway {
  const identity=JSON.parse(JSON.stringify(configured)) as ActorIdentity;
  const application=options.application?JSON.parse(canonicalize(options.application)) as NonNullable<typeof options.application>:undefined;
  if(application&&(!same(application.scope,identity.scope)||application.definition!==identity.definition))throw new Error("The installed Counter does not match this device.");
  const origin=new URL(identity.origin);if(origin.origin!==identity.origin||origin.pathname!=="/"||origin.search||origin.hash||origin.username||origin.password||!["https:","http:"].includes(origin.protocol))throw new Error("The configured service must be an exact trusted origin.");
  if(identity.definition!==COUNTING_DEFINITION||signer.key!==identity.publicKey||!same(identity.member.membership,identity.membership))throw new Error("This enrolled device does not match the configured counting identity.");
  // The signer holds a browser key capability; no seed or token reaches a URL or view.
  const lifetime=new AbortController();let alive=true;
  const now=options.now??(()=>Date.now());
  let session:Session|null=null,view:CountingView|undefined,observer:Observation|undefined,pending:string|null=null,fresh=false,commandPrepared=false;
  const usable=()=>alive&&options.current();
  const current=()=>{if(!usable())throw new Error("This device context is no longer current.");};
  // A receipt follow can issue another GET after its first read. Fence each dispatch, including provided gateway fetches.
  const readFetch:Fetch=(url,init)=>{current();return options.fetch?options.fetch(url,init):fetch(url,{...init,redirect:"error",signal:init?.signal?AbortSignal.any([init.signal,lifetime.signal]):lifetime.signal});};
  const transport=httpTransport(identity.origin,{fetch:readFetch});
  const handle=()=>new ScopeHandle(transport,identity.scope.scope,session?.reader()??null);
  const trusted:TrustedActFetch|undefined=options.actFetch??(options.fetch?undefined:typeof globalThis.fetch==="function"?((url,init)=>fetch(url,{...init,signal:AbortSignal.any([init.signal,lifetime.signal])})):undefined);
  const actURL=`${identity.origin}/v1/scopes/${encodeURIComponent(identity.scope.scope)}/acts`;
  /** The one send of an exact envelope, through the trusted fetch. A response that does not answer this request is a lost reply. */
  const post=async(envelope:Envelope):Promise<Answer>=>{
    if(!trusted)throw new Error("Trusted submit transport is unavailable.");
    let used=false,responseStatus:number|undefined;
    const exact=canonicalize(envelope.signed);
    const sending=httpTransport(identity.origin,{fetch:async(request,init)=>{
      current();
      if(used||request!==actURL||init?.method!=="POST"||canonicalize(JSON.parse(init.body??"null")?.signed)!==exact||!init.signal)throw new Error("Private request correlation is unavailable.");used=true;
      const response=await trusted(actURL,{method:"POST",headers:init.headers??{},body:init.body!,signal:init.signal as AbortSignal,redirect:"error"});
      const type=typeof response.headers?.get==="function"?response.headers.get("content-type")?.split(";",1)[0]?.trim().toLowerCase():undefined;
      if(!options.current()||(init.signal as {readonly aborted:boolean}).aborted||response.redirected||response.url!==actURL||type!=="application/json"){cancel(response.body);throw new Error("Submit response identity is unavailable.");}
      responseStatus=response.status;return response;
    }});
    const answer=await new ScopeHandle(sending,identity.scope.scope).submit(envelope.signed,[],envelope.beside);current();
    if(!used||responseStatus===undefined||!sameStatus(answer,responseStatus))throw new Error("Submit response status is unavailable.");
    return answer;
  };
  /** An acceptance counts only when the scope's own record holds this exact signed request. */
  const recorded=async(receipt:Receipt,envelope:Envelope):Promise<boolean>=>{
    if(receipt.definition!==identity.definition||receipt.intent!==intentDigest(envelope.signed.intent)||!same(receipt.fact.at,identity.scope))return false;
    const followed=await handle().followReceipt(receipt);current();
    return followed.ok&&followed.entry.input.type==="act"&&canonicalize(followed.entry.input.signed)===canonicalize(envelope.signed);
  };
  const requests=browserRequests(options.custody,{service:identity.origin,membership:identity.membership,signer:identity.publicKey,target:identity.scope},{
    current:usable,post,recorded,
    settle:async envelope=>{current();const answer=await handle().settle(envelope.signed);current();return answer.ok?answer.value:null;},
  },now);
  /** A kept record is an act of this device to this scope. Anything else stays in custody, unsent. */
  const ownAct=(record:CustodyRecord)=>{const intent=record.envelope.signed.intent;return intent.actor===identity.publicKey&&same(intent.to,identity.scope);};
  const commandRecord=(record:CustodyRecord)=>ownAct(record)&&COMMANDS.includes(record.envelope.signed.intent.kind);
  const candidate=(kind:Control,completion?:Completion,details:ProposalOptions={})=>{if(!view||!fresh)throw new Error("A current counting snapshot is required.");const plan=proposal(view,identity,kind,completion,details),shaped=shapeDeclaredAct(counting,kind,{on:plan.on,fields:plan.fields});return{plan,shaped};};
  /** The signing of one act under `key`, from a plan made now. */
  const signing=(kind:Control,key:string,completion?:Completion,details:ProposalOptions={})=>{
    const {plan,shaped}=candidate(kind,completion,details);
    const build=async()=>{const signed=await signedIntent(signer,{to:identity.scope,kind,on:shaped.on,fields:shaped.fields,expected:plan.expected},{now:now(),idempotencyKey:key});current();
      return{binding:{definition:"counting",kind,declaration:null,pinned:identity.definition},envelope:{signed,beside:shaped.beside}};};
    return{meaning:meaningOf({kind,on:shaped.on,fields:shaped.fields,expected:plan.expected}),build};
  };
  const notAfter=()=>timeOf(now()+60_000);
  const outcomeOf=(settled:RequestSettled):ReportOutcome=>{
    if(settled.status==="recorded"){observer?.refresh();return{status:"recorded"};}
    if(settled.status==="refused"){observer?.refresh();return{status:"refused",reason:`The service refused this request (${settled.reason}).`};}
    return{status:"unknown",reason:"The exact original request remains unresolved."};
  };
  /** The newest unresolved command at the target: its key and record, or null. */
  const command=async()=>{const open=(await requests.unresolved()).filter(r=>r.record.envelope.signed.intent.kind!=="fulfill");current();return open.at(-1)??null;};
  const retainCommandPresence=async()=>{
    const held=await command();
    pending=held===null?null:commandRecord(held.record)?held.record.envelope.signed.intent.kind:"unknown";
    commandPrepared=!!held&&commandRecord(held.record)&&held.record.phase==="prepared";
    return held;
  };
  const neverSigned=async()=>{throw new Error("A kept request is never signed again.");};
  /** The voice slot as the store holds it now, with the post-operation custody, when it is still this report. */
  const withCustody=async(report:PendingReport,result:ReportOutcome):Promise<ReportOutcome>=>{
    current();const held=await options.voiceStore.load();current();
    return held&&validReport(held,identity)&&held.key===report.key?{...result,custody:structuredClone(held)}:result;
  };
  const voiceRecord=async(report:PendingReport)=>{const record=await requests.find(report.key);current();if(record&&(!ownAct(record)||record.envelope.signed.intent.kind!=="fulfill"))throw new Error("The kept report is not this device's fulfillment.");return record;};
  const sendReport=async(report:PendingReport,resign:boolean):Promise<ReportOutcome>=>{
    let plan:ReturnType<typeof signing>|null=null;
    const record=await voiceRecord(report);
    // A kept record that is not refused is sent with its own bytes; a new signing needs a current plan.
    if(!record||resign){try{plan=signing("fulfill",report.key,report.completion);}catch{return{status:"blocked",reason:"This report is unavailable locally. Nothing was submitted."};}}
    try{return outcomeOf(await requests.send(report.key,plan?plan.meaning:record!.meaning,plan?plan.build:neverSigned,{notAfter:notAfter(),...(resign?{resign:true}:{})}));}
    catch(error){return unsentError(error)?{status:"blocked",reason:"The report was not sent. Its custody record is kept unchanged."}:{status:"unknown",reason:"The exact original request remains unresolved."};}
  };
  const turnCurrent=(report:PendingReport)=>{const turn=view&&assignedTurn(view,identity);return !!turn&&same(turn,report.completion.turn);};
  return{
    observe(emit){
      observer=observeScope<CountingRead>({context:{origin:identity.origin,deployment:identity.deployment,scope:identity.scope,definition:identity.definition,membership:identity.membership,member:identity.member.member,key:identity.publicKey},current:usable,
        authenticate:async()=>options.lock.run(async()=>{current();const signed=await signerSessionRequest(identity.membership,signer,timeOf(Date.now()+60_000),b64url(crypto.getRandomValues(new Uint8Array(16))));current();const answer=await requestSession(identity.origin,identity.membership.scope,signed,{fetch:readFetch});current();if(answer.ok)session=answer.session;return answer.ok?{ok:true,session:answer.session}:answer;}),
        snapshot:async next=>{session=next;if(!application)return{ok:false,reason:"unavailable"};return completeApplicationItems(await handle().applicationProjection({v:1,scope:identity.scope,directory:application.directory,install:application.item,projection:"state",items:{}}),counterStateProjection);},
        open:(next,signal)=>openHttpHeadStream(identity.origin,identity.scope,next,signal,options.headFetch?{fetch:options.headFetch}:{}),
        // Counter exposes projection readiness. A working stream alone does not change it.
        emit:state=>{if(!usable()||state.status==="streaming")return;fresh=state.status==="current";if(fresh&&state.status==="current"){try{view=countingView(state.snapshot.value,identity.scope);}catch{view=undefined;fresh=false;emit({status:"error",reason:"The counting snapshot is invalid."});return;}}emit(state,view);},
      });return observer;
    },
    obsolete:completion=>{if(!usable()||!fresh||!view||!view.board)return false;const t=completion.turn,b=view.board,turn=assignedTurn(view,identity);return !ownedParticipant(view,identity)||b.generation!==t.generation||b.serial!==t.serial||b.lastNumber>=t.N||!view.pledge||!!turn&&(turn.N!==t.N||turn.expiresAt!==t.expiresAt);},
    audioObsolete:marker=>{if(!usable()||!fresh||!view||!view.board)return false;const p=view.pendingPromise,t=marker.turn;return !p||p.generation!==t.generation||p.serial!==t.serial||p.n!==t.N||!same(p.member,identity.member);},
    resumeReady:report=>usable()&&fresh&&!!view&&!!ownedParticipant(view,identity)&&turnCurrent(report)&&Date.now()<report.completion.turn.expiresAt&&validReport(report,identity)&&unsentReport(report),
    resume:report=>options.lock.run(async()=>{current();const held=await options.voiceStore.load();
      if(!fresh||!held||!validReport(held,identity)||held.key!==report.key||!unsentReport(held)||!view||!ownedParticipant(view,identity)||Date.now()>=held.completion.turn.expiresAt||!turnCurrent(held))return{status:"blocked",reason:"The original report has no current definitely-unsent dispatch proof."};
      return withCustody(held,await sendReport(held,false));}),
    // A correction signs again under the same key: the turn is current, custody holds a refusal that a new state can answer,
    // and the record has room for one more signing.
    correctionReady:report=>{try{current();if(!trusted||!refusedReport(report)||!correctionRoom(report)||!["guard-failed","revision-moved"].includes(report.custody?.reason??""))return false;if(!turnCurrent(report))return false;candidate("fulfill",report.completion);return true;}catch{return false;}},
    refresh:()=>observer?.refresh(),
    submit:(report,correcting)=>options.lock.run(async()=>{current();if(!trusted)return{status:"blocked",reason:"Trusted submit transport is unavailable. Nothing was submitted."};return withCustody(report,await sendReport(report,correcting));}),
    reconcile:report=>options.lock.run(async()=>{current();let result:ReportOutcome;try{result=outcomeOf((await requests.settle(report.key))??{status:"unknown"});}catch{result={status:"unknown",reason:"The exact original request remains unresolved."};}return withCustody(report,result);}),
    async command(kind,details={}){return options.lock.run(async():Promise<CommandOutcome>=>{
      current();await retainCommandPresence();if(pending!==null||await options.voiceStore.load())return{status:"unknown",reason:"Check the retained request before another command."};
      if(!trusted)return{status:"blocked",definitelyUnsent:true,reason:"Trusted submit transport is unavailable. Nothing was submitted."};
      const key=requestKey();let plan:ReturnType<typeof signing>;
      try{plan=signing(kind,key,undefined,details);}catch{return{status:"blocked",definitelyUnsent:true,...(!fresh?{refreshing:true as const}:{}),reason:"This candidate is unavailable locally. Nothing was submitted."};}
      let settled:RequestSettled;
      try{settled=await requests.send(key,plan.meaning,plan.build,{notAfter:notAfter()});}
      catch(error){
        const kept=await requests.find(key).catch(()=>undefined);await retainCommandPresence().catch(()=>{pending="unknown";commandPrepared=false;});
        if(kept===null&&unsentError(error))return{status:"blocked",definitelyUnsent:true,reason:"Private command custody is unavailable. Nothing was submitted."};
        return unsentError(error)?{status:"blocked",reason:"Private command custody is unavailable. The original command is kept; Check it."}:{status:"unknown",reason:"The exact original request remains unresolved."};
      }
      await retainCommandPresence();return outcomeOf(settled);
    });},
    async checkCommand(){return options.lock.run(async()=>{current();const held=await retainCommandPresence();if(held===null)return null;if(!commandRecord(held.record))return{status:"blocked",reason:"The malformed original command remains in private custody."};
      let result:ReportOutcome;try{result=outcomeOf((await requests.settle(held.key))??{status:"unknown"});}catch{result={status:"unknown",reason:"The exact original request remains unresolved."};}
      await retainCommandPresence();return result;});},
    async resumeCommand(){return options.lock.run(async()=>{current();const held=await retainCommandPresence();if(held===null)return null;
      const voiceHeld=await options.voiceStore.load();current();if(!fresh||voiceHeld||!commandRecord(held.record)||held.record.phase!=="prepared"){commandPrepared=false;return{status:"blocked",reason:"The original command has no current definitely-unsent dispatch proof."};}
      commandPrepared=false;let result:ReportOutcome;
      try{result=outcomeOf(await requests.send(held.key,held.record.meaning,neverSigned,{notAfter:notAfter()}));}catch{result={status:"unknown",reason:"The exact original request remains unresolved."};}
      await retainCommandPresence();return result;
    });},
    commandResumeReady:()=>usable()&&fresh&&commandPrepared,
    pendingCommand:()=>pending,
    async restoreCommand(){await retainCommandPresence();},
    async retired(){return options.retired&&await options.lock.run(()=>options.retired!())?RETIRED_REQUEST:null;},
    dispose(){alive=false;lifetime.abort();observer?.cancel();session=null;view=undefined;},
  };
}
