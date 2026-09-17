import { beforeEach, describe, expect, it, vi } from "vitest";

const { readSettings } = vi.hoisted(() => ({ readSettings: vi.fn() }));
vi.mock("@/main/settings", () => ({ readSettings }));
vi.mock("electron-log", () => ({
  default: { scope: () => ({ log: vi.fn(), warn: vi.fn() }) },
}));

import { parseLocalSearchResults, webSearchTool } from "./web_search";
import type { AgentContext } from "./types";

const searchHtml = `
  <div class="result results_links">
    <h2>
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdocs&amp;rut=abc">
        Example &amp; Documentation
      </a>
    </h2>
    <a class="result__snippet">The latest example documentation.</a>
  </div>
`;

describe("local web search", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    readSettings.mockReturnValue({ providerSettings: {} });
  });

  it("parses result titles, destination URLs, and snippets", () => {
    expect(parseLocalSearchResults(searchHtml)).toEqual([
      {
        title: "Example & Documentation",
        url: "https://example.com/docs",
        snippet: "The latest example documentation.",
      },
    ]);
  });

  it("searches without a managed AI key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(searchHtml, { status: 200 })),
    );
    const onXmlComplete = vi.fn();
    const onXmlStream = vi.fn();

    const result = await webSearchTool.execute({ query: "example docs" }, {
      onXmlComplete,
      onXmlStream,
    } as unknown as AgentContext);

    expect(result).toContain(
      "[Example & Documentation](https://example.com/docs)",
    );
    expect(onXmlStream).toHaveBeenCalledOnce();
    expect(onXmlComplete).toHaveBeenCalledOnce();
  });
});
