/** The runtime reports an HTTP disconnect through request.signal only when
 * enable_request_signal is active. Its response pump need not cancel a JS
 * stream, so retain the existing explicit close work independently. */
export function closeOnDisconnect(signal: AbortSignal, close: () => Promise<void>, retain: (work: Promise<unknown>) => void): void {
  let started = false;
  const disconnected = () => {
    if (started) return;
    started = true;
    retain(Promise.resolve().then(close));
  };
  signal.addEventListener("abort", disconnected, { once: true });
  // The request can disconnect while its native opening is still pending.
  if (signal.aborted) disconnected();
}
