/** Enroll the existing history owners without changing their setup or readers. */
import { afterAll, expect, vi } from "vitest";
import { getCurrentSuite, getCurrentTest } from "@vitest/runner";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AnswerOracle, compareAnswers, oracleOwners, readFixture, type OracleCase } from "./judge-oracle.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const owner = relative(root, getCurrentSuite().file.filepath).replaceAll("\\", "/");
const enrolled = oracleOwners.some(path => path === owner);
const oracle = new AnswerOracle(owner);
let recordingFailure: unknown;
const collectionOccurrences = new Map<string, number>();
const collectionPositions = new WeakMap<object, string>();
type Named = { name: string; suite?: Named | undefined };
function names(node: Named | undefined): string[] {
  return node ? [...names(node.suite), ...(node.name ? [node.name] : [])] : [];
}
function label(): OracleCase {
  const task = getCurrentTest();
  if (task) return { kind: "test", path: names(task), position: task.id.slice(task.file.id.length) };
  const suite = getCurrentSuite(), path = names(suite.suite), key = JSON.stringify(path);
  let position = collectionPositions.get(suite);
  if (position === undefined) {
    position = String(collectionOccurrences.get(key) ?? 0);
    collectionOccurrences.set(key, Number(position) + 1); collectionPositions.set(suite, position);
  }
  return { kind: "collection", path, position };
}
function remember(list: "runtime" | "replay", answer: unknown): void {
  try { oracle.record(list, label(), answer); }
  catch (error) { recordingFailure = error; throw error; }
}

vi.mock("../src/judge.ts", async importOriginal => {
  const original = await importOriginal<typeof import("../src/judge.ts")>();
  return {
    ...original,
    judgeAct(...args: Parameters<typeof original.judgeAct>) {
      const answer = original.judgeAct(...args);
      if (enrolled) remember("runtime", answer);
      return answer;
    },
    judgeActForReplay(...args: Parameters<typeof original.judgeActForReplay>) {
      const answer = original.judgeActForReplay(...args);
      if (enrolled) remember("replay", answer);
      return answer;
    },
  };
});

if (enrolled) afterAll(() => {
  if (recordingFailure) expect.fail(`E1 answer recording failed: ${String(recordingFailure)}`);
  if (oracleOwners.some(path => !existsSync(resolve(root, path)))) expect.fail("An E1 history owner is missing");
  const capture = process.env["ARTROOM_E1_ORACLE_CAPTURE_DIR"];
  if (capture) {
    const path = resolve(capture, owner + ".answers.jsonl");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, oracle.answers.map(answer => JSON.stringify(answer) + "\n").join(""), { flag: "wx" });
    // An empty owner is still an explicit record, not a missing file.
    return;
  }
  const fixture = readFixture(resolve(root, "packages/derive/test/fixtures/judge-answers.json"));
  const differences = compareAnswers(fixture.cases.filter(row => row.owner === owner), oracle,
    { harness: fixture.harness, raw: process.env["ARTROOM_E1_ORACLE_RAW"] });
  if (differences.length) expect.fail(differences.join("\n\n"));
});
