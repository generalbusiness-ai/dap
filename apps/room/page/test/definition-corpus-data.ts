/** Exact custom declaration used by the negative LIST1 pin control. */
import { changeDemo3 } from "@generalbusiness/dap-lanes";
export function customListDefinition() {
  const custom = structuredClone(changeDemo3);
  custom.acts["propose-manifest"]!.guards = custom.acts["propose-manifest"]!.guards.slice(0, -1);
  return custom;
}
