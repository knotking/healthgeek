import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { QueryConstraint, QuerySpec, WhereOp } from '@/lib/data/query';
import { Timestamp } from '@/lib/data/timestamp';
import { comparableOf, resolveServerTimestamps } from '@/lib/data/wire';

/**
 * A small document store backed by a single JSON file on local disk.
 *
 * This replaces Cloud Firestore. It keeps documents in the same shape
 * (collections of JSON documents with string ids) so the rest of the app reads
 * and writes them unchanged, and it needs nothing running besides Node.
 */

export interface StoredUser {
  uid: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: number;
}

interface StoreFile {
  version: 1;
  users: StoredUser[];
  collections: Record<string, Record<string, Record<string, unknown>>>;
}

export interface StoredDoc {
  id: string;
  data: Record<string, unknown>;
}

const DATA_DIR = process.env.HEALTHGEEK_DATA_DIR
  ? path.resolve(process.env.HEALTHGEEK_DATA_DIR)
  : path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'healthgeek.json');

function emptyStore(): StoreFile {
  return { version: 1, users: [], collections: {} };
}

let cache: StoreFile | null = null;

/** Serializes all mutations so concurrent requests can't interleave writes. */
let writeChain: Promise<unknown> = Promise.resolve();

async function load(): Promise<StoreFile> {
  if (cache) return cache;
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as StoreFile;
    cache = {
      version: 1,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      collections: parsed.collections && typeof parsed.collections === 'object' ? parsed.collections : {},
    };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error;
    cache = emptyStore();
  }
  return cache;
}

async function persist(store: StoreFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  // Write-then-rename so a crash mid-write can't leave a truncated data file.
  const temp = `${DATA_FILE}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(store, null, 2), 'utf8');
  await rename(temp, DATA_FILE);
}

/** Runs `mutate` against the store, then persists the result. */
function withWriteLock<T>(mutate: (store: StoreFile) => Promise<T> | T): Promise<T> {
  const run = writeChain.then(async () => {
    const store = await load();
    const result = await mutate(store);
    await persist(store);
    return result;
  });
  // Keep the chain alive even if this caller's promise rejects.
  writeChain = run.catch(() => undefined);
  return run;
}

function collectionOf(store: StoreFile, name: string): Record<string, Record<string, unknown>> {
  if (!store.collections[name]) store.collections[name] = {};
  return store.collections[name];
}

/** Resolves `a.b.c` against a document. */
function fieldValue(doc: Record<string, unknown>, field: string): unknown {
  if (!field.includes('.')) return doc[field];
  let current: unknown = doc;
  for (const segment of field.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function compare(a: unknown, b: unknown): number {
  const left = comparableOf(a);
  const right = comparableOf(b);
  if (left === right) return 0;
  if (left === undefined || left === null) return -1;
  if (right === undefined || right === null) return 1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right);
  return String(left) < String(right) ? -1 : 1;
}

function matches(doc: Record<string, unknown>, field: string, op: WhereOp, value: unknown): boolean {
  const actual = fieldValue(doc, field);
  switch (op) {
    case '==':
      return compare(actual, value) === 0;
    case '!=':
      return compare(actual, value) !== 0;
    case '<':
      return compare(actual, value) < 0;
    case '<=':
      return compare(actual, value) <= 0;
    case '>':
      return compare(actual, value) > 0;
    case '>=':
      return compare(actual, value) >= 0;
    case 'in':
      return Array.isArray(value) && value.some(candidate => compare(actual, candidate) === 0);
    case 'not-in':
      return Array.isArray(value) && !value.some(candidate => compare(actual, candidate) === 0);
    case 'array-contains':
      return Array.isArray(actual) && actual.some(item => compare(item, value) === 0);
    default:
      return false;
  }
}

// --- Users -------------------------------------------------------------------

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const store = await load();
  const normalized = email.trim().toLowerCase();
  return store.users.find(user => user.email === normalized);
}

export async function findUserByUid(uid: string): Promise<StoredUser | undefined> {
  const store = await load();
  return store.users.find(user => user.uid === uid);
}

/** Creates a user, or throws if the email is already registered. */
export function createUser(user: Omit<StoredUser, 'uid' | 'createdAt'>): Promise<StoredUser> {
  return withWriteLock(store => {
    const normalized = user.email.trim().toLowerCase();
    if (store.users.some(existing => existing.email === normalized)) {
      throw new StoreError('email-already-in-use', 'That email address is already registered.');
    }
    const created: StoredUser = {
      ...user,
      email: normalized,
      uid: randomUUID(),
      createdAt: Date.now(),
    };
    store.users.push(created);
    return created;
  });
}

// --- Documents ---------------------------------------------------------------

export async function getDocument(collection: string, id: string): Promise<StoredDoc | null> {
  const store = await load();
  const data = store.collections[collection]?.[id];
  return data ? { id, data } : null;
}

/** Creates or replaces a document. `merge` keeps unspecified existing fields. */
export function setDocument(
  collection: string,
  id: string,
  data: Record<string, unknown>,
  merge = false
): Promise<StoredDoc> {
  return withWriteLock(store => {
    const docs = collectionOf(store, collection);
    const resolved = resolveServerTimestamps(data, Timestamp.now()) as Record<string, unknown>;
    docs[id] = merge ? { ...(docs[id] ?? {}), ...resolved } : resolved;
    return { id, data: docs[id] };
  });
}

export function addDocument(collection: string, data: Record<string, unknown>): Promise<StoredDoc> {
  const id = randomUUID();
  return setDocument(collection, id, data);
}

export function updateDocument(
  collection: string,
  id: string,
  data: Record<string, unknown>
): Promise<StoredDoc> {
  return withWriteLock(store => {
    const docs = collectionOf(store, collection);
    if (!docs[id]) {
      throw new StoreError('not-found', `No document at ${collection}/${id}.`);
    }
    const resolved = resolveServerTimestamps(data, Timestamp.now()) as Record<string, unknown>;
    docs[id] = { ...docs[id], ...resolved };
    return { id, data: docs[id] };
  });
}

export function deleteDocument(collection: string, id: string): Promise<void> {
  return withWriteLock(store => {
    delete collectionOf(store, collection)[id];
  });
}

/**
 * Runs a query. Constraints are applied in Firestore's order: filters, then
 * sort, then the `startAt`/`endAt` cursor on the first sort field, then limit.
 */
export async function queryDocuments(spec: QuerySpec): Promise<StoredDoc[]> {
  const store = await load();
  const docs = store.collections[spec.collection] ?? {};
  let results: StoredDoc[] = Object.entries(docs).map(([id, data]) => ({ id, data }));

  const constraints: QueryConstraint[] = spec.constraints ?? [];

  for (const constraint of constraints) {
    if (constraint.type === 'where') {
      results = results.filter(entry =>
        matches(entry.data, constraint.field, constraint.op, constraint.value)
      );
    }
  }

  const orderings = constraints.filter(
    (constraint): constraint is Extract<QueryConstraint, { type: 'orderBy' }> =>
      constraint.type === 'orderBy'
  );
  if (orderings.length > 0) {
    results.sort((a, b) => {
      for (const ordering of orderings) {
        const result = compare(
          fieldValue(a.data, ordering.field),
          fieldValue(b.data, ordering.field)
        );
        if (result !== 0) return ordering.direction === 'desc' ? -result : result;
      }
      return 0;
    });
  }

  // Cursors bound the first sort field inclusively, matching startAt/endAt.
  const cursorField = orderings[0]?.field;
  const descending = orderings[0]?.direction === 'desc';
  if (cursorField) {
    for (const constraint of constraints) {
      if (constraint.type === 'startAt') {
        results = results.filter(entry => {
          const result = compare(fieldValue(entry.data, cursorField), constraint.value);
          return descending ? result <= 0 : result >= 0;
        });
      }
      if (constraint.type === 'endAt') {
        results = results.filter(entry => {
          const result = compare(fieldValue(entry.data, cursorField), constraint.value);
          return descending ? result >= 0 : result <= 0;
        });
      }
    }
  }

  const limitClause = constraints.find(
    (constraint): constraint is Extract<QueryConstraint, { type: 'limit' }> =>
      constraint.type === 'limit'
  );
  if (limitClause) {
    results = results.slice(0, limitClause.count);
  }

  return results;
}

export class StoreError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'StoreError';
  }
}

/** Test/support hook: drops the in-process cache so the file is re-read. */
export function resetStoreCache(): void {
  cache = null;
}

export const dataDirPath = DATA_DIR;
export const dataFilePath = DATA_FILE;
