/** Inspect only Scale registration syntax. Never import or execute a fixture. */
import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { parseAst } from "rolldown/parseAst";

const unknown = Symbol("not a static registration value");
const unwrap = node => {
  while (["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "ParenthesizedExpression"].includes(node?.type)) node = node.expression;
  return node;
};
function value(node, scope) {
  node = unwrap(node);
  if (!node) return unknown;
  if (node.type === "Literal") return node.value;
  if (node.type === "Identifier") return scope.has(node.name) ? scope.get(node.name) : unknown;
  if (node.type === "ArrayExpression") return node.elements.map(part => value(part, scope));
  if (node.type === "TemplateLiteral") {
    const parts = node.expressions.map(part => value(part, scope));
    return parts.includes(unknown) ? unknown : node.quasis.map((part, i) => part.value.cooked + (i < parts.length ? String(parts[i]) : "")).join("");
  }
  if (node.type === "BinaryExpression") {
    const left = value(node.left, scope), right = value(node.right, scope);
    if (left === unknown || right === unknown) return unknown;
    if (node.operator === "===") return left === right;
    if (node.operator === "+") return left + right;
  }
  if (node.type === "ConditionalExpression") {
    const condition = value(node.test, scope);
    return typeof condition === "boolean" ? value(condition ? node.consequent : node.alternate, scope) : unknown;
  }
  return unknown;
}
function bind(pattern, data, scope) {
  if (pattern.type === "Identifier") scope.set(pattern.name, data);
  else if (pattern.type === "ArrayPattern") pattern.elements.forEach((part, i) => { if (part) bind(part, Array.isArray(data) ? data[i] : unknown, scope); });
  else if (pattern.type === "ObjectPattern") for (const part of pattern.properties) bind(part.value ?? part.argument, unknown, scope);
  else throw Error("Unsupported Scale registration binding");
}

/** The current supported forms are literal tests, for/each, describe, static
 * for-of/if, and named local registration factories. New forms need review. */
export function scaleDeadlineRegistrations(root, owners, read = file => readFileSync(file, "utf8")) {
  const helper = resolve(root, "packages/scope/test/support/archive-scale-deadline.ts");
  const modules = new Map(), active = new Set(), rows = [];
  function checkBinding(pattern, module) {
    if (!pattern) return;
    if (pattern.type === "Identifier") {
      if (module.vitest.has(pattern.name) || module.deadlines.has(pattern.name) || module.imports.has(pattern.name) || module.functions.has(pattern.name)) throw Error(`Shadowed Scale registration binding: ${pattern.name}`);
    } else if (pattern.type === "ArrayPattern") pattern.elements.forEach(part => checkBinding(part, module));
    else if (pattern.type === "ObjectPattern") pattern.properties.forEach(part => checkBinding(part.value ?? part.argument, module));
    else throw Error("Unsupported Scale registration binding");
  }
  function bindLocal(pattern, data, scope, module) {
    checkBinding(pattern, module); bind(pattern, data, scope);
  }
  function initializer(node, module, everyCall) {
    if (!node || typeof node !== "object" || ["ArrowFunctionExpression", "FunctionExpression"].includes(node.type)) return;
    if (node.type === "CallExpression") {
      let target = unwrap(node.callee);
      while (["CallExpression", "MemberExpression"].includes(target.type)) target = unwrap(target.callee ?? target.object);
      if (everyCall || module.vitest.has(target.name) || module.deadlines.has(target.name) || module.imports.has(target.name) || module.functions.has(target.name)) throw Error("Scale registration calls in initializers need a standalone statement");
    }
    for (const [key, child] of Object.entries(node)) {
      if (["start", "end", "loc"].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(part => initializer(part, module, everyCall));
      else if (child && typeof child === "object") initializer(child, module, everyCall);
    }
  }
  function moduleAt(file) {
    if (modules.has(file)) return modules.get(file);
    const text = read(file), body = parseAst(text, { lang: "ts" }, file).body;
    const module = { file, text, body, globals: new Map(), functions: new Map(), imports: new Map(), vitest: new Map(), deadlines: new Set() };
    modules.set(file, module);
    for (const statement of body) {
      const node = statement.declaration ?? statement;
      if (node.type === "FunctionDeclaration" && node.id) module.functions.set(node.id.name, node);
      if (node.type !== "ImportDeclaration" || node.importKind === "type") continue;
      for (const part of node.specifiers) {
        if (part.type !== "ImportSpecifier" || part.importKind === "type") continue;
        const name = part.imported.name ?? part.imported.value;
        if (node.source.value === "vitest" && ["test", "describe"].includes(name)) module.vitest.set(part.local.name, name);
        if (node.source.value.startsWith(".")) {
          const from = resolve(dirname(file), node.source.value);
          module.imports.set(part.local.name, { from, name });
          if (from === helper && name === "scaleDeadline") module.deadlines.add(part.local.name);
        }
      }
    }
    // Collect imports and hoisted factories before checking any declaration.
    for (const statement of body) {
      const node = statement.declaration ?? statement;
      if (node.type === "VariableDeclaration") for (const part of node.declarations) {
        initializer(part.init, module, false);
        bindLocal(part.id, value(part.init, module.globals), module.globals, module);
      }
    }
    return module;
  }
  function deadline(node, module, scope) {
    node = unwrap(node);
    if (!node) return { scaled: false, milliseconds: null };
    if (node.type === "CallExpression" && module.deadlines.has(node.callee.name) && node.arguments.length === 1) {
      const milliseconds = value(node.arguments[0], scope);
      if (!Number.isSafeInteger(milliseconds) || milliseconds < 1) throw Error("Unresolved Scale deadline base");
      return { scaled: true, milliseconds };
    }
    const milliseconds = value(node, scope);
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 1) throw Error(`Unresolved fixed Scale deadline in ${module.file}`);
    return { scaled: false, milliseconds };
  }
  function call(expression, module, scope, owner, suites) {
    const callee = unwrap(expression.callee);
    let name = callee.type === "Identifier" ? module.vitest.get(callee.name) : undefined;
    let choices = null;
    if (callee.type === "CallExpression" && callee.callee.type === "MemberExpression") {
      const member = callee.callee;
      name = module.vitest.get(member.object.name);
      if (name !== "test" || member.computed || !["each", "for"].includes(member.property.name) || callee.arguments.length !== 1) throw Error("Unsupported parameterized Scale registration");
      choices = value(callee.arguments[0], scope);
      if (!Array.isArray(choices) || !choices.length) throw Error("Unresolved Scale registration choices");
    }
    if (name === "describe") {
      const title = value(expression.arguments[0], scope), callback = unwrap(expression.arguments.at(-1));
      if (typeof title !== "string" || callback?.body?.type !== "BlockStatement") throw Error("Unresolved Scale suite");
      callback.params.forEach(part => checkBinding(part, module));
      statements(callback.body.body, module, new Map(scope), owner, [...suites, title]);
      return;
    }
    if (name === "test") {
      const title = value(expression.arguments[0], scope);
      if (typeof title !== "string") throw Error(`Unresolved Scale case title in ${module.file}`);
      const options = unwrap(expression.arguments[1]);
      let limit = expression.arguments[2];
      if (options?.type === "ObjectExpression") {
        if (options.properties.some(part => part.type !== "Property" || part.computed)) throw Error("Unsupported Scale test options");
        limit = options.properties.find(part => (part.key.name ?? part.key.value) === "timeout")?.value;
      }
      const budget = deadline(limit, module, scope);
      for (const choice of choices ?? [null]) {
        let expanded = title;
        if (choices) {
          if (typeof choice !== "string" || (title.match(/%s/g) ?? []).length !== 1) throw Error("Unsupported Scale title substitution");
          expanded = title.replace("%s", choice);
        }
        rows.push({ owner, source: relative(root, module.file), title: [...suites, expanded].join(" > "), ...budget });
      }
      return;
    }
    if (callee.type !== "Identifier") throw Error(`Unsupported Scale registration call in ${module.file}`);
    const imported = module.imports.get(callee.name), target = imported ? moduleAt(imported.from) : module;
    const factory = target.functions.get(imported?.name ?? callee.name);
    if (!factory) throw Error(`Unresolved Scale registration factory: ${callee.name}`);
    const key = `${target.file}:${factory.id.name}`;
    if (active.has(key)) throw Error("Recursive Scale registration factory");
    const inner = new Map(target.globals);
    factory.params.forEach((part, i) => bindLocal(part, value(expression.arguments[i], scope), inner, target));
    active.add(key);
    try { statements(factory.body.body, target, inner, owner, suites); }
    finally { active.delete(key); }
  }
  function statements(body, module, scope, owner, suites) {
    for (const statement of body) {
      const node = statement.declaration ?? statement;
      if (node.type === "VariableDeclaration") for (const part of node.declarations) {
        initializer(part.init, module, true);
        bindLocal(part.id, value(part.init, scope), scope, module);
      }
      else if (node.type === "ExpressionStatement") {
        const expression = unwrap(node.expression);
        if (expression.type !== "CallExpression") throw Error("Unsupported Scale registration expression");
        call(expression, module, scope, owner, suites);
      } else if (node.type === "BlockStatement") statements(node.body, module, new Map(scope), owner, suites);
      else if (node.type === "ForOfStatement") {
        const choices = value(node.right, scope);
        if (!Array.isArray(choices) || node.left.type !== "VariableDeclaration" || node.left.declarations.length !== 1) throw Error("Unresolved Scale registration loop");
        for (const choice of choices) {
          const inner = new Map(scope); bindLocal(node.left.declarations[0].id, choice, inner, module);
          statements([node.body], module, inner, owner, suites);
        }
      } else if (node.type === "IfStatement") {
        const condition = value(node.test, scope);
        if (typeof condition !== "boolean") throw Error("Unresolved Scale registration condition");
        const branch = condition ? node.consequent : node.alternate;
        if (branch) statements([branch], module, new Map(scope), owner, suites);
      } else if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") {
        if (module.functions.get(node.id?.name) !== node) checkBinding(node.id, module);
      } else if (!["ImportDeclaration", "TSInterfaceDeclaration", "TSTypeAliasDeclaration", "EmptyStatement"].includes(node.type)) throw Error(`Unsupported Scale registration statement: ${node.type}`);
    }
  }
  for (const owner of owners) {
    const file = resolve(root, "packages/scope", owner), module = moduleAt(file);
    statements(module.body, module, new Map(module.globals), owner, []);
  }
  return rows;
}
