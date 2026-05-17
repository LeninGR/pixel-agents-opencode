// Agent action states mapped to visual representations
export type AgentAction =
  | "idle"
  | "thinking"
  | "coding"
  | "reading"
  | "searching"
  | "running"
  | "orchestrating"
  | "reviewing"
  | "planning"
  | "crafting"

// Known agent names from oh-my-opencode
export type AgentName =
  | "sisyphus"
  | "oracle"
  | "librarian"
  | "explore"
  | "prometheus"
  | "metis"
  | "momus"
  | "atlas"
  | "hephaestus"
  | string // allow unknown agents

export interface AgentState {
  name: AgentName
  action: AgentAction
  detail: string
  since: number // timestamp ms
  tool?: string // current tool being used
}

export interface StateUpdate {
  type: "state_update"
  agents: Record<string, AgentState>
}

export interface ServerConfig {
  port: number
  host: string
}

// Tool name to action mapping
export const TOOL_ACTION_MAP: Record<string, AgentAction> = {
  // Reading tools
  read: "reading",
  glob: "searching",
  grep: "searching",
  // Writing tools
  edit: "coding",
  write: "coding",
  // Execution tools
  bash: "running",
  // Search/explore tools
  lsp_goto_definition: "searching",
  lsp_find_references: "searching",
  lsp_symbols: "searching",
  ast_grep_search: "searching",
  ast_grep_replace: "coding",
  // Delegation tools
  task: "orchestrating",
  // Web tools
  webfetch: "reading",
  google_search: "searching",
}

// Agent metadata type (dynamic — no hardcoded list)
export interface AgentInfo {
  name: AgentName
  displayName: string
  role: string
  description: string
  color: string // primary color for the character
  accessories: string[]
}

// ── Re-export domain types ──────────────────────────────────────────────────

export type { ServerMessage } from "./game/types.js";

// ── ServerMessage type guard ────────────────────────────────────────────────

const VALID_SERVER_MESSAGE_TYPES = new Set<string>([
  "layout",
  "agent_spawn",
  "agent_remove",
  "agent_active",
  "agent_idle",
  "agent_tool",
  "subagent_spawn",
  "subagent_remove",
  "agent_bubble",
  "sound_play",
]);

/**
 * Type guard for the ServerMessage discriminated union.
 */
export function isServerMessage(value: unknown): value is import("./game/types.js").ServerMessage {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.type !== "string") return false;
  return VALID_SERVER_MESSAGE_TYPES.has(obj.type);
}
