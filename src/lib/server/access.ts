import type { QueryConstraint } from '@/lib/data/query';
import { StoreError } from './store';

/**
 * Authorization rules for the document store.
 *
 * These are the rules that used to live in `firestore.rules`, moved into the API
 * route. The browser can no longer reach the store directly, so ownership is
 * checked here on every request.
 */

/** Keyed by document id, which is the owner's uid. */
const PROFILE_COLLECTION = 'profiles';

/** Documents carrying a `userId` field naming their owner. */
const OWNED_COLLECTIONS = new Set([
  'food-log',
  'workout-log',
  'meditation-log',
  'health-reports',
  'saved-quizzes',
  'recommendation-history',
]);

export function forbidden(message: string): never {
  throw new StoreError('permission-denied', message);
}

export function assertKnownCollection(collection: string): void {
  if (collection !== PROFILE_COLLECTION && !OWNED_COLLECTIONS.has(collection)) {
    throw new StoreError('invalid-argument', `Unknown collection "${collection}".`);
  }
}

/** A user may only touch `profiles/{their own uid}`. */
export function assertDocumentAccess(collection: string, id: string, uid: string): void {
  assertKnownCollection(collection);
  if (collection === PROFILE_COLLECTION && id !== uid) {
    forbidden('You can only access your own profile.');
  }
}

/** For owned collections, the stored document must belong to the caller. */
export function assertOwnsStoredDoc(
  collection: string,
  stored: Record<string, unknown> | undefined,
  uid: string
): void {
  if (!OWNED_COLLECTIONS.has(collection)) return;
  if (!stored) return; // nothing to read; the caller reports "not found"
  if (stored.userId !== uid) {
    forbidden('You can only access your own records.');
  }
}

/** Writes to owned collections must be stamped with the caller's uid. */
export function assertWritePayload(
  collection: string,
  data: Record<string, unknown>,
  uid: string
): void {
  if (!OWNED_COLLECTIONS.has(collection)) return;
  if ('userId' in data && data.userId !== uid) {
    forbidden('You can only write records owned by you.');
  }
}

/**
 * Queries are restricted to owned collections and always constrained to the
 * caller's own documents, so a client cannot widen the result set.
 */
export function scopeQueryConstraints(
  collection: string,
  constraints: QueryConstraint[],
  uid: string
): QueryConstraint[] {
  assertKnownCollection(collection);
  if (!OWNED_COLLECTIONS.has(collection)) {
    forbidden(`Collection "${collection}" can only be read one document at a time.`);
  }
  const withoutUserFilter = constraints.filter(
    constraint => !(constraint.type === 'where' && constraint.field === 'userId')
  );
  return [{ type: 'where', field: 'userId', op: '==', value: uid }, ...withoutUserFilter];
}

export { OWNED_COLLECTIONS, PROFILE_COLLECTION };
