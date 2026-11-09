export const title = "Connect an agent and retire its transport";
export const state = v => v.phase;
const labels = {"FactoryReturns": "connection opens", "Retire": "connection ends or access expires", "LateFactoryDisposed": "transport disposal finishes"};
export const step = action => labels[action] ?? null;
