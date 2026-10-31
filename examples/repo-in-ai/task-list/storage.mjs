import { isTaskList } from './model.mjs';

export const STORAGE_KEY = 'repo-in-ai.task-list.v1';
const MAX_SAVED_BYTES = 128 * 1024;

// This adapter owns the browser format. A future storage change can replace
// it without putting persistence rules in the task model or DOM handlers.
export function taskStore(storage) {
  let writable = false;
  let issue = 'unavailable';

  return {
    load() {
      writable = false;
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw === null) {
          writable = true;
          issue = null;
          return { tasks: [], issue };
        }
        if (raw.length > MAX_SAVED_BYTES
          || new TextEncoder().encode(raw).length > MAX_SAVED_BYTES) {
          issue = 'invalid';
          return { tasks: [], issue };
        }
        let saved;
        try { saved = JSON.parse(raw); }
        catch { issue = 'invalid'; return { tasks: [], issue }; }
        if (saved === null || typeof saved !== 'object' || Array.isArray(saved)
          || Object.keys(saved).sort().join() !== 'tasks,version'
          || saved.version !== 1 || !isTaskList(saved.tasks)) {
          issue = 'invalid';
          return { tasks: [], issue };
        }
        writable = true;
        issue = null;
        return { tasks: saved.tasks, issue };
      } catch {
        issue = 'unavailable';
        return { tasks: [], issue };
      }
    },

    save(tasks) {
      // Do not overwrite an unreadable, corrupt, or newer saved format.
      if (!writable) return issue;
      if (!isTaskList(tasks)) throw new TypeError('Invalid task list.');
      const raw = JSON.stringify({ version: 1, tasks });
      if (new TextEncoder().encode(raw).length > MAX_SAVED_BYTES) {
        return 'unavailable';
      }
      try { storage.setItem(STORAGE_KEY, raw); return null; }
      catch { return 'unavailable'; }
    },
  };
}
