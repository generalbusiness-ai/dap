/** Real Git plumbing over deliberately synthetic object graphs. This is a
 * secret-recognizer boundary, not native export admission or a key fixture. */
import { afterEach, expect, test } from "vitest";
import { auditClone } from "../src/git.ts";
import { cleanup, git, scratch } from "./archive-git-fixture.ts";

afterEach(cleanup);

function objectGraph(body: string): string {
  const root = scratch();
  git(root, ["init", "--bare", "-q"]);
  const blob = git(root, ["hash-object", "-w", "--stdin"], body);
  const tree = git(root, ["mktree"], `100644 blob ${blob}\tpublic.json\n`);
  const commit = git(root, ["hash-object", "-t", "commit", "-w", "--stdin"], `tree ${tree}\nauthor TEST <test@example.invalid> 0 +0000\ncommitter TEST <test@example.invalid> 0 +0000\n\nTEST graph\n`);
  git(root, ["update-ref", `refs/artroom/journal/sc_${"a".repeat(52)}`, commit]);
  return root;
}

test("the clone audit reads the actual archive object closure and qualifies its finite recognizers", async () => {
  const root = objectGraph('{"public":"journal metadata"}');
  const audit = await auditClone(root);
  expect(audit.journals).toHaveLength(1);
  expect(audit.secretCheck).toMatchObject({ result: "no-recognized-secret", objects: 3 });
  expect(audit.secretCheck.qualification).toContain("not proof that arbitrary secrets are absent");
});

test("a recognizable private-key envelope in the clone fails without disclosing the matching body", async () => {
  // Recognizer control only: this is invalid public TEST text, no private key.
  const marker = "TEST-NOT-A-KEY-DO-NOT-PRINT";
  const root = objectGraph(`-----BEGIN PRIVATE KEY-----\n${marker}\n-----END PRIVATE KEY-----`);
  const failure = await auditClone(root).then(() => "unexpected success", error => String(error));
  expect(failure).toContain("possible secret in object");
  expect(failure).not.toContain(marker);
});
