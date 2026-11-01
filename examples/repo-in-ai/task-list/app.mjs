import { addTask, toggleTask, MAX_TASKS, MAX_TITLE_LENGTH } from './model.mjs';
import { taskStore } from './storage.mjs';

// The controller only connects the model, browser storage, and DOM.
const form = document.querySelector('#add-task');
const title = document.querySelector('#task-title');
const submit = form.querySelector('button');
const list = document.querySelector('#tasks');
const count = document.querySelector('#task-count');
const empty = document.querySelector('#empty-list');
const status = document.querySelector('#status');

let storage;
try { storage = window.localStorage; } catch { storage = null; }
const store = taskStore(storage);
const loaded = store.load();
let tasks = loaded.tasks;
let storageIssue = loaded.issue;
const rows = new Map();
title.maxLength = MAX_TITLE_LENGTH;

function announce(message = '') {
  status.dataset.issue = String(storageIssue !== null);
  status.textContent = storageIssue === 'invalid'
    ? 'Saved tasks could not be loaded. New changes stay on this page; saved data was not replaced.'
    : storageIssue === 'unavailable'
      ? 'Changes cannot be saved in this browser. Keep this page open to keep working.'
      : message;
}

function rowFor(task) {
  const row = document.createElement('li');
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  const text = document.createElement('span');
  label.append(checkbox, text);
  row.append(label);
  list.append(row);
  checkbox.addEventListener('change', () => {
    tasks = toggleTask(tasks, task.id);
    storageIssue = store.save(tasks);
    render();
    announce(checkbox.checked ? 'Task completed.' : 'Task reopened.');
  });
  return { checkbox, text };
}

function render() {
  // Reuse controls so toggling does not discard keyboard focus.
  for (const task of tasks) {
    if (!rows.has(task.id)) rows.set(task.id, rowFor(task));
    const row = rows.get(task.id);
    row.checkbox.checked = task.completed;
    row.text.textContent = task.title;
  }
  const remaining = tasks.filter(task => !task.completed).length;
  count.textContent = `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left · ${tasks.length - remaining} completed`;
  empty.hidden = tasks.length !== 0;
  submit.disabled = tasks.length >= MAX_TASKS;
  title.disabled = tasks.length >= MAX_TASKS;
  if (tasks.length >= MAX_TASKS && storageIssue === null) {
    status.textContent = `This list holds up to ${MAX_TASKS} tasks.`;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!title.value.trim()) {
    title.setCustomValidity('Enter a task.');
    title.reportValidity();
    return;
  }
  tasks = addTask(tasks, title.value, crypto.randomUUID());
  storageIssue = store.save(tasks);
  title.value = '';
  render();
  announce(tasks.length >= MAX_TASKS ? `This list holds up to ${MAX_TASKS} tasks.` : 'Task added.');
  if (!title.disabled) title.focus();
});
title.addEventListener('input', () => title.setCustomValidity(''));

render();
announce(tasks.length >= MAX_TASKS ? `This list holds up to ${MAX_TASKS} tasks.` : '');
