/** Local fixture host for S2 browser checks. No provider, journey lane, deployment or desktop-app acceptance is claimed.
 * The MCP service, resource bytes, bridge, custody and view instance guards are production code. Scope answers and card
 * projections are explicitly scripted fixtures; card-actions.scope.test.ts separately witnesses the native scope boundary.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Intent } from "@generalbusiness/dap-contract";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { firstExtents } from "@generalbusiness/dap-platform";
import { LEGACY, MODERN, McpService, Wire, memoryStore, newSession, type Card, type Message, type ResourcePolicy, type ViewSource } from "../../src/index.ts";
import { StandIn, SERVICE } from "./standin.ts";
import { applicationCounterNavigationPacket2 } from "../../../scope/test/fixtures.ts";
import { viewToolName } from "../../src/views/names.ts";
import { applicationProjectionId, applicationProjectionQueryDigest } from "@generalbusiness/dap-bytes/application-v2";
import { DeclaredViewSource } from "../../src/views/declared.ts";
import { fixedSigner } from "../fixtures.ts";

const fields = { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) };
function fixture(mode: string) {
  const signer = fixedSigner(17), scope = new StandIn(signer.key);
  const completed = new Set<number>();
  let revision = 0, lose = mode === "loss";
  const signed: Intent[] = [];
  const titles = ["Choose the first milestone", "Review the working terms", "Review the proposed change"];
  const source: ViewSource = { read: async (query, access) => {
    if (["empty", "denied", "absent", "unavailable"].includes(mode)) return { status: mode as "empty" | "denied" | "absent" | "unavailable", position: 0, count: 0, fallback: `${mode === "empty" ? "Nothing needs you." : `The ${mode} result is retained; retry the read.`}` };
    const read = await access.call("inspect", { scope: "rules" });
    if (read.isError) return { status: "denied", position: 0, count: 0, fallback: "The fixture scope refused this read." };
    const remaining = titles.map((_, i) => i).filter((i) => !completed.has(i));
    const count = remaining.length, position = Math.max(0, Math.min(query.position, count - 1));
    if (!count) return { status: "empty", position: 0, count: 0, fallback: "Nothing needs you." };
    const index = remaining[position]!;
    const updates = mode === "updates" || mode === "incomplete";
    const card: Card = {
      identity: { item: `q${7 + index}`, kind: updates ? "updates" : ["question", "work", "change"][index]!, revision: `v${revision + 2}`, subject: { scope: scope.rules.scope, item: 0 }, at: { on: revision } },
      title: updates ? "6 updates since your last review" : titles[index]!, summary: updates ? "Two scopes changed. Read the available entries before marking them reviewed." : "A small decision makes the next step clear.",
      actor: index === 0 ? { kind: "person", name: "Rita" } : index === 1 ? { kind: "agent", name: "Builder", controller: "Rita" } : { kind: "checker", name: "Checker" },
      reasons: ["Your decision is needed"], ...(query.page === "summary" ? {} : { body: query.page === "diff" ? "@@ first milestone @@\n-Start with every feature.\n+Start with the smallest useful path.\n".repeat(14) : "Choose a bounded first milestone.\n\nThe proposal keeps implementation and review separate.\n\nThe next person receives an exact decision and version." }),
      projection: [{ scope: scope.rules.scope, seq: 10, hash: "sha256:" + "a".repeat(64) }], reviewIntended: updates ? [{ scope: scope.rules.scope, from: 1, to: 6 }, ...(mode === "incomplete" ? [{ scope: "change-9", from: 9, to: 9 }] : [])] : [],
      unavailable: mode === "incomplete" ? [{ scope: "change-9", from: 9, to: 9 }] : [], waitsOn: ["decision:q7"], settles: ["decision-recorded"], diffAvailable: !updates, ...(updates ? { detailPage: "updates" as const } : {}),
      actions: [{ id: "primary", label: updates ? "Mark reviewed" : mode === "checks-failed" ? "Approve" : "Accept", purpose: updates ? "mark-reviewed" : mode === "checks-failed" ? "approve" : "act", kind: "publish", args: { target: "rules", on: 0, fields, at: { on: revision } } }], approvalAllowed: mode !== "checks-failed", fallback: "Inspect the named subject with the ordinary read tools.",
      ...(updates && query.page !== "summary" ? { entries: Array.from({ length: 6 }, (_, i) => ({ scope: scope.rules.scope, seq: i + 1, text: `Entry ${i + 1}: ${i % 2 ? "The checker recorded a review of this exact version." : "The builder recorded a bounded change and its evidence."}` })) } : {}),
    };
    // Omitted optional properties stay omitted, as they do in an application's JSON projection.
    if (card.body === undefined) delete card.body;
    return { status: mode === "incomplete" ? "incomplete" : "ready", position, count, card, fallback: card.fallback };
  } };
  const service = new McpService({ service: SERVICE, mode: "add", config: { read: async () => scope.config(), addRoot: async () => {} }, custody: memoryStore(), views: source,
    signer: { key: signer.key, sign: (bytes) => { const text = new TextDecoder().decode(bytes), prefix = `${DOMAINS.intent}\n`; if (text.startsWith(prefix)) signed.push(JSON.parse(text.slice(prefix.length))); return signer.sign(bytes); } },
    fetch: async (url, init) => {
      const answer = await scope.fetch(url, init);
      if (init?.method === "POST" && new URL(url).pathname.endsWith(`/${scope.rules.scope}/acts`)) {
        revision++; const state = scope.scopes.get(scope.rules.scope)!; state.items[0] = { ...state.items[0]!, revision };
        if (lose) { lose = false; await (answer.body as unknown as ReadableStream<Uint8Array> | null)?.cancel(); throw new Error("Fixture loss after the scope answered."); }
      }
      return answer;
    },
  });
  return { service, signed, scope, complete: (item: string) => completed.add(Number(item.slice(1)) - 7) };
}

/** Pure declared-view browser fixture. Native projection, install and role
 * answers are scripted; the real native controls have a separate witness. */
async function declaredFixture() {
  const base = fixture("empty"), packet = await applicationCounterNavigationPacket2(true), scope = { ...base.scope.rules, kind: "lane" as const };
  const source = new DeclaredViewSource(packet.bytes, packet.ids.release, {
    installation: async () => ({ scope, directory: { ...scope, kind: "directory" }, rules: { ...scope, kind: "rules" },
      membership: { ...scope, kind: "membership" }, destination: { ...scope, kind: "destination" }, item: 7, definition: packet.package.semantic.entry, ids: packet.ids }),
    actions: async () => [],
    projection: async query => query.projection === "person" && ![11, 12, 13].includes(query.items["participant"]!) ? { ok: false, reason: "incomplete" }
      : query.projection === "empty-people" ? ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: { v: 1, scope,
      projection: applicationProjectionId(packet.package.semantic.projections["empty-people"]!), at: { seq: 13, hash: `sha256:${"c".repeat(64)}` }, sources: { participants: [] },
    } }) : query.projection === "person" ? ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: { v: 1, scope,
      projection: applicationProjectionId(packet.package.semantic.projections["person"]!), at: { seq: 13, hash: `sha256:${"c".repeat(64)}` },
      sources: { participant: [{ id: query.items["participant"]!, type: "participant", state: "active", revision: 1, fields: {} }] },
    } }) : query.projection === "people" ? ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: { v: 1, scope,
      projection: applicationProjectionId(packet.package.semantic.projections["people"]!), at: { seq: 13, hash: `sha256:${"c".repeat(64)}` },
      sources: { participants: [11, 12, 13].map(id => ({ id, type: "participant", state: "active", revision: 1, fields: {} })) },
    } }) : query.projection === "activity" ? ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: { v: 1, scope,
      projection: applicationProjectionId(packet.package.semantic.projections["activity"]!), at: { seq: 5, hash: `sha256:${"b".repeat(64)}` },
      sources: { events: [4, 5].map(seq => ({ id: seq, revision: seq, type: seq === 4 ? "initialize" : "reset", state: "sealed", on: seq === 4 ? null : 2, time: "2026-10-18T12:00:00Z",
        entry: { at: scope, seq, hash: `sha256:${(seq === 4 ? "a" : "b").repeat(64)}` }, fields: { actor: null } })) } } }) : ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: { v: 1, scope,
      projection: applicationProjectionId(packet.package.semantic.projections["board"]!), at: { seq: 1, hash: `sha256:${"a".repeat(64)}` },
      sources: { board: [{ id: 2, type: "board", state: "open", revision: 1, fields: { lastNumber: 42 } }] } } }),
  });
  const signer = fixedSigner(17);
  const service = new McpService({ service: SERVICE, signer, custody: memoryStore(), views: source, fetch: base.scope.fetch,
    config: { read: async () => base.scope.config(), addRoot: async () => {} } });
  return { ...base, service };
}

function policy(ui: ResourcePolicy): string {
  const domains = (values?: string[]) => values?.length ? values.map((value) => {
    if (!/^(https?|wss?):\/\/[^\s;'"<>]+$/.test(value)) throw new Error("Fixture resource policy contains a malformed origin.");
    return value;
  }).join(" ") : "'none'";
  return `default-src 'none'; script-src 'self' 'unsafe-inline' ${ui.csp?.resourceDomains?.length ? domains(ui.csp.resourceDomains) : ""}; style-src 'self' 'unsafe-inline' ${ui.csp?.resourceDomains?.length ? domains(ui.csp.resourceDomains) : ""}; img-src 'self' data: ${ui.csp?.resourceDomains?.length ? domains(ui.csp.resourceDomains) : ""}; font-src 'self' ${ui.csp?.resourceDomains?.length ? domains(ui.csp.resourceDomains) : ""}; media-src 'self' data: ${ui.csp?.resourceDomains?.length ? domains(ui.csp.resourceDomains) : ""}; connect-src ${domains(ui.csp?.connectDomains)}; frame-src ${domains(ui.csp?.frameDomains)}; base-uri ${ui.csp?.baseUriDomains?.length ? domains(ui.csp.baseUriDomains) : "'self'"}`;
}
async function body(request: IncomingMessage) {
  let text = "";
  for await (const chunk of request) { text += chunk; if (Buffer.byteLength(text) > 1024 * 1024) throw new Error("Fixture request too large."); }
  return JSON.parse(text) as Record<string, unknown>;
}
const json = (response: ServerResponse, value: unknown, status = 200) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(value)); };
const listen = (server: Server): Promise<string> => new Promise((resolve) => server.listen(0, "127.0.0.1", () => { const address = server.address(); if (!address || typeof address === "string") throw new Error("No fixture address."); resolve(`http://127.0.0.1:${address.port}`); }));
const stop = (server: Server): Promise<void> => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

/** Two loopback origins, a cross-origin sandbox proxy and the real single-file app behind package-derived CSP. */
export async function startViewsHost(options: { declared?: (base: ReturnType<typeof fixture>) => Promise<ReturnType<typeof fixture>> } = {}) {
  const instances = new Map<string, ReturnType<typeof fixture> & { wire: Wire; session: ReturnType<typeof newSession>; version: string }>();
  let hostOrigin = "", sandboxOrigin = "";
  const host = createServer((request, response) => { void (async () => {
    const url = new URL(request.url!, hostOrigin);
    if (url.pathname === "/favicon.ico") { response.writeHead(204); response.end(); return; }
    if (url.pathname === "/rpc") {
      const asked = await body(request), instance = instances.get(String(asked["instance"]));
      if (!instance) return json(response, { error: "Unknown fixture instance" }, 404);
      const message = asked["request"] as Message;
      if (message.method === "tools/call") {
        const name = String(message.params?.["name"]), tools = (await instance.service.snapshot()).tools;
        const tool = tools.find((tool) => tool.name === name);
        const visibility = (tool?._meta?.["ui"] as { visibility?: string[] } | undefined)?.visibility ?? ["model", "app"];
        if (!tool || !visibility.includes(asked["actor"] === "app" ? "app" : "model")) return json(response, { jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "The host does not expose that same-server tool to this caller." } });
      }
      const before = message.method === "tools/call" && message.params?.["name"] === "view_act" ? await instance.service.call("view_read", { view: (message.params["arguments"] as Record<string, unknown>)["view"] }) : null;
      if (instance.version === MODERN) message.params = { ...message.params, _meta: { "io.modelcontextprotocol/protocolVersion": MODERN, "io.modelcontextprotocol/clientCapabilities": { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } } } };
      const answer = await instance.wire.handle(message, instance.version === LEGACY ? instance.session : null, () => {});
      const outcome = (answer?.result as { structuredContent?: { result?: { structuredContent?: Record<string, unknown> } } } | undefined)?.structuredContent?.result?.structuredContent;
      if (outcome?.["answer"] === "accepted" || outcome?.["error"] === "transport") {
        const item = (before?.structuredContent["display"] as { card?: { identity: { item: string } } } | undefined)?.card?.identity.item;
        if (item) instance.complete(item);
      }
      return json(response, answer);
    }
    if (url.pathname === "/proof") {
      const instance = instances.get(url.searchParams.get("instance") ?? "");
      return json(response, instance ? { signed: instance.signed, requests: instance.scope.requests } : {});
    }
    if (url.pathname !== "/") { response.writeHead(404); response.end(); return; }
    if (instances.size >= 128) return json(response, { error: "Fixture host full" }, 429);
    const id = crypto.randomUUID(), mode = url.searchParams.get("fixture") ?? "normal", demo = mode === "declared" ? await (options.declared ? options.declared(fixture("empty")) : declaredFixture()) : fixture(mode), wire = new Wire(demo.service), session = newSession(null);
    const version = url.searchParams.get("wire") === "legacy" ? LEGACY : MODERN;
    instances.set(id, { ...demo, wire, session, version });
    if (version === LEGACY) {
      await wire.handle({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: LEGACY, capabilities: { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } }, clientInfo: { name: "S2 fixture host", version: "1" } } }, session, () => {});
      await wire.handle({ jsonrpc: "2.0", method: "notifications/initialized" }, session, () => {});
    }
    const settings = { id, sandboxOrigin, scope: url.searchParams.has("scope") ? JSON.parse(url.searchParams.get("scope")!) : undefined, items: url.searchParams.has("items") ? JSON.parse(url.searchParams.get("items")!) : undefined, screen: url.searchParams.get("screen") ?? "needs-you", openingTool: viewToolName(url.searchParams.get("screen") ?? "needs-you", mode === "declared"), theme: url.searchParams.get("theme") ?? "light", deny: url.searchParams.has("deny"), contextFail: url.searchParams.has("context-fail"), prototype: url.searchParams.has("prototype"), fields };
    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<!doctype html><html><head><meta charset="utf-8"><title>S2 card fixture host</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font:14px system-ui;background:#e9e9e9}header{font-size:12px;margin-bottom:12px;color:#555}#frame{display:block;width:min(100%,592px);height:1px;border:0;background:white;border-radius:12px}body.fullscreen #frame{width:100%}</style></head><body><header>S2 test host · scripted card and scope fixtures</header><iframe id="frame" title="MCP Apps sandbox"></iframe><script>
const config=${JSON.stringify(settings)}, frame=document.querySelector('#frame');
window.proof={config,messages:[],contexts:[],sizes:[],calls:[],chat:[],modelTurns:0,mode:'inline',errors:[],ready:false};
let seq=100, input, initialized=false, actSeen=false, failedContext=false;
async function rpc(actor,name,args){const response=await fetch('/rpc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({instance:config.id,actor,request:{jsonrpc:'2.0',id:++seq,method:'tools/call',params:{name,arguments:args}}})});return response.json()}
window.modelCall=(name,args)=>rpc('model',name,args);
const send=message=>frame.contentWindow.postMessage({jsonrpc:'2.0',...message},config.sandboxOrigin);
window.sendHost=send;
window.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.origin!==config.sandboxOrigin)return;const m=event.data;if(!m||m.jsonrpc!=='2.0')return;proof.messages.push(m);if(typeof m.method!=='string')return;void(async()=>{
if(m.method==='ui/initialize'){send({id:m.id,result:{protocolVersion:'2026-01-26',hostCapabilities:{serverTools:{},updateModelContext:{},message:{},requestDisplayMode:{}},hostContext:{theme:config.theme,displayMode:'inline',styles:{variables:{'--font-sans':'system-ui','--color-background-primary':config.theme==='dark'?'#202020':'#ffffff','--color-background-secondary':config.theme==='dark'?'#303030':'#f4f4f4','--color-text-primary':config.theme==='dark'?'#f3f3f3':'#222222','--color-text-secondary':config.theme==='dark'?'#bbbbbb':'#606060','--color-border-secondary':config.theme==='dark'?'#444444':'#dddddd'}}}}});return}
if(m.method==='ui/notifications/initialized'){initialized=true;send({method:'ui/notifications/tool-input',params:{arguments:input}});send({method:'ui/notifications/tool-result',params:{content:[{type:'text',text:'Card opened. Use its controls or the ordinary read tools.'}]}});proof.ready=true;return}
if(!initialized){proof.errors.push('Message before initialized: '+m.method);return}
if(m.method==='ui/notifications/size-changed'){proof.sizes.push(m.params);frame.style.height=m.params.height+'px';return}
if(m.method==='tools/call'){proof.calls.push(m.params);const answer=await rpc('app',m.params.name,m.params.arguments);if(m.params.name==='view_act'){actSeen=true;if(config.prototype&&answer.result?.structuredContent?.result?.structuredContent?.answer==='accepted'){proof.chat.push('✓ Act completed.');proof.modelTurns++}}send({id:m.id,...(answer.error?{error:answer.error}:{result:answer.result})});return}
if(m.method==='ui/update-model-context'){if(config.contextFail&&actSeen&&!failedContext){failedContext=true;send({id:m.id,error:{code:-32000,message:'Fixture context-report failure'}});return}proof.contexts.push(m.params);send({id:m.id,result:{}});return}
if(m.method==='ui/request-display-mode'){proof.mode=config.deny?'inline':m.params.mode;document.body.classList.toggle('fullscreen',proof.mode==='fullscreen');send({id:m.id,result:{mode:proof.mode}});return}
if(m.method==='ui/message'){proof.chat.push(m.params.content.text);proof.modelTurns++;send({id:m.id,result:{}});return}
if(m.id!==undefined)send({id:m.id,error:{code:-32601,message:'Fixture host does not support '+m.method}})
})().catch(error=>proof.errors.push(String(error)))});
void(async()=>{input={view:config.id,subject:config.screen,...(config.scope?{scope:config.scope}:{}),...(config.items?{items:config.items}:{})};const opened=await rpc('model',config.openingTool,input);if(opened.error||opened.result?.isError)throw Error(JSON.stringify(opened));frame.src=config.sandboxOrigin+'/proxy?instance='+config.id+'&screen='+config.screen})().catch(error=>proof.errors.push(String(error)));
</script></body></html>`);
  })().catch((error) => { if (!response.headersSent) json(response, { error: String(error) }, 500); else response.end(); }); });
  const sandbox = createServer((request, response) => {
    const url = new URL(request.url!, sandboxOrigin), id = url.searchParams.get("instance") ?? "", instance = instances.get(id);
    if (!instance) return json(response, { error: "Unknown fixture instance" }, 404);
    if (url.pathname === "/proxy") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(`<!doctype html><html><head><meta charset="utf-8"><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style></head><body><iframe title="Card resource" sandbox="allow-scripts" src="/app?instance=${id}&screen=${encodeURIComponent(url.searchParams.get("screen") ?? "needs-you")}"></iframe><script>const child=document.querySelector('iframe'),host=${JSON.stringify(hostOrigin)};window.addEventListener('message',event=>{if(!event.data||typeof event.data!=='object'||String(event.data.method||'').startsWith('ui/notifications/sandbox-'))return;if(event.source===child.contentWindow)parent.postMessage(event.data,host);else if(event.source===parent&&event.origin===host)child.contentWindow.postMessage(event.data,"*")});</script></body></html>`);
      return;
    }
    if (url.pathname === "/app") {
      const uri = instance.service.resources.list().resources.find(resource => resource.uri.endsWith(`/${url.searchParams.get("screen")}`))?.uri;
      if (!uri) return json(response, { error: "Unknown fixture resource" }, 404);
      const resource = instance.service.resources.read(uri).contents[0]!;
      response.writeHead(200, { "content-type": "text/html", "content-security-policy": policy(resource._meta.ui) });
      response.end(resource.text); return;
    }
    response.writeHead(404); response.end();
  });
  hostOrigin = await listen(host);
  sandboxOrigin = await listen(sandbox);
  return { url: hostOrigin, sandboxOrigin, close: async () => {
    for (const instance of instances.values()) { instance.wire.endLegacy(instance.session); instance.wire.closeAll(); }
    instances.clear();
    await Promise.all([stop(host), stop(sandbox)]);
  } };
}
