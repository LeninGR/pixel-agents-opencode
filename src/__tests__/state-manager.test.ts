import { describe, expect, it } from 'vitest';

import { StateManager } from '../state-manager.js';

describe('StateManager', () => {
  it('sets an agent action and emits snapshot', () => {
    const manager = new StateManager();
    let lastUpdate: unknown = null;

    manager.onStateChange((update) => {
      lastUpdate = update;
    });

    manager.setAgentAction('gentle-orchestrator', 'coding', 'Writing index.ts');

    expect(lastUpdate).toBeTruthy();
    const snapshot = (lastUpdate as any).agents;
    expect(snapshot['gentle-orchestrator']).toBeDefined();
    expect(snapshot['gentle-orchestrator'].action).toBe('coding');
  });

  it('marks agent as idle', () => {
    const manager = new StateManager();
    manager.setAgentIdle('gentle-orchestrator');

    const snapshot = manager.getSnapshot();
    expect(snapshot.agents['gentle-orchestrator'].action).toBe('idle');
  });

  it('deduplicates identical state updates', () => {
    const manager = new StateManager();
    let callCount = 0;

    manager.onStateChange(() => callCount++);

    manager.setAgentAction('explore', 'searching', 'grep');
    manager.setAgentAction('explore', 'searching', 'grep');
    manager.setAgentAction('explore', 'searching', 'grep');

    expect(callCount).toBe(1);
  });

  it('handles tool start with mapped action', () => {
    const manager = new StateManager();
    manager.handleToolStart('hephaestus', 'edit');

    const snapshot = manager.getSnapshot();
    expect(snapshot.agents.hephaestus.action).toBe('coding');
    expect(snapshot.agents.hephaestus.tool).toBe('edit');
  });

  it('handles unknown tool as thinking', () => {
    const manager = new StateManager();
    manager.handleToolStart('metis', 'unknown_tool');

    const snapshot = manager.getSnapshot();
    expect(snapshot.agents.metis.action).toBe('thinking');
  });
});
