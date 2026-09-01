import {
  FeltDBRecord,
  getFeltDBDataStore,
} from "../../store/feltdb_data_store";
import { IpcMainInvokeEvent } from "electron";
import crypto from "node:crypto";

export type Consent = "ask" | "always" | "denied";
type StoredMcpConsent = FeltDBRecord & {
  serverId: number;
  toolName: string;
  consent: Consent;
};

const pendingConsentResolvers = new Map<
  string,
  (d: "accept-once" | "accept-always" | "decline") => void
>();

export function waitForConsent(
  requestId: string,
): Promise<"accept-once" | "accept-always" | "decline"> {
  return new Promise((resolve) => {
    pendingConsentResolvers.set(requestId, resolve);
  });
}

export function resolveConsent(
  requestId: string,
  decision: "accept-once" | "accept-always" | "decline",
) {
  const resolver = pendingConsentResolvers.get(requestId);
  if (resolver) {
    pendingConsentResolvers.delete(requestId);
    resolver(decision);
  }
}

export async function getStoredConsent(
  serverId: number,
  toolName: string,
): Promise<Consent> {
  const consent = (
    await getFeltDBDataStore().list<StoredMcpConsent>("mcp_tool_consents")
  ).find(
    (record) => record.serverId === serverId && record.toolName === toolName,
  );
  return consent?.consent ?? "ask";
}

export async function setStoredConsent(
  serverId: number,
  toolName: string,
  consent: Consent,
): Promise<void> {
  const store = getFeltDBDataStore();
  const existing = (
    await store.list<StoredMcpConsent>("mcp_tool_consents")
  ).find(
    (record) => record.serverId === serverId && record.toolName === toolName,
  );
  if (existing) {
    await store.update<StoredMcpConsent>("mcp_tool_consents", existing.id, {
      consent,
    });
  } else {
    await store.create<StoredMcpConsent>("mcp_tool_consents", {
      serverId,
      toolName,
      consent,
    });
  }
}

export async function requireMcpToolConsent(
  event: IpcMainInvokeEvent,
  params: {
    serverId: number;
    serverName: string;
    toolName: string;
    toolDescription?: string | null;
    inputPreview?: string | null;
  },
): Promise<boolean> {
  const current = await getStoredConsent(params.serverId, params.toolName);
  if (current === "always") return true;
  if (current === "denied") return false;

  // Ask renderer for a decision via event bridge
  const requestId = `${params.serverId}:${params.toolName}:${crypto.randomUUID()}`;
  (event.sender as any).send("mcp:tool-consent-request", {
    requestId,
    ...params,
  });
  const response = await waitForConsent(requestId);

  if (response === "accept-always") {
    await setStoredConsent(params.serverId, params.toolName, "always");
    return true;
  }
  if (response === "decline") {
    return false;
  }
  return response === "accept-once";
}
