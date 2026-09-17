import { z } from "zod";
import log from "electron-log";
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
  escapeXmlContent,
} from "./types";
import { engineFetch, hasManagedAiApiKey } from "./engine_fetch";

const logger = log.scope("web_search");

const webSearchSchema = z.object({
  query: z.string().describe("The search query to look up on the web"),
});

const DESCRIPTION = `
Use this tool to access real-time information beyond your training data cutoff.

When to Search:
- Current API documentation, library versions, or breaking changes
- Latest best practices, security advisories, or bug fixes
- Specific error messages or troubleshooting solutions
- Recent framework updates or deprecation notices

Query Tips:
- Be specific: Include version numbers, exact error messages, or technical terms
- Add context: "React 19 useEffect cleanup" not just "React hooks"

Examples:

<example>
OpenAI GPT-5 API model names
</example>

<example>
NextJS 14 app router middleware auth
</example>
`;

/**
 * Parse SSE events from a buffer and extract content deltas.
 * Returns the remaining unparsed buffer.
 * Throws an error if an SSE error event is received.
 */
function parseSSEEvents(
  buffer: string,
  onContent: (content: string) => void,
): string {
  const lines = buffer.split("\n");
  // Keep the last potentially incomplete line
  const remaining = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data: ")) {
      continue;
    }

    const data = trimmed.slice(6); // Remove "data: " prefix

    // Check for stream end marker
    if (data === "[DONE]") {
      continue;
    }

    try {
      const json = JSON.parse(data);

      // Check for OpenAI-style SSE error: { error: { message: "...", type: "...", code: "..." } }
      if (json.error) {
        const errorMessage =
          json.error.message || json.error.type || "Unknown SSE error";
        throw new Error(`Web search SSE error: ${errorMessage}`);
      }

      // OpenAI-style SSE format: { choices: [{ delta: { content: "..." } }] }
      const content = json.choices?.[0]?.delta?.content;
      if (content) {
        onContent(content);
      }
    } catch (e) {
      // Re-throw SSE errors
      if (e instanceof Error && e.message.startsWith("Web search SSE error:")) {
        throw e;
      }
      // Skip malformed JSON lines
      logger.warn("Failed to parse SSE JSON:", data);
    }
  }

  return remaining;
}

/**
 * Call the web search SSE endpoint and stream results
 */
async function callWebSearchSSE(
  query: string,
  ctx: AgentContext,
): Promise<string> {
  ctx.onXmlStream(`<dyad-web-search query="${escapeXmlAttr(query)}">`);

  const response = await engineFetch(ctx, "/tools/web-search", {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Web search failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  if (!response.body) {
    throw new Error("Web search response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events and accumulate content
      buffer = parseSSEEvents(buffer, (content) => {
        accumulated += content;
        // Stream intermediate results to UI with dyad-web-search prefix
        ctx.onXmlStream(
          `<dyad-web-search query="${escapeXmlAttr(query)}">${escapeXmlContent(accumulated)}`,
        );
      });
    }

    // Handle any remaining buffer content
    if (buffer.trim()) {
      parseSSEEvents(buffer + "\n", (content) => {
        accumulated += content;
      });
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

type LocalSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function resolveResultUrl(value: string): string | null {
  const decoded = decodeHtml(value);
  const absolute = decoded.startsWith("//") ? `https:${decoded}` : decoded;

  try {
    const url = new URL(absolute);
    const redirectedUrl = url.searchParams.get("uddg");
    const result = redirectedUrl ? new URL(redirectedUrl) : url;
    return ["http:", "https:"].includes(result.protocol)
      ? result.toString()
      : null;
  } catch {
    return null;
  }
}

export function parseLocalSearchResults(html: string): LocalSearchResult[] {
  const results: LocalSearchResult[] = [];
  const blocks = html.split(/class=["'][^"']*\bresult\b[^"']*["']/i).slice(1);

  for (const block of blocks) {
    const link = block.match(
      /<a[^>]*class=["'][^"']*\bresult__a\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!link) continue;

    const url = resolveResultUrl(link[1]);
    const title = decodeHtml(link[2]);
    if (!url || !title) continue;

    const snippetMatch = block.match(
      /<(?:a|div)[^>]*class=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div)>/i,
    );
    results.push({
      title,
      url,
      snippet: snippetMatch ? decodeHtml(snippetMatch[1]) : "",
    });
    if (results.length === 8) break;
  }

  return results;
}

async function callLocalWebSearch(query: string): Promise<string> {
  const response = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: "text/html",
        "User-Agent": "FeltDB-Builder/1.0",
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Local web search failed: ${response.status} ${response.statusText}`,
    );
  }

  const results = parseLocalSearchResults(await response.text());
  if (results.length === 0) {
    throw new Error("Local web search returned no results");
  }

  return results
    .map(
      (result, index) =>
        `${index + 1}. [${result.title}](${result.url})${result.snippet ? `\n${result.snippet}` : ""}`,
    )
    .join("\n\n");
}

export const webSearchTool: ToolDefinition<z.infer<typeof webSearchSchema>> = {
  name: "web_search",
  description: DESCRIPTION,
  inputSchema: webSearchSchema,
  defaultConsent: "ask",

  getConsentPreview: (args) => `Search the web: "${args.query}"`,

  execute: async (args, ctx: AgentContext) => {
    logger.log(`Executing web search: ${args.query}`);

    let result: string;
    if (hasManagedAiApiKey()) {
      result = await callWebSearchSSE(args.query, ctx);
    } else {
      ctx.onXmlStream(`<dyad-web-search query="${escapeXmlAttr(args.query)}">`);
      result = await callLocalWebSearch(args.query);
    }

    if (!result) {
      throw new Error("Web search returned no results");
    }

    // Write final result to UI and DB with dyad-web-search wrapper
    ctx.onXmlComplete(
      `<dyad-web-search query="${escapeXmlAttr(args.query)}">${escapeXmlContent(result)}</dyad-web-search>`,
    );

    logger.log(`Web search completed for query: ${args.query}`);
    return result;
  },
};
