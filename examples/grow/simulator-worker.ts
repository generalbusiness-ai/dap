/** Separate cron entry. Public configuration and both agent secrets are
 * supplied by the operator after review; the committed packet sets no trust. */
import packet from "./demo/application.dap.json";
import { DEMO_PUBLISHER, DEMO_RELEASE } from "./demo-release.ts";
import { simulatorHost } from "./simulator-host.ts";

export default simulatorHost(packet, DEMO_RELEASE, DEMO_PUBLISHER);
