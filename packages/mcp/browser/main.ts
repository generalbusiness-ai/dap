import { isMemberRef } from "@generalbusiness/dap-bytes";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { AppBridge, AppToolError } from "./bridge.ts";
import type { Display, PageKind } from "../src/views/types.ts";
import { viewToolName } from "../src/views/names.ts";
import { seriesPanel } from "./series.ts";
import { SurfacePanels } from "./surface.ts";
import { memberElement, memberStyleElement } from "./member.ts";
import "./style.css";
document.head.append(memberStyleElement());

const root = document.querySelector<HTMLElement>("#card-root")!;
const bridge = new AppBridge();
let display: Display | null = null;
let view = "";
let busy = false;
let notice = "";
let contextError = "";
let pendingContext: Display["context"] | null = null;
let sendingContext = false;
let reportedContext = "";
let returnPage: PageKind = "summary";
let alive = true;
let connected = false;
let focusKey: string | null = null;
let refreshTimer = 0;
const surfaces = new SurfacePanels();
interface DeclaredAddress { screen: string; items?: Readonly<Record<string, number>>; scope?: ScopeRef }
const declaredHistory: DeclaredAddress[] = [];
const scopeKey = (scope?: ScopeRef) => scope ? JSON.stringify([scope.scope, scope.inc, scope.kind]) : "";
const surfaceOf = () => display?.card?.declared?.surface ?? display?.surface;

function scheduleRefresh() {
  window.clearTimeout(refreshTimer);
  const interval = display?.card?.declared?.refresh ?? display?.surface?.refresh ?? display?.refresh;
  if (alive && display?.active && interval) refreshTimer = window.setTimeout(() => {
    if (busy) scheduleRefresh(); else void read({ refresh: true }).catch(error => {
      if (error instanceof AppToolError && error.reason === "busy") scheduleRefresh(); else showError(error);
    });
  }, interval);
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function button(label: string, run: () => Promise<void>, className?: string) {
  const element = node("button", label, className);
  element.type = "button";
  element.dataset["focus"] = `button:${label}`;
  element.disabled = busy;
  element.onclick = () => { void run().catch(showError); };
  return element;
}
function showError(error: unknown) {
  if (!alive) return;
  if (error instanceof AppToolError && error.reason === "superseded" && display) display.active = false;
  notice = error instanceof Error ? error.message : String(error); render();
}
function updateContext() {
  if (!display) return;
  pendingContext = structuredClone(display.context);
  void reportContext();
}
async function reportContext() {
  if (sendingContext || !alive) return;
  sendingContext = true;
  const previousError = contextError;
  try {
    while (pendingContext && alive) {
      const context = pendingContext;
      pendingContext = null;
      const encoded = JSON.stringify(context);
      if (encoded === reportedContext) { contextError = ""; continue; }
      const identity = context.identity;
      const line = `${context.note ? `${context.note} ` : ""}${identity ? `${identity.kind} ${identity.item}, revision ${identity.revision}` : `${context.screen}: ${context.status}`}. View ${context.view}. ${context.navigation.join(", ") || "No navigation"}.${context.receipt ? ` ${context.receipt}` : ""}`;
      try {
        await bridge.request("ui/update-model-context", { content: [{ type: "text", text: line }], structuredContent: context });
        reportedContext = encoded;
        contextError = "";
      } catch (error) {
        pendingContext ??= context;
        contextError = `${error instanceof Error ? error.message : String(error)} The receipt is retained. Retry context reporting only.`;
        break;
      }
    }
  } finally { sendingContext = false; if (alive && contextError !== previousError) render(); }
}
function accept(data: Record<string, unknown>) {
  const value = data["display"];
  if (!value || typeof value !== "object") throw new Error("The app tool supplied no display. The previous card is retained.");
  const previousPage = display?.query.page;
  display = value as Display;
  if (previousPage !== undefined && previousPage !== display.query.page) focusKey = display.query.page === "summary" ? "title" : "button:← Back";
  updateContext();
  scheduleRefresh();
}
async function read(move?: { page?: PageKind; position?: number; refresh?: boolean }) {
  if (busy || !alive) return;
  busy = true; notice = ""; render();
  try {
    let data;
    try { data = await bridge.tool("view_read", { view, ...(move ? { cut: display?.cut, ...move } : {}) }); }
    catch (error) {
      // A model input can advance this retained view between app polls.
      // Recover its current server display; never repeat a stale navigation.
      if (!(error instanceof AppToolError) || error.reason !== "stale" || !move?.refresh) throw error;
      data = await bridge.tool("view_read", { view });
    }
    accept(data);
  } finally { busy = false; render(); }
}
async function open() {
  if (!display?.card || display.status !== "ready") return;
  returnPage = "summary";
  try {
    const requested = display.card.declared?.display ?? "fullscreen", mode = await bridge.displayMode(requested);
    notice = mode === requested ? "" : requested === "fullscreen" ? "Full screen was not granted. Detail remains inside this card." : "The host kept full screen open.";
  } catch (error) { notice = `${error instanceof Error ? error.message : String(error)} Detail remains inside this card.`; }
  const modeNotice = notice;
  await read({ page: display.card.detailPage ?? "item" });
  notice = modeNotice; render();
}
async function declaredMode() {
  const requested = display?.card?.declared?.display ?? display?.surface?.display;
  if (!requested || bridge.context.displayMode === requested) return;
  try { if (await bridge.displayMode(requested) !== requested) notice = "The host kept the previous display mode."; }
  catch (error) { notice = error instanceof Error ? error.message : String(error); }
  render();
}
async function openDeclared(screen: string, items?: Readonly<Record<string, number>>, scope: ScopeRef | undefined = display?.card?.declared?.scope ?? display?.scope ?? display?.data?.scope, remember = true) {
  if (busy || !alive) return;
  const selected = display?.query.scope ?? display?.card?.declared?.scope ?? display?.scope ?? display?.data?.scope;
  const previous: DeclaredAddress | undefined = display ? { screen: display.query.screen, ...(display.query.items ? { items: display.query.items } : {}), ...(selected ? { scope: selected } : {}) } : undefined;
  const key = crypto.randomUUID();
  busy = true; notice = ""; render();
  try {
    const opening = await bridge.tool(viewToolName(screen, true), { view: key, ...(items ? { items } : {}), ...(scope ? { scope } : {}) });
    if (opening["view"] !== key) throw Error("The declared opening did not retain its view key.");
    if (remember && previous) {
      if (declaredHistory.length >= 128) declaredHistory.shift();
      declaredHistory.push(structuredClone(previous));
    }
    view = key; display = null;
  } finally { busy = false; render(); }
  await read();
  await declaredMode();
}
async function back() {
  if (!display) return;
  const declaredBack = display.back?.screen ?? display.card?.declared?.back ?? display.surface?.back;
  if (declaredBack) {
    for (let index = declaredHistory.length - 1; index >= 0; index--) {
      const previous = declaredHistory[index]!;
      if (previous.screen !== declaredBack) continue;
      declaredHistory.splice(index);
      return openDeclared(previous.screen, previous.items, previous.scope, false);
    }
    return openDeclared(declaredBack, undefined, display.back?.scope ?? display.card?.declared?.backScope ?? display.surface?.backScope, false);
  }
  const target = display.query.page === "diff" ? returnPage : "summary";
  notice = "";
  if (target === "summary") {
    try {
      const mode = await bridge.displayMode("inline");
      if (mode !== "inline") notice = "The host kept full screen open.";
    } catch (error) { notice = error instanceof Error ? error.message : String(error); }
  }
  const modeNotice = notice;
  await read({ page: target, position: display.position });
  notice = modeNotice; render();
}
async function act(action: string) {
  if (!display || busy || !display.active) return;
  busy = true; notice = ""; render();
  let accepted = false;
  try {
    const data = await bridge.tool("view_act", { view, cut: display.cut, action });
    accept(data);
    const result = data["result"] as { structuredContent?: Record<string, unknown> } | undefined;
    accepted = result?.structuredContent?.["answer"] === "accepted";
  } finally { busy = false; render(); }
  if (accepted) {
    let modeNotice = "";
    const record = display.card?.declared?.kind === "record" || display.card?.declared?.kind === "log";
    const requested = record ? display.card!.declared!.display : "inline";
    try { if (await bridge.displayMode(requested) !== requested) modeNotice = "The host kept the previous display mode."; }
    catch (error) { modeNotice = error instanceof Error ? error.message : String(error); }
    await read({ page: record ? "item" : "summary", position: display.position, refresh: true });
    notice = modeNotice; render();
  }
}
async function handoff() {
  if (!display) return;
  const identity = display.context.identity;
  const text = identity ? `Help me with ${identity.kind} ${identity.item}, revision ${identity.revision}.` : `Help me with ${display.query.screen}.`;
  await bridge.request("ui/message", { role: "user", content: { type: "text", text } });
}
function render() {
  if (!alive) return;
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement.dataset["focus"] : undefined;
  if (focused) focusKey = focused;
  queueMicrotask(() => {
    if (!alive || busy || !focusKey || !document.hasFocus()) return;
    const target = root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focusKey)}"]`);
    if (target && !(target instanceof HTMLButtonElement && target.disabled)) target.focus({ preventScroll: true });
  });
  root.replaceChildren();
  root.setAttribute("aria-busy", String(busy));
  document.documentElement.dataset["mode"] = bridge.context.displayMode ?? "inline";
  if (!display) { root.append(node("p", notice || "Loading the card…", "muted")); return; }
  if (display.receipt) { const receipt = node("p", display.receipt, "receipt"); receipt.setAttribute("role", "status"); root.append(receipt); }
  if (notice) { const status = node("p", notice, "notice"); status.setAttribute("role", "status"); root.append(status); }
  if (!display.active) root.append(node("p", "A newer card replaced this one. Receipts remain readable.", "notice"));
  if (contextError) {
    const error = node("div", undefined, "notice");
    error.append(node("p", contextError), button("Retry context", reportContext)); root.append(error);
  }
  const card = display.card;
  const summary = display.query.page === "summary";
  if ((!summary || display.back || card?.declared?.kind === "carousel" && card.declared.back) && (!surfaceOf() || display.back || card?.declared?.back || display.surface?.back)) {
    const nav = node("nav"); nav.setAttribute("aria-label", "Card navigation");
    nav.append(button("← Back", back, "quiet")); root.append(nav);
  }
  const surface = surfaceOf(), data = card?.declared?.data ?? display.data;
  if (display.members?.overflow) root.append(node("p", `${display.members.overflow} member reference${display.members.overflow === 1 ? " exceeds" : "s exceed"} the 32-member display limit.`, "notice"));
  if (surface && data) {
    try {
      const panel = surfaces.show(surface, data, async (name, items, scope) => {
        if (!busy && alive && display?.active) await openDeclared(surface.opens[name]!, items, scope ?? data.scope);
      }, () => alive && !!display?.active && surfaceOf()?.screen === surface.screen && scopeKey(display.card?.declared?.scope ?? display.scope ?? display.data?.scope) === scopeKey(data.scope), display.members);
      panel.inert = busy || !display.active;
      root.append(panel);
    } catch (error) { root.append(node("p", error instanceof Error ? error.message : "The declared surface is unavailable.", "notice")); }
    return;
  }
  if (!card) {
    root.append(node("p", display.fallback || display.status, "empty"));
    if (display.status !== "empty") root.append(button("Retry read", () => read({ refresh: true }), "quiet"));
    return;
  }
  const article = node("article");
  const eyebrow = node("div", undefined, "eyebrow");
  eyebrow.append(node("span", card.identity.kind), node("code", card.identity.revision, "revision"));
  article.append(eyebrow);
  const heading = node("h1");
  if (summary && display.status === "ready") {
    const title = node("a", card.title);
    title.href = "#detail";
    title.dataset["focus"] = "title";
    title.onclick = (event) => { event.preventDefault(); if (!busy) void open().catch(showError); };
    heading.append(title);
  } else heading.textContent = card.declared?.kind === "log" ? "Recent entries" : card.title;
  article.append(heading);
  if (card.actor) {
    const actor = node("p", undefined, `actor ${card.actor.kind}`);
    const mark = card.actor.kind === "person" ? "●" : card.actor.kind === "agent" ? "■" : "◇";
    const glyph = node("span", mark); glyph.setAttribute("aria-hidden", "true");
    actor.append(glyph, document.createTextNode(` ${card.actor.name}${card.actor.controller ? ` · controlled by ${card.actor.controller}` : ""} · ${card.actor.kind}`));
    article.append(actor);
  }
  if (card.declared?.actor !== null && card.declared?.actor !== undefined) {
    const actor = node("div", undefined, "declared-members");
    const refs = isMemberRef(card.declared.actor) ? [card.declared.actor] : Array.isArray(card.declared.actor) ? card.declared.actor.filter(isMemberRef) : [];
    for (const ref of refs) actor.append(memberElement(ref, display.members));
    if (!refs.length) actor.textContent = "Member unavailable";
    article.append(actor);
  }
  article.append(node("p", card.summary, "summary"));
  if (display.status === "unavailable" && card.declared?.routed) {
    const evidence = node("details", undefined, "read-points");
    evidence.append(node("summary", "Read points"));
    const points = node("ul");
    for (const point of card.projection) {
      const row = node("li"); row.append(node("code", `${point.scope} · entry ${point.seq} · ${point.hash}`)); points.append(row);
    }
    evidence.append(points); article.append(evidence);
    const retry = button("Retry read", () => read({ refresh: true }), "quiet"); retry.disabled ||= !display.active; article.append(retry);
  }
  if (card.reasons.length && card.declared?.kind !== "log") {
    const reasons = node("ul", undefined, "reasons");
    for (const [index, reason] of card.reasons.entries()) {
      const memberFact = card.declared?.memberFacts?.[index], line = node("li", memberFact ? `${memberFact.label}: ` : reason);
      for (const ref of memberFact?.refs ?? []) line.append(memberElement(ref, display.members));
      reasons.append(line);
    }
    article.append(reasons);
  }
  if (!summary) {
    for (const row of card.declared?.log ?? []) {
      const section = node("section", undefined, "entry projected-entry");
      section.append(node("h2", `Entry ${row.entry.seq}: ${row.title}`), node("p", row.time, "muted"));
      if (row.summary) section.append(node("p", row.summary));
      for (const [index, fact] of row.facts.entries()) {
        const memberFact = row.memberFacts?.[index], line = node("p", memberFact ? `${memberFact.label}: ` : fact);
        for (const ref of memberFact?.refs ?? []) line.append(memberElement(ref, display.members));
        section.append(line);
      }
      article.append(section);
    }
    if (card.body) article.append(node(display.query.page === "diff" ? "pre" : "p", card.body, display.query.page === "diff" ? "diff" : "body"));
    for (const entry of card.entries ?? []) {
      const section = node("section", undefined, "entry");
      section.append(node("h2", `${entry.scope} · entry ${entry.seq}`), node("p", entry.text)); article.append(section);
    }
    if (card.unavailable.length) article.append(node("p", `Unavailable: ${card.unavailable.map((range) => `${range.scope} entries ${range.from}–${range.to}`).join("; ")}.`, "notice"));
  }
  if (card.declared?.series) article.append(seriesPanel(card.declared.series));
  if (card.declared?.links?.length) {
    const links = node("nav"); links.setAttribute("aria-label", "Related records");
    for (const link of card.declared.links) {
      const control = button(link.label, () => openDeclared(link.screen, link.items), "quiet");
      control.disabled ||= !display.active; links.append(control);
    }
    article.append(links);
  }
  root.append(article);
  if (summary && (!card.declared || card.declared.kind === "carousel")) {
    const nav = node("nav", undefined, "carousel"); nav.setAttribute("aria-label", "Carousel");
    const previous = button("‹", () => read({ position: display!.position - 1, page: "summary" }), "quiet arrow");
    previous.setAttribute("aria-label", "Previous item"); previous.disabled ||= display.position === 0;
    const next = button("›", () => read({ position: display!.position + 1, page: "summary" }), "quiet arrow");
    next.setAttribute("aria-label", "Next item"); next.disabled ||= display.position + 1 >= display.count;
    nav.append(previous, node("span", `${display.position + 1} / ${display.count}`, "position"), next); root.append(nav);
  }
  if (display.query.page !== "diff" && (!summary || card.declared?.routed && card.actions.length > 0 || card.actions.some(action => action.input === "chat" || action.purpose === "check-original"))) {
    const actions = node("div", undefined, "actions");
    for (const action of card.actions) {
      const control = button(action.input === "chat" ? `${action.label} in chat` : action.label, action.input === "chat" ? handoff : () => act(action.id));
      control.disabled ||= !display.active; actions.append(control);
    }
    if (display.query.page === "item" && card.actions.length < 2 && !card.unresolvedOriginal && !card.actions.some(action => action.input === "chat")) {
      const ask = button("Ask in chat", handoff, "quiet"); ask.disabled ||= !display.active; actions.append(ask);
    }
    if (display.query.page === "item" && card.diffAvailable) actions.append(button("View diff", async () => { returnPage = "item"; await read({ page: "diff" }); }, "quiet"));
    root.append(actions);
  }
}
function keyboard(event: KeyboardEvent) {
  if (!display || busy || display.query.page !== "summary" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (display.card?.declared && display.card.declared.kind !== "carousel") return;
  const position = display.position + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0);
  if (position === display.position || position < 0 || position >= display.count) return;
  event.preventDefault(); void read({ position, page: "summary" }).catch(showError);
}
let frame = 0;
let lastSize = "";
function measure() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    if (!alive || !connected) return;
    const size = root.getBoundingClientRect();
    const width = Math.ceil(document.documentElement.clientWidth), height = Math.ceil(size.height);
    const key = `${width}:${height}`;
    if (key !== lastSize) { lastSize = key; bridge.notify("ui/notifications/size-changed", { width, height }); }
  });
}
const resize = new ResizeObserver(measure);
resize.observe(root);
window.addEventListener("keydown", keyboard);
window.addEventListener("resize", measure);
document.fonts.addEventListener("loadingdone", measure);
void document.fonts.ready.then(measure);
bridge.on((method) => {
  if (method === "ui/resource-teardown") { close(); return; }
  if (method === "ui/notifications/host-context-changed") {
    // The bridge applies host styles to the root. Keep mounted controls intact while a pointer or key is held.
    document.documentElement.dataset["mode"] = bridge.context.displayMode ?? "inline";
    measure();
  }
});
function close() {
  window.clearTimeout(refreshTimer);
  surfaces.close();
  alive = false; connected = false; cancelAnimationFrame(frame); resize.disconnect();
  window.removeEventListener("keydown", keyboard); window.removeEventListener("resize", measure);
  document.fonts.removeEventListener("loadingdone", measure); bridge.close();
}
window.addEventListener("pagehide", close, { once: true });
render();
void (async () => {
  await bridge.initialize();
  connected = true; measure();
  const input = await bridge.input();
  if (typeof input["view"] !== "string") throw new Error("The opening tool input has no view key. Open this card again.");
  view = input["view"];
  await read();
  await declaredMode();
})().catch(showError);
