import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
/** Public TEST Counter packet with one declared board read. No native
 * install or browser is constructed by this fixture. */
import { b64url, canonicalize, definitionDigest, utf8 } from "@generalbusiness/dap-bytes";
import { packApplication2, readApplicationProjection } from "@generalbusiness/dap-bytes/application-v2";
import { countingCommitments } from "../../../../apps/counter/commitments.ts";
import { fixedSigner } from "../fixtures-core.ts";
const signer = fixedSigner(67);
export async function applicationCounterPacket2(when = "state = 'open'", version = "1") {
  const id = definitionDigest(countingCommitments);
  return packApplication2({ name: "test.declared-host", version, semantic: {
    ...emptyPackageComposition(), v: 2, entry: id, definitions: [{ id, bytes: canonicalize(countingCommitments) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], roles: { admin: ["counting.control"], member: ["counting.fulfill"],
      setup: ["counting.activity", "counting.commit", "counting.establish", "counting.fail", "counting.participate"],
    }, predecessor: null,
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
export async function applicationCounterNavigationPacket2(journal = false) {
  const packet = journal ? await applicationCounterJournalPacket2() : await applicationCounterPacket2(), board = packet.package.presentation.views["board"]!;
  if (board.kind === "surface") throw Error("The fixture needs an item view.");
  const { creates: _creates, ...semantic } = packet.package.semantic;
  const { semantic: _semantic, ...presentation } = packet.package.presentation;
  return packApplication2({ name: "test.declared-navigation", version: "1", semantic: { ...semantic, projections: { ...semantic.projections,
    people: readApplicationProjection({ v: 1, definition: semantic.entry, revision: "revision", sources: {
      participants: { item: "participant", read: "many", states: ["active", "inactive", "removed"], limit: 16, fields: {} },
    } }),
    person: readApplicationProjection({ v: 1, definition: semantic.entry, revision: "revision", sources: {
      participant: { item: "participant", read: "item", states: ["active", "inactive", "removed"], limit: 1, fields: {} },
    } }),
    "empty-people": readApplicationProjection({ v: 1, definition: semantic.entry, revision: "revision", sources: {
      participants: { item: "participant", read: "many", states: ["active", "inactive", "removed"], limit: 16, fields: {} },
    } }),
  } }, presentation: { ...presentation, assets: [...presentation.assets, { path: "surface.html", mediaType: "text/html", bytes: b64url(utf8(peopleSurface)) },
      { path: "broken.html", mediaType: "text/html", bytes: b64url(utf8('<!doctype html><script>throw Error("Surface fixture failed to initialize.")</script>')) }],
    resources: { ...presentation.resources, "ui://fixture/people-grid": "surface.html", "ui://fixture/broken": "broken.html" }, views: {
    ...presentation.views, board: { ...board, back: "detail-record" }, record: { ...board, kind: "record", display: "fullscreen", back: "board" },
    "detail-record": { ...board, kind: "record", display: "fullscreen", back: "board" },
    people: { ...board, kind: "carousel", projection: "people", item: "participants", title: "id", summary: "state", facts: ["revision"], acts: [], back: null,
      context: "Participant {id} v{revision}", fallback: "Participant {id}: {state}" },
    "person-record": { ...board, kind: "record", projection: "person", item: "participant", title: "id", summary: "state", facts: ["revision"], acts: [], back: "grid", display: "fullscreen",
      context: "Participant {id} v{revision}", fallback: "Participant {id}: {state}" },
    grid: { kind: "surface", projection: "people", item: "participants", revision: "revision", resource: "ui://fixture/people-grid", opens: { record: "person-record" }, acts: [],
      context: "Participant grid", fallback: "Participant grid", waiting: {}, refresh: 2000, display: "fullscreen", back: "people" },
    "grid-empty": { kind: "surface", projection: "empty-people", item: "participants", revision: "revision", resource: "ui://fixture/people-grid", opens: { record: "person-record" }, acts: [],
      context: "Empty participant grid", fallback: "Empty participant grid", waiting: {}, refresh: 2000, display: "fullscreen", back: "people" },
    "grid-broken": { kind: "surface", projection: "people", item: "participants", revision: "revision", resource: "ui://fixture/broken", opens: {}, acts: [],
      context: "Broken surface fixture", fallback: "Broken surface fixture", waiting: {}, refresh: 2000, display: "inline", back: "people" },
  } } }, signer);
}

/** Public TEST resource. No native read or tool adapter lives in this HTML. */
const peopleSurface = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
:host{display:block;font:inherit}h1{font-size:1.4rem;margin:8px 0}#people{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#people[data-empty=true]{display:block}button{font:inherit;min-height:48px;padding:8px;border:1px solid #aaa;border-radius:8px;background:transparent;color:inherit;cursor:pointer}button[data-selected=true]{border:2px solid #28784d}#error{color:#a33}@media(max-width:360px){#people{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style></head><body><h1>Participant grid</h1><p id="head"></p><div id="people"></div><p id="selected"></p><button id="invalid">Invalid opening</button><p id="error" role="status"></p><script>(()=>{
const api=window.dapSurface,root=api.root;window.surfaceProof={keys:Object.keys(api),opens:0,updates:0,aborted:false,api};
api.signal.addEventListener('abort',()=>{window.surfaceProof.aborted=true},{once:true});
root.querySelector('#invalid').onclick=()=>api.open('undeclared').catch(error=>{root.querySelector('#error').textContent=error.message});
api.onData(data=>{window.surfaceProof.updates++;root.querySelector('#head').textContent='Native head '+data.at.seq;const cells=root.querySelector('#people');cells.replaceChildren();
const rows=data.sources.participants||[];cells.dataset.empty=String(!rows.length);if(!rows.length){cells.textContent='No participants in this projection.';return;}
for(const row of rows){const button=document.createElement('button');button.textContent='Participant '+row.id;button.onclick=()=>{window.surfaceProof.opens++;button.dataset.selected='true';root.querySelector('#selected').textContent='Selected participant '+row.id;void api.open('record',{participant:row.id}).catch(error=>{root.querySelector('#error').textContent=error.message})};cells.append(button)}
});})();</script></body></html>`;

/** Real native activity read, with a readonly declared entry log. */
export async function applicationCounterJournalPacket2(when = "state = 'open'", version = "1") {
  const packet = await applicationCounterPacket2(when, version);
  const { creates: _creates, ...semantic } = packet.package.semantic;
  const { semantic: _semantic, ...presentation } = packet.package.presentation;
  return packApplication2({ name: "test.declared-journal", version, semantic: { ...semantic, projections: { ...semantic.projections,
    activity: readApplicationProjection({ v: 1, definition: semantic.entry, revision: "revision", sources: { events: {
      read: "entries", acts: ["initialize", "pause", "reset", "start"], window: 32, limit: 32, latestBy: null, fields: {
        actor: { from: { kind: "signer", name: "member" }, of: { type: "member" }, nullable: true },
      },
    } } }),
  } }, presentation: { ...presentation, assets: [...presentation.assets, { path: "activity.html", mediaType: "text/html", bytes: b64url(utf8('<!doctype html><p id="events"></p><script>(()=>{const api=window.dapSurface;api.onData(data=>{api.root.querySelector("#events").textContent=data.sources.events.length+" recent events"})})();</script>')) }],
    resources: { ...presentation.resources, "ui://fixture/activity": "activity.html" }, views: { ...presentation.views, activity: {
    kind: "log", projection: "activity", item: "events", revision: "revision", title: "type", summary: null, actor: "actor", facts: ["time"], acts: [],
    context: "Entry {id}: {type}", fallback: "Entry {id}: {type}", waiting: {}, refresh: 2000, display: "fullscreen", back: "board",
  }, overview: { kind: "surface", projection: "activity", item: "events", revision: "revision", resource: "ui://fixture/activity", opens: {}, acts: [],
    context: "Recent activity overview", fallback: "Recent activity overview", waiting: {}, refresh: 2000, display: "inline", back: "board" },
  } } }, signer);
}
