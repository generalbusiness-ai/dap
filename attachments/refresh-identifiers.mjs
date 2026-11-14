// Planning artifact only. Root must review/freeze this wrapper and grant the preparation slot before any invocation.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [mode, suppliedRoot, suppliedOutput, head, tree] = process.argv.slice(2);
if (!["compare", "apply"].includes(mode) || !suppliedRoot || !suppliedOutput || !/^[a-f0-9]{40}$/.test(head ?? "") || !/^[a-f0-9]{40}$/.test(tree ?? "")) throw Error("Pass compare/apply, the reviewed checkout, new preparation directory, exact input head and tree.");
const root = realpathSync(suppliedRoot), output = resolve(suppliedOutput);
if (output === root || output.startsWith(root + "/")) throw Error("Keep preparation evidence outside the checkout.");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const guard = () => {
  if (git("rev-parse", "HEAD") !== head || git("rev-parse", "HEAD^{tree}") !== tree || git("status", "--porcelain") !== "") throw Error("Input source changed or is dirty.");
};
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const targets = ["examples/grow/release-identifiers.json", "examples/lending/release-identifiers.json", "apps/counter/release-identifiers.json"];
guard();

if (mode === "compare") {
  mkdirSync(output, { mode: 0o700 }); // Refuse an existing record; never overwrite preparation evidence.
  const local = createRequire(resolve(root, "package.json"));
  const clientPath = realpathSync(local.resolve("@generalbusiness/dap-client"));
  if (clientPath !== realpathSync(resolve(root, "packages/client/src/index.ts"))) throw Error("Client workspace binding is outside this checkout.");
  const { secretSigner } = await import(pathToFileURL(clientPath));
  const { prepareApplicationDirectory } = await import(pathToFileURL(resolve(root, "packages/cli/src/application-files.ts")));
  const { prepareGrowDemo } = await import(pathToFileURL(resolve(root, "examples/grow/prepare-demo.ts")));
  const grow = await prepareGrowDemo(resolve(output, "generated-grow-source"));
  const signer = secretSigner(new Uint8Array(32).fill(254)); // R1's public TEST signer; no custody or key file.
  const sources = [
    { name: "Grow", root: grow, config: "dap.application.json", path: targets[0] },
    { name: "Lending", root, config: "examples/lending/dap.application.json", path: targets[1] },
    { name: "Counter", root, config: "apps/counter/dap.application.json", path: targets[2] },
  ];
  const records = [];
  for (const source of sources) {
    const original = readFileSync(resolve(root, source.path));
    const { packet } = await prepareApplicationDirectory(source.root, signer, { config: source.config });
    const expectedVersion = source.name === "Grow" ? "2.0.0" : "0.2.0";
    if (packet.package.release.manifest.version !== expectedVersion) throw Error("Merged source has an unexpected current release version; stop for planner review.");
    const identifiers = { entry: packet.package.semantic.entry, definitions: packet.package.semantic.definitions.map(part => part.id).sort(), semantic: packet.ids.semantic, presentation: packet.ids.presentation };
    const candidate = Buffer.from(JSON.stringify(identifiers, null, 2) + "\n");
    const originalFile = source.name.toLowerCase() + ".original.json", candidateFile = source.name.toLowerCase() + ".candidate.json";
    writeFileSync(resolve(output, originalFile), original, { flag: "wx", mode: 0o600 });
    writeFileSync(resolve(output, candidateFile), candidate, { flag: "wx", mode: 0o600 });
    records.push({ name: source.name, version: expectedVersion, path: source.path, originalFile, candidateFile, originalSha256: sha(original), candidateSha256: sha(candidate),
      identifiersChanged: JSON.stringify(JSON.parse(original)) !== JSON.stringify(identifiers) });
  }
  guard();
  writeFileSync(resolve(output, "comparison.json"), JSON.stringify({ qualification: "R1 normal preparation functions; public TEST signer; no public packet exported", head, tree, records }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ head, tree, identifiersChanged: records.map(({ name, identifiersChanged }) => ({ name, identifiersChanged })) }));
} else {
  const record = JSON.parse(readFileSync(resolve(output, "comparison.json"), "utf8"));
  if (record.head !== head || record.tree !== tree || JSON.stringify(record.records.map(r => r.path)) !== JSON.stringify(targets)) throw Error("Comparison record names another source or target set.");
  // Verify every old/candidate byte set before changing any identifier file. No versions, signatures or release constants change.
  for (const [index, row] of record.records.entries()) {
    const name = ["Grow", "Lending", "Counter"][index];
    if (row.name !== name || row.originalFile !== name.toLowerCase() + ".original.json" || row.candidateFile !== name.toLowerCase() + ".candidate.json") throw Error("Comparison file names changed.");
    if (sha(readFileSync(resolve(root, row.path))) !== row.originalSha256 || sha(readFileSync(resolve(output, row.originalFile))) !== row.originalSha256 ||
      sha(readFileSync(resolve(output, row.candidateFile))) !== row.candidateSha256) throw Error("Original or candidate identifier bytes changed.");
  }
  guard();
  for (const row of record.records) if (row.identifiersChanged) writeFileSync(resolve(root, row.path), readFileSync(resolve(output, row.candidateFile)));
  writeFileSync(resolve(output, "applied.json"), JSON.stringify({ head, tree, changed: record.records.filter(row => row.identifiersChanged).map(row => row.path) }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log("NF5 Grow identifiers changed: " + record.records.find(row => row.name === "Grow").identifiersChanged);
}
