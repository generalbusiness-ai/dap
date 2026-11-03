import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import worker, { type Env } from "../../worker.ts";
import frameworkWorker from "@generalbusiness/dap-scope/worker";
import { OAUTH_HTML, OAUTH_JS, PAGE_HTML, PAGE_JS } from "../assets.ts";

test("the app serves separate consent assets only under valid hosted OAuth policy and forbids framing", async () => {
  const get = (path: string, settings: Record<string, string> = {}, method = "GET") => worker.fetch(new Request(`https://scopes.test${path}`, { method }), { ...env, SCOPES: env.PLATFORM, MCP_ENABLED: "true", ...settings } as Env);
  const html = await get("/oauth/authorize");
  expect(html.status).toBe(200); expect(await html.text()).toBe(OAUTH_HTML);
  expect(html.headers.get("content-security-policy")?.split("; ")).toEqual(expect.arrayContaining(["default-src 'none'", "script-src 'self'", "connect-src 'self'", "frame-ancestors 'none'", "form-action 'none'"]));
  expect(html.headers.get("referrer-policy")).toBe("no-referrer"); expect(html.headers.get("cache-control")).toBe("no-store");
  const script = await get("/oauth/consent.js"); expect(script.status).toBe(200); expect(await script.text()).toBe(OAUTH_JS);
  const head = await get("/oauth/authorize", {}, "HEAD"); expect(head.status).toBe(200); expect(await head.text()).toBe("");
  expect((await get("/oauth/authorize", {}, "POST")).status).toBe(405);
  for (const settings of [{ MCP_ENABLED: "false" }, { OAUTH_REDIRECT_URIS: "{}" }, { OAUTH_CLIENT_METADATA_ORIGINS: "{}" }]) for (const path of ["/oauth/authorize", "/oauth/consent.js"]) expect((await get(path, settings)).status).toBe(404);
});

// Invariant: the deployed Worker's one entry serves the room's page at `/page/`, its HTML and its one script, from the module that
// the page's build writes, each under a policy that runs this origin's scripts only; any other path under `/page/` is not found,
// a write is refused, and a path outside it still reaches the scope routes. The static page reads no scope; the entry still receives its explicit deployment namespace and index.
test("the Worker serves the page at /page/: its HTML and script under a same-origin script policy; /page redirects; another file is not-found; a POST is refused; /v1 is not the page's", async () => {
  const get = (path: string, method = "GET") => worker.fetch(new Request(`https://scopes.test${path}`, { method }), { SCOPES: env.PLATFORM, SCOPE_INDEX: env.SCOPE_INDEX } as Env);

  // The framework remains reusable: only the app entry serves its static page.
  const generic = await frameworkWorker.fetch(new Request("https://scopes.test/page/"), { SCOPES: env.PLATFORM, SCOPE_INDEX: env.SCOPE_INDEX } as Env);
  expect([generic.status, await generic.json()]).toEqual([404, { error: "not-found" }]);

  const html = await get("/page/");
  expect([html.status, html.headers.get("content-type"), await html.text()]).toEqual([200, "text/html; charset=utf-8", PAGE_HTML]);
  expect(html.headers.get("cache-control")).toBe("no-cache");
  expect(PAGE_HTML).toContain('data-demo-start="false"');
  const enabled = await worker.fetch(new Request("https://scopes.test/page/"), { SCOPES: env.PLATFORM, SCOPE_INDEX: env.SCOPE_INDEX, DEMO_START_CONFIG: "TEST configured capability" } as Env);
  expect(await enabled.text()).toBe(PAGE_HTML.replace('data-demo-start="false"', 'data-demo-start="true"'));
  expect(PAGE_HTML).toContain('<script type="module" src="page.js"></script>');
  const policy = html.headers.get("content-security-policy") ?? "";
  expect(policy.split("; ")).toEqual(expect.arrayContaining(["default-src 'none'", "script-src 'self'", "connect-src 'self'", "font-src 'self'", "frame-ancestors 'none'"]));
  expect(policy).not.toContain("unsafe-eval");
  expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);

  const js = await get("/page/page.js");
  expect([js.status, js.headers.get("content-type"), js.headers.get("x-content-type-options"), (await js.text()).length]).toEqual([200, "text/javascript; charset=utf-8", "nosniff", PAGE_JS.length]);

  for (const path of ["/page/?token=value", "/page/page.js?secret=value"]) {
    const refused = await get(path);
    expect(refused.status).toBe(400);
    expect(await refused.json()).toEqual({ error: "credential-in-url" });
  }
  const bare = await get("/page");
  expect([bare.status, bare.headers.get("location")]).toEqual([301, "/page/"]);
  expect((await get("/page/keys.json")).status).toBe(404);
  const posted = await get("/page/", "POST");
  expect([posted.status, posted.headers.get("allow")]).toEqual([405, "GET, HEAD"]);
  // A scope route is no page: its answer is the routes' own JSON refusal for a name that is no scope ID.
  const routed = await get("/v1/scopes/not-a-scope");
  expect([routed.status, routed.headers.get("content-type"), await routed.text()]).toEqual([404, "application/json", JSON.stringify({ ok: false, reason: "not-found" })]);
});
