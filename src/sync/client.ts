/**
 * HTTP client for the QuestPic API (auth + sync + sharing).
 *
 * The base URL comes from an Expo public env var, inlined at build time. The
 * auth token is held in a module-level slot that `AuthProvider` keeps in sync,
 * so every request after sign-in carries `Authorization: Bearer <jwt>` without
 * threading the token through every call site.
 *
 * If no base URL is set the app runs fully local — sync becomes a no-op — so the
 * local-first experience never depends on the server.
 */

import type { BucketItem, BucketList } from '@/db/types';

/**
 * Production API URL, baked in so release builds "just work" with no env wiring.
 * Local dev overrides this via `.env` (EXPO_PUBLIC_API_BASE_URL=http://localhost:4000).
 */
const DEFAULT_API_BASE_URL = 'https://quest-pic.vercel.app';

const BASE = (process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');

let authToken: string | null = null;
export function setAuthToken(token: string | null): void {
  authToken = token;
}
export function hasAuthToken(): boolean {
  return !!authToken;
}
export function isSyncConfigured(): boolean {
  return BASE.length > 0;
}
export function apiBaseUrl(): string {
  return BASE;
}

export interface PublicUser {
  id: string;
  email: string;
  handle: string;
  name: string;
  avatar: string;
  friendshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  friendshipId?: string;
  mutualFriendsCount?: number;
}

export interface FriendInvite {
  id: string;
  requesterId: string;
  requesterHandle: string;
  requesterName: string;
  requesterAvatar: string;
  recipientId: string;
  status: 'pending' | 'accepted';
  createdAt: number;
}

export interface PullResponse {
  items: BucketItem[];
  lists: BucketList[];
  tombstones: { collection: 'items' | 'lists'; refId: string; deletedAt: number }[];
  serverTime: number;
}

export interface PushPayload {
  items: BucketItem[];
  lists: BucketList[];
  deletions: { collection: 'items' | 'lists'; id: string }[];
}

export interface PushResponse {
  ok: boolean;
  applied: { items: number; lists: number };
  deleted: number;
  serverTime: number;
}

/** Thrown with the server's human-readable error message when a request fails. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isSyncConfigured()) throw new ApiError(0, 'Sync is not configured');
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  // Auth (public)
  register: (email: string, password: string, name: string) =>
    request<{ ok: boolean; token: string; user: PublicUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ ok: boolean; token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ ok: boolean; user: PublicUser }>('/api/me'),

  // Sync (auth required)
  pull: (since: number) => request<PullResponse>(`/api/pull?since=${since}`),
  push: (payload: PushPayload) =>
    request<PushResponse>('/api/push', { method: 'POST', body: JSON.stringify(payload) }),

  // Sharing (auth required)
  lookupUser: (handle: string) =>
    request<{ ok: boolean; user: PublicUser; friendshipStatus?: string; friendshipId?: string; mutualFriendsCount?: number }>(
      `/api/users/lookup?handle=${encodeURIComponent(handle)}`,
    ),
  shareList: (listId: string, handle: string) =>
    request<{ ok: boolean; sharedWith: PublicUser }>(`/api/lists/${listId}/share`, {
      method: 'POST',
      body: JSON.stringify({ handle }),
    }),
  unshareList: (listId: string, userId: string) =>
    request<{ ok: boolean }>(`/api/lists/${listId}/share/${userId}`, { method: 'DELETE' }),

  // Friends (auth required)
  sendFriendInvite: (userId: string) =>
    request<{ ok: boolean; invite: { id: string } }>('/api/friends/invite', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  acceptFriendInvite: (inviteId: string) =>
    request<{ ok: boolean }>(`/api/friends/accept/${inviteId}`, { method: 'POST' }),
  declineFriendInvite: (inviteId: string) =>
    request<{ ok: boolean }>(`/api/friends/${inviteId}`, { method: 'DELETE' }),
  getPendingInvites: () =>
    request<{ ok: boolean; invites: FriendInvite[] }>('/api/friends/pending'),
};
