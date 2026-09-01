import { describe, expect, it } from "vitest";
import { settingsRoute } from "@/routes/settings";
import { providerSettingsRoute } from "./$provider";

describe("provider settings route", () => {
  it("is nested under the settings URL", () => {
    expect(providerSettingsRoute.options.getParentRoute()).toBe(settingsRoute);
    expect((providerSettingsRoute.options as { path?: string }).path).toBe(
      "providers/$provider",
    );
  });
});
