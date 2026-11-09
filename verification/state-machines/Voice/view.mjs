export const title = "Speak once and reconcile the report";
export const state = v => v.phase;
const labels = {"SaveStart": "the device retains the audio-start mark", "Speak": "your device speaks", "Interrupt": "speech stops or the device restarts", "Complete": "speech ends and a report waits", "VerifyReport": "the caller verifies the native report", "Clear": "the device clears report custody"};
export const step = action => labels[action] ?? null;
