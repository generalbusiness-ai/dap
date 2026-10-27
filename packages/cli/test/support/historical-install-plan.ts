import { expect } from "vitest";
import type { PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, scopeIdOf } from "@generalbusiness/dap-bytes";
import { planInstall, type Context, type InstallOptions } from "../../src/commands.ts";

/** Construct retained historical local custody for a test. This is not a new
 * creation offer or native receipt. The signed genesis fields do not name the
 * register definition: keep that envelope unchanged and derive the old ID from
 * the fixture's exact pin. This helper only constructs local custody; each
 * caller separately establishes its own delivery boundary. */
export async function retainHistoricalInstallPlan(
  ctx: Context,
  service: string,
  definition: PlatformDefinition,
  options: Pick<InstallOptions, "host" | "namespace"> = {},
): Promise<void> {
  const before = await ctx.store.config();
  expect(before?.plan, "historical fixture must not replace retained custody").toBeUndefined();
  expect(before?.register, "historical fixture must not replace an installed register").toBeUndefined();
  const prepared = await planInstall(ctx, service, options);
  expect(prepared.code, prepared.lines.join("\n")).toBe(0);
  const config = (await ctx.store.config())!, plan = config.plan!;
  const signed = canonicalize(plan.founding);
  await ctx.store.save({ ...config, plan: { ...plan, definition, selected: true,
    register: scopeIdOf({ v: 1, kind: "register", definition, creator: null, cause: intentDigest(plan.founding.intent), ordinal: 0 }) } });
  expect(canonicalize((await ctx.store.config())!.plan!.founding), "retained historical envelope").toBe(signed);
}
