/** Pure native judgments and fold in memory. No scope object, provider or network runs. */
import { expect, test } from "vitest";
import type { OperationId } from "@generalbusiness/dap-contract";
import { FAILED_CLAIM_COHORT as C, repositoryName } from "../src/index.ts";
import { Register, rita } from "./support-creation.ts";

test.each(["unknown", "refused"] as const)("a final %s frees the claim and a late confirmation only opens cleanup", final => {
  const R = new Register("keys", [rita.key], C.register);
  expect(R.create(rita).result).toBe("write");
  const name = (attempt: number) => repositoryName(R.item(1).values["seed"] as `sha256:${string}`, attempt);
  expect(R.outcome("1:0", 1, "unknown").result).toBe("write");
  expect(R.item(1).state).toBe("pending");
  expect(R.outcome("1:0", 2, "unknown").result).toBe("write");
  expect(R.item(1).state).toBe("pending");
  expect(R.outcome("1:0", 3, final, final === "refused" ? { name: name(3), nameExists: false } : undefined).result).toBe("write");
  expect(R.item(1).state).toBe("failed");
  expect(R.state.operation("1:0")!.selected).toBeNull();
  expect(R.outcome("1:0", 1, "confirmed", { name: name(1), id: "late-repository", credential: "late-credential" }).result).toBe("write");
  expect(R.item(1).state).toBe("failed");
  expect(R.item(1).values["repository"]).toBeNull();
  expect(R.state.operation("1:0")!.selected).toBeNull();
  expect(R.last.sends).toEqual([]);
  expect(R.last.effects.flatMap(effect => effect.effect === "operation" ? [effect.kind] : [])).toEqual(["revoke-credential", "delete-repository"]);
  const deletion: OperationId = `${R.last.seq}:1`;
  expect(R.outcome(deletion, 1, "confirmed", { id: "late-repository" }).result).toBe("write");
  expect(R.item(1).state).toBe("failed");
});
