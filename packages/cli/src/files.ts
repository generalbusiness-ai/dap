/**
 * The store on disk, under Node. `configDir` selects `$DAP_HOME`, its
 * compatible `$ARTROOM_HOME` alias, occupied legacy custody, or a new `dap`
 * default under `$XDG_CONFIG_HOME` or `~/.config`. The directory is made
 * with mode 0700, and every file in it is written with mode 0600 and then
 * set to 0600, so a key file is readable only by its owner whatever the
 * umask. A key file holds the 32-byte secret as unpadded base64url, and
 * nothing else. Secret-bearing pending requests are opaque base64url bytes
 * in owner-only `private/<name>.data` records, separate from keys and config.
 */

import { randomUUID } from "node:crypto";
import { chmodSync, closeSync, existsSync, linkSync, mkdirSync, openSync, readFileSync, readSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { b64url, unb64url } from "@generalbusiness/dap-bytes";
import type { Config, Store } from "./store.ts";
import { READ_SESSION_CACHE_BYTES } from "./store.ts";

export { configDir } from "./config-dir.ts";

const NAME = /^[a-z][a-z0-9-]{0,31}$/;

export function fileStore(dir: string): Store {
  const ensure = () => {
    mkdirSync(join(dir, "keys"), { recursive: true, mode: 0o700 });
    mkdirSync(join(dir, "private"), { recursive: true, mode: 0o700 });
    chmodSync(join(dir, "private"), 0o700);
    chmodSync(dir, 0o700);
    chmodSync(join(dir, "keys"), 0o700);
  };
  /** Write a whole file owner-only, through a temporary name, so a reader never sees half of it. */
  const write = (path: string, text: string | Uint8Array, exclusive: boolean) => {
    ensure();
    const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
    let created = false;
    try {
      writeFileSync(temporary, text, { mode: 0o600, flag: "wx" });
      created = true;
      chmodSync(temporary, 0o600);
      // A hard link publishes complete owner-only bytes atomically and refuses
      // an existing name. A check before rename cannot enforce exclusivity.
      if (exclusive) linkSync(temporary, path);
      else renameSync(temporary, path);
    } catch (failure) {
      if (exclusive && (failure as NodeJS.ErrnoException).code === "EEXIST") throw new Error(`${path} exists already; it is not replaced`);
      throw failure;
    } finally {
      if (created && existsSync(temporary)) unlinkSync(temporary);
    }
  };
  const keyPath = (name: string) => {
    if (!NAME.test(name)) throw new Error(`${JSON.stringify(name)} is not a key name`);
    return join(dir, "keys", `${name}.key`);
  };
  const privatePath = (name: string) => {
    if (!NAME.test(name)) throw new Error(`${JSON.stringify(name)} is not a private record name`);
    return join(dir, "private", `${name}.data`);
  };
  const cacheDirectory = join(dir, "session-cache"), cachePath = join(cacheDirectory, "read.data");
  const cacheRead = (): Uint8Array | null => {
    let descriptor: number;
    try { descriptor = openSync(cachePath, "r"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    try {
      // One fixed allocation, including an overflow byte. Do not read an
      // unbounded credential file and check its size afterwards.
      const bytes = new Uint8Array(READ_SESSION_CACHE_BYTES + 1);
      let length = 0, got: number;
      while (length < bytes.length && (got = readSync(descriptor, bytes, length, bytes.length - length, null)) > 0) length += got;
      if (length > READ_SESSION_CACHE_BYTES) {
        // Disposable oversized cache only; never touch immutable custody.
        try { unlinkSync(cachePath); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        return null;
      }
      return bytes.slice(0, length);
    } finally { closeSync(descriptor); }
  };
  return {
    sessionCache: {
      read: async () => cacheRead(),
      replace: async bytes => {
        if (bytes.length > READ_SESSION_CACHE_BYTES) throw new Error("Read-session cache exceeds its byte bound");
        ensure(); mkdirSync(cacheDirectory, { recursive: true, mode: 0o700 }); chmodSync(cacheDirectory, 0o700);
        write(cachePath, bytes, false);
      },
      discard: async expected => {
        // Synchronous comparison/unlink avoids stale deletion among this
        // process's callers. Another process can race it; no CAS is claimed.
        const current = cacheRead();
        if (current && current.length === expected.length && current.every((byte, i) => byte === expected[i])) {
          try { unlinkSync(cachePath); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        }
      },
    },
    private: async (name) => {
      const path = privatePath(name);
      if (!existsSync(path)) return null;
      const bytes = unb64url(readFileSync(path, "utf8").trim());
      if (bytes === null) throw new Error(`${path} holds no private bytes`);
      return bytes;
    },
    keepPrivate: async (name, bytes) => write(privatePath(name), `${b64url(bytes)}\n`, true),
    config: async () => {
      const path = join(dir, "config.json");
      if (!existsSync(path)) return null;
      const config = JSON.parse(readFileSync(path, "utf8")) as Config;
      if (config.v !== 1) throw new Error(`${path} was written by another version of this command; it is not read`);
      return config;
    },
    save: async (config) => write(join(dir, "config.json"), `${JSON.stringify(config, null, 2)}\n`, false),
    secret: async (name) => {
      const path = keyPath(name);
      if (!existsSync(path)) return null;
      const secret = unb64url(readFileSync(path, "utf8").trim());
      if (secret === null || secret.length !== 32) throw new Error(`${path} holds no 32-byte key`);
      return secret;
    },
    keep: async (name, secret) => write(keyPath(name), `${b64url(secret)}\n`, true),
  };
}
