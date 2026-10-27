/** Scripted summary observations test the metadata boundary only. Recorded
 * Native metadata is explicitly separated from its reconstructed envelopes;
 * those envelopes prove no second Native execution or hosted coverage. */
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import type { Head, Item, Read, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { isRead, isSummary, keyIdOfSecret, newIncarnation, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { platform } from "@generalbusiness/dap-platform";
import { projectScopeApplications } from "../src/scope-index-applications.ts";

function ref(kind: ScopeRef["kind"], ordinal: number): ScopeRef {
  return { kind, inc: newIncarnation(new Uint8Array(16).fill(ordinal + 1)),
    scope: scopeIdOf({ v: 1, kind, definition: textDigest("TEST definition"), creator: null, cause: textDigest("TEST scope"), ordinal }) };
}
const rules = ref("rules", 0), application = ref("lane", 1), membership = ref("membership", 2), destination = ref("destination", 3);
const release = textDigest("TEST release"), publisher = keyIdOfSecret(new Uint8Array(32).fill(7));
const privateText = "PRIVATE-TEST-DECLARATIONS-MUST-NOT-APPEAR";
function installation(id = 2, scope = application): Item {
  return { id, type: "installation", state: "active", revision: 3, opened: textDigest(`TEST item ${id}`), parties: {}, attributed: [],
    refs: { scope, membership, destination }, values: { release, publisher,
      definition: textDigest("TEST definition"), semantic: textDigest("TEST semantic"), presentation: textDigest("TEST presentation"),
      uri: `git+https://git.example.test/private-repository.git/@${"a".repeat(40)}/private/package.json`,
      additions: privateText, declarations: privateText, genesis: privateText } };
}
function observation(items: readonly Item[] = [installation()], definition: Summary["definition"] = "platform:rules@12", scope = rules): Extract<Read<Summary>, { ok: true }> {
  const data = platform(definition)?.data;
  const counts: [string, string, number][] = data ? Object.entries(data.items).flatMap(([name, type]) => Object.keys(type.states).map(state =>
    [name, state, items.filter(item => item.type === name && item.state === state).length] as [string, string, number])) : [];
  return { ok: true, at: { seq: 100, hash: textDigest("TEST summary head") }, complete: true,
    value: { scope, status: "active", definition, time: "2026-10-27T12:00:00Z", items, counts } };
}
const error = (why: string) => ({ applications: [], errors: [{ scope: rules, why }] });

// Invariant: recorded Native release identities survive the operator metadata
// projection, while unreadable and malformed reconstructed records fail closed.
test("application listing preserves recorded Native none/one metadata through SCRIPTED envelopes and negatives", () => {
  // Native execution occurred in the retained Counter capture. Only its
  // metadata is checked in. All non-output slots below are SCRIPTED, with
  // placeholders rather than reconstructed package bodies or signatures.
  const recorded = JSON.parse(readFileSync(new URL("./fixtures/application-release-listing.json", import.meta.url), "utf8")) as {
    samples: Record<"none" | "one", {
      observation: { scope: ScopeRef; pin: Summary["definition"]; head: Head; complete: boolean; counts: Summary["counts"] };
      result: ReturnType<typeof projectScopeApplications>;
    }>;
  };
  let one: ReturnType<typeof observation> | undefined;
  for (const name of ["none", "one"] as const) {
    const { observation: captured, result: expected } = recorded.samples[name];
    const items = expected.applications.map(row => {
      const item = installation(row.installItem.item, row.scope);
      return { ...item, revision: 1, values: { ...item.values, release: row.release, publisher: row.publisher,
        phase: "creation", uri: `git+https://${row.host}/SCRIPTED-private-repository.git/@${"a".repeat(40)}/SCRIPTED-package.json` } };
    });
    const reply = observation(items, captured.pin, captured.scope);
    reply.at = captured.head;
    reply.complete = captured.complete;
    // The other native types' zero counts are scripted by observation();
    // installation counts come from the actual captured metadata.
    reply.value.counts = [...reply.value.counts.filter(([type]) => type !== "installation"), ...captured.counts];
    expect(projectScopeApplications(captured.scope, reply)).toEqual(expected);
    if (name === "one") one = reply;
  }
  if (!one) return expect.fail("The recorded active-install sample must be reconstructed.");
  const listed = recorded.samples.one.observation.scope;
  // These two negatives are SCRIPTED derivatives, not recorded failures.
  expect(projectScopeApplications(listed, { ok: false, reason: "forbidden" }))
    .toEqual({ applications: [], errors: [{ scope: listed, why: "forbidden" }] });
  const malformed = structuredClone(one);
  malformed.value.items = malformed.value.items.map((item, index) => index === 0
    ? { ...item, values: { ...item.values, publisher: privateText } } : item);
  expect(projectScopeApplications(listed, malformed))
    .toEqual({ applications: [], errors: [{ scope: listed, why: "malformed-installation" }] });
});

// Invariant: the projection retains precisely the release/trust metadata and
// never returns the URI, private retained data or other summary fields.
test("application listing projects exact metadata from scripted supported native Rules observations", () => {
  for (const version of [5, 6, 7, 8, 9, 10, 11, 12]) {
    const reply = observation([installation()], `platform:rules@${version}`);
    expect(isRead(isSummary)(reply)).toBe(true);
    const result = projectScopeApplications(rules, reply);
    expect(result).toEqual({ applications: [{ scope: application, installItem: { scope: rules, item: 2 }, release, publisher, host: "git.example.test" }], errors: [] });
    expect(JSON.stringify(result)).not.toContain(privateText);
    expect(JSON.stringify(result)).not.toContain("private-repository");
  }
});

// Invariant: unknown pins and declared lookalike items cannot masquerade as
// native installations, including through an otherwise empty observation.
test("application listing distinguishes known empty Rules from unsupported pins and declared lookalikes", () => {
  for (const version of [1, 2, 3, 4, 5, 12]) expect(projectScopeApplications(rules, observation([], `platform:rules@${version}`))).toEqual({ applications: [], errors: [] });
  for (const items of [[], [installation()]]) {
    expect(projectScopeApplications(rules, observation(items, "platform:rules@999"))).toEqual(error("unsupported-definition"));
    expect(projectScopeApplications(rules, observation(items, textDigest("TEST declared Rules lookalike")))).toEqual(error("unsupported-definition"));
    expect(projectScopeApplications(application, observation(items, textDigest("TEST declared lane"), application))).toEqual({ applications: [], errors: [] });
  }
  const old = observation([], "platform:rules@4");
  old.value.items = [installation()];
  expect(projectScopeApplications(rules, old)).toEqual(error("malformed-summary"));
  expect(projectScopeApplications(rules, observation([], "platform:membership@1"))).toEqual(error("identity-mismatch"));
});

// Invariant: unreadable, partial or differently identified observations never
// turn into an empty successful installation inventory.
test("application listing refuses incomplete, unreadable and substituted summary observations", () => {
  expect(projectScopeApplications(rules, { ok: false, reason: "forbidden" })).toEqual(error("forbidden"));
  expect(projectScopeApplications(rules, { ok: false, reason: privateText })).toEqual(error("malformed-summary"));
  const changes: ((reply: ReturnType<typeof observation>) => void)[] = [
    reply => { reply.complete = false; },
    reply => { reply.next = "TEST-CURSOR"; },
    reply => { reply.value.scope = { ...rules, inc: application.inc }; },
    reply => { reply.value.status = "provisional"; },
  ];
  const reasons = ["incomplete-summary", "incomplete-summary", "identity-mismatch", "scope-not-active"];
  changes.forEach((change, index) => { const reply = observation(); change(reply); expect(projectScopeApplications(rules, reply)).toEqual(error(reasons[index]!)); });
  expect(projectScopeApplications(rules, { ...observation(), providerText: privateText })).toEqual(error("malformed-summary"));
});

// Invariant: an active prefix survives an unfinished job, but a malformed
// sibling atomically invalidates this scope instead of hiding a bad install.
test("application listing preserves active rows with pending errors and isolates malformed scope results", () => {
  const pending: Item = { ...installation(7, ref("lane", 4)), state: "pending", revision: 1, refs: {}, values: {} };
  const result = projectScopeApplications(rules, observation([installation(), pending]));
  expect(result.applications).toHaveLength(1);
  expect(result.errors).toEqual([{ scope: rules, why: "installation-pending" }]);
  expect(projectScopeApplications(rules, observation([pending]))).toEqual(error("installation-pending"));
  const damaged = { ...installation(7, ref("lane", 4)), values: { ...installation().values, publisher: privateText } };
  expect(projectScopeApplications(rules, observation([installation(), damaged]))).toEqual(error("malformed-installation"));
  // Independent projections of other listed scopes remain usable.
  expect(projectScopeApplications(rules, observation()).applications).toHaveLength(1);
  for (const damage of [
    (item: Item): Item => ({ ...item, values: { ...item.values, release: privateText } }),
    (item: Item): Item => ({ ...item, values: { ...item.values, uri: `git+https://name:secret@git.example.test/repo.git/@${"a".repeat(40)}/package.json` } }),
    (item: Item): Item => ({ ...item, refs: { ...item.refs, scope: membership } }),
  ]) expect(projectScopeApplications(rules, observation([damage(installation())]))).toEqual(error("malformed-installation"));
  expect(projectScopeApplications(rules, observation([installation(), installation(7)]))).toEqual(error("malformed-installation"));
});

// Invariant: complete native summaries cannot omit live rows or exceed their
// pinned schema bounds; retained final counts have no live-item maximum.
test("application listing checks native live counts, identities and bounds without capping retained finals", () => {
  const damage: ((reply: ReturnType<typeof observation>) => void)[] = [
    reply => { reply.value.counts = reply.value.counts.slice(1); },
    reply => { reply.value.counts = [...reply.value.counts.slice(1), reply.value.counts[1]!]; },
    reply => { reply.value.items = []; },
    reply => { reply.value.items = [installation(), installation()]; },
    reply => { reply.value.items = [{ ...installation(), opened: null }]; },
    reply => { reply.value.items = [{ ...installation(), id: 101 }]; },
    reply => { reply.value.items = [{ ...installation(), revision: 101 }]; },
    reply => { reply.value.items = [{ ...installation(), state: "refused" }]; },
  ];
  for (const change of damage) { const reply = observation(); change(reply); expect(projectScopeApplications(rules, reply)).toEqual(error("malformed-summary")); }
  const maximum = Array.from({ length: 64 }, (_, i) => installation(i, ref("lane", i + 10)));
  expect(projectScopeApplications(rules, observation(maximum)).applications).toHaveLength(64);
  expect(projectScopeApplications(rules, observation([...maximum, installation(64, ref("lane", 100))]))).toEqual(error("malformed-summary"));
  const retained = observation();
  retained.value.counts = retained.value.counts.map(([type, state, n]) => [type, state, type === "installation" && state === "refused" ? 100_000 : n]);
  expect(projectScopeApplications(rules, retained).applications).toHaveLength(1);
});
