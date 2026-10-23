/** SCRIPTED HTTP bytes and local HTTP redirect peers. No native authority,
 * refusal or cancellation of a remotely accepted act is claimed. */
import { createServer, type Server } from "node:http";
import { expect, test } from "vitest";
import { scopeIdOf } from "@generalbusiness/dap-bytes";
import { tickBudget, TICK_LIMITS } from "./tick-budget.ts";
const scope = scopeIdOf({ v: 1, kind: "lane", creator: null, cause: `sha256:${"1".repeat(64)}`, ordinal: 0, definition: `sha256:${"2".repeat(64)}` });

test("an actual HTTP redirect cannot forward a signed request outside the allowed origin, and stops later requests", async () => {
  let firstRequests = 0, forwardedRequests = 0;
  const listen = async (server: Server) => {
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address();
    if (!address || typeof address === "string") throw Error("A local TCP address is required.");
    return `http://127.0.0.1:${address.port}`;
  };
  const close = (server: Server) => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  const target = createServer((_request, response) => { forwardedRequests++; response.end("TEST unexpected forwarded request"); });
  let origin: Server | undefined;
  try {
    const redirect = await listen(target);
    origin = createServer((_request, response) => { firstRequests++; response.writeHead(307, { location: redirect + "/forwarded" }); response.end(); });
    const service = await listen(origin), budget = tickBudget(service, [scope], globalThis.fetch);
    let refused = false;
    try { await budget.fetch(`${service}/v1/scopes/${scope}/acts`, { method: "POST", body: "TEST signed envelope" }); } catch { refused = true; }
    expect({ refused, firstRequests, forwardedRequests, stopped: budget.stopped() }).toEqual({ refused: true, firstRequests: 1, forwardedRequests: 0, stopped: true });
    await expect(budget.fetch(`${service}/v1/scopes/${scope}/acts`, { method: "POST", body: "TEST later envelope" })).rejects.toThrow("tick stopped");
    expect(firstRequests).toBe(1); expect(forwardedRequests).toBe(0);
  } finally { if (origin?.listening) await close(origin); if (target.listening) await close(target); }
});

test("a reply exceeding the tick allowance is cancelled before retention and fences every later mutation; a late invocation sends nothing", async () => {
  let sent = 0, cancelled = 0, now = 0;
  let release!: () => void, observed!: () => void;
  const cancellation = new Promise<void>(resolve => { release = resolve; });
  const cancellationStarted = new Promise<void>(resolve => { observed = resolve; });
  const budget = tickBudget("https://scopes.test", [scope], async () => {
    sent++;
    return { status: 200, body: { getReader: () => ({ read: async () => ({ done: false, value: new Uint8Array(TICK_LIMITS.replyBytes + 1) }), cancel: async () => { cancelled++; observed(); await cancellation; } }) } };
  }, () => now);
  const reply = await budget.fetch(`https://scopes.test/v1/scopes/${scope}/history`);
  const reading = reply.body!.getReader().read().then(() => false, () => true);
  await cancellationStarted;
  // Cancellation may be slow or ignored. The local fence must already hold.
  let fenced = false;
  try { await budget.fetch(`https://scopes.test/v1/scopes/${scope}/acts`, { method: "POST", body: "{}" }); } catch { fenced = true; }
  release(); expect(await reading).toBe(true); expect(fenced).toBe(true);
  expect(sent).toBe(1);
  expect(cancelled).toBeGreaterThan(0); expect(budget.costs()).toEqual({ reads: 1, writes: 0, requestBytes: 0, replyBytes: 0 });
  await expect(budget.fetch(`https://scopes.test/v1/scopes/${scope}/acts`, { method: "POST", body: "{}" })).rejects.toThrow("tick stopped");
  expect(sent).toBe(1);
  const expired = tickBudget("https://scopes.test", [scope], async () => { sent++; throw Error("TEST must not send"); }, () => now);
  now = TICK_LIMITS.milliseconds;
  await expect(expired.fetch(`https://scopes.test/v1/scopes/${scope}/preparations`, { method: "POST", body: "{}" })).rejects.toThrow("tick stopped");
  expect(sent).toBe(1);
});
