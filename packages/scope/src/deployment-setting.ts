/** One deployment identity bound for every host consumer. */
import { utf8 } from "@generalbusiness/dap-bytes";
export function readDeployment(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 128 && utf8(value).length <= 128 ? value : null;
}
