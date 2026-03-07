const AGENT_INFO = [
  {
    name: "sisyphus",
    displayName: "Sisyphus",
    role: "Orchestrator",
    description:
      "The main orchestrator and default agent. Delegates tasks to specialized agents and coordinates the overall workflow.",
  },
  {
    name: "oracle",
    displayName: "Oracle",
    role: "High-IQ Consultant",
    description:
      "A wise and mystical consultant providing deep insights and high-level analysis.",
  },
  {
    name: "librarian",
    displayName: "Librarian",
    role: "External Reference Search",
    description:
      "The bookish researcher who searches external references, documentation, and knowledge bases.",
  },
  {
    name: "explore",
    displayName: "Explore",
    role: "Codebase Scanner",
    description:
      "An adventurous scout who greps and scans the codebase to find files and patterns.",
  },
  {
    name: "prometheus",
    displayName: "Prometheus",
    role: "Planning Agent",
    description:
      "The fire-bearer who creates detailed implementation plans and strategies.",
  },
  {
    name: "metis",
    displayName: "Metis",
    role: "Pre-Planning Consultant",
    description:
      "A thoughtful analyst who finds hidden requirements and edge cases before planning begins.",
  },
  {
    name: "momus",
    displayName: "Momus",
    role: "Plan Reviewer & Critic",
    description:
      "The discerning critic who reviews plans and implementations, pointing out flaws and improvements.",
  },
  {
    name: "atlas",
    displayName: "Atlas",
    role: "Knowledge Base Builder",
    description:
      "The strong builder who creates and maintains hierarchical knowledge bases.",
  },
  {
    name: "hephaestus",
    displayName: "Hephaestus",
    role: "Code Craftsman",
    description:
      "The master craftsman who specializes in high-quality code generation.",
  },
];

function getAgentInfo(name) {
  return AGENT_INFO.find((a) => a.name === name);
}

const ACTION_LABELS = {
  idle: "Standing by",
  thinking: "Thinking...",
  coding: "Writing code",
  reading: "Reading",
  searching: "Searching",
  running: "Running command",
  orchestrating: "Conducting",
  reviewing: "Reviewing",
  planning: "Planning",
  crafting: "Crafting code",
};

class PixelAgentsApp {
  constructor() {
    this.agents = {};
    this.frame = 0;
    this.canvases = new Map();
    this.ws = null;
    this.connected = false;

    this.container = document.getElementById("agents-container");
    this.statusDot = document.getElementById("status-dot");
    this.statusText = document.getElementById("status-text");

    this.connectWebSocket();
    this.startAnimationLoop();

    this.showDefaultAgents();
  }

  showDefaultAgents() {
    for (const agent of AGENT_INFO) {
      this.agents[agent.name] = {
        name: agent.name,
        action: "idle",
        detail: "",
        since: Date.now(),
      };
    }
    this.renderAgents();
  }

  connectWebSocket() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.connected = true;
      this.updateConnectionStatus();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "state_update") {
          this.handleStateUpdate(data.agents);
        }
      } catch {}
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.updateConnectionStatus();
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = () => {
      this.connected = false;
      this.updateConnectionStatus();
    };
  }

  updateConnectionStatus() {
    if (this.statusDot) {
      this.statusDot.classList.toggle("connected", this.connected);
    }
    if (this.statusText) {
      this.statusText.textContent = this.connected
        ? "Connected"
        : "Disconnected";
    }
  }

  handleStateUpdate(agents) {
    let changed = false;
    for (const [name, state] of Object.entries(agents)) {
      const existing = this.agents[name];
      if (
        !existing ||
        existing.action !== state.action ||
        existing.detail !== state.detail
      ) {
        this.agents[name] = state;
        changed = true;
      }
    }
    if (changed) {
      this.renderAgents();
    }
  }

  renderAgents() {
    if (!this.container) return;

    const existingSlots = new Set();
    for (const slot of this.container.querySelectorAll(".agent-slot")) {
      existingSlots.add(slot.dataset.agent);
    }

    const agentNames = Object.keys(this.agents);
    const currentSlots = new Set(agentNames);

    for (const name of existingSlots) {
      if (!currentSlots.has(name)) {
        const slot = this.container.querySelector(
          `.agent-slot[data-agent="${name}"]`,
        );
        if (slot) slot.remove();
        this.canvases.delete(name);
      }
    }

    for (const name of agentNames) {
      const state = this.agents[name];
      const info = getAgentInfo(name);

      let slot = this.container.querySelector(
        `.agent-slot[data-agent="${name}"]`,
      );

      if (!slot) {
        slot = this.createAgentSlot(name, state, info);
        this.container.appendChild(slot);
      }

      this.updateAgentSlot(slot, state, info);
    }
  }

  createAgentSlot(name, state, info) {
    const slot = document.createElement("div");
    slot.className = "agent-slot";
    slot.dataset.agent = name;

    const canvas = document.createElement("canvas");
    canvas.className = "agent-canvas";
    canvas.width = 128;
    canvas.height = 128;
    this.canvases.set(name, canvas);

    const nameLabel = document.createElement("div");
    nameLabel.className = "agent-name";
    const palette = window.PixelRenderer.getPalette(name);
    nameLabel.style.color = palette.shirt;
    nameLabel.textContent = info ? info.displayName : name;

    const actionLabel = document.createElement("div");
    actionLabel.className = "agent-action";
    actionLabel.textContent = ACTION_LABELS[state.action] || state.action;

    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";

    const tooltipName = document.createElement("div");
    tooltipName.className = "tooltip-name";
    tooltipName.textContent = info ? info.displayName : name;

    const tooltipRole = document.createElement("div");
    tooltipRole.className = "tooltip-role";
    tooltipRole.textContent = info ? info.role : "Agent";

    const tooltipAction = document.createElement("div");
    tooltipAction.className = "tooltip-action";
    tooltipAction.textContent = state.detail || ACTION_LABELS[state.action] || "";

    tooltip.appendChild(tooltipName);
    tooltip.appendChild(tooltipRole);
    tooltip.appendChild(tooltipAction);

    slot.appendChild(tooltip);
    slot.appendChild(canvas);
    slot.appendChild(nameLabel);
    slot.appendChild(actionLabel);

    return slot;
  }

  updateAgentSlot(slot, state, info) {
    const actionLabel = slot.querySelector(".agent-action");
    if (actionLabel) {
      actionLabel.textContent = ACTION_LABELS[state.action] || state.action;
    }

    const tooltipAction = slot.querySelector(".tooltip-action");
    if (tooltipAction) {
      tooltipAction.textContent =
        state.detail || ACTION_LABELS[state.action] || "";
    }
  }

  startAnimationLoop() {
    const spriteInterval = 1000 / 4;
    let lastSpriteUpdate = 0;

    const loop = (timestamp) => {
      if (timestamp - lastSpriteUpdate >= spriteInterval) {
        lastSpriteUpdate = timestamp;
        this.frame++;
        this.drawAllAgents();
      }
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  drawAllAgents() {
    for (const [name, canvas] of this.canvases) {
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      const state = this.agents[name];
      if (!state) continue;

      window.PixelRenderer.drawAgent(
        ctx,
        name,
        state.action,
        this.frame,
        canvas.width,
      );
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PixelAgentsApp();
});
