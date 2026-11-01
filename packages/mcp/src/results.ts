/** A tool's answer, as `tools/call` sends it: structured content with an object root, and its text. */
export interface CallResult { content: { type: "text"; text: string }[]; structuredContent: Record<string, unknown>; isError: boolean }
