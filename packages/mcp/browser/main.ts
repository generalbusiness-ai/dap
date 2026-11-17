import { canonicalize, isMemberRef } from "@generalbusiness/dap-bytes";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { AppBridge, AppToolError } from "./bridge.ts";
import type { Display, PageKind, ShownRead } from "../src/views/types.ts";
import { viewToolName } from "../src/views/names.ts";
import { cardOpens } from "../src/views/opens.ts";
import { seriesPanel } from "./series.ts";
import { SurfacePanels } from "./surface.ts";
import { bindControl, keyed, reconcile, retained, retireControls } from "./reconcile.ts";
import { memberElement, memberStyleElement } from "./member.ts";
import "./style.css";
document.head.append(memberStyleElement());

const root = document.querySelector<HTMLElement>("#card-root")!;
const bridge = new AppBridge();
let display: Display | null = null;
let view = "";
/** The call that opened this view: the host's tool input, or the card's own call for a declared screen. */
let openingCall: { tool: string; args: Record<string, unknown> } | null = null;
let busy = false;
/** A read that the refresh timer started. It leaves the controls enabled; a press waits for it, then checks its card. */
let refreshing: Promise<void> | null = null;
let notice = "";
/** The last call got no answer, or found the card busy, so the display may be old. The card offers a read. */
let readAgain = false;
let contextError = "";
let pendingContext: Display["context"] | null = null;
let sendingContext = false;
let reportedContext = "";
let returnPage: PageKind = "summary";
let alive = true;
let connected = false;
let focusKey: string | null = null;
let refreshTimer = 0;
let renderedCard = "";
const surfaces = new SurfacePanels();
interface DeclaredAddress { screen: string; items?: Readonly<Record<string, number>>; scope?: ScopeRef }
const declaredHistory: DeclaredAddress[] = [];
const scopeKey = (scope?: ScopeRef) => scope ? JSON.stringify([scope.scope, scope.genesis]) : "";
const surfaceOf = () => display?.card?.declared?.surface ?? display?.surface;

function scheduleRefresh() {
  window.clearTimeout(refreshTimer);
  const interval = display?.card?.declared?.refresh ?? display?.surface?.refresh ?? display?.refresh;
  if (alive && display?.active && interval) refreshTimer = window.setTimeout(() => {
    if (busy || refreshing) scheduleRefresh(); else void refresh();
  }, interval);
}
/** The timer's read. It never rejects, so a press that waits on it never fails because of it. */
function refresh(): Promise<void> {
  const run = (async () => {
    // A background read clears the last notice. A press that waits on this read sets its own notice afterwards.
    notice = ""; readAgain = false;
    try { await readDisplay({ refresh: true }); }
    catch (error) { if (error instanceof AppToolError && error.reason === "busy") scheduleRefresh(); else showError(error); }
    finally { refreshing = null; render(); }
  })();
  refreshing = run;
  return run;
}
/** Run a press now, or after the background read ends. The press then judges the card that read left. */
function whenSettled(then: () => void): void {
  if (refreshing) void refreshing.then(() => whenSettled(then)); else then();
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
interface Gesture {
  readonly view: string; readonly cut: number | null; readonly address: string;
  readonly identity: Display["context"]["identity"]; readonly screen: string; readonly position: number | null; readonly action: string;
}
function cardIdentity() {
  return JSON.stringify([view, display?.query.screen, display?.query.page,
    display?.card?.identity.kind, display?.card?.identity.item,
    display?.card?.identity.subject.scope, display?.card?.identity.subject.item,
    scopeKey(display?.card?.declared?.scope ?? display?.scope ?? display?.data?.scope),
    display?.query.subject, Object.entries(display?.query.items ?? {}).sort(([a], [b]) => a.localeCompare(b))]);
}
function captureGesture(action: string): Gesture {
  return { view, cut: display?.cut ?? null, address: cardIdentity(), identity: structuredClone(display?.context.identity ?? null),
    screen: display?.query.screen ?? "", position: display?.position ?? null, action };
}
function currentGesture(gesture: Gesture): boolean {
  return gesture.view === view && gesture.address === cardIdentity() && gesture.position === (display?.position ?? null)
    && canonicalize(gesture.identity) === canonicalize(display?.context.identity ?? null);
}
const CHANGED_GESTURE = "The card changed during this press, so nothing was sent. Check the card, then press again.";
function button(key: string, label: string, run: (gesture: Gesture) => Promise<void>, className?: string) {
  const element = node("button", label, className);
  element.type = "button";
  element.dataset["focus"] = key;
  element.disabled = busy;
  bindControl(element, key, () => {
    const gesture = captureGesture(key);
    return () => whenSettled(() => {
      if (!alive || busy) return;
      if (!currentGesture(gesture)) { notice = CHANGED_GESTURE; render(); return; }
      void run(gesture).catch(showError);
    });
  });
  return element;
}
function showError(error: unknown) {
  if (!alive) return;
  if (error instanceof AppToolError && error.reason === "superseded" && display) display.active = false;
  if (!(error instanceof AppToolError) || error.reason === "busy") readAgain = true;
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
      const exact = context.exact ? ` Showing ${context.exact.kind}${context.exact.truncated ? ", truncated" : ""}: ${context.exact.commits.map(commit => `${commit.label} ${commit.id}`).join(", ")}.` : "";
      const line = `${context.note ? `${context.note} ` : ""}${identity ? `${identity.kind} ${identity.item}, revision ${identity.revision}` : `${context.screen}: ${context.status}`}. View ${context.view}. ${context.navigation.join(", ") || "No navigation"}.${exact}${context.receipt ? ` ${context.receipt}` : ""}`;
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
  if (previousPage !== undefined && previousPage !== display.query.page) focusKey = display.query.page === "summary" ? "title" : "back";
  updateContext();
  scheduleRefresh();
}
/** What a person reads when a process change stopped a press or a move. */
const NOT_REPEATED = "The server process changed before this press arrived, so nothing was sent. Check the card, then press again.";
/**
 * A host can send this card's calls to another process of the same home than the model's call, and a process that holds no
 * view answers `absent`. The opening call opens the view there. It reads and signs nothing beyond the model's own call, and
 * the card never repeats a press after it. If this fails, a person cannot fix it inside the card, so the words say what to do.
 */
async function reopen() {
  try {
    if (!openingCall) throw new Error("the card has no opening call");
    const opened = await bridge.tool(openingCall.tool, openingCall.args);
    if (opened["view"] !== view) throw new Error("the opening kept another view key");
  } catch (error) {
    throw new Error(`This card could not open its view on this server process: ${error instanceof Error ? error.message : String(error)}. No act was sent. Ask for a new card in the chat.`);
  }
}
const isAbsent = (error: unknown) => error instanceof AppToolError && error.reason === "absent";
const PERMANENT_READ = "a permanent read";
const isStale = (error: unknown) => error instanceof AppToolError && error.reason === "stale";
/** What a person reads when the card's cut moved under a press or a move. The server refused it before it signed anything. */
const CHANGED = "The card had changed, so this press sent nothing. It shows the current state now. Check it, then press again.";
/** What the card knows when no answer came: only that it does not know. `what` names what that press can sign. */
const NO_ANSWER = (what: string) => `The app gave no answer to this press, so the card does not know how it ended. The request may have gone, and ${what} may have been signed. The card read its view again. Check it before you press again.`;
const LATE_REPLY = "A late reply arrived. Read the card again to check the original request.";
type ReadMove = { page?: PageKind; position?: number; refresh?: boolean };
async function read(move?: ReadMove) {
  while (refreshing) await refreshing;
  if (busy || !alive) return;
  busy = true; notice = ""; readAgain = false; render();
  try { await readDisplay(move); }
  finally { busy = false; render(); }
}
/** Read under the busy state already held by read() or act(). */
async function readDisplay(move?: ReadMove) {
  if (!alive) return;
  let data;
  try { data = await bridge.tool("view_read", { view, ...(move ? { cut: display?.cut, ...move } : {}) }); }
  catch (error) {
    // A model input can advance this retained view between app polls.
    // Recover its current server display; never repeat a stale navigation.
    if (isAbsent(error)) {
      await reopen();
      data = await bridge.tool("view_read", { view });
      if (move && !move.refresh) notice = NOT_REPEATED;
    }
    else if (!isStale(error)) throw error;
    else {
      data = await bridge.tool("view_read", { view });
      if (move && !move.refresh) notice = CHANGED;
    }
  }
  accept(data);
}
async function open() {
  if (!display?.card || !cardOpens(display.status)) return;
  returnPage = "summary";
  try {
    const requested = display.card.declared?.display ?? "fullscreen", mode = await bridge.displayMode(requested);
    notice = mode === requested ? "" : requested === "fullscreen" ? "Full screen was not granted. Detail remains inside this card." : "The host kept full screen open.";
  } catch (error) { notice = `${error instanceof Error ? error.message : String(error)} Detail remains inside this card.`; }
  const modeNotice = notice;
  await read({ page: display.card.detailPage ?? "item" });
  notice = modeNotice || notice; render();
}
async function declaredMode() {
  const requested = display?.card?.declared?.display ?? display?.surface?.display;
  if (!requested || bridge.context.displayMode === requested) return;
  try { if (await bridge.displayMode(requested) !== requested) notice = "The host kept the previous display mode."; }
  catch (error) { notice = error instanceof Error ? error.message : String(error); }
  render();
}
async function openDeclared(screen: string, items?: Readonly<Record<string, number>>, scope: ScopeRef | undefined = display?.card?.declared?.scope ?? display?.scope ?? display?.data?.scope, remember = true) {
  while (refreshing) await refreshing;
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
    openingCall = { tool: viewToolName(screen, true), args: { view: key, ...(items ? { items } : {}), ...(scope ? { scope } : {}) } };
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
  notice = modeNotice || notice; render();
}
async function act(action: string, signs = "an act", gesture = captureGesture(action)) {
  while (refreshing) await refreshing;
  if (!display || busy || !display.active) return;
  if (!currentGesture(gesture) || gesture.cut === null) { notice = CHANGED_GESTURE; render(); return; }
  busy = true; notice = ""; readAgain = false; render();
  let accepted = false;
  const requestedView = view;
  let lateReply = false;
  const recovered = () => {
    if (!alive || view !== requestedView) return;
    lateReply = true; readAgain = true; notice = LATE_REPLY; render();
  };
  try {
    let data;
    try { data = await bridge.tool("view_act", { view: gesture.view, cut: gesture.cut, action }, recovered); }
    catch (error) {
      if (error instanceof AppToolError && !isAbsent(error) && !isStale(error)) throw error;
      const words = isAbsent(error) ? NOT_REPEATED : isStale(error) ? CHANGED : NO_ANSWER(signs);
      if (isAbsent(error)) await reopen();
      try { accept(await bridge.tool("view_read", { view })); }
      catch (failure) { readAgain = true; notice = `${words} The read did not finish: ${failure instanceof Error ? failure.message : String(failure)}`; return; }
      notice = words;
      return;
    }
    accept(data);
    const result = data["result"] as { structuredContent?: Record<string, unknown> } | undefined;
    accepted = result?.structuredContent?.["answer"] === "accepted";
    if (accepted) {
      let modeNotice = "";
      const record = display.card?.declared?.kind === "record" || display.card?.declared?.kind === "log";
      const requested = record ? display.card!.declared!.display : "inline";
      try { if (await bridge.displayMode(requested) !== requested) modeNotice = "The host kept the previous display mode."; }
      catch (error) { modeNotice = error instanceof Error ? error.message : String(error); }
      if (alive) {
        notice = ""; readAgain = false;
        await readDisplay({ page: record ? "item" : "summary", position: display.position, refresh: true });
      }
      notice = modeNotice || notice;
    }
  } finally {
    busy = false;
    // A late reply can arrive while either reread still runs.
    if (lateReply && alive && view === requestedView) { readAgain = true; notice = LATE_REPLY; }
    render();
  }
}
async function handoff(gesture: Gesture) {
  if (!display || !alive || busy || !display.active) return;
  if (!currentGesture(gesture)) { notice = CHANGED_GESTURE; render(); return; }
  const identity = gesture.identity;
  const text = identity ? `Help me with ${identity.kind} ${identity.item}, revision ${identity.revision}.` : `Help me with ${gesture.screen}.`;
  await bridge.request("ui/message", { role: "user", content: [{ type: "text", text }] });
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
  // Cuts and revisions can change while a reader stays on the same card.
  // Navigation starts a new identity with its own section state.
  const identity = cardIdentity();
  const sections = identity === renderedCard
    ? new Map([...root.querySelectorAll<HTMLDetailsElement>("details[data-section]")].map(section => [section.dataset["section"]!, section.open]))
    : new Map<string, boolean>();
  renderedCard = identity;
  const desired = document.createDocumentFragment();
  renderCard(desired, identity, sections);
  if (reconcile(root, desired) === "refused") {
    // Never leave an earlier card on screen: replace it with a way back.
    retireControls(root); root.replaceChildren();
    const fallback = document.createDocumentFragment();
    fallback.append(node("p", "The card could not update. Read it again.", "notice"), button("read-again", "Read the card again", () => read(), "quiet"));
    reconcile(root, fallback);
  }
}
/** Prepare ordinary children without moving a live surface or committing a partial tree. */
function renderCard(desired: DocumentFragment, identity: string, sections: ReadonlyMap<string, boolean>): void {
  root.setAttribute("aria-busy", String(busy));
  document.documentElement.dataset["mode"] = bridge.context.displayMode ?? "inline";
  if (!display) { desired.append(keyed(node("p", notice || "Loading the card…", "muted"), "loading")); if (readAgain) desired.append(button("read-again", "Read the card again", () => read(), "quiet")); return; }
  if (display.receipt) { const receipt = keyed(node("p", display.receipt, "receipt"), "receipt"); receipt.setAttribute("role", "status"); desired.append(receipt); }
  if (notice) { const status = keyed(node("p", notice, "notice"), "notice"); status.setAttribute("role", "status"); desired.append(status); }
  if (readAgain) desired.append(button("read-again", "Read the card again", () => read(), "quiet"));
  if (!display.active) desired.append(keyed(node("p", "A newer card replaced this one. Receipts remain readable.", "notice"), "inactive"));
  if (contextError) {
    const error = keyed(node("div", undefined, "notice"), "context-error");
    error.append(node("p", contextError), button("retry-context", "Retry context", reportContext)); desired.append(error);
  }
  const card = display.card;
  const summary = display.query.page === "summary";
  if ((!summary || display.back || card?.declared?.kind === "carousel" && card.declared.back) && (!surfaceOf() || display.back || card?.declared?.back || display.surface?.back)) {
    const nav = keyed(node("nav"), `navigation:${identity}`); nav.setAttribute("aria-label", "Card navigation");
    nav.append(button("back", "← Back", back, "quiet")); desired.append(nav);
  }
  const surface = surfaceOf(), data = card?.declared?.data ?? display.data;
  if (display.members?.overflow) desired.append(keyed(node("p", `${display.members.overflow} member reference${display.members.overflow === 1 ? " exceeds" : "s exceed"} the 32-member display limit.`, "notice"), "member-overflow"));
  if (surface && data) {
    try {
      const panel = surfaces.show(surface, data, async (name, items, scope) => {
        if (!busy && alive && display?.active) await openDeclared(surface.opens[name]!, items, scope ?? data.scope);
      }, () => alive && !!display?.active && surfaceOf()?.screen === surface.screen && scopeKey(display.card?.declared?.scope ?? display.scope ?? display.data?.scope) === scopeKey(data.scope), display.members);
      panel.inert = busy || !display.active;
      desired.append(retained(panel, `surface:${JSON.stringify([surface.screen, surface.resource, data.scope.scope, data.scope.genesis])}`));
    } catch (error) { desired.append(keyed(node("p", error instanceof Error ? error.message : "The declared surface is unavailable.", "notice"), "surface-error")); }
    return;
  }
  if (!card) {
    desired.append(keyed(node("p", display.fallback || display.status, "empty"), "empty"));
    if (display.status !== "empty") desired.append(button("retry-read", "Retry read", () => read({ refresh: true }), "quiet"));
    return;
  }
  const article = keyed(node("article"), `article:${identity}`);
  const eyebrow = keyed(node("div", undefined, "eyebrow"), "eyebrow");
  if (card.kicker) eyebrow.append(node("span", card.kicker));
  else eyebrow.append(node("span", card.identity.kind), node("code", card.identity.revision, "revision"));
  article.append(eyebrow);
  const heading = keyed(node("h1"), "heading");
  if (summary && cardOpens(display.status)) {
    const title = node("a", card.title);
    title.href = "#detail";
    title.dataset["focus"] = "title";
    bindControl(title, "title", () => {
      const gesture = captureGesture("title");
      return event => {
        event.preventDefault();
        whenSettled(() => {
          if (!alive || busy) return;
          if (!currentGesture(gesture)) { notice = CHANGED_GESTURE; render(); return; }
          void open().catch(showError);
        });
      };
    });
    heading.append(title);
  } else heading.textContent = card.declared?.kind === "log" ? "Recent entries" : card.title;
  article.append(heading);
  if (card.actor) {
    const actor = keyed(node("p", undefined, `actor ${card.actor.kind}`), "actor");
    const mark = card.actor.kind === "person" ? "●" : card.actor.kind === "agent" ? "■" : "◇";
    const glyph = node("span", mark); glyph.setAttribute("aria-hidden", "true");
    actor.append(glyph, document.createTextNode(` ${card.actorLabel ? `${card.actorLabel}: ` : ""}${card.actor.name}${card.actor.controller ? ` · controlled by ${card.actor.controller}` : ""} · ${card.actor.kind}`));
    article.append(actor);
  }
  if (card.declared?.actor !== null && card.declared?.actor !== undefined) {
    const actor = keyed(node("div", undefined, "declared-members"), "declared-members");
    const refs = isMemberRef(card.declared.actor) ? [card.declared.actor] : Array.isArray(card.declared.actor) ? card.declared.actor.filter(isMemberRef) : [];
    for (const ref of refs) actor.append(memberElement(ref, display.members));
    if (!refs.length) actor.textContent = "Member unavailable";
    article.append(actor);
  }
  article.append(keyed(node("p", card.summary, "summary"), "summary"));
  if (display.status === "unavailable" && card.declared?.routed) {
    const evidence = keyed(node("details", undefined, "read-points"), "read-points");
    evidence.dataset["section"] = "read-points";
    evidence.append(node("summary", "Read points"));
    const points = node("ul");
    for (const point of card.projection) {
      const row = node("li"); row.append(node("code", `${point.scope} · entry ${point.seq} · ${point.hash}`)); points.append(row);
    }
    evidence.append(points); article.append(evidence);
    const retry = button("retry-read", "Retry read", () => read({ refresh: true }), "quiet"); retry.disabled ||= !display.active; article.append(retry);
  }
  if (card.reasons.length && card.declared?.kind !== "log") {
    const reasons = keyed(node("ul", undefined, "reasons"), "reasons");
    for (const [index, reason] of card.reasons.entries()) {
      const memberFact = card.declared?.memberFacts?.[index], line = node("li", memberFact ? `${memberFact.label}: ` : reason);
      for (const ref of memberFact?.refs ?? []) line.append(memberElement(ref, display.members));
      reasons.append(line);
    }
    article.append(reasons);
  }
  if (!summary) {
    for (const row of card.declared?.log ?? []) {
      const section = keyed(node("section", undefined, "entry projected-entry"), `log:${canonicalize(row.entry)}`);
      section.append(node("h2", `Entry ${row.entry.seq}: ${row.title}`), node("p", row.time, "muted"));
      if (row.summary) section.append(node("p", row.summary));
      for (const [index, fact] of row.facts.entries()) {
        const memberFact = row.memberFacts?.[index], line = node("p", memberFact ? `${memberFact.label}: ` : fact);
        for (const ref of memberFact?.refs ?? []) line.append(memberElement(ref, display.members));
        section.append(line);
      }
      article.append(section);
    }
    if (display.query.page === "diff" && card.readers?.length) article.append(readerNav(card.readers));
    if (display.query.page === "diff" && card.shownRead) article.append(readBand(card.shownRead));
    if (card.body) article.append(keyed(node(display.query.page === "diff" ? "pre" : "p", card.body, display.query.page === "diff" ? "diff" : "body"), "body"));
    if (display.query.page === "diff" && card.shownRead) article.append(...readFiles(card.shownRead));
    for (const entry of card.entries ?? []) {
      const section = keyed(node("section", undefined, "entry"), `entry:${JSON.stringify([entry.scope, entry.seq])}`);
      section.append(node("h2", `${entry.scope} · entry ${entry.seq}`), node("p", entry.text)); article.append(section);
    }
    if (card.unavailable.length) article.append(keyed(node("p", `Unavailable: ${card.unavailable.map((range) => `${range.scope} entries ${range.from}–${range.to}`).join("; ")}.`, "notice"), "unavailable"));
  }
  // A first card shows a whole text only, so a person reads all of it before the acts under it.
  if (summary && card.wholeText && card.body) article.append(keyed(node("p", card.body, "body"), "body"));
  if (!summary && card.record) {
    const record = keyed(node("details", undefined, "read-points"), "exact-record");
    record.dataset["section"] = "exact-record";
    record.append(node("summary", card.record.label), node("pre", card.record.text, "diff"));
    article.append(record);
  }
  if (card.declared?.series) article.append(keyed(seriesPanel(card.declared.series), "series"));
  if (card.declared?.links?.length) {
    const links = keyed(node("nav"), "related-records"); links.setAttribute("aria-label", "Related records");
    for (const link of card.declared.links) {
      const control = button(`link:${canonicalize([link.screen, link.items ?? {}])}`, link.label, () => openDeclared(link.screen, link.items), "quiet");
      control.disabled ||= !display.active; links.append(control);
    }
    article.append(links);
  }
  desired.append(article);
  if (summary && (!card.declared || card.declared.kind === "carousel")) {
    const nav = keyed(node("nav", undefined, "carousel"), `carousel:${identity}`); nav.setAttribute("aria-label", "Carousel");
    const previous = button("previous", "‹", () => read({ position: display!.position - 1, page: "summary" }), "quiet arrow");
    previous.setAttribute("aria-label", "Previous item"); previous.disabled ||= display.position === 0;
    const next = button("next", "›", () => read({ position: display!.position + 1, page: "summary" }), "quiet arrow");
    next.setAttribute("aria-label", "Next item"); next.disabled ||= display.position + 1 >= display.count;
    nav.append(previous, node("span", `${display.position + 1} / ${display.count}`, "position"), next); desired.append(nav);
  }
  if (summary && cardOpens(display.status)) {
    const opener = button("open", "Open", open, "quiet"); opener.disabled ||= !display.active; desired.append(opener);
  }
  if (display.query.page !== "diff" && (!summary || card.declared?.routed && card.actions.length > 0 || card.actions.some(action => action.input === "chat" || action.purpose === "check-original"))) {
    const actions = keyed(node("div", undefined, "actions"), `actions:${identity}`);
    for (const action of card.actions) {
      const control = button(`action:${action.id}:${action.input ?? "native"}`, action.input === "chat" ? `${action.label} in chat` : action.label, action.input === "chat" ? handoff : gesture => act(action.id, "an act", gesture));
      control.disabled ||= !display.active; actions.append(control);
    }
    if (display.query.page === "item" && card.actions.length < 2 && !card.unresolvedOriginal && !card.actions.some(action => action.input === "chat")) {
      const ask = button("ask-chat", "Ask in chat", handoff, "quiet"); ask.disabled ||= !display.active; actions.append(ask);
    }
    if (display.query.page === "item" && card.diffAvailable && card.readers?.length) for (const reader of card.readers) actions.append(readerButton(reader));
    else if (display.query.page === "item" && card.diffAvailable) actions.append(button("view-diff", "View diff", async gesture => { returnPage = "item"; if (card.diffSigned) await act("view-diff", PERMANENT_READ, gesture); else await read({ page: "diff" }); }, "quiet"));
    desired.append(actions);
  }
  if (summary && card.wholeText && card.actions.length && !card.actions.some(action => action.input === "chat" || action.purpose === "check-original")) {
    const actions = keyed(node("div", undefined, "actions"), `whole-actions:${identity}`);
    for (const action of card.actions) { const control = button(`action:${action.id}:native`, action.label, gesture => act(action.id, "an act", gesture)); control.disabled ||= !display.active; actions.append(control); }
    desired.append(actions);
  }
  for (const section of desired.querySelectorAll<HTMLDetailsElement>("details[data-section]")) {
    const open = sections.get(section.dataset["section"]!);
    if (open !== undefined) section.open = open;
  }
}
function readerButton(reader: { action: string; label: string; current?: boolean }): HTMLButtonElement {
  const control = button(`reader:${reader.action}`, reader.label, async gesture => { returnPage = "item"; await act(reader.action, PERMANENT_READ, gesture); }, "quiet");
  control.disabled ||= !display?.active || (reader.current === true && display?.card?.shownRead?.truncated !== true);
  if (reader.current) control.setAttribute("aria-current", "true");
  return control;
}
/** The reads of one version. Each names its commits, and a read this view holds signs nothing. */
function readerNav(readers: NonNullable<NonNullable<Display["card"]>["readers"]>): HTMLElement {
  const nav = keyed(node("nav", undefined, "actions"), "exact-reads"); nav.setAttribute("aria-label", "Exact reads");
  nav.append(...readers.map(readerButton));
  return nav;
}
/** The title, the exact commits and any truncation of a read. They stand above its lines, so a reader sees them first. */
function readBand(shown: ShownRead): HTMLElement {
  const band = keyed(node("section", undefined, "read-band"), "read-band");
  band.append(node("h2", shown.title));
  const commits = node("dl");
  for (const commit of shown.commits) commits.append(node("dt", commit.label), node("dd", commit.id));
  band.append(commits);
  if (shown.truncated) { const cut = keyed(node("p", `Truncated. Left out: ${shown.leftOut ?? "part of this read"}.`, "notice"), "truncated"); cut.setAttribute("role", "status"); band.append(cut); }
  return band;
}
function readFiles(shown: ShownRead): HTMLElement[] {
  if (!shown.files.length && !shown.moreFiles) return [];
  const list = keyed(node("div", undefined, "actions"), "read-files");
  list.append(...shown.files.map(file => readerButton({ action: file.action, label: file.label })));
  return [list, ...(shown.moreFiles ? [keyed(node("p", `${shown.moreFiles} more changed ${shown.moreFiles === 1 ? "path has" : "paths have"} no File button here.`, "muted"), "more-files")] : [])];
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
  retireControls(root); surfaces.close();
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
  openingCall = { tool: viewToolName(document.body.dataset["screen"] ?? "", "declared" in document.body.dataset), args: input };
  await read();
  await declaredMode();
})().catch(showError);
