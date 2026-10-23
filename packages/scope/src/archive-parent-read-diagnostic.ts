/** Temporary, pass-owned observations only. No authority, body, clock or I/O. */
import { GitRefusal } from "@generalbusiness/dap-git";
import { advertisementRefusalDetail, httpResponseRefusalDetail, type AdvertisementRefusalDetail, type HttpResponseRefusalDetail } from "@generalbusiness/dap-git/http-read";
import type { ArchiveBudget } from "./archive-budget.ts";

type Phase = "none" | "source" | "token" | "identity" | "object"
  | "advertisement-request" | "advertisement-response" | "object-request" | "object-response" | "complete";
type Refusal = "none" | "other" | "too-large" | "object-format" | "isolated-capabilities" | "unadvertised-want"
  | "http-request" | "http-response" | "body" | "advertisement" | "negotiation" | "pack" | "wanted-object" | "deadline";
interface Snapshot {
  readonly ordinal: number;
  readonly type: "none" | "commit" | "tree" | "blob";
  readonly maximum: number;
  readonly phase: Phase;
  readonly refusal: Refusal;
  readonly advertisement?: Readonly<AdvertisementRefusalDetail>;
  readonly httpResponse?: Readonly<HttpResponseRefusalDetail>;
}
interface State { closed: boolean; value: Snapshot }
const held = new WeakMap<ArchiveBudget, State>();
const empty: Snapshot = Object.freeze({ ordinal: 0, type: "none", maximum: 0, phase: "none", refusal: "none" });

export function startArchiveParentReadPass(budget: ArchiveBudget): void {
  const previous = held.get(budget);
  if (previous) previous.closed = true;
  held.set(budget, { closed: false, value: empty });
}

// Only exact caller-owned words are classified. No error message, URL,
// credential, body or unknown `what` string enters the marker.
function refusal(error: unknown): Refusal {
  if (!(error instanceof GitRefusal)) return "other";
  if (error.reason === "too-large") return "too-large";
  if (error.reason === "unsupported-object-format") return "object-format";
  switch (error.what) {
    case "isolated object capabilities": return "isolated-capabilities";
    case "unadvertised want": return "unadvertised-want";
    case "HTTP read request": return "http-request";
    case "HTTP read response": return "http-response";
    case "read body": return "body";
    case "read deadline": case "isolated read deadline": case "isolated source abandoned": return "deadline";
    case "upload advertisement": case "upload capabilities": case "upload ref":
    case "repeated upload ref": return "advertisement";
    case "upload pkt-line": case "isolated shallow packets": case "isolated shallow boundary":
    case "upload negotiation": return "negotiation";
    case "pack header": case "pack version": case "pack entry": case "pack trailer": case "pack trailing data":
    case "isolated pack entry": case "packed object": case "zlib header": case "deflate framing":
    case "deflate code": case "deflate symbol": case "deflate stored block": case "deflate block":
    case "deflate lengths": case "deflate repeat": case "deflate end code": case "deflate length":
    case "deflate distance": return "pack";
    case "isolated shallow object": case "wanted object omitted": return "wanted-object";
    default: return "other";
  }
}

export function beginArchiveParentRead(budget: ArchiveBudget, type: "commit" | "tree" | "blob", maximum: number) {
  let state = held.get(budget);
  if (!state) { state = { closed: false, value: empty }; held.set(budget, state); }
  const owner = state;
  // The provider charges two calls before each observation. Its unchanged
  // finite call budget also bounds this scalar ordinal, without a new cap.
  const value: Snapshot = { ordinal: owner.value.ordinal + 1, type, maximum, phase: "source", refusal: "none" };
  if (!owner.closed) owner.value = value;
  const update = (change: Partial<Pick<Snapshot, "phase" | "refusal" | "advertisement" | "httpResponse">>) => {
    if (!owner.closed && owner.value.ordinal === value.ordinal) owner.value = { ...owner.value, ...change };
  };
  return {
    phase: (phase: Exclude<Phase, "none">): void => update({ phase }),
    refused: (error: unknown): void => {
      if (!owner.closed) {
        try {
          const advertisement = advertisementRefusalDetail(error);
          const httpResponse = httpResponseRefusalDetail(error);
          update({ refusal: refusal(error), ...(advertisement ? { advertisement } : {}), ...(httpResponse ? { httpResponse } : {}) });
        }
        catch { update({ refusal: "other" }); }
      }
    },
  };
}
export type ArchiveParentReadObservation = ReturnType<typeof beginArchiveParentRead>;

/** Freeze before cleanup awaits/logging. Detached late settlements cannot
 * rewrite this pass or a later object's snapshot; freezing grants no I/O. */
export function finishArchiveParentRead(budget: ArchiveBudget): Readonly<Snapshot> {
  let state = held.get(budget);
  if (!state) { state = { closed: true, value: empty }; held.set(budget, state); }
  state.closed = true;
  return Object.freeze({ ...state.value });
}
