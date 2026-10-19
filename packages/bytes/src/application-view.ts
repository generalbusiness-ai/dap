/** Declarative trusted views. Parsing this data grants no read or signing
 * authority; the host separately admits/evaluates when and checks needs. */
import type { FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, parseStrict, utf8 } from "./index.ts";
import { readViewParameters, ApplicationViewParameterError, type ApplicationViewParameters } from "./application-view-parameters.ts";
import { applicationJson } from "./application-json.ts";
import { ApplicationPackageError } from "./application-types.ts";
export const APPLICATION_VIEW_LIMITS = Object.freeze({ bytes: 64 * 1024, views: 32, acts: 2, facts: 16, templateBytes: 4096, expressionBytes: 2048 });
export interface ApplicationViewAct {
  readonly act: string;
  readonly label: string;
  /** Constant native fields; no row substitution or browser-supplied values. */
  readonly args?: Readonly<Record<string, FieldValue>>;
  /** Human scalar inputs exposed by this view's derived model tool. */
  readonly parameters?: ApplicationViewParameters;
  readonly needs: string;
  /** A restricted@1 expression over the selected row's metadata and fields. */
  readonly when: string;
}
/** Presentation of an integer stored in fixed-point units. Scaling is an
 * exact decimal shift, not an expression or a change to projection data. */
export type ApplicationViewFact = string | { readonly field: string; readonly label: string; readonly scale: number; readonly unit: string }
  | { readonly field: string; readonly label: string; readonly format: "age" };
export const applicationViewFactField = (fact: ApplicationViewFact): string => typeof fact === "string" ? fact : fact.field;
interface ViewBase {
  readonly projection: string;
  /** The projection source whose row supplies identity and template fields. */
  readonly item: string;
  readonly revision: "revision";
  readonly context: string;
  readonly fallback: string;
  readonly waiting: Readonly<Record<string, string>>;
  readonly refresh: number;
  readonly display: "inline" | "fullscreen";
  readonly back: string | null;
}
export interface ApplicationViewSeries {
  readonly source: string; readonly field: string; readonly label: string;
  readonly scale: number; readonly unit: string; readonly last: number;
}
export interface ApplicationViewLink { readonly view: string; readonly field: string; readonly label: string }
export interface ApplicationItemView extends ViewBase {
  /** Carousel membership: a restricted@1 boolean over trusted viewer and item.
   * Record-by-id views do not apply this rule. It grants no read authority. */
  readonly for?: string;
  /** Order a complete carousel source; ties retain ascending native item IDs. */
  readonly order?: { readonly field: string; readonly direction: "asc" | "desc"; readonly missing: "first" | "last" };
  /** Read-only navigation through a projected native local-item reference. */
  readonly links?: readonly ApplicationViewLink[];
  /** Last native journal samples on this selected item; no expression or join. */
  readonly series?: ApplicationViewSeries;
  readonly kind: "card" | "carousel" | "record" | "log";
  readonly title: string;
  readonly summary: string | null;
  readonly actor: string | null;
  readonly facts: readonly ApplicationViewFact[];
  readonly acts: readonly ApplicationViewAct[];
}
export interface ApplicationSurfaceView extends ViewBase {
  readonly kind: "surface";
  readonly resource: string;
  readonly opens: Readonly<Record<string, string>>;
  /** A surface has no signing controls. The host must enforce this. */
  readonly acts: readonly [];
}
export type ApplicationView = ApplicationItemView | ApplicationSurfaceView;
export type ApplicationViews = Readonly<Record<string, ApplicationView>>;
export class ApplicationViewError extends Error {
  constructor(readonly reason: "invalid" | "limit" | "binding") { super("application-view-" + reason); }
}
const B = APPLICATION_VIEW_LIMITS;
const fail = (reason: ApplicationViewError["reason"] = "invalid"): never => { throw new ApplicationViewError(reason); };
const name = (value: unknown): string => typeof value === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(value) ? value : fail();
const text = (value: unknown, max: number): string => typeof value === "string" && value.length > 0 && value.length <= max && utf8(value).length <= max ? value : fail();
const only = (value: unknown, keys: string): Record<string, unknown> => isRecord(value) && Object.keys(value).sort().join() === keys ? value : fail();
export function isApplicationViewResource(value: unknown): value is string {
  return typeof value === "string" && value.length <= 256
    && /^ui:\/\/[A-Za-z0-9][A-Za-z0-9._-]{0,63}(?:\/[A-Za-z0-9][A-Za-z0-9._-]{0,63})+$/.test(value)
    && !value.slice(5).split("/").some(part => part === "." || part === "..");
}
const dict = (value: unknown, most: number): Record<string, unknown> => {
  if (!isRecord(value)) return fail();
  const keys = Object.keys(value); if (keys.length > most) return fail("limit");
  keys.forEach(name); return value;
};
function freeze(value: unknown): void {
  if (value !== null && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
}
/** Template substitution is plain text with one declared row. No expressions,
 * HTML, implicit data reads or property traversal execute inside a template. */
export function applicationViewTemplateFields(template: string): readonly string[] {
  const found: string[] = [];
  let at = 0;
  while (at < template.length) {
    const open = template.indexOf("{", at), close = template.indexOf("}", at);
    if (open < 0) { if (close >= 0) return fail(); break; }
    if (close < open || close < 0) return fail();
    found.push(name(template.slice(open + 1, close)));
    at = close + 1;
  }
  return found;
}
export function readApplicationViews(value: unknown): ApplicationViews {
  let owned: unknown;
  try { owned = parseStrict(applicationJson(value, B.bytes)); }
  catch (error) { return fail(error instanceof ApplicationPackageError && error.reason === "limit" ? "limit" : "invalid"); }
  const views = dict(owned, B.views);
  for (const given of Object.values(views)) {
    if (!isRecord(given)) return fail();
    const common = "acts,back,context,display,fallback,item,kind,projection,refresh,revision,waiting";
    const view = only(given, (common + (given["kind"] === "surface" ? ",opens,resource" : ",actor,facts,summary,title" + (Object.hasOwn(given, "links") ? ",links" : "") + (Object.hasOwn(given, "series") ? ",series" : "") + (Object.hasOwn(given, "order") ? ",order" : "") + (Object.hasOwn(given, "for") ? ",for" : ""))).split(",").sort().join());
    name(view["projection"]); name(view["item"]);
    if (view["revision"] !== "revision" || typeof view["display"] !== "string" || !["inline", "fullscreen"].includes(view["display"])) return fail();
    if (view["back"] !== null) name(view["back"]);
    const refresh = view["refresh"];
    if (typeof refresh !== "number" || !Number.isSafeInteger(refresh) || refresh < 1000 || refresh > 60_000) return fail("limit");
    for (const key of ["context", "fallback"]) applicationViewTemplateFields(text(view[key], B.templateBytes));
    for (const template of Object.values(dict(view["waiting"], 16))) applicationViewTemplateFields(text(template, B.templateBytes));
    const acts = view["acts"];
    if (!Array.isArray(acts) || acts.length > B.acts) return fail("limit");
    const used = new Set<string>();
    for (const given of acts) {
      const act = only(given, ("act,label,needs,when" + (isRecord(given) && Object.hasOwn(given, "args") ? ",args" : "") + (isRecord(given) && Object.hasOwn(given, "parameters") ? ",parameters" : "")).split(",").sort().join()), kind = name(act["act"]);
      if (Object.hasOwn(act, "args") && (!isRecord(act["args"]) || Object.keys(act["args"]).length > 128)) return fail();
      if (Object.hasOwn(act, "parameters")) {
        try { readViewParameters(act["parameters"]); }
        catch (error) { return fail(error instanceof ApplicationViewParameterError ? error.reason : "invalid"); }
      }
      const binding = canonicalize([kind, act["args"] ?? {}, act["parameters"] ?? {}]);
      if (used.has(binding)) return fail(); used.add(binding);
      name(act["needs"]); text(act["label"], 80); text(act["when"], B.expressionBytes);
    }
    if (view["kind"] === "surface") {
      if (acts.length || !isApplicationViewResource(view["resource"])) return fail();
      for (const target of Object.values(dict(view["opens"], 16))) name(target);
    } else {
      if (typeof view["kind"] !== "string" || !["card", "carousel", "record", "log"].includes(view["kind"])) return fail();
      if (Object.hasOwn(view, "for")) {
        if (view["kind"] !== "carousel") return fail();
        text(view["for"], B.expressionBytes);
      }
      if (Object.hasOwn(view, "order")) {
        if (view["kind"] !== "carousel") return fail();
        const order = only(view["order"], "direction,field,missing"); name(order["field"]);
        if (order["direction"] !== "asc" && order["direction"] !== "desc" || order["missing"] !== "first" && order["missing"] !== "last") return fail();
      }
      if (Object.hasOwn(view, "links")) {
        const links = view["links"];
        if (!Array.isArray(links) || links.length > 16) return fail("limit");
        const destinations = new Set<string>();
        for (const given of links) {
          const link = only(given, "field,label,view"); name(link["view"]); name(link["field"]); text(link["label"], 80);
          const destination = canonicalize([link["view"], link["field"]]);
          if (destinations.has(destination)) return fail(); destinations.add(destination);
        }
      }
      if (Object.hasOwn(view, "series")) {
        if (view["kind"] !== "record") return fail();
        const series = only(view["series"], "field,label,last,scale,source,unit");
        name(series["source"]); name(series["field"]); text(series["label"], 80);
        if (typeof series["last"] !== "number" || !Number.isSafeInteger(series["last"]) || series["last"] < 1 || series["last"] > 64) return fail("limit");
        if (typeof series["scale"] !== "number" || !Number.isSafeInteger(series["scale"]) || series["scale"] < 0 || series["scale"] > 6) return fail();
        if (typeof series["unit"] !== "string" || series["unit"].length > 16 || utf8(series["unit"]).length > 32 || series["unit"].trim() !== series["unit"]) return fail();
      }
      name(view["title"]);
      for (const key of ["summary", "actor"]) if (view[key] !== null) name(view[key]);
      const facts = view["facts"];
      if (!Array.isArray(facts) || facts.length > B.facts) return fail("limit");
      for (const fact of facts) {
        if (typeof fact === "string") { name(fact); continue; }
        if (isRecord(fact) && Object.hasOwn(fact, "format")) {
          const format = only(fact, "field,format,label"); name(format["field"]); text(format["label"], 80);
          if (format["format"] !== "age") return fail();
          continue;
        }
        const format = only(fact, "field,label,scale,unit");
        name(format["field"]); text(format["label"], 80);
        if (typeof format["scale"] !== "number" || !Number.isSafeInteger(format["scale"]) || format["scale"] < 0 || format["scale"] > 6) return fail();
        if (typeof format["unit"] !== "string" || format["unit"].length > 16 || utf8(format["unit"]).length > 32 || format["unit"].trim() !== format["unit"]) return fail();
      }
      if (new Set((facts as ApplicationViewFact[]).map(applicationViewFactField)).size !== facts.length) return fail();
    }
  }
  freeze(owned); return owned as ApplicationViews;
}
