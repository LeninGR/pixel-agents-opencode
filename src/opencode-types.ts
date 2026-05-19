// ── OpenCode plugin types (separate from VS Code extension types) ──────────

export type AgentAction =
  | 'idle'
  | 'thinking'
  | 'coding'
  | 'reading'
  | 'searching'
  | 'running'
  | 'orchestrating'
  | 'reviewing'
  | 'planning'
  | 'crafting';

export interface OpenCodeAgentState {
  name: string;
  action: AgentAction;
  detail: string;
  since: number;
  tool?: string;
}

export interface StateUpdate {
  type: 'state_update';
  agents: Record<string, OpenCodeAgentState>;
}

export interface ServerConfig {
  port: number;
  host: string;
}

export const TOOL_ACTION_MAP: Record<string, AgentAction> = {
  read: 'reading',
  glob: 'searching',
  grep: 'searching',
  edit: 'coding',
  write: 'coding',
  bash: 'running',
  task: 'orchestrating',
  webfetch: 'reading',
  google_search: 'searching',
};
