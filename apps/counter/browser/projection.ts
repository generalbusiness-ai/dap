/** The browser uses the package's declared read, with its captured pin. */
import application from "../dap.application.json" with { type: "json" };
import { readApplicationProjection } from "@generalbusiness/dap-bytes/application-v2";
import { COUNTING_COMMITMENTS_DEFINITION } from "../commitments-pin.ts";
export const counterStateProjection = readApplicationProjection({ ...application.projections.state, definition: COUNTING_COMMITMENTS_DEFINITION });
