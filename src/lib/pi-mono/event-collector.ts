// Event Collector — captures agent execution events for grading

export interface CollectedToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
  isError: boolean;
}

export interface CollectedEvents {
  toolCalls: CollectedToolCall[];
  assistantOutput: string;
  tokens: string[];
}

export function createEventCollector(): CollectedEvents & {
  addToken: (text: string) => void;
  addToolCall: (call: CollectedToolCall) => void;
  finalize: () => void;
} {
  const state: CollectedEvents = {
    toolCalls: [],
    assistantOutput: "",
    tokens: [],
  };

  return {
    ...state,
    get toolCalls() {
      return state.toolCalls;
    },
    get assistantOutput() {
      return state.assistantOutput;
    },
    get tokens() {
      return state.tokens;
    },
    addToken(text: string) {
      state.tokens.push(text);
    },
    addToolCall(call: CollectedToolCall) {
      state.toolCalls.push(call);
    },
    finalize() {
      state.assistantOutput = state.tokens.join("");
    },
  };
}
