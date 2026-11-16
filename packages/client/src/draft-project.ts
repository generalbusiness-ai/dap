/** Pure routing of owned admitted draft data and genuine C3 evidence. No acquisition or recapture. */
import type { DeclaredDefinition, FactRef } from "@generalbusiness/dap-contract";
import { same } from "@generalbusiness/dap-bytes";
import type { Kind } from "./declared.ts";
import { draftNowOf, nowMovement } from "./draft-now.ts";
import { draftIndex, slotFor, type EditableValues, type SlotInput } from "./draft-slot.ts";
import { descriptorFor, type StoredDraft } from "./draft-store.ts";
import type { SignedEntry } from "./replica.ts";
import { requestEntryDecision } from "./request-entry-decision.ts";
import type { AnyDraftContent, AnyDraftView, DraftKeyEvidence, DraftKeyRoute, DraftPresentation, DraftProjection,
  DraftProjectInput, DraftRequestListEntry, DraftReturnView, DraftViewKinds, HeldStoredIntention, LocalDraftActivity, ProjectStoredKey } from "./draft-project-types.ts";

function requireFact(condition: unknown, message: string): asserts condition {
  if (!condition) throw new TypeError(`invalid draft projection: ${message}`);
}
/** Entry place is evidence only; held rows supply no present meaning or C3 status. */
function heldEntry<D extends DeclaredDefinition>(cell: ProjectStoredKey<D>): SignedEntry | undefined {
  if (cell.is === "current") return cell.evidence.is === "non-request" ? cell.evidence.verifiedEntry : undefined;
  return cell.evidence.is === "absent" || cell.evidence.is === "non-request" ? cell.evidence.verifiedEntry : undefined;
}
function entryPlace<D extends DeclaredDefinition>(cell: ProjectStoredKey<D>): FactRef | undefined {
  const held = heldEntry(cell);
  if (!held) return undefined;
  const { at, seq, hash } = held.fact;
  return { at: { scope: at.scope, genesis: at.genesis }, seq, hash };
}
function checkedEvidence<D extends DeclaredDefinition>(input: DraftProjectInput<D>, cell: ProjectStoredKey<D>): void {
  const { stored, evidence } = cell;
  requireFact(stored.owner === input.binding.owner && same(stored.scope, input.binding.scope), "stored namespace differs");
  if (cell.is === "current") {
    requireFact(stored.definition === input.binding.definition && stored.descriptor === descriptorFor(input.binding, stored.slot.kind), "current binding differs");
    requireFact(["entry", "absent", "request", "non-request"].includes(cell.evidence.is), "unknown current coverage arm");
    if (cell.evidence.is === "request") requireFact(["pending", "refused", "withdrawn"].includes(cell.evidence.status.status), "entry status in a non-entry arm");
    if (cell.evidence.is === "entry") requireFact(cell.evidence.observed.is === "found" || cell.evidence.observed.is === "absent", "missing direct entry coverage");
    requireFact(cell.local.is === "idle" || cell.local.is === "submitting", "missing local activity");
    if (cell.local.is === "submitting") requireFact(same(cell.local.against, stored), "local submit owns another draft");
  } else {
    requireFact(cell.is === "historical" || cell.is === "dismissed", "unknown stored binding arm");
    requireFact(["absent", "non-request", "ordinary"].includes(cell.evidence.is), "unknown historical coverage arm");
    if (cell.is === "historical") requireFact(stored.definition !== input.binding.definition || stored.descriptor !== descriptorFor(input.binding, stored.slot.kind), "historical binding equals current");
    if (cell.evidence.is === "ordinary") requireFact(cell.evidence.view.key === stored.key, "ordinary C3 view names another key");
  }
  if (evidence.is === "non-request") requireFact(evidence.excludedBy === "standalone", "unknown C3 exclusion");
  const identity = { ...input.identity, key: stored.key };
  requireFact(same(evidence.identity, identity), "direct-read identity differs");
  const observed = evidence.is === "entry" ? evidence.observed
    : evidence.is === "absent" ? { is: "absent" as const } : { is: "found" as const, occurrence: evidence.occurrence };
  if (observed.is === "found") requireFact(same(observed.occurrence.identity, identity), "occurrence identity differs");
  const entry = evidence.is === "entry" ? evidence.entry : heldEntry(cell);
  if (entry) requireFact(same(entry.fact.at, input.binding.scope)
    && entry.actor === input.binding.owner && entry.key === stored.key, "entry belongs to another identity");
}
function content<D extends DeclaredDefinition>(definition: D, stored: StoredDraft): AnyDraftContent<D> {
  const declaration = Object.hasOwn(definition.acts, stored.act.kind) ? definition.acts[stored.act.kind] : undefined;
  requireFact(declaration && stored.act.kind !== definition.genesis, "draft kind is not declared");
  const kind = stored.act.kind as Kind<D>;
  // Store refinement proves the named refs; slotFor checks the actual kind/address correlation again.
  const slot = slotFor(definition, kind, { on: stored.namedRefs.on, fields: stored.namedRefs.fields } as SlotInput<D, Kind<D>>);
  const fields = Object.entries(stored.act.fields).filter(([name]) => {
    const field = Object.hasOwn(declaration.fields, name) ? declaration.fields[name] : undefined;
    requireFact(field, "draft field is not declared");
    return field.type !== "item";
  });
  // Present values already passed store refinement. Only their per-kind generic correlation needs this assertion.
  const values = Object.fromEntries(fields) as EditableValues<D, Kind<D>>;
  return { key: stored.key, kind, slot, values, ...(stored.after === undefined ? {} : { after: { key: stored.after } }) } as AnyDraftContent<D>;
}
/** One stored shape, two causes. Both arms recompute `now` here from the kept draft and the cut's rows. Nothing is written. */
function returned<D extends DeclaredDefinition>(input: DraftProjectInput<D>, stored: StoredDraft, evidence: DraftKeyEvidence): DraftReturnView | undefined {
  const kept = stored.returned;
  const view = () => draftNowOf({ definition: input.definition, stored, scope: input.binding.scope, cut: input.cut });
  if (evidence.is === "request" && evidence.status.status !== "pending") {
    if (!kept || !same(kept.againstCustody, evidence.occurrence)) return { by: "request", ...evidence.status, now: view() };
  }
  if (kept === undefined) return undefined;
  // A same-C0 outcome or actual direct absence supplies no later kept occurrence.
  const now = view();
  return { by: "exploration", cause: kept.cause, movement: now.is === "now" ? nowMovement(now.now) : null, now };
}
function presentation<D extends DeclaredDefinition>(input: DraftProjectInput<D>, stored: StoredDraft, evidence: DraftKeyEvidence, active: LocalDraftActivity, stopped: boolean): DraftPresentation {
  if (stopped) return { state: "editing" };
  if (active.is === "submitting") return { state: "submitting" };
  const held = returned(input, stored, evidence);
  return { state: "editing", ...(held === undefined ? {} : { returned: held }) };
}

/** Inputs are data for one candidate. Errors are candidate-contract errors, never new member Stops. */
export function projectDrafts<const D extends DeclaredDefinition>(supplied: DraftProjectInput<D>): DraftProjection<D> {
  const input = structuredClone(supplied), { definition, binding } = input;
  requireFact(input.identity.signer === binding.owner && same(input.identity.target, binding.scope), "fixed member identity differs");
  const keys = new Set<string>(), slots: AnyDraftView<D>[] = [];
  const requests: DraftRequestListEntry<D>[] = [], routing: DraftKeyRoute<D>[] = [];
  const stopped = input.state.is === "stopped";
  const storedRoute = (cell: ProjectStoredKey<D>, route: "slot" | "list" | "recorded" | "dismissed"): void => {
    routing.push({ from: "stored", key: cell.stored.key, route, address: cell.stored.slot, source: cell });
  };
  for (const cell of input.stored) {
    const { stored } = cell;
    requireFact(!keys.has(stored.key), "key occurs twice"); keys.add(stored.key);
    checkedEvidence(input, cell);
    if (cell.is !== "current") {
      const kept = cell.evidence.is === "ordinary" ? cell.evidence.view : null;
      if (kept?.status === "recorded") { storedRoute(cell, "recorded"); continue; }
      if (cell.is === "dismissed") { storedRoute(cell, "dismissed"); continue; }
      if (kept) requests.push(kept);
      else {
        const entry = entryPlace(cell);
        // Planner 6d3b979f item 4: the definition is checked first, so a row that differs in both shows `another-definition`.
        requests.push(stored.definition !== input.binding.definition
          ? { is: "held-intention", reason: "another-definition", key: stored.key, definition: stored.definition, ...(entry === undefined ? {} : { entry }) }
          : { is: "held-intention", reason: "another-descriptor", key: stored.key, descriptor: stored.descriptor, ...(entry === undefined ? {} : { entry }) });
      }
      storedRoute(cell, "list"); continue;
    }
    const current = cell.evidence, draft = cell.stored;
    const entry = current.is === "entry" ? requestEntryDecision(current.entry, current.presentMeaning) : null;
    if (entry?.status === "recorded") { storedRoute(cell, "recorded"); continue; }
    const partial = content(definition, draft);
    if (current.is === "entry") {
      requireFact(entry?.status === "other-recorded", "entry decision is missing");
      requests.push({ is: "draft", ...partial, status: "other-recorded", predicted: { is: "recorded", fact: current.entry.fact } });
      storedRoute(cell, "list"); continue;
    }
    if (current.is === "request" && current.status.status === "pending") {
      requests.push({ is: "draft", ...partial, status: "pending", predicted: current.predicted });
      storedRoute(cell, "list"); continue;
    }
    if (current.is === "non-request") {
      // This one arm states no C3 status, Why, prediction or signability.
      const entry = entryPlace(cell);
      const held = { is: "held-intention", reason: "nonrequest-held", key: partial.key, kind: partial.kind, values: partial.values,
        ...(entry === undefined ? {} : { entry }) } as HeldStoredIntention<D>;
      requests.push(held); storedRoute(cell, "list"); continue;
    }
    const view = { ...partial, ...presentation(input, draft, current, cell.local, stopped) } as DraftViewKinds<D>[Kind<D>];
    if (draft.placement === "slot") { slots.push(view); storedRoute(cell, "slot"); }
    else { requests.push({ is: "draft", ...view } as DraftRequestListEntry<D>); storedRoute(cell, "list"); }
  }
  for (const request of input.custodyOnly) {
    requireFact(!keys.has(request.key), "custody-only key overlaps another route"); keys.add(request.key);
    if (request.status === "recorded") routing.push({ from: "custody", key: request.key, route: "recorded", source: request });
    else { requests.push(request); routing.push({ from: "custody", key: request.key, route: "list", source: request }); }
  }
  return { drafts: draftIndex<D, DraftViewKinds<D>>(definition, slots), requests: structuredClone(requests), routing: structuredClone(routing) };
}
