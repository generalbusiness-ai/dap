import type { Effect, FieldValue, GenesisEffect } from "@generalbusiness/dap-contract";
import { snapshotInput, stagedRefName, type AncestryCheck } from "@generalbusiness/dap-derive";
import type { EffectAnswer, EffectRequest } from "@generalbusiness/dap-scope";
import { Host } from "./graph.ts";

/** STAND-IN: no provider, repository, credential or Git walk exists here.
 * Native operations carry these scripted replies through the real ledger. */
export class WorkspaceStandIn extends Host {
  constructor(public head: string, readonly ends: () => string) { super(); }
  override accepts(owner: string, kind: string): boolean {
    return owner === "hold@2" && ["head", "fork", "mint", "revoke", "stage", "check"].includes(kind);
  }
  override send(request: EffectRequest): EffectAnswer | null {
    this.asked.push(request.kind);
    const effects: readonly (Effect | GenesisEffect)[] = request.origin.entry.effects;
    const records = effects.filter((effect): effect is Extract<Effect, { effect: "record" }> => effect.effect === "record");
    const answer = (body: FieldValue, basis: "own-answer" | "read" = "own-answer"): EffectAnswer => ({ result: "confirmed", evidence: { basis, body } });
    if (request.kind === "head") return answer({ commit: this.head });
    if (request.kind === "fork") {
      const fork = records.find(record => record.kind === "fork" && record.values["operation"] === request.operation);
      if (!fork) return null;
      const name = `scripted-j4-${fork.key[0]}`;
      return answer({ id: name, name });
    }
    if (request.kind === "mint") return answer({ token: `scripted-token-${request.operation}`, ends: this.ends() });
    if (request.kind === "revoke") return answer({});
    if (request.kind === "stage") {
      const root = records.find(record => record.kind === "root" && record.values["operation"] === request.operation);
      if (!root) return null;
      const commit = root.values["commit"] as string;
      const ref = stagedRefName(request.scope, commit, root.key[0] as number);
      this.refs.push({ ref, target: commit });
      return answer({ ref, value: commit }, "read");
    }
    const pin = records.find(record => record.kind === "pin" && record.values["check"] === request.operation);
    const snapshot = snapshotInput(this.refs);
    if (!pin || !snapshot) return null;
    const record: AncestryCheck = {
      commit: pin.values["commit"] as string,
      root: { number: pin.values["root"] as number, state: "live" },
      head: this.head, snapshot: { digest: snapshot.digest, count: this.refs.length },
      start: { foreign: null }, stops: [], F: [], visited: 1,
    };
    return { ...answer({ record } as unknown as FieldValue), retain: [snapshot] };
  }
}
