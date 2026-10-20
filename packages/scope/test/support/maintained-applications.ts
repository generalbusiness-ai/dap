/** Maintained TEST packages and the exact committed signed demo captured in Node. */
import type { Digest } from "@generalbusiness/dap-contract";
import type {} from "vitest";
export interface MaintainedApplicationInput { bytes: string; release: Digest }
export interface MaintainedApplicationInputs { counter: MaintainedApplicationInput; lending: MaintainedApplicationInput; grow: MaintainedApplicationInput; growDemo: MaintainedApplicationInput }
declare module "vitest" {
  export interface ProvidedContext { maintainedApplications: MaintainedApplicationInputs }
}
