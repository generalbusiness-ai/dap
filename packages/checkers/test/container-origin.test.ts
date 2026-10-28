import { expect, test, vi } from "vitest";
import { originClient, ORIGIN_CLOSE_MS, serveOrigin } from "../src/container-origin.ts";

function gate<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

// Real private Unix HTTP handoff; upstream and its delayed cancellation are
// explicit stand-ins. Promise gates separate logical stop from retirement.
test("origin close stops admission and waits for late forward/body ownership; an uncooperative owner earns no acknowledgement", async () => {
  const entered = gate(), aborted = gate(), allowReply = gate<Response>(), cancelling = gate(), retired = gate();
  let calls = 0, acknowledged = false, closed = false;
  const bridge = await serveOrigin({ repository: "https://git.test/repo.git", forward: async request => {
    calls++; request.signal.addEventListener("abort", () => aborted.resolve(), { once: true }); entered.resolve();
    return allowReply.promise;
  }, close: async () => undefined }, async () => { acknowledged = true; });
  const client = originClient(bridge.socket, new AbortController().signal);
  const reading = client.forward(new Request("https://git.test/repo.git/info/refs?service=git-upload-pack")).catch(error => error);
  await entered.promise;
  const closing = bridge.close().then(() => { closed = true; });
  await aborted.promise;
  expect([acknowledged, closed]).toEqual([false, false]);
  allowReply.resolve(new Response(new ReadableStream<Uint8Array>({ cancel: () => { cancelling.resolve(); return retired.promise; } })));
  await cancelling.promise;
  expect([acknowledged, closed]).toEqual([false, false]);
  retired.resolve(); await closing; await reading;
  expect([acknowledged, closed, calls]).toEqual([true, true, 1]);
  await expect(client.forward(new Request("https://git.test/repo.git/info/refs?service=git-upload-pack"))).rejects.toThrow();
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
