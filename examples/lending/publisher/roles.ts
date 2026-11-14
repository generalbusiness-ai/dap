/** The publisher package keeps the shipped roles and adds its reporting action. */
import { declareRoles } from "@generalbusiness/dap-define/package";
import { lendingRoles } from "../roles.ts";

export const publisherRoles = declareRoles({
  ...lendingRoles.roles,
  agent: [...lendingRoles.roles.agent, "lending.publish"] as const,
});
