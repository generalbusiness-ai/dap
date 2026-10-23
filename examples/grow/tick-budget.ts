/** One invocation's public HTTP allowance. This keeps no cross-tick state.
 * Exhaustion or an uncertain transport stops every later request. */
import type { ScopeId } from "@generalbusiness/dap-contract";
import type { Fetch } from "@generalbusiness/dap-client";
import type { ByteStream } from "@generalbusiness/dap-bytes";
export const TICK_LIMITS = Object.freeze({ reads: 96, writes: 48, requestBytes: 256 * 1024, replyBytes: 4 * 1024 * 1024, milliseconds: 45_000 });
export interface TickCosts { reads: number; writes: number; requestBytes: number; replyBytes: number }

/** SDK calls also have a five-second per-request deadline in the driver.
 * This budget starts no further read/write after its wall deadline; a late
 * reply is discarded. Neither cancellation nor a thrown error proves that
 * a previously submitted signed request was not accepted remotely. */
export function tickBudget(service: string, scopes: readonly ScopeId[], send: Fetch, clock: () => number = () => performance.now()) {
  const origin = new URL(service);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" || !["https:", "http:"].includes(origin.protocol)) throw new Error("invalid simulator service origin");
  const allowed = new Set(scopes), started = clock(), costs: TickCosts = { reads: 0, writes: 0, requestBytes: 0, replyBytes: 0 };
  if (!Number.isFinite(started)) throw new Error("invalid simulator budget clock");
  let stopped = false;
  const stop = (): void => { stopped = true; };
  const refuse = (): never => { stop(); throw new Error("simulator tick stopped; retain any unresolved exact signed request"); };
  const active = (): void => { if (stopped || !Number.isFinite(clock()) || clock() - started >= TICK_LIMITS.milliseconds || clock() < started) refuse(); };
  const fetch: Fetch = async (url, init) => {
    active();
    const target = new URL(url), match = /^\/v1\/scopes\/(sc_[a-z2-7]+)(?:\/(sessions|settle|acts|preparations|history|query-items|entries\/[0-9]+))?$/.exec(target.pathname);
    if (target.origin !== origin.origin || target.username || target.password || target.hash || !match || !allowed.has(match[1] as ScopeId)) return refuse();
    const method = init?.method ?? "GET", route = match[2];
    if (method !== "GET" && method !== "POST" || method === "GET" && ["sessions", "settle", "acts", "preparations"].includes(route ?? "")
      || method === "POST" && !["sessions", "settle", "acts", "preparations"].includes(route ?? "")) return refuse();
    const write = method === "POST" && (route === "acts" || route === "preparations"), requestBytes = new TextEncoder().encode(init?.body ?? "").length;
    if ((write ? costs.writes >= TICK_LIMITS.writes : costs.reads >= TICK_LIMITS.reads) || costs.requestBytes + requestBytes > TICK_LIMITS.requestBytes) return refuse();
    costs[write ? "writes" : "reads"]++; costs.requestBytes += requestBytes;
    let response: Awaited<ReturnType<Fetch>>;
    // A followed redirect would leave the checked origin and bypass this
    // invocation's request allowance. Preserve the SDK abort signal.
    const request = { ...init, redirect: "manual" as const };
    try { response = await send(url, request); active(); } catch { return refuse(); }
    if (response.status >= 300 && response.status < 400) {
      stop();
      if (response.body) await response.body.getReader().cancel().catch(() => {});
      return refuse();
    }
    const original = response.body;
    const body: ByteStream | null = original === null ? null : { getReader() {
      const reader = original.getReader();
      return {
        async read() {
          try {
            active(); const chunk = await reader.read(); active();
            if (!chunk.done && chunk.value) {
              if (costs.replyBytes + chunk.value.byteLength > TICK_LIMITS.replyBytes) { stop(); await reader.cancel().catch(() => {}); return refuse(); }
              costs.replyBytes += chunk.value.byteLength;
            }
            return chunk;
          } catch { stop(); await reader.cancel().catch(() => {}); return refuse(); }
        },
        cancel: () => reader.cancel(),
      };
    } };
    return { status: response.status, body };
  };
  return { fetch, stop, costs: (): Readonly<TickCosts> => ({ ...costs }), stopped: (): boolean => stopped };
}
