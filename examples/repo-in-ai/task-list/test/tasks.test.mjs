import assert from 'node:assert/strict';
import test from 'node:test';
import { addTask, toggleTask } from '../model.mjs';
import { STORAGE_KEY, taskStore } from '../storage.mjs';

// Adding and completing one task must preserve other tasks and survive a
// browser reload. This adapter is the local Storage boundary, not a DOM.
test('add, complete, and reopen one of two equal titles across a reload', () => {
  const data = new Map();
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const first = taskStore(storage);
  let tasks = first.load().tasks;
  tasks = addTask(tasks, '  Buy milk  ', 'first');
  tasks = addTask(tasks, 'Buy milk', 'second');
  tasks = toggleTask(tasks, 'first');
  assert.equal(first.save(tasks), null);

  const reloaded = taskStore(storage);
  const loaded = reloaded.load();
  assert.deepEqual(loaded, { tasks: [
    { id: 'first', title: 'Buy milk', completed: true },
    { id: 'second', title: 'Buy milk', completed: false },
  ], issue: null });
  assert.equal(reloaded.save(toggleTask(loaded.tasks, 'first')), null);
  assert.deepEqual(taskStore(storage).load().tasks, [
    { id: 'first', title: 'Buy milk', completed: false },
    { id: 'second', title: 'Buy milk', completed: false },
  ]);
  assert.throws(() => addTask(tasks, '   ', 'empty'), RangeError);
});

// An older client must not replace unreadable or unfamiliar saved data.
test('local work preserves corrupt, newer, and unreadable saved data', () => {
  for (const original of ['{broken', '{"version":2,"tasks":[]}']) {
    let saved = original;
    const store = taskStore({ getItem: () => saved, setItem: (_key, value) => { saved = value; } });
    assert.deepEqual(store.load(), { tasks: [], issue: 'invalid' });
    assert.equal(store.save(addTask([], 'Keep working', 'local')), 'invalid');
    assert.equal(saved, original);
  }
  let writes = 0;
  const unreadable = taskStore({
    getItem(key) { assert.equal(key, STORAGE_KEY); throw new Error('Blocked'); },
    setItem() { writes++; },
  });
  assert.deepEqual(unreadable.load(), { tasks: [], issue: 'unavailable' });
  assert.equal(unreadable.save(addTask([], 'Keep working', 'local')), 'unavailable');
  assert.equal(writes, 0);
});
