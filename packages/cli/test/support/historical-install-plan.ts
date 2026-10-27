import { expect } from "vitest";
import { DOMAINS, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, domainBytes, intentDigest, scopeIdOf, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { planInstall, type Context, type InstallOptions } from "../../src/commands.ts";
import { storedSigner } from "../../src/store-signer.ts";

/** Construct unsent historical local custody, not a current creation offer or
 * native receipt. First use a valid current host to obtain operator custody.
 * Before any delivery, construct the historical host envelope with that signer,
 * retaining its idempotency key and deadline, then bind the exact old pin/ID.
 * No attempted or acknowledged request is replaced or re-signed. Callers own
 * their separate historical delivery and recovery assertions. */
export async function retainHistoricalInstallPlan(
  ctx: Context,
  service: string,
  definition: PlatformDefinition,
  options: Pick<InstallOptions, "host" | "namespace"> = {},
): Promise<void> {
  const before = await ctx.store.config();
  expect(before?.plan, "historical fixture must not replace retained custody").toBeUndefined();
  expect(before?.register, "historical fixture must not replace an installed register").toBeUndefined();
  const prepared = await planInstall(ctx, service, { ...options, host: "github.com" });
  expect(prepared.code, prepared.lines.join("\n")).toBe(0);
  const config = (await ctx.store.config())!, plan = config.plan!;
  expect([plan.attempted, plan.acknowledged], "historical construction precedes any delivery").toEqual([undefined, undefined]);
  let founding = plan.founding;
  const host = options.host ?? "github.com";
  if (host !== founding.intent.fields["host"]) {
    const signer = await storedSigner(ctx.store, "operator");
    expect(signer, "historical fixture requires its operator signer").not.toBeNull();
    const intent = { ...founding.intent, fields: { ...founding.intent.fields, host } };
    founding = { intent, sig: await signer!.sign(domainBytes(DOMAINS.intent, intent)) };
  }
  expect(founding.intent.fields["host"], "actual historical host").toBe(host);
  expect(verifySignedIntent(founding), "historical fixture signature").toBe(true);
  const signed = canonicalize(founding);
  await ctx.store.save({ ...config, plan: { ...plan, founding, definition, selected: true,
    register: scopeIdOf({ v: 1, kind: "register", definition, creator: null, cause: intentDigest(founding.intent), ordinal: 0 }) } });
  expect(canonicalize((await ctx.store.config())!.plan!.founding), "retained historical envelope").toBe(signed);
}
