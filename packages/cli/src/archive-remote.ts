/** Exact archive transport URL policy, before saving or printing a remote. */
export function archiveRemote(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && url.href === value;
  } catch { return false; }
}


/** Percent spelling does not hide a credential. Invalid escapes fail closed. */
export function archiveValue(value: string, secrets: readonly string[]): boolean {
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return false; }
  return secrets.every(secret => !secret || !value.includes(secret) && !decoded.includes(secret));
}
