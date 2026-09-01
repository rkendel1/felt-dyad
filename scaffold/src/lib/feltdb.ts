/**
 * FeltDB client initialization and configuration
 * This is the canonical entry point for FeltDB in this application
 */

import { FeltDB } from "@feltdb/core";
import path from "path";

let _feltdbInstance: FeltDB | null = null;

/**
 * Get or create the FeltDB instance
 * Applications should use this to access the database
 */
export async function getFeltDB(): Promise<FeltDB> {
  if (_feltdbInstance) {
    return _feltdbInstance;
  }

  // Initialize FeltDB with the .feltdb directory
  // In a real application, you would determine the correct path based on your runtime environment
  const dbPath = path.join(process.cwd(), ".feltdb");

  _feltdbInstance = new FeltDB({
    path: dbPath,
  });

  return _feltdbInstance;
}

/**
 * Define your application's collections and schemas here
 * Example:
 *
 * export const collections = {
 *   todos: {
 *     schema: {
 *       id: { type: "string", primaryKey: true },
 *       title: { type: "string" },
 *       completed: { type: "boolean", default: false },
 *       createdAt: { type: "date", default: () => new Date() },
 *     },
 *   },
 * };
 *
 * Then in your components:
 *
 * const db = await getFeltDB();
 * const todos = await db.collection("todos").find().toArray();
 * await db.collection("todos").insertOne({ id: "1", title: "My task", completed: false });
 */

export const collections = {
  // Define your collections here following the FeltDB schema pattern
};

/**
 * Initialize FeltDB collections on app startup
 */
export async function initializeFeltDB(): Promise<void> {
  const db = await getFeltDB();

  // Initialize each collection if needed
  // This is where you would define indexes, validate schemas, etc.
  for (const [collectionName] of Object.entries(collections)) {
    // Get or create the collection
    const collection = db.collection(collectionName);
    // Any initialization logic here
    console.log(`Initialized collection: ${collectionName}`);
  }
}
