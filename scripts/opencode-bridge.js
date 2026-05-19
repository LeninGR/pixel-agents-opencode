(function() {
  const WS_URL = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws';
  let ws = null, rt = null, nextId = 100;
  const seen = new Set();
  const NAME_PALETTE = { 'gentle-orchestrator': 4, 'gentle-sdd-spec': 1, 'gentle-sdd-apply': 2, 'gentle-sdd-verify': 3, 'gentle-sdd-design': 0, 'gentle-sdd-tasks': 5, 'gentle-sdd-propose': 1, 'gentle-sdd-explore': 2 };

  function d(data) { window.dispatchEvent(new MessageEvent('message', { data })); }

  function ensure(name, projectName, sessionTitle) {
    if (seen.has(name)) return;
    seen.add(name);
    const id = nextId++, p = NAME_PALETTE[name] ?? (nextId % 6);
    const label = projectName ? projectName + (sessionTitle ? ' — ' + sessionTitle : '') : name;
    d({ type: 'agentCreated', id, name: label, folderName: projectName || name, palette: p });
    d({ type: 'agentStatus', id, status: 'active' });
  }

  function connect() {
    try { ws = new WebSocket(WS_URL);
      ws.onopen = () => { if (rt) { clearTimeout(rt); rt = null; } };
      ws.onmessage = (e) => { try { const m = JSON.parse(e.data);
          if (m.type === 'agent_spawn') ensure(m.name||m.id, m.projectName, m.sessionTitle);
          if (m.type === 'session_event') ensure(m.agentName||m.sessionID, m.projectName, m.sessionTitle);
          if (m.type === 'state_update' && m.agents) Object.keys(m.agents).forEach(n => ensure(n));
        } catch(_) {} };
      ws.onclose = () => { rt = setTimeout(connect, 3000); };
    } catch(_) { rt = setTimeout(connect, 3000); }
  }
  setTimeout(connect, 1000);
})();
