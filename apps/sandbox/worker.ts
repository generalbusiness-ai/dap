/** inguz.space's fixed installation gateway. No arbitrary URL, cookie jar,
 * publisher key or signing capability belongs to this Worker. */
import { canonicalize, isRecord, parseStrict, within, LATE } from "@generalbusiness/dap-bytes";
import { REPLY_SECONDS } from "@generalbusiness/dap-client";
import { APPLICATION_SCREEN_HOST_PATH, applicationGatewayRoute, applicationScreenHostMatches, readApplicationScreenHost, type ApplicationScreenHost } from "@generalbusiness/dap-client/application";

interface NativeStreamExchange { response: Response; lifetime: { close(): Promise<void> }; [Symbol.dispose]?(): void }
interface ScreenService {
  screenHost(origin: string): Promise<ApplicationScreenHost | null>;
  screen(origin: string, request: Request): Promise<Response>;
  native(origin: string, request: Request): Promise<Response>;
  nativeStream(origin: string, request: Request): Promise<NativeStreamExchange>;
}
export interface SandboxEnv {
  SCREEN_HOSTS?: string;
  ROOM?: ScreenService; GROW?: ScreenService; LENDING?: ScreenService;
}
interface Mapping { host: ApplicationScreenHost; service: "ROOM" | "GROW" | "LENDING" }
function mappings(setting: string | undefined): readonly Mapping[] {
  try {
    if (!setting || setting.length > 32 * 4096) return [];
    const rows: unknown = parseStrict(setting);
    if (!Array.isArray(rows) || rows.length > 32) return [];
    const result: Mapping[] = rows.map(value => {
      if (!isRecord(value) || Object.keys(value).sort().join() !== "host,service"
        || !["ROOM", "GROW", "LENDING"].includes(String(value["service"]))) throw Error("Invalid screen mapping.");
      return { host: readApplicationScreenHost(value["host"]), service: value["service"] as Mapping["service"] };
    });
    if (new Set(result.map(row => row.host.screenOrigin)).size !== result.length) return [];
    return result;
  } catch { return []; }
}
const refused = (status: number) => new Response(null, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
async function discard(response: Response): Promise<void> { try { await response.body?.cancel(); } catch { /* refusal does not depend on disposal */ } }

export default {
  async fetch(request: Request, env: SandboxEnv, ctx: Pick<ExecutionContext, "waitUntil">): Promise<Response> {
    const url = new URL(request.url);
    if (request.url.length > 128 * 1024 || url.username || url.password || url.hash) return refused(400);
    const mapping = mappings(env.SCREEN_HOSTS).find(row => row.host.screenOrigin === url.origin);
    if (!mapping) return refused(404);
    const { host } = mapping, service = env[mapping.service];
    if (!service) return refused(503);
    const metadata = url.pathname === APPLICATION_SCREEN_HOST_PATH;
    const logical = host.roomOrigin + url.pathname + url.search;
    const screen = applicationScreenHostMatches(host, url.pathname);
    if (metadata ? request.method !== "GET" || !!url.search : screen ? !["GET", "HEAD"].includes(request.method) || !!url.search : !applicationGatewayRoute(host, logical, request.method)) return refused(404);
    // Both ends pin the same descriptor. A misbound service or stale
    // presentation refuses before fetching package bytes or native state.
    let actual;
    try { actual = await within(10, () => service.screenHost(host.screenOrigin)); } catch { return refused(503); }
    if (actual === LATE || canonicalize(actual) !== canonicalize(host)) return refused(503);
    if (metadata) {
      return new Response(canonicalize(host), { headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
    }
    const headers = new Headers();
    for (const name of ["authorization", "content-type", "accept", "if-none-match"]) {
      const value = request.headers.get(name);
      if (value !== null && (!screen || name !== "authorization")) headers.set(name, value);
    }
    // Cloudflare supplies this address at the public edge. It is not a
    // browser credential; preserve existing native per-address limits.
    const address = request.headers.get("cf-connecting-ip");
    if (address !== null && !screen) headers.set("cf-connecting-ip", address);
    // Request RPC serialization includes an explicitly supplied AbortSignal,
    // which workerd cannot transfer. Carry only the HTTP message across this
    // boundary; the local header deadline and returned-body cancellation below
    // retain ownership of the exchange. Do not clone or buffer the body.
    const forwarded = new Request(logical, { method: request.method, headers, body: request.body, redirect: "manual" });
    // Bound waiting for response headers by the maintained transport window.
    // Once headers arrive, do not put a deadline on the native head stream;
    // its existing consumer bounds and body cancellation still own it.
    const stream = !screen && request.method === "GET" && /^\/v1\/scopes\/[^/]+\/stream$/.test(url.pathname);
    let exchange: NativeStreamExchange | undefined, closing: Promise<void> | undefined;
    const close = (): Promise<void> => closing ??= (async () => {
      const owned = exchange;
      if (!owned) return;
      try {
        if (await within(REPLY_SECONDS, () => owned.lifetime.close()) === LATE) throw new Error("Native stream cleanup was not acknowledged within the transport window.");
      } finally {
        // Disposing a stub is not an acknowledgement. It follows the explicit
        // call (or its named timeout) and never substitutes for successful close.
        owned[Symbol.dispose]?.();
      }
    })();
    const pending = stream ? service.nativeStream(host.screenOrigin, forwarded).then(owned => { exchange = owned; return owned.response; })
      : screen ? service.screen(host.screenOrigin, forwarded) : service.native(host.screenOrigin, forwarded);
    let response;
    try { response = await within(REPLY_SECONDS, () => pending); } catch { return refused(503); }
    if (response === LATE) {
      const cleanup = pending.then(async late => { try { await close(); } finally { await discard(late); } }, () => undefined);
      // Own this abandonment path after the 503 is returned. The additional
      // cleanup window is bounded; neither timeout nor disposal is an ack.
      ctx.waitUntil(within(REPLY_SECONDS, () => cleanup).then(() => undefined, () => undefined));
      return refused(503);
    }
    if (response.status >= 300 && response.status < 400 && response.status !== 304) {
      const location = response.headers.get("location");
      if (!screen || !location?.startsWith("/") || !applicationScreenHostMatches(host, location)) { try { await close(); } finally { await discard(response); } return refused(502); }
    }
    const returned = new Headers(response.headers);
    returned.delete("set-cookie"); returned.delete("set-cookie2");
    // No buffering, cloning or speculative retry: browser cancellation owns
    // the same upstream body, including the existing bounded native stream.
    let body = response.body;
    if (exchange && body) {
      const from = body.getReader(); let finished = false, cancelled = false;
      body = new ReadableStream({
        type: "bytes",
        async pull(controller) {
          try {
            const next = await from.read();
            if (finished) return;
            if (!next.done) { controller.enqueue(next.value); return; }
            await close(); finished = true; controller.close();
          } catch (error) {
            if (cancelled) return;
            finished = true;
            try { await close(); } catch (cleanup) { controller.error(cleanup); return; }
            controller.error(error);
          }
        },
        async cancel() {
          cancelled = true; finished = true;
          try { await close(); } finally { await from.cancel(); }
        },
      }, { highWaterMark: 0 });
    } else if (exchange) await close();
    return new Response(body, { status: response.status, headers: returned });
  },
};
