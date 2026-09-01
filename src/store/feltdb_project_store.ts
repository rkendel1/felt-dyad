import path from "path";
import fs from "node:fs/promises";
import { createFeltDB } from "@feltdb/core";
import type {
  IProjectStore,
  App,
  CreateAppInput,
  Chat,
  CreateChatInput,
  ChatSearchResult,
  Message,
  CreateMessageInput,
  Prompt,
  CreatePromptInput,
  UpdatePromptInput,
  ProjectState,
  MessageRole,
} from "./project_store";

/**
 * FeltDBProjectStore implements IProjectStore using FeltDB as the persistence layer
 *
 * Key design:
 * - We generate numeric IDs (1, 2, 3...) for the public API (matching IProjectStore)
 * - FeltDB generates its own string IDs internally
 * - We maintain mappings: numeric ID <-> FeltDB ID
 * - The "numeric_id" field stores our numeric ID in FeltDB documents
 */
export class FeltDBProjectStore implements IProjectStore {
  private db: ReturnType<typeof createFeltDB> | null = null;
  private initialization: Promise<void> | null = null;
  private projectPath: string;
  // ID mappings: numeric ID -> FeltDB ID
  private appIdMap: Map<number, string> = new Map();
  private chatIdMap: Map<number, string> = new Map();
  private messageIdMap: Map<number, string> = new Map();
  private promptIdMap: Map<number, string> = new Map();
  // Counter for generating next numeric IDs
  private nextAppId: number = 1;
  private nextChatId: number = 1;
  private nextMessageId: number = 1;
  private nextPromptId: number = 1;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || "";
  }

  /**
   * Initialize FeltDB
   */
  async initialize(): Promise<void> {
    if (this.initialization) {
      await this.initialization;
      return;
    }
    if (this.db) {
      return; // Already initialized
    }
    this.initialization ??= (async () => {
      const dbPath = path.join(this.projectPath, ".feltdb");
      this.db = createFeltDB({ namespace: "builder", path: dbPath });
      await this.loadIdMappings();
    })();
    await this.initialization;
  }

  /**
   * Load ID mappings from database to rebuild in-memory maps
   */
  private async loadIdMappings(): Promise<void> {
    if (!this.db) throw new Error("FeltDB not initialized");

    const apps = this.db.collection("apps");
    const chats = this.db.collection("chats");
    const messages = this.db.collection("messages");
    const prompts = this.db.collection("prompts");

    const projectState = this.db.collection("project_state");
    const [appDocs, chatDocs, msgDocs, promptDocs, stateDocs] =
      await Promise.all([
        apps.all(),
        chats.all(),
        messages.all(),
        prompts.all(),
        projectState.all(),
      ]);

    // Load app IDs
    for (const doc of appDocs) {
      const doc_any = doc as any;
      const numId = doc_any.numeric_id as number | undefined;
      const feltId = doc_any.id as string;
      if (numId !== undefined && feltId) {
        this.appIdMap.set(numId, feltId);
        this.nextAppId = Math.max(this.nextAppId, numId + 1);
      }
    }

    // Load chat IDs
    for (const doc of chatDocs) {
      const doc_any = doc as any;
      const numId = doc_any.numeric_id as number | undefined;
      const feltId = doc_any.id as string;
      if (numId !== undefined && feltId) {
        this.chatIdMap.set(numId, feltId);
        this.nextChatId = Math.max(this.nextChatId, numId + 1);
      }
    }

    // Load message IDs
    for (const doc of msgDocs) {
      const doc_any = doc as any;
      const numId = doc_any.numeric_id as number | undefined;
      const feltId = doc_any.id as string;
      if (numId !== undefined && feltId) {
        this.messageIdMap.set(numId, feltId);
        this.nextMessageId = Math.max(this.nextMessageId, numId + 1);
      }
    }

    // Load prompt IDs
    for (const doc of promptDocs) {
      const doc_any = doc as any;
      const numId = doc_any.numeric_id as number | undefined;
      const feltId = doc_any.id as string;
      if (numId !== undefined && feltId) {
        this.promptIdMap.set(numId, feltId);
        this.nextPromptId = Math.max(this.nextPromptId, numId + 1);
      }
    }

    // Older builds used generated document IDs for project state. Migrate them
    // once so state reads and writes are direct key lookups thereafter.
    for (const doc of stateDocs as any[]) {
      if (!doc.stateKey || doc.id === doc.stateKey) continue;
      if (!(await projectState.get(doc.stateKey))) {
        const { id: _legacyId, ...state } = doc;
        await projectState.insert(state, doc.stateKey);
      }
      await projectState.delete(doc.id);
    }
  }

  /**
   * Close the store
   */
  async close(): Promise<void> {
    const db = this.db;
    this.db = null;
    this.initialization = null;
    this.appIdMap.clear();
    this.chatIdMap.clear();
    this.messageIdMap.clear();
    this.promptIdMap.clear();
    this.nextAppId = 1;
    this.nextChatId = 1;
    this.nextMessageId = 1;
    this.nextPromptId = 1;
    await db?.close();
  }

  async reset(): Promise<void> {
    await this.close();
    await fs.rm(path.join(this.projectPath, ".feltdb"), {
      recursive: true,
      force: true,
    });
    this.appIdMap.clear();
    this.chatIdMap.clear();
    this.messageIdMap.clear();
    this.promptIdMap.clear();
    this.nextAppId = 1;
    this.nextChatId = 1;
    this.nextMessageId = 1;
    this.nextPromptId = 1;
    await this.initialize();
  }

  // ==================== App Operations ====================

  async createApp(input: CreateAppInput): Promise<App> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const numId = this.nextAppId++;
    const now = new Date();

    const appDoc = {
      numeric_id: numId,
      name: input.name,
      path: input.path,
      githubOrg: input.githubOrg ?? null,
      githubRepo: input.githubRepo ?? null,
      githubBranch: input.githubBranch ?? null,
      supabaseProjectId: input.supabaseProjectId ?? null,
      supabaseParentProjectId: input.supabaseParentProjectId ?? null,
      supabaseOrganizationSlug: input.supabaseOrganizationSlug ?? null,
      neonProjectId: input.neonProjectId ?? null,
      neonDevelopmentBranchId: input.neonDevelopmentBranchId ?? null,
      neonPreviewBranchId: input.neonPreviewBranchId ?? null,
      vercelProjectId: input.vercelProjectId ?? null,
      vercelProjectName: input.vercelProjectName ?? null,
      vercelTeamId: input.vercelTeamId ?? null,
      vercelDeploymentUrl: input.vercelDeploymentUrl ?? null,
      installCommand: input.installCommand ?? null,
      startCommand: input.startCommand ?? null,
      chatContext: input.chatContext ?? null,
      isFavorite: input.isFavorite ?? false,
      themeId: input.themeId ?? null,
      feltdbRuntime: input.feltdbRuntime,
      feltdbMode: input.feltdbMode,
      feltdbProjectId: input.feltdbProjectId ?? null,
      feltdbAccountId: input.feltdbAccountId ?? null,
      feltdbStatus: input.feltdbStatus ?? null,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };

    const apps = this.db.collection("apps");
    // insert() returns the actual FeltDB ID to use for get()
    const feltId = await apps.insert(appDoc, `app:${numId}`);
    this.appIdMap.set(numId, feltId);

    return {
      id: numId,
      name: input.name,
      path: input.path,
      createdAt: now,
      updatedAt: now,
      githubOrg: input.githubOrg ?? null,
      githubRepo: input.githubRepo ?? null,
      githubBranch: input.githubBranch ?? null,
      supabaseProjectId: input.supabaseProjectId ?? null,
      supabaseParentProjectId: input.supabaseParentProjectId ?? null,
      supabaseOrganizationSlug: input.supabaseOrganizationSlug ?? null,
      neonProjectId: input.neonProjectId ?? null,
      neonDevelopmentBranchId: input.neonDevelopmentBranchId ?? null,
      neonPreviewBranchId: input.neonPreviewBranchId ?? null,
      vercelProjectId: input.vercelProjectId ?? null,
      vercelProjectName: input.vercelProjectName ?? null,
      vercelTeamId: input.vercelTeamId ?? null,
      vercelDeploymentUrl: input.vercelDeploymentUrl ?? null,
      installCommand: input.installCommand ?? null,
      startCommand: input.startCommand ?? null,
      chatContext: input.chatContext ?? null,
      isFavorite: input.isFavorite ?? false,
      themeId: input.themeId ?? null,
      feltdbRuntime: input.feltdbRuntime ?? null,
      feltdbMode: input.feltdbMode ?? null,
      feltdbProjectId: input.feltdbProjectId ?? null,
      feltdbAccountId: input.feltdbAccountId ?? null,
      feltdbStatus: input.feltdbStatus ?? null,
    };
  }

  async getApp(appId: number): Promise<App | null> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.appIdMap.get(appId);
    if (!feltId) return null;

    const apps = this.db.collection("apps");
    const doc = await apps.get(feltId);

    if (!doc) return null;

    return this.docToApp(doc as any);
  }

  async updateApp(appId: number, input: Partial<CreateAppInput>): Promise<App> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.appIdMap.get(appId);
    if (!feltId) throw new Error(`App ${appId} not found`);

    const apps = this.db.collection("apps");
    const doc = await apps.get(feltId);
    if (!doc) throw new Error(`App ${appId} not found`);

    const updated = {
      ...(doc as any),
      ...input,
      updatedAt: Date.now(),
    };

    await apps.update(feltId, updated);

    return this.docToApp(updated);
  }

  async deleteApp(appId: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.appIdMap.get(appId);
    if (!feltId) throw new Error(`App ${appId} not found`);

    // Project-owned conversations are Builder metadata and must not be left
    // orphaned when an app is removed from the Builder.
    const chats = await this.listChats(appId);
    for (const chat of chats) {
      await this.deleteChat(chat.id);
    }

    const apps = this.db.collection("apps");
    await apps.delete(feltId);

    this.appIdMap.delete(appId);
  }

  async listApps(): Promise<App[]> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const apps = this.db.collection("apps");
    const docs = await apps.all();

    return (docs as any[]).map((doc) => this.docToApp(doc));
  }

  async listAppsByPath(dirPath: string): Promise<App[]> {
    const allApps = await this.listApps();
    return allApps.filter((app) => app.path === dirPath);
  }

  async getAppByPath(dirPath: string): Promise<App | null> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const apps = this.db.collection("apps");
    const docs = await apps.find({ path: dirPath });

    if ((docs as any[]).length === 0) return null;

    return this.docToApp((docs as any[])[0]);
  }

  private docToApp(doc: any): App {
    return {
      id: doc.numeric_id as number,
      name: doc.name as string,
      path: doc.path as string,
      createdAt: new Date(doc.createdAt as number),
      updatedAt: new Date(doc.updatedAt as number),
      githubOrg: doc.githubOrg ?? null,
      githubRepo: doc.githubRepo ?? null,
      githubBranch: doc.githubBranch ?? null,
      supabaseProjectId: doc.supabaseProjectId ?? null,
      supabaseParentProjectId: doc.supabaseParentProjectId ?? null,
      supabaseOrganizationSlug: doc.supabaseOrganizationSlug ?? null,
      neonProjectId: doc.neonProjectId ?? null,
      neonDevelopmentBranchId: doc.neonDevelopmentBranchId ?? null,
      neonPreviewBranchId: doc.neonPreviewBranchId ?? null,
      vercelProjectId: doc.vercelProjectId ?? null,
      vercelProjectName: doc.vercelProjectName ?? null,
      vercelTeamId: doc.vercelTeamId ?? null,
      vercelDeploymentUrl: doc.vercelDeploymentUrl ?? null,
      installCommand: doc.installCommand ?? null,
      startCommand: doc.startCommand ?? null,
      chatContext: doc.chatContext ?? null,
      isFavorite: doc.isFavorite as boolean,
      themeId: doc.themeId ?? null,
      feltdbRuntime: doc.feltdbRuntime,
      feltdbMode: doc.feltdbMode,
      feltdbProjectId: doc.feltdbProjectId ?? null,
      feltdbAccountId: doc.feltdbAccountId ?? null,
      feltdbStatus: doc.feltdbStatus ?? null,
    };
  }

  // ==================== Chat Operations ====================

  async createChat(input: CreateChatInput): Promise<Chat> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    // Verify app exists
    const app = await this.getApp(input.appId);
    if (!app) throw new Error(`App ${input.appId} not found`);

    const numId = this.nextChatId++;
    const now = new Date();

    const chatDoc = {
      numeric_id: numId,
      app_id: input.appId,
      title: input.title ?? null,
      initialCommitHash: input.initialCommitHash ?? null,
      createdAt: now.getTime(),
    };

    const chats = this.db.collection("chats");
    const feltId = await chats.insert(chatDoc, `chat:${numId}`);
    this.chatIdMap.set(numId, feltId);

    return {
      id: numId,
      appId: input.appId,
      title: input.title ?? null,
      initialCommitHash: input.initialCommitHash ?? null,
      createdAt: now,
    };
  }

  async getChat(chatId: number): Promise<Chat | null> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.chatIdMap.get(chatId);
    if (!feltId) return null;

    const chats = this.db.collection("chats");
    const doc = await chats.get(feltId);

    if (!doc) return null;

    return this.docToChat(doc as any);
  }

  async updateChat(
    chatId: number,
    input: Partial<CreateChatInput>,
  ): Promise<Chat> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.chatIdMap.get(chatId);
    if (!feltId) throw new Error(`Chat ${chatId} not found`);

    const chats = this.db.collection("chats");
    const doc = await chats.get(feltId);
    if (!doc) throw new Error(`Chat ${chatId} not found`);

    const updated = {
      ...(doc as any),
      ...input,
    };

    await chats.update(feltId, updated);

    return this.docToChat(updated);
  }

  async deleteChat(chatId: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.chatIdMap.get(chatId);
    if (!feltId) throw new Error(`Chat ${chatId} not found`);

    const chats = this.db.collection("chats");
    await chats.delete(feltId);

    this.chatIdMap.delete(chatId);
    await this.deleteMessagesByChat(chatId);
  }

  async listChats(appId: number): Promise<Chat[]> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const chats = this.db.collection("chats");
    const docs = await chats.find({ app_id: appId });

    return (docs as any[]).map((doc) => this.docToChat(doc));
  }

  async listAllChats(): Promise<Chat[]> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const chats = this.db.collection("chats");
    const docs = await chats.all();
    return (docs as any[]).map((doc) => this.docToChat(doc));
  }

  async searchChats(appId: number, query: string): Promise<ChatSearchResult[]> {
    const normalizedQuery = query.toLocaleLowerCase();
    const [chats, messages] = await Promise.all([
      this.listChats(appId),
      this.listAllMessages(),
    ]);
    const messagesByChat = new Map<number, Message[]>();
    for (const message of messages) {
      const chatMessages = messagesByChat.get(message.chatId) ?? [];
      chatMessages.push(message);
      messagesByChat.set(message.chatId, chatMessages);
    }
    const results: ChatSearchResult[] = [];

    for (const chat of chats) {
      const titleMatches = chat.title
        ?.toLocaleLowerCase()
        .includes(normalizedQuery);
      const matchingMessage = (messagesByChat.get(chat.id) ?? []).find(
        (message) =>
          message.content.toLocaleLowerCase().includes(normalizedQuery),
      );

      if (titleMatches || matchingMessage) {
        results.push({
          id: chat.id,
          appId: chat.appId,
          title: chat.title,
          createdAt: chat.createdAt,
          matchedMessageContent: matchingMessage?.content ?? null,
        });
      }
    }

    return results.sort(
      (first, second) => second.createdAt.getTime() - first.createdAt.getTime(),
    );
  }

  private docToChat(doc: any): Chat {
    return {
      id: doc.numeric_id as number,
      appId: doc.app_id as number,
      title: doc.title ?? null,
      initialCommitHash: doc.initialCommitHash ?? null,
      createdAt: new Date(doc.createdAt as number),
    };
  }

  // ==================== Message Operations ====================

  async createMessage(input: CreateMessageInput): Promise<Message> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const numId = this.nextMessageId++;
    const now = new Date();

    const msgDoc = {
      numeric_id: numId,
      chat_id: input.chatId,
      role: input.role,
      content: input.content,
      approvalState: input.approvalState,
      sourceCommitHash: input.sourceCommitHash,
      commitHash: input.commitHash,
      requestId: input.requestId,
      maxTokensUsed: input.maxTokensUsed,
      model: input.model,
      aiMessagesJson: input.aiMessagesJson,
      createdAt: now.getTime(),
    };

    const messages = this.db.collection("messages");
    const feltId = await messages.insert(msgDoc, `message:${numId}`);
    this.messageIdMap.set(numId, feltId);

    return {
      id: numId,
      chatId: input.chatId,
      role: input.role,
      content: input.content,
      approvalState: input.approvalState,
      sourceCommitHash: input.sourceCommitHash,
      commitHash: input.commitHash,
      requestId: input.requestId,
      maxTokensUsed: input.maxTokensUsed,
      model: input.model,
      aiMessagesJson: input.aiMessagesJson,
      createdAt: now,
    };
  }

  async getMessage(messageId: number): Promise<Message | null> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.messageIdMap.get(messageId);
    if (!feltId) return null;

    const messages = this.db.collection("messages");
    const doc = await messages.get(feltId);

    if (!doc) return null;

    return this.docToMessage(doc as any);
  }

  async updateMessage(
    messageId: number,
    input: Partial<CreateMessageInput>,
  ): Promise<Message> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.messageIdMap.get(messageId);
    if (!feltId) throw new Error(`Message ${messageId} not found`);

    const messages = this.db.collection("messages");
    const doc = await messages.get(feltId);
    if (!doc) throw new Error(`Message ${messageId} not found`);

    const updated = {
      ...(doc as any),
      ...input,
    };

    await messages.update(feltId, updated);

    return this.docToMessage(updated);
  }

  async deleteMessage(messageId: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.messageIdMap.get(messageId);
    if (!feltId) throw new Error(`Message ${messageId} not found`);

    const messages = this.db.collection("messages");
    await messages.delete(feltId);

    this.messageIdMap.delete(messageId);
  }

  async listMessages(chatId: number): Promise<Message[]> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const messages = this.db.collection("messages");
    const docs = await messages.find({ chat_id: chatId });

    // Sort by created_at
    return (docs as any[])
      .sort((a, b) => (a.createdAt as number) - (b.createdAt as number))
      .map((doc) => this.docToMessage(doc));
  }

  async listAllMessages(): Promise<Message[]> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const messages = this.db.collection("messages");
    const docs = await messages.all();
    return (docs as any[])
      .sort(
        (first, second) =>
          (first.createdAt as number) - (second.createdAt as number),
      )
      .map((doc) => this.docToMessage(doc));
  }

  async deleteMessagesByChat(chatId: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const messages = this.db.collection("messages");
    const docs = await messages.find({ chat_id: chatId });

    for (const doc of docs as any[]) {
      const feltId = doc.id;
      await messages.delete(feltId);
      const numId = doc.numeric_id;
      this.messageIdMap.delete(numId);
    }
  }

  private docToMessage(doc: any): Message {
    return {
      id: doc.numeric_id as number,
      chatId: doc.chat_id as number,
      role: doc.role as MessageRole,
      content: doc.content as string,
      approvalState: doc.approvalState,
      sourceCommitHash: doc.sourceCommitHash,
      commitHash: doc.commitHash,
      requestId: doc.requestId,
      maxTokensUsed: doc.maxTokensUsed,
      model: doc.model,
      aiMessagesJson: doc.aiMessagesJson,
      createdAt: new Date(doc.createdAt as number),
    };
  }

  // ==================== Prompt Operations ====================

  async createPrompt(input: CreatePromptInput): Promise<Prompt> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const numId = this.nextPromptId++;
    const now = new Date();

    const promptDoc = {
      numeric_id: numId,
      title: input.title,
      description: input.description,
      content: input.content,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };

    const prompts = this.db.collection("prompts");
    const feltId = await prompts.insert(promptDoc, `prompt:${numId}`);
    this.promptIdMap.set(numId, feltId);

    return {
      id: numId,
      title: input.title,
      description: input.description,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getPrompt(promptId: number): Promise<Prompt | null> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.promptIdMap.get(promptId);
    if (!feltId) return null;

    const prompts = this.db.collection("prompts");
    const doc = await prompts.get(feltId);

    if (!doc) return null;

    return this.docToPrompt(doc as any);
  }

  async updatePrompt(
    promptId: number,
    input: UpdatePromptInput,
  ): Promise<Prompt> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.promptIdMap.get(promptId);
    if (!feltId) throw new Error(`Prompt ${promptId} not found`);

    const prompts = this.db.collection("prompts");
    const doc = await prompts.get(feltId);
    if (!doc) throw new Error(`Prompt ${promptId} not found`);

    const updated = {
      ...(doc as any),
      ...input,
      updatedAt: Date.now(),
    };

    await prompts.update(feltId, updated);

    return this.docToPrompt(updated);
  }

  async deletePrompt(promptId: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const feltId = this.promptIdMap.get(promptId);
    if (!feltId) throw new Error(`Prompt ${promptId} not found`);

    const prompts = this.db.collection("prompts");
    await prompts.delete(feltId);

    this.promptIdMap.delete(promptId);
  }

  async listPrompts(): Promise<Prompt[]> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const prompts = this.db.collection("prompts");
    const docs = await prompts.all();

    return (docs as any[]).map((doc) => this.docToPrompt(doc));
  }

  private docToPrompt(doc: any): Prompt {
    return {
      id: doc.numeric_id as number,
      title: doc.title as string,
      description: doc.description,
      content: doc.content as string,
      createdAt: new Date(doc.createdAt as number),
      updatedAt: new Date(doc.updatedAt as number),
    };
  }

  // ==================== Project State Operations ====================

  async setProjectState(
    projectId: number,
    key: string,
    value: any,
  ): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const projectState = this.db.collection("project_state");
    const stateKey = `${projectId}:${key}`;
    const stateDoc = {
      stateKey,
      projectId,
      key,
      value,
      updatedAt: Date.now(),
    };

    const existing = await projectState.get(stateKey);
    if (existing) await projectState.update(stateKey, stateDoc);
    else await projectState.insert(stateDoc, stateKey);
  }

  async getProjectState(projectId: number, key: string): Promise<any> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const projectState = this.db.collection("project_state");
    const stateKey = `${projectId}:${key}`;
    const state = await projectState.get(stateKey);
    return state ? (state as any).value : null;
  }

  async deleteProjectState(projectId: number, key: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const projectState = this.db.collection("project_state");
    const stateKey = `${projectId}:${key}`;
    await projectState.delete(stateKey);
  }

  async getProjectStateByKey(
    projectId: number,
    key: string,
  ): Promise<ProjectState | null> {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB not initialized");

    const projectState = this.db.collection("project_state");
    const stateKey = `${projectId}:${key}`;
    const doc = (await projectState.get(stateKey)) as any;
    if (!doc) return null;
    return {
      projectId,
      key,
      value: doc.value,
      updatedAt: new Date(doc.updatedAt as number),
    };
  }
}
