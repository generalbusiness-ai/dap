// Task changes belong here. The UI and persistence adapters do not own them.
// Completed tasks remain ordinary tasks until a later product decision.
export const MAX_TASKS = 100;
export const MAX_TITLE_LENGTH = 200;
const MAX_ID_LENGTH = 128;

/** @typedef {{id: string, title: string, completed: boolean}} Task */

/** Validate the saved model without discarding unrecognized fields. */
export function isTaskList(value) {
  if (!Array.isArray(value) || value.length > MAX_TASKS) return false;
  const ids = new Set();
  return value.every(task => {
    if (task === null || typeof task !== 'object' || Array.isArray(task)
      || Object.keys(task).sort().join() !== 'completed,id,title'
      || typeof task.id !== 'string' || !task.id || task.id.length > MAX_ID_LENGTH
      || ids.has(task.id) || typeof task.title !== 'string'
      || !task.title.trim() || task.title !== task.title.trim()
      || task.title.length > MAX_TITLE_LENGTH
      || typeof task.completed !== 'boolean') return false;
    ids.add(task.id);
    return true;
  });
}

/** The caller supplies identity, so model changes need no browser or clock. */
export function addTask(tasks, title, id) {
  if (typeof title !== 'string') throw new TypeError('A task needs text.');
  const task = { id, title: title.trim(), completed: false };
  const next = [...tasks, task];
  if (!isTaskList(next)) throw new RangeError('The task cannot be added.');
  return next;
}

/** Toggle one identity. Equal titles do not identify the same task. */
export function toggleTask(tasks, id) {
  if (!isTaskList(tasks) || !tasks.some(task => task.id === id)) {
    throw new RangeError('The task is unavailable.');
  }
  return tasks.map(task => task.id === id
    ? { ...task, completed: !task.completed } : task);
}
