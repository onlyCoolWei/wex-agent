import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentConfigRegistry } from "./agent-config.registry.js";

describe("AgentConfigRegistry", () => {
  it("uses the coding agent by default", () => {
    const config = new AgentConfigRegistry().get();

    assert.equal(config.id, "coding");
    assert.equal(config.modelRole, "fast");
    assert.equal(config.maxTurns, 80);
  });

  it("rejects unknown agent IDs", () => {
    assert.throws(() => new AgentConfigRegistry().get("missing"), /Unknown agent configuration/);
  });
});
