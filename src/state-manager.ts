import {
  type AgentAction,
  type OpenCodeAgentState,
  type StateUpdate,
  TOOL_ACTION_MAP,
} from './opencode-types.js';

type StateChangeCallback = (update: StateUpdate) => void;

export class StateManager {
  private agents: Map<string, OpenCodeAgentState> = new Map();
  private listeners: Set<StateChangeCallback> = new Set();

  onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getSnapshot(): StateUpdate {
    return {
      type: 'state_update',
      agents: Object.fromEntries(this.agents),
    };
  }

  setAgentAction(name: string, action: AgentAction, detail: string = '', tool?: string): void {
    // Filter out zombie sub-sessions whose name is the raw sessionID
    if (name.startsWith('ses_')) return;

    const existing = this.agents.get(name);
    if (existing?.action === action && existing?.detail === detail) return;

    this.agents.set(name, {
      name,
      action,
      detail,
      since: Date.now(),
      tool,
    });
    this.broadcast();
  }

  setAgentIdle(name: string): void {
    this.setAgentAction(name, 'idle');
  }

  handleToolStart(agentName: string, toolName: string): void {
    const action = TOOL_ACTION_MAP[toolName] || 'thinking';
    this.setAgentAction(agentName, action, `Using ${toolName}`, toolName);
  }

  handleToolEnd(agentName: string, toolName: string): void {
    const current = this.agents.get(agentName);
    if (current?.tool === toolName) {
      this.setAgentAction(agentName, 'thinking', 'Processing results');
    }
  }

  removeAgent(name: string): void {
    this.agents.delete(name);
    this.broadcast();
  }

  private broadcast(): void {
    const update = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(update);
      } catch {}
    }
  }
}
