/**
 * Authenticated, per-user sync + sharing routes. Everything here runs behind
 * `requireAuth`, so `req.userId` is always present and authoritative — clients
 * can never push data as another user or read data not shared with them.
 *
 * Sharing is read-only in v1: a collaborator can pull and clone a shared list,
 * but only the owner can mutate it. (Write-collaboration is a later increment.)
 */

import { Router, type Response } from 'express';
import type { Collection as MongoCollection } from 'mongodb';
import { type AuthedRequest, loginHandler, meHandler, registerHandler, requireAuth } from './auth';
import { getDb, SYNCED_COLLECTIONS, type SyncedCollection } from './mongo';
import { toPublicUser, type FriendshipDoc, type ListDoc, type SyncDoc, type UserDoc } from './types';

interface Tombstone {
  _id: string;
  ownerId: string;
  collection: SyncedCollection;
  refId: string;
  deletedAt: number;
}

export const router = Router();

/* ----------------------------------------------------------------- public */

router.get('/health', async (_req, res: Response) => {
  try {
    const db = await getDb();
    const users = await db.collection('users').countDocuments();
    res.json({ ok: true, db: db.databaseName, users, serverTime: Date.now() });
  } catch (err) {
    res.status(503).json({ ok: false, error: messageOf(err) });
  }
});

router.post('/auth/register', wrap(registerHandler));
router.post('/auth/login', wrap(loginHandler));

/* -------------------------------------------------------------- protected */

router.use(requireAuth);

router.get('/me', wrap(meHandler));

/** Look up a user by handle; enriches response with friendship status + mutual friends count. */
router.get('/users/lookup', async (req: AuthedRequest, res: Response) => {
  const myId = req.userId!;
  const handle = normalizeHandle(String(req.query.handle ?? ''));
  const db = await getDb();
  const user = await db.collection<UserDoc>('users').findOne({ handle });
  if (!user) {
    res.status(404).json({ ok: false, error: 'No quester with that handle.' });
    return;
  }
  const fs = db.collection<FriendshipDoc>('friendships');
  const friendship = await fs.findOne({
    $or: [
      { requesterId: myId, recipientId: user.id },
      { requesterId: user.id, recipientId: myId },
    ],
  });
  let friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' = 'none';
  let friendshipId: string | undefined;
  if (friendship) {
    friendshipId = friendship.id;
    if (friendship.status === 'accepted') friendshipStatus = 'friends';
    else if (friendship.requesterId === myId) friendshipStatus = 'pending_sent';
    else friendshipStatus = 'pending_received';
  }
  const myFriendIds = await getFriendIds(db, myId);
  const theirFriendIds = await getFriendIds(db, user.id);
  const mutualFriendsCount = myFriendIds.filter((id) => theirFriendIds.includes(id)).length;
  res.json({ ok: true, user: toPublicUser(user), friendshipStatus, friendshipId, mutualFriendsCount });
});

/**
 * Pull everything visible to this user changed since `?since=`: their own items
 * and lists, plus lists shared with them and the items inside those lists.
 */
router.get('/pull', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = await getDb();
    const since = Number(req.query.since ?? 0) || 0;

    const lists = db.collection<ListDoc>('lists');
    const items = db.collection<SyncDoc>('items');

    // Lists I own or that are shared with me.
    const visibleLists = await lists
      .find(
        { $or: [{ ownerId: userId }, { collaborators: userId }], updatedAt: { $gt: since } },
        { projection: { _id: 0 } },
      )
      .toArray();

    // Ids of every list shared with me (regardless of `since`) so I can pull
    // their member items even if those items predate my cursor.
    const sharedListIds = (
      await lists.find({ collaborators: userId }, { projection: { id: 1 } }).toArray()
    ).map((l) => l.id);

    const visibleItems = await items
      .find(
        {
          $or: [{ ownerId: userId }, { listIds: { $in: sharedListIds } }],
          updatedAt: { $gt: since },
        },
        { projection: { _id: 0 } },
      )
      .toArray();

    const tombstones = await db
      .collection<Tombstone>('tombstones')
      .find({ ownerId: userId, deletedAt: { $gt: since } }, { projection: { _id: 0 } })
      .toArray();

    res.json({ items: visibleItems, lists: visibleLists, tombstones, serverTime: Date.now() });
  } catch (err) {
    res.status(503).json({ ok: false, error: messageOf(err) });
  }
});

/** Push the caller's local changes. Ownership is enforced: you can only write your own docs. */
router.post('/push', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = await getDb();
    const body = req.body ?? {};
    const applied: Record<string, number> = {};

    for (const name of SYNCED_COLLECTIONS) {
      const docs: SyncDoc[] = Array.isArray(body[name]) ? body[name] : [];
      applied[name] = await ownedLwwUpsert(db.collection<SyncDoc>(name), docs, userId);
    }

    const deletions: { collection: SyncedCollection; id: string }[] = Array.isArray(body.deletions)
      ? body.deletions
      : [];
    let deleted = 0;
    const now = Date.now();
    const tombstones = db.collection<Tombstone>('tombstones');
    for (const del of deletions) {
      if (!SYNCED_COLLECTIONS.includes(del.collection)) continue;
      // Only owners delete; this no-ops on docs the caller doesn't own.
      const result = await db
        .collection<SyncDoc>(del.collection)
        .deleteOne({ id: del.id, ownerId: userId });
      if (result.deletedCount > 0) {
        await tombstones.updateOne(
          { _id: `${del.collection}:${del.id}` },
          { $set: { ownerId: userId, collection: del.collection, refId: del.id, deletedAt: now } },
          { upsert: true },
        );
        deleted += 1;
      }
    }

    res.json({ ok: true, applied, deleted, serverTime: now });
  } catch (err) {
    res.status(503).json({ ok: false, error: messageOf(err) });
  }
});

/** Share a list with another user by handle (owner only). */
router.post('/lists/:id/share', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const listId = req.params.id;
    const handle = normalizeHandle(String(req.body?.handle ?? ''));
    const db = await getDb();

    const list = await db.collection<ListDoc>('lists').findOne({ id: listId, ownerId: userId });
    if (!list) {
      res.status(404).json({ ok: false, error: 'List not found (or not yours to share).' });
      return;
    }
    const target = await db.collection<UserDoc>('users').findOne({ handle });
    if (!target) {
      res.status(404).json({ ok: false, error: 'No quester with that handle.' });
      return;
    }
    if (target.id === userId) {
      res.status(400).json({ ok: false, error: "You can't share a list with yourself." });
      return;
    }

    const now = Date.now();
    await db
      .collection<ListDoc>('lists')
      .updateOne({ id: listId }, { $addToSet: { collaborators: target.id }, $set: { updatedAt: now } } as object);
    // Touch member items so the new collaborator pulls them past their cursor.
    await db
      .collection<SyncDoc>('items')
      .updateMany({ listIds: listId, ownerId: userId }, { $set: { updatedAt: now } });

    res.json({ ok: true, sharedWith: toPublicUser(target) });
  } catch (err) {
    res.status(503).json({ ok: false, error: messageOf(err) });
  }
});

/** Revoke a collaborator (owner only). */
router.delete('/lists/:id/share/:userId', async (req: AuthedRequest, res: Response) => {
  try {
    const ownerId = req.userId!;
    const { id: listId, userId: collaboratorId } = req.params;
    const db = await getDb();
    const result = await db
      .collection<ListDoc>('lists')
      .updateOne(
        { id: listId, ownerId },
        { $pull: { collaborators: collaboratorId }, $set: { updatedAt: Date.now() } } as object,
      );
    if (result.matchedCount === 0) {
      res.status(404).json({ ok: false, error: 'List not found (or not yours).' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: messageOf(err) });
  }
});

/** Send a friend invite to a user by their userId. */
router.post('/friends/invite', async (req: AuthedRequest, res: Response) => {
  try {
    const myId = req.userId!;
    const recipientId = String(req.body?.userId ?? '');
    if (!recipientId || recipientId === myId) {
      res.status(400).json({ ok: false, error: 'Invalid recipient.' });
      return;
    }
    const db = await getDb();
    const existing = await db.collection<FriendshipDoc>('friendships').findOne({
      $or: [
        { requesterId: myId, recipientId },
        { requesterId: recipientId, recipientId: myId },
      ],
    });
    if (existing) {
      res.status(409).json({ ok: false, error: existing.status === 'accepted' ? 'Already friends.' : 'Invite already pending.' });
      return;
    }
    const now = Date.now();
    const invite: FriendshipDoc = {
      id: `fs_${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      requesterId: myId,
      recipientId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<FriendshipDoc>('friendships').insertOne(invite);
    res.json({ ok: true, invite: { id: invite.id } });
  } catch (err) {
    res.status(503).json({ ok: false, error: messageOf(err) });
  }
});

/** Accept a pending invite (recipient only). */
router.post('/friends/accept/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const myId = req.userId!;
    const inviteId = req.params.id;
    const db = await getDb();
    const result = await db.collection<FriendshipDoc>('friendships').updateOne(
      { id: inviteId, recipientId: myId, status: 'pending' },
      { $set: { status: 'accepted', updatedAt: Date.now() } },
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ ok: false, error: 'Invite not found.' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: messageOf(err) });
  }
});

/** Cancel or decline an invite (either party). */
router.delete('/friends/:id', async (req: AuthedRequest, res: Response) => {
  try {
    const myId = req.userId!;
    const inviteId = req.params.id;
    const db = await getDb();
    const result = await db.collection<FriendshipDoc>('friendships').deleteOne({
      id: inviteId,
      $or: [{ requesterId: myId }, { recipientId: myId }],
    });
    if (result.deletedCount === 0) {
      res.status(404).json({ ok: false, error: 'Invite not found.' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: messageOf(err) });
  }
});

/** Get pending invites received by the current user. */
router.get('/friends/pending', async (req: AuthedRequest, res: Response) => {
  try {
    const myId = req.userId!;
    const db = await getDb();
    const pending = await db
      .collection<FriendshipDoc>('friendships')
      .find({ recipientId: myId, status: 'pending' })
      .toArray();
    const requesterIds = pending.map((f) => f.requesterId);
    const users = await db.collection<UserDoc>('users').find({ id: { $in: requesterIds } }).toArray();
    const userMap = new Map(users.map((u) => [u.id, u]));
    const invites = pending.map((f) => {
      const u = userMap.get(f.requesterId);
      return {
        id: f.id,
        requesterId: f.requesterId,
        requesterHandle: u?.handle ?? '',
        requesterName: u?.name ?? '',
        requesterAvatar: u?.avatar ?? '◈',
        recipientId: f.recipientId,
        status: f.status,
        createdAt: f.createdAt,
      };
    });
    res.json({ ok: true, invites });
  } catch (err) {
    res.status(503).json({ ok: false, error: messageOf(err) });
  }
});

/* ------------------------------------------------------------------ helpers */

/** LWW upsert that refuses to overwrite docs owned by someone else. */
async function ownedLwwUpsert(
  col: MongoCollection<SyncDoc>,
  docs: SyncDoc[],
  userId: string,
): Promise<number> {
  const valid = docs.filter((d) => d && typeof d.id === 'string');
  if (valid.length === 0) return 0;

  const existing = await col
    .find({ id: { $in: valid.map((d) => d.id) } }, { projection: { id: 1, updatedAt: 1, ownerId: 1 } })
    .toArray();
  const exMap = new Map(existing.map((e) => [e.id, e]));

  const ops = valid
    .filter((d) => {
      const ex = exMap.get(d.id);
      if (ex?.ownerId && ex.ownerId !== userId) return false; // not mine — read-only share
      if (ex && (ex.updatedAt ?? 0) > (d.updatedAt ?? 0)) return false; // server is newer
      return true;
    })
    .map((d) => ({
      replaceOne: {
        filter: { id: d.id },
        replacement: { ...d, ownerId: userId },
        upsert: true,
      },
    }));

  if (ops.length === 0) return 0;
  const result = await col.bulkWrite(ops, { ordered: false });
  return result.upsertedCount + result.modifiedCount;
}

async function getFriendIds(db: Awaited<ReturnType<typeof getDb>>, userId: string): Promise<string[]> {
  const friendships = await db
    .collection<FriendshipDoc>('friendships')
    .find({ status: 'accepted', $or: [{ requesterId: userId }, { recipientId: userId }] })
    .toArray();
  return friendships.map((f) => (f.requesterId === userId ? f.recipientId : f.requesterId));
}

function normalizeHandle(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Adapt an async handler so thrown errors become 500s instead of hanging. */
function wrap(fn: (req: AuthedRequest, res: Response) => Promise<void>) {
  return (req: AuthedRequest, res: Response) => {
    fn(req, res).catch((err) => res.status(500).json({ ok: false, error: messageOf(err) }));
  };
}
