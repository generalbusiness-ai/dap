/** Counting fixes its supported act list; the shared client owns the strict
 * first-dispatch protocol. No caller-supplied ticket or knowledge flag. */
import { requestAttemptDispatcher, type RequestJournalRecord, type RequestJournalStore } from "@generalbusiness/dap-client";
import type { ByteStream } from "@generalbusiness/dap-bytes";
import type { Receipt } from "@generalbusiness/dap-contract";
import { countingCommitments as counting } from "../commitments.ts";
import type { ActorIdentity, PreparedEnvelope, ReportOutcome } from "./voice-controller.ts";
export type TrustedActFetch=(url:string,init:{method:"POST";headers:Record<string,string>;body:string;signal:AbortSignal;redirect:"error"})=>Promise<{status:number;body:ByteStream|null;headers:{get(name:string):string|null};url:string;redirected:boolean}>;
export type JournalRecord = RequestJournalRecord;
export type JournalStore<T extends JournalRecord> = RequestJournalStore<T>;
export function attemptDispatcher(options:{identity:ActorIdentity;current():boolean;fetch?:TrustedActFetch;accepted(receipt:Receipt,envelope:PreparedEnvelope):Promise<ReportOutcome>;settle(envelope:PreparedEnvelope):Promise<{ok:true;receipt:Receipt}|{ok:false}>;refresh():void}) {
  return requestAttemptDispatcher({ ...options, kinds: Object.keys(counting.acts) });
}
