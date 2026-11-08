/** Judge captured conditions on the before-entry view, preserving both guard groups' order. */
import type { UnavailableReason } from "@generalbusiness/dap-contract";
import type { Judging } from "../guards.ts";
import { judgeGuardNodes } from "./guard-value.ts";
import { conditionPlan, type AttentionNode, type BodyStructure, type EffectNode, type SendNode } from "./structure.ts";

export function judgeCondition(j: Judging, body: BodyStructure, node: EffectNode | AttentionNode | SendNode): boolean | UnavailableReason {
  const plan = conditionPlan(j.definition, body, node);
  if (plan.absentSubjects.some(subject => !j.subjects.has(subject))) return false;
  const holds = plan.if ? judgeGuardNodes(j, body, plan.if).result : "pass";
  const bars = plan.unless ? judgeGuardNodes(j, body, plan.unless).result : "fail";
  if (holds === "fail" || bars === "pass") return false;
  return holds !== "pass" ? holds : bars !== "fail" ? bars : true;
}
