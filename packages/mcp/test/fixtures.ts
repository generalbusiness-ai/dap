import type { createServer as ServerFactory } from "node:http";
import { expect } from "vitest";
import type { FactRef, PlatformDefinition, ScopeId } from "@generalbusiness/dap-contract";
import { keyIdOfSecret } from "@generalbusiness/artroom-bytes";
import type { StandIn } from "./support/standin.ts";

// Keep native ownership/Worker implementations out of the Node type graph.
interface ApplicationRoom {
  wireRegister(register: ScopeId): Promise<void>;
  know(scope: ScopeId): void;
}
interface ApplicationAgent {
  key: string;
  config: { repository?: { destination: ScopeId } };
  ok(name: string, args?: Record<string, unknown>): Promise<Record<string, unknown>>;
}

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

/** The common native room setup of the Counter and lending stories. The
 * caller supplies its explicit cohort; activation and role setup stay local. */
export async function claimApplicationRoom(room: ApplicationRoom, rita: ApplicationAgent, definition: PlatformDefinition): Promise<void> {
  const installed = await rita.ok("create", { definition, kind: "install", fields: { host: "artifacts", namespace: "artroom-demo", policy: "keys", "founders": [rita.key] }, idempotencyKey: "install" });
  const register = installed["scope"] as ScopeId;
  await room.wireRegister(register);
  const claimed = await rita.ok("room.create", { target: register, fields: { branch: "main", "founderHandle": "@rita", recoveryKey: keyIdOfSecret(crypto.getRandomValues(new Uint8Array(32))) }, idempotencyKey: "claim" });
  expect(claimed["answer"], JSON.stringify(claimed)).toBe("accepted");
  const w = await rita.ok("wait", { scope: register, entry: (claimed["fact"] as FactRef).seq });
  expect(w["timedOut"], JSON.stringify(w)).toBe(false);
  room.know(rita.config.repository!.destination);
  const seat = await rita.ok("room.seat", { idempotencyKey: "seat" });
  await rita.ok("room.first-key", { fields: { member: (seat["fact"] as FactRef).seq }, idempotencyKey: "first-key" });
}

/** Read the same recipe row in either launch mode, without changing its tool
 * names, order or count. The document, section and activity stay explicit. */
export function activityRecipe(document: string, section: string, activity: string, mode: "default" | "generic"): { tools: string[]; count: number } {
  const at = document.indexOf(section);
  const row = document.slice(at, document.indexOf("\n## ", at + 5)).split("\n").find(line => line.startsWith(activity))!;
  const cell = row.split(" | ")[mode === "default" ? 1 : 2]!;
  return { tools: [...cell.matchAll(/`([a-z][a-z0-9.-]*)`/g)].map(match => match[1]!), count: Number([...cell.matchAll(/: (\d+)/g)].at(-1)![1]) };
}
