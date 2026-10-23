/** Node-safe fixture entry: no Worker or test-framework runtime import. */
import type { createServer as ServerFactory } from "node:http";
import { secretSigner } from "@generalbusiness/dap-client";
import type { StandIn } from "./support/standin.ts";

/** Fresh deterministic TEST keys; the fill and scenario seed remain caller-owned. */
export const fixedSigner = (fill: number) => secretSigner(new Uint8Array(32).fill(fill));
export const scenarioSigner = (seed: string) => secretSigner(Uint8Array.from(seed.match(/../g)!, byte => Number.parseInt(byte, 16)));

/** A real Node loopback transport over the SCRIPTED scope service. Each caller
 * owns its peer, hook and close order; this supplies no native scope evidence. */
export function loopbackScopePeer(scope: Pick<StandIn, "fetch">, createServer: typeof ServerFactory) {
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

/** Read the same recipe row in either launch mode, without changing its tool
 * names, order or count. The document, section and activity stay explicit. */
export function activityRecipe(document: string, section: string, activity: string, mode: "default" | "generic"): { tools: string[]; count: number } {
  const at = document.indexOf(section);
  const row = document.slice(at, document.indexOf("\n## ", at + 5)).split("\n").find(line => line.startsWith(activity))!;
  const cell = row.split(" | ")[mode === "default" ? 1 : 2]!;
  return { tools: [...cell.matchAll(/`([a-z][a-z0-9.-]*)`/g)].map(match => match[1]!), count: Number([...cell.matchAll(/: (\d+)/g)].at(-1)![1]) };
}
