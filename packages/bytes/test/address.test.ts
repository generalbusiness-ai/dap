import { expect, test } from "vitest";
import { addressKey } from "../src/index.ts";

test("local address keys normalize compression, padding, case and zones", () => {
  for (const address of ["fe80::1", "FE80:0000:0000:0000:0000:0000:0000:0001", "fe80:0:0::1%en0", "fe80::1%eth0"])
    expect(addressKey(address), address).toBe("v6l:fe80:0:0:0:0:0:0:1");
  for (const address of ["fdab:cdef:1234:5678::42", "FDAB:CDEF:1234:5678:0000:0000:0000:0042", "fdab:cdef:1234:5678::42%lan0"])
    expect(addressKey(address), address).toBe("v6u:fdab:cdef:1234:5678:0:0:0:42");
});

test("local range ends retain distinct full addresses while adjacent ranges retain their /64 keys", () => {
  for (const [first, expected] of [
    ["fe80", "v6l:fe80:0:0:0:0:0:0:1"], ["febf", "v6l:febf:0:0:0:0:0:0:1"],
    ["fc00", "v6u:fc00:0:0:0:0:0:0:1"], ["fdff", "v6u:fdff:0:0:0:0:0:0:1"],
  ] as const) {
    expect(addressKey(`${first}::1`)).toBe(expected);
    expect(addressKey(`${first}::2`)).not.toBe(addressKey(`${first}::1`));
  }
  for (const [first, expected] of [
    ["fe7f", "v6:fe7f:0:0:0"], ["fec0", "v6:fec0:0:0:0"],
    ["fbff", "v6:fbff:0:0:0"], ["fe00", "v6:fe00:0:0:0"],
  ] as const) {
    expect(addressKey(`${first}::1`)).toBe(expected);
    expect(addressKey(`${first}::2`)).toBe(expected);
  }
});

test("routable IPv6 shares one /64 key and mapped IPv4 shares its IPv4 key", () => {
  expect(addressKey("2001:db8:1:2:aaaa::1")).toBe("v6:2001:db8:1:2");
  expect(addressKey("2001:DB8:1:2::9")).toBe("v6:2001:db8:1:2");
  expect(addressKey("2001:db8:1:3::1")).toBe("v6:2001:db8:1:3");
  for (const address of ["192.0.2.7", "::ffff:192.0.2.7", "::FFFF:c000:207", "0000:0000:0000:0000:0000:ffff:c000:0207"])
    expect(addressKey(address), address).toBe("v4:192.0.2.7");
});

test("null and malformed transport addresses have no key", () => {
  for (const address of [null, "", "not an address", "1:2:3", "1::2::3", "192.0.2.256", "192.000.2.7", "2001:db8::gggg", "a".repeat(65)])
    expect(addressKey(address), String(address)).toBeNull();
});
