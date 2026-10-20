import { createServer } from "node:http";
import type { StandIn } from "./support/standin.ts";

/** A real Node loopback transport over the SCRIPTED scope service. Each caller
 * owns its peer, hook and close order; this supplies no native scope evidence. */
export function loopbackScopePeer(scope: Pick<StandIn, "fetch">) {
  const server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk;
    const answer = await scope.fetch(`http://scopes${req.url}`, { method: req.method ?? "GET", ...(body ? { body } : {}) });
    res.writeHead(answer.status, { "content-type": "application/json" });
    const reader = (answer.body as unknown as ReadableStream<Uint8Array>).getReader();
    for (let result = await reader.read(); !result.done; result = await reader.read()) res.write(result.value);
    res.end();
  });
  const ready = new Promise<string>(resolve => server.listen(0, "127.0.0.1", () => {
    resolve(`http://127.0.0.1:${(server.address() as { port: number }).port}`);
  }));
  return { server, ready };
}
