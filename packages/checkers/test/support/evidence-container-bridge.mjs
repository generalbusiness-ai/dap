/** Finite TEST-only physical Runner port. Native admission and signing stay
 * in the scope test; no proof is manufactured by this loopback bridge. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { containerRunner } from "@generalbusiness/dap-checkers/node";
import { evidenceBindingDigest, readEvidenceBinding } from "@generalbusiness/dap-bytes";
import { RunIdentityRefusal } from "../../src/index.ts";

const REQUEST_BYTES = 24 * 1024 * 1024, OBJECT_BYTES = 16 * 1024 * 1024;
const RESPONSE_BYTES = 64 * 1024, CLOSE_MS = 240_000;

function decoded(text) {
  let bytes = 0, objects = 0;
  return JSON.parse(text, (_key, value) => {
    if (value && typeof value === "object" && Object.keys(value).length === 1 && Object.hasOwn(value, "$bytes")) {
      const raw = value.$bytes;
      if (typeof raw !== "string" || raw.length > 4 * Math.ceil(OBJECT_BYTES / 3) || !/^[A-Za-z0-9_-]*$/.test(raw)) throw Error("TEST byte encoding refused");
      bytes += Math.floor(raw.length * 3 / 4);
      if (++objects > 4096 || bytes > OBJECT_BYTES) throw Error("TEST combined object bound");
      const copy = Buffer.from(raw, "base64url");
      if (copy.toString("base64url") !== raw) throw Error("TEST byte encoding refused");
      return new Uint8Array(copy);
    }
    return value;
  });
}

export async function evidenceContainerBridge(settings, root) {
  const options = { root, command: settings.command, execCommand: settings.execCommand };
  const runner = containerRunner(options), nonce = randomBytes(32).toString("hex");
  const pending = new Set(), runs = new Set(), receipts = [];
  let closing = false, activeRun = false, requests = 0, closed;
  const server = createServer((request, response) => {
    const work = (async () => {
      if (closing || ++requests > 64 || request.method !== "POST" || !["/run", "/find"].includes(request.url) || request.headers["x-evidence-test"] !== nonce) {
        response.writeHead(403); response.end(); return;
      }
      const chunks = []; let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > REQUEST_BYTES || chunks.length >= 4096) throw Error("TEST request bound");
        chunks.push(chunk);
      }
      const input = decoded(Buffer.concat(chunks, size).toString("utf8"));
      if (closing) throw Error("TEST bridge closed");
      let result;
      if (request.url === "/run") {
        const job = input?.job, config = input?.configuration, binding = readEvidenceBinding(job?.evidence);
        if (!input || Object.keys(input).sort().join() !== "configuration,job,run"
          || !job || Object.keys(job).sort().join() !== "base,commit,configuration,deadline,evidence,fact,lane,name,overlay,tree"
          || !job.overlay || Object.hasOwn(job, "snapshot") || !binding || binding.source !== "room"
          || typeof input.run !== "string" || !/^[A-Za-z0-9_.-]{1,128}$/.test(input.run)
          || config?.image !== settings.image || JSON.stringify(config.environment) !== JSON.stringify(settings.environment)
          || !Number.isFinite(config.limits?.seconds) || config.limits.seconds <= 0 || config.limits.seconds > 60
          || !Number.isSafeInteger(config.limits?.outputBytes) || config.limits.outputBytes <= 0 || config.limits.outputBytes > 65536
          || runs.has(input.run) || runs.size >= 2 || activeRun) throw Error("TEST immutable room run refused");
        runs.add(input.run); activeRun = true;
        try {
          result = await runner.run(input);
          // A fresh factory observes this same terminal; it never re-executes.
          assert.deepEqual(await containerRunner(options).find(input.run, job), result);
          receipts.push({ run: input.run, job: job.fact, tree: job.tree, configuration: job.configuration,
            bindingDigest: evidenceBindingDigest(binding), source: binding.source, stage: binding.stage, report: result });
        } finally { activeRun = false; }
      } else {
        if (!input || typeof input !== "object" || typeof input.run !== "string" || Object.keys(input).some(key => !["run", "expectedJob"].includes(key))
          || !runs.has(input.run) || input.expectedJob !== undefined && (!input.expectedJob || typeof input.expectedJob !== "object")) throw Error("TEST find refused");
        result = await runner.find(input.run, input.expectedJob);
      }
      const output = JSON.stringify(result);
      if (Buffer.byteLength(output) > RESPONSE_BYTES) throw Error("TEST response bound");
      if (!response.destroyed) { response.writeHead(200, { "content-type": "application/json" }); response.end(output); }
    })().catch(error => {
      if (!response.destroyed) {
        if (error instanceof RunIdentityRefusal) { response.writeHead(409, { "content-type": "application/json" }); response.end('{"error":"run-identity-refused"}'); }
        else { response.writeHead(500); response.end("TEST physical runner failed"); }
      }
    });
    pending.add(work); void work.finally(() => pending.delete(work));
  });
  server.headersTimeout = 10_000; server.requestTimeout = 30_000; server.keepAliveTimeout = 1000;
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return {
    settings: { url: `http://127.0.0.1:${server.address().port}/`, nonce, image: settings.image, environment: settings.environment }, receipts,
    close() {
      return closed ??= (async () => {
        closing = true; server.closeAllConnections();
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        let timer;
        try {
          await Promise.race([Promise.allSettled([...pending]), new Promise((_, reject) => { timer = setTimeout(() => reject(Error("TEST runner cleanup remains unknown")), CLOSE_MS); })]);
        } finally { clearTimeout(timer); }
      })();
    },
  };
}
