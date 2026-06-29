/**
 * A tiny NoSQL-style document store layered over expo-sqlite.
 *
 * Each "collection" is a single table of opaque JSON documents:
 *   id TEXT PRIMARY KEY, data TEXT, createdAt INT, updatedAt INT
 *
 * This gives us schemaless, document-oriented semantics (insert/get/patch/query)
 * without a native Realm/Rx dependency, so the whole engine runs in Expo Go and
 * in dev/prod builds identically. Querying is done in-process via predicate
 * functions — perfectly adequate for a local-first, single-user dataset.
 */

import * as SQLite from 'expo-sqlite';

export interface BaseDoc {
  id: string;
  createdAt: number;
  updatedAt: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('questpic.db', {
      useNewConnection: false,
    });
  }
  return dbPromise;
}

/** Monotonic-ish, collision-resistant id without pulling in a uuid dep. */
export function newId(prefix = 'q'): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${prefix}_${t}${r}`;
}

/**
 * A typed handle over one collection table. `T` is the full document shape
 * (including the BaseDoc fields). Documents are stored as JSON text.
 */
export class Collection<T extends BaseDoc> {
  constructor(public readonly name: string) {}

  async init(): Promise<void> {
    const db = await getDb();
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS "${this.name}" (
        id TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );`,
    );
  }

  async insert(doc: T): Promise<T> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO "${this.name}" (id, data, createdAt, updatedAt) VALUES (?, ?, ?, ?);`,
      doc.id,
      JSON.stringify(doc),
      doc.createdAt,
      doc.updatedAt,
    );
    return doc;
  }

  async bulkInsert(docs: T[]): Promise<void> {
    if (docs.length === 0) return;
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const doc of docs) {
        await db.runAsync(
          `INSERT OR REPLACE INTO "${this.name}" (id, data, createdAt, updatedAt) VALUES (?, ?, ?, ?);`,
          doc.id,
          JSON.stringify(doc),
          doc.createdAt,
          doc.updatedAt,
        );
      }
    });
  }

  async get(id: string): Promise<T | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ data: string }>(
      `SELECT data FROM "${this.name}" WHERE id = ?;`,
      id,
    );
    return row ? (JSON.parse(row.data) as T) : null;
  }

  async all(): Promise<T[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ data: string }>(
      `SELECT data FROM "${this.name}" ORDER BY createdAt ASC;`,
    );
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  /** In-process filter — keeps the document model truly schemaless. */
  async query(predicate: (doc: T) => boolean): Promise<T[]> {
    const docs = await this.all();
    return docs.filter(predicate);
  }

  /**
   * Shallow-merge a patch into an existing document and bump `updatedAt`.
   * Returns the new document, or null if the id was not found.
   */
  async patch(id: string, patch: Partial<T>): Promise<T | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const next: T = { ...existing, ...patch, updatedAt: Date.now() };
    await this.insert(next);
    return next;
  }

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM "${this.name}" WHERE id = ?;`, id);
  }

  async count(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) as n FROM "${this.name}";`,
    );
    return row?.n ?? 0;
  }

  /** Drop every document in the collection (used on logout / account switch). */
  async clear(): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM "${this.name}";`);
  }
}
