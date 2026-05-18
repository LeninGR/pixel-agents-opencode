// ── Shared types for the OpenCode plugin layer ─────────────────────────────

export type AgentAction =
  | "idle" | "thinking" | "coding" | "reading" | "searching"
  | "running" | "orchestrating" | "reviewing" | "planning" | "crafting";

export type AgentName = string;

export interface AgentState {
  name: AgentName;
  action: AgentAction;
  detail: string;
  since: number;
  tool?: string;
}

export interface StateUpdate {
  type: "state_update";
  agents: Record<string, AgentState>;
}

export interface ServerConfig {
  port: number;
  host: string;
}

export const TOOL_ACTION_MAP: Record<string, AgentAction> = {
  read: "reading",
  glob: "searching",
  grep: "searching",
  edit: "coding",
  write: "coding",
  bash: "running",
  lsp_goto_definition: "searching",
  lsp_find_references: "searching",
  lsp_symbols: "searching",
  ast_grep_search: "searching",
  ast_grep_replace: "coding",
  task: "orchestrating",
  webfetch: "reading",
  google_search: "searching",
};
