/**
 * The caller's network address. On Cloudflare the platform sets
 * cf-connecting-ip. A celld host sets CELLD_PROXY_TOKEN, and its Caddy proxy
 * sends that token beside the address; there the header counts only with the
 * matching token, so a local process that calls celld directly has no address.
 */
export const PROXY_TOKEN_HEADER = "x-dap-proxy-token";

export interface CallerAddressSettings { CELLD_PROXY_TOKEN?: string }

export function callerAddress(request: Request, env: CallerAddressSettings): string | null {
  const address = request.headers.get("cf-connecting-ip");
  const expected = env.CELLD_PROXY_TOKEN;
  if (expected === undefined) return address;
  const given = request.headers.get(PROXY_TOKEN_HEADER) ?? "";
  if (expected.length === 0 || given.length !== expected.length) return null;
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0 ? address : null;
}

/**
 * The request that every later reader sees, including Durable Objects that
 * receive it: on a celld host, cf-connecting-ip holds only an admitted
 * address and the token header is gone. Elsewhere the request is unchanged.
 */
export function proxiedRequest(request: Request, env: CallerAddressSettings): Request {
  if (env.CELLD_PROXY_TOKEN === undefined) return request;
  const address = callerAddress(request, env), headers = new Headers(request.headers);
  headers.delete(PROXY_TOKEN_HEADER);
  if (address === null) headers.delete("cf-connecting-ip");
  return new Request(request, { headers });
}
