// ── User-Level Layout Persistence ─────────────────────────────
export const LAYOUT_FILE_DIR = '.pixel-agents';
export const LAYOUT_FILE_NAME = 'layout.json';
export const CONFIG_FILE_NAME = 'config.json';
export const LAYOUT_FILE_POLL_INTERVAL_MS = 2000;
export const LAYOUT_REVISION_KEY = 'layoutRevision';

// ── Settings Persistence (VS Code globalState keys) ─────────
export const GLOBAL_KEY_SOUND_ENABLED = 'pixel-agents.soundEnabled';
export const GLOBAL_KEY_LAST_SEEN_VERSION = 'pixel-agents.lastSeenVersion';
export const GLOBAL_KEY_ALWAYS_SHOW_LABELS = 'pixel-agents.alwaysShowLabels';
export const GLOBAL_KEY_WATCH_ALL_SESSIONS = 'pixel-agents.watchAllSessions';
export const GLOBAL_KEY_HOOKS_ENABLED = 'pixel-agents.hooksEnabled';
export const GLOBAL_KEY_HOOKS_INFO_SHOWN = 'pixel-agents.hooksInfoShown';

// ── VS Code Identifiers ─────────────────────────────────────
export const VIEW_ID = 'pixel-agents.panelView';
export const COMMAND_SHOW_PANEL = 'pixel-agents.showPanel';
export const COMMAND_EXPORT_DEFAULT_LAYOUT = 'pixel-agents.exportDefaultLayout';
export const WORKSPACE_KEY_AGENTS = 'pixel-agents.agents';
export const WORKSPACE_KEY_AGENT_SEATS = 'pixel-agents.agentSeats';
export const WORKSPACE_KEY_LAYOUT = 'pixel-agents.layout';
export const TERMINAL_NAME_PREFIX = 'Claude Code';

// ── Agent Palettes (OpenCode Plugin) ──────────────────────
export const AGENT_PALETTE_POOL: string[][] = [
  ['#f0c8a0', '#3d2010', '#cc4444', '#2a2a3a'],
  ['#d4a574', '#1a1a1a', '#3366aa', '#3a3a2a'],
  ['#e8c090', '#5a3a1a', '#44aa44', '#2a3040'],
  ['#c8956c', '#8a6030', '#aa44aa', '#3a2a2a'],
  ['#f5d0b0', '#c8a030', '#dd8833', '#202840'],
  ['#b87850', '#0a0a0a', '#eeeeee', '#1a2a1a'],
  ['#e0b888', '#4a2a3a', '#338888', '#2a2828'],
  ['#d0a068', '#6a4a2a', '#ffcc00', '#283040'],
];
