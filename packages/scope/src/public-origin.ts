/** Operator-supplied public identity, independent of proxy transport headers. */
export interface PublicOriginBindings { PUBLIC_ORIGIN?: unknown }
export const PUBLIC_ORIGIN_MAX_BYTES = 2048;

/** Unset retains the request origin, including internal HTTP. An explicit
 * value follows invitation service policy and must already be an exact origin.
 * Origin serialization is ASCII, so the length bound also bounds UTF8 bytes. */
export function readPublicOrigin(settings: PublicOriginBindings, requestUrl: string): string | null {
  try {
    const raw = settings.PUBLIC_ORIGIN;
    if (raw === undefined) return new URL(requestUrl).origin;
    if (typeof raw !== "string" || raw.length > PUBLIC_ORIGIN_MAX_BYTES || !/^[\x21-\x7e]+$/.test(raw)) return null;
    const url = new URL(raw);
    if (raw !== url.origin || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    const loopback = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname) || url.hostname === "[::1]";
    return url.protocol === "https:" || url.protocol === "http:" && loopback ? url.origin : null;
  } catch { return null; }
}
