/** Loaded-Page editor progress. Network operations report results; this module only changes values. */
import type { Answer, Beside, FactRef, Grant, ScopeId, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";

export type EditKind = "open-pr" | "ask-rules" | "propose-file" | "propose-manifest";
export type EditWorkflow = "legacy" | "list1";
export type AcceptedEditAnswer = Extract<Answer, { answer: "accepted" }>;
export interface EditRequest { kind: EditKind; target: ScopeRef; signed: SignedIntent; grants: readonly Grant[]; beside: Beside }
export type UnsentEditStep = Readonly<EditRequest & { status: "unsent"; attempted: false; answer?: never; receiptVerified?: false }>;
export type AttemptedEditStep = Readonly<EditRequest & { status: "attempted"; attempted: true; answer?: never; receiptVerified?: false }>;
export type AnsweredEditStep = Readonly<EditRequest & { status: "answered"; attempted: true; answer: Answer; receiptVerified?: false }>;
export type VerifiedEditStep<K extends EditKind = EditKind> = Readonly<EditRequest & { kind: K; status: "verified"; attempted: true; answer: AcceptedEditAnswer; receiptVerified: true }>;
export type EditStep = UnsentEditStep | AttemptedEditStep | AnsweredEditStep | VerifiedEditStep;

interface History { steps: readonly EditStep[] }
interface Opening { opening: VerifiedEditStep<"open-pr"> }
interface Lane extends Opening { lane: ScopeId; proposal: number }
interface Rules extends Lane { rules: VerifiedEditStep<"ask-rules"> }
interface Collected extends Rules { source: VerifiedEditStep<"propose-file">; collectedSource: FactRef }
export type PreparedEditStage = Readonly<History & { state: "prepared" }>;
export type WaitingLaneStage = Readonly<History & Opening & { state: "waiting-lane" }>;
export type LaneReadyStage = Readonly<History & Lane & { state: "lane-ready" }>;
export type WaitingRulesStage = Readonly<History & Rules & { state: "waiting-rules" }>;
export type SourceRecordedStage = Readonly<History & Collected & { state: "source-recorded" }>;
export type RecordedEditStage = Readonly<History & Rules & { state: "recorded"; version: FactRef } & (
  { workflow: "legacy"; source: VerifiedEditStep<"propose-file"> } |
  { workflow: "list1"; source: VerifiedEditStep<"propose-file">; collectedSource: FactRef; manifest: VerifiedEditStep<"propose-manifest"> }
)>;
export type ResumableEditStage = PreparedEditStage | WaitingLaneStage | LaneReadyStage | WaitingRulesStage | SourceRecordedStage;
export type UnknownEditStage = Readonly<History & { state: "unknown"; previous: ResumableEditStage; step: AttemptedEditStep | AnsweredEditStep | VerifiedEditStep }>;
export type RefusedEditStage = Readonly<History & { state: "refused"; previous: ResumableEditStage; step: AnsweredEditStep & { answer: Extract<Answer, { answer: "refused" }> } }>;
export type StoppedEditStage = Readonly<History & { state: "stopped"; previous: ResumableEditStage }>;
export type EditStage = ResumableEditStage | RecordedEditStage | UnknownEditStage | RefusedEditStage | StoppedEditStage;

export type EditResult =
  | { type: "prepared-step"; step: UnsentEditStep }
  | { type: "copy-not-kept" }
  | { type: "attempted" }
  | { type: "answer"; answer: Answer }
  | { type: "receipt-verified" }
  | { type: "step-recorded"; workflow: EditWorkflow }
  | { type: "lane-ready"; lane: ScopeId; proposal: number }
  | { type: "stopped" };

export const preparedEditStage = (): PreparedEditStage => ({ state: "prepared", steps: [] });
const resumable = (stage: EditStage): stage is ResumableEditStage => !["recorded", "unknown", "refused", "stopped"].includes(stage.state);
export function editProgress(stage: EditStage): ResumableEditStage | RecordedEditStage {
  return "previous" in stage ? stage.previous : stage;
}
/** Optional presentation values come from the stage that owns them. They are never written separately. */
export function editEvidence(stage: EditStage): { lane?: ScopeId; proposal?: number; version?: FactRef; collectedSource?: FactRef } {
  const progress = editProgress(stage);
  return {
    ...("lane" in progress ? { lane: progress.lane } : {}),
    ...("proposal" in progress ? { proposal: progress.proposal } : {}),
    ...("version" in progress ? { version: progress.version } : {}),
    ...("collectedSource" in progress ? { collectedSource: progress.collectedSource } : {}),
  };
}
const replaceLast = (steps: readonly EditStep[], step: EditStep): readonly EditStep[] => [...steps.slice(0, -1), step];
const invalid = (): never => { throw new Error("The task could not continue."); };

/** One result changes progress. No signing, reads, writes, callbacks or request reconstruction occur here. */
export function transitionEdit(stage: EditStage, result: EditResult): EditStage {
  switch (result.type) {
    case "prepared-step":
      if (!resumable(stage)) return invalid();
      return { ...stage, steps: [...stage.steps, result.step] };
    case "copy-not-kept":
      if (!resumable(stage) || stage.steps.at(-1)?.status !== "unsent") return invalid();
      return { ...stage, steps: stage.steps.slice(0, -1) };
    case "attempted": {
      if (!resumable(stage)) return invalid();
      const last = stage.steps.at(-1);
      if (!last || last.status !== "unsent") return invalid();
      const step: AttemptedEditStep = { ...last, status: "attempted", attempted: true };
      return { state: "unknown", previous: stage, step, steps: replaceLast(stage.steps, step) };
    }
    case "answer": {
      if (stage.state !== "unknown") return invalid();
      const step: AnsweredEditStep = { ...stage.step, status: "answered", attempted: true, answer: result.answer, receiptVerified: false };
      const steps = replaceLast(stage.steps, step);
      if (result.answer.answer === "refused") return { state: "refused", previous: stage.previous, step: { ...step, answer: result.answer }, steps };
      return { ...stage, step, steps };
    }
    case "receipt-verified": {
      if (stage.state !== "unknown" || stage.step.answer?.answer !== "accepted") return invalid();
      const step: VerifiedEditStep = { ...stage.step, status: "verified", attempted: true, answer: stage.step.answer, receiptVerified: true };
      return { ...stage, step, steps: replaceLast(stage.steps, step) };
    }
    case "step-recorded": {
      if (stage.state !== "unknown" || stage.step.status !== "verified") return invalid();
      const { step, previous, steps } = stage;
      switch (step.kind) {
        case "open-pr":
          if (previous.state !== "prepared") return invalid();
          return { state: "waiting-lane", opening: { ...step, kind: "open-pr" }, steps };
        case "ask-rules":
          if (previous.state !== "lane-ready") return invalid();
          return { ...previous, state: "waiting-rules", rules: { ...step, kind: "ask-rules" }, steps };
        case "propose-file": {
          if (previous.state !== "waiting-rules") return invalid();
          const source: VerifiedEditStep<"propose-file"> = { ...step, kind: "propose-file" };
          if (result.workflow === "legacy") return { ...previous, state: "recorded", workflow: "legacy", source, version: step.answer.receipt.fact, steps };
          return { ...previous, state: "source-recorded", source, collectedSource: step.answer.receipt.fact, steps };
        }
        case "propose-manifest":
          if (previous.state !== "source-recorded" || result.workflow !== "list1") return invalid();
          return { ...previous, state: "recorded", workflow: "list1", manifest: { ...step, kind: "propose-manifest" }, version: step.answer.receipt.fact, steps };
      }
    }
    case "lane-ready":
      if (stage.state !== "waiting-lane") return invalid();
      return { ...stage, state: "lane-ready", lane: result.lane, proposal: result.proposal };
    case "stopped": {
      if (stage.state === "recorded" || stage.state === "stopped") return stage;
      if (stage.state === "unknown" && stage.step.status !== "verified") return stage;
      return { state: "stopped", previous: "previous" in stage ? stage.previous : stage, steps: stage.steps };
    }
  }
}
