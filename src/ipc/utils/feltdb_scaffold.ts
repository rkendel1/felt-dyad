import { promises as fs } from "node:fs";
import path from "node:path";

export async function configureFeltDBScaffold(
  projectPath: string,
  projectName: string,
) {
  const namespace =
    projectName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "feltdb-app";
  const flowAppName =
    projectName
      .trim()
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join("") || "FeltDBApp";
  const templateFiles = [
    "feltdb.flow",
    "feltdb.config.json",
    "package.json",
    "server.mjs",
    path.join("src", "lib", "feltdb.ts"),
  ];

  await Promise.all(
    templateFiles.map(async (relativePath) => {
      const filePath = path.join(projectPath, relativePath);
      const template = await fs.readFile(filePath, "utf8");
      await fs.writeFile(
        filePath,
        template
          .split("{{APP_NAMESPACE}}")
          .join(namespace)
          .split("{{FLOW_APP_NAME}}")
          .join(flowAppName),
      );
    }),
  );
}
