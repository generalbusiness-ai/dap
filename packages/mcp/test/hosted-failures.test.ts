import { expect, test } from "vitest";
import { BearerFailures, BEARER_FAILURE_KEYS } from "../src/hosted.ts";

test("bearer failure capacity keeps active windows while an expired slot admits a new address", () => {
  const failures = new BearerFailures();
  for (let n = 0; n < 10; n++) expect(failures.check("blocked", 1000, () => false)).toBe("unauthorized");
  for (let n = 1; n < BEARER_FAILURE_KEYS; n++) {
    expect(failures.check(`address-${n}`, 1010, () => false)).toBe("unauthorized");
  }
  expect(failures.size).toBe(BEARER_FAILURE_KEYS);
  for (let n = 0; n < 3; n++) {
    expect(failures.check(`new-${n}`, 1020, () => false), "new failures cannot evict an active window").toBe("limited");
    expect(failures.size).toBe(BEARER_FAILURE_KEYS);
    expect(failures.check("blocked", 1020, () => expect.fail("a limited address reached bearer authentication"))).toBe("limited");
  }
  expect(failures.check("valid-untracked", 1020, () => true), "capacity does not refuse an otherwise valid bearer").toBe("ok");
  expect(failures.size).toBe(BEARER_FAILURE_KEYS);

  // Only the oldest window has expired: the other addresses are still ten
  // milliseconds inside their original rolling minute.
  expect(failures.check("replacement", 61_000, () => false)).toBe("unauthorized");
  expect(failures.size).toBe(BEARER_FAILURE_KEYS);
  for (let n = 0; n < 9; n++) expect(failures.check("address-1", 61_000, () => false)).toBe("unauthorized");
  expect(failures.check("address-1", 61_000, () => expect.fail("an active address lost its earlier failure"))).toBe("limited");
  expect(failures.check("blocked", 61_000, () => true)).toBe("ok");
});

test("bearer failures retain ten-per-minute, successful-call and UTF-8 address bounds", () => {
  const failures = new BearerFailures();
  for (let n = 0; n < 9; n++) {
    expect(failures.check("address", 0, () => false)).toBe("unauthorized");
    expect(failures.check("address", 0, () => true), "success does not clear earlier failures").toBe("ok");
  }
  expect(failures.check("address", 0, () => false), "the tenth failure remains unauthorized").toBe("unauthorized");
  expect(failures.check("address", 59_999, () => expect.fail("the minute has not expired"))).toBe("limited");
  expect(failures.check("address", 60_000, () => true)).toBe("ok");

  expect(failures.check("a".repeat(64), 60_000, () => false)).toBe("unauthorized");
  expect(failures.check("é".repeat(32), 60_000, () => false), "64 UTF-8 bytes fit").toBe("unauthorized");
  const beforeOversize = failures.size;
  for (const address of ["a".repeat(65), "é".repeat(33)]) {
    expect(failures.check(address, 60_000, () => expect.fail("an overlong address reached bearer authentication"))).toBe("limited");
  }
  expect(failures.size).toBe(beforeOversize);
  for (let n = 0; n < 10; n++) expect(failures.check(n % 2 ? "" : null, 60_000, () => false)).toBe("unauthorized");
  expect(failures.check(null, 60_000, () => expect.fail("the existing addressless bucket was bypassed"))).toBe("limited");
});
