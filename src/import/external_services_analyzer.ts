import path from "node:path";
import fs from "node:fs";
import { ExternalService } from "@/ipc/types/conversion-analysis";

export async function analyzeExternalServices(
  appPath: string,
): Promise<ExternalService[]> {
  const services: ExternalService[] = [];

  const packageJsonPath = path.join(appPath, "package.json");
  let packageJson: any = { devDependencies: {}, dependencies: {} };
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = fs.readFileSync(packageJsonPath, "utf-8");
      packageJson = JSON.parse(content);
    } catch {
      // Continue with empty package json
    }
  }

  // Check dependencies
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Authentication services
  if (deps["next-auth"] || deps["@auth/core"]) {
    services.push({
      name: "NextAuth",
      type: "AUTHENTICATION",
      usedFor: "User authentication and session management",
      classification: "KEEP_EXTERNAL",
    });
  }

  if (
    deps["@supabase/auth-helpers-nextjs"] ||
    deps["@supabase/auth-helpers-react"]
  ) {
    services.push({
      name: "Supabase Auth",
      type: "AUTHENTICATION",
      usedFor: "User authentication via Supabase",
      classification: "KEEP_EXTERNAL",
    });
  }

  if (deps["firebase"] || deps["@firebase/auth"]) {
    services.push({
      name: "Firebase Auth",
      type: "AUTHENTICATION",
      usedFor: "User authentication via Firebase",
      classification: "KEEP_EXTERNAL",
    });
  }

  if (deps.passport || deps["@passport-js/passport"]) {
    services.push({
      name: "Passport.js",
      type: "AUTHENTICATION",
      usedFor: "Authentication middleware",
      classification: "KEEP_EXTERNAL",
    });
  }

  // Database services
  if (deps["@supabase/supabase-js"] || deps.supabase) {
    services.push({
      name: "Supabase",
      type: "DATABASE",
      usedFor: "Backend database and realtime services",
      classification: "MIGRATE_TO_FELTDB",
    });
  }

  if (deps["@neon/serverless"] || deps["@neondatabase/serverless"]) {
    services.push({
      name: "Neon",
      type: "DATABASE",
      usedFor: "Serverless PostgreSQL database",
      classification: "MIGRATE_TO_FELTDB",
    });
  }

  if (deps["@prisma/client"]) {
    services.push({
      name: "Prisma",
      type: "DATABASE",
      usedFor: "TypeScript ORM for database management",
      classification: "MIGRATE_TO_FELTDB",
    });
  }

  if (deps.firebase || deps["@firebase/database"]) {
    services.push({
      name: "Firebase",
      type: "DATABASE",
      usedFor: "NoSQL database and realtime services",
      classification: "MIGRATE_TO_FELTDB",
    });
  }

  if (deps.sqlite3 || deps["better-sqlite3"]) {
    services.push({
      name: "SQLite",
      type: "DATABASE",
      usedFor: "Local SQL database",
      classification: "MIGRATE_TO_FELTDB",
    });
  }

  if (deps.mongodb) {
    services.push({
      name: "MongoDB",
      type: "DATABASE",
      usedFor: "NoSQL database",
      classification: "MIGRATE_TO_FELTDB",
    });
  }

  if (deps.sequelize) {
    services.push({
      name: "Sequelize",
      type: "DATABASE",
      usedFor: "Node.js ORM for SQL databases",
      classification: "MIGRATE_TO_FELTDB",
    });
  }

  if (deps.typeorm) {
    services.push({
      name: "TypeORM",
      type: "DATABASE",
      usedFor: "TypeScript ORM",
      classification: "MIGRATE_TO_FELTDB",
    });
  }

  // Payment services
  if (deps.stripe || deps["@stripe/react-stripe-js"]) {
    services.push({
      name: "Stripe",
      type: "PAYMENTS",
      usedFor: "Payment processing and subscriptions",
      classification: "KEEP_EXTERNAL",
    });
  }

  if (deps.lemonadestand) {
    services.push({
      name: "Lemonade Stand",
      type: "PAYMENTS",
      usedFor: "Payment processing",
      classification: "KEEP_EXTERNAL",
    });
  }

  // Email services
  if (deps.nodemailer) {
    services.push({
      name: "Nodemailer",
      type: "EMAIL",
      usedFor: "Email delivery",
      classification: "KEEP_EXTERNAL",
    });
  }

  if (deps["@sendgrid/mail"] || deps.sendgrid) {
    services.push({
      name: "SendGrid",
      type: "EMAIL",
      usedFor: "Email delivery service",
      classification: "KEEP_EXTERNAL",
    });
  }

  if (deps.resend) {
    services.push({
      name: "Resend",
      type: "EMAIL",
      usedFor: "Email delivery for React",
      classification: "KEEP_EXTERNAL",
    });
  }

  // Storage services
  if (deps["@aws-sdk/client-s3"] || deps["aws-sdk"]) {
    services.push({
      name: "AWS S3",
      type: "STORAGE",
      usedFor: "Object storage",
      classification: "KEEP_EXTERNAL",
    });
  }

  if (deps["@supabase/storage-js"] || deps.supabase) {
    services.push({
      name: "Supabase Storage",
      type: "STORAGE",
      usedFor: "File storage",
      classification: "KEEP_EXTERNAL",
    });
  }

  if (deps["@cloudinary/next"] || deps.cloudinary) {
    services.push({
      name: "Cloudinary",
      type: "STORAGE",
      usedFor: "Image and asset management",
      classification: "KEEP_EXTERNAL",
    });
  }

  // Analytics
  if (deps["next-analytics"] || deps["react-ga"] || deps.gtag) {
    services.push({
      name: "Analytics",
      type: "ANALYTICS",
      usedFor: "User behavior tracking and analytics",
      classification: "KEEP_EXTERNAL",
    });
  }

  if (deps.posthog) {
    services.push({
      name: "PostHog",
      type: "ANALYTICS",
      usedFor: "Product analytics",
      classification: "KEEP_EXTERNAL",
    });
  }

  // Webhooks
  if (deps.svix) {
    services.push({
      name: "Svix",
      type: "WEBHOOKS",
      usedFor: "Webhook management",
      classification: "KEEP_EXTERNAL",
    });
  }

  // External APIs
  if (deps.openai || deps["@openai/api"]) {
    services.push({
      name: "OpenAI",
      type: "API",
      usedFor: "AI/LLM services",
      classification: "KEEP_EXTERNAL",
    });
  }

  if (deps.anthropic || deps["@anthropic-ai/sdk"]) {
    services.push({
      name: "Anthropic Claude",
      type: "API",
      usedFor: "AI/LLM services",
      classification: "KEEP_EXTERNAL",
    });
  }

  // Check source code for additional patterns
  const srcPath = path.join(appPath, "src");
  if (fs.existsSync(srcPath)) {
    const srcFiles = getAllFiles(srcPath);

    for (const file of srcFiles) {
      if (
        !file.endsWith(".ts") &&
        !file.endsWith(".tsx") &&
        !file.endsWith(".js") &&
        !file.endsWith(".jsx")
      ) {
        continue;
      }

      try {
        const content = fs.readFileSync(file, "utf-8");

        // Look for environment variables and API calls
        if (
          content.includes("STRIPE_") &&
          !services.some((s) => s.name === "Stripe")
        ) {
          services.push({
            name: "Stripe",
            type: "PAYMENTS",
            file: path.relative(appPath, file),
            usedFor: "Payment processing",
            classification: "KEEP_EXTERNAL",
          });
        }

        if (
          content.includes("NEXT_PUBLIC_SUPABASE_URL") &&
          !services.some((s) => s.name === "Supabase")
        ) {
          services.push({
            name: "Supabase",
            type: "API",
            file: path.relative(appPath, file),
            usedFor: "Backend services",
            classification: "KEEP_EXTERNAL",
          });
        }

        if (
          content.includes("OPENAI_API_KEY") &&
          !services.some((s) => s.name === "OpenAI")
        ) {
          services.push({
            name: "OpenAI",
            type: "API",
            file: path.relative(appPath, file),
            usedFor: "AI/LLM services",
            classification: "KEEP_EXTERNAL",
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return services;
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { recursive: true });
    for (const entry of entries) {
      if (typeof entry === "string") {
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isFile()) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Continue if error reading directory
  }

  return files;
}
