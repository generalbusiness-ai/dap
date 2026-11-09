export const title = "Recover an outside effect after a lost answer";
export const state = v => v.phase;
const labels = {"Mark": "the scope retains a sent mark", "Send": "the outside request leaves", "Restart": "the process restarts or loses the answer", "LateAnswer": "the original decisive answer arrives"};
export const step = action => labels[action] ?? null;
