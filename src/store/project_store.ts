/**
 * ProjectStore is the abstraction boundary for all project-related persistence.
 * FeltDB-backed persistence boundary for project data.
 */

export interface ProjectStoreConfig {
  dataPath?: string;
}

// Apps
export interface App {
  id: number;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  githubOrg: string | null;
  githubRepo: string | null;
  githubBranch: string | null;
  supabaseProjectId: string | null;
  supabaseParentProjectId: string | null;
  supabaseOrganizationSlug: string | null;
  neonProjectId: string | null;
  neonDevelopmentBranchId: string | null;
  neonPreviewBranchId: string | null;
  vercelProjectId: string | null;
  vercelProjectName: string | null;
  vercelTeamId: string | null;
  vercelDeploymentUrl: string | null;
  installCommand: string | null;
  startCommand: string | null;
  chatContext: Record<string, any> | null;
  isFavorite: boolean;
  themeId: string | null;
  feltdbRuntime: "server" | "browser" | "managed" | null;
  feltdbMode: "local" | "managed" | null;
  feltdbProjectId: string | null;
  feltdbAccountId: string | null;
  feltdbStatus: "ready" | "initializing" | "failed" | null;
}

export interface CreateAppInput {
  name: string;
  path: string;
  githubOrg?: string | null;
  githubRepo?: string | null;
  githubBranch?: string | null;
  supabaseProjectId?: string | null;
  supabaseParentProjectId?: string | null;
  supabaseOrganizationSlug?: string | null;
  neonProjectId?: string | null;
  neonDevelopmentBranchId?: string | null;
  neonPreviewBranchId?: string | null;
  vercelProjectId?: string | null;
  vercelProjectName?: string | null;
  vercelTeamId?: string | null;
  vercelDeploymentUrl?: string | null;
  installCommand?: string | null;
  startCommand?: string | null;
  chatContext?: Record<string, any>;
  isFavorite?: boolean;
  themeId?: string | null;
  feltdbRuntime?: "server" | "browser" | "managed";
  feltdbMode?: "local" | "managed";
  feltdbProjectId?: string | null;
  feltdbAccountId?: string | null;
  feltdbStatus?: "ready" | "initializing" | "failed" | null;
}

// Chats
export interface Chat {
  id: number;
  appId: number;
  title: string | null;
  initialCommitHash: string | null;
  createdAt: Date;
}

export interface CreateChatInput {
  appId: number;
  title?: string;
  initialCommitHash?: string;
}

export interface ChatSearchResult {
  id: number;
  appId: number;
  title: string | null;
  createdAt: Date;
  matchedMessageContent: string | null;
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
  createdAt: Date;
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
  reset(): Promise<void>;

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
  listAllChats(): Promise<Chat[]>;
  searchChats(appId: number, query: string): Promise<ChatSearchResult[]>;

  // Messages
  createMessage(input: CreateMessageInput): Promise<Message>;
  getMessage(messageId: number): Promise<Message | null>;
  updateMessage(
    messageId: number,
    input: Partial<CreateMessageInput>,
  ): Promise<Message>;
  deleteMessage(messageId: number): Promise<void>;
  listMessages(chatId: number): Promise<Message[]>;
  listAllMessages(): Promise<Message[]>;
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
  getProjectStateByKey(
    projectId: number,
    key: string,
  ): Promise<ProjectState | null>;
}

let _projectStore: IProjectStore | null = null;

/**
 * Initialize the project store based on configuration
 */
export async function initializeProjectStore(
  config: ProjectStoreConfig,
): Promise<IProjectStore> {
  if (_projectStore) {
    return _projectStore;
  }

  const { FeltDBProjectStore } = await import("./feltdb_project_store");
  _projectStore = new FeltDBProjectStore(config.dataPath);
  await _projectStore.initialize();
  return _projectStore;
}

/**
 * Get the current project store instance
 */
export function getProjectStore(): IProjectStore {
  if (!_projectStore) {
    throw new Error(
      "ProjectStore not initialized. Call initializeProjectStore() first.",
    );
  }
  return _projectStore;
}

/**
 * Set the project store (for testing)
 */
export function setProjectStore(store: IProjectStore): void {
  _projectStore = store;
}
