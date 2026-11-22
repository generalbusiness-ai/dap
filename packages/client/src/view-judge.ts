/** The pure E1 judge over one privately captured replica cut and checked session. */
import { PROPOSED_BOUNDS, type DeclaredDefinition, type KeyId, type MemberRef, type Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, timeMs } from "@generalbusiness/dap-bytes";
import { actionOf, clockOf, judgeExploreGrant, membershipOf, type StateView, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { DeclaredHandle, Kind } from "./declared.ts";
import { actExplore } from "./act-explore.ts";
import { missingActInputs } from "./act-input.ts";
import type { Act, ActView, Exploration, PartialAct } from "./act-types.ts";
import type { ExploreRead } from "./replica-explore.ts";
import { Session, sessionStanding } from "./session.ts";
import { checkedViewSession } from "./checked-view-session.ts";
import { scopeUsesSession } from "./scope-reader.ts";
import type { RecordedActAlias } from "./act-projection.ts";
import type { viewCut } from "./view-cut.ts";

export type RecordedViewCut = NonNullable<ReturnType<typeof viewCut>>;

/** No adapter-supplied member, target or standing is accepted without the checked session and handle. */
export function viewJudge<D extends DeclaredDefinition>(handle: DeclaredHandle<D>, definition: ValidDefinition,
  cut: RecordedViewCut, actor: KeyId, member: MemberRef, reading: Timestamp, observed: ExploreRead | null,
  sources: readonly RecordedActAlias[] = []) {
  const genesis = cut.own(0)?.entry.input;
  const membership = genesis?.type === "genesis" ? membershipOf(genesis, handle.at) : null;
  const session = observed?.is === "ready" && observed.session instanceof Session && checkedViewSession(observed.session) ? observed.session : null;
  const started = observed?.is === "ready" ? observed.requestedAt : undefined;
  const began = started === undefined ? null : timeMs(started), now = timeMs(reading);
  const claims = session?.claims;
  const standing = session && claims && membership ? sessionStanding(session.standing, { membership, key: actor }, claims) : null;
  const valid = !!(session && claims && membership && started && began !== null && now !== null && now >= began
    && Number.isSafeInteger(now - began) && !Session.prototype.endedBy.call(session, reading) && scopeUsesSession(handle.scope, session)
    && claims.key === actor && claims.member === member.member && canonicalize(claims.membership) === canonicalize(member.membership)
    && canonicalize(membership) === canonicalize(member.membership) && standing);
  const authority = valid ? { standing: structuredClone(standing!), claims: structuredClone(claims!), requestedAt: started!, authorityAge: now! - began! } : null;
  const context = { scope: structuredClone(handle.at), definition: handle.digest, head: structuredClone(cut.head), assumes: [], actor,
    standing: null, clock: reading, evidence: [] };
  const snapshot = cut.state.all();
  const usable = definition.declared.capabilities.length === 0 && snapshot.operations.length === 0 && (snapshot.records?.length ?? 0) === 0;
  const judge = <K extends Kind<D>>(key: string, input: PartialAct<D, K>, view: StateView | ActView<D> = cut.state): Exploration<D, K> => {
    const copied = structuredClone(input), missing = missingActInputs(definition.declared, copied);
    if (missing.length || copied.kind === undefined) return { is: "incomplete", act: copied, missing };
    const act = { kind: copied.kind, on: copied.on ?? null, fields: copied.fields ?? {},
      ...(copied.expected === undefined ? {} : { expected: copied.expected }) } as Act<D, K>;
    const unavailable = (lack: "authority-unavailable" | "source" | "entry"): Exploration<D, K> => ({ is: "unavailable", act, context: structuredClone(context), lacks: [lack] });
    if (!authority || !membership) return unavailable("authority-unavailable");
    if (!usable) return unavailable("source");
    const declaration = definition.declared.acts[act.kind], action = declaration ? actionOf(declaration, definition) : null;
    if (!action) return unavailable("authority-unavailable");
    const clock = clockOf(cut.state, reading), grant = judgeExploreGrant(authority.standing, { scope: handle.at, membership, key: actor, action, clock });
    if (grant.result === "authority-unavailable") return unavailable("authority-unavailable");
    cut.take();
    try {
      const result = actExplore<D, K>(definition, view, { key, act: copied, recordedAliases: sources, context: { actor, scope: handle.at, clock,
        bounds: PROPOSED_BOUNDS, facts: [], prepared: [], own: cut.own, grants: grant.result === "current" ? [{ grant: grant.grant, current: true }] : [],
        membership, owners: null, evidence: [], authority } });
      return cut.take().length ? unavailable("entry") : result;
    } catch (error) {
      if (cut.take().length) return unavailable("entry");
      throw error;
    }
  };
  const who = (kind: Kind<D>): import("./describe.ts").Who => {
    if (!authority || !membership) return { standing: "unknown" };
    const declaration = definition.declared.acts[kind], action = declaration ? actionOf(declaration, definition) : null;
    if (!action) return { standing: "unknown" };
    const result = judgeExploreGrant(authority.standing, { scope: handle.at, membership, key: actor, action, clock: clockOf(cut.state, reading) });
    if (result.result === "authority-unavailable") return { standing: "unknown" };
    return result.result === "current" ? { standing: "holds", role: authority.standing.role }
      : { standing: "lacks", role: authority.standing.role };
  };
  return { judge, authority, who };
}
