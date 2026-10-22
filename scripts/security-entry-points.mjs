/** Structural inventory, not native authorization evidence. Execute the real
 * scope matcher with stand-ins at its object boundary. Other front doors are
 * read from their equality, prefix, switch and method matchers. Source seals
 * fail closed when a matcher or gate changes outside this finite model. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "rolldown/parseAst";
import { ITEM_QUERY_WIRE_BOUNDS, APPLICATION_PROJECTION_WIRE_BOUNDS } from "@generalbusiness/dap-contract";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readSource = file => readFileSync(resolve(root, file), "utf8");
const scopeFile = "packages/scope/src/worker.ts";
const parse = text => parseAst(text, { lang: "ts" });
function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (["start", "end", "loc"].includes(key)) continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visit);
    else if (value && typeof value === "object") walk(value, visit);
  }
}
function declaration(text, name) {
  for (let node of parse(text).body) {
    node = node.declaration ?? node;
    if (node.id?.name === name) return text.slice(node.start, node.end);
    for (const part of node.declarations ?? []) if (part.id.name === name) return `const ${text.slice(part.start, part.end)};`;
  }
  throw Error(`No declaration: ${name}`);
}
function load(text, names, globals) {
  const code = names.map(name => declaration(text, name)).join("\n");
  return Function(...Object.keys(globals), `${stripTypeScriptTypes(code)}\nreturn {${names.join(",")}};`)(...Object.values(globals));
}
function strings(text, predicate = () => true) {
  const values = new Set();
  walk(parse(text), node => { if (node.type === "Literal" && typeof node.value === "string" && predicate(node.value)) values.add(node.value); });
  return [...values];
}
function methodsIn(text) {
  const methods = new Set();
  walk(parse(text), node => {
    if (node.type !== "BinaryExpression") return;
    for (const [left, right] of [[node.left, node.right], [node.right, node.left]]) {
      if ((left.type === "MemberExpression" && left.object?.name === "request" && left.property?.name === "method") || (left.type === "Identifier" && left.name === "method")) {
        for (const method of strings(right.type === "Literal" ? JSON.stringify(right.value) : text.slice(right.start, right.end), value => /^(GET|HEAD|POST|DELETE|PUT|PATCH|OPTIONS)$/.test(value))) methods.add(method);
      }
    }
  });
  return [...methods];
}
function prefixesIn(text) {
  const prefixes = new Set();
  walk(parse(text), node => {
    if (node.type === "CallExpression" && node.callee.property?.name === "startsWith" && typeof node.arguments[0]?.value === "string" && node.arguments[0].value.startsWith("/")) prefixes.add(node.arguments[0].value);
  });
  return [...prefixes];
}
const row = (method, path, gate) => ({ route: `${method} ${path}`, gate });
const methodRows = (methods, paths, gate) => methods.flatMap(method => paths.map(path => row(method, path, gate)));

// Gate classes concern the effective read or operation, rather than the
// Authorization header's spelling. A signature alone certifies any fresh key.
const signedReads = strings(declaration(readSource("packages/scope/src/signed-reads.ts"), "SIGNED_READS"));
const adminReads = strings(declaration(readSource("packages/scope/src/sessions.ts"), "ADMIN_READS"));
const readGate = name => adminReads.includes(name) ? "admin" : signedReads.includes(name) ? "self-signed" : "session";
const gates = {
  create: "self-signed", submit: "membership", prepare: "membership", settle: "self-signed", session: "membership", reservationSnapshot: "membership",
  summary: readGate("summary"), items: readGate("items"), history: readGate("history"), entry: readGate("entry"), outbox: readGate("outbox"), outboxItem: readGate("outbox"), log: readGate("log"), retained: readGate("retained"), queryItems: readGate("query-items"), applicationProjection: "session", stream: "session", credential: "session",
  incidents: readGate("incidents"), requests: readGate("requests"), waiting: readGate("waiting"),
};

async function scopeRows(text) {
  const routeText = declaration(text, "routedRequest");
  // All literal equivalence classes of the current segment matcher, plus
  // absent and unconstrained values. Source seals below guard this grammar.
  const literals = name => {
    const out = new Set();
    walk(parse(routeText), node => {
      if (node.type !== "BinaryExpression") return;
      for (const [left, right] of [[node.left, node.right], [node.right, node.left]]) {
        if (left.type === "Identifier" && left.name === name && right.type === "Literal" && typeof right.value === "string") out.add(right.value);
      }
    });
    return [...out];
  };
  const scope = "sc_" + "a".repeat(52), generic = "__parameter__";
  const result = new Map();
  const dispatched = operation => { throw { dispatch: operation }; };
  const remote = new Proxy({}, { get: (_, name) => () => dispatched(name) });
  const binding = { idFromName: value => value, get: () => remote };
  const globals = {
    URL, Response, ReadableStream, TextDecoder, read: () => new Response(), answered: () => new Response(), MISSING: {}, isObject: value => value !== null && typeof value === "object" && !Array.isArray(value), BODY_BYTES: 1024 * 1024,
    admittedRequestUrl: () => true, credentialInUrl: () => false,
    api: () => remote, json: status => new Response(null, { status }),
    requestQuery: () => true, positionOf: value => /^\d+$/.test(value ?? "") ? Number(value) : null,
    ITEM_QUERY_WIRE_BOUNDS, APPLICATION_PROJECTION_WIRE_BOUNDS,
    isScopeId: value => value === scope, utf8: value => new TextEncoder().encode(value),
    queryResponse: () => new Response(), projectionResponse: () => new Response(),
  };
  const wire = load(readSource("packages/scope/src/item-query-wire.ts"), ["REQUEST_URL_BYTES", "ITEM_QUERY_URL_BYTES", "ITEM_QUERY_ENCODED_CHARS", "queryTarget", "queryUrl", "admittedRequestUrl", "itemQueryWire"], globals);
  const projection = load(readSource("packages/scope/src/applications/projection-wire.ts"), ["path", "applicationProjectionWire"], { ...globals, B: APPLICATION_PROJECTION_WIRE_BOUNDS });
  const { routedRequest } = load(text, ["body", "routedRequest"], { ...globals, itemQueryWire: wire.itemQueryWire, applicationProjectionWire: projection.applicationProjectionWire });
  const domains = [literals("v"), literals("root"), [undefined, scope], [undefined, ...literals("what")], [undefined, generic, "0", ...literals("which")], [undefined, generic]];
  function* product(at = 0, prefix = []) {
    if (at === domains.length) { yield prefix; return; }
    for (const value of domains[at]) yield* product(at + 1, [...prefix, value]);
  }
  for (const parts of product()) {
    const firstMissing = parts.indexOf(undefined);
    if (firstMissing !== -1 && parts.slice(firstMissing).some(part => part !== undefined)) continue;
    const path = "/" + parts.filter(part => part !== undefined).join("/");
    for (const method of methodsIn(routeText)) {
      const query = path.endsWith("/query-items") ? "?q=e30" : path.endsWith("/application-projection") ? "?p=e30" : "";
      const request = new Request(`https://inventory.invalid${path}${query}`, { method, headers: { authorization: "Session witness" }, ...(method === "POST" ? { body: "{}" } : {}) });
      try { await routedRequest(request, binding); }
      catch (error) {
        if (!error?.dispatch) throw error;
        const operation = error.dispatch;
        assert.ok(Object.hasOwn(gates, operation), `Unclassified dispatch: ${operation}`);
        // Normalize only unconstrained arguments. Literal matcher choices,
        // such as waiting's two lists, stay distinct.
        const parameters = { items: ["type"], entry: ["seq"], outboxItem: ["duty"], retained: ["kind", "digest"], credential: ["handle"] };
        const normalized = parts.filter(part => part !== undefined).map((part, index) => index === 2 ? ":scope" : index >= 4 && parameters[operation] ? ":" + parameters[operation][index - 4] : part).join("/");
        const route = row(method, "/" + normalized, gates[operation]);
        result.set(route.route, route);
      }
    }
  }
  return [...result.values()];
}

async function hostedInventory(source) {
  const text = declaration(source, "mcpRoute"), agent = "a".repeat(64), paths = strings(text, value => value.startsWith("/") && !value.endsWith("/"));
  walk(parse(text), node => {
    if (node.type !== "VariableDeclarator" || node.id.name !== "agentPath") return;
    const pattern = node.init.callee.object.regex.pattern;
    // The current finite route regex. An unsupported grammar refuses the
    // inventory, rather than silently omitting a branch.
    assert.ok(pattern.startsWith("^") && pattern.endsWith("$"), "Anchored hosted matcher");
    for (const suffix of [false, true]) {
      const path = pattern.slice(1, -1).replace("([0-9a-f]{64})", agent).replace(/\(([^()]*)\)\?/, (_, value) => suffix ? value : "").replaceAll("\\/", "/");
      assert.ok(!/[()\[\]?$^]/.test(path), "Unsupported hosted route regex"); paths.push(path);
    }
  });
  const result = new Map(), marker = dispatch => { throw { dispatch }; };
  let action;
  const { mcpRoute } = load(source, ["mcpRoute", "boundedBytes"], {
    admittedRequestUrl: () => true, URL, Response, Uint8Array, CONTROL_BODY_BYTES: 64 * 1024,
    json: status => new Response(null, { status }),
    controlOf: () => ({ request: { action, agent: action === "create" ? null : agent, membership: { scope: "witness" } } }),
  });
  const object = { create: () => marker("control"), control: () => marker("control"), fetch: () => marker("bearer") };
  const namespace = { idFromName: name => name, idFromString: name => name, get: () => object };
  const methods = new Set([...methodsIn(text), ...methodsIn(readSource("packages/mcp/src/http.ts"))]);
  for (const path of paths) for (const method of methods) for (action of ["create", "bearer", "retire"]) {
    const request = new Request(`https://inventory.invalid${path}`, { method, headers: { authorization: `Bearer ${agent}.witness` } });
    try { await mcpRoute(request, { REGISTRIES: namespace, AGENTS: namespace }); }
    catch (error) {
      if (!error?.dispatch) throw error;
      const route = row(method, path.replace(agent, ":agent"), error.dispatch);
      result.set(route.route, route);
    }
  }
  return [...result.values()];
}

function jsonc(file) { return JSON.parse(readSource(file).replace(/^\s*\/\/.*$/gm, "")); }
export async function servedInventory({ scopeSource = readSource(scopeFile) } = {}) {
  const scope = await scopeRows(scopeSource);
  const page = readSource("apps/room/page/route.ts"), pagePaths = [];
  walk(parse(declaration(page, "page")), node => { if (node.type === "SwitchCase" && typeof node.test?.value === "string") pagePaths.push(node.test.value); });
  const publicRows = [
    ...methodRows(methodsIn(declaration(readSource("packages/scope/src/health.ts"), "health")), strings(declaration(readSource("packages/scope/src/health.ts"), "health"), value => value.startsWith("/")), "none"),
    ...methodRows(methodsIn(declaration(page, "page")), pagePaths, "none"),
    ...methodRows(methodsIn(declaration(readSource("apps/room/brand/route.ts"), "brand")), prefixesIn(declaration(readSource("apps/room/brand/route.ts"), "isBrand")).map(prefix => prefix + "*"), "none"),
    ...methodRows(methodsIn(declaration(readSource("packages/scope/src/site/route.ts"), "site")), prefixesIn(declaration(readSource("packages/scope/src/site/route.ts"), "isSite")).map(prefix => prefix + "*"), "none"),
    ...methodRows(methodsIn(declaration(readSource("packages/scope/src/applications/route.ts"), "screenResponse")), prefixesIn(declaration(readSource("packages/scope/src/applications/route.ts"), "screenResponse")).map(prefix => prefix + "*"), "none"),
    ...methodRows(methodsIn(declaration(readSource("apps/room/demo-creation.ts"), "demoCreationRoute")), strings(declaration(readSource("apps/room/demo-creation.ts"), "DEMO_OFFER_PATH")), "none"),
  ];
  const hostedRows = await hostedInventory(scopeSource);
  const result = new Map();
  for (const file of ["apps/room/wrangler.jsonc", "apps/room/wrangler.grow.jsonc", "apps/room/wrangler.lending.jsonc"]) {
    const config = jsonc(file), bindings = config.durable_objects.bindings.map(binding => binding.name);
    assert.equal(config.main, "worker.ts");
    result.set(config.name, [...publicRows, ...scope, ...(bindings.includes("REGISTRIES") && bindings.includes("AGENTS") ? hostedRows : [])]);
  }
  const simulator = jsonc("examples/grow/wrangler.jsonc");
  assert.equal(simulator.main, "simulator-worker.ts");
  const hostSource = declaration(readSource("examples/grow/simulator-host.ts"), "simulatorHost");
  const fetchers = [];
  walk(parse(hostSource), node => { if (node.type === "Property" && node.key.name === "fetch" && node.method) fetchers.push(node); });
  assert.equal(fetchers.length, 1, "One simulator fetch");
  const fetcher = fetchers[0];
  assert.equal(fetcher.value.params.length, 0, "Simulator fetch cannot inspect caller input");
  assert.equal(fetcher.value.body.body.length, 1, "Simulator fetch is an unconditional response");
  assert.equal(fetcher.value.body.body[0].type, "ReturnStatement");
  const handler = Function(`return (${stripTypeScriptTypes("({" + hostSource.slice(fetcher.start, fetcher.end) + "})")});`)();
  assert.equal((await handler.fetch()).status, 404, "Simulator HTTP refuses every route");
  result.set(simulator.name, [row("*", "/*", "none")]);
  const home = jsonc("homepage/wrangler.jsonc");
  assert.equal(home.main, undefined);
  assert.deepEqual(home.assets, { directory: "./assets", html_handling: "auto-trailing-slash", not_found_handling: "404-page" });
  result.set(home.name, methodRows(["GET", "HEAD"], ["/*"], "none")); // Platform static-assets adapter, no in-tree fetch.
  return result;
}

export function documentedInventory(text) {
  const tables = new Map();
  let table;
  for (const line of text.split("\n")) {
    const heading = /^## (artroom-scope|dap-grow|dap-lending|dap-grow-simulator|dap-home)$/.exec(line);
    if (heading) { table = []; assert.ok(!tables.has(heading[1]), "Duplicate Worker table"); tables.set(heading[1], table); }
    if (!line.startsWith("| `")) continue;
    const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
    assert.equal(cells.length, 6, "Inventory columns");
    const [route, gate] = cells.map(cell => cell.replace(/^`|`$/g, ""));
    assert.ok(table, "Route without Worker");
    assert.ok(cells.every(Boolean), `Empty inventory cell: ${route}`);
    const match = /^([A-Z*, ]+) (\/.*)$/.exec(route);
    assert.ok(match, `Invalid route cell: ${route}`);
    for (const method of match[1].split(", ")) table.push({ route: `${method} ${match[2]}`, gate });
  }
  return tables;
}
export function assertInventory(actual, documented) {
  assert.deepEqual([...documented.keys()].sort(), [...actual.keys()].sort(), "Worker tables");
  for (const [worker, routes] of actual) {
    const expected = documented.get(worker);
    assert.equal(new Set(expected.map(row => row.route)).size, expected.length, `${worker}: duplicate route`);
    assert.deepEqual(expected.toSorted((a, b) => a.route.localeCompare(b.route)), routes.toSorted((a, b) => a.route.localeCompare(b.route)), `${worker}: route/method/gate bijection`);
  }
}

// These are source-review tripwires, not a second route catalog. Updating a
// seal requires checking the matcher partition or the operation's gate.
// Syntax trees omit comments and locations, so prose edits do not change them.
export function sourceSeal(file) {
  const clean = node => {
    if (Array.isArray(node)) return node.map(clean);
    if (!node || typeof node !== "object") return node;
    return Object.fromEntries(Object.entries(node).filter(([key]) => !["start", "end", "loc", "raw", "comments", "leadingComments", "trailingComments"].includes(key)).map(([key, value]) => [key, clean(value)]));
  };
  return createHash("sha256").update(JSON.stringify(clean(parse(readSource(file))))).digest("hex");
}
