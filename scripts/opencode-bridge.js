(function() {
  const WS_URL = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws';
  let ws = null, rt = null, nextId = 100;
  const seen = new Set();
  const NAME_PALETTE = { 'gentle-orchestrator': 4, 'gentle-sdd-spec': 1, 'gentle-sdd-apply': 2, 'gentle-sdd-verify': 3, 'gentle-sdd-design': 0, 'gentle-sdd-tasks': 5, 'gentle-sdd-propose': 1, 'gentle-sdd-explore': 2 };

  // ── Room labels on canvas ─────────────────────────────────────────────
  function createRoomLabel(projectName, sessionTitle) {
    const id = 'room-' + projectName.replace(/[^a-zA-Z0-9]/g, '-');
    if (document.getElementById(id)) return;
    const label = document.createElement('div');
    label.id = id;
    label.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);'
      + 'background:rgba(0,0,0,0.6);color:#fff;padding:3px 10px;'
      + 'font:bold 11px monospace;border-radius:2px;z-index:100;white-space:nowrap;'
      + 'border:1px solid rgba(255,255,255,0.15);';
    label.textContent = projectName + (sessionTitle ? ' — ' + sessionTitle : '');
    // Try to find the canvas container and append
    const root = document.getElementById('root');
    if (root) root.appendChild(label);
  }

  function d(data) { window.dispatchEvent(new MessageEvent('message', { data })); }

  function ensure(name, projectName, sessionTitle) {
    if (seen.has(name)) return;
    seen.add(name);
    const id = nextId++, p = NAME_PALETTE[name] ?? (nextId % 6);
    d({ type: 'agentCreated', id, name, folderName: projectName || name, palette: p });
    d({ type: 'agentStatus', id, status: 'active' });
    // Create room label
    if (projectName) createRoomLabel(projectName, sessionTitle);
  }

  function connect() {
    try { ws = new WebSocket(WS_URL);
      ws.onopen = () => { if (rt) { clearTimeout(rt); rt = null; } };
      ws.onmessage = (e) => { try { const m = JSON.parse(e.data);
          if (m.type === 'agent_spawn' && !seen.has(m.name||m.id)) {
            seen.add(m.name||m.id);
            ensure(m.name||m.id, m.projectName, m.sessionTitle);
          }
          if (m.type === 'session_event' && !seen.has(m.agentName||m.sessionID)) {
            seen.add(m.agentName||m.sessionID);
            ensure(m.agentName||m.sessionID, m.projectName, m.sessionTitle);
          }
        } catch(_) {} };
      ws.onclose = () => { rt = setTimeout(connect, 3000); };
    } catch(_) { rt = setTimeout(connect, 3000); }
  }
  setTimeout(connect, 1000);
})();
