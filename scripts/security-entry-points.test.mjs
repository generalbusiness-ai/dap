import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertInventory, documentedInventory, servedInventory, sourceSeal, roomHttpEntry } from "./security-entry-points.mjs";

// Reviewed matcher/gate owners. These are change tripwires, not runtime proof.
const seals = {
  "apps/room/worker.ts": "aba04e12dc206f0be6bda4a8edeac64569e0edd44b7a87772595d7db40bb8b67",
  "apps/room/fetch.ts": "535711961fe74cb0a737cae219f4a29df5fcf56239ed0dd44013e7c75081c2f6",
  "apps/room/demo-creation.ts": "8e2a4ccc7c203e2f6bdcdf874142eeae149e91267d02068d0135f2a423bd0d25",
  "apps/room/page/route.ts": "62c8f69b9f516f1b5acdaef57d7aed25268d8cf03283bdffdd4b1b5f20bb6b3d",
  "apps/room/brand/route.ts": "71b45ff9b41b3bea31c775a16525349591e0d4f7dfdc65da79f095816b1c343c",
  "packages/scope/src/worker.ts": "bd40949f476ccc76c43da803a33ca542f9335d73e89926c41244e8f497f8c3c6",
  "packages/scope/src/health.ts": "5da6a38c8c76199414f5a7ae57d3f57a0070347edd4b9512ab1430b8a4e1b401",
  "packages/scope/src/site/route.ts": "2957f45c6c0281fdd282dc42607c7650f6002e10bb6520127b42c7e6550a7039",
  "packages/scope/src/applications/route.ts": "5788ad312f08eeab53a8592398e23cb3bc8081061cb80f8879cf0816a4799226",
  "packages/scope/src/item-query-wire.ts": "18c860286adefc1afab7cf14ceceea44c59e78031042aed3d781c5576b73ecea",
  "packages/scope/src/applications/projection-wire.ts": "cecaa88f08db6745013a9cb9fbcb9edee6939b0859c201e0c8057286529f1cdc",
  "packages/scope/src/object.ts": "b8b9bcf3c0592bf34edb765648571c38b626fac3c0ffdcbbd44724a5b37a965a",
  "packages/scope/src/core.ts": "189ad7c56b9b772fc241fb10b78ba219627bdb04bef4e8d0ec9c1c3e07c992db",
  "packages/derive/src/genesis.ts": "3cedd7e1124a234aef7f04fb48c25e34c482e6fded7d4423ec666ae41e39c586",
  "packages/derive/src/judge.ts": "222d6d89be14fd62f59857778b0bf7e52f1f0b3d2f5df8d50b533a8f20d8cb14",
  "packages/scope/src/sessions.ts": "9169e7d570f9d0e160d063059eb6db8506741b4ab73f873f90eb8cef5cb250e9",
  "packages/scope/src/reads.ts": "aeee3abca293fd90aaabc605890258f05b935b358ddb08073a1b073edfe426f4",
  "packages/scope/src/signed-reads.ts": "af6032fc04fd7f7e2384aacd87d485a029c5f9d09eca77577c81f41ea69f7f10",
  "packages/scope/src/session-preparation.ts": "614c8f3825508f2271f7c25e06e090d71d2697b2ebdd3e214f4155de2ccdf8b7",
  "packages/scope/src/item-queries.ts": "3d4cc1bdc183f14f7a813d4fa7ef377ea5b2b66e8d6d7e01793cae9486b39530",
  "packages/scope/src/applications/projection.ts": "53d2294f6caff609b39bac2becbaaa7b3563435898be14241540ef4d12c17b01",
  "packages/scope/src/destination-host.ts": "bbf4fcee983c20e1adfe7374c7d6a1034bd6ccaf3c8f7810f43d7e8902c29930",
  "packages/mcp/src/hosted.ts": "d18b3b62646d858ea1460a92633dfacf208f4e99bb20bec14211907c7d5caf3e",
  "packages/mcp/src/http.ts": "c8148a169abdbbfcf86ce446752a792c9f8ac5bc78038f973d5906913188fc8b",
  "examples/grow/simulator-worker.ts": "2d60dab3a9a5b204b69f15bc5ec3473fa48513888d7ffdb0c1fc179f6fe4883c",
  "examples/grow/simulator-host.ts": "53668f18cbfb33bf8ad38892fdbafd4aba3736b7987238e643e0d661cee6c1bf"
};
// SOURCE checkpoint only: compute and review these exact integrated AST seals
// with the owning parser before any runtime acceptance or formal review.
const pendingArchiveSeals = {
  "packages/scope/src/object.ts": null, // Refresh existing owner after the F2/archive union.
  "apps/room/worker.grow.ts": null,
  "apps/room/archive-policy.ts": null,
  "apps/room/archive.ts": null,
  "packages/scope/src/archive-host-item.ts": null,
  "packages/scope/src/archive-target.ts": null,
  "packages/scope/src/archive-host.ts": null,
  "packages/scope/src/artifacts-host.ts": null,
  "packages/scope/src/artifacts-wiring.ts": null,
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
