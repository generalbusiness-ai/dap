// Content ids and canonical serialization for the fixture.
//
// Canonical form is RFC 8785 (JCS): object keys sorted by code unit, no
// whitespace, numbers and strings as JSON.stringify produces them. The
// fixture restricts numbers to safe integers so that no serializer
// disagreement is possible.

import { createHash, randomBytes } from 'node:crypto';

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

const validationErrors = new WeakSet<object>();
/** Only the fixture's explicit numeric-domain refusal, never an incidental TypeError. */
export function isCanonicalValidationError(error: unknown): error is TypeError {
  return typeof error === 'object' && error !== null && validationErrors.has(error);
}

export function canonicalize(value: Json): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      const error = new TypeError(`canonicalize: only safe integers are allowed, got ${value}`);
      validationErrors.add(error);
      throw error;
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = value[k];
    if (v === undefined) continue;
    parts.push(JSON.stringify(k) + ':' + canonicalize(v as Json));
  }
  return '{' + parts.join(',') + '}';
}

export function bytesOf(value: Json): Buffer {
  return Buffer.from(canonicalize(value), 'utf8');
}

export function sha256(value: Json): string {
  return 'sha256:' + createHash('sha256').update(bytesOf(value)).digest('hex');
}

/** Content id of any canonical value. */
export const contentId = sha256;

export const ZERO_HASH = 'sha256:' + '0'.repeat(64);

export function nonce(): string {
  return randomBytes(16).toString('hex');
}
