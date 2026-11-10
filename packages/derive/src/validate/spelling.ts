/** Canonical spelling of authored declared data. This does not hash or admit
 * a declaration and never rewrites a retained definition or journal. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";

type J = Record<string, unknown>;
const isObj = (v: unknown): v is J => typeof v === "object" && v !== null && !Array.isArray(v);
const mapValues = <T, U>(o: Record<string, T>, f: (v: T, k: string) => U): Record<string, U> => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v, k)]));

export function normalizeDefinition<D extends DeclaredDefinition>(definition: D): D {
  const operandN = (o: unknown, subject: string, inRange: boolean): unknown => {
    if (!isObj(o)) return o;
    const out: J = { ...o };
    if (typeof out["slot"] === "string" && !inRange && out["of"] === subject) delete out["of"];
    const entryPartN = (p: unknown): unknown => isObj(p) && isObj(p["set"])
      ? { ...p, set: { ...p["set"], item: operandN(p["set"]["item"], subject, inRange) } } : p;
    const part = out["part"];
    if (isObj(part)) out["part"] = "of" in part ? { ...part, of: entryPartN(part["of"]) } : entryPartN(part);
    if ("source" in out) out["source"] = entryPartN(out["source"]);
    return out;
  };
  const whereN = (ws: unknown, subject = "", inRange = true): unknown => Array.isArray(ws) ? ws.map((w) => isObj(w) ? mapValues(w, (pair) => isObj(pair) ? { ...pair, a: operandN(pair["a"], subject, inRange), b: operandN(pair["b"], subject, inRange) } : pair) : w) : ws;
  const rangeN = (r: J): J => {
    const out: J = { ...r };
    if (Array.isArray(out["where"])) { if (out["where"].length === 0) delete out["where"]; else out["where"] = whereN(out["where"]); }
    if (Array.isArray(out["except"]) && out["except"].length === 0) delete out["except"];
    return out;
  };
  const sourceN = (x: unknown, subject: string): unknown => isObj(x) && isObj(x["collect"]) ? { collect: { ...x["collect"], items: rangeN(x["collect"]["items"] as J) } } : operandN(x, subject, false);
  const argN = (a: unknown, subject: string): unknown => isObj(a) && isObj(a["items"]) ? { ...a, items: rangeN(a["items"]) } : isObj(a) && "each" in a ? { ...a, each: operandN(a["each"], subject, false), value: operandN(a["value"], subject, false) } : operandN(a, subject, false);
  const listFormN = (l: J, subject: string, requiredWhere: boolean): J => {
    const out: J = { ...l, list: operandN(l["list"], subject, false) };
    // `has.where` is required. `each.where` is an optional filter over the guard's subject.
    if (Array.isArray(l["where"])) {
      if (l["where"].length || requiredWhere) out["where"] = whereN(l["where"], subject, false);
      else delete out["where"];
    }
    if (Array.isArray(l["guards"])) out["guards"] = l["guards"].map(g => guardN(g, subject));
    return out;
  };
  const guardN = (g: unknown, inherited = "on"): unknown => {
    if (!isObj(g)) return g;
    const subject = typeof g["of"] === "string" ? g["of"] : inherited;
    const out: J = { ...g };
    // Nested guards inherit their enclosing guard's subject, not always `on`.
    if (out["of"] === inherited) delete out["of"];
    const op = (x: unknown) => operandN(x, subject, false);
    for (const k of ["equals", "differs"]) { const pair = out[k]; if (isObj(pair)) out[k] = { ...pair, a: op(pair["a"]), b: op(pair["b"]) }; }
    for (const k of ["none", "some"]) if (isObj(out[k])) out[k] = rangeN(out[k] as J);
    if (isObj(out["count"])) { const { min, max, ...r } = out["count"]; out["count"] = { ...rangeN(r), ...(min !== undefined ? { min: op(min) } : {}), ...(max !== undefined ? { max: op(max) } : {}) }; }
    for (const k of ["each", "has"]) if (isObj(out[k])) out[k] = listFormN(out[k] as J, subject, k === "has");
    if (isObj(out["distinct"])) out["distinct"] = { ...out["distinct"], list: op(out["distinct"]["list"]), key: op(out["distinct"]["key"]) };
    if (isObj(out["sameSet"])) {
      const s = out["sameSet"], normalized: J = { ...s, list: op(s["list"]), key: op(s["key"]), items: rangeN(s["items"] as J) };
      if (Array.isArray(s["match"])) {
        if (s["match"].length) normalized["match"] = whereN(s["match"]);
        else delete normalized["match"];
      }
      out["sameSet"] = normalized;
    }
    if (Array.isArray(out["anyOf"])) out["anyOf"] = out["anyOf"].map((alt: unknown) => Array.isArray(alt) ? alt.map(g => guardN(g, subject)) : alt);
    if (isObj(out["capability"])) out["capability"] = { ...out["capability"], with: mapValues(out["capability"]["with"] as J, (a) => argN(a, subject)) };
    if (isObj(out["fact"])) {
      const fact = out["fact"], normalized: J = { ...fact };
      if (typeof fact["field"] === "string" && Array.isArray(fact["where"])) {
        // `a` names a foreign entry field. Only `b` reads this guard's subject.
        if (fact["where"].length) normalized["where"] = fact["where"].map(w => {
          if (!isObj(w) || !isObj(w["equals"])) return w;
          return { ...w, equals: { ...w["equals"], b: op(w["equals"]["b"]) } };
        });
        else delete normalized["where"];
      }
      out["fact"] = normalized;
    }
    return out;
  };
  const authorN = (a: unknown, subject: string): unknown => !isObj(a) ? a : isObj(a["items"]) ? { ...a, items: rangeN(a["items"]) } : "each" in a ? { ...a, each: operandN(a["each"], subject, false), list: operandN(a["list"], subject, false) } : "list" in a ? { ...a, list: operandN(a["list"], subject, false) } : a;
  const effectN = (e: unknown): unknown => {
    if (!isObj(e)) return e;
    const subject = typeof e["of"] === "string" ? e["of"] : "on";
    const out: J = { ...e };
    if (out["of"] === "on") delete out["of"];
    const op = (x: unknown) => operandN(x, subject, false);
    for (const k of ["if", "unless"]) if (Array.isArray(out[k])) out[k] = (out[k] as unknown[]).map(g => guardN(g));
    if (isObj(out["party"])) { const f = out["party"]["from"]; out["party"] = { ...out["party"], from: Array.isArray(f) ? f.map(op) : op(f) }; }
    if (isObj(out["value"])) out["value"] = { ...out["value"], from: op(out["value"]["from"]) };
    if (isObj(out["ref"])) out["ref"] = { ...out["ref"], from: op(out["ref"]["from"]) };
    if (isObj(out["hold"]) && out["hold"]["extent"] !== undefined) out["hold"] = { ...out["hold"], extent: op(out["hold"]["extent"]) };
    if (isObj(out["capability"])) out["capability"] = { ...out["capability"], with: mapValues(out["capability"]["with"] as J, op) };
    if (isObj(out["attribute"]) && Array.isArray(out["attribute"]["with"])) out["attribute"] = { ...out["attribute"], with: out["attribute"]["with"].map((a: unknown) => authorN(a, subject)) };
    return out;
  };
  const clausesN = (c: unknown): unknown => isObj(c) ? mapValues(c, (effects) => Array.isArray(effects) ? effects.map(effectN) : effects) : c;
  const noticeN = (n: unknown): unknown => isObj(n) && isObj(n["notify"]) && Array.isArray(n["notify"]["if"]) ? { ...n, notify: { ...n["notify"], if: n["notify"]["if"].map(g => guardN(g)) } } : n;
  const sendN = (s: unknown): unknown => {
    if (!isObj(s)) return s;
    const src = (x: unknown) => sourceN(x, "on"), ifN = (x: unknown) => Array.isArray(x) ? { if: x.map(g => guardN(g)) } : {};
    if (isObj(s["tell"])) { const t = s["tell"]; return { tell: { ...t, to: operandN(t["to"], "on", false), ...ifN(t["if"]), fields: mapValues(t["fields"] as J, src), result: clausesN(t["result"]) } }; }
    if (isObj(s["create"])) { const c = s["create"]; return { create: { ...c, fields: mapValues(c["fields"] as J, src), result: clausesN(c["result"]) } }; }
    if (isObj(s["relate"])) { const r = s["relate"]; return { relate: { ...r, ...(isObj(r["each"]) ? { each: rangeN(r["each"]) } : {}), to: src(r["to"]), item: src(r["item"]), ...ifN(r["if"]), detail: mapValues(r["detail"] as J, src), result: clausesN(r["result"]) } }; }
    if (isObj(s["index"])) return { index: { fields: mapValues(s["index"]["fields"] as J, src) } };
    return s;
  };
  const rowN = <R extends J>(row: R): R => {
    const normalized = {
      ...row,
      ...(Array.isArray(row["guards"]) ? { guards: row["guards"].map(g => guardN(g)) } : {}),
      ...(Array.isArray(row["effects"]) ? { effects: row["effects"].map(effectN) } : {}),
      ...(Array.isArray(row["sends"]) ? { sends: row["sends"].map(sendN) } : {}),
      ...(Array.isArray(row["attention"]) ? { attention: row["attention"].map(noticeN) } : {}),
    };
    return normalized;
  };
  return {
    ...definition,
    acts: mapValues(definition.acts as unknown as Record<string, J>, rowN), receives: mapValues(definition.receives as unknown as Record<string, J>, rowN), timed: mapValues(definition.timed as unknown as Record<string, J>, rowN),
  } as D;
}
