import path from "node:path";
import { createFeltDB } from "@feltdb/core";

export type FeltDBRecord = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
};

export class FeltDBDataStore {
  private db: ReturnType<typeof createFeltDB> | null = null;
  private initialization: Promise<void> | null = null;
  private readonly dataPath: string;
  private readonly idCounters = new Map<string, number>();
  private readonly documentIds = new Map<string, Map<number, string>>();
  private readonly indexInitializations = new Map<string, Promise<void>>();

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  async initialize(): Promise<void> {
    if (this.initialization) {
      await this.initialization;
      return;
    }
    if (this.db) return;
    this.initialization ??= Promise.resolve().then(() => {
      this.db = createFeltDB({
        namespace: "builder-settings",
        path: path.join(this.dataPath, ".feltdb"),
      });
    });
    await this.initialization;
  }

  async list<T extends FeltDBRecord>(collectionName: string): Promise<T[]> {
    const collection = await this.getCollection(collectionName);
    const documents = (await collection.all()) as Array<
      Omit<T, "id" | "createdAt" | "updatedAt"> & {
        id: string;
        numeric_id: number;
        createdAt: number;
        updatedAt: number;
      }
    >;
    const index = new Map<number, string>();
    let nextId = 1;
    for (const document of documents) {
      index.set(document.numeric_id, document.id);
      nextId = Math.max(nextId, document.numeric_id + 1);
    }
    this.documentIds.set(collectionName, index);
    this.idCounters.set(collectionName, nextId);
    return documents
      .map((record) => this.toRecord<T>(record))
      .sort(
        (first, second) =>
          second.createdAt.getTime() - first.createdAt.getTime(),
      );
  }

  async get<T extends FeltDBRecord>(
    collectionName: string,
    id: number,
  ): Promise<T | null> {
    const collection = await this.getCollection(collectionName);
    const documentId = await this.getDocumentId(collectionName, id);
    if (!documentId) return null;
    const document = (await collection.get(documentId)) as
      | ({
          numeric_id: number;
          createdAt: number;
          updatedAt: number;
          [key: string]: unknown;
        } & object)
      | null;
    return document ? this.toRecord<T>(document as never) : null;
  }

  async create<T extends FeltDBRecord>(
    collectionName: string,
    record: Omit<T, "id" | "createdAt" | "updatedAt">,
  ): Promise<T> {
    const collection = await this.getCollection(collectionName);
    await this.ensureCollectionIndex(collectionName);
    const id = this.idCounters.get(collectionName) ?? 1;
    this.idCounters.set(collectionName, id + 1);
    const now = new Date();
    const created = { ...record, id, createdAt: now, updatedAt: now } as T;
    const documentId = `${collectionName}:${id}`;
    await collection.insert(
      {
        ...record,
        numeric_id: id,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      },
      documentId,
    );
    this.documentIds.get(collectionName)?.set(id, documentId);
    return created;
  }

  async update<T extends FeltDBRecord>(
    collectionName: string,
    id: number,
    changes: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>,
  ): Promise<T> {
    const collection = await this.getCollection(collectionName);
    const documentId = await this.getDocumentId(collectionName, id);
    if (!documentId)
      throw new Error(`${collectionName} record ${id} not found`);
    const document = (await collection.get(documentId)) as
      | ({
          numeric_id: number;
          createdAt: number | Date;
          updatedAt: number;
          [key: string]: unknown;
        } & object)
      | null;
    if (!document) throw new Error(`${collectionName} record ${id} not found`);
    const updatedAt = Date.now();
    await collection.update(documentId, {
      ...document,
      ...changes,
      numeric_id: id,
      createdAt:
        document.createdAt instanceof Date
          ? document.createdAt.getTime()
          : document.createdAt,
      updatedAt,
    });
    return this.toRecord<T>({ ...document, ...changes, updatedAt } as never);
  }

  async delete(collectionName: string, id: number): Promise<void> {
    const collection = await this.getCollection(collectionName);
    const documentId = await this.getDocumentId(collectionName, id);
    if (!documentId) return;
    await collection.delete(documentId);
    this.documentIds.get(collectionName)?.delete(id);
  }

  async close(): Promise<void> {
    const db = this.db;
    this.db = null;
    this.initialization = null;
    this.documentIds.clear();
    this.idCounters.clear();
    this.indexInitializations.clear();
    await db?.close();
  }

  private toRecord<T extends FeltDBRecord>(record: {
    numeric_id: number;
    createdAt: number;
    updatedAt: number;
    [key: string]: unknown;
  }): T {
    return {
      ...record,
      id: record.numeric_id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    } as unknown as T;
  }

  private async ensureCollectionIndex(collectionName: string): Promise<void> {
    if (this.documentIds.has(collectionName)) return;
    let initialization = this.indexInitializations.get(collectionName);
    if (!initialization) {
      initialization = (async () => {
        const collection = await this.getCollection(collectionName);
        const index = new Map<number, string>();
        let nextId = 1;
        for (const document of (await collection.all()) as Array<{
          id: string;
          numeric_id: number;
        }>) {
          index.set(document.numeric_id, document.id);
          nextId = Math.max(nextId, document.numeric_id + 1);
        }
        this.documentIds.set(collectionName, index);
        this.idCounters.set(collectionName, nextId);
      })();
      this.indexInitializations.set(collectionName, initialization);
    }
    await initialization;
  }

  private async getDocumentId(
    collectionName: string,
    id: number,
  ): Promise<string | undefined> {
    await this.ensureCollectionIndex(collectionName);
    return this.documentIds.get(collectionName)?.get(id);
  }

  private async getCollection(collectionName: string) {
    await this.initialize();
    if (!this.db) throw new Error("FeltDB data store not initialized");
    return this.db.collection(collectionName);
  }
}

let dataStore: FeltDBDataStore | null = null;

export function initializeFeltDBDataStore(dataPath: string): FeltDBDataStore {
  dataStore ??= new FeltDBDataStore(dataPath);
  return dataStore;
}

export function getFeltDBDataStore(): FeltDBDataStore {
  if (!dataStore) throw new Error("FeltDB data store not initialized");
  return dataStore;
}
