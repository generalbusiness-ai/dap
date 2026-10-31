/** Static local guidance. A prompt reads no room, signs nothing and grants nothing. */
import { isRecord, utf8 } from "@generalbusiness/dap-bytes";

const GOAL_BYTES = 4096;
export const WORK_ON_PROMPT = {
  name: "work-on",
  description: "Work on an issue, pause for a person's decision, and resume with the same member key from the record.",
  arguments: [{ name: "goal", description: "The issue or goal to work on. Use the room's recorded identifiers.", required: true }],
};

export function workOnPrompt(name: unknown, args: unknown): Record<string, unknown> | null {
  if (name !== WORK_ON_PROMPT.name || !isRecord(args) || Object.keys(args).some(key => key !== "goal")) return null;
  const goal = args["goal"];
  if (typeof goal !== "string" || !goal.trim() || utf8(goal).length > GOAL_BYTES) return null;
  return {
    description: WORK_ON_PROMPT.description,
    messages: [{ role: "user", content: { type: "text", text: `Work on this goal: ${JSON.stringify(goal)}

Start with room and tools/list. Use work and context when offered, or inspect, items and step. Read the actual issue, your commitment, its termsAt fact, its blocks and the current question text. Tool names and required fields come from the current catalogue. A prompt is guidance, not authority.

Accept an offered commitment only by naming its exact recorded terms. If a question needs a person's judgment, ask it, request approval from the named person for its current bodyAt fact, and block only your own accepted commitment on that ask. Do not approve or decide for the person. Another agent's commitment and change remain independent.

Call wait on the question item and type ask, states ["decided"], with seconds at most 60. A timeout records no lane act and is not a decision. Read again and repeat wait while the question remains open. Stop on a refusal or unavailable read. Stop and reread if the question was withdrawn or its text changed. Do not sign a replacement after a lost act reply: settle the retained idempotencyKey.

After a decision, read the exact decide entry and the current conditions. A question decision does not revise commitment terms. The owner must revise conditions and make a new offer when terms change. Accept that offer naming its exact new termsAt fact. Release your old block with its own commitment and the matching decide fact. Keep old commitments and terms distinct. Propose through the maintained change tools or dap propose, linking the issue. Do not report fulfilled without a recorded fulfilment.

In a fresh session, keep the same member key and existing room configuration. Reconstruct your commitment, block, question, terms and decision from room reads alone. Do not rely on conversation memory or a saved item list. Resume only the next supported step. A different key or member is not a handover, and this prompt never transfers work. See examples/repo-in-ai/agents.md.` } }],
  };
}
