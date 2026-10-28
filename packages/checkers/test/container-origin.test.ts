import { expect, test, vi } from "vitest";
import { gatewayOrigin, originClient, ORIGIN_CLOSE_MS, serveOrigin } from "../src/container-origin.ts";
import { MemoryRecords } from "../../git/test/support/host.ts";

function gate<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

// Real private Unix HTTP handoff and Gateway; MemoryRecords, the synthetic
// credential and gated upstream are stand-ins. No Git host or container runs.
// Promise gates separate logical stop from actual response retirement.
test("origin close stops admission and waits for late forward/body ownership; an uncooperative owner earns no acknowledgement", async () => {
  const entered = gate(), aborted = gate(), allowReply = gate<Response>(), cancelling = gate(), retired = gate();
  let calls = 0, acknowledged = false, closed = false;
  const records = new MemoryRecords();
  const origin = await gatewayOrigin({ records,
    credential: token => ["authorization", `Bearer ${token}`],
    upstream: async request => {
      calls++; expect(request.headers.get("authorization")).toBe("Bearer TEST-origin-credential");
      request.signal.addEventListener("abort", () => aborted.resolve(), { once: true }); entered.resolve();
      return allowReply.promise;
    },
  }, { attempt: "TEST-origin-close", repository: "https://git.test/repo.git", update: null,
    token: { id: "TEST-origin-token", state: "live", plaintext: "TEST-origin-credential" } });
  const bridge = await serveOrigin(origin, async () => { acknowledged = true; });
  const readAbort = new AbortController(), client = originClient(bridge.socket, readAbort.signal);
  const reading = client.forward(new Request("https://git.test/repo.git/info/refs?service=git-upload-pack")).catch(error => error);
  await entered.promise;
  // Cancel this request before closing the whole origin. This gate requires
  // the per-request ALS signal, rather than only the origin's run abort.
  readAbort.abort();
  await aborted.promise;
  const closing = bridge.close().then(() => { closed = true; });
  expect([acknowledged, closed]).toEqual([false, false]);
  allowReply.resolve(new Response(new ReadableStream<Uint8Array>({ cancel: () => { cancelling.resolve(); return retired.promise; } })));
  await cancelling.promise;
  expect([acknowledged, closed]).toEqual([false, false]);
  retired.resolve(); await closing; await reading;
  expect([acknowledged, closed, calls]).toEqual([true, true, 1]);
  const afterClose = originClient(bridge.socket, new AbortController().signal);
  await expect(afterClose.forward(new Request("https://git.test/repo.git/info/refs?service=git-upload-pack"))).rejects.toThrow();
  expect(calls).toBe(1);

  vi.useFakeTimers();
  const stuckEntered = gate(), sourceClosed = gate(), release = gate<Response>();
  let unknownAcknowledged = false;
  const unknown = await serveOrigin({ repository: "https://git.test/repo.git", forward: async () => { stuckEntered.resolve(); return release.promise; }, close: async () => { sourceClosed.resolve(); } }, async () => { unknownAcknowledged = true; });
  const pending = originClient(unknown.socket, new AbortController().signal).forward(new Request("https://git.test/repo.git/info/refs?service=git-upload-pack")).catch(error => error);
  try {
    await stuckEntered.promise;
    const stopped = unknown.close().then(() => "unexpected acknowledgement", error => error);
    await sourceClosed.promise;
    await vi.advanceTimersByTimeAsync(ORIGIN_CLOSE_MS);
    expect(await stopped).toBeInstanceOf(Error);
    expect(unknownAcknowledged).toBe(false);
  } finally {
    release.resolve(new Response()); await pending;
    await unknown.close().catch(() => undefined); vi.useRealTimers();
  }
});
