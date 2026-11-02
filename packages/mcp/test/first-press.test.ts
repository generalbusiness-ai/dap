import { expect, test } from "vitest";
import { issueDemo } from "@generalbusiness/dap-lanes";
import { secretSigner } from "@generalbusiness/dap-client";
import type { CallResult, McpConfig, ViewSource } from "../src/index.ts";
import { McpService, memoryStore } from "../src/index.ts";
import { StandIn, SERVICE } from "./support/standin.ts";

const START = Date.parse("2099-01-01T00:00:00Z");

// The projection, authority and HTTP answers are stand-ins. The retained
// action, fresh inventory, credential routing, signing and custody are real.
function fixture(changeAfterAct = false) {
  const signer = secretSigner(crypto.getRandomValues(new Uint8Array(32))), stand = new StandIn(signer.key);
  const lane = stand.lane(issueDemo);
  let config: McpConfig = stand.config(), gitReads = 0;
  const views: ViewSource = { initialPage: () => "item", read: async () => ({
    status: "ready", position: 0, count: 1, fallback: "TEST exact read", card: {
      identity: { kind: "manifest", item: "1", revision: "1", subject: { scope: lane.scope }, at: {} },
      title: "TEST", summary: "TEST", body: "TEST", reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST", actions: [],
      diffAvailable: true, diffRead: { target: stand.destination.scope, base: "a".repeat(40), integration: "b".repeat(40) },
    },
  }) };
  const service = new McpService({ service: SERVICE, signer, custody: memoryStore(), views, mode: "generic", now: () => START, every: () => () => {},
    config: { read: async () => structuredClone(config), addRoot: async () => {} },
    fetch: async (url, init) => {
      const answer = await stand.fetch(url, init);
      if (changeAfterAct && init?.method === "POST" && url.endsWith("/acts")) config = { service: SERVICE };
      return answer;
    },
    readDiff: async () => { gitReads++; return { base: "a".repeat(40), integration: "b".repeat(40), files: 1, truncated: false, text: "TEST" }; },
  });
  return { stand, service, gitReads: () => gitReads };
}

test("a partial exact-read context cannot replace the ordinary catalogue or emit a list change", async () => {
  const f = fixture(), changes: unknown[] = [];
  const stop = f.service.subscribe(generation => { changes.push(generation); });
  try {
    await f.service.page();
    const prior = changes.length;
    f.stand.answers.set("read-token", () => ({ answer: "refused", reason: "guard-failed", name: "stand-in", judgedAt: { seq: 1, hash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" } }));
    await f.service.call("view_change", { view: "partial" });
    const answer = await f.service.call("view_act", { view: "partial", cut: 0, action: "view-diff" });
    expect((answer.structuredContent["result"] as CallResult).structuredContent["answer"]).toBe("refused");
    expect(changes).toHaveLength(prior);
    const beforeInspect = f.stand.requests.length;
    expect((await f.service.call("inspect", { scope: "directory" })).isError).toBe(false);
    expect(f.stand.requests.slice(beforeInspect)).toEqual(["GET /v1/scopes/" + f.stand.directory.scope]);
  } finally { stop(); }
});

test("a configuration change after the act invalidates its credential context before any Git read", async () => {
  const f = fixture(true);
  await f.service.call("view_change", { view: "changed" });
  const answer = await f.service.call("view_act", { view: "changed", cut: 0, action: "view-diff" });
  expect((answer.structuredContent["result"] as CallResult).structuredContent["error"]).toBe("credential");
  expect(f.stand.requests.filter(route => route.endsWith("/acts"))).toHaveLength(1);
  expect(f.gitReads()).toBe(0);
});
