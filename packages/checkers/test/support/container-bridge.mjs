/** Finite TEST-only loopback bridge; production code remains Runner.run/find. */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { containerRunner } from "@generalbusiness/dap-checkers/node";
import { RunIdentityRefusal } from "../../src/index.ts";

export async function containerBridge(settings, root) {
  const runner = containerRunner({ root, command: settings.command, execCommand: settings.execCommand });
  const nonce = randomBytes(32).toString("hex"), pending = new Set(), runs = new Set(), receipts = [];
  let closing = false;
  const server = createServer((request, response) => {
    const work = (async () => {
      if (closing || request.method !== "POST" || !["/run", "/find"].includes(request.url) || request.headers["x-j3-test"] !== nonce) { response.writeHead(403); response.end(); return; }
      const chunks = []; let size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > 2 * 1024 * 1024) throw Error("TEST request bound"); chunks.push(chunk); }
      const input = JSON.parse(Buffer.concat(chunks).toString("utf8"), (_key, value) => {
        if (value && typeof value === "object" && Object.keys(value).length === 1 && typeof value.$bytes === "string") {
          if (!/^[A-Za-z0-9_-]*$/.test(value.$bytes)) throw Error("TEST byte encoding");
          const bytes = Buffer.from(value.$bytes, "base64url"); if (bytes.toString("base64url") !== value.$bytes) throw Error("TEST byte encoding"); return new Uint8Array(bytes);
        }
        return value;
      });
      let result;
      if (request.url === "/run") {
        if (!input || Object.keys(input).sort().join() !== "configuration,job,run" || !input.job?.snapshot || input.configuration?.image !== settings.image || JSON.stringify(input.configuration.environment) !== JSON.stringify(settings.environment) || input.configuration.limits?.seconds > 60 || input.configuration.limits?.outputBytes > 65536 || runs.has(input.run) || runs.size >= 2 || pending.size > 1) throw Error("TEST run envelope refused");
        runs.add(input.run);
        result = await runner.run(input);
        receipts.push({ run: input.run, job: input.job.fact, tree: input.job.tree, configuration: input.job.configuration, report: result });
      } else {
        if (!input || typeof input !== "object" || typeof input.run !== "string" || Object.keys(input).some(key => !["run", "expectedJob"].includes(key)) || !runs.has(input.run) || input.expectedJob !== undefined && (!input.expectedJob || typeof input.expectedJob !== "object")) throw Error("TEST find refused");
        result = await runner.find(input.run, input.expectedJob);
      }
      const output = JSON.stringify(result); if (Buffer.byteLength(output) > 65536) throw Error("TEST response bound");
      if (!response.destroyed) { response.writeHead(200, { "content-type": "application/json" }); response.end(output); }
    })().catch(error => { if (!response.destroyed) { if (error instanceof RunIdentityRefusal) { response.writeHead(409, { "content-type": "application/json" }); response.end('{"error":"run-identity-refused"}'); } else { response.writeHead(500); response.end("TEST bridge failed"); } } });
    pending.add(work); work.finally(() => pending.delete(work));
  });
  server.headersTimeout = 10_000; server.requestTimeout = 10_000; server.keepAliveTimeout = 1000;
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return {
    settings: { url: `http://127.0.0.1:${server.address().port}/`, nonce, image: settings.image, environment: settings.environment },
    receipts,
    async close() { closing = true; server.closeAllConnections(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await Promise.allSettled([...pending]); },
  };
}
