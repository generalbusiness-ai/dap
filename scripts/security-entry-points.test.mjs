import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertInventory, documentedInventory, servedInventory, sourceSeal, roomHttpEntry, sandboxInventory } from "./security-entry-points.mjs";

// Reviewed matcher/gate owners. These are change tripwires, not runtime proof.
const seals = {
  "apps/room/worker.ts": "aba04e12dc206f0be6bda4a8edeac64569e0edd44b7a87772595d7db40bb8b67",
  "apps/room/fetch.ts": "5661bfc33c21e9c0390f9897edb6948d05c1de42e3df559a8e8d16d16e8c1089", // R2 owning AST value adopted on the reviewed branch.
  "apps/room/demo-creation.ts": "422bbb901795ddad480e13edaaf50dcceaf1f9daa80af6c1671399c70031c8fd",
  "apps/room/page/route.ts": "62c8f69b9f516f1b5acdaef57d7aed25268d8cf03283bdffdd4b1b5f20bb6b3d",
  "apps/room/brand/route.ts": "71b45ff9b41b3bea31c775a16525349591e0d4f7dfdc65da79f095816b1c343c",
  "packages/scope/src/worker.ts": "9ee48699b984552477c84373f81fcc42a9c88963b4591655ecbe3c9d5df7fef2", // Actual union parser value adopted by root.
  "packages/scope/src/scope-index.ts": "c7abd0c5c5a148630ac4ede762fa951169a6d912a89eb58cadb747ab7544a2ca", // New internal lookup/registration boundary.
  "packages/scope/src/creation-admission.ts": "c45a0ac9231356298e9e2724cc1154bdd40def91b5bdc1e1bf6d14c4331eb42e", // Reviewed R1 ancestry owner; adopted AST value.
  "packages/scope/src/creation-lineage.ts": "fc478ab58d801383fc29f1cab65bd03fc6aa07118a0d6c8376bafe2ead03b404", // Reviewed whole-lineage boundary; adopted AST value.
  "packages/scope/src/creation-declaration.ts": "f14aac1ac8bce20cb8bc254b790ec5e66614ce13e9a72b42ab1a097aee837e72", // Bounded immutable native Directory custody, not authority.
  "packages/scope/src/namespace.ts": "d1d8a4b6648c6c7914916b662f8d8829ac954f205644c669865ad5daad1d9dd5", // Reviewed internal declaration RPC; adopted AST value.
  "packages/scope/src/health.ts": "5da6a38c8c76199414f5a7ae57d3f57a0070347edd4b9512ab1430b8a4e1b401",
  "packages/scope/src/site/route.ts": "2957f45c6c0281fdd282dc42607c7650f6002e10bb6520127b42c7e6550a7039",
  "packages/scope/src/applications/route.ts": "0f780b2b47a665f74dd1c65ce4a0b7d6d89e5fdc5973d62f9655ded2c8bd93ed", // Actual union parser value adopted by root.
  "packages/scope/src/item-query-wire.ts": "18c860286adefc1afab7cf14ceceea44c59e78031042aed3d781c5576b73ecea",
  "packages/scope/src/applications/projection-wire.ts": "cecaa88f08db6745013a9cb9fbcb9edee6939b0859c201e0c8057286529f1cdc",
  "packages/scope/src/object.ts": "ee8009861e1b87f4932fe617e062cf016b90ad67e4585d29eca6957538edfc45", // R2 target-owned genesis registration.
  "packages/scope/src/core.ts": "189ad7c56b9b772fc241fb10b78ba219627bdb04bef4e8d0ec9c1c3e07c992db",
  "packages/derive/src/genesis.ts": "3cedd7e1124a234aef7f04fb48c25e34c482e6fded7d4423ec666ae41e39c586",
  "packages/derive/src/judge.ts": "222d6d89be14fd62f59857778b0bf7e52f1f0b3d2f5df8d50b533a8f20d8cb14",
  "packages/scope/src/sessions.ts": "2c39578d800619bd232c3f375cbd523bcbf3ea22ffa99a052b16f93fc72fe585",
  "packages/scope/src/reads.ts": "aeee3abca293fd90aaabc605890258f05b935b358ddb08073a1b073edfe426f4",
  "packages/scope/src/signed-reads.ts": "08adcdf224ad69b7818c288f3a81178621256f242bec1992cd723ca745a4c8b7", // R12 custody-only serving helper; native checks unchanged.
  "packages/scope/src/limits.ts": "f71cd0690fb1e715e7b7db9a6bc714b47a8a558bd0910505d1103e0c6610387b", // R12 verified-key join failure window.
  "packages/scope/src/serving-limits.ts": "e8f4655a8d9d17e9120bff9404849187721bb5db555abeaba9ae4fc186deca1a", // New bounded memory-only counter, no live eviction.
  "packages/scope/src/serving-admission.ts": "061d72828998343976f3e128bcb561a49629c10b676e401708777d948c632e9b", // New bounded original-signature/counter ingress.
  "packages/bytes/src/records.ts": "bc4e65e75215c2d940b0884a6810d5d90969455ba956c1e9731a3ed0d3c1b6af", // Public typed read refusal vocabulary (kernel section 7).
  "packages/scope/src/session-preparation.ts": "614c8f3825508f2271f7c25e06e090d71d2697b2ebdd3e214f4155de2ccdf8b7",
  "packages/scope/src/item-queries.ts": "3d4cc1bdc183f14f7a813d4fa7ef377ea5b2b66e8d6d7e01793cae9486b39530",
  "packages/scope/src/applications/projection.ts": "53d2294f6caff609b39bac2becbaaa7b3563435898be14241540ef4d12c17b01",
  "packages/scope/src/destination-host.ts": "759fcad46e39eec94de43513f972006590cb5681fbc64128e779ea218eb59a29",
  "packages/mcp/src/hosted.ts": "d18b3b62646d858ea1460a92633dfacf208f4e99bb20bec14211907c7d5caf3e",
  "packages/mcp/src/http.ts": "c8148a169abdbbfcf86ce446752a792c9f8ac5bc78038f973d5906913188fc8b",
  "examples/grow/simulator-worker.ts": "2d60dab3a9a5b204b69f15bc5ec3473fa48513888d7ffdb0c1fc179f6fe4883c",
  "examples/grow/simulator-host.ts": "53668f18cbfb33bf8ad38892fdbafd4aba3736b7987238e643e0d661cee6c1bf"
};
// Integrated archive owners computed by the maintained owning parser.
// Root adopted the reviewed outputs; the historical map name is retained here.
const pendingArchiveSeals = {
  // Publication and floor owners were reviewed before these values were
  // computed by the maintained parser on the integrated source.
  "packages/scope/src/archive-target.ts": "f23598cd54a6dea92e2b73ae4d144b7415aa98f379f76d9ff21fe4e59b431d5e",
  "packages/scope/src/archive-source-window.ts": "5ebf1d481081ae462374a33496b92310617a1bf3af1da675407f26017da3dfb1",
  "packages/scope/src/archive-publication.ts": "9c80517fd5de98545a0042f8fa7675769166de5a6387b9e6b60ddc9e5b68b2a5",
  "packages/scope/src/archive-build.ts": "8ecba805ae96c5e8f854d429878d438f5bca17536fa3ace22152c12b017e9186",
  "packages/scope/src/archive-driver.ts": "35510dbb61c75496ac3e0e363d49d1137284671cc4c383582222cca8ee0a3e6d", // Parent-read diagnostic reviewed; actual maintained parser output.
  "packages/scope/src/archive-row.ts": "6387b60a8ecd09a7dd3166ca1dac7f5c3749e61d7e02adf64878cbd8c9cf4412",
  "packages/scope/src/floor-writer.ts": "a55c28f393f59297fe952104b576b275c73c451456afced3d8cac33dc54f2ff4",
  "packages/scope/src/object.ts": "ee8009861e1b87f4932fe617e062cf016b90ad67e4585d29eca6957538edfc45", // Must match the separately adopted original owner value above.
  "apps/room/worker.grow.ts": "791c2bfcb8b2a62d8f0d8afec627ac76b63be4b9f1ee5de27d3f6c081959bc01",
  "apps/room/archive-policy.ts": "707d55642fa0a35075614d1f7b02149b8a33f5eb128f0e0ef4b54100aaa1897f",
  "apps/room/archive.ts": "fd0e00f874b6607728bc5a63842a64e41799f1041f9c5952978c2d86dfc048a2",
  "packages/scope/src/archive-host-item.ts": "70ac9b23e986d0f399d9e64748381f97ee6c5f7e39971b9dd3a1fa6d700bbf4e",
  "packages/scope/src/archive-host.ts": "f16f3972e28d1f2bbdc1e98f60f21bc38be82b2d3a3b851e552e6391eb94d0cd", // Parent-read diagnostic reviewed; actual maintained parser output.
  "packages/scope/src/artifacts-host.ts": "80aac5184db427e83c369ab4d0222276fd7e3fe9792edcacc6d2c3ba6e9e8f2a",
  "packages/scope/src/artifacts-wiring.ts": "3590510139ad5c73a6ff66396b77a83dae5d212bfbcebb332df80154961fd478",
};
// Actual maintained parser outputs adopted by root; never infer hashes from intent.
const pendingR8Seals = {
  "packages/cli/src/commands.ts": "af31349c0023968b4cde7c63927dbda79a8156ab3bad6278cac0ee62676b9781", // Actual integrated CLI parser value adopted by root.
  "apps/sandbox/worker.ts": "e1e91663d3b1e6b1751f526c02770e7459fbe08c455385bda2daeec65ae84010",
  "packages/client/src/application-gateway.ts": "c24b17dfa7f31f16386bb2e921ca78e2f58640de26618144d06cca4aa0343fc8",
  "packages/client/src/application-route.ts": "f78d183f082f52de545cc1ef0cd9c33b0944260f782a53188f05c3545ba246c1",
  "packages/scope/src/applications/bindings.ts": "8212d318f058035a580c945f1140717fe31ea42638024e1099069cf654400888",
};
const document = () => documentedInventory(readFileSync(new URL("../docs/security/entry-points.md", import.meta.url), "utf8"));

test("every served Worker route/method has exactly its reviewed gate-class row", async () => {
  assertInventory(await servedInventory(), document());
  for (const [file, seal] of Object.entries(pendingArchiveSeals)) {
    assert.equal(typeof seal, "string", `Integrated AST seal is pending review: ${file}`);
    assert.equal(sourceSeal(file), seal, `Review changed archive authority owner: ${file}`);
  }
  for (const [file, seal] of Object.entries(seals)) {
    assert.equal(typeof seal, "string", `Integrated R8 AST seal is pending review: ${file}`);
    assert.equal(sourceSeal(file), seal, `Review changed matcher or gate owner: ${file}`);
  }
  for (const [file, seal] of Object.entries(pendingR8Seals)) {
    assert.equal(typeof seal, "string", `Integrated R8 AST seal is pending review: ${file}`);
    assert.equal(sourceSeal(file), seal, `Review sandbox owner: ${file}`);
  }
});

test("a real matcher change fails the inventory bijection with the page unchanged", async () => {
  const source = readFileSync(new URL("../packages/scope/src/worker.ts", import.meta.url), "utf8");
  const before = 'if (what === "requests") return read(await scopes.requests';
  assert.equal(source.split(before).length, 2, "The control must change exactly one dispatch branch");
  const changed = await servedInventory({ scopeSource: source.replace(before, 'if (what === "request-window") return read(await scopes.requests') });
  const routes = changed.get("artroom-scope").map(row => row.route);
  assert.ok(routes.includes("GET /v1/scopes/:scope/request-window"), "The new matcher must actually dispatch");
  assert.ok(!routes.includes("GET /v1/scopes/:scope/requests"), "The old matcher must no longer dispatch");
  assert.throws(() => assertInventory(changed, document()), { code: "ERR_ASSERTION", message: /route\/method\/gate bijection/ });
});

test("the bijection rejects a missing row, an extra row, and a changed gate", async () => {
  // These in-memory composition controls never import a Worker module.
  const grow = readFileSync(new URL("../apps/room/worker.grow.ts", import.meta.url), "utf8");
  const forward = 'export { default } from "./worker.ts";';
  assert.equal(grow.split(forward).length, 2);
  assert.equal(roomHttpEntry("apps/room/worker.grow.ts"), "apps/room/fetch.ts");
  const modeled = changed => roomHttpEntry("apps/room/worker.grow.ts", file =>
    file === "apps/room/worker.grow.ts" ? changed : readFileSync(new URL("../" + file, import.meta.url), "utf8"));
  for (const changed of [
    grow.replace(forward, 'export { default } from "./other.ts";'),
    grow.replace(forward, 'export { fetch as default } from "./worker.ts";'),
    grow.replace(forward, 'export default {};'),
  ]) assert.throws(() => modeled(changed), { code: "ERR_ASSERTION" });
  // Duplicate defaults are invalid module syntax. Either the parser or the
  // composition model must refuse; do not normalize production parse errors.
  assert.throws(() => modeled(grow + '\nexport { default } from "./worker.ts";'));
  assert.throws(() => roomHttpEntry("apps/room/unreviewed.ts"), { code: "ERR_ASSERTION" });
  const actual = await servedInventory();
  for (const fault of [rows => rows.slice(1), rows => [...rows, { route: "POST /unserved", gate: "none" }], rows => rows.map((row, i) => i === 0 ? { ...row, gate: "membership" } : row)]) {
    const docs = document(); docs.set("artroom-scope", fault(docs.get("artroom-scope")));
    assert.throws(() => assertInventory(actual, docs), { code: "ERR_ASSERTION", message: /route\/method\/gate bijection/ });
  }
});

// Controls alter actual matchers while keeping the documented inventory fixed.
test("R8 public and sandbox matcher changes fail their finite inventory", async () => {
  const source = readFileSync(new URL("../packages/scope/src/applications/route.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function applicationPage(");
  assert.ok(start > 0);
  const prefix = 'startsWith("/applications/")';
  const publicPart = source.slice(start);
  assert.equal(publicPart.split(prefix).length, 2);
  const changed = source.slice(0, start) + publicPart.replace(prefix, 'startsWith("/other-applications/")');
  const changedInventory = await servedInventory({ applicationSource: changed });
  assert.throws(() => assertInventory(changedInventory, document()), { code: "ERR_ASSERTION" });
  const gateway = readFileSync(new URL("../packages/client/src/application-gateway.ts", import.meta.url), "utf8");
  const before = '["acts", "settle", "sessions"]';
  assert.equal(gateway.split(before).length, 2);
  const baseline = await sandboxInventory();
  assert.ok(baseline.some(row => row.route === "POST /v1/scopes/:scope/acts"));
  const narrowed = await sandboxInventory({ gatewaySource: gateway.replace(before, '["settle", "sessions"]') });
  assert.ok(!narrowed.some(row => row.route === "POST /v1/scopes/:scope/acts"));
  assert.notDeepEqual(narrowed, baseline);
  const sandbox = readFileSync(new URL("../apps/sandbox/worker.ts", import.meta.url), "utf8");
  const metadataGate = 'request.method !== "GET" || !!url.search';
  assert.equal(sandbox.split(metadataGate).length, 2);
  const noMetadata = await sandboxInventory({ sandboxSource: sandbox.replace(metadataGate, 'request.method !== "POST" || !!url.search') });
  assert.ok(baseline.some(row => row.route === "GET /_application-host"));
  assert.ok(!noMetadata.some(row => row.route === "GET /_application-host"));
});
