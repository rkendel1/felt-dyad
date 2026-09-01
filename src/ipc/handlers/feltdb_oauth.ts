import log from "electron-log";
import { BrowserWindow } from "electron";
import { z } from "zod";
import { decrypt, encrypt } from "@/main/settings";
import { FeltDBRecord, getFeltDBDataStore } from "@/store";

const logger = log.scope("feltdb_oauth_handlers");

// FeltDB OAuth configuration
export const feltdbOAuthConfig = {
  clientId: process.env.FELTDB_OAUTH_CLIENT_ID || "dev-client-id",
  clientSecret: process.env.FELTDB_OAUTH_CLIENT_SECRET || "dev-client-secret",
  redirectUri:
    process.env.FELTDB_OAUTH_REDIRECT_URI ||
    "http://localhost:3000/oauth/callback",
  authorizationEndpoint:
    process.env.FELTDB_AUTH_ENDPOINT ||
    "https://auth.feltdb.com/oauth/authorize",
  tokenEndpoint:
    process.env.FELTDB_TOKEN_ENDPOINT || "https://auth.feltdb.com/oauth/token",
};

// Schema definitions
export const FeltDBOAuthCredentialSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
  email: z.string(),
  accountId: z.string(),
  accountName: z.string().optional(),
  apiUrl: z.string().url(),
});

export type FeltDBOAuthCredential = z.infer<typeof FeltDBOAuthCredentialSchema>;
type StoredManagedCredential = FeltDBRecord & {
  accountId: string;
  email: string;
  accountName?: string;
  apiUrl: string;
  accessToken: ReturnType<typeof encrypt>;
};

const credentialCollection = "feltdb-managed-credentials";

/**
 * Start OAuth flow for FeltDB authentication
 * Opens a browser window with the OAuth authorization URL
 */
export async function startFeltDBOAuthFlow(
  _mainWindow: BrowserWindow | null,
): Promise<FeltDBOAuthCredential | null> {
  logger.info("Starting FeltDB OAuth flow");

  try {
    // Build authorization URL
    const authUrl = new URL(feltdbOAuthConfig.authorizationEndpoint);
    authUrl.searchParams.set("client_id", feltdbOAuthConfig.clientId);
    authUrl.searchParams.set("redirect_uri", feltdbOAuthConfig.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "offline_access projects:read projects:write",
    );

    logger.info(`Opening OAuth URL: ${authUrl.toString()}`);

    // Create OAuth window
    const oauthWindow = new BrowserWindow({
      width: 600,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load OAuth URL
    await oauthWindow.loadURL(authUrl.toString());

    // Wait for OAuth callback
    return new Promise((resolve) => {
      // This is stubbed for now
      // In a real implementation, we would:
      // 1. Listen for redirect with auth code
      // 2. Exchange code for access token
      // 3. Store credentials securely
      // 4. Return credential object

      // For now, return fake credential after user closes or succeeds
      const timeout = setTimeout(() => {
        logger.warn("OAuth flow timeout");
        oauthWindow.close();
        resolve(null);
      }, 300000); // 5 minute timeout

      oauthWindow.on("closed", () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  } catch (error) {
    logger.error("OAuth flow error:", error);
    return null;
  }
}

/**
 * Get stored FeltDB OAuth credentials for an account
 * Credentials are stored in secure credential storage
 */
export async function getFeltDBCredentials(
  accountId: string,
): Promise<FeltDBOAuthCredential | null> {
  logger.info(`Retrieving FeltDB credentials for account ${accountId}`);
  const records =
    await getFeltDBDataStore().list<StoredManagedCredential>(
      credentialCollection,
    );
  const record = records.find((item) => item.accountId === accountId);
  if (!record) return null;
  return {
    accountId: record.accountId,
    email: record.email,
    accountName: record.accountName,
    apiUrl: record.apiUrl,
    accessToken: decrypt(record.accessToken),
  };
}

export async function getStoredFeltDBAccount(): Promise<{
  id: string;
  email?: string;
  name?: string;
} | null> {
  const records =
    await getFeltDBDataStore().list<StoredManagedCredential>(
      credentialCollection,
    );
  const record = records[0];
  return record
    ? { id: record.accountId, email: record.email, name: record.accountName }
    : null;
}

/**
 * Store FeltDB OAuth credentials securely
 */
export async function storeFeltDBCredentials(
  credential: FeltDBOAuthCredential,
): Promise<void> {
  logger.info(`Storing FeltDB credentials for account ${credential.accountId}`);
  const store = getFeltDBDataStore();
  const records =
    await store.list<StoredManagedCredential>(credentialCollection);
  await Promise.all(
    records.map((record) => store.delete(credentialCollection, record.id)),
  );
  await store.create<StoredManagedCredential>(credentialCollection, {
    accountId: credential.accountId,
    email: credential.email,
    accountName: credential.accountName,
    apiUrl: credential.apiUrl.replace(/\/$/, ""),
    accessToken: encrypt(credential.accessToken),
  });
}

/**
 * Revoke FeltDB OAuth credentials
 */
export async function revokeFeltDBCredentials(
  accountId: string,
): Promise<void> {
  logger.info(`Revoking FeltDB credentials for account ${accountId}`);

  const store = getFeltDBDataStore();
  const records =
    await store.list<StoredManagedCredential>(credentialCollection);
  await Promise.all(
    records
      .filter((record) => record.accountId === accountId)
      .map((record) => store.delete(credentialCollection, record.id)),
  );
}

/**
 * List projects for authenticated FeltDB account
 */
export async function listFeltDBProjects(
  credential: FeltDBOAuthCredential,
): Promise<Array<{ id: string; name: string; url: string }>> {
  logger.info(`Listing FeltDB projects for account ${credential.accountId}`);

  try {
    const url = new URL("/v1/projects", credential.apiUrl);
    url.searchParams.set("accountId", credential.accountId);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credential.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(
        `FeltDB returned ${response.status} while listing projects`,
      );
    }
    const payload = await response.json();
    const projects = z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          url: z.string().optional(),
        }),
      )
      .parse(Array.isArray(payload) ? payload : payload.projects);
    return projects.map((project) => ({
      ...project,
      url:
        project.url ??
        new URL(`/projects/${project.id}`, credential.apiUrl).toString(),
    }));
  } catch (error) {
    logger.error("Error listing FeltDB projects:", error);
    throw error;
  }
}
