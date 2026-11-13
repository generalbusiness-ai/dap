/** Register selection and retained installation custody. */
import type { Context, Outcome } from "./command-context.ts";
import { accepted, done, failed, run, signing, stopCommand, transportOf, usage } from "./command-support.ts";
import { newStoredSigner, storedSigner } from "./store-signer.ts";
import type { Config, PlannedInstall } from "./store.ts";
import { canonicalize, intentDigest, isReceipt, isScopeId, isSignedIntentShape, parseStrict, scopeIdOf, textDigest, timeMs, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { create, signedIntent, type Signing } from "@generalbusiness/dap-client";
import { type Digest, type KeyId, type PlatformDefinition, PROPOSED_BOUNDS, type ScopeId, type SignedIntent } from "@generalbusiness/dap-contract";
import { CLI_INSTALL_REGISTERS, answersVersionQuestion, ARCHIVE_DEVICE_APPLICATION_COHORT, NEWEST, platform, UNPUBLISHED_COHORT } from "@generalbusiness/dap-platform";

const NEW_REGISTER = NEWEST["platform:register"]!;

// ---------------------------------------------------------------- the commands

/** Named creation families; host none defaults to the unpublished family. */
export type InstallCohort = "own-agent" | "failed-claim" | "repository-binding" | "separate-recovery" | "commons" | "unpublished" | "file-publication" | "application" | "application-publication" | "trusted-application" | "declared-application" | "device-application" | "archive-application" | "archive-device-application" | "archive-device-publication" | "archive-certified-rules" | "hardened-certified-rules" | "archive-declared-application" | "invitation-key";

export type RegisterPolicy = "keys" | "open";

export interface InstallOptions { host?: string; namespace?: string; cohort?: InstallCohort; registerPolicy?: RegisterPolicy }

const INSTALL_COHORTS = CLI_INSTALL_REGISTERS;

/** New plans only. Historical selectors remain in INSTALL_COHORTS for retained custody.
 * The owning test pins these register versions to Scope's CREATION_COHORTS. */
export const CREATION_INSTALL_COHORTS = ["own-agent", "failed-claim", "repository-binding", "separate-recovery", "commons", "unpublished", "application", "archive-device-application", "archive-device-publication", "archive-certified-rules", "hardened-certified-rules"] as const satisfies readonly InstallCohort[];

function selectedRegister(cohort: unknown): PlatformDefinition | undefined {
  if (cohort === undefined) return undefined;
  if (cohort === "own-agent") return INSTALL_COHORTS["own-agent"];
  if (cohort === "failed-claim") return INSTALL_COHORTS["failed-claim"];

  if (cohort === "repository-binding") return INSTALL_COHORTS["repository-binding"];
  if (cohort === "separate-recovery") return INSTALL_COHORTS["separate-recovery"];
  if (cohort === "commons") return INSTALL_COHORTS.commons;
  if (cohort === "unpublished") return INSTALL_COHORTS.unpublished;
  if (cohort === "file-publication") return INSTALL_COHORTS["file-publication"];
  if (cohort === "invitation-key") return INSTALL_COHORTS["invitation-key"];
  if (cohort === "application-publication") return INSTALL_COHORTS["application-publication"];
  if (cohort === "application") return INSTALL_COHORTS.application;
  if (cohort === "trusted-application") return INSTALL_COHORTS["trusted-application"];
  if (cohort === "device-application") return INSTALL_COHORTS["device-application"];
  if (cohort === "declared-application") return INSTALL_COHORTS["declared-application"];
  if (cohort === "archive-application") return INSTALL_COHORTS["archive-application"];
  if (cohort === "archive-declared-application") return INSTALL_COHORTS["archive-declared-application"];
  if (cohort === "archive-device-application") return INSTALL_COHORTS["archive-device-application"];
  if (cohort === "archive-device-publication") return INSTALL_COHORTS["archive-device-publication"];
  if (cohort === "archive-certified-rules") return INSTALL_COHORTS["archive-certified-rules"];
  if (cohort === "hardened-certified-rules") return INSTALL_COHORTS["hardened-certified-rules"];
  return stopCommand(usage("--cohort needs one current creation family or the historical family of a retained plan; this run signed and sent nothing."));
}

/** What a stop says of a plan's earlier send. The attempted marker precedes the first possible request. */
function planSent(plan: PlannedInstall): string {
  if (plan.acknowledged !== undefined) return "This run sent nothing, and an earlier send of this plan went ahead. A new plan makes a second register.";
  if (plan.attempted !== undefined) return "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register.";
  return "Nothing was sent.";
}

/** Fresh creation uses the default family; retained plans keep their exact pin. */
function installSelection(options: InstallOptions, retained = false): PlatformDefinition | undefined {
  if (!retained && options.host === undefined) return stopCommand(usage("--host is required: none, artifacts or github.com; this run signed and sent nothing."));
  if (options.host !== undefined && !["none", "artifacts", "github.com"].includes(options.host)) return stopCommand(usage("Refused: host-unknown. Choose --host none, artifacts or github.com; this run signed and sent nothing."));
  if (options.registerPolicy !== undefined && options.registerPolicy !== "keys" && options.registerPolicy !== "open") {
    return stopCommand(usage("--register-policy takes exactly keys or open; this run signed and sent nothing."));
  }
  const selected = selectedRegister(options.cohort);
  if (options.host === "none") {
    if (selected !== undefined && !answersVersionQuestion(selected, "cliNoHostInstallRegister")) return stopCommand(usage("--host none requires the unpublished, repository-binding, own-agent or commons cohort; this run signed and sent nothing."));
    return selected ?? UNPUBLISHED_COHORT.register;
  }
  if (options.registerPolicy !== "open" || answersVersionQuestion(selected, "cliOpenPolicyExplicitRegister")) return selected;
  if (selected === undefined) return retained ? undefined : NEW_REGISTER;

  if (selected !== undefined && !answersVersionQuestion(selected, "cliLegacyOpenPolicyRegister")) {
    return stopCommand(usage("--register-policy open requires a cohort with an open register policy; this run signed and sent nothing."));
  }
  return ARCHIVE_DEVICE_APPLICATION_COHORT.register;
}

const selectedPlan = (plan: PlannedInstall): boolean => {
  if (Object.hasOwn(plan, "selected") && plan.selected !== true) {
    return stopCommand(failed(`Refused: plan-mismatch. The retained install selection marker is invalid. The original plan is kept. ${planSent(plan)}`));
  }
  // Register3 also names old unselected plans; the local marker distinguishes
  // new explicit selection without changing the signed or attempted identity.
  return plan.selected === true || answersVersionQuestion(plan.definition, "cliImplicitSelectedPlanRegister");
};

/** Ordinary installs keep their legacy path; selected installs use exact planned custody. */
export function install(ctx: Context, service: string, options: InstallOptions = {}): Promise<Outcome> {
  return run(async () => {
    const selected = installSelection(options);
    if (options.host === "none") options = { ...options, namespace: "" };
    const before = await ctx.store.config();
    if (before?.register) return usage(`This config directory has a register already: ${before.register.scope}.`);
    if (selected) {
      const plan = await cohortPlan(ctx, service, options, before, selected);
      return executePlannedInstall(ctx, options.cohort, plan, options.registerPolicy);
    }
    if (before?.plan && selectedPlan(before.plan)) return failed("Refused: install-pending. The retained selected plan must use its original cohort and request; run install --planned.");
    if (before?.plan?.attempted !== undefined) return failed("Refused: install-pending. Retry dap install --planned with the original plan; an attempted install cannot be replaced silently.");
    const { signed, key } = await installing(ctx, options, signing(ctx));
    const { answer } = await create(transportOf(ctx, service), signed, NEW_REGISTER);
    const receipt = accepted(answer, null, "Installed").receipt;
    await ctx.store.save({ v: 2, service, key: "operator", register: receipt.fact.at });
    return done(`Installed: register ${receipt.fact.at.scope}, under ${NEW_REGISTER}.`, `The operator key ${key} is kept in the config directory, readable only by you. It is the one creator key.`);
  });
}

/** The signed `install` intent, by the operator key, which is made and kept when it does not exist yet. */
async function installing(ctx: Context, options: Pick<InstallOptions, "host" | "namespace" | "registerPolicy">, at: Signing): Promise<{ signed: SignedIntent; key: KeyId }> {
  const signer = ctx.store.signer && !ctx.store.newSigner
    ? (await storedSigner(ctx.store, "operator")) ?? stopCommand(failed("The operator signing key is unavailable; nothing was signed or sent."))
    : await newStoredSigner(ctx.store, "operator");
  const fields = { host: options.host!, namespace: options.host === "none" ? "" : options.namespace ?? "artroom", policy: options.registerPolicy ?? "keys", "founders": [signer.key] };
  return { signed: await signedIntent(signer, { to: null, kind: "install", fields }, at), key: signer.key };
}

/**
 * The ID of the register that a creation by this intent, under this version, makes: a scope's ID is a function of its seed, and
 * a register's seed of the creation intent and the version alone (the scope's `create` method).
 */
const registerIdOf = (creation: SignedIntent, definition: PlatformDefinition): ScopeId =>
  scopeIdOf({ v: 1, kind: "register", definition, creator: null, cause: intentDigest(creation.intent), ordinal: 0 });

/** Exact closed catalog selection; no name-only or newest provenance fallback. */
export function knownPlatform(named: unknown, name: string): ReturnType<typeof platform> {
  const supplied = typeof named === "string" ? platform(named) : null;
  return supplied?.data.name === name ? supplied : null;
}

/** Local recovery identity only. The signature and server decide authority. */
const installAttemptOf = (plan: PlannedInstall): Digest => textDigest(canonicalize({
  service: plan.service, operator: plan["founding"].intent.actor, "founding": plan["founding"], definition: plan.definition, register: plan.register,
}));

/** Verify exact selected custody without creating a second store or lock. */
async function readBackCohortConfig(ctx: Context, expected: Config | string): Promise<void> {
  let matches = false;
  try {
    const identity = typeof expected === "string" ? expected : canonicalize(expected);
    const saved = await ctx.store.config();
    matches = saved !== null && canonicalize(saved) === identity;
  } catch { /* no verified selected custody */ }
  if (!matches) stopCommand(failed("Held: storage of the exact selected install plan could not be verified. No request was sent by this run; keep the original request."));
}

async function saveCohortConfig(ctx: Context, config: Config): Promise<void> {
  const identity = canonicalize(config);
  const copy = parseStrict(identity) as Config;
  try { await ctx.store.save(copy); }
  catch { stopCommand(failed("Held: storage of the exact selected install plan failed. No request was sent by this run; keep the original request.")); }
  await readBackCohortConfig(ctx, identity);
}

function retainedCohortPlan(before: Config, service: string, options: InstallOptions, definition: PlatformDefinition): PlannedInstall {
  const plan = before.plan!;
  selectedPlan(plan); // Reject a malformed local marker before promotion.
  let compatible = false;
  try {
    compatible = plan.definition === definition && before.key === "operator"
      && plan.service === service && before.service === service
      && isSignedIntentShape(plan["founding"]) && verifySignedIntent(plan["founding"])
      && plan["founding"].intent.kind === "install" && plan["founding"].intent.to === null && plan["founding"].intent.on === null
      && Object.keys(plan["founding"].intent.expected).length === 0
      && typeof plan["founding"].intent.fields["host"] === "string" && typeof plan["founding"].intent.fields["namespace"] === "string"
      && (options.host === undefined || options.host === plan["founding"].intent.fields["host"])
      && (options.namespace === undefined || options.namespace === plan["founding"].intent.fields["namespace"])
      && (options.registerPolicy === undefined || options.registerPolicy === plan["founding"].intent.fields["policy"])
      && isScopeId(plan.register) && registerIdOf(plan["founding"], plan.definition) === plan.register;
  } catch { /* malformed retained plan cannot select a new request */ }
  if (!compatible) stopCommand(failed(`Refused: plan-mismatch. The retained install's cohort, service, host, namespace or policy conflicts with this request. The original plan is kept. ${planSent(plan)}`));
  return parseStrict(canonicalize(plan)) as PlannedInstall;
}

async function cohortPlan(ctx: Context, service: string, options: InstallOptions, before: Config | null, definition: PlatformDefinition): Promise<PlannedInstall> {
  if (!knownPlatform(definition, "platform:register")) stopCommand(failed(`Unsupported selected cohort: the exact register pin is not installed. ${before?.plan ? planSent(before.plan) : "Nothing was signed or sent."}`));
  if (before?.plan) {
    const plan = retainedCohortPlan(before, service, options, definition);
    await readBackCohortConfig(ctx, before);
    if (plan.selected !== true) {
      const promoted: PlannedInstall = { ...plan, selected: true };
      await saveCohortConfig(ctx, { ...before, plan: promoted });
      return promoted;
    }
    return plan;
  }
  if (before && (before.key !== "operator" || before.repository || before.claim || before.join)) {
    stopCommand(usage("This config directory already holds another setup or pending request. Use a separate config directory for the selected install."));
  }
  if (!answersVersionQuestion(definition, "cliNewInstallRegister")) {
    stopCommand(usage(`This cohort is retained for historical install plans only. For a new plan, --cohort takes ${CREATION_INSTALL_COHORTS.join(", ")}. Nothing was signed or sent.`));
  }
  const { signed } = await installing(ctx, options, { ...signing(ctx), lifetimeSeconds: PROPOSED_BOUNDS.intentLifetimeSeconds - 60 });
  const plan: PlannedInstall = { service, definition, "founding": signed, register: registerIdOf(signed, definition), selected: true };
  await saveCohortConfig(ctx, { ...before, v: 2, service, key: "operator", plan });
  return plan;
}

function plannedLines(plan: PlannedInstall): Outcome {
  const { host, namespace } = plan["founding"].intent.fields;
  return done(
    `Planned: register ${plan.register}, under ${plan.definition}, on host ${String(host)}, namespace ${String(namespace)}. The seed's time is ${plan["founding"].intent.notAfter}.`,
    `Set REGISTER_SCOPE to ${plan.register} in the Worker's settings, then run dap install --planned before ${plan["founding"].intent.notAfter}.`,
    ...(host === "none" ? ["No publication or journal archive: entries stay in the service within its bounds. The operator must back up the service."] : []),
  );
}

/**
 * `dap install --plan <base-url>`: sign the `install` intent and print the ID of the register that it will create, and create
 * nothing. The intent lives as long as an intent may, so it can be created until its `notAfter`, the time printed. The plan is
 * kept in the config, so that the operator can pin that ID in the Worker's host setting before the register exists, and then
 * run `install --planned`. Only a definitely-unsent legacy plan may be replaced; a selected cohort plan stays exact.
 */
export function planInstall(ctx: Context, service: string, options: InstallOptions = {}): Promise<Outcome> {
  return run(async () => {
    const selected = installSelection(options);
    if (options.host === "none") options = { ...options, namespace: "" };
    const before = await ctx.store.config();
    if (before?.register) return usage(`This config directory has a register already: ${before.register.scope}.`);
    if (selected) return plannedLines(await cohortPlan(ctx, service, options, before, selected));
    if (before?.plan && selectedPlan(before.plan)) return failed("Refused: install-pending. The retained selected plan must use its original cohort and request; run install --planned.");
    if (before?.plan?.attempted !== undefined) return failed("Refused: install-pending. Retry dap install --planned with the original plan; an attempted install cannot be replaced silently.");
    const { signed } = await installing(ctx, options, { ...signing(ctx), lifetimeSeconds: PROPOSED_BOUNDS.intentLifetimeSeconds - 60 });
    const register = registerIdOf(signed, NEW_REGISTER);
    await ctx.store.save({ v: 2, service, key: "operator", plan: { service, definition: NEW_REGISTER, "founding": signed, register } });
    const { host, namespace } = signed.intent.fields as { host: string; namespace: string };
    return done(
      `Planned: register ${register}, under ${NEW_REGISTER}, on host ${host}, namespace ${namespace}. The seed's time is ${signed.intent.notAfter}.`,
      `Set REGISTER_SCOPE to ${register} in the Worker's settings, then run dap install --planned before ${signed.intent.notAfter}.`,
    );
  });
}

/**
 * `dap install --planned`: found the register that `install --plan` planned, with the intent it kept. Before anything is
 * sent, the plan is checked: the register ID that its intent and version make must be the one it printed, and the version must be
 * a supported exact pinned version. A durable attempted marker precedes any
 * submission. Exact attempted late recovery retains the original plan and
 * configured-service acknowledgement; it claims no independent history proof.
 */
export function installPlanned(ctx: Context, options: Pick<InstallOptions, "cohort" | "registerPolicy"> = {}): Promise<Outcome> {
  return run(() => executePlannedInstall(ctx, options.cohort, undefined, options.registerPolicy));
}

async function executePlannedInstall(ctx: Context, cohort?: InstallCohort, expected?: PlannedInstall, registerPolicy?: RegisterPolicy): Promise<Outcome> {
  let selected = installSelection({ ...(cohort === undefined ? {} : { cohort }), ...(registerPolicy === undefined ? {} : { registerPolicy }) }, true);
  const before = await ctx.store.config();
  if (before?.register) return usage(`This config directory has a register already: ${before.register.scope}.`);
  const kept = before?.plan ?? stopCommand(usage("No install is planned here. Run: dap install --plan <base-url>."));
  if (cohort === undefined && answersVersionQuestion(kept.definition, "cliRetainedUnpublishedSelectionRegister")) selected = kept.definition;
  if (answersVersionQuestion(kept.definition, "cliRetiredCountingInstallRegister")) return failed(`Refused: retired-cohort. Choose a currently admitted cohort for a new room. The old plan is kept. ${planSent(kept)}`);
  if (selected && kept.definition !== selected) return failed(`Refused: plan-mismatch. The selected cohort conflicts with the original install plan. The plan is kept. ${planSent(kept)}`);
  if (registerPolicy !== undefined && (!isSignedIntentShape(kept["founding"]) || kept["founding"].intent.fields["policy"] !== registerPolicy)) return failed(`Refused: plan-mismatch. The register policy conflicts with the original install plan. The plan is kept. ${planSent(kept)}`);
  if (expected && canonicalize(kept) !== canonicalize(expected)) return failed(`Held: the selected install plan changed before delivery. Restore the original request. ${planSent(kept)}`);
  const strictCustody = selectedPlan(kept) || selected !== undefined;
  let plan = strictCustody ? parseStrict(canonicalize(kept)) as PlannedInstall : kept;
  const operator = await storedSigner(ctx.store, "operator");
  const now = ctx.now?.() ?? Date.now();
  if (!knownPlatform(plan.definition, "platform:register")) return failed(`Unsupported install provenance: this command cannot serve the plan's exact pinned register version. The pending plan is kept. ${planSent(plan)}`);
  const valid = isSignedIntentShape(plan["founding"]) && verifySignedIntent(plan["founding"])
    && plan["founding"].intent.kind === "install" && plan["founding"].intent.to === null && plan["founding"].intent.on === null
    && Object.keys(plan["founding"].intent.expected).length === 0
    && before!.key === "operator" && operator !== null && plan["founding"].intent.actor === operator.key
    && typeof plan.service === "string" && plan.service === before!.service
    && isScopeId(plan.register) && registerIdOf(plan["founding"], plan.definition) === plan.register
    && timeMs(plan["founding"].intent.notAfter)! - now <= PROPOSED_BOUNDS.intentLifetimeSeconds * 1000;
  if (!valid) {
    return failed(`Refused: plan-mismatch. The saved plan does not match this service, operator key and supported register version. ${planSent(plan)} Keep the original plan for recovery; do not silently replace it.`);
  }
  const attempt = installAttemptOf(plan);
  if (plan.attempted !== undefined && plan.attempted !== attempt) return failed(`Refused: plan-mismatch. The attempted marker belongs to another service, operator, envelope, version or register. The pending plan is kept. ${planSent(plan)}`);
  if (plan.attempted === undefined && now >= timeMs(plan["founding"].intent.notAfter)!) {
    const label = Object.entries(INSTALL_COHORTS).find(([, pin]) => pin === plan.definition)?.[0] ?? "trusted-application";
    return failed(`Refused: plan-expired. The planned install could be created until ${plan["founding"].intent.notAfter}. ${strictCustody
      ? `No request was sent by this run. Keep this original config directory unchanged. For a new plan${CREATION_INSTALL_COHORTS.some(name => name === label) ? ` on ${label}` : " on an admitted cohort"}, set DAP_HOME to a separate empty directory. If ARTROOM_HOME is set, unset it or set it to that same new directory; different directories refuse before configuration is read. Configure the host with that new plan's register ID before installing.`
      : "Nothing was sent. Plan again, and set the new register ID."}`);
  }
  const matches = (receipt: unknown): receipt is NonNullable<PlannedInstall["acknowledged"]>["receipt"] => isReceipt(receipt)
    && receipt.definition === plan.definition && receipt.intent === intentDigest(plan["founding"].intent)
    && receipt.fact.at.scope === plan.register && receipt.fact.seq === 0 && receipt.fact.at.genesis === receipt.fact.hash;
  const prior = plan.acknowledged;
  if (prior !== undefined && (!prior || prior.status !== "service-acknowledged" || prior.service !== plan.service || !matches(prior.receipt))) {
    return failed("Held: the retained install acknowledgement does not match the original plan. The plan is kept.");
  }
  if (ctx.fetch !== undefined && (ctx.trustedCreationService?.service !== plan.service || ctx.trustedCreationService.fetch !== ctx.fetch)) {
    return failed(`Held: this injected transport has no configured-service acknowledgement trust. The plan is kept. ${planSent(plan)}`);
  }
  if (selected && plan.selected !== true) {
    plan = { ...plan, selected: true };
    await saveCohortConfig(ctx, { ...before!, plan });
  }
  // The durable marker must precede the first possible request. An exact
  // attempted replay may recover an accepted genesis after expiry; the
  // server still refuses an expired creation that was never accepted.
  if (plan.attempted === undefined) {
    const pending: Config = { ...before!, plan: { ...plan, attempted: attempt } };
    if (strictCustody) await saveCohortConfig(ctx, pending);
    else await ctx.store.save(pending);
  } else if (strictCustody) await readBackCohortConfig(ctx, { ...before!, plan });
  const { answer } = await create(transportOf(ctx, plan.service), plan["founding"], plan.definition);
  const receipt = accepted(answer, null, "Installed").receipt;
  if (!matches(receipt)) {
    return failed("Held: the install acknowledgement does not match the planned register's exact identity. The plan is kept.");
  }
  if (prior !== undefined && canonicalize(prior.receipt.fact) !== canonicalize(receipt.fact)) {
    return failed("Held: the install acknowledgement conflicts with the retained accepted fact. The plan is kept.");
  }
  // Save acceptance evidence before the final installed config. A lost final
  // save can recover only the same fact; neither save erases the envelope.
  const acknowledged: PlannedInstall = { ...plan, attempted: attempt, acknowledged: { status: "service-acknowledged", service: plan.service, receipt } };
  await ctx.store.save({ ...before!, plan: acknowledged });
  await ctx.store.save({ ...before!, plan: acknowledged, register: receipt.fact.at });
  return done(`Installed: register ${receipt.fact.at.scope}, under ${plan.definition}, as planned.`, "Service-acknowledged identity recovery. The original plan and receipt are retained for later history verification.");
}
