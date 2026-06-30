/**
 * Repository layer — the only place the rest of the app touches persistence.
 *
 * Exposes the two independent collections plus the helpers that maintain the
 * many-to-many edge between items and lists. The edge is stored canonically on
 * `BucketItem.listIds`; list membership is always derived from it, so there is
 * exactly one source of truth and no risk of the two sides drifting apart.
 */

import { Collection, newId } from './store';
import type {
  BucketItem,
  BucketList,
  Collaborator,
  CountryPin,
  GeoPin,
  ID,
  MediaPayload,
  Memory,
  RegistryEntry,
} from './types';

export const items = new Collection<BucketItem>('items');
export const lists = new Collection<BucketList>('lists');
export const registry = new Collection<RegistryEntry & { createdAt: number; updatedAt: number }>(
  'registry',
);

export async function initCollections(): Promise<void> {
  await Promise.all([items.init(), lists.init(), registry.init()]);
}

/* ------------------------------------------------------------------ Lists */

export interface NewListInput {
  name: string;
  glyph?: string;
  description?: string;
  isPublic?: boolean;
  isPrivate?: boolean;
  collaborators?: ID[];
}

export async function createList(input: NewListInput): Promise<BucketList> {
  const now = Date.now();
  const list: BucketList = {
    id: newId('list'),
    name: input.name.trim(),
    glyph: input.glyph ?? '◆',
    description: input.description,
    isPublic: input.isPublic ?? false,
    isPrivate: input.isPrivate ?? true,
    collaborators: input.collaborators ?? [],
    createdAt: now,
    updatedAt: now,
  };
  return lists.insert(list);
}

/**
 * Deleting a list must also detach it from every item that referenced it,
 * otherwise items would keep a dangling listId.
 */
export async function deleteList(listId: ID): Promise<void> {
  const members = await itemsInList(listId);
  await Promise.all(
    members.map((it) =>
      items.patch(it.id, { listIds: it.listIds.filter((id) => id !== listId) }),
    ),
  );
  await lists.remove(listId);
}

/* ------------------------------------------------------------------ Items */

export interface NewItemInput {
  title: string;
  subtitle?: string;
  category?: string;
  template?: string;
  /** Lists to drop the new item into immediately. */
  listIds?: ID[];
}

export async function createItem(input: NewItemInput): Promise<BucketItem> {
  const now = Date.now();
  const item: BucketItem = {
    id: newId('item'),
    title: input.title.trim(),
    subtitle: input.subtitle,
    category: input.category,
    template: input.template,
    status: 'open',
    listIds: dedupe(input.listIds ?? []),
    createdAt: now,
    updatedAt: now,
  };
  return items.insert(item);
}

export async function deleteItem(itemId: ID): Promise<void> {
  await items.remove(itemId);
}

/* ----------------------------------------------- Many-to-many edge helpers */

/** All items that reference `listId` — list membership is derived, never stored twice. */
export function itemsInList(listId: ID): Promise<BucketItem[]> {
  return items.query((it) => it.listIds.includes(listId));
}

export async function addItemToList(itemId: ID, listId: ID): Promise<BucketItem | null> {
  const item = await items.get(itemId);
  if (!item) return null;
  if (item.listIds.includes(listId)) return item;
  return items.patch(itemId, { listIds: [...item.listIds, listId] });
}

export async function removeItemFromList(itemId: ID, listId: ID): Promise<BucketItem | null> {
  const item = await items.get(itemId);
  if (!item) return null;
  return items.patch(itemId, { listIds: item.listIds.filter((id) => id !== listId) });
}

/** Replace the full set of lists an item belongs to (multi-list assignment UI). */
export async function setItemLists(itemId: ID, listIds: ID[]): Promise<BucketItem | null> {
  return items.patch(itemId, { listIds: dedupe(listIds) });
}

/* ------------------------------------------------------ Completion / Memory */

/**
 * Flip an item to completed and seed its Memory Studio sub-document.
 * Idempotent on the timestamp: re-completing keeps the original moment.
 */
export async function completeItem(itemId: ID): Promise<BucketItem | null> {
  const item = await items.get(itemId);
  if (!item) return null;
  const memory: Memory = item.memory ?? { photos: [], crew: [] };
  return items.patch(itemId, {
    status: 'completed',
    completedAt: item.completedAt ?? Date.now(),
    memory,
  });
}

export async function reopenItem(itemId: ID): Promise<BucketItem | null> {
  return items.patch(itemId, { status: 'open', completedAt: undefined });
}

async function patchMemory(
  itemId: ID,
  mutate: (memory: Memory) => Memory,
): Promise<BucketItem | null> {
  const item = await items.get(itemId);
  if (!item) return null;
  const base: Memory = item.memory ?? { photos: [], crew: [] };
  return items.patch(itemId, { memory: mutate(base) });
}

export function addPhoto(itemId: ID, photo: MediaPayload): Promise<BucketItem | null> {
  return patchMemory(itemId, (m) => ({ ...m, photos: [...m.photos, photo] }));
}

export function removePhoto(itemId: ID, photoId: ID): Promise<BucketItem | null> {
  return patchMemory(itemId, (m) => ({
    ...m,
    photos: m.photos.filter((p) => p.id !== photoId),
  }));
}

export function setGeoPin(itemId: ID, geo: GeoPin): Promise<BucketItem | null> {
  return patchMemory(itemId, (m) => ({ ...m, geo }));
}

export function setMemoryNote(itemId: ID, note: string): Promise<BucketItem | null> {
  return patchMemory(itemId, (m) => ({ ...m, note }));
}

export function toggleCrew(itemId: ID, collaboratorId: ID): Promise<BucketItem | null> {
  return patchMemory(itemId, (m) => ({
    ...m,
    crew: m.crew.includes(collaboratorId)
      ? m.crew.filter((id) => id !== collaboratorId)
      : [...m.crew, collaboratorId],
  }));
}

export async function setTravelPins(itemId: ID, pins: CountryPin[]): Promise<BucketItem | null> {
  return items.patch(itemId, { travelPins: pins });
}

/* ----------------------------------------------------------------- Registry */

export async function reactToEntry(entryId: ID, reactionKey: string): Promise<void> {
  const entry = await registry.get(entryId);
  if (!entry) return;
  const reactions = { ...entry.reactions };
  reactions[reactionKey] = (reactions[reactionKey] ?? 0) + 1;
  await registry.patch(entryId, { reactions });
}

/**
 * Clone a friend's completed quest into the user's vault as a fresh open item.
 * The clone is a brand-new document — it shares no identity with the original.
 */
export async function cloneRegistryEntry(
  entryId: ID,
  targetListIds: ID[] = [],
): Promise<BucketItem | null> {
  const entry = await registry.get(entryId);
  if (!entry) return null;
  return createItem({
    title: entry.title,
    subtitle: entry.subtitle,
    category: entry.category,
    listIds: targetListIds,
  });
}

/* -------------------------------------------------------------------- utils */

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export type { Collaborator };
