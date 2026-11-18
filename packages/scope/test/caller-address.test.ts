import { expect, test } from "vitest";
import { callerAddress, PROXY_TOKEN_HEADER, proxiedRequest } from "../src/caller-address.ts";

const token = "TEST" + "t".repeat(39);
const request = (headers: Record<string, string>) => new Request("https://room.test/", { method: "POST", body: "TEST body", headers });

test("a celld proxy token admits the caller address only from the proxy that sends it", async () => {
  const set = { CELLD_PROXY_TOKEN: token };
  expect(callerAddress(request({ "cf-connecting-ip": "192.0.2.7" }), set)).toBeNull();
  for (const given of ["", token.slice(1), token + "x", "TEST" + "u".repeat(39)]) expect(callerAddress(request({ "cf-connecting-ip": "192.0.2.7", [PROXY_TOKEN_HEADER]: given }), set)).toBeNull();
  expect(callerAddress(request({ "cf-connecting-ip": "192.0.2.7", [PROXY_TOKEN_HEADER]: token }), set)).toBe("192.0.2.7");
  expect(callerAddress(request({ [PROXY_TOKEN_HEADER]: token }), set)).toBeNull();
  // Without the setting (Cloudflare), the platform's header stands as before.
  expect(callerAddress(request({ "cf-connecting-ip": "192.0.2.7" }), {})).toBe("192.0.2.7");
  expect(callerAddress(request({}), {})).toBeNull();

  const spoofed = proxiedRequest(request({ "cf-connecting-ip": "192.0.2.7", [PROXY_TOKEN_HEADER]: "wrong" }), set);
  expect(spoofed.headers.get("cf-connecting-ip")).toBeNull();
  expect(spoofed.headers.has(PROXY_TOKEN_HEADER)).toBe(false);
  const proxied = proxiedRequest(request({ "cf-connecting-ip": "192.0.2.7", [PROXY_TOKEN_HEADER]: token, "x-other": "kept" }), set);
  expect(proxied.headers.get("cf-connecting-ip")).toBe("192.0.2.7");
  expect(proxied.headers.has(PROXY_TOKEN_HEADER)).toBe(false);
  expect(proxied.headers.get("x-other")).toBe("kept");
  expect(proxied.method).toBe("POST");
  expect(await proxied.text()).toBe("TEST body");
  const hosted = request({ "cf-connecting-ip": "192.0.2.7" });
  expect(proxiedRequest(hosted, {})).toBe(hosted);
});
