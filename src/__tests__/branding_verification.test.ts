import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// List of allowed internal Dyad references that are not public-facing
// These are kept for backward compatibility and internal functionality
const ALLOWLIST = [
  // Internal code identifiers
  "dyad-component-selector",
  "dyad-id",
  "DyadProject",
  "DyadProvider",
  "dyadProvider",
  "getDyadAppPath",
  "getDyadAppsBaseDirectory",
  "isDyadProEnabled",
  "isDyadPro",
  "hasDyadProKey",
  "handleDyadProReturn",
  "showDyadProSuccessDialog",
  "lastDeepLink?.type === \"dyad-pro-return\"",
  "dyad-pro-return",
  "handleDeepLink",
  "DyadProButton",
  "DyadProSuccessDialog",
  "dyad-sh/dyad", // GitHub repo references in comments
  "dyad-sh", // Organization name for backward compatibility
  "dyad", // Protocol scheme in configuration
  "/dyad", // Path references
  "API_VERSION.*dyad", // Environment variable references
  "test", // Test-related references
  "LOCAL_GIT_DIRECTORY",
  "process.env.NODE_ENV",
  "User-Agent.*Dyad", // HTTP headers for API compatibility
  "LiteLLM Virtual Key", // Internal API reference
  "FREE_AGENT_QUOTA_EXCEEDED", // Internal error code
  "Fallbacks=",
  "ExceededBudget", // Internal billing code
  "academy.dyad", // Billing system reference
];

describe("Branding Verification", () => {
  it("should not contain public-facing Dyad references in user-visible strings", () => {
    const filesToCheck = [
      "src/app/TitleBar.tsx",
      "src/components/ModelPicker.tsx",
      "src/components/ContextFilesPicker.tsx",
      "src/components/chat/ChatErrorBox.tsx",
      "src/components/settings/ProviderSettingsPage.tsx",
      "src/components/chat/PromoMessage.tsx",
      "index.html",
      "README.md",
      "CONTRIBUTING.md",
    ];

    const publicFacingDyadReferences = [
      'alt="Dyad Logo"',
      '"Dyad"',
      "'Dyad'",
      '"Dyad Builder"',
      '"Dyad App"',
      '"Dyad Project"',
      '"Dyad Pro"',
      '"Dyad AI"',
      '"Dyad Turbo"',
      '"Dyad Preview"',
      '"Dyad Settings"',
      '"Dyad will use"',
      "Upgrade to Dyad",
      "Access with Dyad",
      "Get Dyad Pro",
      "Dyad subreddit",
      "creator of Dyad",
      "# Dyad",
      "<title>Dyad</title>",
    ];

    const errors: string[] = [];

    for (const filePath of filesToCheck) {
      const fullPath = path.join(
        "/home/runner/work/felt-dyad/felt-dyad",
        filePath
      );
      if (!fs.existsSync(fullPath)) {
        console.warn(`Warning: File not found: ${fullPath}`);
        continue;
      }

      const content = fs.readFileSync(fullPath, "utf-8");

      for (const reference of publicFacingDyadReferences) {
        if (content.includes(reference)) {
          // Check if this reference is in the allowlist
          const isAllowed = ALLOWLIST.some((allowed) => {
            if (allowed.includes(".*")) {
              // Regular expression pattern
              const pattern = new RegExp(allowed);
              return pattern.test(reference);
            }
            return reference.includes(allowed) || allowed.includes(reference);
          });

          if (!isAllowed) {
            errors.push(
              `File ${filePath} contains public-facing reference: "${reference}"`
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      expect.fail(
        `Branding regression detected. Found ${errors.length} public-facing Dyad references:\n${errors.join("\n")}`
      );
    }

    expect(errors).toHaveLength(0);
  });

  it("should use FeltDB terminology in user-visible strings", () => {
    const filesToCheck = [
      "src/app/TitleBar.tsx",
      "index.html",
      "README.md",
    ];

    const requiredTerms = [
      "FeltDB Builder",
      "FeltDB",
    ];

    let foundAny = false;

    for (const filePath of filesToCheck) {
      const fullPath = path.join(
        "/home/runner/work/felt-dyad/felt-dyad",
        filePath
      );
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, "utf-8");

      for (const term of requiredTerms) {
        if (content.includes(term)) {
          foundAny = true;
          break;
        }
      }

      if (foundAny) break;
    }

    expect(foundAny).toBe(true);
  });
});
