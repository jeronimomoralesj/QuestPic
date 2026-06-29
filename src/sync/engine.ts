/**
 * The sync engine — reconciles the on-device store with the user's cloud data.
 *
 * Offline-first, last-write-wins by `updatedAt`:
 *   1. PULL changes since our cursor (own + shared-with-me items/lists) and merge
 *      anything newer than the local copy; apply remote tombstones as deletes.
 *   2. PUSH a snapshot of local docs (server enforces ownership) plus pending
 *      tombstones, then clear those tombstones once accepted.
 *
 * Only `items` and `lists` sync; the Registry feed is local/demo for now. The
 * local SQLite store stays the on-device source of truth, so the app is fully
 * usable offline — sync just converges devices when a session + network exist.
 */

import { items, lists } from '@/db/repositories';
import { Collection } from '@/db/store';
import type { BaseDoc } from '@/db/store';
import { api, hasAuthToken, isSyncConfigured } from './client';

type SyncCollection = 'items' | 'lists';
const COLLECTIONS: Record<SyncCollection, Collection<any>> = { items, lists };

interface Tombstone extends BaseDoc {
  collection: SyncCollection;
  refId: string;
  deletedAt: number;
}
interface SyncMeta extends BaseDoc {
  value: string;
}

const tombstones = new Collection<Tombstone>('tombstones');
const syncMeta = new Collection<SyncMeta>('sync_meta');

export async function initSync(): Promise<void> {
  await Promise.all([tombstones.init(), syncMeta.init()]);
}

export async function recordTombstone(collection: SyncCollection, refId: string): Promise<void> {
  const now = Date.now();
  await tombstones.insert({
    id: `${collection}:${refId}`,
    collection,
    refId,
    deletedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

async function getMeta(key: string): Promise<string | null> {
  const doc = await syncMeta.get(key);
  return doc ? doc.value : null;
}
async function setMeta(key: string, value: string): Promise<void> {
  const now = Date.now();
  await syncMeta.insert({ id: key, value, createdAt: now, updatedAt: now });
}

async function getCursor(): Promise<number> {
  return Number((await getMeta('lastPulledAt')) ?? 0) || 0;
}

/** Wipe all user-owned local data + reset the pull cursor (logout / switch). */
export async function clearLocalUserData(): Promise<void> {
  await initSync();
  await Promise.all([items.clear(), lists.clear(), tombstones.clear()]);
  await setMeta('lastPulledAt', '0');
}

/**
 * Ensure local data belongs to `userId`. If the device last held a different
 * account's data, wipe it so we start clean and pull the right user's quests.
 */
export async function ensureOwner(userId: string): Promise<void> {
  await initSync();
  const prev = await getMeta('localOwner');
  if (prev !== userId) {
    await clearLocalUserData();
    await setMeta('localOwner', userId);
  }
}

export interface SyncOutcome {
  ok: boolean;
  pulled: number;
  pushed: number;
  deletedLocally: number;
  at: number;
  error?: string;
}

/** Run one full pull→push cycle. Never throws; failures come back on `error`. */
export async function runSync(): Promise<SyncOutcome> {
  const at = Date.now();
  if (!isSyncConfigured() || !hasAuthToken()) {
    return { ok: false, pulled: 0, pushed: 0, deletedLocally: 0, at, error: 'not-signed-in' };
  }
  await initSync();

  try {
    // ---- PULL ----
    const since = await getCursor();
    const remote = await api.pull(since);
    let pulled = 0;

    for (const name of ['items', 'lists'] as const) {
      const incoming = (remote[name] ?? []) as Array<{ id: string; updatedAt?: number }>;
      for (const doc of incoming) {
        const local = await COLLECTIONS[name].get(doc.id);
        if (!local || (local.updatedAt ?? 0) <= (doc.updatedAt ?? 0)) {
          await COLLECTIONS[name].insert(doc);
          pulled += 1;
        }
      }
    }

    let deletedLocally = 0;
    for (const t of remote.tombstones ?? []) {
      const col = COLLECTIONS[t.collection];
      if (!col) continue;
      const local = await col.get(t.refId);
      if (local && (local.updatedAt ?? 0) <= t.deletedAt) {
        await col.remove(t.refId);
        deletedLocally += 1;
      }
    }

    if (typeof remote.serverTime === 'number') {
      await setMeta('lastPulledAt', String(remote.serverTime));
    }

    // ---- PUSH ----
    const pendingTombstones = await tombstones.all();
    const res = await api.push({
      items: await items.all(),
      lists: await lists.all(),
      deletions: pendingTombstones.map((t) => ({ collection: t.collection, id: t.refId })),
    });

    for (const t of pendingTombstones) {
      await tombstones.remove(t.id);
    }

    const pushed = (res.applied?.items ?? 0) + (res.applied?.lists ?? 0);
    return { ok: true, pulled, pushed, deletedLocally, at: Date.now() };
  } catch (err) {
    return {
      ok: false,
      pulled: 0,
      pushed: 0,
      deletedLocally: 0,
      at: Date.now(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
