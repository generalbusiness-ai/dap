/** Invariant: a stop over a saved plan, claim, join or request does not say that nothing was sent, because an earlier send can have gone.
 * The real commands run over a memory store. The service is a STAND-IN: `fetch` scripts each lost reply and refusal. */
import { expect, test } from "vitest";
import type { Fetch } from "@generalbusiness/dap-client";
import { b64url, scopeIdOf, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { COUNTING_COHORT } from "@generalbusiness/dap-platform";
import { claim, command, installPlanned, memoryStore, type Config, type Context, type PendingClaim } from "../src/index.ts";
import { applicationCommands } from "../src/application-install-runtime.ts";

const SERVICE = "https://nothing-sent.test";
const NOW = Date.parse("2026-11-01T12:00:00Z");
const UNKNOWN = "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register.";
const lostReply = (async () => { throw new Error("the reply never came"); }) as unknown as Fetch;
const ref = (kind: "register" | "directory" | "membership", name: string) => ({ genesis: textDigest("TEST genesis 3"), scope: scopeIdOf({ v: 1, kind, definition: "platform:register@8", creator: null, cause: textDigest(name), ordinal: 0 }) });

/** A plan whose one send lost its reply: the attempted marker is on the plan. */
async function attemptedPlan(planned: readonly string[] = []) {
  const store = memoryStore();
  const ctx: Context = { store, now: () => NOW, fetch: lostReply, trustedCreationService: { service: SERVICE, fetch: lostReply } };
  expect((await command(ctx, ["install", "--plan", SERVICE, "--host", "github.com", ...planned])).code).toBe(0);
  const unsent = (await store.config())!;
  expect((await command(ctx, ["install", "--planned"])).lines[0]).toMatch(/^No answer:/);
  const config = (await store.config())!;
  expect(config.plan!.attempted).toMatch(/^sha256:/);
  return { store, ctx, unsent, config, plan: config.plan! };
}

test("a stop over an attempted plan says that the earlier send has no known outcome", async () => {
  const { store, ctx, config, plan } = await attemptedPlan();
  const stops: [Config | null, readonly string[], string][] = [
    [{ ...config, plan: { ...plan, definition: COUNTING_COHORT.register } }, ["install", "--planned"], "Refused: retired-cohort. Choose a currently admitted cohort for a new room. The old plan is kept."],
    [config, ["install", "--planned", "--cohort", "commons"], "Refused: plan-mismatch. The selected cohort conflicts with the original install plan. The plan is kept."],
    [{ ...config, plan: { ...plan, definition: "platform:no-such-register@1" as never } }, ["install", "--planned"], "Unsupported install provenance: this command cannot serve the plan's exact pinned register version. The pending plan is kept."],
    [{ ...config, plan: { ...plan, register: plan.register.replace(/.$/, c => c === "a" ? "b" : "a") as never } }, ["install", "--planned"], "Refused: plan-mismatch. The saved plan does not match this service, operator key and supported register version."],
    [{ ...config, plan: { ...plan, attempted: textDigest("another attempt") } }, ["install", "--planned"], "Refused: plan-mismatch. The attempted marker belongs to another service, operator, envelope, version or register. The pending plan is kept."],
    [{ ...config, plan: { ...plan, selected: false as never } }, ["install", "--planned"], "Refused: plan-mismatch. The retained install selection marker is invalid. The original plan is kept."],
    [config, ["install", "--plan", SERVICE, "--host", "github.com", "--namespace", "another", "--cohort", "trusted-application"], "Refused: plan-mismatch. The retained install's cohort, service, host, namespace or policy conflicts with this request. The original plan is kept."],
  ];
  for (const [saved, args, first] of stops) {
    await store.save(saved!);
    const said = await command(ctx, [...args]);
    expect(said.code, first).toBe(1);
    expect(said.lines.join(" ")).toContain(first);
    expect(said.lines.join(" ")).toContain(UNKNOWN);
    expect(said.lines.join(" ")).not.toMatch(/nothing was (signed or )?sent/i);
  }
  // A transport that the plan does not trust cannot send the plan again.
  await store.save(config);
  expect((await command({ ...ctx, trustedCreationService: undefined as never }, ["install", "--planned"])).lines).toEqual([`Held: this injected transport has no configured-service acknowledgement trust. The plan is kept. ${UNKNOWN}`]);
});

test("a policy that conflicts with an attempted plan says that the earlier send has no known outcome", async () => {
  const { ctx } = await attemptedPlan(["--register-policy", "open"]);
  expect((await command(ctx, ["install", "--planned", "--register-policy", "keys"])).lines).toEqual([`Refused: plan-mismatch. The register policy conflicts with the original install plan. The plan is kept. ${UNKNOWN}`]);
});

test("a bad flag over an attempted plan speaks of this run", async () => {
  // This stop comes before the command reads the config, so it cannot speak of the plan.
  const { ctx } = await attemptedPlan();
  expect((await command(ctx, ["install", SERVICE, "--host", "nowhere"])).lines).toEqual(["Refused: host-unknown. Choose --host none, artifacts or github.com; this run signed and sent nothing."]);
  expect((await command(ctx, ["install", SERVICE])).lines[0]).toBe("--host is required: none, artifacts or github.com; this run signed and sent nothing.");
  expect((await command(ctx, ["install", SERVICE, "--host", "none", "--cohort", "trusted-application"])).lines[0]).toBe("--host none requires the base, unpublished, repository-binding, own-agent or commons cohort; this run signed and sent nothing.");
  expect((await command(ctx, ["install", SERVICE, "--host", "github.com", "--register-policy", "open", "--cohort", "trusted-application"])).lines[0]).toBe("--register-policy open requires a cohort with an open register policy; this run signed and sent nothing.");
  // `line.ts` checks these two first, so only the exported function reaches them.
  expect((await installPlanned(ctx, { cohort: "no-such-cohort" as never })).lines[0]).toBe("--cohort needs one current creation family or the historical family of a retained plan; this run signed and sent nothing.");
  expect((await installPlanned(ctx, { registerPolicy: "nobody" as never })).lines[0]).toBe("--register-policy takes exactly keys or open; this run signed and sent nothing.");
});

test("a plan the service acknowledged says that the earlier send went ahead", async () => {
  const { store, ctx, config, plan } = await attemptedPlan();
  await store.save({ ...config, plan: { ...plan, acknowledged: { status: "service-acknowledged", service: SERVICE, receipt: {} as never } } });
  const said = await command(ctx, ["install", "--planned", "--cohort", "commons"]);
  expect(said.lines.join(" ")).toContain("This run sent nothing, and an earlier send of this plan went ahead. A new plan makes a second register.");
});

test("a plan that never went keeps the plain words", async () => {
  // Control: no attempted marker, so no send of this plan can have happened.
  const { store, ctx, unsent } = await attemptedPlan();
  await store.save(unsent);
  const said = await command(ctx, ["install", "--planned", "--cohort", "commons"]);
  expect(said.lines).toEqual(["Refused: plan-mismatch. The selected cohort conflicts with the original install plan. The plan is kept. Nothing was sent."]);
});

/** A pending join whose one send lost its reply. */
async function pendingJoin() {
  const store = memoryStore();
  const membership = ref("membership", "join");
  const directory = ref("directory", "join");
  const link = { v: 1, service: SERVICE, repository: { directory, membership, rules: directory.scope, destination: membership.scope }, invitation: 1, secret: "TEST invitation secret", handle: "@ada", definition: "platform:membership@2" };
  const text = (value: unknown) => `artroom-invite:${b64url(utf8(JSON.stringify(value)))}`;
  const ctx: Context = { store, now: () => NOW, fetch: lostReply, tries: 1 };
  expect((await command(ctx, ["join", text(link)])).lines[0]).toMatch(/^No answer:/);
  return { store, ctx, link, text, config: (await store.config())! };
}

test("a stop over a pending join says that the earlier send has no known outcome", async () => {
  const { store, ctx, link, text, config } = await pendingJoin();
  const said = "This run sent nothing, and an earlier send of this join has no known outcome.";
  expect((await command(ctx, ["join", text({ ...link, handle: "@other" })])).lines).toEqual([`The invitation link does not match the pending join. ${said} Retry the original invitation link.`]);
  await store.save({ ...config, join: { ...config.join!, request: "join-absent" } });
  expect((await command(ctx, ["join", text(link)])).lines).toEqual([`The exact private join request is missing. ${said} Restore its private record before retrying.`]);
  await store.keepPrivate("join-unreadable", utf8("not json"));
  await store.save({ ...config, join: { ...config.join!, request: "join-unreadable" } });
  expect((await command(ctx, ["join", text(link)])).lines).toEqual([`The private join request cannot be read. ${said} Restore its private record before retrying.`]);
});

test("a stop over a pending claim says that the earlier send has no known outcome", async () => {
  const store = memoryStore();
  const register = ref("register", "claim");
  await store.keep("device", new Uint8Array(32).fill(9));
  const intent = textDigest("the digest of an older claim");
  const save = (pending: PendingClaim) => store.save({ v: 2, service: SERVICE, key: "device", register, claim: pending });
  const reads = (async () => Response.json({ ok: false, reason: "not-found" }, { status: 404 })) as unknown as Fetch;
  const ctx: Context = { store, now: () => NOW, fetch: reads, tries: 1 };
  const said = "This step sent nothing, and an earlier send of this claim has no known outcome.";

  await save({ register: "not-this-register" as never, intent, handle: "@rita" });
  expect((await claim(ctx, "demo")).lines).toEqual([`The pending claim does not identify this register and a valid recorded intent. ${said} Keep this claim: a new claim can create a second repository.`]);

  await save({ register: register.scope, intent, handle: "@rita", found: { signed: {} as never } });
  expect((await claim(ctx, "demo")).lines).toEqual([`The pending claim does not match this register, signing key and recorded intent. ${said} Keep this claim: a new claim can create a second repository.`]);

  await save({ register: register.scope, intent, handle: "@rita" });
  const legacy = (await claim(ctx, "demo")).lines.join(" ");
  expect(legacy).toContain(`${said} Retry the reads later, or recover it manually. --again signs a new claim, which takes a new place in the register and can create a second repository.`);
  expect((await store.config())!.claim!.intent).toBe(intent);
});

test("an application request with no signing key says what this call did", async () => {
  const store = memoryStore();
  const membership = ref("membership", "application");
  const directory = ref("directory", "application");
  await store.save({ v: 2, service: SERVICE, key: "device", repository: { directory, membership, rules: directory.scope, destination: membership.scope } });
  const outcome = await applicationCommands({ store, now: () => NOW }, {} as never)("install_application", { idempotencyKey: "request-1" });
  expect(outcome).toEqual({ code: 1, lines: ["The configured signing key is unavailable. This call signed and sent nothing, and it did not read the record under this request key. Keep the original request key and arguments."] });
});
