// NF-9: a request shape names the failing request and keeps no identifier, value, token or invitation.
import assert from "node:assert/strict";
import { test } from "node:test";
import { requestShape } from "./witness-request-shape.mjs";

const scope = "sc_rgtlrioy5eckfikcapmqdteiw7y4b4lrc7k6use4rqdktn4lnabq";
const digest = "sha256%3A9334159c91ea2df5d25e75aaa265b0ccb8b8ceac7a564b8eb46d0b7be57d2af4";

test("scope ids and digests become fixed marks, and short words stay", () => {
  assert.deepEqual(requestShape("GET", `https://counter.inguz.space/applications/${scope}/11/${digest}/counter.js`, 200), {
    method: "GET", host: "counter.inguz.space", path: "/applications/<scope>/11/<digest>/counter.js", query: [], outcome: 200,
  });
});

test("query values never enter the shape, only sorted key names", () => {
  const shape = requestShape("GET", `https://a.example/v1/scopes/${scope}/journal?since=secret-value&after=7&after=8`, 404);
  assert.deepEqual(shape.query, ["after", "since"]);
  assert.equal(JSON.stringify(shape).includes("secret-value"), false);
});

test("a long or unusual segment becomes <id>, so a token in a path cannot leak", () => {
  const token = "artroom-invite:abcdefghijklmnopqrstuvwxyz0123456789";
  const shape = requestShape("POST", `https://a.example/v1/join/${encodeURIComponent(token)}/x%ZZ`, 500);
  assert.equal(shape.path, "/v1/join/<id>/<id>");
  assert.equal(JSON.stringify(shape).includes("abcdefghij"), false);
});

test("the outcome is a status, a bounded network failure name or 'failed'", () => {
  assert.equal(requestShape("GET", "https://a.example/", "net::ERR_ABORTED").outcome, "net::ERR_ABORTED");
  assert.equal(requestShape("GET", "https://a.example/", "net::ERR with text").outcome, "failed");
  assert.equal(requestShape("weird", "https://a.example/", 200).method, "OTHER");
});

test("data, blob and malformed addresses give no shape", () => {
  assert.equal(requestShape("GET", "data:text/plain,hello", 200), null);
  assert.equal(requestShape("GET", "not a url", 200), null);
});
