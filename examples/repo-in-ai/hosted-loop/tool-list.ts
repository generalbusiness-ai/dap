/** The agent's actual list against the hosted default. The list comes from the session's tools/list and the default from the Worker's own policy function. */
import { GENERIC_TOOL_NAMES, hostedMcpTools } from "@generalbusiness/dap-mcp";
import { stop } from "./words.ts";

/** The act tools the loop needs from its first agent phase on. A change lane's own tools appear only after the agent opens that lane. */
export const LOOP_ACT_TOOLS = ["issue.take", "issue.ask", "issue.request-approval", "issue.block", "issue.release-block", "change.create"] as const;
/** The acts a person keeps, by the rule of S1's role lists. The agent's list holds none of them. */
export const PERSON_ONLY_TOOLS = ["issue.approve", "issue.decide", "change.merge", "change.review-verdict", "change.dismiss"] as const;

const ACT_TOOL = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;

/** The generic tools a hosted session lists: the policy, less `actions` and `act`, which the service's default mode replaces with named act tools. */
export function hostedDefaultTools(): readonly string[] {
  const policy = hostedMcpTools({ MCP_ENABLED: "true" });
  if (policy === null) return stop("tool-list-differs");
  return policy.filter(name => name !== "actions" && name !== "act");
}

/** Refuses a list with another generic tool, a missing generic tool, a name that is no act tool, a person's act or a missing loop tool. */
export function checkToolList(listed: readonly string[], required: readonly string[] = []): void {
  const generic = new Set<string>(GENERIC_TOOL_NAMES), expected = hostedDefaultTools();
  const seen = listed.filter(name => generic.has(name));
  if (new Set(listed).size !== listed.length || seen.length !== expected.length || !expected.every(name => seen.includes(name))) stop("tool-list-differs");
  if (listed.some(name => !generic.has(name) && !ACT_TOOL.test(name))) stop("tool-list-differs");
  if (PERSON_ONLY_TOOLS.some(name => listed.includes(name)) || required.some(name => !listed.includes(name))) stop("tool-list-differs");
}
