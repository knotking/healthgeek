'use client';

import type {
  EndAtClause,
  LimitClause,
  OrderByClause,
  QueryConstraint,
  StartAtClause,
  WhereClause,
  WhereOp,
} from './query';
import { Timestamp, serverTimestamp } from './timestamp';
import { decodeValue, encodeValue } from './wire';

/**
 * Document-store client.
 *
 * Mirrors the handful of Firestore calls this app uses, but every operation is a
 * request to `/api/db`, which reads and writes the local JSON store. Because the
 * surface is the same, page code reads the same as it always did.
 */

export interface Database {
  readonly kind: 'healthgeek-local';
}

/** Handle passed to `collection()`/`doc()`; kept for call-site compatibility. */
export const db: Database = { kind: 'healthgeek-local' };

export class CollectionReference {
  constructor(readonly path: string) {}
}

export class DocumentReference {
  constructor(
    readonly collectionPath: string,
    readonly id: string
  ) {}
}

export class Query {
  constructor(
    readonly path: string,
    readonly constraints: QueryConstraint[]
  ) {}
}

export class DataStoreError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'DataStoreError';
  }
}

interface ApiResponse {
  doc?: { id: string; data: Record<string, unknown> } | null;
  docs?: { id: string; data: Record<string, unknown> }[];
  id?: string;
  error?: { code?: string; message?: string };
}

async function call(body: Record<string, unknown>): Promise<ApiResponse> {
  let response: Response;
  try {
    response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new DataStoreError('unavailable', 'Could not reach the local data store.');
  }

  let payload: ApiResponse = {};
  try {
    payload = (await response.json()) as ApiResponse;
  } catch {
    // Fall through to the status-based error below.
  }

  if (!response.ok) {
    throw new DataStoreError(
      payload.error?.code ?? 'internal',
      payload.error?.message ?? `Request failed with status ${response.status}.`
    );
  }
  return payload;
}

// --- References and constraints ---------------------------------------------

export function collection(_db: Database, path: string): CollectionReference {
  return new CollectionReference(path);
}

export function doc(_db: Database, path: string, id?: string): DocumentReference {
  if (id !== undefined) return new DocumentReference(path, id);
  const segments = path.split('/').filter(Boolean);
  if (segments.length !== 2) {
    throw new DataStoreError('invalid-argument', `"${path}" is not a document path.`);
  }
  return new DocumentReference(segments[0], segments[1]);
}

export function where(field: string, op: WhereOp, value: unknown): WhereClause {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): OrderByClause {
  return { type: 'orderBy', field, direction };
}

export function limit(count: number): LimitClause {
  return { type: 'limit', count };
}

export function startAt(value: unknown): StartAtClause {
  return { type: 'startAt', value };
}

export function endAt(value: unknown): EndAtClause {
  return { type: 'endAt', value };
}

export function query(
  source: CollectionReference | Query,
  ...constraints: QueryConstraint[]
): Query {
  const existing = source instanceof Query ? source.constraints : [];
  return new Query(source.path, [...existing, ...constraints]);
}

// --- Snapshots ---------------------------------------------------------------

export class DocumentSnapshot {
  constructor(
    readonly id: string,
    private readonly payload: Record<string, unknown> | null
  ) {}

  exists(): boolean {
    return this.payload !== null;
  }

  /**
   * Returns the document fields. Matches Firestore's typing, where `data()` is
   * declared as possibly undefined but is present whenever `exists()` is true.
   */
  data(): any {
    return this.payload ?? undefined;
  }
}

export class QuerySnapshot {
  constructor(readonly docs: DocumentSnapshot[]) {}

  get size(): number {
    return this.docs.length;
  }

  get empty(): boolean {
    return this.docs.length === 0;
  }

  forEach(callback: (snapshot: DocumentSnapshot) => void): void {
    this.docs.forEach(callback);
  }
}

// --- Operations --------------------------------------------------------------

export async function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  const { doc: found } = await call({
    op: 'getDoc',
    collection: ref.collectionPath,
    id: ref.id,
  });
  return new DocumentSnapshot(
    ref.id,
    found ? (decodeValue(found.data) as Record<string, unknown>) : null
  );
}

export async function getDocs(source: Query | CollectionReference): Promise<QuerySnapshot> {
  const path = source.path;
  const constraints = source instanceof Query ? source.constraints : [];
  const { docs = [] } = await call({
    op: 'getDocs',
    collection: path,
    constraints: encodeValue(constraints),
  });
  return new QuerySnapshot(
    docs.map(entry => new DocumentSnapshot(entry.id, decodeValue(entry.data) as Record<string, unknown>))
  );
}

export async function setDoc(
  ref: DocumentReference,
  data: Record<string, unknown>,
  options?: { merge?: boolean }
): Promise<void> {
  await call({
    op: 'setDoc',
    collection: ref.collectionPath,
    id: ref.id,
    data: encodeValue(data),
    merge: options?.merge === true,
  });
}

export async function addDoc(
  ref: CollectionReference,
  data: Record<string, unknown>
): Promise<DocumentReference> {
  const { id } = await call({
    op: 'addDoc',
    collection: ref.path,
    data: encodeValue(data),
  });
  return new DocumentReference(ref.path, id ?? '');
}

export async function updateDoc(
  ref: DocumentReference,
  data: Record<string, unknown>
): Promise<void> {
  await call({
    op: 'updateDoc',
    collection: ref.collectionPath,
    id: ref.id,
    data: encodeValue(data),
  });
}

export async function deleteDoc(ref: DocumentReference): Promise<void> {
  await call({
    op: 'deleteDoc',
    collection: ref.collectionPath,
    id: ref.id,
  });
}

export { serverTimestamp, Timestamp };
