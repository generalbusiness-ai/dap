import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertInventory, documentedInventory, servedInventory, sourceSeal, roomHttpEntry } from "./security-entry-points.mjs";

// Reviewed matcher/gate owners. These are change tripwires, not runtime proof.
const seals = {
  "apps/room/worker.ts": "aba04e12dc206f0be6bda4a8edeac64569e0edd44b7a87772595d7db40bb8b67",
  "apps/room/fetch.ts": "aa7ec3ca7b1dd3241d3e367ee929d68e2d64c09330d9f02bad3953bf8b49d49c",
  "apps/room/demo-creation.ts": "8e2a4ccc7c203e2f6bdcdf874142eeae149e91267d02068d0135f2a423bd0d25",
  "apps/room/page/route.ts": "62c8f69b9f516f1b5acdaef57d7aed25268d8cf03283bdffdd4b1b5f20bb6b3d",
  "apps/room/brand/route.ts": "71b45ff9b41b3bea31c775a16525349591e0d4f7dfdc65da79f095816b1c343c",
  "packages/scope/src/worker.ts": "aafe285c0e6245b242802c25cc4b4ae8b6d96ecfa928d16a90a4ed90bd1e57e4",
  "packages/scope/src/creation-admission.ts": "c45a0ac9231356298e9e2724cc1154bdd40def91b5bdc1e1bf6d14c4331eb42e",
  "packages/scope/src/health.ts": "5da6a38c8c76199414f5a7ae57d3f57a0070347edd4b9512ab1430b8a4e1b401",
  "packages/scope/src/site/route.ts": "2957f45c6c0281fdd282dc42607c7650f6002e10bb6520127b42c7e6550a7039",
  "packages/scope/src/applications/route.ts": "5788ad312f08eeab53a8592398e23cb3bc8081061cb80f8879cf0816a4799226",
  "packages/scope/src/item-query-wire.ts": "18c860286adefc1afab7cf14ceceea44c59e78031042aed3d781c5576b73ecea",
  "packages/scope/src/applications/projection-wire.ts": "cecaa88f08db6745013a9cb9fbcb9edee6939b0859c201e0c8057286529f1cdc",
  "packages/scope/src/object.ts": "3f89c484132ef3cf79b3fd3a76e058601201b630abf0e48cb550b0f7216ac365",
  "packages/scope/src/core.ts": "189ad7c56b9b772fc241fb10b78ba219627bdb04bef4e8d0ec9c1c3e07c992db",
  "packages/derive/src/genesis.ts": "3cedd7e1124a234aef7f04fb48c25e34c482e6fded7d4423ec666ae41e39c586",
  "packages/derive/src/judge.ts": "222d6d89be14fd62f59857778b0bf7e52f1f0b3d2f5df8d50b533a8f20d8cb14",
  "packages/scope/src/sessions.ts": "9169e7d570f9d0e160d063059eb6db8506741b4ab73f873f90eb8cef5cb250e9",
  "packages/scope/src/reads.ts": "aeee3abca293fd90aaabc605890258f05b935b358ddb08073a1b073edfe426f4",
  "packages/scope/src/signed-reads.ts": "af6032fc04fd7f7e2384aacd87d485a029c5f9d09eca77577c81f41ea69f7f10",
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
  "packages/scope/src/archive-driver.ts": "b7c3a13a59e7aae8a7eae2d7f601dc6e9f697c55c18d0094ec7499d45dd11ece",
  "packages/scope/src/archive-row.ts": "c09e55ca926be59400a055a75013993203931c923f21e455bed62eb51f224549",
  "packages/scope/src/floor-writer.ts": "a55c28f393f59297fe952104b576b275c73c451456afced3d8cac33dc54f2ff4",
  "packages/scope/src/object.ts": "3f89c484132ef3cf79b3fd3a76e058601201b630abf0e48cb550b0f7216ac365", // Same adopted value as the original owner map above.
  "apps/room/worker.grow.ts": "791c2bfcb8b2a62d8f0d8afec627ac76b63be4b9f1ee5de27d3f6c081959bc01",
  "apps/room/archive-policy.ts": "707d55642fa0a35075614d1f7b02149b8a33f5eb128f0e0ef4b54100aaa1897f",
  "apps/room/archive.ts": "fd0e00f874b6607728bc5a63842a64e41799f1041f9c5952978c2d86dfc048a2",
  "packages/scope/src/archive-host-item.ts": "70ac9b23e986d0f399d9e64748381f97ee6c5f7e39971b9dd3a1fa6d700bbf4e",
  "packages/scope/src/archive-host.ts": "29e262731d46335cb9535b10e2c1de36b6b3a6f8ea42c77be4b628378704dfd7",
  "packages/scope/src/artifacts-host.ts": "3aaf075454b58ceae380bf9ab667d3a26d173776936ddd63d2bf01bbe865a698",
  "packages/scope/src/artifacts-wiring.ts": "3590510139ad5c73a6ff66396b77a83dae5d212bfbcebb332df80154961fd478",
};
const document = () => documentedInventory(readFileSync(new URL("../docs/security/entry-points.md", import.meta.url), "utf8"));

test("every served Worker route/method has exactly its reviewed gate-class row", async () => {
  assertInventory(await servedInventory(), document());
  for (const [file, seal] of Object.entries(pendingArchiveSeals)) {
    assert.equal(typeof seal, "string", `Integrated AST seal is pending review: ${file}`);
    assert.equal(sourceSeal(file), seal, `Review changed archive authority owner: ${file}`);
  }
  for (const [file, seal] of Object.entries(seals)) assert.equal(sourceSeal(file), seal, `Review changed matcher or gate owner: ${file}`);
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
