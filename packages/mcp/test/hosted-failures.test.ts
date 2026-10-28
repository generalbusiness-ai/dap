import { expect, test } from "vitest";
import { BearerFailures, BEARER_FAILURE_KEYS } from "../src/hosted.ts";

const ip = (n: number): string => `198.18.${Math.floor(n / 256)}.${n % 256}`;

test("bearer failure capacity keeps active windows while an expired slot admits a new address", () => {
  const failures = new BearerFailures();
  for (let n = 0; n < 10; n++) expect(failures.check(ip(0), 1000, () => false)).toBe("unauthorized");
  for (let n = 1; n < BEARER_FAILURE_KEYS; n++) {
    expect(failures.check(ip(n), 1010, () => false)).toBe("unauthorized");
  }
  expect(failures.size).toBe(BEARER_FAILURE_KEYS);
  for (let n = 0; n < 3; n++) {
    expect(failures.check(ip(BEARER_FAILURE_KEYS + n), 1020, () => false), "new failures cannot evict an active window").toBe("limited");
    expect(failures.size).toBe(BEARER_FAILURE_KEYS);
    expect(failures.check(ip(0), 1020, () => expect.fail("a limited address reached bearer authentication"))).toBe("limited");
  }
  expect(failures.check(ip(BEARER_FAILURE_KEYS + 3), 1020, () => true), "capacity does not refuse an otherwise valid bearer").toBe("ok");
  expect(failures.size).toBe(BEARER_FAILURE_KEYS);

  // Only the oldest window has expired: the other addresses are still ten
  // milliseconds inside their original rolling minute.
  expect(failures.check(ip(BEARER_FAILURE_KEYS + 4), 61_000, () => false)).toBe("unauthorized");
  expect(failures.size).toBe(BEARER_FAILURE_KEYS);
  for (let n = 0; n < 9; n++) expect(failures.check(ip(1), 61_000, () => false)).toBe("unauthorized");
  expect(failures.check(ip(1), 61_000, () => expect.fail("an active address lost its earlier failure"))).toBe("limited");
  expect(failures.check(ip(0), 61_000, () => true)).toBe("ok");
});

test("bearer failures retain ten-per-minute, successful-call and UTF-8 address bounds", () => {
  const failures = new BearerFailures();
  for (let n = 0; n < 9; n++) {
    expect(failures.check(ip(1), 0, () => false)).toBe("unauthorized");
    expect(failures.check(ip(1), 0, () => true), "success does not clear earlier failures").toBe("ok");
  }
  expect(failures.check(ip(1), 0, () => false), "the tenth failure remains unauthorized").toBe("unauthorized");
  expect(failures.check(ip(1), 59_999, () => expect.fail("the minute has not expired"))).toBe("limited");
  expect(failures.check(ip(1), 60_000, () => true)).toBe("ok");

  expect(failures.check("a".repeat(64), 60_000, () => false)).toBe("unauthorized");
  expect(failures.check("é".repeat(32), 60_000, () => false), "64 UTF-8 bytes fit").toBe("unauthorized");
  const beforeOversize = failures.size;
  for (const address of ["a".repeat(65), "é".repeat(33)]) {
    expect(failures.check(address, 60_000, () => expect.fail("an overlong address reached bearer authentication"))).toBe("limited");
  }
  expect(failures.size).toBe(beforeOversize);
  const missing = new BearerFailures(), invalid = [null, "", "not-an-address", "192.0.2.999", "2001:db8:::1"];
  for (let n = 0; n < 10; n++) expect(missing.check(invalid[n % invalid.length]!, 60_000, () => false)).toBe("unauthorized");
  for (const address of invalid) expect(missing.check(address, 60_000, () => expect.fail("the existing addressless bucket was bypassed"))).toBe("limited");
});

test.each([
  ["link-local", ["fe80::1%en0", "FE80:0000:0000:0000:0000:0000:0000:0001%en9", "fe80::1"], "fe80::2%en0"],
  ["ULA", ["fd12:3456:789a::1%en0", "FD12:3456:789A:0000:0000:0000:0000:0001%en9", "fd12:3456:789a::1"], "fd12:3456:789a::2%en0"],
] as const)("bearer failures share %s aliases and zones while another local client remains independent", (_family, aliases, other) => {
  const failures = new BearerFailures();
  for (let n = 0; n < 10; n++) expect(failures.check(aliases[n % aliases.length]!, 0, () => false)).toBe("unauthorized");
  for (const address of aliases) {
    expect(failures.check(address, 0, () => expect.fail("a limited alias reached bearer authentication"))).toBe("limited");
  }
  expect(failures.check(other, 0, () => false), "a different local host has its own failure window").toBe("unauthorized");
  expect(failures.check(other, 0, () => true)).toBe("ok");
  expect(failures.size).toBe(2);
});

test.each([
  ["global IPv6 /64", "2001:db8:1234:5678::1", ["2001:db8:1234:5678::2", "2001:DB8:1234:5678:AAAA:BBBB:CCCC:DDDD%en0"], "2001:db8:1234:5679::1"],
  ["IPv4-mapped IPv6", "192.0.2.9", ["::ffff:192.0.2.9", "0000:0000:0000:0000:0000:FFFF:C000:0209"], "192.0.2.10"],
] as const)("bearer failures preserve shared %s windows before authentication", (_family, first, aliases, other) => {
  const failures = new BearerFailures();
  for (let n = 0; n < 10; n++) expect(failures.check(first, 0, () => false)).toBe("unauthorized");
  for (const address of aliases) expect(failures.check(address, 0, () => expect.fail("a limited address spelling reached bearer authentication"))).toBe("limited");
  expect(failures.check(other, 0, () => true)).toBe("ok");
  expect(failures.size).toBe(1);
});
