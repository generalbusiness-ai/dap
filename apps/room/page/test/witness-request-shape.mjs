// NF-9 (request a75440d3): the hosted witness keeps the shape of each request the page made, so a failed run names the
// request that stopped it. A shape holds the method, the host, the path with each identifier replaced by a fixed mark,
// the query key names and the outcome. It holds no query value, header, body, token or invitation.

const MOST = 400;
const SEGMENT = /^[A-Za-z0-9._-]{1,24}$/;
const FAILURE = /^net::[A-Z_]{1,48}$/;

/** One path segment: a scope id, a digest or any long or unusual segment becomes a fixed mark. */
function segmentShape(segment) {
  let text;
  try { text = decodeURIComponent(segment); } catch { return "<id>"; }
  if (text === "") return "";
  if (/^sc_[a-z0-9]+$/.test(text)) return "<scope>";
  if (/^sha256:[0-9a-f]+$/.test(text)) return "<digest>";
  return SEGMENT.test(text) ? text : "<id>";
}

/** The shape of one request, or null for a request that is not http or https. */
export function requestShape(method, url, outcome) {
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const keys = [...new Set([...parsed.searchParams.keys()].map(key => SEGMENT.test(key) ? key : "<key>"))].sort();
  return {
    method: /^[A-Z]{1,8}$/.test(method) ? method : "OTHER",
    host: parsed.hostname.split(".").map(label => label.length > 24 ? "<id>" : label).join("."),
    path: parsed.pathname.split("/").map(segmentShape).join("/"),
    query: keys,
    outcome: typeof outcome === "number" && Number.isInteger(outcome) ? outcome : FAILURE.test(String(outcome)) ? outcome : "failed",
  };
}

/** Collects request shapes from a Playwright browser context. `lines()` gives one line per request, oldest first. */
export function recordRequests(context) {
  const shapes = [];
  let dropped = 0;
  const keep = shape => { if (!shape) return; if (shapes.length < MOST) shapes.push(shape); else dropped++; };
  context.on("requestfinished", request => {
    void request.response().then(response => keep(requestShape(request.method(), request.url(), response?.status() ?? "failed")), () => keep(requestShape(request.method(), request.url(), "failed")));
  });
  context.on("requestfailed", request => keep(requestShape(request.method(), request.url(), request.failure()?.errorText ?? "failed")));
  return {
    lines: () => [...shapes.map(s => `${s.method} ${s.host}${s.path}${s.query.length ? "?" + s.query.join("&") : ""} -> ${s.outcome}`),
      ...(dropped ? [`(${dropped} later requests not kept)`] : [])],
  };
}
