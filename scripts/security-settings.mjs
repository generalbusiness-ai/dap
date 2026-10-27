/** Static setting-read coverage. Never import or evaluate a Worker. */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "rolldown/parseAst";

const parse = (source, file) => parseAst(source, { lang: "ts" }, file);
const upper = name => /^[A-Z][A-Z0-9_]*$/.test(name);
const unwrap = node => ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "ParenthesizedExpression", "ChainExpression"].includes(node?.type) ? unwrap(node.expression) : node;
const prop = node => node?.type === "Identifier" ? node.name : node?.type === "Literal" ? node.value : null;
const annotation = parameter => (parameter?.type === "AssignmentPattern" ? parameter.left : parameter)?.typeAnnotation;
function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (["start", "end", "loc", "typeAnnotation"].includes(key)) continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visit);
    else if (value && typeof value === "object") walk(value, visit);
  }
}
function fail(file, node, reason) { throw Error(`${file}:${node?.start ?? 0}: unsupported setting syntax: ${reason}`); }
function names(pattern) {
  if (!pattern) return [];
  if (pattern.type === "Identifier") return [pattern.name];
  if (pattern.type === "AssignmentPattern") return names(pattern.left);
  if (pattern.type === "ArrayPattern") return pattern.elements.flatMap(names);
  if (pattern.type === "RestElement") return names(pattern.argument);
  if (pattern.type === "ObjectPattern") return pattern.properties.flatMap(p => names(p.value ?? p.argument));
  return [];
}
const refs = node => {
  const result = new Set();
  // This follows names only, not conditional/mapped types or field semantics.
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === "TSTypeReference" && value.typeName?.type === "Identifier") result.add(value.typeName.name);
    if (["TSExpressionWithTypeArguments", "TSInterfaceHeritage"].includes(value.type) && value.expression?.type === "Identifier") result.add(value.expression.name);
    for (const child of Object.values(value)) if (Array.isArray(child)) child.forEach(visit); else if (child && typeof child === "object") visit(child);
  }
  visit(node); return result;
};
function uppercaseShape(node) {
  if (!node || typeof node !== "object") return false;
  if (["TSTypeLiteral", "TSInterfaceBody"].includes(node.type)) {
    const members = node.members ?? node.body ?? [];
    return members.some(m => upper(prop(m.key) ?? "")) && members.every(m => m.type === "TSPropertySignature" && upper(prop(m.key) ?? ""));
  }
  return node.type === "TSTypeAnnotation" && uppercaseShape(node.typeAnnotation);
}

/** Finite real sandbox selector: both the declared domain and its validator. */
export function sandboxSettingKeys(source, file = "apps/sandbox/worker.ts") {
  const tree = parse(source, file), domains = [], validators = [], selectors = [];
  walk(tree, node => {
    if (node.type === "TSInterfaceDeclaration" && node.id.name === "Mapping") {
      const service = node.body.body.find(m => prop(m.key) === "service");
      const union = service?.typeAnnotation?.typeAnnotation;
      if (union?.type !== "TSUnionType") fail(file, node, "Mapping.service must be a literal union");
      domains.push(union.types.map(t => t.type === "TSLiteralType" ? t.literal.value : null));
    }
    if (node.type === "CallExpression" && node.callee?.type === "MemberExpression" && prop(node.callee.property) === "includes" && node.callee.object.type === "ArrayExpression") {
      const values = node.callee.object.elements.map(e => e?.type === "Literal" ? e.value : null);
      if (values.some(v => ["ROOM", "GROW", "LENDING"].includes(v))) validators.push(values);
    }
    if (node.type === "MemberExpression" && node.computed && node.object?.name === "env") selectors.push(node);
  });
  const expected = ["GROW", "LENDING", "ROOM"];
  const same = values => JSON.stringify([...values].sort()) === JSON.stringify(expected);
  if (domains.length !== 1 || validators.length !== 1 || !same(domains[0]) || !same(validators[0]) || selectors.length !== 1) fail(file, tree, "sandbox finite domain changed");
  const selector = selectors[0];
  if (selector.property.type !== "MemberExpression" || selector.property.computed || selector.property.object.name !== "mapping" || prop(selector.property.property) !== "service") fail(file, selector, "unrecognized sandbox selector");
  // Exact finite validator/construction: changed syntax needs Source review.
  const mapping = tree.body.find(n => n.type === "FunctionDeclaration" && n.id.name === "mappings");
  const expectedMapping = "function mappings(setting: string | undefined): readonly Mapping[] {\n  try {\n    if (!setting || setting.length > 32 * 4096) return [];\n    const rows: unknown = parseStrict(setting);\n    if (!Array.isArray(rows) || rows.length > 32) return [];\n    const result: Mapping[] = rows.map(value => {\n      if (!isRecord(value) || Object.keys(value).sort().join() !== \"host,service\"\n        || ![\"ROOM\", \"GROW\", \"LENDING\"].includes(String(value[\"service\"]))) throw Error(\"Invalid screen mapping.\");\n      return { host: readApplicationScreenHost(value[\"host\"]), service: value[\"service\"] as Mapping[\"service\"] };\n    });\n    if (new Set(result.map(row => row.host.screenOrigin)).size !== result.length) return [];\n    return result;\n  } catch { return []; }\n}";
  if (!mapping || source.slice(mapping.start, mapping.end) !== expectedMapping) fail(file, mapping, "sandbox checked construction changed");
  return expected;
}

/** Lexical immutable aliases only. Unsupported Env uses refuse, never vanish. */
export function environmentReads(source, file, { environmentTypes = new Set(), forwarding = new Map(), sandbox = false } = {}) {
  const tree = parse(source, file), reads = [];
  // This exception needs the unexposed global constructor, not alias/dataflow
  // inference. Permit Object only as a direct member receiver or nonvalue key.
  // Any other Object use or globalThis use closes this read form filewide.
  let globalObject = true;
  const objectReceivers = new Set(), propertyNames = new Set();
  walk(tree, node => {
    if (node.type === "MemberExpression" && node.object.type === "Identifier" && node.object.name === "Object") objectReceivers.add(node.object);
    if (["MemberExpression", "Property", "MethodDefinition", "PropertyDefinition"].includes(node.type) && !node.computed && !node.shorthand) {
      const key = node.type === "MemberExpression" ? node.property : node.key;
      if (key?.type === "Identifier") propertyNames.add(key);
    }
  });
  walk(tree, node => {
    if (node.type === "Identifier" && (node.name === "globalThis"
      || node.name === "Object" && !objectReceivers.has(node) && !propertyNames.has(node))) globalObject = false;
    const bound = node.type === "VariableDeclarator" ? names(node.id)
      : node.type === "ImportDeclaration" ? node.specifiers.map(part => part.local.name)
      : ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type) ? [...names(node.id), ...node.params.flatMap(names)]
      : ["ClassDeclaration", "ClassExpression", "TSImportEqualsDeclaration", "TSEnumDeclaration", "TSModuleDeclaration"].includes(node.type) ? names(node.id)
      : node.type === "CatchClause" ? names(node.param) : [];
    let target = ["AssignmentExpression", "UpdateExpression"].includes(node.type) ? node.left ?? node.argument
      : node.type === "UnaryExpression" && node.operator === "delete" ? node.argument : null;
    if (names(target).includes("Object")) globalObject = false;
    target = unwrap(target);
    while (target?.type === "MemberExpression") target = unwrap(target.object);
    if (bound.includes("Object") || target?.type === "Identifier" && target.name === "Object") globalObject = false;
  });
  // One existing protected adapter. This is a Source tripwire, not return-flow inference.
  const metricReturns = new Set(), metricCalls = new Set();
  if (file === "packages/scope/src/object.ts") {
    const method = "protected metricEnvironment(): MetricEnvironment { return this.env as MetricEnvironment; }";
    const start = source.indexOf(method), references = [], consumers = [], returns = [];
    walk(tree, n => {
      if (n.type === "MemberExpression" && n.object.type === "ThisExpression" && prop(n.property) === "metricEnvironment") references.push(n);
      if (n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === "operationContext") {
        const first = n.arguments[0];
        if (first?.type === "CallExpression" && first.arguments.length === 0 && first.callee.type === "MemberExpression" && first.callee.object.type === "ThisExpression" && prop(first.callee.property) === "metricEnvironment") consumers.push(first);
      }
      if (n.type === "ReturnStatement" && n.start >= start && n.end <= start + method.length) returns.push(n);
    });
    if (start < 0 || source.indexOf(method, start + 1) !== -1 || references.length !== 1 || consumers.length !== 1 || references[0] !== consumers[0].callee || returns.length !== 1 || !environmentTypes.has("MetricEnvironment") || !forwarding.get("operationContext")?.has(0)) fail(file, tree, "metric environment adapter or its sole typed consumer changed");
    metricReturns.add(returns[0].argument.start); metricCalls.add(consumers[0].start);
  }
  const superPositions = Symbol("platform environment constructor");
  const platformBases = new Set(tree.body.filter(n => n.type === "ImportDeclaration" && n.source.value === "cloudflare:workers")
    .flatMap(n => n.specifiers.filter(p => p.type === "ImportSpecifier" && ["DurableObject", "WorkerEntrypoint"].includes(prop(p.imported))).map(p => p.local.name)));
  const typed = annotation => uppercaseShape(annotation) || [...refs(annotation)].some(name => environmentTypes.has(name));
  const localCallable = parameters => {
    const positions = new Set();
    parameters.forEach((parameter, index) => {
      if (typed(annotation(parameter))) {
        if (parameter.type === "RestElement") fail(file, parameter, "variadic environment parameter");
        positions.add(index);
      }
    });
    return { positions };
  };
  const record = (name, node) => {
    if (!upper(name)) fail(file, node, "nonliteral or noncanonical environment key");
    reads.push({ name, file, start: node.start, end: node.end });
  };
  const isEnv = (node, scope) => {
    node = unwrap(node);
    if (node?.type === "CallExpression" && metricCalls.has(node.start)) return true;
    if (node?.type === "Identifier") return scope.get(node.name) === true;
    if (node?.type === "MemberExpression" && !node.computed && node.object.type === "ThisExpression" && prop(node.property) === "env") return true;
    return node?.type === "ObjectExpression" && node.properties.some(p => p.type === "SpreadElement" && isEnv(p.argument, scope));
  };
  function bind(pattern, root, scope) {
    for (const name of names(pattern)) scope.set(name, false);
    if (!root) return;
    if (pattern.type === "Identifier") { scope.set(pattern.name, true); return; }
    if (pattern.type !== "ObjectPattern") fail(file, pattern, "environment parameter pattern");
    for (const p of pattern.properties) {
      if (p.type === "RestElement" || p.computed && p.key.type !== "Literal") fail(file, p, "environment rest/dynamic destructuring");
      record(prop(p.key), p);
    }
  }
  function visit(node, scope, parent, key) {
    if (!node || typeof node !== "object") return;
    if (["ClassDeclaration", "ClassExpression"].includes(node.type)) {
      const local = new Map(scope);
      local.set(superPositions, node.superClass?.type === "Identifier" && platformBases.has(node.superClass.name) && !scope.has(node.superClass.name) ? new Set([1]) : new Set());
      visit(node.body, local, node, "body"); return;
    }
    if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)) {
      const local = new Map(scope);
      for (const parameter of node.params) {
        const pattern = parameter.type === "AssignmentPattern" ? parameter.left : parameter;
        const root = typed(annotation(parameter));
        if (names(pattern).includes("env") && !root) fail(file, parameter, "unrecognized env parameter type");
        bind(pattern, root, local);
      }
      visit(node.body, local, node, "body"); return;
    }
    if (node.type === "BlockStatement") {
      const local = new Map(scope);
      for (const statement of node.body) {
        const declaration = statement.declaration ?? statement;
        if (declaration.type === "VariableDeclaration") for (const item of declaration.declarations) for (const name of names(item.id)) local.set(name, false);
        if (declaration.type === "FunctionDeclaration" && declaration.id) local.set(declaration.id.name, localCallable(declaration.params));
        if (declaration.type === "ClassDeclaration" && declaration.id) local.set(declaration.id.name, false);
      }
      for (const statement of node.body) visit(statement, local, node, "body"); return;
    }
    if (["ForStatement", "ForInStatement", "ForOfStatement"].includes(node.type)) {
      // A loop has its own lexical scope; bindings cannot erase outer Env roots.
      const local = new Map(scope);
      for (const [part, value] of Object.entries(node)) {
        if (["start", "end", "loc"].includes(part)) continue;
        if (Array.isArray(value)) for (const child of value) visit(child, local, node, part);
        else if (value && typeof value === "object") visit(value, local, node, part);
      }
      return;
    }
    if (node.type === "VariableDeclaration") {
      for (const item of node.declarations) {
        const root = isEnv(item.init, scope);
        if (root && node.kind !== "const") fail(file, item, "mutable environment alias");
        visit(item.init, scope, item, "init"); bind(item.id, root, scope);
      }
      return;
    }
    if (node.type === "MemberExpression" && isEnv(node.object, scope)) {
      if (node.computed && node.property.type !== "Literal") {
        if (!sandbox) fail(file, node, "dynamic environment lookup");
        for (const name of sandboxSettingKeys(source, file)) record(name, node);
      } else record(prop(node.property), node);
      return;
    }
    if (node.type === "AssignmentExpression" && isEnv(node.left, scope)) fail(file, node, "environment reassignment");
    if (["AssignmentExpression", "UpdateExpression"].includes(node.type)) {
      const target = node.left ?? node.argument;
      if (names(target).some(name => scope.has(name) ? scope.get(name)?.positions : forwarding.has(name))) fail(file, node, "callable identity reassignment");
    }
    if (node.type === "SpreadElement" && isEnv(node.argument, scope) && parent?.type !== "ObjectExpression") fail(file, node, "environment argument spread");
    if (isEnv(node, scope)) {
      const allowed = parent?.type === "MemberExpression" && key === "object"
        || parent?.type === "VariableDeclarator" && key === "init"
        || parent?.type === "SpreadElement"
        || parent?.type === "ReturnStatement" && metricReturns.has(node.start)
        || ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "ParenthesizedExpression", "ChainExpression"].includes(parent?.type)
        || parent?.type === "UnaryExpression" && ["typeof", "!"].includes(parent.operator)
        ;
      if (!allowed && !(node.type === "ObjectExpression" && parent?.type === "VariableDeclarator")) {
        if (parent?.type === "CallExpression" || parent?.type === "NewExpression") {
          const callee = unwrap(parent.callee), name = callee?.name ?? (callee?.type === "MemberExpression" ? prop(callee.property) : null);
          const position = parent.arguments.indexOf(node);
          if (node.type === "Identifier" && scope.get(node.name) === true
            && parent.type === "CallExpression" && !parent.optional && globalObject
            && callee?.type === "MemberExpression" && !callee.computed && !callee.optional
            && callee.object.type === "Identifier" && callee.object.name === "Object"
            && prop(callee.property) === "hasOwn" && position === 0 && parent.arguments.length === 2
            && parent.arguments[1].type === "Literal" && typeof parent.arguments[1].value === "string") {
            record(parent.arguments[1].value, parent); return;
          }
          const accepted = callee?.type === "Super" ? scope.get(superPositions)?.has(position)
            : callee?.type === "Identifier" && (scope.has(name) ? scope.get(name)?.positions?.has(position) : forwarding.get(name)?.has(position));
          if (!accepted) fail(file, node, `unresolved environment forwarding to ${name ?? "super/expression"} argument ${position}`);
          if (parent.arguments.some(argument => argument.type === "SpreadElement")) fail(file, parent, "spread arguments in environment forwarding");
        } else fail(file, node, "escaped environment object");
      }
    }
    for (const [childKey, value] of Object.entries(node)) {
      if (["start", "end", "loc", "typeAnnotation"].includes(childKey) || typeof node.type === "string" && node.type.startsWith("TS") && !["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression"].includes(node.type)) continue;
      if (Array.isArray(value)) for (const child of value) visit(child, scope, node, childKey);
      else if (value && typeof value === "object") visit(value, scope, node, childKey);
    }
  }
  visit(tree, new Map(), null, null); return reads;
}

function literal(node, file) {
  if (node.type === "Literal") return node.value;
  if (node.type === "ArrayExpression") return node.elements.map(n => literal(n, file));
  if (node.type === "ObjectExpression") return Object.fromEntries(node.properties.map(p => {
    if (p.type !== "Property" || p.computed || p.method) fail(file, p, "configuration is not JSON data");
    return [prop(p.key), literal(p.value, file)];
  }));
  fail(file, node, "configuration is not JSON data");
}
export const configOf = (source, file) => literal(parse(`(${source})`, file).body[0].expression.expression ?? parse(`(${source})`, file).body[0].expression, file);
const configNames = config => [...Object.keys(config.vars ?? {}), ...[config.durable_objects?.bindings, config.r2_buckets, config.services, config.analytics_engine_datasets, config.artifacts].flatMap(rows => (rows ?? []).map(row => row.binding ?? row.name)), ...(config.version_metadata ? [config.version_metadata.binding] : []), ...(config.assets?.binding ? [config.assets.binding] : [])];

export function readSettingsDocument(source) {
  const matches = [...source.matchAll(/```dap-settings-inventory\s*\n([\s\S]*?)\n```/g)];
  if (matches.length !== 1) throw Error("settings.md requires one dap-settings-inventory JSON block");
  const value = JSON.parse(matches[0][1]);
  if (value.version !== 1 || !Array.isArray(value.deployments) || !Array.isArray(value.settings)) throw Error("Invalid settings inventory schema");
  return value;
}

/** A lookup index only: the first listed reader is not an exclusive owner. */
export function renderSettingsLookup(inventory) {
  const lines = ["| Name | Kind | Workers | Main reader |", "| --- | --- | --- | --- |"];
  for (const row of [...inventory.settings].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const workers = row.deployments.map(name => `\`${name}\``).join(", ");
    const reader = row.readers[0];
    lines.push(`| \`${row.name}\` | ${row.kind} | ${workers} | ${reader ? `[\`${reader}\`](../../${reader})` : "—"} |`);
  }
  return lines.join("\n");
}

export function checkSettings(root, { overrides = new Map(), document, tracked } = {}) {
  root = resolve(root);
  const read = path => overrides.get(path) ?? readFileSync(resolve(root, path), "utf8");
  const files = tracked ?? execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const doc = readSettingsDocument(document ?? read("docs/security/settings.md"));
  const configs = files.filter(p => /(?:^|\/)wrangler(?:\.[^.]+)?\.jsonc$/.test(p) && !p.includes("/test/") && !p.includes(".test."));
  if (JSON.stringify([...configs].sort()) !== JSON.stringify(doc.deployments.map(d => d.config).sort())) throw Error("Deployment configurations differ from settings rows");
  const packages = new Map(files.filter(p => /^(?:packages|apps)\/[^/]+\/package\.json$/.test(p)).map(p => { const m = JSON.parse(read(p)); return [m.name, { path: p, exports: m.exports }]; }));
  function imported(file, specifier) {
    if (specifier.startsWith(".")) return relative(root, resolve(root, dirname(file), specifier));
    if (!specifier.startsWith("@generalbusiness/")) return null;
    const parts = specifier.split("/"), name = parts.slice(0, 2).join("/"), item = packages.get(name), sub = parts.length === 2 ? "." : "./" + parts.slice(2).join("/");
    if (!item || typeof item.exports?.[sub] !== "string") throw Error(`${file}: unsupported workspace export ${specifier}`);
    return relative(root, resolve(root, dirname(item.path), item.exports[sub]));
  }
  const discovered = [], declarations = [], deploymentNames = new Map();
  for (const deployment of doc.deployments) {
    const config = configOf(read(deployment.config), deployment.config);
    const entry = config.main ? relative(root, resolve(root, dirname(deployment.config), config.main)) : null;
    if (deployment.name !== config.name || deployment.entry !== entry || deployment.kind !== (entry ? "worker" : "assets")) throw Error(`${deployment.config}: deployment identity changed`);
    const previous = deploymentNames.get(config.name);
    if (previous && previous !== entry) throw Error(`${config.name}: conflicting entries`);
    deploymentNames.set(config.name, entry);
    declarations.push(...configNames(config).map(name => ({ deployment: config.name, name })));
    if (!entry) continue;
    const sources = new Map(), pending = [entry];
    while (pending.length) {
      const file = pending.pop(); if (sources.has(file) || !/\.[cm]?[jt]sx?$/.test(file)) continue;
      if (file.startsWith("../") || !files.includes(file)) throw Error(`Untracked or escaping Worker source ${file}`);
      const source = read(file), tree = parse(source, file); sources.set(file, { source, tree });
      walk(tree, n => {
        if (n.type === "ImportExpression" || n.type === "CallExpression" && n.callee?.name === "require") fail(file, n, "runtime loader outside static import closure");
      });
      for (const n of tree.body) if ((n.type === "ImportDeclaration" && n.importKind !== "type" || ["ExportAllDeclaration", "ExportNamedDeclaration"].includes(n.type) && n.exportKind !== "type") && n.source) {
        const target = imported(file, n.source.value); if (target) pending.push(target);
      }
    }
    // Named type marker propagation is finite; no field/type evaluation.
    const types = new Set(), definitions = [], callableByFile = new Map();
    // Type-only imports supply marker declarations only, never runtime readers.
    const markers = new Map(sources), markerQueue = [...sources.keys()];
    while (markerQueue.length) {
      const file = markerQueue.pop(), { tree } = markers.get(file);
      for (const n of tree.body) if (n.type === "ImportDeclaration" && n.source && (n.importKind === "type" || n.specifiers.some(p => p.importKind === "type"))) {
        const target = imported(file, n.source.value);
        if (!target || markers.has(target) || !/\.[cm]?[jt]sx?$/.test(target)) continue;
        if (target.startsWith("../") || !files.includes(target)) throw Error(`Untracked type-marker source ${target}`);
        markers.set(target, { tree: parse(read(target), target) }); markerQueue.push(target);
      }
    }
    for (const { tree } of markers.values()) walk(tree, n => {
      if (["TSInterfaceDeclaration", "TSTypeAliasDeclaration"].includes(n.type)) {
        definitions.push(n); if (uppercaseShape(n.body ?? n.typeAnnotation)) types.add(n.id.name);
      }
    });
    for (let changed = true; changed;) {
      changed = false;
      for (const n of definitions) if (!types.has(n.id.name) && [...refs(n.extends ?? n.typeAnnotation)].some(name => types.has(name))) { types.add(n.id.name); changed = true; }
    }
    for (const [file, { tree }] of sources) {
      const callable = new Map(); callableByFile.set(file, callable);
      // Only top-level declarations are callable identities. Member calls and
      // local shadows are never authorized by an unrelated same-spelled name.
      const positions = parameters => {
        const found = new Set();
        parameters.forEach((p, index) => {
          if (uppercaseShape(annotation(p)) || [...refs(annotation(p))].some(name => types.has(name))) {
            if (p.type === "RestElement") fail(file, p, "variadic environment parameter");
            found.add(index);
          }
        });
        return found;
      };
      for (const top of tree.body) {
        const n = top.declaration ?? top;
        if (n.type === "FunctionDeclaration") { const accepted = positions(n.params); if (accepted.size) callable.set(n.id.name, accepted); }
        if (n.type === "ClassDeclaration" && n.id) {
          const constructor = n.body.body.find(m => m.kind === "constructor");
          if (constructor) { const accepted = positions(constructor.value.params); if (accepted.size) callable.set(n.id.name, accepted); }
        }
      }
    }
    function exportedCallable(file, name, seen = new Set()) {
      const key = `${file}:${name}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const tree = sources.get(file)?.tree;
      if (!tree) return null;
      for (const n of tree.body) {
        if (n.type === "ExportNamedDeclaration") {
          if (n.declaration?.id?.name === name) return callableByFile.get(file)?.get(name) ?? null;
          for (const specifier of n.specifiers) if (prop(specifier.exported) === name) {
            if (!n.source) return callableByFile.get(file)?.get(prop(specifier.local)) ?? null;
            return exportedCallable(imported(file, n.source.value), prop(specifier.local), seen);
          }
        }
        if (n.type === "ExportAllDeclaration" && n.exportKind !== "type") {
          const found = exportedCallable(imported(file, n.source.value), name, seen); if (found) return found;
        }
      }
      return null;
    }
    for (const [file, { source, tree }] of sources) {
      const forwarding = new Map(callableByFile.get(file));
      for (const n of tree.body) if (n.type === "ImportDeclaration" && n.importKind !== "type") {
        const target = imported(file, n.source.value);
        for (const specifier of n.specifiers) if (specifier.type === "ImportSpecifier" && specifier.importKind !== "type") {
          const accepted = exportedCallable(target, prop(specifier.imported));
          if (accepted) forwarding.set(specifier.local.name, accepted);
        }
      }
      for (const row of environmentReads(source, file, { environmentTypes: types, forwarding, sandbox: file === "apps/sandbox/worker.ts" })) discovered.push({ deployment: config.name, ...row });
    }
  }
  const documented = new Map();
  for (const row of doc.settings) {
    if (!upper(row.name) || !["text", "secret", "binding"].includes(row.kind) || !["read", "declared-unused"].includes(row.status) || !Array.isArray(row.readers) || !row.deployments?.length || ["parser", "missing", "invalid", "health"].some(k => typeof row[k] !== "string" || !row[k].trim())) throw Error(`Invalid settings row ${row.name}`);
    for (const name of row.deployments) { const key = `${name}:${row.name}`; if (!deploymentNames.has(name) || documented.has(key)) throw Error(`Duplicate or unknown settings row ${key}`); documented.set(key, row); }
  }
  for (const read of discovered) {
    const row = documented.get(`${read.deployment}:${read.name}`);
    if (!row || row.status !== "read" || !row.readers.includes(read.file)) throw Error(`${read.deployment}: ${read.file}:${read.start}: undocumented setting read ${read.name}`);
  }
  for (const declared of declarations) if (!documented.has(`${declared.deployment}:${declared.name}`)) throw Error(`${declared.deployment}: undocumented configured binding/setting ${declared.name}`);
  for (const [key, row] of documented) {
    const actual = discovered.filter(r => `${r.deployment}:${r.name}` === key);
    if (row.status === "read" && !actual.length) throw Error(`${key}: documented read has no discovered reader`);
    if (row.status === "declared-unused" && (!declarations.some(r => `${r.deployment}:${r.name}` === key) || actual.length)) throw Error(`${key}: declared-unused classification differs`);
  }
  return { deployments: doc.deployments.length, sources: [...new Set(discovered.map(r => r.file))].length, reads: discovered, settings: documented.size, qualification: "Conservative runtime-module closure; lexical environment shapes only. Row semantics and health claims require Source review." };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkSettings(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  console.log(`Settings: ${result.settings} deployment/name rows, ${result.reads.length} Source reads, ${result.deployments} configurations.`);
}
