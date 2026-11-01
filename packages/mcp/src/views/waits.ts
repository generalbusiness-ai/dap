/**
 * A tool call can sign an act and read over the network. The slowest press with one stalled request at each stage:
 * the session 30 s, the act 30 s, the read of the mint 30 s, eight one-second pauses and the Git read 15 s, so 113 s.
 * More than one stalled request at a stage can pass this wait. The card then reads its view again.
 */
export const TOOL_WAIT_MS = 120_000;
