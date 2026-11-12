import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkout, hostedNames, readConfig, sandboxScreenOrigins, smokePolicy } from "./deploy-config.mjs";

export const BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function serviceOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Supply an HTTPS service origin.");
  return url.origin;
}

/** Reads a bounded JSON body only when the status equals jsonStatus. */
async function response(fetcher, url, method, jsonStatus = null) {
  const controller = new AbortController(); let timer, reader;
  try {
    return await Promise.race([(async () => {
      const reply = await fetcher(url, { method, headers: { "User-Agent": BROWSER_USER_AGENT },
        redirect: "error", credentials: "omit", signal: controller.signal });
      if (controller.signal.aborted) { void reply.body?.cancel().catch(() => {}); throw new Error("deadline"); }
      let body = null;
      if (reply.status === jsonStatus) {
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
      let reply = await response(fetcher, origin + "/health", "GET", 200);
      checks.push({ check: "health", attempt: i + 1, status: reply.status });
      if (i === 0 && reply.status === 503) {
        coldStart = true;
        reply = await response(fetcher, origin + "/health", "GET", 200);
        checks.push({ check: "health-cold-start-retry", status: reply.status });
      }
      if (reply.status !== 200) throw new Error("Health did not return 200.");
    }
    const mcp = await response(fetcher, origin + "/mcp", "POST");
    checks.push({ check: "mcp", status: mcp.status, expected: policy.mcpStatus });
    if (mcp.status !== policy.mcpStatus) throw new Error("Hosted MCP differs from the tracked policy.");
    const page = await response(fetcher, origin + "/page/", "GET");
    checks.push({ check: "page", status: page.status });
    if (page.status !== 200) throw new Error("Page did not return 200.");
    const offer = await response(fetcher, origin + "/v1/demo/creation-offer", "GET", policy.offer ? 200 : null);
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

/** The sandbox Worker has no health route. Smoke reads what it serves:
 * 404 for every unmapped origin or unrouted path, and the room's own 403
 * for an unauthenticated native read through a mapped origin. */
export async function smokeSandbox({ config, host, room }, { fetch: fetcher = globalThis.fetch } = {}) {
  const checks = [];
  try {
    const origin = serviceOrigin(host), mapped = sandboxScreenOrigins(config);
    if (!mapped.includes(origin)) throw new Error("The host is not a tracked sandbox mapping.");
    if (typeof room !== "string" || !/^sc_[a-z2-7]{52}$/.test(room)) throw new Error("Supply a room scope.");
    // A fixed label under the mapped host's parent domain, never a tracked mapping.
    const unmapped = `https://unmapped-smoke.${new URL(origin).hostname.split(".").slice(1).join(".")}`;
    if (mapped.includes(unmapped)) throw new Error("The unmapped smoke host is a tracked mapping.");
    for (const [check, url] of [["mapped-root", origin + "/"], ["mapped-site", origin + "/site/x"], ["mapped-applications", origin + "/applications/x"]]) {
      const reply = await response(fetcher, url, "GET");
      checks.push({ check, status: reply.status, expected: 404 });
      if (reply.status !== 404) throw new Error("A mapped host served an unrouted path.");
    }
    const native = await response(fetcher, `${origin}/v1/scopes/${room}`, "GET", 403);
    checks.push({ check: "mapped-native-read", status: native.status, expected: 403 });
    const body = native.body;
    if (native.status !== 403 || !body || Object.keys(body).sort().join() !== "ok,reason" || body.ok !== false || body.reason !== "forbidden") {
      throw new Error("An unauthenticated native read did not reach the room's refusal.");
    }
    const other = await response(fetcher, unmapped + "/", "GET");
    checks.push({ check: "unmapped-root", status: other.status, expected: 404 });
    if (other.status !== 404) throw new Error("An unmapped host did not answer 404.");
    return { pass: true, checks };
  } catch (error) {
    return { pass: false, checks, failure: error instanceof Error ? error.message : "Smoke failed." };
  }
}

export async function deploySmokeMain(argv, { root = checkout, fetch: fetcher = globalThis.fetch, write = line => process.stdout.write(line) } = {}) {
  if (argv.length === 1 && argv[0] === "--help") {
    write(`Usage: node scripts/deploy-smoke.mjs <${hostedNames.filter(name => name !== "sandbox").join("|")}> --url <https://service-origin>\n`
      + "       node scripts/deploy-smoke.mjs sandbox --host <https://mapped-screen-origin> --room <scope>\n"); return 0;
  }
  let name, input;
  if (argv[0] === "sandbox") {
    try {
      if (argv.length !== 5 || argv[1] !== "--host" || argv[3] !== "--room") throw new Error("Invalid smoke arguments.");
      input = await readConfig(root, "sandbox"); serviceOrigin(argv[2]);
    } catch {
      write(JSON.stringify({ pass: false, failure: "Invalid smoke arguments or configuration." }) + "\n"); return 2;
    }
    const result = await smokeSandbox({ config: input.config, host: argv[2], room: argv[4] }, { fetch: fetcher });
    write(JSON.stringify({ config: "sandbox", ...result }) + "\n"); return result.pass ? 0 : 1;
  }
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
