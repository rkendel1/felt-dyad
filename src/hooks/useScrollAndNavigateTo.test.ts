import { describe, expect, it, vi } from "vitest";
import { waitForElement } from "./useScrollAndNavigateTo";

describe("waitForElement", () => {
  it("waits for content rendered after navigation", async () => {
    let frame = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frame += 1;
      if (frame === 2) {
        const element = document.createElement("section");
        element.id = "provider-settings";
        document.body.appendChild(element);
      }
      callback(frame);
      return frame;
    });

    const element = await waitForElement("provider-settings");

    expect(element?.id).toBe("provider-settings");
    vi.unstubAllGlobals();
  });
});
