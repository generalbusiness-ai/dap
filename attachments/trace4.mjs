// Dynamic trace 4: parentless creation admission by settings. Usage: node trace4.mjs <repo root>
const root = process.argv[2];
const { parentlessCreationAdmission } = await import(`${root}/packages/scope/src/creation-admission.ts`);
console.log("== Trace 4: parentless creation admission by settings");
{
  const seed = { v: 1, kind: "directory", definition: "platform:directory@26", creator: null, cause: "sha256:" + "0".repeat(64), ordinal: 0 };
  const signed = { intent: { kind: "found", to: null }, signature: "x" };
  const show = (label, settings) => console.log(`${label.padEnd(58)} ${JSON.stringify(parentlessCreationAdmission(settings, signed, seed))}`);
  show("no DEPLOYMENT, no register pin (template before secrets):", {});
  show("DEPLOYMENT set, no register pin:", { DEPLOYMENT: "dap-my-room" });
  show("DEPLOYMENT set, ALLOW_OPEN_CREATION=true, no register pin:", { DEPLOYMENT: "dap-my-room", ALLOW_OPEN_CREATION: "true" });
}
