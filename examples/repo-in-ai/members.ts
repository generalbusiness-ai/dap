/** The S1 witness reads real membership records, including controller slots. */
import { canonicalize, isMemberRef } from "@generalbusiness/dap-bytes";
import type { MemberRef } from "@generalbusiness/dap-contract";
import { storedSigner } from "../../packages/cli/src/store-signer.ts";
import { retain, type Identity } from "./plan.ts";
import type { Session } from "./session.ts";
import { roomRefs } from "./workflow.ts";

export interface MemberWitness { identity: Identity; handle: string; kind: "person" | "agent" | "checker"; role: string; controller: MemberRef | null }
export async function witnessMembers(sessions: Record<Identity, Session>): Promise<readonly MemberWitness[]> {
  const owner = sessions.owner, refs = await roomRefs(owner), summary = await owner.read(refs.membership);
  const ownerConfig = await owner.ctx.store.config();
  if (!ownerConfig?.handle) throw new Error("The owner handle is missing.");
  const controller = { membership: refs.membership, member: ownerConfig.handle };
  if (!isMemberRef(controller)) throw new Error("The owner membership reference is invalid.");
  const witnesses: MemberWitness[] = [];
  for (const identity of ["owner", "agent-a", "agent-b", "checker"] as const) {
    const session = sessions[identity], config = await session.ctx.store.config();
    if (!config?.repository || !config.handle || canonicalize(config.repository.membership) !== canonicalize(refs.membership)) throw new Error("An identity is enrolled in a different room.");
    const signer = await storedSigner(session.ctx.store, config.key);
    const members = summary.items.filter(item => item.type === "member" && item.state === "active" && item.values["handle"] === config.handle);
    const kind = identity === "owner" ? "person" : identity === "checker" ? "checker" : "agent";
    const role = identity === "owner" ? "admin" : kind;
    const member = members[0];
    const expected = { membership: refs.membership, member: config.handle };
    const keys = summary.items.filter(item => item.type === "key" && item.state === "active" && item.values["id"] === signer?.key);
    if (!signer || members.length !== 1 || !member || member.values["kind"] !== kind || member.values["role"] !== role
      || !isMemberRef(member.parties["member"]) || canonicalize(member.parties["member"]) !== canonicalize(expected)
      || keys.length !== 1 || keys[0]!.refs["member"] !== member.id || keys[0]!.values["kind"] !== kind
      || (kind === "agent" ? canonicalize(member.parties["controller"]) !== canonicalize(controller) : member.parties["controller"] !== null)) throw new Error("Membership does not show the required kind, role, controller and active key.");
    witnesses.push({ identity, handle: config.handle, kind, role, controller: kind === "agent" ? controller : null });
  }
  await retain(owner.ctx.store, "s1-members", { scope: refs.membership, witnesses });
  return witnesses;
}
