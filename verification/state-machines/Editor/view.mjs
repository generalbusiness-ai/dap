export const title = "Submit an edit without mistaking acceptance for proof";
export const state = v => v.phase;
const labels = {"Attempt": "you submit the retained request", "Accept": "service accepts the request", "Verify": "the page verifies its receipt", "VerificationFailed": "the page cannot verify its receipt", "Advance": "the next edit stage opens", "Refuse": "service refuses the request"};
export const step = action => labels[action] ?? null;
