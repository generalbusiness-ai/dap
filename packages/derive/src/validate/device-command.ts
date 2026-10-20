/** device-command@1 binds one target-writing member act to its actual device. */
import { DEVICE_COMMAND, DEVICE_COMMAND_KINDS } from "@generalbusiness/dap-contract";
import { isObject } from "../values.ts";
import { subject, type Ctx, type Defining, type Type } from "./context.ts";
import { at } from "./shape.ts";

export function deviceCommandOpen(d: Defining, written: unknown, path: string, ctx: Ctx, owner: () => Type | null): void {
  const bad = (message: string) => d.bad("capability", path, message);
  if (ctx.nascent || ctx.timed || ctx.clause || !ctx.signer || ctx.kind === null) { bad("device-command@1 opens only from a target-writing member transition"); return; }
  const from = isObject(written) ? written["device"] : undefined;
  if (!isObject(from) || from["slot"] !== "kind" || Object.keys(from).some(key => key !== "slot" && key !== "of")) { bad("device names the bound device's kind slot"); return; }
  const type = from["of"] === undefined ? owner() : subject(d, from["of"], at(path, "device.of"), ctx, false);
  if (!type || type === "scope") return;
  if (type.slots.get("outcome")?.capability !== DEVICE_COMMAND || type.slots.get("outcomeAt")?.capability !== DEVICE_COMMAND) { bad("the device declares both capability-owned answer slots"); return; }
  const kind = type.slots.get("kind"), target = type.slots.get("target"), level = type.slots.get("level"), targetAt = type.slots.get("targetAt");
  if (kind?.kind !== "value" || kind.type.type !== "enum" || !kind.fixed || !kind.required
    || !kind.type.of.every(value => DEVICE_COMMAND_KINDS.some(allowed => allowed === value))
    || target?.kind !== "value" || target.type.type !== "enum" || !target.type.of.every(value => ["open", "closed", "on", "off"].includes(value))
    || level?.kind !== "value" || level.type.type !== "int" || level.type.min < 0 || level.type.max > 100
    || targetAt?.kind !== "ref" || targetAt.type.type !== "fact" || targetAt.type.under !== d.name || !targetAt.type.kind.includes(ctx.kind)) bad("device-command@1 requires bounded device kind, target, level and this target-writing fact");
}
