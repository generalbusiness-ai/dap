/**
 * Canonical transport-address key. IPv4 and mapped IPv4 share one key.
 * Link-local IPv6 (fe80::/10) and unique-local IPv6 (fc00::/7) use the full
 * address. Other IPv6 uses a /64 key; this grouping limits address churn on
 * routable networks. Zones are omitted. Null or malformed input has no key;
 * each caller decides whether to count an addressless request.
 */
export function addressKey(address: string | null): string | null {
  if (address === null || address.length > 64) return null;
  const v4 = (text: string): number[] | null => {
    const parts = text.split(".");
    if (parts.length !== 4 || !parts.every((p) => /^(0|[1-9][0-9]{0,2})$/.test(p) && Number(p) <= 255)) return null;
    return parts.map(Number);
  };
  const four = v4(address);
  if (four) return `v4:${four.join(".")}`;
  // IPv6: eight groups of 16 bits, with at most one `::`, and perhaps an IPv4 address as the last 32 bits. A zone is not part of it.
  const text = address.split("%")[0]!.toLowerCase();
  if (!/^[0-9a-f:.]+$/.test(text) || !text.includes(":")) return null;
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const groups = (side: string): number[] | null => {
    if (side === "") return [];
    const out: number[] = [];
    const parts = side.split(":");
    for (const [i, part] of parts.entries()) {
      if (part.includes(".")) {
        const inner = i === parts.length - 1 ? v4(part) : null;
        if (!inner) return null;
        out.push((inner[0]! << 8) | inner[1]!, (inner[2]! << 8) | inner[3]!);
      } else if (/^[0-9a-f]{1,4}$/.test(part)) out.push(parseInt(part, 16));
      else return null;
    }
    return out;
  };
  const [head, tail] = [groups(halves[0]!), halves.length === 2 ? groups(halves[1]!) : []];
  if (!head || !tail) return null;
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const all = [...head, ...new Array<number>(missing).fill(0), ...tail];
  // `::ffff:a.b.c.d`: the IPv4 address itself.
  if (all.slice(0, 5).every((g) => g === 0) && all[5] === 0xffff) return `v4:${all[6]! >> 8}.${all[6]! & 255}.${all[7]! >> 8}.${all[7]! & 255}`;
  const first = all[0]!;
  if (first >= 0xfe80 && first <= 0xfebf) return `v6l:${all.map((g) => g.toString(16)).join(":")}`;
  if (first >= 0xfc00 && first <= 0xfdff) return `v6u:${all.map((g) => g.toString(16)).join(":")}`;
  return `v6:${all.slice(0, 4).map((g) => g.toString(16)).join(":")}`;
}
