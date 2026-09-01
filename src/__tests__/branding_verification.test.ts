import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const repositoryRoot = process.cwd();

function getFilesRecursively(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? getFilesRecursively(entryPath) : entryPath;
  });
}

describe("branding verification", () => {
  it("does not render legacy Dyad branding", () => {
    const sourceDirectories = ["src/app", "src/components", "src/pages"].map(
      (directory) => path.join(repositoryRoot, directory),
    );
    const filesToCheck = [
      ...sourceDirectories.flatMap(getFilesRecursively),
      path.join(repositoryRoot, "scaffold/README.md"),
      path.join(repositoryRoot, "scaffold/index.html"),
    ].filter((filePath) => /\.(tsx?|md|html)$/.test(filePath));

    // Internal protocol names, API fields, and compatibility identifiers can
    // continue to use `dyad`; these phrases are specifically rendered copy.
    const forbiddenPhrases = [
      "Setup Dyad",
      "Dyad Pro?",
      "Manage Dyad Pro",
      "Enable Dyad Pro",
      "Agent Permissions (Pro)",
      "Dyad Version:",
      "re-opening Dyad",
      "Need help with Dyad",
      "Chat with Dyad",
      "using Dyad.",
      "Dyad uses",
      "improve Dyad",
      "Dyad capabilities",
      "lets Dyad know",
      "Dyad community member",
      "Internal Dyad error",
      "Welcome to Dyad",
      "Dyad can work",
      "Visit dyad.sh",
      "FeltDB AI",
    ];
    const violations = filesToCheck.flatMap((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      return forbiddenPhrases
        .filter((phrase) => content.includes(phrase))
        .map(
          (phrase) => `${path.relative(repositoryRoot, filePath)}: ${phrase}`,
        );
    });

    expect(violations).toEqual([]);

    const legacyExternalLinks = filesToCheck.flatMap((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      return /openExternalUrl\([\s\S]{0,200}dyad\.sh/.test(content)
        ? [path.relative(repositoryRoot, filePath)]
        : [];
    });
    expect(legacyExternalLinks).toEqual([]);
  });

  it("uses the FeltDB logo in rendered and packaged surfaces", () => {
    const filesToCheck = ["src/app/TitleBar.tsx", "forge.config.ts"];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(
        path.join(repositoryRoot, filePath),
        "utf8",
      );
      expect(content, filePath).toContain("assets/feltdb.png");
    }
  });

  it("uses FeltDB Builder as the packaged product name", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
    ) as { productName?: string };

    expect(packageJson.productName).toBe("FeltDB Builder");
  });
});
