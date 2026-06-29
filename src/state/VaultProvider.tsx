/**
 * Global app state — the live, in-memory projection of the local database, plus
 * the offline-first sync orchestration.
 *
 * Every screen reads from here and every mutation flows through here, so the UI
 * and the SQLite store can never disagree. Mutations call the repository layer,
 * refresh the projection, and schedule a debounced background sync to Atlas via
 * the server. Deletes additionally drop a tombstone so the deletion propagates.
 * The app stays fully functional with no network — sync is best-effort.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as repo from '@/db/repositories';
import { CREW, seedIfEmpty } from '@/db/seed';
import type {
  BucketItem,
  BucketList,
  Collaborator,
  GeoPin,
  ID,
  MediaPayload,
  RegistryEntry,
} from '@/db/types';
import {
  clearLocalUserData,
  ensureOwner,
  initSync,
  recordTombstone,
  runSync,
  type SyncOutcome,
} from '@/sync/engine';
import { hasAuthToken, isSyncConfigured } from '@/sync/client';
import { useAuth } from '@/auth/AuthProvider';

interface SyncState {
  configured: boolean;
  syncing: boolean;
  lastOutcome?: SyncOutcome;
}

interface VaultState {
  ready: boolean;
  items: BucketItem[];
  lists: BucketList[];
  registry: RegistryEntry[];
  crew: Collaborator[];
  sync: SyncState;
}

interface VaultActions {
  refresh: () => Promise<void>;
  /** Run a full pull→push cycle now and refresh from the merged result. */
  syncNow: () => Promise<void>;
  // Lists
  createList: (input: repo.NewListInput) => Promise<BucketList>;
  updateList: (id: ID, patch: Partial<BucketList>) => Promise<void>;
  deleteList: (id: ID) => Promise<void>;
  // Items
  createItem: (input: repo.NewItemInput) => Promise<BucketItem>;
  deleteItem: (id: ID) => Promise<void>;
  setItemLists: (id: ID, listIds: ID[]) => Promise<void>;
  toggleItemInList: (itemId: ID, listId: ID) => Promise<void>;
  // Completion + memory
  completeItem: (id: ID) => Promise<void>;
  reopenItem: (id: ID) => Promise<void>;
  addPhoto: (id: ID, photo: MediaPayload) => Promise<void>;
  removePhoto: (id: ID, photoId: ID) => Promise<void>;
  setGeoPin: (id: ID, geo: GeoPin) => Promise<void>;
  setMemoryNote: (id: ID, note: string) => Promise<void>;
  toggleCrew: (id: ID, collaboratorId: ID) => Promise<void>;
  // Registry
  reactToEntry: (entryId: ID, reactionKey: string) => Promise<void>;
  cloneEntry: (entryId: ID, listIds?: ID[]) => Promise<BucketItem | null>;
}

type VaultContextValue = VaultState &
  VaultActions & {
    itemById: (id: ID) => BucketItem | undefined;
    listById: (id: ID) => BucketList | undefined;
    itemsInList: (listId: ID) => BucketItem[];
    collaboratorById: (id: ID) => Collaborator | undefined;
    completedCount: number;
  };

const VaultContext = createContext<VaultContextValue | null>(null);

/** Debounce window for auto-sync after a burst of edits. */
const AUTO_SYNC_DEBOUNCE = 1800;

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [state, setState] = useState<VaultState>({
    ready: false,
    items: [],
    lists: [],
    registry: [],
    crew: CREW,
    sync: { configured: isSyncConfigured(), syncing: false },
  });

  // Guard against overlapping syncs + hold the debounce timer.
  const syncingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const [items, lists, registryRows] = await Promise.all([
      repo.items.all(),
      repo.lists.all(),
      repo.registry.all(),
    ]);
    const registrySorted = [...registryRows].sort((a, b) => b.completedAt - a.completedAt);
    setState((s) => ({
      ...s,
      ready: true,
      items,
      lists,
      registry: registrySorted,
      crew: CREW,
    }));
  }, []);

  /** Run one sync cycle (coalesced), then refresh the projection. */
  const syncNow = useCallback(async () => {
    if (!isSyncConfigured() || !hasAuthToken() || syncingRef.current) return;
    syncingRef.current = true;
    setState((s) => ({ ...s, sync: { ...s.sync, syncing: true } }));
    const outcome = await runSync();
    syncingRef.current = false;
    setState((s) => ({
      ...s,
      sync: { configured: true, syncing: false, lastOutcome: outcome },
    }));
    // The merge may have changed local data — reflect it.
    await refresh();
  }, [refresh]);

  /** Coalesce post-mutation syncs so a burst of edits pushes once. */
  const scheduleSync = useCallback(() => {
    if (!isSyncConfigured()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void syncNow();
    }, AUTO_SYNC_DEBOUNCE);
  }, [syncNow]);

  // One-time local bootstrap: ensure collections + the local demo feed exist.
  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      await initSync();
      await refresh();
    })();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [refresh]);

  // React to the auth session: scope local data to the signed-in account (wiping
  // a previous account's data if the device changed hands), then reconcile. On
  // sign-out, clear the user's local data so the next account starts clean.
  useEffect(() => {
    if (!authReady) return;
    (async () => {
      if (user) {
        await ensureOwner(user.id);
        await refresh();
        void syncNow();
      } else {
        await clearLocalUserData();
        await refresh();
      }
    })();
  }, [authReady, user, refresh, syncNow]);

  /** Wrap a repository mutation: refresh the projection, then schedule a sync. */
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      const result = await fn();
      await refresh();
      scheduleSync();
      return result;
    },
    [refresh, scheduleSync],
  );

  const actions: VaultActions = useMemo(
    () => ({
      refresh,
      syncNow,
      createList: (input) => run(() => repo.createList(input)),
      updateList: (id, patch) => run(() => repo.lists.patch(id, patch)).then(() => undefined),
      deleteList: (id) =>
        run(async () => {
          await recordTombstone('lists', id);
          await repo.deleteList(id);
        }).then(() => undefined),
      createItem: (input) => run(() => repo.createItem(input)),
      deleteItem: (id) =>
        run(async () => {
          await recordTombstone('items', id);
          await repo.deleteItem(id);
        }).then(() => undefined),
      setItemLists: (id, listIds) =>
        run(() => repo.setItemLists(id, listIds)).then(() => undefined),
      toggleItemInList: (itemId, listId) =>
        run(async () => {
          const item = await repo.items.get(itemId);
          if (!item) return;
          if (item.listIds.includes(listId)) {
            await repo.removeItemFromList(itemId, listId);
          } else {
            await repo.addItemToList(itemId, listId);
          }
        }).then(() => undefined),
      completeItem: (id) => run(() => repo.completeItem(id)).then(() => undefined),
      reopenItem: (id) => run(() => repo.reopenItem(id)).then(() => undefined),
      addPhoto: (id, photo) => run(() => repo.addPhoto(id, photo)).then(() => undefined),
      removePhoto: (id, photoId) => run(() => repo.removePhoto(id, photoId)).then(() => undefined),
      setGeoPin: (id, geo) => run(() => repo.setGeoPin(id, geo)).then(() => undefined),
      setMemoryNote: (id, note) => run(() => repo.setMemoryNote(id, note)).then(() => undefined),
      toggleCrew: (id, collaboratorId) =>
        run(() => repo.toggleCrew(id, collaboratorId)).then(() => undefined),
      reactToEntry: (entryId, reactionKey) =>
        run(() => repo.reactToEntry(entryId, reactionKey)).then(() => undefined),
      cloneEntry: (entryId, listIds) => run(() => repo.cloneRegistryEntry(entryId, listIds)),
    }),
    [run, refresh, syncNow],
  );

  const selectors = useMemo(
    () => ({
      itemById: (id: ID) => state.items.find((i) => i.id === id),
      listById: (id: ID) => state.lists.find((l) => l.id === id),
      itemsInList: (listId: ID) => state.items.filter((i) => i.listIds.includes(listId)),
      collaboratorById: (id: ID) => state.crew.find((c) => c.id === id),
      completedCount: state.items.filter((i) => i.status === 'completed').length,
    }),
    [state.items, state.lists, state.crew],
  );

  const value = useMemo<VaultContextValue>(
    () => ({ ...state, ...actions, ...selectors }),
    [state, actions, selectors],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within <VaultProvider>');
  return ctx;
}
