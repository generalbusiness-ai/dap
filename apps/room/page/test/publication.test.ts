import { expect, test } from "vitest";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { newIncarnation, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { openRoom, siteAddress, loadSite, type Session } from "../src/data.ts";

// Actual data path over scripted HTTP summaries, not Native creation/authority.
// The null is the native fold's empty optional slot, not a repository record.
test("Page publication mode needs the exact active unpublished directory; missing old or malformed metadata is unreadable", async () => {
  const ref = (kind: "directory" | "membership" | "rules" | "destination"): ScopeRef => ({ kind,
    scope: scopeIdOf({ v: 1, kind, definition: `platform:${kind}@1`, creator: null, cause: textDigest("SCRIPTED publication " + kind), ordinal: 0 }),
    inc: newIncarnation(new Uint8Array(16).fill(3)) });
  const directory = ref("directory"), membership = ref("membership"), rules = ref("rules"), destination = ref("destination");
  let definition = "platform:directory@20", status = "active", repository: unknown = null;
  const calls: string[] = [];
  const session: Session = { service: "https://page.test", secret: new Uint8Array(32).fill(4), now: () => Date.parse("2026-10-27T00:00:00Z"),
    fetch: async url => {
      const path = new URL(url).pathname; calls.push(path);
      if (path.endsWith("/sessions")) return Response.json({ ok: false, reason: "sessions-unavailable" });
      const isDirectory = path === `/v1/scopes/${directory.scope}`;
      expect(isDirectory || path === `/v1/scopes/${membership.scope}`).toBe(true);
      return Response.json({ ok: true, at: { seq: 1, hash: textDigest("SCRIPTED summary") }, complete: true,
        value: { scope: isDirectory ? directory : membership, definition: isDirectory ? definition : "platform:membership@8", status: isDirectory ? status : "active", time: "2026-10-27T00:00:00Z", counts: [],
          items: isDirectory ? [{ id: 0, type: "repository", state: "open", revision: 0, opened: null, parties: {}, attributed: [], refs: { membership, rules, destination }, values: { repository } }] : [] } });
    } };
  const place = { directory: directory.scope, membership };
  const unpublished = await openRoom(session, place);
  expect(unpublished.publication).toBe("unpublished");
  expect(siteAddress(unpublished, "a.txt")).toBe("");
  const beforeSite = calls.length;
  await expect(loadSite(unpublished, "a.txt")).rejects.toThrow("no-repository");
  expect(calls).toHaveLength(beforeSite);
  definition = "platform:directory@19";
  await expect(openRoom(session, place)).rejects.toThrow("no valid publication metadata");
  definition = "platform:directory@20"; status = "refused";
  await expect(openRoom(session, place)).rejects.toThrow("no valid publication metadata");
  status = "active"; repository = { host: "none" };
  await expect(openRoom(session, place)).rejects.toThrow("no valid publication metadata");
  repository = { host: "github.com", namespace: "TEST", name: "Recorded room", id: "TEST-id" };
  const hosted = await openRoom(session, place);
  expect([hosted.publication, hosted.name]).toEqual(["repository", "Recorded room"]);
  expect(siteAddress(hosted, "a.txt")).toBe(`https://page.test/site/${directory.scope}/HEAD/a.txt`);
  expect(calls.some(path => path.startsWith("/site/") || path.includes("creation-offer"))).toBe(false);
});
