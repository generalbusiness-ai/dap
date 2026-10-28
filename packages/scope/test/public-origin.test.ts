/** A configured public identity is exact; transport headers supply no identity. */
import { expect, test } from "vitest";
import { readPublicOrigin } from "../src/public-origin.ts";

test("public origin keeps the unset request identity and admits only explicit canonical invitation origins", () => {
  expect(readPublicOrigin({}, "http://internal:8787/path?x=1")).toBe("http://internal:8787");
  expect(readPublicOrigin({ PUBLIC_ORIGIN: undefined }, "http://internal:8787/path")).toBe("http://internal:8787");
  for (const origin of ["https://room.example", "https://room.example:8443", "http://127.0.0.1:8787", "http://127.9.8.7", "http://[::1]:8787"]) {
    expect(readPublicOrigin({ PUBLIC_ORIGIN: origin }, "http://internal:8787/path")).toBe(origin);
  }
  for (const origin of [null, false, 17, "", " https://room.example", "https://room.example ", "https://ROOM.example",
    "https://room.example/", "https://room.example/path", "https://room.example?x=1", "https://room.example#x", "https://user@room.example",
    "https://room.example:443", "http://room.example", "http://localhost:8787", "ftp://room.example", "https://room.example\n", "https://" + "a".repeat(2048)]) {
    expect(readPublicOrigin({ PUBLIC_ORIGIN: origin }, "https://request.example")).toBeNull();
  }
});
