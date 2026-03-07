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

// Agent metadata for the info page
export interface AgentInfo {
  name: AgentName
  displayName: string
  role: string
  description: string
  color: string // primary color for the character
  accessories: string[]
}

export const AGENT_INFO: AgentInfo[] = [
  {
    name: "sisyphus",
    displayName: "Sisyphus",
    role: "Orchestrator",
    description:
      "The main orchestrator and default agent. Delegates tasks to specialized agents and coordinates the overall workflow. When orchestrating, conducts like a maestro with a baton.",
    color: "#4a90d9",
    accessories: ["baton", "laptop", "clipboard"],
  },
  {
    name: "oracle",
    displayName: "Oracle",
    role: "High-IQ Consultant",
    description:
      "A wise and mystical consultant providing deep insights and high-level analysis. Sees patterns others miss.",
    color: "#9b59b6",
    accessories: ["crystal_ball", "glasses", "lightbulb"],
  },
  {
    name: "librarian",
    displayName: "Librarian",
    role: "External Reference Search",
    description:
      "The bookish researcher who searches external references, documentation, and knowledge bases to find relevant information.",
    color: "#8b6914",
    accessories: ["book", "newspaper", "magnifying_glass"],
  },
  {
    name: "explore",
    displayName: "Explore",
    role: "Codebase Scanner",
    description:
      "An adventurous scout who greps and scans the codebase to find files, patterns, and understand project structure.",
    color: "#27ae60",
    accessories: ["binoculars", "compass", "magnifying_glass"],
  },
  {
    name: "prometheus",
    displayName: "Prometheus",
    role: "Planning Agent",
    description:
      "The fire-bearer who creates detailed implementation plans. Illuminates the path forward with structured blueprints and strategies.",
    color: "#e67e22",
    accessories: ["scroll", "torch", "blueprint"],
  },
  {
    name: "metis",
    displayName: "Metis",
    role: "Pre-Planning Consultant",
    description:
      "A thoughtful analyst who finds hidden requirements and edge cases before planning begins. Questions assumptions and uncovers what others miss.",
    color: "#1abc9c",
    accessories: ["notepad", "question_mark", "owl"],
  },
  {
    name: "momus",
    displayName: "Momus",
    role: "Plan Reviewer & Critic",
    description:
      "The discerning critic who reviews plans and implementations. Points out flaws, suggests improvements, and ensures quality.",
    color: "#e74c3c",
    accessories: ["red_pen", "checklist", "mask"],
  },
  {
    name: "atlas",
    displayName: "Atlas",
    role: "Knowledge Base Builder",
    description:
      "The strong builder who creates and maintains hierarchical knowledge bases. Carries the weight of project understanding.",
    color: "#34495e",
    accessories: ["globe", "map", "blocks"],
  },
  {
    name: "hephaestus",
    displayName: "Hephaestus",
    role: "Code Craftsman",
    description:
      "The master craftsman who specializes in code generation. Forges high-quality implementations with precision and skill.",
    color: "#d35400",
    accessories: ["hammer", "anvil", "wrench"],
  },
]
