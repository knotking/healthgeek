'use client';

import { useEffect, useState } from 'react';

/**
 * Authentication client.
 *
 * Replaces Firebase Authentication with calls to the app's own `/api/auth`
 * routes. The exported surface matches what the pages already call
 * (`onAuthStateChanged`, `signInWithEmailAndPassword`, `useAuthState`, …) so the
 * session lives in an httpOnly cookie rather than a hosted identity service.
 */

export interface AuthUser {
  uid: string;
  email: string | null;
}

export class AuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

type Listener = (user: AuthUser | null) => void;

class AuthClient {
  /** `undefined` until the first session check resolves. */
  private user: AuthUser | null | undefined = undefined;
  private readonly listeners = new Set<Listener>();
  private pending: Promise<AuthUser | null> | null = null;

  get currentUser(): AuthUser | null {
    return this.user ?? null;
  }

  get resolved(): boolean {
    return this.user !== undefined;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.user === undefined) {
      void this.loadSession();
    } else {
      // Firebase notifies asynchronously; keep that contract.
      const snapshot = this.user;
      queueMicrotask(() => {
        if (this.listeners.has(listener)) listener(snapshot);
      });
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private publish(user: AuthUser | null): void {
    this.user = user;
    for (const listener of [...this.listeners]) listener(user);
  }

  /** Fetches the current session once, sharing one request across callers. */
  loadSession(): Promise<AuthUser | null> {
    if (this.pending) return this.pending;
    this.pending = (async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = (await response.json()) as { user?: AuthUser | null };
        this.publish(payload.user ?? null);
        return this.currentUser;
      } catch {
        this.publish(null);
        return null;
      } finally {
        this.pending = null;
      }
    })();
    return this.pending;
  }

  async submit(path: string, email: string, password: string): Promise<AuthUser> {
    let response: Response;
    try {
      response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new AuthError('unavailable', 'Could not reach the authentication service.');
    }

    const payload = (await response
      .json()
      .catch(() => ({}))) as { user?: AuthUser; error?: { code?: string; message?: string } };

    if (!response.ok || !payload.user) {
      throw new AuthError(
        payload.error?.code ?? 'unknown',
        payload.error?.message ?? 'Authentication failed.'
      );
    }

    this.publish(payload.user);
    return payload.user;
  }

  async clear(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      this.publish(null);
    }
  }
}

export type Auth = AuthClient;

export const auth: Auth = new AuthClient();

// --- Firebase-shaped API -----------------------------------------------------

export function onAuthStateChanged(
  instance: Auth,
  callback: (user: AuthUser | null) => void
): () => void {
  return instance.subscribe(callback);
}

export async function signInWithEmailAndPassword(
  instance: Auth,
  email: string,
  password: string
): Promise<{ user: AuthUser }> {
  return { user: await instance.submit('/api/auth/login', email, password) };
}

export async function createUserWithEmailAndPassword(
  instance: Auth,
  email: string,
  password: string
): Promise<{ user: AuthUser }> {
  return { user: await instance.submit('/api/auth/signup', email, password) };
}

export async function signOut(instance: Auth): Promise<void> {
  await instance.clear();
}

/** Drop-in replacement for `react-firebase-hooks`' `useAuthState`. */
export function useAuthState(instance: Auth): [AuthUser | null, boolean, Error | undefined] {
  const [user, setUser] = useState<AuthUser | null>(() => instance.currentUser);
  const [loading, setLoading] = useState(() => !instance.resolved);

  useEffect(() => {
    const unsubscribe = instance.subscribe(next => {
      setUser(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [instance]);

  return [user, loading, undefined];
}
