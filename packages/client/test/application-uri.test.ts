import { expect, test } from "vitest";
import { ApplicationUriError, readApplicationReleaseUri } from "../src/application-uri.ts";
const sha1 = "a1".repeat(20), sha256 = "b2".repeat(32);
const address = (commit = sha1, path = "releases/counter.dap.json") => `git+https://git.example/team/apps.git/@${commit}/${path}`;

// Invariant: one accepted spelling selects one remote, exact commit/object
// format and decoded tree path, without allowing URL path normalization.
test("an immutable release URI selects its exact remote, object format and canonical tree path", () => {
  for (const [commit, objectFormat] of [[sha1, "sha1"], [sha256, "sha256"]] as const) {
    const uri = address(commit, "packages/%E8%8A%B1%20pot%21.dap.json");
    expect(readApplicationReleaseUri(uri)).toEqual({ uri, remote: "https://git.example/team/apps.git", commit, objectFormat,
      path: "packages/花 pot!.dap.json", segments: ["packages", "花 pot!.dap.json"] });
    expect(Object.isFrozen(readApplicationReleaseUri(uri).segments)).toBe(true);
  }
});

test("release URI refuses floating, aliased, credential-bearing or escaping addresses", () => {
  for (const value of [null, "", address("main"), address(sha1.toUpperCase()), address(sha1.slice(1)), address().replace("git.example", "GIT.example"),
    address().replace("git.example", "user:password@git.example"), address().replace("git.example", "git.example:443"),
    address().replace("git+https", "git+http"), address().replace("apps.git/", "apps.git//"), address()+"?token=x", address()+"#fragment",
    address(sha1, "../counter.json"), address(sha1, "./counter.json"), address(sha1, "a//counter.json"), address(sha1, "a/"),
    address(sha1, "a/%2E%2E/counter.json"), address(sha1, "a/%2Fcounter.json"), address(sha1, "a/%5Ccounter.json"),
    address(sha1, "a/%00counter.json"), address(sha1, "a/%7Fcounter.json"), address(sha1, "a/%c3%a9.json"), address(sha1, "a/%C0%AF.json"),
    address(sha1, "a/raw space.json"), address(sha1, "a/%63ounter.json"), address(sha1, "a/%FF.json"), address(sha1, "a\\counter.json"),
    address(sha1, "a/".repeat(65)+"counter.json"), address(sha1, "a".repeat(4097))]) {
    expect(() => readApplicationReleaseUri(value), String(value)).toThrow(ApplicationUriError);
  }
});
