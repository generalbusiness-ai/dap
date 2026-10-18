/** Public TEST Counter packet with one declared board read. No native
 * install or browser is constructed by this fixture. */
import { canonicalize, definitionDigest, keyIdOfSecret, sign } from "@generalbusiness/artroom-bytes";
import { packApplication2, readApplicationProjection } from "@generalbusiness/artroom-bytes/application-v2";
import { countingCommitments } from "../../../../apps/counter/commitments.ts";
const secret = new Uint8Array(32).fill(67), signer = { key: keyIdOfSecret(secret), sign: (bytes: Uint8Array) => sign(secret, bytes) };
export async function applicationCounterPacket2(when = "state = 'open'", version = "1") {
  const id = definitionDigest(countingCommitments);
  return packApplication2({ name: "test.declared-host", version, semantic: {
    v: 2, entry: id, definitions: [{ id, bytes: canonicalize(countingCommitments) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], roles: { admin: ["counting.control"], member: ["counting.fulfill"] }, predecessor: null,
    projections: { board: readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: {
      board: { item: "board", read: "one", states: ["finished", "open", "paused"], limit: 1, fields: {
        lastNumber: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      } },
    } }) },
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, resources: {}, views: {
    board: { kind: "card", projection: "board", item: "board", title: "state", summary: null, actor: null, facts: ["lastNumber"], revision: "revision",
      acts: [{ act: "pause", label: "Pause", needs: "counting.control", when }], context: "Board {id} v{revision}", fallback: "Board {id}: {state}",
      waiting: {}, refresh: 2000, display: "inline", back: null },
  } } }, signer);
}

/** Same native definition, with declared card/record navigation. */
export async function applicationCounterNavigationPacket2() {
  const packet = await applicationCounterPacket2(), board = packet.package.presentation.views["board"]!;
  if (board.kind === "surface") throw Error("The fixture needs an item view.");
  const { creates: _creates, ...semantic } = packet.package.semantic;
  const { semantic: _semantic, ...presentation } = packet.package.presentation;
  return packApplication2({ name: "test.declared-navigation", version: "1", semantic, presentation: { ...presentation, views: {
    board: { ...board, back: "record" }, record: { ...board, kind: "record", display: "fullscreen", back: "board" },
  } } }, signer);
}

