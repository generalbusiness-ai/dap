/** Producer facts for native receiver pins. Amounts and their recursive
 * closures are computed by capacityOf, beside every other pending task. */
import type { FieldType } from "@generalbusiness/dap-contract";
import { isScopeRef } from "@generalbusiness/dap-bytes";
import { isObject } from "../values.ts";
import { LICENSE_BOUND } from "../capability/hold.ts";
import type { ClauseSet, Ctx, Defining, PendingWork } from "./context.ts";
import type { Read } from "./operands.ts";

export interface NativeLicense {
  path: string;
  remaining: number;
  source: string | null; // null cannot bind; * may name any source kind
  exported: unknown;
  existing: boolean;
}
export interface NativeCapacity {
  receiverPins: boolean;
  tasks: Map<ClauseSet, NativeLicense[]>;
  decisions: { path: string; kind: string }[];
}
export const nativeCapacity = (): NativeCapacity => ({ receiverPins: false, tasks: new Map(), decisions: [] });

export function nativeLicense(d: Defining, path: string, args: Record<string, unknown>, reads: ReadonlyMap<string, Read | null>, ctx: Ctx): void {
  if (!d.wholeCapacity) return;
  const from = args["from"], read = reads.get("from");
  const sender = isObject(from) && from["sender"] === true && (ctx.handler !== null || ctx.clause);
  const cannotBind = isObject(from) && from["none"] === true || read?.type !== null && read?.type !== undefined && ["int", "text", "bool", "time", "digest", "commit", "item", "list"].includes(read.type.type);
  const source = sender ? ctx.senderKind ?? "*" : isObject(from) && Object.hasOwn(from, "const")
    ? isScopeRef(from["const"]) ? from["const"].kind : null
    : read?.type?.type === "scope" ? read.type.kind : cannotBind ? null : "*";
  const k = args["k"], counter = reads.get("k")?.type;
  const min = isObject(k) && Object.hasOwn(k, "const") ? k["const"] : counter?.type === "int" ? counter.min : null;
  d.native.receiverPins ||= source !== null;
  const remaining = source === null ? 0 : typeof min === "number" && Number.isSafeInteger(min) ? Math.max(0, LICENSE_BOUND - min) : NaN;
  if (!Number.isSafeInteger(remaining)) {
    d.bad("reserve-unbounded", path, "hold@1/receiver-pin counter producer has no finite safe-integer lower bound");
    return;
  }
  if (d.clause) d.native.tasks.set(d.clause, [...(d.native.tasks.get(d.clause) ?? []), { path, remaining, source, exported: args["export"], existing: false }]);
}

/** A bound license already has its own pin key. Valid item fields and
 * validated also selectors give the same local ID as that raw binding. */
export function nativeReceiver(d: Defining, form: PendingWork, fields: ReadonlyMap<string, FieldType>, also: unknown, cls: unknown, message: string | null, kind: unknown): void {
  if (!d.wholeCapacity || typeof kind !== "string") return;
  const bound = cls === "tell" && message === "export-license" && d.capabilities.get("hold") === "hold@1";
  if (bound) d.native.decisions.push({ path: form.path, kind });
  for (const task of d.native.tasks.get(form.sets) ?? []) {
    const arg = task.exported;
    if (!bound || !isObject(arg) || Object.keys(arg).length !== 1) continue;
    if (arg["field"] === "export" && fields.get("export")?.type === "item") task.existing = true;
    if (typeof arg["item"] === "string" && arg["item"].startsWith("also.") && isObject(also)) {
      const selected = also[arg["item"].slice(5)];
      if (isObject(selected) && selected["by"] === "export") task.existing = true;
    }
  }
}
