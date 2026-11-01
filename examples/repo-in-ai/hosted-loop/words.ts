/** The fixed words of the hosted loop: its phases, its stops and the texts the room holds. No file here reads a room. */
export const loopPhases = [
  "preflight", "owner", "create", "roles", "rules", "activate-issue", "activate-change", "invite-agent", "create-agent", "open-issue", "offer",
  "agent-tools", "agent-accept", "agent-ask", "agent-request", "agent-block", "agent-wait-open", "agent-wait",
  "approve", "decide", "revise", "offer-new",
  "agent-resume", "agent-accept-new", "agent-release", "agent-open-change", "agent-link", "agent-propose", "agent-verify",
] as const;
export type LoopPhase = typeof loopPhases[number];
export const agentPhases = ["agent-tools", "agent-accept", "agent-ask", "agent-request", "agent-block", "agent-wait-open", "agent-wait", "agent-resume", "agent-accept-new", "agent-release", "agent-open-change", "agent-link", "agent-propose", "agent-verify"] as const;
export type AgentPhase = typeof agentPhases[number];
export type PersonPhase = Exclude<LoopPhase, AgentPhase | "preflight" | "owner" | "create" | "invite-agent" | "create-agent">;
export type Mode = "new" | "check" | "continue";

/** Each word names one reason a phase stops. A stop prints its word and no other text. */
export const stopWords = [
  "input", "scratch-only", "target-version", "target-unavailable", "endpoint-closed", "plan-differs",
  "no-person-home", "no-bearer", "agent-home-differs", "bearer-unusable", "agent-create-refused", "agent-unresolved", "invitation-unresolved", "room-unresolved",
  "tool-list-differs", "unsourced-fact", "bypass-read", "public-output", "read-failed", "read-incomplete", "unknown-tool",
  "no-prompt", "no-standing", "no-issue-lane", "no-change-lane", "no-offer", "no-commitment", "no-question", "no-approval-request", "no-block", "no-decision", "no-new-offer", "no-definition", "no-published-head", "no-controller", "no-manifest",
  "still-open", "question-changed", "signed-in-read-phase", "act-refused", "act-unresolved", "no-original", "record-differs",
] as const;
export type StopWord = typeof stopWords[number];
export class LoopStop extends Error {
  constructor(readonly word: StopWord) { super(`Hosted loop stopped: ${word}.`); }
}
export const stop = (word: StopWord): never => { throw new LoopStop(word); };

/** Bytes the room holds. Each is a literal of this script, and none reaches public output. */
export const TEXT = {
  goal: "Work on the recorded scratch issue. TEST hosted loop witness.",
  issueTitle: "TEST hosted loop scratch issue",
  conditions: ["TEST first terms: propose one file."],
  newConditions: ["TEST new terms after the decision: propose the decided file."],
  question: "TEST which file should the proposal hold?",
  body: "TEST question body. The agent asks a person and waits for the decision.",
  comment: "TEST the person's reasons for this approval.",
  changeTitle: "TEST hosted loop proposal",
  path: "TEST-hosted-loop.txt",
  content: "TEST the file that the hosted loop proposes.\n",
} as const;
