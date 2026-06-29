/**
 * Self-contained email + password auth — users live in MongoDB, passwords are
 * bcrypt-hashed, sessions are stateless JWTs. No third-party auth service, so
 * the only paid dependency stays MongoDB.
 *
 * The JWT is signed with JWT_SECRET; set a long random value in production.
 * (For the App Store you can later add "Sign in with Apple", which is free.)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { getDb } from './mongo';
import { toPublicUser, type UserDoc } from './types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me';
const TOKEN_TTL = '60d';
const BCRYPT_ROUNDS = 10;

/** Express request augmented with the authenticated user id. */
export interface AuthedRequest extends Request {
  userId?: string;
}

function newUserId(): string {
  return `usr_${Date.now().toString(36)}${Math.floor(Math.random() * 0xffffff).toString(36)}`;
}

function signToken(user: UserDoc): string {
  return jwt.sign({ sub: user.id, handle: user.handle }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function handleFromEmail(email: string): string {
  const base = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'quester';
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `@${base}${suffix}`;
}

const AVATARS = ['🜂', '🜄', '🜃', '🜁', '✦', '◆', '❖', '⬡', '☾', '✶'];
function pickAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const name = String(req.body?.name ?? '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ ok: false, error: 'A valid email is required.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ ok: false, error: 'Password must be at least 8 characters.' });
    return;
  }

  const db = await getDb();
  const users = db.collection<UserDoc>('users');
  if (await users.findOne({ email })) {
    res.status(409).json({ ok: false, error: 'An account with that email already exists.' });
    return;
  }

  const now = Date.now();
  const user: UserDoc = {
    id: newUserId(),
    email,
    handle: handleFromEmail(email),
    name: name || email.split('@')[0],
    avatar: pickAvatar(),
    passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    createdAt: now,
    updatedAt: now,
  };
  await users.insertOne(user);
  res.json({ ok: true, token: signToken(user), user: toPublicUser(user) });
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const db = await getDb();
  const user = await db.collection<UserDoc>('users').findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ ok: false, error: 'Incorrect email or password.' });
    return;
  }
  res.json({ ok: true, token: signToken(user), user: toPublicUser(user) });
}

export async function meHandler(req: AuthedRequest, res: Response): Promise<void> {
  const db = await getDb();
  const user = await db.collection<UserDoc>('users').findOne({ id: req.userId });
  if (!user) {
    res.status(404).json({ ok: false, error: 'User not found.' });
    return;
  }
  res.json({ ok: true, user: toPublicUser(user) });
}

/** Gate: requires a valid `Authorization: Bearer <jwt>` header. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ ok: false, error: 'Missing auth token.' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
  }
}
