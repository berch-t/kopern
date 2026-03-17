import type { ExtensionEventType } from "@/lib/firebase/firestore";

/** All available extension hook event types grouped by category */
export const EXTENSION_EVENT_CATEGORIES: Record<string, { label: string; events: ExtensionEventType[] }> = {
  session: {
    label: "Session Lifecycle",
    events: ["session_start", "session_end", "session_compact"],
  },
  message: {
    label: "Message Lifecycle",
    events: ["message_start", "message_end", "message_stream_token"],
  },
  tool: {
    label: "Tool Lifecycle",
    events: ["tool_call_start", "tool_call_end", "tool_call_error", "tool_call_blocked"],
  },
  agent: {
    label: "Agent Lifecycle",
    events: ["agent_thinking_start", "agent_thinking_end", "agent_response_start", "agent_response_end"],
  },
  subAgent: {
    label: "Sub-agent Lifecycle",
    events: ["sub_agent_spawn", "sub_agent_result", "sub_agent_error"],
  },
  pipeline: {
    label: "Pipeline Lifecycle",
    events: ["pipeline_start", "pipeline_step_start", "pipeline_step_end", "pipeline_end"],
  },
  team: {
    label: "Team Lifecycle",
    events: ["team_execution_start", "team_member_start", "team_member_end", "team_execution_end"],
  },
  user: {
    label: "User Interaction",
    events: ["user_input", "user_confirm", "user_deny"],
  },
  system: {
    label: "System",
    events: ["error", "context_limit_warning", "cost_limit_warning"],
  },
  autoresearch: {
    label: "AutoResearch",
    events: ["autoresearch_run_start", "autoresearch_iteration_start", "autoresearch_iteration_end", "autoresearch_mutation", "autoresearch_run_end"],
  },
};

/** Blocking events — extensions can prevent the action from proceeding */
export const BLOCKING_EVENTS: ExtensionEventType[] = [
  "tool_call_blocked",
  "user_input",
  "cost_limit_warning",
];

/** All events as flat array */
export const ALL_EXTENSION_EVENTS: ExtensionEventType[] = Object.values(EXTENSION_EVENT_CATEGORIES)
  .flatMap((cat) => cat.events);

/** Event metadata for display */
export const EVENT_METADATA: Record<ExtensionEventType, { color: string; icon: string; description: string }> = {
  session_start: { color: "blue", icon: "Play", description: "Fired when a session begins" },
  session_end: { color: "blue", icon: "Square", description: "Fired when a session ends" },
  session_compact: { color: "blue", icon: "Minimize2", description: "Fired when context is compacted" },
  message_start: { color: "green", icon: "MessageSquare", description: "Fired before processing a message" },
  message_end: { color: "green", icon: "MessageSquareCheck", description: "Fired after message processed" },
  message_stream_token: { color: "green", icon: "Type", description: "Fired for each streamed token" },
  tool_call_start: { color: "amber", icon: "Wrench", description: "Fired before a tool executes" },
  tool_call_end: { color: "amber", icon: "CheckCircle", description: "Fired after tool execution" },
  tool_call_error: { color: "red", icon: "AlertTriangle", description: "Fired when a tool errors" },
  tool_call_blocked: { color: "red", icon: "ShieldAlert", description: "Blocking: can prevent tool execution" },
  agent_thinking_start: { color: "purple", icon: "Brain", description: "Fired when thinking begins" },
  agent_thinking_end: { color: "purple", icon: "Brain", description: "Fired when thinking ends" },
  agent_response_start: { color: "purple", icon: "Bot", description: "Fired when response generation starts" },
  agent_response_end: { color: "purple", icon: "Bot", description: "Fired when response generation ends" },
  sub_agent_spawn: { color: "indigo", icon: "GitBranch", description: "Fired when a sub-agent is spawned" },
  sub_agent_result: { color: "indigo", icon: "GitMerge", description: "Fired when sub-agent returns result" },
  sub_agent_error: { color: "red", icon: "GitBranch", description: "Fired when sub-agent errors" },
  pipeline_start: { color: "cyan", icon: "Workflow", description: "Fired when pipeline execution begins" },
  pipeline_step_start: { color: "cyan", icon: "ArrowRight", description: "Fired before each pipeline step" },
  pipeline_step_end: { color: "cyan", icon: "ArrowRight", description: "Fired after each pipeline step" },
  pipeline_end: { color: "cyan", icon: "Workflow", description: "Fired when pipeline completes" },
  team_execution_start: { color: "teal", icon: "Users", description: "Fired when team execution begins" },
  team_member_start: { color: "teal", icon: "User", description: "Fired before each team member runs" },
  team_member_end: { color: "teal", icon: "User", description: "Fired after each team member completes" },
  team_execution_end: { color: "teal", icon: "Users", description: "Fired when team execution completes" },
  user_input: { color: "slate", icon: "Keyboard", description: "Blocking: fired on user input" },
  user_confirm: { color: "green", icon: "Check", description: "Fired when user confirms an action" },
  user_deny: { color: "red", icon: "X", description: "Fired when user denies an action" },
  error: { color: "red", icon: "AlertOctagon", description: "Fired on any error" },
  context_limit_warning: { color: "amber", icon: "AlertTriangle", description: "Fired near context limit" },
  cost_limit_warning: { color: "amber", icon: "DollarSign", description: "Blocking: fired near cost limit" },
  autoresearch_run_start: { color: "pink", icon: "FlaskConical", description: "Fired when an AutoResearch run begins" },
  autoresearch_iteration_start: { color: "pink", icon: "RotateCcw", description: "Fired before each optimization iteration" },
  autoresearch_iteration_end: { color: "pink", icon: "RotateCcw", description: "Fired after each optimization iteration" },
  autoresearch_mutation: { color: "pink", icon: "Dna", description: "Fired when a mutation is applied" },
  autoresearch_run_end: { color: "pink", icon: "FlaskConical", description: "Fired when an AutoResearch run completes" },
};
