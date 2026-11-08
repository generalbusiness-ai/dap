/** Match retained sends to their admitted occurrence and future result root. */
import type { Send, SendForm, SendMark } from "@generalbusiness/dap-contract";
import type { ValidDefinition } from "../validate/index.ts";
import { isObject, isScopeRef } from "../values.ts";
import { checkedBody, sendPlan, sendSource, type BodyStructure, type SendNode } from "./structure.ts";
import type { SendCode } from "./send-plan.ts";

export interface SendOrigin { readonly ordinal: number; readonly node: SendNode; readonly declaration: SendForm | SendMark }
export function sendOrigin(definition: ValidDefinition, body: BodyStructure, entry: { sends: readonly Send[] }, n: number): SendOrigin | null {
  checkedBody(definition, body);
  const nodes = body.nodes.filter(node => node.category === "send");
  const sent = entry.sends.filter(send => send.message.class === "request" || send.message.class === "advisory").sort((a, b) => a.n - b.n);
  const result = (ordinal: number): SendOrigin | null => {
    const node = nodes[ordinal];
    return node ? { ordinal, node, declaration: node.op === "native" ? sendSource(definition, body, node) : node.data } : null;
  };
  if (nodes.some(node => node.op === "native")) {
    const unsure = nodes.flatMap((node, ordinal) => node.op === "native" && node.data.always !== true ? [ordinal] : []);
    const at = sent.findIndex(send => send.n === n);
    if (at === -1 || unsure.length > 1) return null;
    if (sent.length === nodes.length) return result(at);
    if (sent.length !== nodes.length - 1 || unsure.length !== 1) return null;
    return result(at < unsure[0]! ? at : at + 1);
  }
  const made = (code: SendCode, { to, message }: Send): boolean => {
    if (message.class === "advisory") return code.op === "index" && message.type === "index";
    if (message.class !== "request" || !isObject(message.body)) return false;
    switch (code.op) {
      case "create": return message.type === "create" && !isScopeRef(to) && to.kind === code.kind && to.definition === (code.definition === "self" ? definition.digest : code.definition);
      case "tell": return message.type === "tell" && message.body["message"] === code.message;
      case "relate": return message.type === "relate" && message.body["name"] === code.name && message.body["state"] === code.state;
      case "index": return false;
      default: return exhaustive(code);
    }
  };
  let at = 0;
  for (const send of sent) {
    let code: SendCode | null = null;
    while (at < nodes.length) {
      const plan = sendPlan(definition, body, nodes[at]!);
      if (!plan) throw new TypeError("retained send has no admitted instruction");
      code = plan.code;
      if (made(code, send)) break;
      at++;
    }
    const node = nodes[at];
    if (!node || !code) return null;
    if (send.n === n) return result(at);
    if (!(code.op === "relate" && code.each)) at++;
  }
  return null;
}
function exhaustive(value: never): never { throw new TypeError(`unknown retained send instruction: ${String(value)}`); }
