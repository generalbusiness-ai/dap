/** Counting-specific completion/audio custody around the shared strict
 * request journal. Its act list remains the pinned Counting definition. */
import { canonicalize, isRecord } from "@generalbusiness/dap-bytes";
import { requestJournal, activeRequestAttempt as activeAttempt, fitsRequestPending as fitsPending } from "@generalbusiness/dap-client";
import type { RequestAttemptJournal as AttemptJournal } from "@generalbusiness/dap-client";
import { countingCommitments as counting } from "../commitments.ts";
import type { ActorIdentity, AudioStart, PendingReport, PreparedEnvelope } from "./voice-controller.ts";
export { REQUEST_MAX_ATTEMPTS as MAX_ATTEMPTS, REQUEST_SLOT_BYTES as SLOT_BYTES, activeRequestAttempt as activeAttempt,
  appendPreparedRequest as appendPrepared, markRequestAttempt as markActive, unknownLegacyRequest as legacyUnknown,
  fitsRequestPending as fitsPending, requestEnvelopeKey as envelopeKey, requestContextKey as contextKey, requestActURL as actURL } from "@generalbusiness/dap-client";
export type { RequestDispatchPhase as DispatchPhase, RequestRefusalJudgment as RefusalJudgment, RequestAttempt as Attempt, RequestAttemptJournal as AttemptJournal } from "@generalbusiness/dap-client";
const protocol = requestJournal(Object.keys(counting.acts));
export const { validEnvelope, requestBody, validJournal, knownRefusal, terminalJournal } = protocol;
const closed=(value:unknown,required:readonly string[],optional:readonly string[]=[]):boolean=>isRecord(value)&&required.every(key=>Object.hasOwn(value,key))&&Object.keys(value).every(key=>required.includes(key)||optional.includes(key));

/** Completion custody is local and must stay bound to the same full device identity. */
export function validAudioStart(value:unknown,identity:ActorIdentity):value is AudioStart {
  try {
    if (!closed(value,["turn","voiceId","audioId","startedAt"]) || !isRecord(value)) return false;
    const t=value["turn"];
    if (!isRecord(t) || !closed(t,["origin","deployment","scope","definition","membership","member","publicKey","generation","serial","N","expiresAt"])) return false;
    const {generation,serial,N,expiresAt,...context}=t;
    return canonicalize(context)===canonicalize(identity) && [generation,serial,N,expiresAt,value["startedAt"]].every(v=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0) && (generation as number)<=1000000 && (serial as number)>=1 && (serial as number)<=1000000 && (N as number)>=1 && (N as number)<=100 && (value["startedAt"] as number)<(expiresAt as number) && typeof value["voiceId"]==="string" && value["voiceId"].length>0 && typeof value["audioId"]==="string" && /^[A-Za-z0-9_-]{22}$/.test(value["audioId"]);
  } catch { return false; }
}
export function validReport(value:unknown,identity:ActorIdentity):value is PendingReport {
  try{
    if(!isRecord(value)||!closed(value,["completion","envelope","outcome"],["journal","audioStart"])||!["unknown","refused"].includes(value["outcome"] as string)||!closed(value["completion"],["turn","voiceId","completedAt"]))return false;
    const c=value["completion"] as Record<string,unknown>,t=c["turn"];
    if(typeof c["voiceId"]!=="string"||!c["voiceId"]||typeof c["completedAt"]!=="number"||!Number.isSafeInteger(c["completedAt"])||c["completedAt"]<0||!isRecord(t)||!closed(t,["origin","deployment","scope","definition","membership","member","publicKey","generation","serial","N","expiresAt"]))return false;
    const {generation,serial,N,expiresAt,...context}=t;
    if(canonicalize(context)!==canonicalize(identity)||![generation,serial,N,expiresAt].every(v=>typeof v==="number"&&Number.isSafeInteger(v))||(generation as number)<0||(serial as number)<1||(N as number)<1||(expiresAt as number)<0||!validEnvelope(value["envelope"],identity)||!fitsPending(identity,value))return false;
    if (Object.hasOwn(value,"audioStart") && (!validAudioStart(value["audioStart"],identity) || canonicalize(value["audioStart"].turn)!==canonicalize(t) || value["audioStart"].voiceId!==c["voiceId"] || value["audioStart"].startedAt>(c["completedAt"] as number))) return false;
    const intent=value["envelope"].signed.intent;
    if(intent.kind!=="fulfill"||intent.fields["generation"]!==generation||intent.fields["serial"]!==serial||intent.fields["n"]!==N)return false;
    if(!Object.hasOwn(value,"journal"))return true;
    const journal=value["journal"] as AttemptJournal;
    return validJournal(journal,identity,value["envelope"])&&journal.attempts.every(a=>a.envelope.signed.intent.kind==="fulfill"&&a.envelope.signed.intent.fields["generation"]===generation&&a.envelope.signed.intent.fields["serial"]===serial&&a.envelope.signed.intent.fields["n"]===N);
  }catch{return false;}
}

/** Definitely unsent FIRST dispatch is distinct from read-only recovery. */
export function resumableJournal(journal:AttemptJournal|undefined,identity:ActorIdentity,envelope:PreparedEnvelope):boolean {
  return !!journal&&validJournal(journal,identity,envelope)&&activeAttempt(journal).phase==="prepared";
}
