import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkout, readConfig, smokePolicy } from "./deploy-config.mjs";

export const BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function serviceOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Supply an HTTPS service origin.");
  return url.origin;
}

async function response(fetcher, url, method, json) {
  const controller = new AbortController(); let timer, reader;
  try {
    return await Promise.race([(async () => {
      const reply = await fetcher(url, { method, headers: { "User-Agent": BROWSER_USER_AGENT },
        redirect: "error", credentials: "omit", signal: controller.signal });
      if (controller.signal.aborted) { void reply.body?.cancel().catch(() => {}); throw new Error("deadline"); }
      let body = null;
      if (json && reply.status === 200) {
        if (!reply.body) throw new Error("Missing JSON response.");
        reader = reply.body.getReader(); const chunks = []; let bytes = 0, pieces = 0;
        for (;;) {
          const chunk = await reader.read();
          if (controller.signal.aborted) throw new Error("deadline");
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (++pieces > 1024 || bytes > 16 * 1024) throw new Error("Response exceeds its bound.");
          chunks.push(chunk.value);
        }
        body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
      } else void reply.body?.cancel().catch(() => {});
      return { status: reply.status, body };
    })(), new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); void reader?.cancel().catch(() => {}); reject(new Error("deadline")); }, 10_000);
    })]);
  } finally {
    clearTimeout(timer); controller.abort();
    if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}

/** Scripted fetch tests prove this boundary, not a Worker deployment. */
export async function smokeWorker({ config, url }, { fetch: fetcher = globalThis.fetch } = {}) {
  const checks = []; let coldStart = false;
  try {
    const origin = serviceOrigin(url), policy = smokePolicy(config);
    if (policy.offer && serviceOrigin(policy.offer.origin) !== origin) throw new Error("Configured offer origin differs from the service.");
    for (let i = 0; i < 3; i++) {
      let reply = await response(fetcher, origin + "/health", "GET", true);
      checks.push({ check: "health", attempt: i + 1, status: reply.status });
      if (i === 0 && reply.status === 503) {
        coldStart = true;
        reply = await response(fetcher, origin + "/health", "GET", true);
        checks.push({ check: "health-cold-start-retry", status: reply.status });
      }
      if (reply.status !== 200) throw new Error("Health did not return 200.");
    }
    const mcp = await response(fetcher, origin + "/mcp", "POST", false);
    checks.push({ check: "mcp", status: mcp.status, expected: policy.mcpStatus });
    if (mcp.status !== policy.mcpStatus) throw new Error("Hosted MCP differs from the tracked policy.");
    const page = await response(fetcher, origin + "/page/", "GET", false);
    checks.push({ check: "page", status: page.status });
    if (page.status !== 200) throw new Error("Page did not return 200.");
    const offer = await response(fetcher, origin + "/v1/demo/creation-offer", "GET", policy.offer !== null);
    checks.push({ check: "creation-offer", status: offer.status, expected: policy.offer ? 200 : 404 });
    if (offer.status !== (policy.offer ? 200 : 404)) throw new Error("Creation offer differs from the tracked policy.");
    if (policy.offer) {
      const actual = offer.body, expected = policy.offer;
      if (!actual || actual.v !== 2 || actual.origin !== expected.origin || actual.definition !== expected.definition
          || !actual.register || Object.keys(actual.register).sort().join() !== "inc,kind,scope"
          || ["kind", "scope", "inc"].some(key => actual.register[key] !== expected.register[key])) throw new Error("Creation offer names another register.");
    }
    return { pass: true, coldStart, checks };
  } catch (error) {
    return { pass: false, coldStart, checks, failure: error instanceof Error ? error.message : "Smoke failed." };
  }
}

export async function deploySmokeMain(argv, { root = checkout, fetch: fetcher = globalThis.fetch, write = line => process.stdout.write(line) } = {}) {
  if (argv.length === 1 && argv[0] === "--help") {
    write("Usage: node scripts/deploy-smoke.mjs <grow|lending|demo|artroom-scope> --url <https://service-origin>\n"); return 0;
  }
  let name, input;
  try {
    if (argv.length !== 3 || argv[1] !== "--url") throw new Error("Invalid smoke arguments.");
    name = argv[0]; input = await readConfig(root, name); serviceOrigin(argv[2]);
  } catch {
    write(JSON.stringify({ pass: false, failure: "Invalid smoke arguments or configuration." }) + "\n"); return 2;
  }
  const result = await smokeWorker({ config: input.config, url: argv[2] }, { fetch: fetcher });
  write(JSON.stringify({ config: name, ...result }) + "\n"); return result.pass ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await deploySmokeMain(process.argv.slice(2));
