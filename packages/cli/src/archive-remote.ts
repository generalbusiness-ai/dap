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

/** Bind a consumed credential to the recorded repository before disclosing or using it. */
export function credentialRemote(value: unknown, repository: { host: string; namespace: string; name: string }, secrets: readonly string[]): value is string {
  if (!archiveRemote(value) || !archiveValue(value, secrets)) return false;
  const url = new URL(value);
  if (repository.host === "github.com") return value === `https://github.com/${repository.namespace}/${repository.name}.git`;
  return repository.host === "artifacts" && url.pathname === `/git/${repository.namespace}/${repository.name}.git`;
}
