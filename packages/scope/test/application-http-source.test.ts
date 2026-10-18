/** SmartHttpSource and real package/admission/local R2, with an explicit
 * scripted upload-pack HTTP peer. Portable buildPack emits actual Git packs;
 * no remote repository/provider or native installation is exercised here. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { applicationHttpSource } from "../src/applications/http-source.ts";
import { resolveAndStoreApplication } from "../src/applications/resolve.ts";
import { applicationResolverFixture as fixture } from "./support/application-fixture.ts";
const utf8 = new TextEncoder();
import { applicationHttpPeer, packetLine as packet, concatBytes as concat } from "./support/application-http-peer.ts";

test("the host resolves only four exact isolated objects with no credentials or closure fallback", async () => {
  const f = await fixture("sha1"), peer = applicationHttpPeer(f);
  try {
    const open = applicationHttpSource(peer.fetch);
    expect(await resolveAndStoreApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, open, f.store)).toEqual(f.packet);
    expect(peer.ads()).toBe(4); expect(peer.wants[0]).toBe(f.commit); expect(new Set(peer.wants).size).toBe(4); expect(peer.wants.every(id => f.objects.has(id))).toBe(true);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); }
});

test("an unsupported isolated peer or redirect refuses without another transport or stored bytes", async () => {
  const f = await fixture("sha1");
  try {
    for (const redirect of [false, true]) {
      let calls = 0;
      const open = applicationHttpSource(async () => {
        calls++;
        return redirect ? new Response(null, { status: 302, headers: { location: "https://elsewhere.test/repo.git" } })
          : new Response(concat(packet("# service=git-upload-pack\n"), utf8.encode("0000"), packet(`${f.commit} HEAD\0ofs-delta\n`), utf8.encode("0000")), { headers: { "content-type": "application/x-git-upload-pack-advertisement" } });
      });
      await expect(resolveAndStoreApplication(f.uri, f.packet.ids.release, f.trust, PROPOSED_BOUNDS, open, f.store)).rejects.toThrow();
      expect(calls).toBe(1); expect(await env.APPLICATION_CONTENT.head(f.key)).toBeNull();
    }
  } finally { await env.APPLICATION_CONTENT.delete(f.key); }
});
