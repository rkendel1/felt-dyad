import type {
  LanguageModelProvider,
  LanguageModel,
  CreateCustomLanguageModelProviderParams,
  CreateCustomLanguageModelParams,
} from "@/ipc/types";
import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import {
  CUSTOM_PROVIDER_PREFIX,
  getLanguageModelProviders,
  getLanguageModels,
  getLanguageModelsByProviders,
} from "../shared/language_model_helpers";
import { FeltDBRecord, getFeltDBDataStore } from "@/store";
import { IpcMainInvokeEvent } from "electron";

const logger = log.scope("language_model_handlers");
const handle = createLoggedHandler(logger);
type StoredProvider = FeltDBRecord & {
  providerId: string;
  name: string;
  apiBaseUrl: string;
  envVarName?: string;
};
type StoredModel = FeltDBRecord & {
  displayName: string;
  apiName: string;
  builtinProviderId?: string;
  customProviderId?: string;
  description?: string;
  maxOutputTokens?: number;
  contextWindow?: number;
};

export function registerLanguageModelHandlers() {
  handle(
    "get-language-model-providers",
    async (): Promise<LanguageModelProvider[]> => {
      return getLanguageModelProviders();
    },
  );

  handle(
    "create-custom-language-model-provider",
    async (
      event: IpcMainInvokeEvent,
      params: CreateCustomLanguageModelProviderParams,
    ): Promise<LanguageModelProvider> => {
      const { id, name, apiBaseUrl, envVarName } = params;

      // Validation
      if (!id) {
        throw new Error("Provider ID is required");
      }

      if (!name) {
        throw new Error("Provider name is required");
      }

      if (!apiBaseUrl) {
        throw new Error("API base URL is required");
      }

      // Check if a provider with this ID already exists
      const store = getFeltDBDataStore();
      const providerKey = CUSTOM_PROVIDER_PREFIX + id;
      const existingProvider = (
        await store.list<StoredProvider>("language_model_providers")
      ).find((provider) => provider.providerId === providerKey);

      if (existingProvider) {
        throw new Error(`A provider with ID "${id}" already exists`);
      }

      // Insert the new provider
      await store.create<StoredProvider>("language_model_providers", {
        providerId: providerKey,
        name,
        apiBaseUrl,
        envVarName: envVarName || undefined,
      });

      // Return the newly created provider
      return {
        id,
        name,
        apiBaseUrl,
        envVarName,
        type: "custom",
      };
    },
  );

  handle(
    "create-custom-language-model",
    async (
      event: IpcMainInvokeEvent,
      params: CreateCustomLanguageModelParams,
    ): Promise<void> => {
      const {
        apiName,
        displayName,
        providerId,
        description,
        maxOutputTokens,
        contextWindow,
      } = params;

      // Validation
      if (!apiName) {
        throw new Error("Model API name is required");
      }
      if (!displayName) {
        throw new Error("Model display name is required");
      }
      if (!providerId) {
        throw new Error("Provider ID is required");
      }

      // Check if provider exists
      const providers = await getLanguageModelProviders();
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) {
        throw new Error(`Provider with ID "${providerId}" not found`);
      }

      // Insert the new model
      await getFeltDBDataStore().create<StoredModel>("language_models", {
        displayName,
        apiName,
        builtinProviderId: provider.type === "cloud" ? providerId : undefined,
        customProviderId: provider.type === "custom" ? providerId : undefined,
        description: description || undefined,
        maxOutputTokens: maxOutputTokens || undefined,
        contextWindow: contextWindow || undefined,
      });
    },
  );
  handle(
    "edit-custom-language-model-provider",
    async (
      event: IpcMainInvokeEvent,
      params: CreateCustomLanguageModelProviderParams,
    ): Promise<LanguageModelProvider> => {
      const { id, name, apiBaseUrl, envVarName } = params;

      if (!id) {
        throw new Error("Provider ID is required");
      }
      if (!name) {
        throw new Error("Provider name is required");
      }
      if (!apiBaseUrl) {
        throw new Error("API base URL is required");
      }

      // Check if the provider being edited exists
      const store = getFeltDBDataStore();
      const existingProvider = (
        await store.list<StoredProvider>("language_model_providers")
      ).find((provider) => provider.providerId === CUSTOM_PROVIDER_PREFIX + id);

      if (!existingProvider) {
        throw new Error(`Provider with ID "${id}" not found`);
      }

      await store.update<StoredProvider>(
        "language_model_providers",
        existingProvider.id,
        {
          providerId: CUSTOM_PROVIDER_PREFIX + id,
          name,
          apiBaseUrl,
          envVarName: envVarName || undefined,
        },
      );
      logger.info(`Successfully updated provider`);
      return { id, name, apiBaseUrl, envVarName, type: "custom" as const };
    },
  );

  handle(
    "delete-custom-language-model",
    async (
      event: IpcMainInvokeEvent,
      params: { modelId: string },
    ): Promise<void> => {
      const { modelId: apiName } = params;

      // Validation
      if (!apiName) {
        throw new Error("Model API name (modelId) is required");
      }

      logger.info(
        `Handling delete-custom-language-model for apiName: ${apiName}`,
      );

      const store = getFeltDBDataStore();
      const existingModel = (
        await store.list<StoredModel>("language_models")
      ).find((model) => model.apiName === apiName);

      if (!existingModel) {
        throw new Error(
          `A model with API name (modelId) "${apiName}" was not found`,
        );
      }

      await store.delete("language_models", existingModel.id);
    },
  );

  handle(
    "delete-custom-model",
    async (
      _event: IpcMainInvokeEvent,
      params: { providerId: string; modelApiName: string },
    ): Promise<void> => {
      const { providerId, modelApiName } = params;
      logger.info(
        `Handling delete-custom-model for ${providerId} / ${modelApiName}`,
      );
      if (!providerId || !modelApiName) {
        throw new Error("Provider ID and Model API Name are required.");
      }
      logger.info(
        `Attempting to delete custom model ${modelApiName} for provider ${providerId}`,
      );

      const providers = await getLanguageModelProviders();
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) {
        throw new Error(`Provider with ID "${providerId}" not found`);
      }
      if (provider.type === "local") {
        throw new Error("Local models cannot be deleted");
      }
      const store = getFeltDBDataStore();
      const matchingModels = (
        await store.list<StoredModel>("language_models")
      ).filter(
        (model) =>
          model.apiName === modelApiName &&
          (provider.type === "cloud"
            ? model.builtinProviderId === providerId
            : model.customProviderId === providerId),
      );
      await Promise.all(
        matchingModels.map((model) =>
          store.delete("language_models", model.id),
        ),
      );

      if (matchingModels.length === 0) {
        logger.warn(
          `No custom model found matching providerId=${providerId} and apiName=${modelApiName} for deletion.`,
        );
      } else {
        logger.info(
          `Successfully deleted ${matchingModels.length} custom model(s) with apiName=${modelApiName} for provider=${providerId}`,
        );
      }
    },
  );

  handle(
    "delete-custom-language-model-provider",
    async (
      event: IpcMainInvokeEvent,
      params: { providerId: string },
    ): Promise<void> => {
      const { providerId } = params;

      // Validation
      if (!providerId) {
        throw new Error("Provider ID is required");
      }

      logger.info(
        `Handling delete-custom-language-model-provider for providerId: ${providerId}`,
      );

      // Check if the provider exists before attempting deletion
      const store = getFeltDBDataStore();
      const providerKey = providerId.startsWith(CUSTOM_PROVIDER_PREFIX)
        ? providerId
        : CUSTOM_PROVIDER_PREFIX + providerId;
      const existingProvider = (
        await store.list<StoredProvider>("language_model_providers")
      ).find((provider) => provider.providerId === providerKey);

      if (!existingProvider) {
        // If the provider doesn't exist, maybe it was already deleted. Log and return.
        logger.warn(
          `Provider with ID "${providerId}" not found. It might have been deleted already.`,
        );
        // Optionally, throw new Error(`Provider with ID "${providerId}" not found`);
        // Deciding to return gracefully instead of throwing an error if not found.
        return;
      }

      const models = (await store.list<StoredModel>("language_models")).filter(
        (model) =>
          model.customProviderId === providerId ||
          model.customProviderId === providerKey,
      );
      await Promise.all(
        models.map((model) => store.delete("language_models", model.id)),
      );
      await store.delete("language_model_providers", existingProvider.id);
      logger.info(`Successfully deleted provider with ID "${providerId}".`);
    },
  );

  handle(
    "get-language-models",
    async (
      event: IpcMainInvokeEvent,
      params: { providerId: string },
    ): Promise<LanguageModel[]> => {
      if (!params || typeof params.providerId !== "string") {
        throw new Error("Invalid parameters: providerId (string) is required.");
      }
      const providers = await getLanguageModelProviders();
      const provider = providers.find((p) => p.id === params.providerId);
      if (!provider) {
        throw new Error(`Provider with ID "${params.providerId}" not found`);
      }
      if (provider.type === "local") {
        throw new Error("Local models cannot be fetched");
      }
      return getLanguageModels({ providerId: params.providerId });
    },
  );

  handle(
    "get-language-models-by-providers",
    async (): Promise<Record<string, LanguageModel[]>> => {
      return getLanguageModelsByProviders();
    },
  );
}
