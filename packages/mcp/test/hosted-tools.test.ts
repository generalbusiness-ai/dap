import { expect, test } from "vitest";
import { hostedMcpTools, McpService, memoryStore } from "../src/index.ts";
import { fixedSigner } from "./fixtures.ts";
import { StandIn } from "./support/standin.ts";
import { TRUSTED_APPLICATION_COHORT, firstExtents } from "@generalbusiness/dap-platform";

test("hosted tool settings default closed, admit only known additions, and preserve local generic defaults", async () => {
  for (const settings of [{}, { MCP_ENABLED: "false" }, { MCP_ENABLED: "TRUE" }, ...["null", "{}", '["unknown"]', '["create","create"]', "["].map(MCP_TOOL_ADDITIONS => ({ MCP_ENABLED: "true", MCP_TOOL_ADDITIONS }))]) expect(hostedMcpTools(settings)).toBeNull();
  const policy = hostedMcpTools({ MCP_ENABLED: "true" })!;
  const omitted = ["create", "install_application", "credential", "prepare", "join", "record", "step", "text"];
  expect(policy).toContain("room");
  expect(policy).toContain("actions");
  for (const name of omitted) expect(policy).not.toContain(name);
  const additions = hostedMcpTools({ MCP_ENABLED: "true", MCP_TOOL_ADDITIONS: '["create","text"]' })!;
  expect(additions).toContain("create");
  expect(additions).toContain("text");
  for (const name of omitted.filter(name => name !== "create" && name !== "text")) expect(additions).not.toContain(name);
  const signer = fixedSigner(27);
  const make = (genericTools?: readonly string[]) => new McpService({ service: "https://x", signer, config: { read: async () => ({ service: "https://x" }), addRoot: async () => {} }, custody: memoryStore(), ...(genericTools ? { genericTools } : {}) });
  const local = make(), hosted = make(policy);
  const names = async (service: McpService) => (await service.snapshot()).tools.map(tool => tool.name);
  for (const name of omitted) {
    expect(await names(local)).toContain(name);
    expect(await names(hosted)).not.toContain(name);
    expect((await hosted.call(name, {})).structuredContent).toEqual({ error: "unknown-tool", message: `No tool is named ${name} in this list.`, next: "Call tools/list." });
  }
  // The enabled tool reaches its shape check, rather than the hosted policy refusal.
  expect((await make(hostedMcpTools({ MCP_ENABLED: "true", MCP_TOOL_ADDITIONS: '["create"]' })!).call("create", {})).structuredContent["error"]).not.toBe("unknown-tool");
});

test("a derived tool hidden for missing standing refuses direct invocation before signing or custody", async () => {
  // Scripted read service only: this proves client-side admission, not native judgment.
  const signer = fixedSigner(28), peer = new StandIn(signer.key, "agent", []);
  let signs = 0;
  const service = new McpService({ service: "https://scopes.test", fetch: peer.fetch, signer: { key: signer.key, sign: async intent => { signs++; return signer.sign(intent); } }, config: { read: async () => peer.config(), addRoot: async () => {} }, custody: memoryStore() });
  const snapshot = await service.snapshot();
  expect(snapshot.hidden).toContain("rules.publish");
  // Read authentication itself signs. The act/custody path must never begin.
  const signedBytes: string[] = [];
  let custodyCalls = 0;
  const blocked = async (): Promise<never> => { custodyCalls++; throw new Error("A hidden call reached custody."); };
  const custody = { lock: blocked, exclusive: blocked, read: blocked, write: blocked, unresolved: blocked, segment: blocked, segmented: blocked, admit: blocked, unadmit: blocked };
  const guarded = new McpService({ mode: "add", service: "https://scopes.test", fetch: peer.fetch, signer: { key: signer.key, sign: async bytes => { signedBytes.push(new TextDecoder().decode(bytes)); return signer.sign(bytes); } }, config: { read: async () => peer.config(), addRoot: async () => {} }, custody });
  expect((await guarded.call("rules.publish", { on: 0, fields: {}, idempotencyKey: "hidden" })).structuredContent).toEqual({ error: "unknown-tool", message: "No tool is named rules.publish in this list.", next: "Call tools/list." });
  const definition = peer.scopes.get(peer.rules.scope)!.definition;
  expect((await guarded.call("act", { target: "rules", kind: "publish", digest: definition, on: 0, fields: {}, idempotencyKey: "hidden-via-act" })).structuredContent).toEqual({ error: "unknown-tool", message: "No tool is named publish in this list.", next: "Call tools/list." });
  expect((await guarded.call("prepare", { resource: "rules", capability: "hold@1", step: "stage", target: "rules", kind: "publish", on: 0, fields: {}, idempotencyKey: "hidden-via-prepare" })).structuredContent).toEqual({ error: "unknown-tool", message: "No tool is named publish in this list.", next: "Call tools/list." });
  expect(signedBytes.some(bytes => bytes.includes('"kind":"publish"'))).toBe(false);
  expect(peer.requests.some(request => request.endsWith("/acts"))).toBe(false);
  expect(custodyCalls).toBe(0);
  expect(signs).toBeGreaterThan(0);
  const adminPeer = new StandIn(signer.key);
  const local = new McpService({ mode: "add", service: "https://scopes.test", fetch: adminPeer.fetch, signer, config: { read: async () => adminPeer.config(), addRoot: async () => {} }, custody: memoryStore() });
  const accepted = await local.call("act", { target: "rules", kind: "publish", digest: definition, on: 0, fields: { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) }, idempotencyKey: "local-publish" });
  expect(accepted.structuredContent["answer"]).toBe("accepted");
  expect(adminPeer.requests.some(request => request.endsWith("/acts"))).toBe(true);
  // The existing code-granted invitation act has no standing action. A
  // client-side tool filter must leave its native invitation judgment alone.
  const publicService = new McpService({ mode: "add", service: "https://scopes.test", fetch: peer.fetch, signer, config: { read: async () => peer.config(), addRoot: async () => {} }, custody: memoryStore() });
  const joined = await publicService.call("act", { target: "membership", kind: "join", digest: "platform:membership@2", fields: { invitation: 1, secret: "scripted-invitation" }, idempotencyKey: "public-join" });
  expect(joined.structuredContent["answer"]).toBe("accepted");
});

test("actual-target standing and definition selection refuse before signing, custody or package fetch", async () => {
  // Both targets have the same native definition. Only their memberships differ.
  const signer = fixedSigner(29), peer = new StandIn(signer.key, "agent", ["rules.publish"]);
  const bMembers = structuredClone(peer.scopes.get(peer.membership.scope)!.items);
  bMembers[0]!.values["agentActions"] = [];
  const membershipB = peer.add("membership", "platform:membership@2", bMembers);
  const rulesB = peer.add("rules", "platform:rules@2", structuredClone(peer.scopes.get(peer.rules.scope)!.items));
  const signedBytes: string[] = [], custody = memoryStore();
  const service = new McpService({ mode: "add", service: "https://scopes.test", fetch: peer.fetch, signer: { key: signer.key, sign: async bytes => { signedBytes.push(new TextDecoder().decode(bytes)); return signer.sign(bytes); } }, config: { read: async () => ({ ...peer.config(), roots: [{ scope: rulesB.scope, membership: membershipB }] }), addRoot: async () => {} }, custody });
  expect((await service.snapshot()).tools.map(tool => tool.name)).toContain("rules.publish");
  const publishFields = { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) };
  const refused = await service.call("rules.publish", { target: rulesB.scope, on: 0, fields: publishFields, idempotencyKey: "other-membership" });
  expect(refused.structuredContent).toEqual({ error: "unknown-tool", message: "No tool is named rules.publish in this list.", next: "Call tools/list." });
  const digest = peer.scopes.get(rulesB.scope)!.definition;
  for (const name of ["act", "prepare"]) {
    const result = await service.call(name, { target: rulesB.scope, kind: "publish", digest, on: 0, fields: publishFields, idempotencyKey: `other-membership-${name}`, ...(name === "prepare" ? { resource: "rules", capability: "hold@1", step: "stage" } : {}) });
    expect(result.structuredContent).toEqual({ error: "unknown-tool", message: "No tool is named publish in this list.", next: "Call tools/list." });
  }
  // Standing is read anew after an earlier list; the peer is scripted, not a native grant oracle.
  peer.scopes.get(peer.membership.scope)!.items[0]!.values["agentActions"] = [];
  const withdrawn = await service.call("rules.publish", { on: 0, fields: publishFields, idempotencyKey: "standing-withdrawn" });
  expect(withdrawn.structuredContent["error"]).toBe("unknown-tool");
  expect(signedBytes.some(bytes => bytes.includes('"kind":"publish"'))).toBe(false);
  expect(custody.records.size).toBe(0);
  expect(peer.requests.some(request => request.endsWith("/acts"))).toBe(false);
  // --tools excludes the definition, even when this scripted membership grants its action.
  const selectedPeer = new StandIn(signer.key, "agent", ["rules.publish"]);
  const selectedStore = memoryStore();
  const excluded = new McpService({ mode: "add", tools: ["membership"], service: "https://scopes.test", fetch: selectedPeer.fetch, signer, config: { read: async () => selectedPeer.config(), addRoot: async () => {} }, custody: selectedStore });
  for (const tool of ["rules.publish", "act", "prepare"]) {
    const reply = await excluded.call(tool, { target: "rules", kind: "publish", digest: selectedPeer.scopes.get(selectedPeer.rules.scope)!.definition, on: 0, fields: publishFields, idempotencyKey: `excluded-${tool}`, ...(tool === "prepare" ? { resource: "rules", capability: "hold@1", step: "stage" } : {}) });
    expect(reply.structuredContent["error"]).toBe("unknown-tool");
  }
  expect(selectedStore.records.size).toBe(0);
  expect(selectedPeer.requests.some(request => request.endsWith("/acts"))).toBe(false);
  // Real install helper and read/sign/custody consumers; only native answers are scripted.
  // Both inputs are well-shaped, so absence of package work is an admission witness.
  for (const excludedDefinition of [false, true]) {
    const installPeer = new StandIn(signer.key, "agent", excludedDefinition ? ["application.install"] : []);
    installPeer.scopes.get(installPeer.directory.scope)!.definition = TRUSTED_APPLICATION_COHORT.directory;
    installPeer.scopes.get(installPeer.rules.scope)!.definition = TRUSTED_APPLICATION_COHORT.rules;
    let packages = 0, custodyCalls = 0;
    const writes: string[] = [];
    const blocked = async (): Promise<never> => { custodyCalls++; throw new Error("Unadmitted installation reached custody"); };
    const install = new McpService({ mode: "add", ...(excludedDefinition ? { tools: ["membership"] } : {}), service: "https://scopes.test", fetch: installPeer.fetch,
      signer: { key: signer.key, sign: async bytes => { writes.push(new TextDecoder().decode(bytes)); return signer.sign(bytes); } },
      config: { read: async () => installPeer.config(), addRoot: async () => {} },
      custody: { lock: blocked, exclusive: blocked, read: blocked, write: blocked, unresolved: blocked, segment: blocked, segmented: blocked, admit: blocked, unadmit: blocked },
      applicationFetch: async () => { packages++; throw new Error("Unadmitted installation fetched a package"); } });
    const answer = await install.call("install_application", { uri: `git+https://packages.test/apps.git/@${"c".repeat(40)}/application.dap.json`, release: `sha256:${"c".repeat(64)}`, roles: [], values: {}, idempotencyKey: `unadmitted-install-${excludedDefinition}` });
    expect(answer.structuredContent).toEqual({ error: "unknown-tool", message: "No tool is named install_application in this list.", next: "Call tools/list." });
    expect([packages, custodyCalls]).toEqual([0, 0]);
    expect(writes.some(bytes => bytes.includes('"kind":"install-application"'))).toBe(false);
    expect(installPeer.requests.some(request => request.endsWith("/acts"))).toBe(false);
  }
});
