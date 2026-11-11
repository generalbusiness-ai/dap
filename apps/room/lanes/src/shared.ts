import type { AdoptedReceiveType, DeclaredDefinition } from "@generalbusiness/dap-contract";

/** A lane definition whose handlers use the adopted form. */
export type LaneDefinition = Omit<DeclaredDefinition, "receives"> & { receives: Record<string, AdoptedReceiveType> };
