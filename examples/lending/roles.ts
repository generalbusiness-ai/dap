/** Declare the Lending package's actions before its acts use them. */
import { declareRoles } from "@generalbusiness/dap-define/package";
export const lendingRoles = declareRoles({
  admin: ["lending.member", "lending.staff", "lending.establish"],
  member: ["lending.member"],
  agent: ["lending.member"],
});
