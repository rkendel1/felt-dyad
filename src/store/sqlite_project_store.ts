/**
 * SqliteProjectStore implements IProjectStore using SQLite (Drizzle ORM)
 * This is a wrapper around the existing Dyad database schema.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { apps, chats, messages, prompts } from "../db/schema";
import type {
  IProjectStore,
  App,
  Chat,
  Message,
  Prompt,
  ProjectState,
  CreateAppInput,
  CreateChatInput,
  CreateMessageInput,
  CreatePromptInput,
  UpdatePromptInput,
} from "./project_store";

export class SqliteProjectStore implements IProjectStore {
  constructor(private dataPath?: string) {}

  async initialize(): Promise<void> {
    // Database is already initialized in db/index.ts
    // Nothing to do here
  }

  async close(): Promise<void> {
    // Better-sqlite3 handles cleanup
  }

  // ============ Apps ============

  async createApp(input: CreateAppInput): Promise<App> {
    const result = await db
      .insert(apps)
      .values({
        name: input.name,
        path: input.path,
        githubOrg: input.githubOrg,
        githubRepo: input.githubRepo,
        githubBranch: input.githubBranch,
        supabaseProjectId: input.supabaseProjectId,
        supabaseParentProjectId: input.supabaseParentProjectId,
        supabaseOrganizationSlug: input.supabaseOrganizationSlug,
        neonProjectId: input.neonProjectId,
        neonDevelopmentBranchId: input.neonDevelopmentBranchId,
        neonPreviewBranchId: input.neonPreviewBranchId,
        vercelProjectId: input.vercelProjectId,
        vercelProjectName: input.vercelProjectName,
        vercelTeamId: input.vercelTeamId,
        vercelDeploymentUrl: input.vercelDeploymentUrl,
        installCommand: input.installCommand,
        startCommand: input.startCommand,
        chatContext: input.chatContext,
        isFavorite: input.isFavorite ?? false,
        themeId: input.themeId,
      })
      .returning();

    if (!result[0]) {
      throw new Error("Failed to create app");
    }

    return this.appRowToApp(result[0]);
  }

  async getApp(appId: number): Promise<App | null> {
    const result = await db.select().from(apps).where(eq(apps.id, appId));
    return result[0] ? this.appRowToApp(result[0]) : null;
  }

  async updateApp(appId: number, input: Partial<CreateAppInput>): Promise<App> {
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.path !== undefined) updateData.path = input.path;
    if (input.githubOrg !== undefined) updateData.githubOrg = input.githubOrg;
    if (input.githubRepo !== undefined)
      updateData.githubRepo = input.githubRepo;
    if (input.githubBranch !== undefined)
      updateData.githubBranch = input.githubBranch;
    if (input.supabaseProjectId !== undefined)
      updateData.supabaseProjectId = input.supabaseProjectId;
    if (input.supabaseParentProjectId !== undefined)
      updateData.supabaseParentProjectId = input.supabaseParentProjectId;
    if (input.supabaseOrganizationSlug !== undefined)
      updateData.supabaseOrganizationSlug = input.supabaseOrganizationSlug;
    if (input.neonProjectId !== undefined)
      updateData.neonProjectId = input.neonProjectId;
    if (input.neonDevelopmentBranchId !== undefined)
      updateData.neonDevelopmentBranchId = input.neonDevelopmentBranchId;
    if (input.neonPreviewBranchId !== undefined)
      updateData.neonPreviewBranchId = input.neonPreviewBranchId;
    if (input.vercelProjectId !== undefined)
      updateData.vercelProjectId = input.vercelProjectId;
    if (input.vercelProjectName !== undefined)
      updateData.vercelProjectName = input.vercelProjectName;
    if (input.vercelTeamId !== undefined)
      updateData.vercelTeamId = input.vercelTeamId;
    if (input.vercelDeploymentUrl !== undefined)
      updateData.vercelDeploymentUrl = input.vercelDeploymentUrl;
    if (input.installCommand !== undefined)
      updateData.installCommand = input.installCommand;
    if (input.startCommand !== undefined)
      updateData.startCommand = input.startCommand;
    if (input.chatContext !== undefined)
      updateData.chatContext = input.chatContext;
    if (input.isFavorite !== undefined)
      updateData.isFavorite = input.isFavorite;
    if (input.themeId !== undefined) updateData.themeId = input.themeId;

    // Always update updatedAt
    updateData.updatedAt = new Date();

    const result = await db
      .update(apps)
      .set(updateData)
      .where(eq(apps.id, appId))
      .returning();

    if (!result[0]) {
      throw new Error("App not found");
    }

    return this.appRowToApp(result[0]);
  }

  async deleteApp(appId: number): Promise<void> {
    await db.delete(apps).where(eq(apps.id, appId));
  }

  async listApps(): Promise<App[]> {
    const result = await db.select().from(apps).orderBy(desc(apps.createdAt));
    return result.map((row) => this.appRowToApp(row));
  }

  async listAppsByPath(path: string): Promise<App[]> {
    const result = await db
      .select()
      .from(apps)
      .where(eq(apps.path, path))
      .orderBy(desc(apps.createdAt));
    return result.map((row) => this.appRowToApp(row));
  }

  async getAppByPath(path: string): Promise<App | null> {
    const result = await db.select().from(apps).where(eq(apps.path, path));
    return result[0] ? this.appRowToApp(result[0]) : null;
  }

  // ============ Chats ============

  async createChat(input: CreateChatInput): Promise<Chat> {
    const result = await db
      .insert(chats)
      .values({
        appId: input.appId,
        title: input.title,
        initialCommitHash: input.initialCommitHash,
      })
      .returning();

    if (!result[0]) {
      throw new Error("Failed to create chat");
    }

    return this.chatRowToChat(result[0]);
  }

  async getChat(chatId: number): Promise<Chat | null> {
    const result = await db.select().from(chats).where(eq(chats.id, chatId));
    return result[0] ? this.chatRowToChat(result[0]) : null;
  }

  async updateChat(
    chatId: number,
    input: Partial<CreateChatInput>,
  ): Promise<Chat> {
    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.initialCommitHash !== undefined)
      updateData.initialCommitHash = input.initialCommitHash;

    const result = await db
      .update(chats)
      .set(updateData)
      .where(eq(chats.id, chatId))
      .returning();

    if (!result[0]) {
      throw new Error("Chat not found");
    }

    return this.chatRowToChat(result[0]);
  }

  async deleteChat(chatId: number): Promise<void> {
    await db.delete(chats).where(eq(chats.id, chatId));
  }

  async listChats(appId: number): Promise<Chat[]> {
    const result = await db
      .select()
      .from(chats)
      .where(eq(chats.appId, appId))
      .orderBy(desc(chats.createdAt));
    return result.map((row) => this.chatRowToChat(row));
  }

  // ============ Messages ============

  async createMessage(input: CreateMessageInput): Promise<Message> {
    const result = await db
      .insert(messages)
      .values({
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
        usingFreeAgentModeQuota: input.usingFreeAgentModeQuota,
      })
      .returning();

    if (!result[0]) {
      throw new Error("Failed to create message");
    }

    return this.messageRowToMessage(result[0]);
  }

  async getMessage(messageId: number): Promise<Message | null> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    return result[0] ? this.messageRowToMessage(result[0]) : null;
  }

  async updateMessage(
    messageId: number,
    input: Partial<CreateMessageInput>,
  ): Promise<Message> {
    const updateData: any = {};
    if (input.content !== undefined) updateData.content = input.content;
    if (input.approvalState !== undefined)
      updateData.approvalState = input.approvalState;
    if (input.sourceCommitHash !== undefined)
      updateData.sourceCommitHash = input.sourceCommitHash;
    if (input.commitHash !== undefined)
      updateData.commitHash = input.commitHash;
    if (input.requestId !== undefined) updateData.requestId = input.requestId;
    if (input.maxTokensUsed !== undefined)
      updateData.maxTokensUsed = input.maxTokensUsed;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.aiMessagesJson !== undefined)
      updateData.aiMessagesJson = input.aiMessagesJson;
    if (input.usingFreeAgentModeQuota !== undefined)
      updateData.usingFreeAgentModeQuota = input.usingFreeAgentModeQuota;

    const result = await db
      .update(messages)
      .set(updateData)
      .where(eq(messages.id, messageId))
      .returning();

    if (!result[0]) {
      throw new Error("Message not found");
    }

    return this.messageRowToMessage(result[0]);
  }

  async deleteMessage(messageId: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, messageId));
  }

  async listMessages(chatId: number): Promise<Message[]> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.id);
    return result.map((row) => this.messageRowToMessage(row));
  }

  async deleteMessagesByChat(chatId: number): Promise<void> {
    await db.delete(messages).where(eq(messages.chatId, chatId));
  }

  // ============ Prompts ============

  async createPrompt(input: CreatePromptInput): Promise<Prompt> {
    const result = await db
      .insert(prompts)
      .values({
        title: input.title,
        description: input.description,
        content: input.content,
      })
      .returning();

    if (!result[0]) {
      throw new Error("Failed to create prompt");
    }

    return this.promptRowToPrompt(result[0]);
  }

  async getPrompt(promptId: number): Promise<Prompt | null> {
    const result = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, promptId));
    return result[0] ? this.promptRowToPrompt(result[0]) : null;
  }

  async updatePrompt(
    promptId: number,
    input: UpdatePromptInput,
  ): Promise<Prompt> {
    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.content !== undefined) updateData.content = input.content;

    // Always update updatedAt
    updateData.updatedAt = new Date();

    const result = await db
      .update(prompts)
      .set(updateData)
      .where(eq(prompts.id, promptId))
      .returning();

    if (!result[0]) {
      throw new Error("Prompt not found");
    }

    return this.promptRowToPrompt(result[0]);
  }

  async deletePrompt(promptId: number): Promise<void> {
    await db.delete(prompts).where(eq(prompts.id, promptId));
  }

  async listPrompts(): Promise<Prompt[]> {
    const result = await db
      .select()
      .from(prompts)
      .orderBy(desc(prompts.createdAt));
    return result.map((row) => this.promptRowToPrompt(row));
  }

  // ============ Project State (key-value) ============

  async setProjectState(
    _projectId: number,
    _key: string,
    _value: any,
  ): Promise<void> {
    // Note: Project state will be implemented in FeltDB integration
    // For now, we store it in chatContext as a temporary solution
    throw new Error("Project state not yet implemented in SQLite store");
  }

  async getProjectState(_projectId: number, _key: string): Promise<any> {
    throw new Error("Project state not yet implemented in SQLite store");
  }

  async deleteProjectState(_projectId: number, _key: string): Promise<void> {
    throw new Error("Project state not yet implemented in SQLite store");
  }

  async getProjectStateByKey(
    _projectId: number,
    _key: string,
  ): Promise<ProjectState | null> {
    throw new Error("Project state not yet implemented in SQLite store");
  }

  // ============ Private Helpers ============

  private appRowToApp(row: any): App {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
      githubOrg: row.githubOrg,
      githubRepo: row.githubRepo,
      githubBranch: row.githubBranch,
      supabaseProjectId: row.supabaseProjectId,
      supabaseParentProjectId: row.supabaseParentProjectId,
      supabaseOrganizationSlug: row.supabaseOrganizationSlug,
      neonProjectId: row.neonProjectId,
      neonDevelopmentBranchId: row.neonDevelopmentBranchId,
      neonPreviewBranchId: row.neonPreviewBranchId,
      vercelProjectId: row.vercelProjectId,
      vercelProjectName: row.vercelProjectName,
      vercelTeamId: row.vercelTeamId,
      vercelDeploymentUrl: row.vercelDeploymentUrl,
      installCommand: row.installCommand,
      startCommand: row.startCommand,
      chatContext: row.chatContext,
      isFavorite: row.isFavorite ?? false,
      themeId: row.themeId,
    };
  }

  private chatRowToChat(row: any): Chat {
    return {
      id: row.id,
      appId: row.appId,
      title: row.title,
      initialCommitHash: row.initialCommitHash,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    };
  }

  private messageRowToMessage(row: any): Message {
    return {
      id: row.id,
      chatId: row.chatId,
      role: row.role as any,
      content: row.content,
      approvalState: row.approvalState,
      sourceCommitHash: row.sourceCommitHash,
      commitHash: row.commitHash,
      requestId: row.requestId,
      maxTokensUsed: row.maxTokensUsed,
      model: row.model,
      aiMessagesJson: row.aiMessagesJson,
      usingFreeAgentModeQuota: row.usingFreeAgentModeQuota,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    };
  }

  private promptRowToPrompt(row: any): Prompt {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      content: row.content,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
    };
  }
}
