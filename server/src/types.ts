/** Server-side document shapes. Mirrors the app's types plus an `ownerId`. */

export interface UserDoc {
  id: string;
  email: string;
  handle: string;
  name: string;
  avatar: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
}

/** A user as exposed over the wire — never includes the password hash. */
export interface PublicUser {
  id: string;
  email: string;
  handle: string;
  name: string;
  avatar: string;
}

export function toPublicUser(u: UserDoc): PublicUser {
  return { id: u.id, email: u.email, handle: u.handle, name: u.name, avatar: u.avatar };
}

/** Any synced doc. `ownerId` is authoritative and set server-side from the JWT. */
export interface SyncDoc {
  id: string;
  ownerId?: string;
  updatedAt: number;
  [key: string]: unknown;
}

export interface ListDoc extends SyncDoc {
  collaborators?: string[];
}

export interface ItemDoc extends SyncDoc {
  listIds?: string[];
}

export interface FriendshipDoc {
  id: string;
  requesterId: string;
  recipientId: string;
  status: 'pending' | 'accepted';
  createdAt: number;
  updatedAt: number;
}
