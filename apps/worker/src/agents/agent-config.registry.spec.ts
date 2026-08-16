import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentConfigRegistry } from "./agent-config.registry.js";

describe("AgentConfigRegistry", () => {
  it("uses the main chat agent by default", () => {
    const config = new AgentConfigRegistry().get();

    assert.equal(config.id, "main-chat");
    assert.equal(config.modelRole, "chat");
    assert.equal(config.maxTurns, 1);
  });

  it("rejects unknown agent IDs", () => {
    assert.throws(() => new AgentConfigRegistry().get("missing"), /Unknown agent configuration/);
  });
});
