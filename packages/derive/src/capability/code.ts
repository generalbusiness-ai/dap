/** One pure capability table for the serving runtime and its replay callers. */
import { HOLD_VERSION, holdCapability } from "./hold.ts";
import { capabilitiesOf, gitRead } from "./gitread.ts";
import { deviceCommand } from "./device-command.ts";

export const CAPABILITY_CODE = capabilitiesOf(holdCapability(HOLD_VERSION), gitRead(), deviceCommand());
