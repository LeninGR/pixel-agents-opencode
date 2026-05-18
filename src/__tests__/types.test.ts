import { describe, it, expect } from "vitest";
import type { StateUpdate, AgentState, AgentAction } from "../types.js";

describe("StateUpdate", () => {
  it("compiles with valid agent states", () => {
    const update: StateUpdate = {
      type: "state_update",
      agents: {
        "gentle-orchestrator": {
          name: "gentle-orchestrator",
          action: "coding",
          detail: "Writing code",
          since: Date.now(),
        },
      },
    };
    expect(update.type).toBe("state_update");
    expect(update.agents["gentle-orchestrator"].action).toBe("coding");
  });
});

describe("AgentState", () => {
  it("supports optional tool field", () => {
    const state: AgentState = {
      name: "test-agent",
      action: "reading",
      detail: "glob src/",
      since: Date.now(),
      tool: "glob",
    };
    expect(state.tool).toBe("glob");
  });
});

describe("TOOL_ACTION_MAP", () => {
  it("maps known tools to actions", async () => {
    const { TOOL_ACTION_MAP } = await import("../types.js");
    expect(TOOL_ACTION_MAP["bash"]).toBe("running");
    expect(TOOL_ACTION_MAP["edit"]).toBe("coding");
    expect(TOOL_ACTION_MAP["read"]).toBe("reading");
    expect(TOOL_ACTION_MAP["task"]).toBe("orchestrating");
  });
});
