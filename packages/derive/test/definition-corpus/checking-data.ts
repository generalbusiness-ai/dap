/** Raw job-read fixture declaration; no step rules or histories run here. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { lane } from "./fixture-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export function checkingData(): DeclaredDefinition {
  const def = structuredClone(lane) as any;
  def.capabilities.push({ name: "git-read", version: 1 });
  const name = { type: "text", max: 64 };
  def.items.rules = { many: false, max: 1, states: { current: { final: false } }, initial: "current", parties: {}, refs: {}, values: { checks: { fixed: false, required: true, of: { type: "list", of: { type: "record", of: { name: { ...name, required: true }, checker: { type: "member", required: true } } }, max: 4 } } } };
  def.items.job = { many: true, max: 8, states: { requested: { final: false }, passed: { final: false }, "timed-out": { final: false } }, initial: "requested", parties: {}, refs: {}, values: { name: { fixed: true, required: true, of: name }, deadline: { fixed: true, required: true, of: { type: "time" } } } };
  const row = { also: {}, guards: [], sends: [], attention: [] };
  def.acts.publish = { ...row, step: "open", on: "rules", grant: "publish", fields: { checks: { ...def.items.rules.values.checks.of, required: true } }, effects: [{ value: { slot: "checks", from: { field: "checks" } } }] };
  def.acts["request-check"] = { ...row, step: "open", on: "job", grant: "propose", fields: { name: { ...name, required: true } }, effects: [{ value: { slot: "name", from: { field: "name" } } }, { value: { slot: "deadline", from: { time: { plusSeconds: 1800 } } } }] };
  const waiting = [{ state: ["requested", "timed-out"] }];
  def.acts.decide = { ...row, step: "transition", on: "job", grant: "check", fields: {}, guards: waiting, effects: [{ state: "passed" }] };
  def.acts["time-out"] = { ...row, step: "transition", on: "job", grant: "check", fields: {}, guards: waiting, effects: [{ state: "timed-out" }] };
  return def;
}
