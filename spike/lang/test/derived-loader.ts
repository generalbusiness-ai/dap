// Select only the package under test. The original manifest, test bodies,
// checker, generator, foundation and every historical model stay untouched.
import { registerHooks } from 'node:module';
const candidates = new Map(['sale', 'booking'].map((name) => [new URL('../../fixtures/' + name + '.ts', import.meta.url).href, new URL('../generated/' + name + '.ts', import.meta.url).href]));
registerHooks({ resolve(specifier, context, nextResolve) {
  const resolved = nextResolve(specifier, context);
  const candidate = candidates.get(resolved.url);
  return candidate ? { ...resolved, url: candidate } : resolved;
} });
