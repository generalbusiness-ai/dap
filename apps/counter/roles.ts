/** Declare the Counter package's actions before its acts use them. */
import { declareRoles } from "@generalbusiness/dap-define/package";
const memberActions = ["counting.activity", "counting.commit", "counting.fail", "counting.fulfill", "counting.participate"] as const;
export const counterRoles = declareRoles({
  admin: ["counting.establish", "counting.control", ...memberActions],
  member: memberActions,
  agent: memberActions,
});
