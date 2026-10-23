/** One declaration shared by the maintained package and browser. */
import application from "../dap.application.json" with { type: "json" };
import { readApplicationProjection } from "@generalbusiness/dap-bytes/application-v2";
import { LENDING_DEFINITION } from "../pin.ts";
export const lendingStateProjection = readApplicationProjection({ ...application.projections.state, definition: LENDING_DEFINITION });
