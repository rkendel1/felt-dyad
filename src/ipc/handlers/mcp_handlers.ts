import log from "electron-log";
import {
  FeltDBRecord,
  getFeltDBDataStore,
} from "../../store/feltdb_data_store";
import { createTypedHandler } from "./base";

import { resolveConsent } from "../utils/mcp_consent";
import { getStoredConsent } from "../utils/mcp_consent";
import { mcpManager } from "../utils/mcp_manager";
import {
  mcpContracts,
  type McpServer,
  type McpTransport,
  type McpConsentValue,
} from "../types/mcp";

const logger = log.scope("mcp_handlers");

type StoredMcpServer = FeltDBRecord &
  Omit<McpServer, "id" | "createdAt" | "updatedAt">;
type StoredMcpConsent = FeltDBRecord & {
  serverId: number;
  toolName: string;
  consent: McpConsentValue;
};

function toMcpServer(dbServer: StoredMcpServer): McpServer {
  return {
    ...dbServer,
    transport: dbServer.transport as McpTransport,
  };
}

export function registerMcpHandlers() {
  // CRUD for MCP servers
  createTypedHandler(mcpContracts.listServers, async () => {
    const servers =
      await getFeltDBDataStore().list<StoredMcpServer>("mcp_servers");
    return servers.map(toMcpServer);
  });

  createTypedHandler(mcpContracts.createServer, async (_, params) => {
    const { name, transport, command, args, envJson, url, enabled } = params;
    // Handle args: can be string (JSON), array, or null/undefined
    const parsedArgs = args
      ? typeof args === "string"
        ? (JSON.parse(args) as string[])
        : args
      : null;
    // Handle envJson: can be string (JSON), object, or null/undefined
    const parsedEnvJson = envJson
      ? typeof envJson === "string"
        ? (JSON.parse(envJson) as Record<string, string>)
        : envJson
      : null;
    const result = await getFeltDBDataStore().create<StoredMcpServer>(
      "mcp_servers",
      {
        name,
        transport,
        command: command ?? undefined,
        args: parsedArgs,
        envJson: parsedEnvJson,
        url: url ?? undefined,
        enabled: !!enabled,
      },
    );
    return toMcpServer(result);
  });

  createTypedHandler(mcpContracts.updateServer, async (_, params) => {
    const update: any = {};
    if (params.name !== undefined) update.name = params.name;
    if (params.transport !== undefined) update.transport = params.transport;
    if (params.command !== undefined) update.command = params.command;
    if (params.args !== undefined)
      update.args = params.args
        ? typeof params.args === "string"
          ? JSON.parse(params.args)
          : params.args
        : null;
    if (params.cwd !== undefined) update.cwd = params.cwd;
    if (params.envJson !== undefined)
      update.envJson = params.envJson
        ? typeof params.envJson === "string"
          ? JSON.parse(params.envJson)
          : params.envJson
        : null;
    if (params.url !== undefined) update.url = params.url;
    if (params.enabled !== undefined) update.enabled = !!params.enabled;

    const result = await getFeltDBDataStore().update<StoredMcpServer>(
      "mcp_servers",
      params.id,
      update,
    );
    // If server config changed, dispose cached client to be recreated on next use
    try {
      mcpManager.dispose(params.id);
    } catch {}
    return toMcpServer(result);
  });

  createTypedHandler(mcpContracts.deleteServer, async (_, id) => {
    try {
      mcpManager.dispose(id);
    } catch {}
    await getFeltDBDataStore().delete("mcp_servers", id);
    return { success: true };
  });

  // Tools listing (dynamic)
  createTypedHandler(mcpContracts.listTools, async (_, serverId) => {
    try {
      const client = await mcpManager.getClient(serverId);
      const remoteTools = await client.tools();
      const tools = await Promise.all(
        Object.entries(remoteTools).map(async ([name, mcpTool]) => ({
          name,
          description: mcpTool.description ?? null,
          consent: (await getStoredConsent(serverId, name)) as
            | McpConsentValue
            | undefined,
        })),
      );
      return tools;
    } catch (e) {
      logger.error("Failed to list tools", e);
      return [];
    }
  });

  // Consents
  createTypedHandler(mcpContracts.getToolConsents, async () => {
    const consents =
      await getFeltDBDataStore().list<StoredMcpConsent>("mcp_tool_consents");
    return consents.map((c) => ({
      ...c,
      consent: c.consent as McpConsentValue,
    }));
  });

  createTypedHandler(mcpContracts.setToolConsent, async (_, params) => {
    const store = getFeltDBDataStore();
    const existing = (
      await store.list<StoredMcpConsent>("mcp_tool_consents")
    ).find(
      (consent) =>
        consent.serverId === params.serverId &&
        consent.toolName === params.toolName,
    );
    if (existing) {
      const result = await store.update<StoredMcpConsent>(
        "mcp_tool_consents",
        existing.id,
        {
          consent: params.consent,
        },
      );
      return {
        ...result,
        consent: result.consent as McpConsentValue,
      };
    } else {
      const result = await store.create<StoredMcpConsent>("mcp_tool_consents", {
        serverId: params.serverId,
        toolName: params.toolName,
        consent: params.consent,
      });
      return {
        ...result,
        consent: result.consent as McpConsentValue,
      };
    }
  });

  // Tool consent request/response handshake
  // Receive consent response from renderer
  createTypedHandler(mcpContracts.respondToConsent, async (_, data) => {
    resolveConsent(data.requestId, data.decision);
  });

  logger.debug("Registered MCP IPC handlers");
}
