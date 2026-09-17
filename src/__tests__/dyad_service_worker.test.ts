import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Dyad preview service worker", () => {
  it("does not proxy cross-origin requests through respondWith", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../worker/dyad-sw.js"),
      "utf-8",
    );

    const crossOriginGuard = source.indexOf(
      "if (urlObj.origin !== self.location.origin) return;",
    );
    const respondWith = source.indexOf("event.respondWith(");

    expect(crossOriginGuard).toBeGreaterThan(-1);
    expect(crossOriginGuard).toBeLessThan(respondWith);
  });
});
