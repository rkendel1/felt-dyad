import type { LocalAgentFixture } from "../../../../testing/fake-llm-server/localAgentTypes";

/**
 * A simple fixture that just returns a text response without any tool calls.
 * Used for testing Agent mode.
 */
export const fixture: LocalAgentFixture = {
  description: "Simple text response for quota testing",
  turns: [
    {
      text: "Hello! I understand your request. This is a simple response from Agent mode.",
    },
  ],
};
