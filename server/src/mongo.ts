import { Db, MongoClient } from 'mongodb';
import { ENV } from './env';

/**
 * Single shared Mongo connection for the process. The driver pools connections
 * internally, so we connect once and reuse the Db handle everywhere.
 */
let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

// Only user-owned data syncs. The Registry social feed is derived, not pushed.
export const SYNCED_COLLECTIONS = ['items', 'lists'] as const;
export type SyncedCollection = (typeof SYNCED_COLLECTIONS)[number];

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = (async () => {
      client = new MongoClient(ENV.uri, {
        // Fail fast if the cluster is unreachable rather than hanging requests.
        serverSelectionTimeoutMS: 8000,
      });
      await client.connect();
      const db = client.db(ENV.dbName);
      await ensureIndexes(db);
      return db;
    })().catch((err) => {
      // Don't cache a rejected connection — let the next request retry instead
      // of permanently failing once Atlas was briefly unreachable.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    ...SYNCED_COLLECTIONS.map((c) => db.collection(c).createIndex({ ownerId: 1, updatedAt: 1 })),
    db.collection('items').createIndex({ listIds: 1, updatedAt: 1 }),
    db.collection('lists').createIndex({ collaborators: 1, updatedAt: 1 }),
    db.collection('tombstones').createIndex({ ownerId: 1, deletedAt: 1 }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('users').createIndex({ handle: 1 }, { unique: true }),
  ]);
}

export async function closeMongo(): Promise<void> {
  await client?.close();
  client = null;
  dbPromise = null;
}
