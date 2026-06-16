(function () {
  const WS_URL = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws';
  let ws = null,
    rt = null;
  let nextId = 100;
  const seen = new Set();
  // Track the orchestrator's agent id so we can emit sub-agent events with the right parent
  let orchestratorId = null;
  // Track sub-agent sessions for cleanup: sessionID → { toolId, parentId }
  const sessionToolMap = {};
  // Track sessions already cleaned up to prevent re-creation as full agents
  const cleanedSessions = new Set();

  const NAME_PALETTE = {
    'gentle-orchestrator': 4,
    'gentle-sdd-spec': 1,
    'gentle-sdd-apply': 2,
    'gentle-sdd-verify': 3,
    'gentle-sdd-design': 0,
    'gentle-sdd-tasks': 5,
    'gentle-sdd-propose': 1,
    'gentle-sdd-explore': 2,
  };

  // Room label (shown at top of canvas)
  function clearRoomLabels() {
    document.querySelectorAll('[id^="room-"]').forEach((el) => el.remove());
  }

  function createRoomLabel(projectName, sessionTitle) {
    const id = 'room-' + (projectName || 'default').replace(/[^a-zA-Z0-9]/g, '-');
    if (document.getElementById(id)) return;
    const label = document.createElement('div');
    label.id = id;
    label.style.cssText =
      'position:fixed;top:8px;left:50%;transform:translateX(-50%);' +
      'background:rgba(0,0,0,0.7);color:#fff;padding:4px 12px;' +
      'font:bold 12px monospace;z-index:9999;white-space:nowrap;' +
      'border:1px solid rgba(255,255,255,0.2);pointer-events:none;';
    label.textContent = projectName + (sessionTitle ? ' — ' + sessionTitle : '');
    document.body.appendChild(label);
  }

  // Dispatch to React (it listens for 'message' events)
  function d(data) {
    window.dispatchEvent(new MessageEvent('message', { data }));
  }

  function ensureAgent(name, projectName, sessionTitle, palette) {
    if (seen.has(name)) return;
    seen.add(name);
    const id = nextId++;
    const p = NAME_PALETTE[name] ?? palette ?? nextId % 6;
    // Track the orchestrator id so sub-agent events can reference the right parent
    if (name === 'gentle-orchestrator') orchestratorId = id;
    d({ type: 'agentCreated', id, name, folderName: projectName || name, palette: p });
    d({ type: 'agentStatus', id, status: 'active' });
    if (projectName) createRoomLabel(projectName, sessionTitle);
  }

  function connect() {
    try {
      // Reset bridge state on every new connection
      seen.clear();
      clearRoomLabels();
      // Tell the webview to clear its agent state (handles zombies from server buffer)
      d({ type: 'clearAllAgents' });
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        if (rt) {
          clearTimeout(rt);
          rt = null;
        }
      };
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m.type === 'clear_simulation') {
            seen.clear();
            clearRoomLabels();
          } else if (m.type === 'agent_spawn') {
            ensureAgent(m.name || m.id, m.projectName, m.sessionTitle, m.palette);
          } else if (m.type === 'subagent_spawn') {
            // Sub-agent: do NOT render yet. Wait for the session_event that
            // contains the real agentName (e.g. "sdd-propose"). Only render
            // if the real name is a recognized sub-agent.
            // Track the sub-session for later matching
            seen.add('pending-' + (m.id || '').substring(0, 8));
            // If we previously rendered a subagent for this session (e.g. with
            // a placeholder name), tell the webview to remove it. The real
            // name will replace it when session_event arrives.
            d({ type: 'subagentRemove', sessionID: m.id });
          } else if (m.type === 'session_event') {
            // Session event has the real agent name (e.g. "sdd-propose").
            // If this is a sub-session that has a pending entry, render it
            // as a subagent (subagentToolStart), NOT as a full agent, so
            // it doesn't create a new office.
            const agentName = m.agentName || m.sessionID;
            const pendingKey = 'pending-' + (m.sessionID || '').substring(0, 8);

            // Check if this sub-agent session is finished (idle or error)
            const isFinished = m.eventType === 'session.idle' || m.eventType === 'session.error';

            // Debug: log every session_event for sub-sessions
            if (m.sessionID && m.sessionID.startsWith('ses_')) {
              console.log(
                '[subagent] session_event:',
                m.sessionID.substring(0, 20),
                'eventType:',
                m.eventType,
                'agentName:',
                agentName,
                'inToolMap:',
                !!sessionToolMap[m.sessionID],
                'inCleaned:',
                cleanedSessions.has(m.sessionID),
                'pendingKey:',
                seen.has(pendingKey),
              );
            }

            // Cleanup from sessionToolMap for already-created sub-agents
            if (isFinished && m.sessionID && sessionToolMap[m.sessionID]) {
              console.log('[subagent] CLEANING UP:', m.sessionID.substring(0, 20));
              const entry = sessionToolMap[m.sessionID];
              d({
                type: 'subagentClear',
                id: entry.parentId,
                parentToolId: entry.toolId,
              });
              delete sessionToolMap[m.sessionID];
              cleanedSessions.add(m.sessionID);
            }

            if (m.sessionID && seen.has(pendingKey)) {
              seen.delete(pendingKey);
              // If the session is already finished, don't create — just skip
              if (isFinished) {
                // Sub-agent was detected but already idle/errored — nothing to render
              } else if (
                agentName.startsWith('sdd-') ||
                agentName.startsWith('gentle-sdd-') ||
                NAME_PALETTE[agentName] !== undefined
              ) {
                if (!seen.has(agentName)) {
                  seen.add(agentName);
                  // Emit agentToolStart for the parent with toolName: 'Task'
                  // so the webview's existing sub-agent flow creates the sub-agent
                  // in the SAME office as the parent.
                  const toolId = `task-${m.sessionID.substring(0, 8)}`;
                  // Track session → tool mapping for later cleanup
                  sessionToolMap[m.sessionID] = {
                    toolId,
                    parentId: orchestratorId || 100,
                  };
                  console.log(
                    '[subagent] CREATED:',
                    agentName,
                    'sessionID:',
                    m.sessionID.substring(0, 20),
                    'toolId:',
                    toolId,
                  );
                  d({
                    type: 'agentToolStart',
                    id: orchestratorId || 100,
                    name: 'gentle-orchestrator',
                    toolName: 'Task',
                    toolId,
                    status: `Subtask: ${agentName}`,
                    runInBackground: false,
                  });
                }
                // Also emit subagentToolStart for activity updates (no agent creation)
                d({
                  type: 'subagentToolStart',
                  id: orchestratorId || 100,
                  parentId: m.sessionID,
                  parentAgent: 'gentle-orchestrator',
                  name: agentName,
                  displayName: agentName,
                  folderName: m.projectName || agentName,
                  palette: NAME_PALETTE[agentName] ?? 0,
                  sessionTitle: m.sessionTitle,
                  isSubagent: true,
                });
              }
              // If the name is unknown (e.g. still the sessionID), skip rendering
            } else if (!m.sessionID || !seen.has(pendingKey)) {
              // Regular session event (not a sub-session we tracked).
              // Skip sessions already cleaned up to prevent re-creation.
              if (m.sessionID && cleanedSessions.has(m.sessionID)) return;
              // Filter zombie sub-sessions (name is raw sessionID like ses_xxx)
              if (agentName.startsWith('ses_')) return;
              ensureAgent(agentName, m.projectName, m.sessionTitle, m.palette);
            }
          } else if (m.type === 'agent_tool') {
            if (m.id) d({ type: 'agentToolStart', id: m.id, name: m.name, tool: m.tool });
          } else if (m.type === 'state_update' && m.agents) {
            Object.keys(m.agents).forEach((name) => {
              ensureAgent(name, m.agents[name].projectName, m.agents[name].sessionTitle);
            });
          }
        } catch (_) {}
      };
      ws.onclose = () => {
        rt = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        /* will trigger onclose */
      };
    } catch (_) {
      rt = setTimeout(connect, 3000);
    }
  }
  setTimeout(connect, 500);
})();
