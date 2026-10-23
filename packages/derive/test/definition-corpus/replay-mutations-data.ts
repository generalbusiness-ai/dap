/** Pure raw changes shared with existing replay fixture wrappers. No history,
 * validation or test registration runs when this module is imported. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Digest } from "@generalbusiness/dap-contract";
import { STEP_ROWS } from "./observes-data.ts";
export const replayArchiveEvidenceValue = { domain: "archive-fixture-evidence-1", max: 64 } as const;
export const replayProofDomain = "gate-proof-1";
export type ReplayDeclarationChange = (data: any) => void;

export const stagingGateDeclaration = (placed: boolean, held?: ReplayDeclarationChange): ReplayDeclarationChange => (data) => {
      data.name = "platform:task";
      data.acts.enter.grant = "gate.enter";
      held?.(data);
      if (placed) data.acts.issue.fields.proof = { type: "digest", required: false, value: { domain: replayProofDomain, max: 64 } };
    };

export const weighingDeclaration = (which: string): ReplayDeclarationChange => (data) => { if (which === "steps" || which === "absent") { data.outcomes.weigh.origin = "opening"; data.outcomes.weigh.observes = STEP_ROWS; } };

export const archiveObservation = (rulesExtents: unknown): ReplayDeclarationChange => data => {
    for (const key of Object.keys(data.acts)) if (!["establish", "point", "go"].includes(key)) delete data.acts[key];
    data.outcomes = {}; data.rules = {};
    data.items.desk.refs.peer.to.kind = "directory";
    data.acts.point.fields.peer.kind = "directory";
    data.acts.go.sends[0].tell.observes.applied[0].retains = [rulesExtents];
  };

export const archiveOutcomeValue: ReplayDeclarationChange = data => {
    data.name = "platform:task";
    data.acts.issue.effects.push({ code: "archive-open", row: "P16", most: { effects: 0, operations: ["probe"] } });
    data.outcomes.probe.attempts = 1;
  };

export const archiveStagingFactory = (stagingDigest: Digest): ReplayDeclarationChange => data => {
    for (const send of data.acts["open-issue"]!.sends) if ("create" in send) send.create.definition = stagingDigest;
  };

export const archiveObservationPeer: ReplayDeclarationChange = data => {
    data.receives.ask = { message: "ask", class: "tell", from: { kind: "directory" }, opens: null, fields: {}, also: {}, guards: [], effects: [], sends: [], attention: [] };
  };

export const earlierFieldProof: ReplayDeclarationChange = data => {
    data.capacity = { name: "whole-scope", version: 1 };
    const body = { type: "text", detached: true, max: 4, required: true };
    data.acts.write.fields.body = body;
    data.receives.noted = { class: "tell", message: "noted", from: { kind: "lane" }, opens: "note", fields: { body }, also: {}, guards: [], effects: [{ value: { slot: "body", from: { field: "body" } } }], sends: [], attention: [] };
  };

export const genesisQuietActs: ReplayDeclarationChange = data => {
    for (let i = 0; i < 8; i++) data.acts[`quiet-${i}`] = { ...structuredClone(data.acts.vouch), presents: {}, guards: [], sends: [] };
  };

export const recoveredText = (max: number): ReplayDeclarationChange => d => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.acts["add-note"] = structuredClone(d.acts.start);
    d.items.note.values.body.of = { type: "text", detached: true, max };
    d.acts.write.fields.body = { type: "text", detached: true, max, required: true };
  };

export const recoveredChild: ReplayDeclarationChange = d => { d.capacity = { name: "whole-scope", version: 1 }; };

export const recoveredTransitiveTarget: ReplayDeclarationChange = d => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.acts.vouch.presents.proof.kind = ["vouch"];
    d.acts["vouch-alias"] = structuredClone(d.acts.vouch);
    d.acts["vouch-alias"].presents.proof.under = "platform:task";
    d.acts["vouch-alias"].presents.proof.kind = ["vouch", "retain"];
  };

export const recoveredSmallChild: ReplayDeclarationChange = d => {
    d.name = "smallnotes"; d.capacity = { name: "whole-scope", version: 1 };
    d.acts.start.fields = { body: { type: "text", detached: true, max: 1, required: true }, other: { type: "int", min: 0, max: 9, required: true } };
  };

export const recoveredSender = (child: Digest): ReplayDeclarationChange => d => {
    d.acts["copy"] = { ...structuredClone(d.acts.vouch), presents: {}, guards: [], fields: { body: { type: "text", detached: true, max: 32768, required: true } }, sends: [{ create: { kind: "lane", definition: child, fields: { body: { field: "body" }, other: { const: "wrong type" } }, result: {} } }] };
  };

export const recoveredRefusalTarget: ReplayDeclarationChange = d => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.acts.vouch.presents.proof = { kind: ["start"], under: "smallnotes", required: true };
    d.acts["vouch-alias"] = structuredClone(d.acts.vouch);
    d.acts["vouch-alias"].presents.proof = { kind: ["retain"], under: "platform:task", required: true };
  };

export const floorProofActs: ReplayDeclarationChange = data => {
    data.acts.pulse = { step: "transition", on: "note", grant: "pulse", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
    data.acts.prove = { ...data.acts.pulse, grant: "prove", fields: { proof: { type: "fact", kind: ["pulse"], under: "notes", required: true } } };
  };

export const floorPricedKeys: ReplayDeclarationChange = data => {
    data.capacity = { name: "whole-scope", version: 1 };
    data.acts.pulse = { step: "transition", on: "note", grant: "pulse", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
  };

export const capacityLargeText: ReplayDeclarationChange = d => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.items.note.values.body.of = { type: "text", detached: true, max: 32000 };
    d.acts.write.fields.body = { type: "text", detached: true, max: 32000, required: true };
    d.acts["add-note"] = structuredClone(d.acts.start);
  };

export const capacityLargeTextAgain: ReplayDeclarationChange = d => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.items.note.values.body.of = { type: "text", detached: true, max: 32000 };
    d.acts.write.fields.body = { type: "text", detached: true, max: 32000, required: true };
    d.acts["add-note"] = structuredClone(d.acts.start);
  };

export const capacityWhole: ReplayDeclarationChange = d => { d.capacity = { name: "whole-scope", version: 1 }; };

export const capacityTwoSpans: ReplayDeclarationChange = d => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.acts["add-note"] = structuredClone(d.acts.start);
  };

export const replayHolding = (probes: number) : ReplayDeclarationChange => (data: any) => { data.items.ticket.holds = { operations: { probe: probes } }; data.outcomes.probe = { ...data.outcomes.probe, attempts: 1, most: { effects: 0, operations: ["probe"] } }; };

export const replayChained: ReplayDeclarationChange = (data: any) => { data.items.ticket.holds = { operations: { probe: 1 } }; data.outcomes.probe = { ...data.outcomes.probe, attempts: 1, most: { effects: 0, operations: ["after"] } }; data.outcomes.after = { code: "after", row: "P16", attempts: 3 }; };
