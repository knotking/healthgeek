import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { cookies } from 'next/headers';

import { dataDirPath } from './store';

/**
 * Local email/password authentication.
 *
 * This replaces Firebase Authentication: passwords are hashed with scrypt and
 * the session is an HMAC-signed, httpOnly cookie. No external identity provider
 * is involved, so the app runs offline.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;
export const SESSION_COOKIE = 'healthgeek_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const SECRET_FILE = 'auth-secret';

let cachedSecret: string | null = null;

/**
 * The key used to sign session cookies.
 *
 * `AUTH_SECRET` wins when it is set. Otherwise a random 32-byte secret is
 * generated once and kept beside the data file, so a local install works with no
 * configuration and still signs cookies with a strong key. Deleting that file
 * invalidates every existing session.
 */
function sessionSecret(): string {
  if (cachedSecret) return cachedSecret;

  const configured = process.env.AUTH_SECRET;
  if (configured && configured.length > 0) {
    cachedSecret = configured;
    return cachedSecret;
  }

  const file = path.join(dataDirPath, SECRET_FILE);
  try {
    const existing = readFileSync(file, 'utf8').trim();
    if (existing.length > 0) {
      cachedSecret = existing;
      return cachedSecret;
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error;
  }

  const generated = randomBytes(32).toString('hex');
  mkdirSync(dataDirPath, { recursive: true });
  writeFileSync(file, generated, { mode: 0o600 });
  console.warn(
    `[auth] AUTH_SECRET was not set, so a session secret was generated at ${file}. ` +
      'Set AUTH_SECRET to manage it yourself (required if you run more than one instance).'
  );
  cachedSecret = generated;
  return cachedSecret;
}

// --- Passwords ---------------------------------------------------------------

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return { hash: derived.toString('hex'), salt };
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

// --- Sessions ----------------------------------------------------------------

export interface SessionPayload {
  uid: string;
  email: string;
  exp: number;
}

function sign(data: string): string {
  return createHmac('sha256', sessionSecret()).update(data).digest('base64url');
}

function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = Buffer.from(sign(body), 'utf8');
  const provided = Buffer.from(signature, 'utf8');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload?.uid || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function startSession(uid: string, email: string): Promise<void> {
  const payload: SessionPayload = {
    uid,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Returns the signed-in user, or null when there is no valid session. */
export async function currentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? decodeSession(token) : null;
}
