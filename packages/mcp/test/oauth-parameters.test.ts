import { expect, test } from "vitest";
import { digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { allowedOAuthRedirect, oauthAuthorization, oauthClient, oauthRedirectPolicy, pkceChallenge } from "../src/oauth-parameters.ts";

const CLIENT = "https://clients.example/claude.json", REDIRECT = "https://claude.ai/api/mcp/auth_callback", RESOURCE = "https://room.example/mcp?host=claude";
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk", CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

test("an authorization binds the client, its exact redirect, S256 challenge, state and one configured connector", async () => {
  const policy = oauthRedirectPolicy()!;
  // The misleading name is data, not proof of the identifier's host.
  const client = oauthClient({ client_id: CLIENT, client_name: "Claude", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none" }, CLIENT, policy, true);
  const query = new URLSearchParams({ response_type: "code", client_id: CLIENT, redirect_uri: REDIRECT, code_challenge: CHALLENGE, code_challenge_method: "S256", resource: RESOURCE, scope: "mcp", state: "original-state" });
  expect(await pkceChallenge(VERIFIER)).toBe(CHALLENGE); // RFC 7636 section 4.2's independent vector.
  expect(oauthAuthorization(query, client, [RESOURCE], policy)).toEqual({ state: "original-state", binding: { client_id: CLIENT, redirect_uri: REDIRECT, code_challenge: CHALLENGE, resource: RESOURCE, scope: "mcp", state_digest: digestBytes(utf8("original-state")) } });
  for (const [parameter, value, error] of [
    ["client_id", "https://other.example/claude.json", "invalid_client"],
    ["redirect_uri", REDIRECT + "/other", "invalid_redirect_uri"],
    ["resource", "https://room.example/mcp?host=chatgpt", "invalid_target"],
    ["code_challenge_method", "plain", "invalid_request"],
    ["scope", "membership.manage", "invalid_scope"],
  ]) {
    const altered = new URLSearchParams(query); altered.set(parameter!, value!);
    expect(() => oauthAuthorization(altered, client, [RESOURCE], policy), parameter).toThrow(error);
  }
  const duplicate = new URLSearchParams(query); duplicate.append("redirect_uri", REDIRECT);
  expect(() => oauthAuthorization(duplicate, client, [RESOURCE], policy)).toThrow("invalid_request");
  expect(() => oauthClient({ ...client, client_id: CLIENT + ":443" }, CLIENT, policy, true)).toThrow("invalid_client_metadata");
  expect(() => oauthClient({ ...client, token_endpoint_auth_method: "client_secret_basic" }, CLIENT, policy, true)).toThrow("invalid_client_metadata");
});

test("loopback redirects keep the registered path and custom operator lists replace every default", () => {
  const defaults = oauthRedirectPolicy()!;
  const callback = "http://127.0.0.1:45123/callback";
  const client = oauthClient({ redirect_uris: [callback] }, "registered-client", defaults, false);
  const query = new URLSearchParams({ response_type: "code", client_id: client.client_id, redirect_uri: callback, code_challenge: CHALLENGE, code_challenge_method: "S256", resource: RESOURCE, state: "state" });
  expect(oauthAuthorization(query, client, [RESOURCE], defaults).binding.redirect_uri).toBe(callback);
  query.set("redirect_uri", "http://127.0.0.1:45123/other");
  expect(() => oauthAuthorization(query, client, [RESOURCE], defaults)).toThrow("invalid_redirect_uri");
  const custom = oauthRedirectPolicy(JSON.stringify([callback]))!;
  expect(allowedOAuthRedirect(callback, custom)).toBe(true);
  expect(allowedOAuthRedirect(REDIRECT, custom)).toBe(false);
  expect(allowedOAuthRedirect("http://localhost:45123/callback", custom)).toBe(false);
  for (const uri of ["http://localhost.attacker.example/callback", "http://127.0.0.1.attacker.example/callback", "http://user@localhost/callback", callback + "#", "javascript:alert(1)"]) expect(allowedOAuthRedirect(uri, defaults), uri).toBe(false);
  expect(oauthRedirectPolicy(JSON.stringify([callback, callback]))).toBeNull();
});
