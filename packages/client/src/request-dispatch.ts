/** Strict first-dispatch ownership. Only a committed prepared attempt can
 * mint its one-use transport closure. Restore/unknown recovery never posts.
 * The caller holds the identity lock and verifies accepted native receipts. */
import type { Answer, Receipt } from "@generalbusiness/dap-contract";
import { canonicalize, type ByteStream } from "@generalbusiness/dap-bytes";
import { httpTransport } from "./http.ts";
import { ScopeHandle } from "./handle.ts";
import { activeAttempt, actURL, contextKey, envelopeKey, fitsPending, legacyUnknown, markActive, requestJournal, type AttemptJournal, type RefusalJudgment, type RequestActorIdentity, type RequestEnvelope as PreparedEnvelope } from "./request-attempts.ts";
export interface RequestDispatchOutcome { readonly status: "recorded" | "refused" | "unknown" | "blocked"; readonly reason?: string }
export type TrustedRequestFetch=(url:string,init:{method:"POST";headers:Record<string,string>;body:string;signal:never;redirect:"error"})=>Promise<{status:number;body:ByteStream|null;headers:{get(name:string):string|null};url:string;redirected:boolean}>;
export interface RequestJournalRecord {readonly envelope:PreparedEnvelope;readonly journal?:AttemptJournal}
export interface RequestJournalStore<T extends RequestJournalRecord> {load():Promise<T|null>;save(value:T):Promise<void>}
const unknown=(reason="The exact original request remains unresolved."):RequestDispatchOutcome=>({status:"unknown",reason});
const sameStatus=(answer:Answer,status:number):boolean=>status===(answer.answer==="accepted"?200:answer.answer==="archived"?410:answer.answer==="unavailable"?503:answer.answer==="mismatch"?409:answer.reason==="unauthorized"?403:422);
const cancel=(body:ByteStream|null):void=>{try{void body?.getReader().cancel().catch(()=>undefined);}catch{ /* Disposal cannot restore knowledge. */ }};

/** Gateway owns every caller's lock acquisition. This helper never accepts a caller's knowledge/ticket assertion. */
export function requestAttemptDispatcher(options:{identity:RequestActorIdentity;kinds:readonly string[];current():boolean;fetch?:TrustedRequestFetch;accepted(receipt:Receipt,envelope:PreparedEnvelope):Promise<RequestDispatchOutcome>;settle(envelope:PreparedEnvelope):Promise<{ok:true;receipt:Receipt}|{ok:false}>;refresh():void}) {
  const { validEnvelope, validJournal, requestBody } = requestJournal(options.kinds);
  const identity=JSON.parse(JSON.stringify(options.identity)) as RequestActorIdentity,url=actURL(identity);
  const current=()=>{if(!options.current())throw new Error("The private dispatch context is no longer current.");};
  const held=async<T extends RequestJournalRecord>(store:RequestJournalStore<T>,envelope:PreparedEnvelope):Promise<T>=>{
    current();const record=await store.load();current();
    if(!validEnvelope(envelope,identity)||!record||!validEnvelope(record.envelope,identity)||envelopeKey(record.envelope)!==envelopeKey(envelope)||record.journal&&!validJournal(record.journal,identity,envelope)||!fitsPending(identity,record))throw new Error("The private original attempt is unavailable.");
    return (globalThis as unknown as { structuredClone<T>(value: T): T }).structuredClone(record);
  };
  const save=async<T extends RequestJournalRecord>(store:RequestJournalStore<T>,record:T,journal:AttemptJournal):Promise<T>=>{current();const latest=await held(store,record.envelope);if(canonicalize(latest)!==canonicalize(record))throw new Error("The private attempt changed before commit.");const next={...record,journal};if(!fitsPending(identity,next))throw new Error("Private attempt history is full.");await store.save(next);current();return next;};
  const accepted=async<T extends RequestJournalRecord>(store:RequestJournalStore<T>,record:T,receipt:Receipt):Promise<RequestDispatchOutcome>=>{
    const answer=await options.accepted(receipt,record.envelope);current();
    if(answer.status!=="recorded")return unknown();
    // A failed journal commit keeps inflight/unknown custody; an enum alone cannot clear it.
    const journal=record.journal??legacyUnknown(record.envelope);
    if(activeAttempt(journal).phase!=="recorded")await save(store,record,markActive(journal,"recorded"));
    return{status:"recorded"};
  };
  const recover=async<T extends RequestJournalRecord>(store:RequestJournalStore<T>,record:T):Promise<RequestDispatchOutcome>=>{
    const answer=await options.settle(record.envelope);current();return answer.ok?accepted(store,record,answer.receipt):unknown();
  };
  async function run<T extends RequestJournalRecord>(store:RequestJournalStore<T>,envelope:PreparedEnvelope,readOnly=false):Promise<RequestDispatchOutcome> {
    let record:T;
    try{
      if(!validEnvelope(envelope,identity))return{status:"blocked",reason:"The malformed private original is retained; nothing was dispatched."};
      const original=await store.load();current();
      if(original?.journal&&!validJournal(original.journal,identity,envelope))return{status:"blocked",reason:"The malformed private journal is retained; nothing was dispatched."};
      record=await held(store,envelope);
      if(!record.journal)return await recover(store,record); // Legacy has no first-dispatch proof.
      const attempt=activeAttempt(record.journal);
      if(attempt.phase==="refused")return{status:"refused",reason:"The original first attempt was refused by the configured service."};
      if(readOnly||attempt.phase!=="prepared")return await recover(store,record); // No later POST settles unknown/inflight/recorded.
      if(!options.fetch)return unknown("Trusted submit transport is unavailable; the prepared envelope was not dispatched.");
      record=await save(store,record,markActive(record.journal,"inflight"));
      record=await held(store,envelope);if(!record.journal||activeAttempt(record.journal).phase!=="inflight")throw new Error("The original inflight attempt changed before POST.");
      // This closure is the fresh single-use ticket, minted only after commit. It never survives restore.
      const exactBody=requestBody(envelope);
      let used=false,responseStatus:number|undefined;
      const transport=httpTransport(identity.origin,{fetch:async(request,init)=>{
        current();if(used||request!==url||init?.method!=="POST"||canonicalize(JSON.parse(init.body??"null"))!==canonicalize(JSON.parse(exactBody))||!init.signal)throw new Error("Private request correlation is unavailable.");used=true;
        const response=await options.fetch!(url,{method:"POST",headers:init.headers??{},body:exactBody,signal:init.signal as never,redirect:"error"});
        const type=typeof response.headers?.get==="function"?response.headers.get("content-type")?.split(";",1)[0]?.trim().toLowerCase():undefined;
        if(!options.current()||(init.signal as { readonly aborted: boolean }).aborted||response.redirected||response.url!==url||type!=="application/json"){cancel(response.body);throw new Error("Submit response identity is unavailable.");}
        responseStatus=response.status;return response;
      }});
      const answer=await new ScopeHandle(transport,identity.scope.scope).submit(envelope.signed,envelope.grants,envelope.beside);current();
      if(!used||responseStatus===undefined||!sameStatus(answer,responseStatus))throw new Error("Submit response status is unavailable.");
      if(answer.answer==="accepted")return await accepted(store,record,answer.receipt);
      if(answer.answer==="refused"){
        const refusal:RefusalJudgment={answer,origin:identity.origin,url,request:envelopeKey(envelope),context:contextKey(identity)};
        await save(store,record,markActive(record.journal!,"refused",refusal));options.refresh();
        return{status:"refused",reason:"The configured service refused this first attempt."};
      }
      await save(store,record,markActive(record.journal!,"unknown"));return unknown();
    }catch{
      // A committed inflight marker already fences crash/failed unknown writes. Never overwrite a terminal/newer record.
      try{const latest=await held(store,envelope);if(latest.journal&&activeAttempt(latest.journal).phase==="inflight")await save(store,latest,markActive(latest.journal,"unknown"));}catch{ /* Exact bytes stay in custody. */ }
      return unknown();
    }
  }
  return{run,check:<T extends RequestJournalRecord>(store:RequestJournalStore<T>,envelope:PreparedEnvelope)=>run(store,envelope,true),supported:()=>!!options.fetch};
}
