export const title = "Read a room and leave while its snapshot loads";
export const state = v => v.phase;
const labels = {"Invalidate": "you leave the view", "ReadReturns": "snapshot arrives"};
export const step = action => labels[action] ?? null;
