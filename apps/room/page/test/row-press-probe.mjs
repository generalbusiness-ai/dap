/** A bounded read-only probe of ordinary Needs you row presses. Browser observations grant no authority. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const ROW_PRESS_BOUND = Object.freeze({ tabs: 20, perTab: 5, maximum: 100 });
const redact = text => String(text).replace(/artroom-[a-z-]+:[^\s"<>]+/gi, "<link withheld>").replace(/Bearer\s+\S+/gi, "Bearer <withheld>").replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "<token withheld>");
const requestUrl = raw => { const url = new URL(raw); return `${url.origin}${url.pathname}`; };

export function rowPressProbe(context, out, debug = {}) {
  const traffic = [], console = [], navigation = [], rows = [], drawErrors = [], ids = new WeakMap();
  let next = 0, page = null, started = false;
  context.on("request", request => {
    const id = ++next; ids.set(request, id);
    traffic.push({ event: "request", id, at: new Date().toISOString(), method: request.method(), url: requestUrl(request.url()) });
  });
  context.on("response", response => traffic.push({ event: "response", id: ids.get(response.request()), at: new Date().toISOString(), status: response.status() }));
  context.on("requestfailed", request => traffic.push({ event: "failed", id: ids.get(request), at: new Date().toISOString(), error: redact(request.failure()?.errorText) }));
  const attach = value => {
    value.on("console", message => { if (["error", "warning"].includes(message.type())) console.push({ at: new Date().toISOString(), type: message.type(), text: redact(message.text()) }); });
    value.on("pageerror", error => console.push({ at: new Date().toISOString(), type: "pageerror", text: redact(error) }));
    value.on("framenavigated", frame => { if (frame === value.mainFrame()) navigation.push({ at: new Date().toISOString(), url: redact(frame.url()) }); });
  };
  for (const existing of context.pages()) attach(existing);
  context.on("page", attach);
  async function debugDraw(value) {
    if (!debug.source) return;
    // Pause only at the existing draw-failure call. Successful draws and served production bytes stay untouched.
    const at = debug.source.indexOf('"This room did not open"');
    const prefix = debug.source.slice(0, at), declaration = [...prefix.matchAll(/function ([\w$]+)\([\w$]+,[\w$]+=\[\]\)\{/g)].at(-1);
    if (!declaration) throw Error("The diagnostic could not identify the frozen failure-screen function.");
    const name = declaration[1], calls = [...debug.source.matchAll(new RegExp(`\\b${name}\\(([\\w$]+),[\\w$]+\\)`, "g"))];
    if (calls.length !== 1) throw Error("The diagnostic requires one exact draw-failure call.");
    const call = calls[0], before = debug.source.slice(0, call.index), lines = before.split("\n"), variable = call[1];
    const session = await context.newCDPSession(value);
    await session.send("Debugger.enable");
    session.on("Debugger.paused", event => { void (async () => {
      try {
        const frame = event.callFrames[0];
        const got = await session.send("Debugger.evaluateOnCallFrame", { callFrameId: frame.callFrameId, expression: `({name:${variable}?.name,message:${variable}?.message,stack:${variable}?.stack})`, returnByValue: true });
        drawErrors.push({ at: new Date().toISOString(), reason: event.reason, error: got.result.value ?? null, evaluationError: got.exceptionDetails?.text,
          frames: event.callFrames.map(frame => ({ name: frame.functionName, url: requestUrl(frame.url || value.url()), line: frame.location.lineNumber, column: frame.location.columnNumber })) });
        mkdirSync(out, { recursive: true }); writeFileSync(join(out, "draw-errors.json"), redact(JSON.stringify(drawErrors, null, 2)) + "\n");
      } finally { await session.send("Debugger.resume"); }
    })(); });
    await session.send("Debugger.setBreakpointByUrl", { urlRegex: "/page/page\\.js$", lineNumber: lines.length - 1, columnNumber: lines.at(-1).length });
  }
  const report = () => ({ diagnosticBreakpoint: !!debug.source, drawErrors, bound: ROW_PRESS_BOUND, started, attempted: rows.length, passed: rows.filter(row => row.pass).length, rows, console, traffic, navigation });
  async function capture(label) {
    mkdirSync(out, { recursive: true });
    const kept = report();
    // Capture visible draw state only. This does not expose the Page module's private draw-generation counter.
    if (started && page && !page.isClosed()) {
      kept.visibleDraw = await page.evaluate(() => ({ url: location.href, title: document.title, readyState: document.readyState, visibilityState: document.visibilityState,
        entry: document.querySelector("#page")?.getAttribute("data-entry"), headings: [...document.querySelectorAll("h1,h2")].map(node => node.textContent),
        needsLists: document.querySelectorAll("[data-needs-you]").length, commentSlots: [...document.querySelectorAll('[data-action-slot="comment"]')].map(node => ({ forms: node.querySelectorAll("form").length, visible: !!node.getClientRects().length, text: node.textContent })),
        answerControls: [...document.querySelectorAll("[data-question-answer]")].map(node => ({ label: node.getAttribute("data-question-answer"), visible: !!node.getClientRects().length })),
        buttons: [...document.querySelectorAll("button")].filter(node => node.getClientRects().length).map(node => ({ text: node.textContent, disabled: node.disabled })) })).catch(error => ({ error: redact(error) }));
      if (!await page.locator('textarea[name="invitation"]').count()) writeFileSync(join(out, `${label}.html`), redact(await page.content()));
      else writeFileSync(join(out, `${label}-dom-withheld.json`), JSON.stringify({ reason: "The invitation field remains on screen." }));
      await page.screenshot({ path: join(out, `${label}.png`), fullPage: true }).catch(error => { kept.screenshotError = redact(error); });
    }
    writeFileSync(join(out, `${label}.json`), redact(JSON.stringify(kept, null, 2)) + "\n");
    writeFileSync(join(out, "requests.ndjson"), traffic.map(row => JSON.stringify(row)).join("\n") + "\n");
    return kept;
  }
  async function run(initialPage, targets, control = false) {
    const roomUrl = initialPage.url();
    await initialPage.close();
    started = true;
    for (let tab = 0; tab < ROW_PRESS_BOUND.tabs; tab++) {
      page = await context.newPage();
      await debugDraw(page);
      await page.goto(roomUrl);
      for (let press = 0; press < ROW_PRESS_BOUND.perTab; press++) {
        const target = targets[press % targets.length], row = { tab: tab + 1, press: press + 1, total: rows.length + 1, scope: target.scope, item: target.item, started: new Date().toISOString(), pass: false };
        rows.push(row);
        try {
          const link = page.locator(`[data-needs-row="${target.item}"][data-needs-lane="${target.scope}"] a`);
          await link.waitFor({ state: "visible", timeout: 60_000 });
          await link.click({ timeout: 15_000 });
          await page.waitForSelector('[data-action-slot="comment"] form', { timeout: 60_000 });
          await page.getByRole("heading", { name: target.title, exact: false }).waitFor({ timeout: 60_000 });
          await page.locator(`[data-question-answers="${target.ask}"] [data-question-answer="Approve"] button`).waitFor({ timeout: 60_000 });
          if (control) throw Error("TEST capture control: synthetic stop after the first successful row press.");
          row.pass = true; row.finished = new Date().toISOString(); row.url = page.url();
          if (row.total === 1) await capture("first-press");
          process.stdout.write(`ROW-PRESS ${JSON.stringify({ total: row.total, pass: true, scope: row.scope, item: row.item })}\n`);
          await page.locator("a.back").click({ timeout: 30_000 });
        } catch (error) {
          row.error = redact(error); row.finished = new Date().toISOString();
          await capture(control ? "capture-control-stop" : "stopped");
          throw error;
        }
      }
      if (tab === ROW_PRESS_BOUND.tabs - 1) await capture("last-list");
      await page.close();
    }
    return report();
  }
  return { run, capture, report };
}
