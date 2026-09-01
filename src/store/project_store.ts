/**
 * ProjectStore is the abstraction boundary for all project-related persistence.
 * This allows us to swap between SQLite, FeltDB, or other backends without
 * changing the rest of the Dyad codebase.
 */

export interface ProjectStoreConfig {
  type: "sqlite" | "feltdb";
  dataPath?: string;
}

// Apps
export interface App {
  id: number;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  githubOrg?: string;
  githubRepo?: string;
  githubBranch?: string;
  supabaseProjectId?: string;
  supabaseParentProjectId?: string;
  supabaseOrganizationSlug?: string;
  neonProjectId?: string;
  neonDevelopmentBranchId?: string;
  neonPreviewBranchId?: string;
  vercelProjectId?: string;
  vercelProjectName?: string;
  vercelTeamId?: string;
  vercelDeploymentUrl?: string;
  installCommand?: string;
  startCommand?: string;
  chatContext?: Record<string, any>;
  isFavorite: boolean;
  themeId?: string;
}

export interface CreateAppInput {
  name: string;
  path: string;
  githubOrg?: string;
  githubRepo?: string;
  githubBranch?: string;
  supabaseProjectId?: string;
  supabaseParentProjectId?: string;
  supabaseOrganizationSlug?: string;
  neonProjectId?: string;
  neonDevelopmentBranchId?: string;
  neonPreviewBranchId?: string;
  vercelProjectId?: string;
  vercelProjectName?: string;
  vercelTeamId?: string;
  vercelDeploymentUrl?: string;
  installCommand?: string;
  startCommand?: string;
  chatContext?: Record<string, any>;
  isFavorite?: boolean;
  themeId?: string;
}

// Chats
export interface Chat {
  id: number;
  appId: number;
  title?: string;
  initialCommitHash?: string;
  createdAt: Date;
}

export interface CreateChatInput {
  appId: number;
  title?: string;
  initialCommitHash?: string;
}

// Messages
export type MessageRole = "user" | "assistant";

export interface Message {
  id: number;
  chatId: number;
  role: MessageRole;
  content: string;
  approvalState?: "approved" | "rejected";
  sourceCommitHash?: string;
  commitHash?: string;
  requestId?: string;
  maxTokensUsed?: number;
  model?: string;
  aiMessagesJson?: Record<string, any>;
  usingFreeAgentModeQuota?: boolean;
  createdAt?: Date;
}

export interface CreateMessageInput {
  chatId: number;
  role: MessageRole;
  content: string;
  approvalState?: "approved" | "rejected";
  sourceCommitHash?: string;
  commitHash?: string;
  requestId?: string;
  maxTokensUsed?: number;
  model?: string;
  aiMessagesJson?: Record<string, any>;
  usingFreeAgentModeQuota?: boolean;
}

// Prompts
export interface Prompt {
  id: number;
  title: string;
  description?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromptInput {
  title: string;
  description?: string;
  content: string;
}

export interface UpdatePromptInput {
  title?: string;
  description?: string;
  content?: string;
}

// Project State (key-value storage)
export interface ProjectState {
  projectId: number;
  key: string;
  value: any;
  updatedAt: Date;
}

// Main ProjectStore interface
export interface IProjectStore {
  // Initialization
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Apps
  createApp(input: CreateAppInput): Promise<App>;
  getApp(appId: number): Promise<App | null>;
  updateApp(appId: number, input: Partial<CreateAppInput>): Promise<App>;
  deleteApp(appId: number): Promise<void>;
  listApps(): Promise<App[]>;
  listAppsByPath(path: string): Promise<App[]>;
  getAppByPath(path: string): Promise<App | null>;

  // Chats
  createChat(input: CreateChatInput): Promise<Chat>;
  getChat(chatId: number): Promise<Chat | null>;
  updateChat(chatId: number, input: Partial<CreateChatInput>): Promise<Chat>;
  deleteChat(chatId: number): Promise<void>;
  listChats(appId: number): Promise<Chat[]>;

  // Messages
  createMessage(input: CreateMessageInput): Promise<Message>;
  getMessage(messageId: number): Promise<Message | null>;
  updateMessage(messageId: number, input: Partial<CreateMessageInput>): Promise<Message>;
  deleteMessage(messageId: number): Promise<void>;
  listMessages(chatId: number): Promise<Message[]>;
  deleteMessagesByChat(chatId: number): Promise<void>;

  // Prompts
  createPrompt(input: CreatePromptInput): Promise<Prompt>;
  getPrompt(promptId: number): Promise<Prompt | null>;
  updatePrompt(promptId: number, input: UpdatePromptInput): Promise<Prompt>;
  deletePrompt(promptId: number): Promise<void>;
  listPrompts(): Promise<Prompt[]>;

  // Project State (key-value)
  setProjectState(projectId: number, key: string, value: any): Promise<void>;
  getProjectState(projectId: number, key: string): Promise<any>;
  deleteProjectState(projectId: number, key: string): Promise<void>;
  getProjectStateByKey(projectId: number, key: string): Promise<ProjectState | null>;
}

let _projectStore: IProjectStore | null = null;

/**
 * Initialize the project store based on configuration
 */
export async function initializeProjectStore(config: ProjectStoreConfig): Promise<IProjectStore> {
  if (_projectStore) {
    return _projectStore;
  }

  if (config.type === "feltdb") {
    // Will be implemented in Phase 2
    throw new Error("FeltDB store not yet implemented");
  }

  // Default to SQLite
  const { SqliteProjectStore } = await import("./sqlite_project_store");
  _projectStore = new SqliteProjectStore(config.dataPath);
  await _projectStore.initialize();
  return _projectStore;
}

/**
 * Get the current project store instance
 */
export function getProjectStore(): IProjectStore {
  if (!_projectStore) {
    throw new Error("ProjectStore not initialized. Call initializeProjectStore() first.");
  }
  return _projectStore;
}

/**
 * Set the project store (for testing)
 */
export function setProjectStore(store: IProjectStore): void {
  _projectStore = store;
}
