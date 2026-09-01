import path from "node:path";
import fs from "node:fs";
import {
  DataAnalysis,
  DatabaseType,
  DatabaseSchema,
} from "@/ipc/types/conversion-analysis";

export async function analyzeData(appPath: string): Promise<DataAnalysis> {
  const packageJsonPath = path.join(appPath, "package.json");

  let packageJson = { devDependencies: {}, dependencies: {} };
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = fs.readFileSync(packageJsonPath, "utf-8");
      packageJson = JSON.parse(content);
    } catch {
      // Continue with empty package json
    }
  }

  const database = detectDatabase(packageJson);
  const schema = await detectSchema(appPath);
  const hasSeedData = detectSeedData(appPath);
  const hasMigrations = detectMigrations(appPath);

  return {
    database,
    schema,
    totalTables: schema?.tables.length ?? 0,
    totalRecords: undefined,
    excludedFields: ["password", "password_hash", "secret", "apiKey", "token"],
    seedData: hasSeedData,
    migrations: hasMigrations,
  };
}

function detectDatabase(packageJson: any): DatabaseType {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  if (deps.pg || deps.postgres || deps["@supabase/supabase-js"])
    return "POSTGRESQL";
  if (deps.mysql || deps.mysql2) return "MYSQL";
  if (deps.mongoose || deps.mongodb) return "MONGODB";
  if (deps.sqlite3 || deps["better-sqlite3"]) return "SQLITE";
  if (deps.firebase || deps["@firebase/firestore"]) return "FIRESTORE";
  if (deps["@aws-sdk/client-dynamodb"] || deps.dynamodb) return "DYNAMODB";

  return "NONE";
}

async function detectSchema(
  appPath: string,
): Promise<DatabaseSchema | undefined> {
  // Look for schema files
  const possiblePaths = [
    path.join(appPath, "prisma", "schema.prisma"),
    path.join(appPath, "src", "db", "schema.ts"),
    path.join(appPath, "src", "db", "schema.js"),
    path.join(appPath, "schema.sql"),
    path.join(appPath, "database", "schema.sql"),
  ];

  for (const schemaPath of possiblePaths) {
    if (fs.existsSync(schemaPath)) {
      if (schemaPath.endsWith(".prisma")) {
        return parsePrismaSchema(schemaPath);
      } else if (schemaPath.endsWith(".sql")) {
        return parseSqlSchema(schemaPath);
      } else if (schemaPath.endsWith(".ts") || schemaPath.endsWith(".js")) {
        return parseTsSchema(schemaPath);
      }
    }
  }

  return undefined;
}

function parsePrismaSchema(filePath: string): DatabaseSchema {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const tables: any[] = [];

    // Basic regex pattern to extract models
    const modelPattern = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelPattern.exec(content)) !== null) {
      const tableName = match[1];
      const modelBody = match[2];

      // Extract fields
      const fields: any[] = [];
      const fieldPattern = /(\w+)\s+(\w+)/g;
      let fieldMatch;

      while ((fieldMatch = fieldPattern.exec(modelBody)) !== null) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2],
          nullable: modelBody.includes(`${fieldMatch[1]}?`),
        });
      }

      tables.push({
        name: tableName,
        fields,
      });
    }

    return {
      name: path.basename(filePath),
      tables,
    };
  } catch {
    return { name: "unknown", tables: [] };
  }
}

function parseSqlSchema(filePath: string): DatabaseSchema {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const tables: any[] = [];

    // Basic regex to extract CREATE TABLE statements
    const tablePattern =
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([^)]+)\)/gi;
    let match;

    while ((match = tablePattern.exec(content)) !== null) {
      const tableName = match[1];
      const tableBody = match[2];

      const fields: any[] = [];
      const fieldLines = tableBody.split(",").map((line) => line.trim());

      for (const line of fieldLines) {
        const parts = line.split(/\s+/);
        if (
          parts.length >= 2 &&
          !line.startsWith("PRIMARY") &&
          !line.startsWith("FOREIGN")
        ) {
          fields.push({
            name: parts[0].replace(/[`"]/g, ""),
            type: parts[1],
            nullable: !line.includes("NOT NULL"),
          });
        }
      }

      tables.push({
        name: tableName,
        fields,
      });
    }

    return {
      name: path.basename(filePath),
      tables,
    };
  } catch {
    return { name: "unknown", tables: [] };
  }
}

function parseTsSchema(filePath: string): DatabaseSchema {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const tables: any[] = [];

    // Look for table definitions
    const tablePattern =
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:sqliteTable|table|sql)/g;
    let match;

    while ((match = tablePattern.exec(content)) !== null) {
      const tableName = match[1];
      tables.push({
        name: tableName,
        fields: [],
      });
    }

    return {
      name: path.basename(filePath),
      tables,
    };
  } catch {
    return { name: "unknown", tables: [] };
  }
}

function detectSeedData(appPath: string): boolean {
  const seedPaths = [
    path.join(appPath, "prisma", "seed.ts"),
    path.join(appPath, "prisma", "seed.js"),
    path.join(appPath, "src", "db", "seed.ts"),
    path.join(appPath, "src", "db", "seed.js"),
    path.join(appPath, "seeds"),
  ];

  return seedPaths.some((p) => fs.existsSync(p));
}

function detectMigrations(appPath: string): boolean {
  const migrationPaths = [
    path.join(appPath, "prisma", "migrations"),
    path.join(appPath, "migrations"),
    path.join(appPath, "db", "migrations"),
    path.join(appPath, "drizzle"),
  ];

  for (const p of migrationPaths) {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      const files = fs.readdirSync(p);
      if (files.length > 0) return true;
    }
  }

  return false;
}
