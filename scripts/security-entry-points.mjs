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
const { presentsSignedRead } = load(readSource("packages/scope/src/signed-reads.ts"), ["SCHEME", "presentsSignedRead"], {});
const adminReads = strings(declaration(readSource("packages/scope/src/sessions.ts"), "ADMIN_READS"));
const readGate = name => adminReads.includes(name) ? "admin" : signedReads.includes(name) ? "self-signed" : "session";
const gates = {
  create: "creation", submit: "membership", prepare: "membership", settle: "self-signed", session: "membership", reservationSnapshot: "membership", stageSnapshot: "membership",
  // Census is signed only by the pinned register's standing founding-install
  // signer. It is not an ordinary member/session read; its whole owner is sealed.
  census: "self-signed",
  summary: readGate("summary"), items: readGate("items"), history: readGate("history"), entry: readGate("entry"), outbox: readGate("outbox"), outboxItem: readGate("outbox"), log: readGate("log"), retained: readGate("retained"), queryItems: readGate("query-items"), applicationProjection: "session", stream: "session", credential: "session",
  incidents: readGate("incidents"), requests: readGate("requests"), waiting: readGate("waiting"),
};

export async function scopeRows(text, snapshotDispatches = []) {
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
  const literalPaths = new Set();
  walk(parse(routeText), node => {
    if (node.type !== "BinaryExpression") return;
    for (const [left, right] of [[node.left, node.right], [node.right, node.left]]) {
      if (left.type === "MemberExpression" && left.object?.name === "url" && left.property?.name === "pathname"
        && right.type === "Literal" && typeof right.value === "string" && right.value.startsWith("/")) literalPaths.add(right.value);
    }
  });
  const scope = "sc_" + "a".repeat(52), generic = "__parameter__";
  const result = new Map();
  const dispatched = operation => { throw { dispatch: operation }; };
  const remote = new Proxy({}, { get: (_, name) => () => dispatched(name) });
  const binding = { idFromName: value => value, get: () => remote };
  const globals = {
    URL, Response, ReadableStream, TextDecoder, read: () => new Response(), answered: () => new Response(), MISSING: {}, isObject: value => value !== null && typeof value === "object" && !Array.isArray(value), BODY_BYTES: 1024 * 1024,
    admittedRequestUrl: () => true, credentialInUrl: () => false, presentsSignedRead,
    api: () => remote, json: status => new Response(null, { status }),
    requestQuery: () => true, positionOf: value => /^\d+$/.test(value ?? "") ? Number(value) : null,
    ITEM_QUERY_WIRE_BOUNDS, APPLICATION_PROJECTION_WIRE_BOUNDS,
    isScopeId: value => value === scope, utf8: value => new TextEncoder().encode(value),
    queryResponse: () => new Response(), projectionResponse: () => new Response(),
  };
  const wire = load(readSource("packages/scope/src/item-query-wire.ts"), ["REQUEST_URL_BYTES", "ITEM_QUERY_URL_BYTES", "ITEM_QUERY_ENCODED_CHARS", "queryTarget", "queryUrl", "admittedRequestUrl", "itemQueryWire"], globals);
  const projection = load(readSource("packages/scope/src/applications/projection-wire.ts"), ["path", "applicationProjectionWire"], { ...globals, B: APPLICATION_PROJECTION_WIRE_BOUNDS });
  const { SCOPE_INDEX_NAME } = load(readSource("packages/scope/src/scope-index.ts"), ["SCOPE_INDEX_NAME"], {});
  const censusAddress = "203.0.113.9";
  let censusAdmissions = 0;
  const { scopeIndexCensusRoute } = load(readSource("packages/scope/src/scope-index-census.ts"), ["refused", "statuses", "response", "scopeIndexCensusRoute"], {
    URL, Response, SCOPE_INDEX_NAME,
    // Pin-selector stand-in; the shared setting parser is exercised by its
    // owning admission tests, not this structural route model.
    readRegisterScope: () => ({ kind: "pinned", scope }),
    // Authority stand-in: no signature or founding-install proof is checked
    // here. The actual helper still owns its path, method, query and reply checks.
    requestOf: reader => reader === "Signed census-witness" ? {} : null,
    // Admission stand-in: execute the real helper's call and require its
    // trusted transport argument, not the deliberately different HTTP header.
    // No counter or native authorization policy is exercised here.
    admitServing: async (env, request, address) => {
      assert.equal(env.SCOPE_INDEX, censusIndex);
      assert.deepEqual(request, { kind: "signed-read", reader: "Signed census-witness" });
      assert.equal(address, censusAddress);
      censusAdmissions++;
      return "admitted";
    },
    isScopeId: value => value === scope,
  });
  let censusDispatched = false;
  const censusIndex = {
    idFromName(name) { assert.equal(name, SCOPE_INDEX_NAME); return name; },
    get(name) {
      assert.equal(name, SCOPE_INDEX_NAME);
      // Protected fixed-owner dispatch stand-in. A returned page, rather than
      // a thrown sentinel, passes through the helper's actual response checks.
      return { async list() {
        assert.equal(censusAdmissions, 1, "One census admission precedes protected owner work");
        censusDispatched = true;
        return { ok: true, rows: [], next: null };
      } };
    },
  };
  const { routedRequest } = load(text, ["body", "routedRequest"], { ...globals, scopeIndexCensusRoute, itemQueryWire: wire.itemQueryWire, applicationProjectionWire: projection.applicationProjectionWire });
  const domains = [literals("v"), literals("root"), [undefined, scope], [undefined, ...literals("what")], [undefined, generic, "0", ...literals("which")], [undefined, generic]];
  function* product(at = 0, prefix = []) {
    if (at === domains.length) { yield prefix; return; }
    for (const value of domains[at]) yield* product(at + 1, [...prefix, value]);
  }
  const candidates = [...literalPaths].map(path => ({ path, parts: null }));
  for (const parts of product()) {
    const firstMissing = parts.indexOf(undefined);
    if (firstMissing !== -1 && parts.slice(firstMissing).some(part => part !== undefined)) continue;
    candidates.push({ path: "/" + parts.filter(part => part !== undefined).join("/"), parts });
  }
  // Literal pathname branches and the existing segment classes both execute
  // the real matcher. No fixed route list substitutes for either grammar.
  for (const { path, parts } of candidates) {
    for (const method of methodsIn(routeText)) {
      const query = path.endsWith("/query-items") ? "?q=e30" : path.endsWith("/application-projection") ? "?p=e30" : "";
      // Only this body-dispatched route needs two input classes. Other paths
      // retain their existing single matcher exercise.
      const bodies = method === "POST" && parts?.[3] === "reservation-snapshot" ? ["{}", '{"stage":true}'] : ["{}"];
      for (const requestBody of bodies) {
        const request = new Request(`https://inventory.invalid${path}${query}`, { method, headers: { authorization: parts === null ? "Signed census-witness" : "Session witness", "cf-connecting-ip": "198.51.100.7" }, ...(method === "POST" ? { body: requestBody } : {}) });
        censusDispatched = false;
        censusAdmissions = 0;
        try {
          const response = await routedRequest(request, binding, { SCOPE_INDEX: censusIndex }, censusAddress);
          if (censusDispatched) {
            assert.equal(censusAdmissions, 1, "The census admission seam is invoked exactly once");
            assert.equal(response.status, 200, "The actual census helper returns the dispatched page");
            dispatched("census");
          }
        }
        catch (error) {
          if (!error?.dispatch) throw error;
          const operation = error.dispatch;
          assert.ok(Object.hasOwn(gates, operation), `Unclassified dispatch: ${operation}`);
          // Normalize only unconstrained arguments. Literal matcher choices,
          // such as waiting's two lists, stay distinct.
          const parameters = { items: ["type"], entry: ["seq"], outboxItem: ["duty"], retained: ["kind", "digest"], credential: ["handle"] };
          const normalized = parts === null ? path : "/" + parts.filter(part => part !== undefined).map((part, index) => index === 2 ? ":scope" : index >= 4 && parameters[operation] ? ":" + parameters[operation][index - 4] : part).join("/");
          const route = row(method, normalized, gates[operation]);
          if (operation === "reservationSnapshot" || operation === "stageSnapshot") snapshotDispatches.push({ ...route, operation, body: requestBody });
          if (result.has(route.route)) assert.equal(result.get(route.route).gate, route.gate, "Every body format of one route retains its gate class");
          result.set(route.route, route);
        }
      }
    }
  }
  return [...result.values()];
}

async function hostedInventory(source, settings) {
  const { hostedMcpTools } = load(readSource("packages/mcp/src/hosted-tools.ts"), ["GENERIC_TOOL_NAMES", "HOSTED_TOOL_OMISSIONS", "hostedMcpTools"], {});
  const { readPublicOrigin } = load(readSource("packages/scope/src/public-origin.ts"), ["PUBLIC_ORIGIN_MAX_BYTES", "readPublicOrigin"], { URL });
  const text = declaration(source, "mcpRoute"), agent = "a".repeat(64), paths = strings(text, value => value.startsWith("/") && !value.endsWith("/"));
  const { SCOPE_INDEX_NAME, scopeIndex } = load(readSource("packages/scope/src/scope-index.ts"), ["SCOPE_INDEX_NAME", "scopeIndex"], {});
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
    admittedRequestUrl: () => true, URL, Response, Uint8Array, CONTROL_BODY_BYTES: 64 * 1024, scopeIndex, hostedMcpTools, readPublicOrigin,
    json: status => new Response(null, { status }),
    controlOf: () => ({ request: { action, agent: action === "create" ? null : agent, membership: { scope: "witness" } } }),
  });
  const object = { create: () => marker("control"), control: () => marker("control"), fetch: () => marker("bearer") };
  const namespace = { idFromName: name => name, idFromString: name => name, get: () => object };
  // A known-index stand-in reaches the actual control matcher; this is
  // structural route coverage, not native index or authority evidence.
  const index = {
    idFromName(name) { assert.equal(name, SCOPE_INDEX_NAME); return name; },
    get(name) { assert.equal(name, SCOPE_INDEX_NAME); return { has(scope, kind) {
      assert.equal(scope, "witness"); assert.equal(kind, "membership"); return true;
    } }; },
  };
  const methods = new Set([...methodsIn(text), ...methodsIn(readSource("packages/mcp/src/http.ts"))]);
  for (const path of paths) for (const method of methods) for (action of ["create", "bearer", "retire"]) {
    const request = new Request(`https://inventory.invalid${path}`, { method, headers: { authorization: `Bearer ${agent}.witness` } });
    try { await mcpRoute(request, { ...settings, REGISTRIES: namespace, AGENTS: namespace, SCOPE_INDEX: index }); }
    catch (error) {
      if (!error?.dispatch) throw error;
      const route = row(method, path.replace(agent, ":agent"), error.dispatch);
      result.set(route.route, route);
    }
  }
  return [...result.values()];
}

// Exact reviewed deployment composition; never resolve arbitrary re-exports.
export function roomHttpEntry(file, source = readSource) {
  const hops = file === "apps/room/worker.grow.ts"
    ? [[file, "./worker.ts"], ["apps/room/worker.ts", "./fetch.ts"]]
    : file === "apps/room/worker.ts" ? [[file, "./fetch.ts"]] : null;
  assert.ok(hops, "Unreviewed room Worker entry");
  for (const [owner, target] of hops) {
    const body = parse(source(owner)).body;
    assert.ok(!body.some(node => node.type === "ExportDefaultDeclaration"), `${owner}: unexpected local default handler`);
    const defaults = body.flatMap(node => (node.specifiers ?? []).filter(specifier =>
      (specifier.exported?.name ?? specifier.exported?.value) === "default").map(specifier => ({ node, specifier })));
    assert.equal(defaults.length, 1, `${owner}: exactly one default re-export`);
    const { node, specifier } = defaults[0];
    assert.equal(node.type, "ExportNamedDeclaration");
    assert.equal(node.source?.value, target, `${owner}: reviewed HTTP target`);
    assert.equal(specifier.type, "ExportSpecifier");
    assert.equal(specifier.local?.name ?? specifier.local?.value, "default");
    assert.equal(node.exportKind ?? "value", "value");
    assert.equal(specifier.exportKind ?? "value", "value");
    assert.equal((node.attributes ?? []).length, 0, "No default export attributes");
  }
  return "apps/room/fetch.ts";
}

// Execute the actual finite sandbox HTTP matcher with fixed service stand-ins.
// This witnesses dispatch composition, not native membership or packet trust.
export async function sandboxInventory({ sandboxSource = readSource("apps/sandbox/worker.ts"), gatewaySource = readSource("packages/client/src/application-gateway.ts"), nativeRows } = {}) {
  const scope = "sc_" + "a".repeat(52), digest = "sha256:" + "a".repeat(64);
  const host = { v: 1, screenOrigin: "https://inventory.inguz.space", roomOrigin: "https://inventory.invalid", directory: scope, item: 0, presentation: digest };
  // The actual Worker handler forwards a stream body. Node's Request alone
  // requires duplex for that initializer; workerd's Request does not. Keep
  // this runtime adapter inside the Node inventory witness, not the Worker.
  class InventoryRequest extends Request {
    constructor(input, init) {
      super(input, init?.body instanceof ReadableStream ? { ...init, duplex: "half" } : init);
    }
  }
  const globals = { URL, Response, Request: InventoryRequest, Headers, TextEncoder, TextDecoder, isScopeId: value => value === scope, isDigest: value => value === digest };
  const addresses = load(readSource("packages/client/src/application-route.ts"), ["applicationScreenPath", "readApplicationScreenAddress"], globals);
  const gateway = load(gatewaySource, ["APPLICATION_SCREEN_HOST_PATH", "applicationScreenHostMatches", "applicationGatewayRoute"], { ...globals, ...addresses });
  const support = load(sandboxSource, ["mappings", "refused", "discard"], {
    ...globals, parseStrict: JSON.parse, isRecord: value => value !== null && typeof value === "object" && !Array.isArray(value), readApplicationScreenHost: value => value,
  });
  const defaults = parse(sandboxSource).body.filter(node => node.type === "ExportDefaultDeclaration");
  assert.equal(defaults.length, 1, "One sandbox HTTP entry");
  const expression = sandboxSource.slice(defaults[0].declaration.start, defaults[0].declaration.end);
  const names = { ...globals, ...gateway, ...support, canonicalize: JSON.stringify, within: async (_seconds, run) => run(), LATE: Symbol("late"), REPLY_SECONDS: 10 };
  const handler = Function(...Object.keys(names), `return (${stripTypeScriptTypes("(" + expression + ")")});`)(...Object.values(names));
  const dispatched = kind => new Response(null, { status: 200, headers: { "x-inventory-dispatch": kind } });
  const service = { screenHost: async () => host, screen: async () => dispatched("screen"), native: async () => dispatched("native"), nativeStream: async () => ({ response: dispatched("native"), lifetime: { close: async () => undefined } }) };
  const env = { SCREEN_HOSTS: JSON.stringify([{ host, service: "ROOM" }]), ROOM: service };
  const screenPath = `/applications/${scope}/0/${encodeURIComponent(digest)}/`;
  const candidates = [
    ...(nativeRows ?? await scopeRows(readSource(scopeFile))),
    ...methodRows(methodsIn(declaration(readSource("packages/scope/src/site/route.ts"), "site")), ["/site/*"], "none"),
    ...methodRows(["GET", "HEAD"], ["/applications/*"], "none"),
    row("GET", gateway.APPLICATION_SCREEN_HOST_PATH, "none"),
  ];
  const rows = [];
  for (const candidate of candidates) {
    const [method, path] = candidate.route.split(" ");
    const actual = path === "/applications/*" ? screenPath : path === "/site/*" ? `/site/${scope}/HEAD/index.html`
      : path.replace(":scope", scope).replace(":seq", "0").replace(":type", "item").replace(/:[A-Za-z]+/g, "witness");
    const query = actual.endsWith("/query-items") ? "?q=e30" : actual.endsWith("/application-projection") ? "?p=e30" : "";
    const background = [];
    const response = await handler.fetch(new Request(host.screenOrigin + actual + query, { method, ...(method === "POST" ? { body: "{}" } : {}) }), env, { waitUntil: work => { background.push(work); } });
    await Promise.all(background);
    if ((response.status === 200 && path === gateway.APPLICATION_SCREEN_HOST_PATH) || response.headers.has("x-inventory-dispatch")) rows.push(candidate);
  }
  return rows;
}

/** The production module uses direct declaration exports and an object default.
 * Refuse other export forms rather than silently omit another RPC entrypoint. */
export function workerEntrypoints(source = readSource(scopeFile)) {
  const body = parse(source).body, imports = new Set(), bases = new Set(), classes = new Map(), exported = [];
  for (const node of body) {
    if (node.type === "ImportDeclaration" && node.importKind !== "type") {
      for (const specifier of node.specifiers) {
        if (specifier.importKind === "type") continue;
        imports.add(specifier.local.name);
        if (node.source.value === "cloudflare:workers") {
          assert.equal(specifier.type, "ImportSpecifier", "Worker entry inventory: unsupported platform import");
          if (specifier.imported.name === "WorkerEntrypoint") bases.add(specifier.local.name);
        }
      }
    }
    assert.notEqual(node.type, "ExportAllDeclaration", "Worker entry inventory: unsupported export");
    if (node.type === "ExportDefaultDeclaration") {
      assert.equal(node.declaration.type, "ObjectExpression", "Worker entry inventory: unsupported default export");
    }
    if (node.type === "ExportNamedDeclaration") {
      assert.ok(!node.source && node.declaration && !node.specifiers.length, "Worker entry inventory: unsupported named export");
      assert.ok(["ClassDeclaration", "FunctionDeclaration", "TSInterfaceDeclaration", "TSTypeAliasDeclaration"].includes(node.declaration.type),
        "Worker entry inventory: unsupported exported declaration");
    }
    const declaration = node.declaration ?? node;
    if (declaration.type !== "ClassDeclaration") continue;
    assert.ok(declaration.id?.type === "Identifier" && !classes.has(declaration.id.name), "Worker entry inventory: ambiguous class");
    assert.ok(!declaration.superClass || declaration.superClass.type === "Identifier", "Worker entry inventory: unsupported class base");
    classes.set(declaration.id.name, declaration.superClass?.name ?? null);
    if (node.type === "ExportNamedDeclaration") exported.push(declaration.id.name);
  }
  assert.equal(bases.size, 1, "Worker entry inventory: exact platform base required");
  const inherits = (name, seen = new Set()) => {
    assert.ok(!seen.has(name), "Worker entry inventory: cyclic class base");
    seen.add(name);
    const base = classes.get(name);
    if (base === null) return false;
    if (bases.has(base)) return true;
    if (classes.has(base)) return inherits(base, seen);
    assert.ok(imports.has(base), "Worker entry inventory: unsupported indirect class base");
    return false;
  };
  return exported.filter(name => inherits(name));
}

function sandboxBindings(scopeSource) {
  const config = jsonc("apps/sandbox/wrangler.jsonc");
  assert.equal(config.main, "worker.ts");
  assert.equal(config.name, "dap-application-sandbox");
  assert.equal(config.workers_dev, false);
  assert.deepEqual(config.vars, { SCREEN_HOSTS: "[]" });
  assert.deepEqual(config.routes, [{ pattern: "*.inguz.space/*", zone_name: "inguz.space" }]);
  assert.deepEqual(config.services, [
    { binding: "ROOM", service: "artroom-scope", entrypoint: "ApplicationScreenService" },
    { binding: "GROW", service: "dap-grow", entrypoint: "ApplicationScreenService" },
    { binding: "LENDING", service: "dap-lending", entrypoint: "ApplicationScreenService" },
  ]);
  // No HTTP dispatcher can reach these methods directly. Seal the complete
  // owner in addition to checking its finite named RPC surface.
  const service = parse(scopeSource).body.map(node => node.declaration ?? node).find(node => node.id?.name === "ApplicationScreenService");
  assert.ok(service, "Named sandbox RPC entry");
  assert.deepEqual(service.body.body.map(node => node.key.type === "PrivateIdentifier" ? "#" + node.key.name : node.key.name), ["screenHost", "#gateway", "screen", "nativeStream", "native"]);
  return config.name;
}

function jsonc(file) { return JSON.parse(readSource(file).replace(/^\s*\/\/.*$/gm, "")); }
export async function servedInventory({ scopeSource = readSource(scopeFile), applicationSource = readSource("packages/scope/src/applications/route.ts"), hostedSettings = { MCP_ENABLED: "true" } } = {}) {
  assert.deepEqual(workerEntrypoints(scopeSource), ["ApplicationScreenService"], "Production WorkerEntrypoint exports");
  const scope = await scopeRows(scopeSource);
  const page = readSource("apps/room/page/route.ts"), pagePaths = [];
  walk(parse(declaration(page, "page")), node => { if (node.type === "SwitchCase" && typeof node.test?.value === "string") pagePaths.push(node.test.value); });
  const publicRows = [
    ...methodRows(methodsIn(declaration(readSource("packages/scope/src/health.ts"), "health")), strings(declaration(readSource("packages/scope/src/health.ts"), "health"), value => value.startsWith("/")), "none"),
    ...methodRows(methodsIn(declaration(page, "page")), pagePaths, "none"),
    ...methodRows(methodsIn(declaration(readSource("apps/room/brand/route.ts"), "brand")), prefixesIn(declaration(readSource("apps/room/brand/route.ts"), "isBrand")).map(prefix => prefix + "*"), "none"),
    ...methodRows(methodsIn(declaration(readSource("packages/scope/src/site/route.ts"), "site")), prefixesIn(declaration(readSource("packages/scope/src/site/route.ts"), "isSite")).map(prefix => prefix + "*"), "none"),
    ...methodRows(methodsIn(declaration(applicationSource, "applicationPage")), prefixesIn(declaration(applicationSource, "applicationPage")).map(prefix => prefix + "*"), "none"),
    ...methodRows(methodsIn(declaration(readSource("apps/room/demo-creation.ts"), "demoCreationRoute")), strings(declaration(readSource("apps/room/demo-creation.ts"), "DEMO_OFFER_PATH")), "none"),
  ];
  // The table describes reachability with valid deployment settings. Do not
  // bypass the real hosted policy to reach the finite matcher.
  const hostedRows = await hostedInventory(scopeSource, hostedSettings);
  const result = new Map();
  for (const [file, entry] of [
    ["apps/room/wrangler.jsonc", "worker.ts"],
    ["apps/room/wrangler.demo.jsonc", "worker.ts"],
    ["apps/room/wrangler.grow.jsonc", "worker.grow.ts"],
    ["apps/room/wrangler.lending.jsonc", "worker.ts"],
  ]) {
    const config = jsonc(file), bindings = config.durable_objects.bindings.map(binding => binding.name);
    assert.equal(config.main, entry, `${file}: reviewed Worker entry`);
    assert.equal(roomHttpEntry(`apps/room/${entry}`), "apps/room/fetch.ts");
    result.set(config.name, [...publicRows, ...scope, ...(bindings.includes("REGISTRIES") && bindings.includes("AGENTS") ? hostedRows : [])]);
  }
  result.set(sandboxBindings(scopeSource), await sandboxInventory({ nativeRows: scope }));
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
    const heading = /^## (artroom-scope|dap-demo|dap-grow|dap-lending|dap-grow-simulator|dap-home|dap-application-sandbox)$/.exec(line);
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

/** Review tripwires for complete named runtime coverage, not authority proof.
 * Keep whole classes and every variable initializer. The shell records module
 * execution and binding order without duplicating function or class bodies. */
export function namedSourceSeals(file, names, source = readSource(file)) {
  const refuse = reason => { throw Error(`Named source seals: ${reason}`); };
  if (!Array.isArray(names) || names.some(name => typeof name !== "string" || !name || name === "$module")) refuse("invalid selectors");
  const selected = new Set(names);
  if (selected.size !== names.length) refuse("duplicate selector");
  const clean = node => {
    if (Array.isArray(node)) return node.map(clean);
    if (!node || typeof node !== "object") return node;
    return Object.fromEntries(Object.entries(node).filter(([key]) => !["start", "end", "loc", "raw", "comments", "leadingComments", "trailingComments"].includes(key)).map(([key, value]) => [key, clean(value)]));
  };
  const seal = node => createHash("sha256").update(JSON.stringify(clean(node))).digest("hex");
  let program;
  try { program = parse(source); }
  catch { return refuse("unsupported syntax"); }
  const declarations = new Map();
  const inventory = [];
  const typeOnly = node => node.declare === true || node.type === "TSInterfaceDeclaration" || node.type === "TSTypeAliasDeclaration";
  const add = (node, kind, exported, original) => {
    if (node.id?.type !== "Identifier") refuse("destructured or unsupported declaration");
    const name = node.id.name;
    if (name === "$module") refuse("reserved declaration name");
    if (declarations.has(name)) refuse("duplicate runtime declaration");
    declarations.set(name, original);
    inventory.push({ name, kind, exported });
  };
  const declarationShell = (node, exported) => {
    if (typeOnly(node)) return null;
    if (node.type === "VariableDeclaration") {
      if (!["const", "let", "var"].includes(node.kind) || !node.declarations.length) refuse("unsupported variable declaration");
      for (const part of node.declarations) {
        add(part, node.kind, exported, { type: node.type, kind: node.kind, declaration: part });
      }
      return node;
    }
    if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") {
      if (!node.body) refuse("unsupported declaration");
      add(node, node.type, exported, node);
      return { ...node, body: null };
    }
    return refuse("unsupported declaration");
  };
  const statements = new Set(["ExpressionStatement", "BlockStatement", "EmptyStatement", "DebuggerStatement", "IfStatement", "SwitchStatement", "TryStatement", "ThrowStatement", "ForStatement", "ForInStatement", "ForOfStatement", "WhileStatement", "DoWhileStatement", "LabeledStatement"]);
  const body = [];
  for (const node of program.body) {
    if (typeOnly(node)) continue;
    if (node.type === "ImportDeclaration") {
      if (node.importKind === "type") continue;
      // A value-form import may still evaluate its source with no surviving
      // bindings. Only the explicitly type-only specifiers are omitted.
      body.push({ ...node, specifiers: node.specifiers.filter(part => part.importKind !== "type") });
    } else if (node.type === "ExportNamedDeclaration") {
      if (node.exportKind === "type") continue;
      if (node.declaration) {
        const declaration = declarationShell(node.declaration, "named");
        if (declaration) body.push({ ...node, declaration });
      } else {
        const specifiers = node.specifiers.filter(part => part.exportKind !== "type");
        if (specifiers.length || node.source || !node.specifiers.length) body.push({ ...node, specifiers });
      }
    } else if (node.type === "ExportAllDeclaration") {
      if (node.exportKind !== "type") body.push(node);
    } else if (node.type === "ExportDefaultDeclaration") {
      const value = node.declaration;
      if (typeOnly(value)) continue;
      if ((value.type === "FunctionDeclaration" || value.type === "ClassDeclaration") && value.id) {
        body.push({ ...node, declaration: declarationShell(value, "default") });
      } else if (["FunctionDeclaration", "ClassDeclaration", "Identifier", "Literal", "TemplateLiteral", "MetaProperty"].includes(value.type) || value.type.endsWith("Expression")) {
        // An anonymous default has no selector identity. Its full executable
        // AST, including any body, belongs to the module record.
        body.push(node);
      } else refuse("unsupported default export");
    } else if (["VariableDeclaration", "FunctionDeclaration", "ClassDeclaration"].includes(node.type)) {
      body.push(declarationShell(node, "local"));
    } else if (statements.has(node.type)) {
      body.push(node);
    } else refuse("unsupported top-level statement");
  }
  for (const name of selected) if (!declarations.has(name)) refuse("missing runtime declaration");
  for (const name of declarations.keys()) if (!selected.has(name)) refuse("unselected runtime declaration");
  return Object.fromEntries([
    ["$module", seal({ program: { ...program, body }, declarations: inventory })],
    ...[...declarations].map(([name, node]) => [name, seal(node)]),
  ]);
}
