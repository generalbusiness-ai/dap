import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
/** Signed TEST package only. It supplies no owner identity, grant or archive authority. */
import { DEVICE_COMMAND } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { packApplication2, readApplicationProjection } from "@generalbusiness/dap-bytes/application-v2";
import { fixedSigner } from "../fixtures-core.ts";
import { devicePackageFixture as deviceCommandFixture } from "../../../derive/test/fixtures-device-command.ts";

export async function deviceApplicationPacket(requiresArchive = false, withView = false) {
  const id = definitionDigest(deviceCommandFixture);
  return packApplication2({ name: "test.device-native", version: "1", semantic: {
    ...emptyPackageComposition(), v: 2, entry: id, definitions: [{ id, bytes: canonicalize(deviceCommandFixture) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"], ...(requiresArchive ? { requires: ["archive"] as const } : {}) },
    capabilities: [{ name: DEVICE_COMMAND, bounds: { kinds: ["heater"], owners: 1 } }],
    roles: { admin: ["command", "start"] }, projections: { root: readApplicationProjection({ v: 1, definition: id, revision: "revision",
      sources: { root: { item: "root", read: "one", states: ["ready"], limit: 1, fields: {} } } }) }, predecessor: null,
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, views: withView ? {
    root: { kind: "record", projection: "root", item: "root", title: "state", summary: null, actor: null, facts: ["revision"], revision: "revision",
      acts: [], context: "Device {id} v{revision}", fallback: "Device {id}: {state}", waiting: {}, refresh: 2000, display: "fullscreen", back: null },
  } : {}, resources: {} } }, fixedSigner(81));
}
