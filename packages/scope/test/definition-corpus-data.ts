import { STEP_ROWS } from "../../derive/test/definition-corpus/observes-data.ts";
import { DOMAINS, type PlatformData } from "@generalbusiness/dap-contract";
import { notes } from "../../derive/test/definition-corpus/fixture-data.ts";
import { standingData } from "../../derive/test/fixtures-standing.ts";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { counting } from "../../../apps/counter/definition.ts";
import { COUNTING_DEFINITION } from "../../../apps/counter/pin.ts";
import { devicePackageFixture } from "../../derive/test/fixtures-device-command.ts";
/** Shared raw Scope/archive mutations. No validator or native history is constructed. */
import type { DeclaredDefinition, Digest, SendForm, FieldType } from "@generalbusiness/dap-contract";
import { lane } from "../../derive/test/definition-corpus/fixture-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export function scopeData<T extends DeclaredDefinition | PlatformData>(base: T, change: (definition: any) => void): T {
  const data = structuredClone(base); change(data); return data;
}
export const scopeLaneChange = () => (def: any) => {
  def.items.hold.max = 4;
  def.rules["not-self"] = "fields.performer.member != signer.member";
  def.acts.assign.guards.push({ rule: "not-self" });
  def.acts.remark.fields.proof = { type: "fact", kind: ["assign"], under: "lane", required: false };
  def.acts["accept-report"].settles = { of: "on", in: ["reported"] };
};
export const scopeArchiveChange = () => (data: any) => { data.acts["link"]!.sends = data.acts["link"]!.sends.filter((send: SendForm) => !("create" in send)); };
export const scopeFactoryChange = () => (data: any) => {
  data.capabilities = []; delete data.items.hold;
  delete data.acts["take-hold"]; delete data.acts.renew; delete data.timed["hold-end"];
};
export const scopeScaleChange = () => (data: any) => {
  data.acts.remark.step = "transition"; // No effects: the primary item stays unchanged.
  data.rules["archive-text"] = 'fields.text != ""';
  data.acts.remark.guards.push({ rule: "archive-text" });
};
export const scopeStagedChange = () => (def: any) => {
  // The fixture's acts share one object of fields, so the report gets its own.
  def.acts.report.fields = { ...def.acts.report.fields, commit: { type: "commit", required: true } };
  def.acts.report.guards.push({ capability: { name: "hold", guard: "staged", with: { commit: { field: "commit" }, under: { item: "also.commitment" } } } });
};
export const archiveActFieldsChange = (detached: boolean) => (data: any) => {
    data.acts["remark"]!.fields["text"] = { type: "text", max: 128, required: true, ...(detached ? { detached: true } : {}) };
    data.acts["remark"]!.fields["extra"] = { type: "text", max: 128, required: false };
  };
export const archiveReceiverChange = () => (data: any) => {
  // Same producer name, different exact pin: the name cannot choose policy.
  data.acts.remark.fields.text.max = 127;
  data.acts.remark.fields.proof.kind = ["assign", "found"];
  data.acts.link.sends = data.acts.link.sends.filter((send: SendForm) => !("create" in send));
};
export const archiveMembershipProofChange = () => (data: any) => { data.acts.remark.fields.proof.kind = ["seat"]; data.acts.remark.fields.proof.under = "platform:membership"; };
export const archiveInventoryChange = () => (data: any) => {
  data.acts["link"]!.sends = data.acts["link"]!.sends.filter((send: SendForm) => !("create" in send));
  data.acts["remark"]!.fields["text"] = { type: "text", max: 128, detached: true, required: true };
};
export function archiveLeafData(name: string, child?: Digest): DeclaredDefinition { return {
  format: "artroom-definition-1", name, profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "found",
  items: { root: { many: false, max: 1, states: { live: { final: false } }, initial: "live", parties: {}, refs: {}, values: {} } },
  acts: { "found": { step: "open", on: "root", grant: "found", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] },
    spawn: { step: child ? "transition" : "comment", on: "root", grant: "spawn", also: {}, fields: {}, guards: [], effects: [], sends: child ? [{ create: { kind: "lane", definition: child, fields: {}, result: {} } }] : [], attention: [] } },
  receives: {}, timed: {}, rules: {},
}; }
export const archiveInventoryParentChange = (child: { readonly digest: Digest }) => (data: any) => { data.acts["link"].sends.push({ create: { kind: "lane", definition: child.digest, fields: {}, result: {} } }); };
export const archiveInventoryAlwaysChange = () => (data: any) => { data.rules["always"] = "true"; };
export const archiveWrongProducerChange = () => (data: any) => { data.name = "test.wrong-foreign-producer"; };
export const archiveTextChange = () => (data: any) => { data.capacity = { name: "whole-scope", version: 1 }; data.acts["remark"]!.fields["text"] = { type: "text", max: 1024, detached: true, required: true }; };
export const scopeLaneData = () => scopeData(lane, scopeLaneChange());
export const scopeArchiveData = () => scopeData(scopeLaneData(), scopeArchiveChange());
export const scopeFactoryData = () => scopeData(scopeArchiveData(), scopeFactoryChange());
export const scopeScaleData = () => scopeData(scopeFactoryData(), scopeScaleChange());
export const scopeInventoryData = () => scopeData(scopeLaneData(), archiveInventoryChange());
export const scopeReceiverData = () => scopeData(scopeLaneData(), archiveReceiverChange());
export const capacityLaneChange = () => (d: any) => {
  d.capacity = { name: "whole-scope", version: 1 };
  d.acts.link.sends = d.acts.link.sends.filter((send: SendForm) => !("create" in send));
};
export const capacityRequestChange = () => (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.acts.link.sends = d.acts.link.sends.filter((send: SendForm) => !("create" in send));
    d.acts.offer.sends = [{ create: { kind: "lane", definition: "self", fields: { title: { const: "child" }, opener: { signer: true } }, result: {} } }];
  };
export const capacityHoldReaderChange = () => (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    const form = { step: "transition", on: "intent", grant: "report", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
    d.acts = {
      file: d.acts.file,
      touch: { ...form, effects: [{ capability: { name: "hold", do: "settle", with: { export: { const: 0 } } } }] },
      inspect: { ...form, guards: [{ capability: { name: "hold", guard: "staged", with: {} } }] },
    };
    d.receives = {}; d.timed = {};
  };
export const capacityTokenOwnerChange = () => (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    // Close the fixture declaration: its unused link form names a dummy
    // child whose birth-time retention is outside this token witness.
    d.acts.link.sends = d.acts.link.sends.filter((send: SendForm) => !("create" in send));
    d.capabilities.push({ name: "git-read", version: 1 });
    const name = { type: "text", max: 64 };
    const checks = { type: "list", max: 4, of: { type: "record", of: { name: { ...name, required: true }, checker: { type: "member", required: true } } } };
    d.items.rules = { many: false, max: 1, states: { current: { final: false } }, initial: "current", parties: {}, refs: {}, values: { checks: { fixed: true, required: true, of: checks } } };
    d.items.job = { many: true, max: 4, states: { requested: { final: false } }, initial: "requested", parties: {}, refs: {}, values: { name: { fixed: true, required: true, of: name }, deadline: { fixed: true, required: true, of: { type: "time" } } } };
    const form = { grant: "report", also: {}, guards: [], sends: [], attention: [] };
    d.acts.publish = { ...form, step: "open", on: "rules", fields: { checks: { ...checks, required: true } }, effects: [{ value: { slot: "checks", from: { field: "checks" } } }] };
    d.acts["request-check"] = { ...form, step: "open", on: "job", fields: { name: { ...name, required: true } }, effects: [{ value: { slot: "name", from: { field: "name" } } }, { value: { slot: "deadline", from: { time: { plusSeconds: 1800 } } } }] };
  };
export const capacityRecoveredTextChange = () => (d: any) => {
    d.capacity = { name: "whole-scope", version: 1 };
    d.items.note.values.body.of = { type: "text", detached: true, max: 32768 };
    d.acts.write.fields.body = { type: "text", detached: true, max: 32768, required: true };
  };
export const composeWholeTicketChange = () => (d: any) => { d.capacity = { name: "whole-scope", version: 1 }; };
export const composeWholeDeskChange = (ticketDefinition: { readonly digest: Digest }, under: { readonly digest: Digest }) => (d: any) => {
      for (const form of [...Object.values(d.acts), ...Object.values(d.receives)] as { sends: { create?: { definition: string } }[] }[]) for (const send of form.sends) if (send.create?.definition === ticketDefinition.digest) send.create.definition = under.digest;
    };
export const creationStagedRenewChange = () => (d: any) => {
      d.acts.renew.guards.push({ capability: { name: "hold", guard: "staged", with: {} } });
    };
export const creationNoAttentionChange = () => (def: any) => { def.timed["hold-end"].attention = []; };
export const creationProofChange = () => (def: any) => {
      def.acts[def.genesis].fields.proof = { type: "fact", kind: ["assign"], under: "lane", required: false };
    };
export const creationStagedReportChange = () => (def: any) => {
      def.acts.report.fields.commit = { type: "commit", required: true };
      def.acts.report.guards.push({ capability: { name: "hold", guard: "staged", with: { commit: { field: "commit" }, under: { item: "also.commitment" } } } });
      def.acts.report.effects.push({ capability: { name: "hold", do: "pin-hold", with: { commit: { field: "commit" } } } });
    };
export const floorKeptChange = () => (data: any) => { data.items.commitment.max = 5000; };
export const floorMonotonicChange = () => (data: any) => {
    data.items.intent.refs.previous = { fixed: false, required: false, to: { type: "item", of: "commitment" } };
    const transition = { step: "transition" as const, grant: "remark", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
    data.acts.finish = { ...transition, on: "commitment", guards: [{ state: ["offered", "accepted"] }], effects: [{ state: "done" }] };
    data.acts.remember = { ...transition, on: "intent", fields: { previous: { type: "item", of: "commitment", required: true } }, effects: [{ ref: { slot: "previous", from: { field: "previous" } } }] };
    data.acts.remark.fields.proof = { type: "fact", kind: ["offer"], under: "lane", required: false };
  };
export const floorReceiverChange = () => (data: any) => {
    data.receives.ack = { class: "tell", message: "ack", from: { kind: "directory" }, opens: null, also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
  };
export const floorSenderChange = () => (data: any) => {
    data.items.intent.refs.peer = { fixed: false, required: false, to: { type: "scope", kind: "directory" } };
    data.acts.ask = { step: "transition", on: "intent", grant: "remark", also: {}, fields: { peer: { type: "scope", kind: "directory", required: true } }, guards: [], effects: [{ ref: { slot: "peer", from: { field: "peer" } } }], sends: [{ tell: { to: { slot: "peer" }, message: "ack", fields: {}, result: {} } }], attention: [] };
  };
export const floorPendingChange = () => (data: any) => {
    data.capacity = { name: "whole-scope", version: 1 };
    data.acts.remark.fields.text = { type: "text", max: 64, detached: true, required: true };
    data.acts.offer.sends = [{ create: { kind: "lane", definition: "self", fields: { title: { const: "a pending child" }, opener: { signer: true } }, result: {} } }];
  };
export const observabilityCountChange = (count: number) => (def: any) => { def.items.request.max = count; };
export const operationStagedChange = () => (def: any) => { def.acts.report.guards.push({ capability: { name: "hold", guard: "staged", with: { commit: { field: "commit" }, under: { item: "also.commitment" } } } }); def.acts.report.fields.commit = { type: "commit", required: true }; };
export const replayRecordedChange = () => (def: any) => { def.level = { name: "recorded", version: 1 }; };
export const scopeTextChange = (body: FieldType) => (def: any) => {
  const act = (a: object) => ({ on: "note", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });
  const kept = [{ state: ["kept"] }];
  const write = [{ value: { slot: "body", from: { field: "body" } } }];
  def.acts = {
    start: act({ step: "open", grant: "start", fields: { body: { ...body, required: false } }, effects: write }),
    write: act({ step: "open", grant: "write", fields: { body: { ...body, required: true } }, effects: write }),
    edit: act({ step: "transition", grant: "write", fields: { body: { ...body, required: true } }, guards: kept, effects: write }),
    strike: act({ step: "transition", grant: "strike", guards: kept, effects: [{ state: "struck" }, { redact: { slot: "body" } }] }),
    copy: act({ step: "transition", grant: "write", guards: kept, sends: [{ create: { kind: "lane", definition: "self", fields: { body: { slot: "body" } }, result: {} } }] }),
    share: act({ step: "transition", grant: "write", fields: { peer: { type: "scope", kind: "lane", required: true } }, guards: kept, effects: [{ ref: { slot: "peer", from: { field: "peer" } } }], sends: [{ tell: { to: { slot: "peer" }, message: "noted", fields: { body: { slot: "body" } }, result: {} } }] }),
  };
  def.receives = { noted: { message: "noted", class: "tell", from: { kind: "lane", under: "notes" }, opens: "note", fields: { body: { ...body, required: true } }, also: {}, guards: [], effects: write, sends: [], attention: [] } };
};
export const scopeWholeTextChange = () => (d: any) => { d.capacity = { name: "whole-scope", version: 1 }; };
export const scopeLinkedTextChange = (body: FieldType) => (data: any) => {
    data.items["note"]!.refs["origin"] = { fixed: true, required: false, to: { type: "item", of: "note" } };
    data.acts["relate-body"] = { step: "open", on: "note", grant: "write", also: {},
      fields: { peer: { type: "scope", kind: "lane", required: true }, body: { ...body, required: true } }, guards: [],
      effects: [{ value: { slot: "body", from: { field: "body" } } }, { ref: { slot: "peer", from: { field: "peer" } } }, { ref: { slot: "origin", from: "self" } }],
      sends: [{ relate: { to: { field: "peer" }, name: "linked", item: "self", state: "kept", detail: { body: { field: "body" } }, result: {} } }], attention: [] };
    data.acts["revise-link"] = { step: "transition", on: "note", grant: "write", also: {}, fields: { body: { ...body, required: true } }, guards: [{ state: ["kept"] }],
      effects: [{ value: { slot: "body", from: { field: "body" } } }],
      sends: [{ relate: { to: { slot: "peer" }, name: "linked", item: { slot: "origin" }, state: "kept", detail: { body: { field: "body" } }, result: {} } }], attention: [] };
    data.receives["linked"] = { message: "linked", class: "relate", from: { kind: "lane", under: "notes" }, copies: 2, opens: "note",
      fields: { body: { ...body, required: true } }, also: {}, guards: [], effects: [{ value: { slot: "body", from: { field: "body" } } }], sends: [], attention: [] };
  };
export const scopeTextBody = { type: "text", max: 40, detached: true } as const;
export const scopeTextBase: DeclaredDefinition = {
  format: "artroom-definition-1", name: "notes", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "start",
  items: {
    note: { many: true, max: 8, states: { kept: { final: false }, struck: { final: true } }, initial: "kept", parties: {}, refs: { peer: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } }, values: { body: { fixed: false, required: false, of: scopeTextBody } } },
  },
  acts: {},
  receives: {}, timed: {}, rules: {},
};
export const turnWholeChange = () => (d: any) => {
  d.capacity = { name: "whole-scope", version: 1 };
  d.acts.link.sends = d.acts.link.sends.filter((send: SendForm) => !("create" in send));
};
export const turnAbandonChange = () => (d: any) => {
    d.acts.abandon = structuredClone(d.acts["accept-report"]);
    delete d.acts.abandon.settles;
  };
export const turnTargetChange = () => (d: any) => {
    const act = structuredClone(d.acts["accept-report"]);
    act.fields = { target: { type: "item", of: "report", required: true } };
    act.also = { target: { item: "report", by: "target" } };
    act.guards.push({ of: "also.target", state: ["reported"] });
    act.settles = { of: "also.target", in: ["reported"] };
    act.effects = [{ state: "accepted" }, { of: "also.target", state: "accepted" }];
    d.acts["accept-peer"] = act;
  };
export const turnRequestsChange = (asks: { readonly create: any }) => (def: any) => {
      def.acts["accept-report"].sends = [{ create: { ...asks.create, result: {} } }];
      def.acts.renew.sends = [{ create: { ...asks.create, result: { applied: [{ value: { slot: "until", from: { time: { plusSeconds: 600 } } } }] } } }];
    };

export const withWholeCapacity = (definition: DeclaredDefinition): DeclaredDefinition => ({ ...definition, capacity: { name: "whole-scope", version: 1 } });
export function countingContainerData(): DeclaredDefinition {
  return { format: "artroom-definition-1", name: "counting-container", profile: counting.profile,
      capabilities: [], genesis: "establish", items: { configuration: counting.items["configuration"]! },
      acts: { establish: { ...counting.acts["establish"]!, fields: { ...counting.acts["establish"]!.fields, peer: { type: "member", required: true } },
        sends: [{ create: { kind: "lane", definition: COUNTING_DEFINITION, fields: { opener: { field: "opener" }, target: { field: "target" } }, result: {} } }] } },
      receives: {}, timed: {}, rules: {} };
}
export function countingPublicationData(): DeclaredDefinition {
  return { ...counting,
        items: { ...counting.items, configuration: { ...counting.items["configuration"]!, refs: { ...counting.items["configuration"]!.refs, destination: { fixed: true, required: true, to: { type: "scope", kind: "destination" } } } } },
        acts: { ...counting.acts, establish: { ...counting.acts["establish"]!, fields: { ...counting.acts["establish"]!.fields, destination: { type: "scope", kind: "destination", required: true } }, effects: [...counting.acts["establish"]!.effects, { ref: { slot: "destination", from: { field: "destination" } } }] } } };
}
export const scopePublisher: DeclaredDefinition = {
  format: "artroom-definition-1", name: "change", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
  items: { library: { many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: {},
    refs: { destination: { fixed: true, required: true, to: { type: "scope", kind: "destination" } }, other: { fixed: true, required: false, to: { type: "scope", kind: "destination" } } }, values: {} } },
  acts: {
    establish: { step: "open", on: "library", grant: "application.establish", also: {}, fields: { destination: { type: "scope", kind: "destination", required: true }, other: { type: "scope", kind: "destination", required: false } }, guards: [],
      effects: [{ ref: { slot: "destination", from: { field: "destination" } } }, { ref: { slot: "other", from: { field: "other" } } }], sends: [], attention: [] },
    write: { step: "transition", on: "library", grant: "application.establish", also: {},
      fields: { path: { type: "text", max: 1024, required: true }, content: { type: "text", max: 65536, required: true } }, guards: [], effects: [],
      sends: [{ tell: { to: { slot: "destination" }, message: "publish-file", fields: { path: { field: "path" }, content: { field: "content" } }, result: {} } }], attention: [] },
    elsewhere: { step: "transition", on: "library", grant: "application.establish", also: {},
      fields: { path: { type: "text", max: 1024, required: true }, content: { type: "text", max: 65536, required: true } }, guards: [], effects: [],
      sends: [{ tell: { to: { slot: "other" }, message: "publish-file", fields: { path: { field: "path" }, content: { field: "content" } }, result: {} } }], attention: [] },
    pair: { step: "transition", on: "library", grant: "application.establish", also: {},
      fields: { first: { type: "text", max: 1024, required: true }, second: { type: "text", max: 1024, required: true }, content: { type: "text", max: 4096, required: true } }, guards: [], effects: [],
      sends: ["first", "second"].map(path => ({ tell: { to: { slot: "destination" }, message: "publish-file", fields: { path: { field: path }, content: { field: "content" } }, result: {} } })), attention: [] },
  }, receives: {}, timed: {}, rules: {},
};
export function publisherContainerData(digest: Digest): DeclaredDefinition {
  return { ...scopePublisher, name: "publisher-container", acts: {
      establish: { ...scopePublisher.acts["establish"]!, sends: [{ create: { kind: "lane", definition: digest,
        fields: { destination: { field: "destination" } }, result: {} } }] },
    } };
}
export const scopeOwnedGrant = "fixture.configure";
export function ownedScopeDefinition(name: string, child?: Digest): DeclaredDefinition {
  return {
    format: "artroom-definition-1", name, profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
    items: { root: { many: false, max: 1, initial: "open", states: { open: { final: false } },
      parties: { controller: { fixed: true, required: true, list: false, author: false } },
      refs: child ? { child: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } } : {},
      values: { count: { fixed: false, required: true, of: { type: "int", min: 0, max: 100 } } },
    } },
    acts: {
      establish: { step: "open", on: "root", grant: scopeOwnedGrant, also: {}, fields: { opener: { type: "member", required: true } }, guards: [],
        effects: [{ party: { slot: "controller", from: { field: "opener" } } }, { value: { slot: "count", from: { const: 0 } } }],
        sends: child ? [{ create: { kind: "lane", definition: child, fields: { opener: { field: "opener" } },
          result: { applied: [{ ref: { slot: "child", from: { sender: true } } }], refused: [], conflict: [], undelivered: [] },
        } }] : [], attention: [],
      },
      bump: { step: "transition", on: "root", grant: scopeOwnedGrant, also: {}, fields: {}, guards: [{ state: ["open"] }, { signer: ["controller"] }],
        effects: [{ value: { slot: "count", from: { const: 1 } } }], sends: [], attention: [] },
    }, receives: {}, timed: {}, rules: {},
  };
}
export function lineageDeviceRoot(ordinary: { readonly childId: Digest }): DeclaredDefinition {
  return { ...devicePackageFixture,
    items: { ...devicePackageFixture.items, root: { ...devicePackageFixture.items["root"]!, refs: { child: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } } } },
    acts: { ...devicePackageFixture.acts, start: { ...devicePackageFixture.acts["start"]!, fields: { opener: { type: "member", required: true } },
      sends: [{ create: { kind: "lane", definition: ordinary.childId, fields: { opener: { field: "opener" } }, result: { applied: [{ ref: { slot: "child", from: { sender: true } } }], refused: [], conflict: [], undelivered: [] } } }] } },
  };
}
export function lineageBudgetDefinitions(child: DeclaredDefinition): DeclaredDefinition[] {
    const declarations: DeclaredDefinition[] = [];
    for (let i = 16; i >= 0; i--) {
      const next = declarations[0];
      declarations.unshift({ ...child, name: `lineage-budget-${i}`, acts: { ...child.acts,
        establish: { ...child.acts["establish"]!, sends: next ? [{ create: { kind: "lane", definition: definitionDigest(next), fields: { opener: { field: "opener" } }, result: {} } }] : [] },
      } });
    }
  return declarations;
}
export function configureFactTimeDefinition(definition: DeclaredDefinition): void {
  definition.items["board"]!.refs["seen"] = { required: false, fixed: false, to: { type: "fact", under: definition.name, kind: ["initialize", "reset"] } };
  for (const name of ["initialize", "reset"]) definition.acts[name] = { ...definition.acts[name]!, effects: [...definition.acts[name]!.effects, { ref: { slot: "seen", from: "self" } }] };
}

export function indexedStandingData() {
  return standingData(d => {
    // A real nonempty index makes rollback of index state observable.
    d.items.repo.values.serial = { fixed: true, required: true, default: 0, of: { type: "int", min: 0, max: 0 } };
    d.items.repo.indexes = ["serial"];
  });
}

export function recoveredAliasData(): PlatformData {
  const data: PlatformData = { ...structuredClone(notes), name: "platform:task", capacity: { name: "whole-scope", version: 1 }, outcomes: {} };
  data.acts["retain"] = { ...structuredClone(data.acts["vouch"]!), presents: {}, guards: [], fields: { proof: { type: "digest", required: true, value: { domain: DOMAINS.text, max: 32768 } } }, effects: [], sends: [] };
  return data;
}

export const indexedIntegerChange = (integer: { type: string; min: number; max: number }) => (data: any) => {
    data.name = "platform:task";
    data.items.ticket.values.number = { fixed: true, required: true, of: integer };
    data.items.ticket.indexes = ["number"];
    data.acts.issue.fields.number = { ...integer, required: true };
    data.acts.issue.effects.push({ value: { slot: "number", from: { field: "number" } } });
    const transition = { step: "transition", on: "ticket", grant: "gate.issue", also: {}, fields: {}, guards: [], sends: [], attention: [] };
    data.acts.finish = { ...transition, guards: [{ state: ["open"] }], effects: [{ state: "used" }] };
    data.acts.rewrite = { ...transition, effects: [{ code: "rewrite-number", row: "P16" }] };
  };
export const gateValueFieldChange = (domain: string, max: number) => (d: any) => { d.name = "platform:task"; d.acts.issue.fields.proof = { type: "digest", required: false, value: { domain, max } }; };
export const gateValueOutcomeChange = () => (data: any) => {
    data.name = "platform:task";
    data.acts.issue.effects.push({ code: "open-proof", row: "P16", most: { effects: 0, operations: ["probe"] } });
    data.outcomes.probe.attempts = 1;
  };

export const steppedObservationChange = () => (data: any) => { data.outcomes.weigh.origin = "opening"; data.outcomes.weigh.observes = STEP_ROWS; };
export const observationDomainChange = (domain: string) => (data: any) => { data.acts.go.sends[0].tell.observes.applied[0].retains[0].domain = domain; };
export const membershipObservationChange = () => (data: any) => {
    for (const act of Object.values(data.acts) as { grant: string }[]) act.grant = "issue.open";
    data.outcomes.weigh.observes[2].action = "issue.open";
  };

export function oldMembershipStandingData() { const data = standingData(); data.name = "platform:membership"; return data; }

export const scopeHeldOperationsChange = () => (d: any) => { d.name = "platform:task"; d.acts.enter.grant = "gate.enter"; d.items.ticket.holds = { operations: { probe: 2 } }; d.outcomes.probe = { ...d.outcomes.probe, attempts: 1, most: { effects: 0, operations: ["probe"] } }; };
