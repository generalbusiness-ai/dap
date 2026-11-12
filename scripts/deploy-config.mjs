import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const checkout = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const WRANGLER = "4.147.0";
const names = new Set(["grow", "lending", "demo", "artroom-scope"]);
export const digestPattern = /^[0-9a-f]{64}$/;
export const commitPattern = /^[0-9a-f]{40}$/;
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const record = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function configPath(name) {
  if (!names.has(name)) throw new Error("Unknown hosted configuration.");
  return `apps/room/wrangler.${name}.jsonc`;
}

/** Remove JSONC comments and trailing commas without changing string bytes. */
export function parseConfig(source) {
  let clean = "", quoted = false, escaped = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (quoted) {
      clean += c;
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') { quoted = true; clean += c; }
    else if (c === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      clean += "\n";
    } else if (c === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      if (i === source.length) throw new Error("Unclosed configuration comment.");
      i++; clean += " ";
    } else clean += c;
  }
  let json = ""; quoted = false; escaped = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (!quoted && c === ",") {
      let j = i + 1;
      while (/\s/.test(clean[j] ?? "") && j < clean.length) j++;
      if (clean[j] === "}" || clean[j] === "]") continue;
    }
    json += c;
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
  }
  const config = JSON.parse(json);
  if (!record(config) || typeof config.name !== "string" || !/^[a-z0-9-]+$/.test(config.name)
      || typeof config.main !== "string" || !record(config.vars ?? {})) throw new Error("Invalid hosted configuration.");
  return config;
}

export async function readConfig(root, name) {
  const path = configPath(name), bytes = await readFile(resolve(root, path));
  return { path, bytes, config: parseConfig(bytes.toString("utf8")) };
}

export function migrationTags(config) {
  if (!Array.isArray(config.migrations)) throw new Error("Missing migration list.");
  const tags = config.migrations.map(row => {
    if (!record(row) || typeof row.tag !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(row.tag)) throw new Error("Invalid migration tag.");
    return row.tag;
  });
  if (new Set(tags).size !== tags.length) throw new Error("Duplicate migration tag.");
  return tags;
}

export function smokePolicy(config) {
  const vars = config.vars ?? {}, bindings = config.durable_objects?.bindings ?? [];
  const mcpOpen = vars.MCP_ENABLED === "true" && ["REGISTRIES", "AGENTS"].every(name => bindings.some(row => row.name === name));
  let offer = null;
  if (Object.hasOwn(vars, "DEMO_START_CONFIG")) {
    if (typeof vars.DEMO_START_CONFIG !== "string" || Buffer.byteLength(vars.DEMO_START_CONFIG) > 4096) throw new Error("Invalid creation offer configuration.");
    offer = JSON.parse(vars.DEMO_START_CONFIG);
    if (!record(offer) || offer.v !== 3 || !record(offer.register) || Object.keys(offer.register).sort().join() !== "inc,kind,scope" || offer.register.kind !== "register"
        || typeof offer.register.scope !== "string" || !/^sc_[a-z2-7]{52}$/.test(offer.register.scope)
        || typeof offer.register.inc !== "string" || !/^in_[a-z2-7]+$/.test(offer.register.inc)
        || offer.register.scope !== vars.REGISTER_SCOPE || typeof offer.origin !== "string"
        || typeof offer.definition !== "string") throw new Error("Invalid creation offer configuration.");
  }
  return { mcpStatus: mcpOpen ? 401 : 404, offer };
}
